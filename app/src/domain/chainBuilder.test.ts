import { buildChain } from "./chainBuilder";
import { ok, err } from "./result";
import type { AnyRecord, BuildsOn, Link, Relation } from "./types";
import type { Result } from "./result";

function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

// A tiny fake network: records by URI, backlinks computed from buildsOn.
function network(records: AnyRecord[]) {
  const byUri = new Map(records.map((r) => [r.ref.uri, r]));
  return {
    get: async (uri: string) => (byUri.has(uri) ? ok(byUri.get(uri)!) : err<AnyRecord>("notFound", uri)),
    getBacklinks: async (uri: string) =>
      ok<Link[]>(records.flatMap((r) =>
        ("buildsOn" in r.value ? r.value.buildsOn : []).filter((b) => b.target.uri === uri).map((b) => ({ from: r, relation: b.relation })))),
  };
}
const takeaway = (id: string, links: [string, Relation][] = []): AnyRecord => ({
  ref: { uri: id, cid: "c" }, kind: "takeaway", author: "did:plc:x", createdAt: "2026-11-01T00:00:00Z",
  value: { subject: { uri: "s", cid: "c" }, text: id, topics: [], buildsOn: links.map(([t, relation]): BuildsOn => ({ target: { uri: t, cid: "c" }, relation })) },
});

describe("buildChain", () => {
  it("follows 'builds on' links upward", async () => {
    const net = network([takeaway("a"), takeaway("b", [["a", "deepens"]]), takeaway("c", [["b", "deepens"]])]);
    const chain = unwrap(await buildChain("c", net));
    expect(chain.edges).toEqual([
      { from: "c", to: "b", relation: "deepens" },
      { from: "b", to: "a", relation: "deepens" },
    ]);
  });

  it("follows backlinks downward, including branches", async () => {
    const net = network([takeaway("a"), takeaway("b", [["a", "deepens"]]), takeaway("d", [["a", "broadens"]])]);
    const chain = unwrap(await buildChain("a", net));
    expect(chain.edges).toEqual(expect.arrayContaining([
      { from: "b", to: "a", relation: "deepens" },
      { from: "d", to: "a", relation: "broadens" },
    ]));
    expect(Object.keys(chain.nodes).sort()).toEqual(["a", "b", "d"]);
  });

  it("does not loop forever if records link in a circle", async () => {
    const net = network([takeaway("a", [["b", "deepens"]]), takeaway("b", [["a", "deepens"]])]);
    const chain = unwrap(await buildChain("a", net));
    expect(Object.keys(chain.nodes).sort()).toEqual(["a", "b"]);
  });

  it("stops at the depth limit", async () => {
    const net = network([takeaway("a"), takeaway("b", [["a", "deepens"]]), takeaway("c", [["b", "deepens"]])]);
    const chain = unwrap(await buildChain("c", net, { maxDepth: 1 }));
    expect(Object.keys(chain.nodes).sort()).toEqual(["b", "c"]);
  });

  it("records links to deleted records as missing instead of failing", async () => {
    const net = network([takeaway("b", [["gone", "deepens"]])]);
    const chain = unwrap(await buildChain("b", net));
    expect(chain.missing).toEqual(["gone"]);
  });

  it("reports notFound when the starting record doesn't exist", async () => {
    const r = await buildChain("nope", network([]));
    expect(r.ok ? null : r.error.kind).toBe("notFound");
  });
});
