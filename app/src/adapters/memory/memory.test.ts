import { buildChain } from "../../domain/chainBuilder";
import { recordStoreContract } from "../contracts/recordStore.contract";
import { discoveryContract } from "../contracts/discovery.contract";
import { MemoryNetwork, createMemoryDiscovery, createMemoryNotesStore, createMemoryRecordStore, cannedQuestioner } from "./index";
import { SEED_USERS, seedNetwork } from "./seed";

const profiles = [
  { did: "did:plc:alice", handle: "alice.test", displayName: "Alice" },
  { did: "did:plc:bob", handle: "bob.test", displayName: "Bob" },
];
const fresh = () => new MemoryNetwork(profiles, () => new Date("2026-11-06T12:00:00Z"));

recordStoreContract(() => {
  const net = fresh();
  return { mine: createMemoryRecordStore(net, "did:plc:alice"), theirs: createMemoryRecordStore(net, "did:plc:bob") };
});

discoveryContract(() => {
  const net = fresh();
  return {
    alice: createMemoryRecordStore(net, "did:plc:alice"),
    bob: createMemoryRecordStore(net, "did:plc:bob"),
    discovery: createMemoryDiscovery(net),
  };
});

describe("in-memory notes store", () => {
  it("saves, lists, and removes notes in the given storage", async () => {
    const notes = createMemoryNotesStore();
    await notes.save({ id: "n1", text: "still confused about softmax", updatedAt: "2026-11-06T00:00:00Z" });
    const listed = await notes.list();
    await notes.remove("n1");
    const after = await notes.list();
    expect(listed.ok && listed.value.map((n) => n.id)).toEqual(["n1"]);
    expect(after.ok && after.value).toEqual([]);
  });
});

describe("canned questioner", () => {
  it("returns 2 or 3 questions and no answers", async () => {
    const r = await cannedQuestioner.followUps("Scaling by sqrt(d) keeps softmax stable.");
    expect(r.ok && r.value.length).toBeGreaterThanOrEqual(2);
    expect(r.ok && r.value.every((q) => q.trim().endsWith("?"))).toBe(true);
  });
});

describe("sample data", () => {
  const now = new Date("2026-11-06T12:00:00Z");
  const seeded = () => { const net = new MemoryNetwork(SEED_USERS, () => now); seedNetwork(net, now); return net; };

  it("contains only valid records", () => {
    expect(() => seeded()).not.toThrow();
  });

  it("has a learning chain that crosses students and both relations", async () => {
    const net = seeded();
    const discovery = createMemoryDiscovery(net);
    const store = createMemoryRecordStore(net, "did:plc:alice");
    const first = net.all().find((r) => r.kind === "takeaway" && r.value.text.startsWith("Self-attention"))!;
    const chain = await buildChain(first.ref.uri, { get: store.get, getBacklinks: discovery.getBacklinks });
    if (!chain.ok) throw new Error(chain.error.message);
    const authors = new Set(Object.values(chain.value.nodes).map((n) => n.author));
    const relations = new Set(chain.value.edges.map((e) => e.relation));
    expect(authors.size).toBeGreaterThanOrEqual(3);
    expect([...relations].sort()).toEqual(["broadens", "deepens"]);
  });
});
