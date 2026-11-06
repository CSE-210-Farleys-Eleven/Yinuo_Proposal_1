// Shows a learning chain: what a record builds on (above) and what builds on it (below).
import { useState } from "react";
import { useData, useServices } from "../app/services";
import { buildChain, type Chain } from "../domain/chainBuilder";
import type { AnyRecord, AtUri, Relation } from "../domain/types";
import { AuthorName, ErrorNote, KIND_LABEL, Link, Loading, Topics, daysAgo, recordText } from "../ui/components";

interface Placed { uri: AtUri; relation: Relation }

/** Groups chain nodes into levels moving away from the root in one direction. */
function levels(chain: Chain, direction: "up" | "down"): Placed[][] {
  const seen = new Set<AtUri>([chain.root]);
  const out: Placed[][] = [];
  let current = [chain.root];
  while (current.length) {
    const next: Placed[] = [];
    for (const e of chain.edges) {
      const [near, far] = direction === "up" ? [e.from, e.to] : [e.to, e.from];
      if (current.includes(near) && !seen.has(far)) { seen.add(far); next.push({ uri: far, relation: e.relation }); }
    }
    if (next.length) out.push(next);
    current = next.map((p) => p.uri);
  }
  return out;
}

function Node({ record, relation, direction }: { record: AnyRecord; relation: Relation; direction: "up" | "down" }) {
  const { now } = useServices();
  return (
    <Link to={{ name: "chain", uri: record.ref.uri }} className={`card node rel-${relation}`}>
      <span className={`rel-chip rel-${relation}`}>
        {/* Above the center: the card below grew from this one. Below: this card grew from the one above. */}
        {direction === "up" ? `${relation === "deepens" ? "deepened" : "broadened"} ↓` : `${relation} ↑`}
      </span>
      <div className="card-head">
        <span className="kind">{KIND_LABEL[record.kind]}</span><AuthorName did={record.author} />
        <span className="muted">· {daysAgo(record.createdAt, now())}</span>
      </div>
      <p className="card-text clamp">{recordText(record)}</p>
    </Link>
  );
}

function FollowUps({ text }: { text: string }) {
  const { questioner } = useServices();
  const [questions, setQuestions] = useState<string[] | null>(null);
  return (
    <div className="ai-box">
      {!questions ? (
        <button type="button" onClick={async () => { const r = await questioner.followUps(text); if (r.ok) setQuestions(r.value); }}>
          Ask AI for follow-up questions
        </button>
      ) : (
        <>
          <p className="small"><strong>Follow-up questions</strong> (the AI asks, you answer. Demo uses sample questions.)</p>
          <ol>{questions.map((q) => <li key={q}>{q}</li>)}</ol>
        </>
      )}
    </div>
  );
}

export function ChainPage({ uri }: { uri: AtUri }) {
  const { store, discovery, aiFollowUps } = useServices();
  const chain = useData(() => buildChain(uri, { get: store.get, getBacklinks: discovery.getBacklinks }), [uri]);
  if (chain.loading && !chain.data) return <Loading />;
  if (!chain.data) return <ErrorNote error={chain.error} />;

  const c = chain.data;
  const root = c.nodes[c.root];
  const up = levels(c, "up").reverse(); // furthest ancestor first
  const down = levels(c, "down");
  const sessionForNew = root.kind === "session" ? root.ref.uri : root.kind === "takeaway" ? root.value.subject.uri : null;

  return (
    <div className="chain">
      <h2>Learning chain</h2>
      <p className="muted">Every link was confirmed by the student who made it. Click any card to re-center the chain on it.</p>

      <h3 className="section">Builds on ↑</h3>
      {up.length === 0 && <p className="muted">This doesn't build on anything yet.</p>}
      {up.map((level, i) => (
        <div key={i} className="level">{level.map((p) => <Node key={p.uri} record={c.nodes[p.uri]} relation={p.relation} direction="up" />)}</div>
      ))}

      <article className="card root">
        <div className="card-head">
          <span className="kind">{KIND_LABEL[root.kind]}</span><AuthorName did={root.author} />
        </div>
        <p className="card-text">{recordText(root)}</p>
        {"topics" in root.value && <Topics topics={root.value.topics} />}
        <div className="actions">
          {sessionForNew && (
            <Link to={{ name: "compose", session: sessionForNew, buildsOn: root.ref.uri }} className="button primary">Build on this</Link>
          )}
          {root.kind === "takeaway" && <Link to={{ name: "session", uri: root.value.subject.uri }} className="button">Open session</Link>}
          {root.kind === "question" && <Link to={{ name: "question", uri: root.ref.uri }} className="button">Open question</Link>}
        </div>
        {aiFollowUps && root.kind === "takeaway" && root.author === store.me && <FollowUps text={root.value.text} />}
      </article>

      <h3 className="section">Built on by ↓</h3>
      {down.length === 0 && <p className="muted">Nobody has built on this yet.</p>}
      {down.map((level, i) => (
        <div key={i} className="level">{level.map((p) => <Node key={p.uri} record={c.nodes[p.uri]} relation={p.relation} direction="down" />)}</div>
      ))}

      {c.missing.length > 0 && <p className="muted small">{c.missing.length} linked record(s) were deleted by their authors.</p>}
    </div>
  );
}
