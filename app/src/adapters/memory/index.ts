// In-memory adapters for all four seams. Used by the demo and the tests.
// MemoryNetwork stands in for everyone's repositories AND the indexer, so
// unlike the real system there is no delay before others see a record.
import { makeAtUri } from "../../domain/atUri";
import { err, ok, type Result } from "../../domain/result";
import { rankSuggestions } from "../../domain/suggestions";
import { validateRecord } from "../../domain/validation";
import { buildsOnOf } from "../../domain/chainBuilder";
import type {
  AnyRecord, AtUri, Did, Note, Profile, RecordKind, RecordRef, RecordValue, StoredRecord,
} from "../../domain/types";
import type { Discovery, NotesStore, Questioner, RecordStore } from "../../ports";

/** Short content hash standing in for a real CID (FNV-1a). */
function contentHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return "bafy" + (h >>> 0).toString(16).padStart(8, "0");
}

export class MemoryNetwork {
  private records = new Map<AtUri, AnyRecord>();
  private counter = 0;
  private listeners = new Set<() => void>();

  constructor(private profiles: Profile[], readonly now: () => Date = () => new Date()) {}

  all(): AnyRecord[] { return [...this.records.values()]; }
  find(uri: AtUri): AnyRecord | undefined { return this.records.get(uri); }
  profile(did: Did): Profile | undefined { return this.profiles.find((p) => p.did === did); }
  users(): Profile[] { return [...this.profiles]; }

  /** Validates and stores a record as `author`. Used by the record store and the seed data. */
  write<K extends RecordKind>(author: Did, kind: K, value: RecordValue<K>, opts: { uri?: AtUri; createdAt?: string } = {}): Result<StoredRecord<K>> {
    const valid = validateRecord(kind, value);
    if (!valid.ok) return valid;
    const uri = opts.uri ?? makeAtUri(author, kind, (++this.counter).toString(36).padStart(6, "0"));
    const record = {
      ref: { uri, cid: contentHash(uri + JSON.stringify(value)) },
      kind, author,
      createdAt: opts.createdAt ?? this.now().toISOString(),
      value: valid.value,
    } as StoredRecord<K>;
    this.records.set(uri, record as unknown as AnyRecord);
    this.notify();
    return ok(record);
  }

  delete(uri: AtUri): void { this.records.delete(uri); this.notify(); }

  /** Lets the UI refresh when anything changes. Returns an unsubscribe function. */
  subscribe(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private notify() { this.listeners.forEach((fn) => fn()); }
}

export function createMemoryRecordStore(net: MemoryNetwork, me: Did): RecordStore {
  const ownRecord = (ref: RecordRef): Result<AnyRecord> => {
    const existing = net.find(ref.uri);
    if (!existing) return err("notFound", "That record doesn't exist.");
    if (existing.author !== me) return err("unauthorized", "You can only change your own records.");
    return ok(existing);
  };
  return {
    me,
    create: async (kind, value) => net.write(me, kind, value),
    update: async <K extends RecordKind>(ref: RecordRef, value: RecordValue<K>): Promise<Result<StoredRecord<K>>> => {
      const own = ownRecord(ref);
      if (!own.ok) return own;
      // A record keeps its kind and creation time; only the content (and version hash) changes.
      return net.write(me, own.value.kind as K, value, { uri: ref.uri, createdAt: own.value.createdAt });
    },
    remove: async (ref) => {
      const own = ownRecord(ref);
      if (!own.ok) return own;
      net.delete(ref.uri);
      return ok(undefined);
    },
    get: async (uri) => {
      const r = net.find(uri);
      return r ? ok(r) : err("notFound", "That record doesn't exist (it may have been deleted).");
    },
  };
}

const newestFirst = (a: AnyRecord, b: AnyRecord) => b.createdAt.localeCompare(a.createdAt);
const oldestFirst = (a: AnyRecord, b: AnyRecord) => a.createdAt.localeCompare(b.createdAt);
const ofKind = <K extends RecordKind>(net: MemoryNetwork, kind: K) =>
  net.all().filter((r): r is StoredRecord<K> & AnyRecord => r.kind === kind) as StoredRecord<K>[];
const matchesTags = (topics: string[], tags?: string[]) => !tags?.length || tags.some((t) => topics.includes(t));

export function createMemoryDiscovery(net: MemoryNetwork): Discovery {
  return {
    listSessions: async (filter = {}) => ok(
      ofKind(net, "session")
        .filter((s) => (!filter.track || s.value.track === filter.track) && matchesTags(s.value.topics, filter.tags))
        .sort((a, b) => a.value.startsAt.localeCompare(b.value.startsAt)),
    ),
    listQuestions: async (filter = {}) => ok(
      ofKind(net, "question")
        .filter((q) => (!filter.track || q.value.track === filter.track) && matchesTags(q.value.topics, filter.tags))
        .sort(newestFirst as never),
    ),
    listTakeaways: async (sessionUri) => ok(
      ofKind(net, "takeaway").filter((t) => t.value.subject.uri === sessionUri).sort(newestFirst as never),
    ),
    getResponses: async (subjectUri) => ok(
      ofKind(net, "response").filter((r) => r.value.subject.uri === subjectUri).sort(oldestFirst as never),
    ),
    listByAuthor: async (did) => ok(net.all().filter((r) => r.author === did).sort(newestFirst)),
    getBacklinks: async (uri) => ok(
      net.all().flatMap((r) => buildsOnOf(r).filter((b) => b.target.uri === uri).map((b) => ({ from: r, relation: b.relation }))),
    ),
    suggestLinks: async ({ tags, exclude = [] }) => {
      const linkable = net.all().filter((r) => r.kind === "session" || r.kind === "takeaway" || r.kind === "question");
      const candidates = linkable.map((r) => ({ uri: r.ref.uri, topics: "topics" in r.value ? r.value.topics : [], createdAt: r.createdAt, r }));
      return ok(rankSuggestions(candidates, tags, exclude).map((c) => c.r));
    },
    getProfile: async (did) => {
      const p = net.profile(did);
      return p ? ok(p) : err("notFound", `No profile for ${did}`);
    },
  };
}

/** Any getItem/setItem store: window.localStorage in the browser, a Map in tests. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function mapStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

export function createMemoryNotesStore(storage: KeyValueStorage = mapStorage(), key = "learnchain.notes"): NotesStore {
  const read = (): Note[] => JSON.parse(storage.getItem(key) ?? "[]");
  const write = (notes: Note[]) => storage.setItem(key, JSON.stringify(notes));
  return {
    list: async () => ok(read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
    save: async (note) => { write([...read().filter((n) => n.id !== note.id), note]); return ok(undefined); },
    remove: async (id) => { write(read().filter((n) => n.id !== id)); return ok(undefined); },
  };
}

/** Stand-in for the optional AI feature: fixed Socratic questions, never answers. */
export const cannedQuestioner: Questioner = {
  followUps: async () => ok([
    "What would change if one assumption in your takeaway turned out to be false?",
    "How would you explain this to someone new, without using the key technical term?",
    "What example or small experiment could show this idea is wrong?",
  ]),
};
