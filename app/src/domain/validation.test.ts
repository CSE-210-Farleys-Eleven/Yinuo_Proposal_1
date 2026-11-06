import { normalizeTopics, validateRecord } from "./validation";

const ref = { uri: "at://did:plc:a/example.learnchain.session/1", cid: "c1" };
const goodTakeaway = { subject: ref, text: "Scaling keeps softmax from saturating.", topics: ["transformers"], buildsOn: [] };

describe("normalizeTopics", () => {
  it("lowercases, trims, turns spaces into dashes, and removes duplicates", () => {
    expect(normalizeTopics(" Transformers, ML theory ,transformers,, ")).toEqual(["transformers", "ml-theory"]);
  });
});

describe("validateRecord", () => {
  it("accepts a well-formed takeaway", () => {
    expect(validateRecord("takeaway", goodTakeaway).ok).toBe(true);
  });

  it("rejects a takeaway with empty text", () => {
    const r = validateRecord("takeaway", { ...goodTakeaway, text: "   " });
    expect(r.ok).toBe(false);
  });

  it("rejects text longer than 2000 characters", () => {
    expect(validateRecord("takeaway", { ...goodTakeaway, text: "x".repeat(2001) }).ok).toBe(false);
  });

  it("rejects more than 5 links", () => {
    const link = { target: ref, relation: "deepens" as const };
    expect(validateRecord("takeaway", { ...goodTakeaway, buildsOn: Array(6).fill(link) }).ok).toBe(false);
  });

  it("rejects an unknown link relation", () => {
    const bad = { ...goodTakeaway, buildsOn: [{ target: ref, relation: "contradicts" }] };
    expect(validateRecord("takeaway", bad).ok).toBe(false);
  });

  it("rejects a session with an unknown track", () => {
    const session = { title: "Attention", track: "biology", topics: [], format: "discussion", startsAt: "2026-11-10T18:00:00Z", description: "", buildsOn: [] };
    expect(validateRecord("session", session).ok).toBe(false);
  });

  it("rejects a session description containing a meeting link", () => {
    const session = { title: "Attention", track: "concepts", topics: [], format: "discussion", startsAt: "2026-11-10T18:00:00Z", description: "https://ucsd.zoom.us/j/1", buildsOn: [] };
    const r = validateRecord("session", session);
    expect(r.ok ? "" : r.error.message).toMatch(/meeting link/i);
  });

  it("rejects input that is not an object (records arrive from strangers)", () => {
    expect(validateRecord("question", null).ok).toBe(false);
  });

  it("accepts a response of kind followUp", () => {
    expect(validateRecord("response", { subject: ref, kind: "followUp", text: "Why not LayerNorm?" }).ok).toBe(true);
  });
});
