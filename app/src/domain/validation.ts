// Validates records. Runs before publishing, and (later) in the indexer on every
// record that arrives from the network, since anyone can write records.
import { err, ok, type Result } from "./result";
import { checkSensitive } from "./sensitiveCheck";
import type { RecordKind, RecordValue } from "./types";

export const MAX_TEXT = 2000;
export const MAX_TOPICS = 5;
export const MAX_LINKS = 5;

const TRACKS = ["concepts", "practice"];
const RELATIONS = ["deepens", "broadens"];
const FORMATS = ["concept-review", "mock-interview", "discussion", "workflow-share", "build-jam", "debugging"];

export const normalizeTopic = (t: string) => t.trim().toLowerCase().replace(/\s+/g, "-");

/** "Transformers, ML theory" -> ["transformers", "ml-theory"] */
export function normalizeTopics(input: string): string[] {
  return [...new Set(input.split(",").map(normalizeTopic).filter(Boolean))];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Returns an error message, or null if the field is fine. */
function text(v: unknown, field: string, { required = true, max = MAX_TEXT } = {}): string | null {
  if (v === undefined && !required) return null;
  if (typeof v !== "string") return `${field} must be text`;
  if (required && v.trim() === "") return `${field} can't be empty`;
  if (v.length > max) return `${field} is longer than ${max} characters`;
  return null;
}
function oneOf(v: unknown, field: string, allowed: string[]): string | null {
  return typeof v === "string" && allowed.includes(v) ? null : `${field} must be one of: ${allowed.join(", ")}`;
}
function recordRef(v: unknown, field: string): string | null {
  return isObj(v) && typeof v.uri === "string" && v.uri.startsWith("at://") && typeof v.cid === "string"
    ? null
    : `${field} must point to a record`;
}
function topics(v: unknown): string | null {
  if (!Array.isArray(v) || !v.every((t) => typeof t === "string")) return "topics must be a list of tags";
  return v.length > MAX_TOPICS ? `at most ${MAX_TOPICS} topics` : null;
}
function buildsOn(v: unknown): string | null {
  if (!Array.isArray(v)) return "buildsOn must be a list";
  if (v.length > MAX_LINKS) return `at most ${MAX_LINKS} links`;
  for (const link of v) {
    if (!isObj(link)) return "each link must be an object";
    const e = recordRef(link.target, "link target") ?? oneOf(link.relation, "link relation", RELATIONS);
    if (e) return e;
  }
  return null;
}
function noMeetingLink(...fields: unknown[]): string | null {
  const leaked = fields.some((f) => typeof f === "string" && checkSensitive(f).some((x) => x.kind === "meetingLink"));
  return leaked ? "a meeting link can't be in a public record; share it by DM" : null;
}

const CHECKS: { [K in RecordKind]: (v: Obj) => (string | null)[] } = {
  session: (v) => [
    text(v.title, "title", { max: 120 }), oneOf(v.track, "track", TRACKS), topics(v.topics),
    oneOf(v.format, "format", FORMATS),
    typeof v.startsAt === "string" && !Number.isNaN(Date.parse(v.startsAt)) ? null : "startsAt must be a date",
    text(v.description, "description", { required: false }) ?? (typeof v.description === "string" ? null : "description must be text"),
    buildsOn(v.buildsOn), noMeetingLink(v.title, v.description),
  ],
  rsvp: (v) => [recordRef(v.subject, "subject"), oneOf(v.status, "status", ["going", "interested"])],
  takeaway: (v) => [recordRef(v.subject, "subject"), text(v.text, "text"), topics(v.topics), buildsOn(v.buildsOn)],
  question: (v) => [
    text(v.text, "text"), oneOf(v.track, "track", TRACKS), topics(v.topics),
    text(v.proposedSolution, "proposed solution", { required: false }), buildsOn(v.buildsOn),
  ],
  response: (v) => [recordRef(v.subject, "subject"), oneOf(v.kind, "kind", ["solution", "followUp"]), text(v.text, "text")],
};

export function validateRecord<K extends RecordKind>(kind: K, value: unknown): Result<RecordValue<K>> {
  if (!isObj(value)) return err("invalid", `${kind} must be an object`);
  const problem = CHECKS[kind](value).find((e) => e !== null);
  return problem ? err("invalid", problem) : ok(value as unknown as RecordValue<K>);
}
