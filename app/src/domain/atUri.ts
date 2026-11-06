import type { AtUri, Did, RecordKind } from "./types";

// Placeholder namespace. Must become a domain the team controls before any
// real record is published (docs/ARCHITECTURE.md §11).
export const NAMESPACE = "example.learnchain";

const KINDS: readonly RecordKind[] = ["session", "rsvp", "takeaway", "question", "response"];

export const collectionFor = (kind: RecordKind): string => `${NAMESPACE}.${kind}`;

export function kindForCollection(collection: string): RecordKind | null {
  const prefix = NAMESPACE + ".";
  if (!collection.startsWith(prefix)) return null;
  const kind = collection.slice(prefix.length) as RecordKind;
  return KINDS.includes(kind) ? kind : null;
}

export const makeAtUri = (did: Did, kind: RecordKind, rkey: string): AtUri =>
  `at://${did}/${collectionFor(kind)}/${rkey}`;

export function parseAtUri(uri: string): { did: Did; kind: RecordKind; rkey: string } | null {
  const match = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(uri);
  if (!match) return null;
  const kind = kindForCollection(match[2]);
  return kind ? { did: match[1], kind, rkey: match[3] } : null;
}
