// Record types for Learning Chains. Mirrors docs/ARCHITECTURE.md §5.
// After the first real publish, only ever ADD optional fields (one-way door).

export type Did = string; // a student's permanent ID, e.g. did:plc:abc123
export type AtUri = string; // at://<did>/<collection>/<rkey>

export type Track = "concepts" | "practice";
export type Relation = "deepens" | "broadens";
export type SessionFormat =
  | "concept-review"
  | "mock-interview"
  | "discussion"
  | "workflow-share"
  | "build-jam"
  | "debugging";

/** Points at one specific version of a record (address + content hash). */
export interface RecordRef {
  uri: AtUri;
  cid: string;
}

/** A link the student confirmed: "this builds on that". */
export interface BuildsOn {
  target: RecordRef;
  relation: Relation;
}

export interface SessionValue {
  title: string;
  track: Track;
  topics: string[];
  format: SessionFormat;
  startsAt: string; // ISO datetime
  description: string;
  buildsOn: BuildsOn[];
  // Deliberately NO meeting link or location field: those would be public.
}

export interface RsvpValue {
  subject: RecordRef; // a session
  status: "going" | "interested";
}

export interface TakeawayValue {
  subject: RecordRef; // the session it came from
  text: string;
  topics: string[];
  buildsOn: BuildsOn[];
}

export interface QuestionValue {
  text: string;
  track: Track;
  topics: string[];
  proposedSolution?: string;
  buildsOn: BuildsOn[];
}

export interface ResponseValue {
  subject: RecordRef; // a question or another response
  kind: "solution" | "followUp";
  text: string;
}

export interface RecordValueMap {
  session: SessionValue;
  rsvp: RsvpValue;
  takeaway: TakeawayValue;
  question: QuestionValue;
  response: ResponseValue;
}
export type RecordKind = keyof RecordValueMap;
export type RecordValue<K extends RecordKind> = RecordValueMap[K];

/** A record as read back from someone's repository. */
export interface StoredRecord<K extends RecordKind = RecordKind> {
  ref: RecordRef;
  kind: K;
  author: Did;
  createdAt: string; // ISO datetime
  value: RecordValueMap[K];
}
/** Any stored record, narrowable by `kind`. */
export type AnyRecord = { [K in RecordKind]: StoredRecord<K> }[RecordKind];

export interface Profile {
  did: Did;
  handle: string; // e.g. alice.bsky.social
  displayName: string;
}

/** A backlink: `from` declared that it builds on the record being asked about. */
export interface Link {
  from: AnyRecord;
  relation: Relation;
}

/** Private note: lives only in the browser, never published. */
export interface Note {
  id: string;
  text: string;
  updatedAt: string;
  about?: AtUri; // optional record the note is about
}
