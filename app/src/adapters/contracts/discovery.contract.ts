// Behavior every Discovery adapter must have. The real indexer is eventually
// consistent; when this contract runs against it, wait for records to arrive
// before asserting.
import type { Discovery, RecordStore } from "../../ports";
import type { SessionValue } from "../../domain/types";

const session = (title: string, track: "concepts" | "practice", topics: string[]): SessionValue => ({
  title, track, topics, format: "discussion", startsAt: "2026-12-01T18:00:00Z", description: "", buildsOn: [],
});

export function discoveryContract(make: () => { alice: RecordStore; bob: RecordStore; discovery: Discovery }) {
  describe("Discovery contract", () => {
    it("filters sessions by track and by tag", async () => {
      const { alice, bob, discovery } = make();
      await alice.create("session", session("Attention", "concepts", ["attention"]));
      await bob.create("session", session("RAG jam", "practice", ["rag"]));
      const practice = await discovery.listSessions({ track: "practice" });
      const tagged = await discovery.listSessions({ tags: ["attention"] });
      expect(practice.ok && practice.value.map((s) => s.value.title)).toEqual(["RAG jam"]);
      expect(tagged.ok && tagged.value.map((s) => s.value.title)).toEqual(["Attention"]);
    });

    it("lists the takeaways of a session", async () => {
      const { alice, bob, discovery } = make();
      const s = await alice.create("session", session("Attention", "concepts", ["attention"]));
      if (!s.ok) throw new Error(s.error.message);
      await bob.create("takeaway", { subject: s.value.ref, text: "learned a lot", topics: [], buildsOn: [] });
      const list = await discovery.listTakeaways(s.value.ref.uri);
      expect(list.ok && list.value.map((t) => t.value.text)).toEqual(["learned a lot"]);
    });

    it("finds who built on a record, with the relation", async () => {
      const { alice, bob, discovery } = make();
      const s = await alice.create("session", session("Attention", "concepts", ["attention"]));
      if (!s.ok) throw new Error(s.error.message);
      const a = await alice.create("takeaway", { subject: s.value.ref, text: "base idea", topics: [], buildsOn: [] });
      if (!a.ok) throw new Error(a.error.message);
      await bob.create("takeaway", { subject: s.value.ref, text: "went further", topics: [], buildsOn: [{ target: a.value.ref, relation: "deepens" }] });
      const back = await discovery.getBacklinks(a.value.ref.uri);
      expect(back.ok && back.value.map((l) => [l.from.author, l.relation])).toEqual([[bob.me, "deepens"]]);
    });

    it("suggests records sharing a tag, leaving out excluded ones", async () => {
      const { alice, discovery } = make();
      const s1 = await alice.create("session", session("Attention", "concepts", ["attention"]));
      const s2 = await alice.create("session", session("RL", "concepts", ["rl"]));
      if (!s1.ok || !s2.ok) throw new Error("seed failed");
      const all = await discovery.suggestLinks({ tags: ["attention", "rl"] });
      const some = await discovery.suggestLinks({ tags: ["attention", "rl"], exclude: [s1.value.ref.uri] });
      expect(all.ok && all.value.length).toBe(2);
      expect(some.ok && some.value.map((r) => r.ref.uri)).toEqual([s2.value.ref.uri]);
    });

    it("lists responses to a question", async () => {
      const { alice, bob, discovery } = make();
      const q = await alice.create("question", { text: "Why scale by sqrt(d)?", track: "concepts", topics: [], buildsOn: [] });
      if (!q.ok) throw new Error(q.error.message);
      await bob.create("response", { subject: q.value.ref, kind: "solution", text: "Keeps softmax unsaturated." });
      const r = await discovery.getResponses(q.value.ref.uri);
      expect(r.ok && r.value.map((x) => x.value.kind)).toEqual(["solution"]);
    });

    it("looks up profiles, and reports unknown ones as notFound", async () => {
      const { alice, discovery } = make();
      const known = await discovery.getProfile(alice.me);
      const unknown = await discovery.getProfile("did:plc:ghost");
      expect(known.ok).toBe(true);
      expect(unknown.ok ? null : unknown.error.kind).toBe("notFound");
    });
  });
}
