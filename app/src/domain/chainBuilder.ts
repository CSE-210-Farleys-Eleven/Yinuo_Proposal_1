// Assembles a learning chain around one record: what it builds on (upward)
// and what builds on it (downward). Accepts its dependencies, so it runs on
// any adapter, including the in-memory one.
import { err, ok, type Result } from "./result";
import type { AnyRecord, AtUri, BuildsOn, Link, Relation } from "./types";

export interface ChainEdge {
  from: AtUri; // the newer record, which declared the link
  to: AtUri; // the record it builds on
  relation: Relation;
}
export interface Chain {
  root: AtUri;
  nodes: Record<AtUri, AnyRecord>;
  edges: ChainEdge[];
  /** Linked records that no longer exist (deleted). */
  missing: AtUri[];
}
export interface ChainSources {
  get(uri: AtUri): Promise<Result<AnyRecord>>;
  getBacklinks(uri: AtUri): Promise<Result<Link[]>>;
}

export const buildsOnOf = (r: AnyRecord): BuildsOn[] => ("buildsOn" in r.value ? r.value.buildsOn : []);

export async function buildChain(
  rootUri: AtUri,
  sources: ChainSources,
  { maxDepth = 5 } = {},
): Promise<Result<Chain>> {
  const rootRes = await sources.get(rootUri);
  if (!rootRes.ok) return err("notFound", `Record not found: ${rootUri}`);

  const nodes: Record<AtUri, AnyRecord> = { [rootUri]: rootRes.value };
  const edges: ChainEdge[] = [];
  const edgeKeys = new Set<string>();
  const missing: AtUri[] = [];
  const addEdge = (e: ChainEdge) => {
    const key = `${e.from}>${e.to}`;
    if (!edgeKeys.has(key)) { edgeKeys.add(key); edges.push(e); }
  };

  // Upward: follow each record's own buildsOn links.
  let frontier: AnyRecord[] = [rootRes.value];
  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next: AnyRecord[] = [];
    for (const rec of frontier) {
      for (const link of buildsOnOf(rec)) {
        const to = link.target.uri;
        if (!nodes[to]) {
          const got = await sources.get(to);
          if (!got.ok) { if (!missing.includes(to)) missing.push(to); continue; }
          nodes[to] = got.value;
          next.push(got.value);
        }
        addEdge({ from: rec.ref.uri, to, relation: link.relation });
      }
    }
    frontier = next;
  }

  // Downward: ask who declared they build on each record.
  let down: AtUri[] = [rootUri];
  for (let depth = 0; depth < maxDepth && down.length; depth++) {
    const next: AtUri[] = [];
    for (const uri of down) {
      const back = await sources.getBacklinks(uri);
      if (!back.ok) return back;
      for (const { from, relation } of back.value) {
        const fromUri = from.ref.uri;
        if (!nodes[fromUri]) { nodes[fromUri] = from; next.push(fromUri); }
        addEdge({ from: fromUri, to: uri, relation });
      }
    }
    down = next;
  }

  return ok({ root: rootUri, nodes, edges, missing });
}
