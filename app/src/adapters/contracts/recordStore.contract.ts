// Behavior every RecordStore adapter must have. Run against the in-memory
// adapter now, and against the real AT Protocol adapter later.
import { parseAtUri } from "../../domain/atUri";
import type { RecordStore } from "../../ports";

const sessionRef = { uri: "at://did:plc:someone/example.learnchain.session/s1", cid: "c" };
const takeaway = (text: string) => ({ subject: sessionRef, text, topics: ["attention"], buildsOn: [] });

export function recordStoreContract(make: () => { mine: RecordStore; theirs: RecordStore }) {
  describe("RecordStore contract", () => {
    it("creates a record in my own repository", async () => {
      const { mine } = make();
      const r = await mine.create("takeaway", takeaway("hello"));
      if (!r.ok) throw new Error(r.error.message);
      expect(r.value.author).toBe(mine.me);
      expect(parseAtUri(r.value.ref.uri)).toMatchObject({ did: mine.me, kind: "takeaway" });
      expect(r.value.value.text).toBe("hello");
    });

    it("refuses to create an invalid record", async () => {
      const { mine } = make();
      const r = await mine.create("takeaway", takeaway("   "));
      expect(r.ok ? null : r.error.kind).toBe("invalid");
    });

    it("reads back any record by its address", async () => {
      const { mine, theirs } = make();
      const created = await theirs.create("takeaway", takeaway("from them"));
      if (!created.ok) throw new Error(created.error.message);
      const read = await mine.get(created.value.ref.uri);
      expect(read.ok && read.value.value).toEqual(created.value.value);
    });

    it("reports notFound for an unknown address", async () => {
      const { mine } = make();
      const r = await mine.get("at://did:plc:nobody/example.learnchain.takeaway/none");
      expect(r.ok ? null : r.error.kind).toBe("notFound");
    });

    it("updates my record: same address, new version", async () => {
      const { mine } = make();
      const created = await mine.create("takeaway", takeaway("v1"));
      if (!created.ok) throw new Error(created.error.message);
      const updated = await mine.update(created.value.ref, takeaway("v2"));
      if (!updated.ok) throw new Error(updated.error.message);
      expect(updated.value.ref.uri).toBe(created.value.ref.uri);
      expect(updated.value.ref.cid).not.toBe(created.value.ref.cid);
    });

    it("won't let me update or remove someone else's record", async () => {
      const { mine, theirs } = make();
      const created = await theirs.create("takeaway", takeaway("theirs"));
      if (!created.ok) throw new Error(created.error.message);
      const up = await mine.update(created.value.ref, takeaway("hijack"));
      const rm = await mine.remove(created.value.ref);
      expect([up.ok ? null : up.error.kind, rm.ok ? null : rm.error.kind]).toEqual(["unauthorized", "unauthorized"]);
    });

    it("removes my record", async () => {
      const { mine } = make();
      const created = await mine.create("takeaway", takeaway("bye"));
      if (!created.ok) throw new Error(created.error.message);
      await mine.remove(created.value.ref);
      const read = await mine.get(created.value.ref.uri);
      expect(read.ok ? null : read.error.kind).toBe("notFound");
    });
  });
}
