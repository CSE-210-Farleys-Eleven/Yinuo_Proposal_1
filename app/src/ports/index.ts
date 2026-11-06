// The four seams (docs/ARCHITECTURE.md §4). Screens and domain logic depend
// on these interfaces only, never on AT Protocol or the indexer directly.
// Each has two adapters: in-memory (demo + tests) and real (later).

import type { Result } from "../domain/result";
import type {
  AnyRecord, AtUri, Did, Link, Note, Profile, RecordKind,
  RecordRef, RecordValue, StoredRecord, Track,
} from "../domain/types";

/** The signed-in student's own repository. */
export interface RecordStore {
  /** Who is signed in. */
  readonly me: Did;
  create<K extends RecordKind>(kind: K, value: RecordValue<K>): Promise<Result<StoredRecord<K>>>;
  update<K extends RecordKind>(ref: RecordRef, value: RecordValue<K>): Promise<Result<StoredRecord<K>>>;
  /** Only the author can remove their own record. */
  remove(ref: RecordRef): Promise<Result<void>>;
  /** Read any student's public record. */
  get(uri: AtUri): Promise<Result<AnyRecord>>;
}

export interface SessionFilter {
  track?: Track;
  tags?: string[]; // match ANY of these
}

/** Finding things across all students (the indexer, later). */
export interface Discovery {
  listSessions(filter?: SessionFilter): Promise<Result<StoredRecord<"session">[]>>;
  listQuestions(filter?: SessionFilter): Promise<Result<StoredRecord<"question">[]>>;
  /** Takeaways whose subject is this session. */
  listTakeaways(sessionUri: AtUri): Promise<Result<StoredRecord<"takeaway">[]>>;
  /** Responses to a question, or follow-ups to a response. */
  getResponses(subjectUri: AtUri): Promise<Result<StoredRecord<"response">[]>>;
  /** Records by one author, newest first. */
  listByAuthor(did: Did): Promise<Result<AnyRecord[]>>;
  /** Everything that declared it builds on this record ("built on by ↓"). */
  getBacklinks(uri: AtUri): Promise<Result<Link[]>>;
  /** Candidates to link to: share a tag, newest first. Only suggests; students decide. */
  suggestLinks(draft: { tags: string[]; exclude?: AtUri[] }): Promise<Result<AnyRecord[]>>;
  getProfile(did: Did): Promise<Result<Profile>>;
}

/** Private notes. Never leave the browser. */
export interface NotesStore {
  list(): Promise<Result<Note[]>>;
  save(note: Note): Promise<Result<void>>;
  remove(id: string): Promise<Result<void>>;
}

/** Optional AI follow-up questions (flag off by default). Questions only, never answers. */
export interface Questioner {
  followUps(takeawayText: string): Promise<Result<string[]>>;
}
