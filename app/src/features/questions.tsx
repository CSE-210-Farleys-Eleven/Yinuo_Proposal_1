// Theoretical questions, proposed solutions, and follow-ups.
import { useState } from "react";
import { navigate } from "../app/router";
import { useData, useServices } from "../app/services";
import { normalizeTopics } from "../domain/validation";
import type { AtUri, RecordRef, StoredRecord, Track } from "../domain/types";
import {
  AuthorName, ErrorNote, Link, Loading, PublishPanel, SensitiveWarnings, Topics, TrackBadge, daysAgo,
} from "../ui/components";

function AskForm({ onDone }: { onDone: () => void }) {
  const { store } = useServices();
  const [text, setText] = useState("");
  const [solution, setSolution] = useState("");
  const [track, setTrack] = useState<Track>("concepts");
  const [topicsText, setTopicsText] = useState("");
  const topics = normalizeTopics(topicsText);
  return (
    <div className="card compose">
      <h3>Ask a question</h3>
      <p className="muted small">Conceptual questions only, not graded homework.</p>
      <label className="field"><span>Your question</span><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></label>
      <label className="field"><span>Your proposed solution (optional)</span><textarea rows={2} value={solution} onChange={(e) => setSolution(e.target.value)} /></label>
      <div className="row">
        <label className="field"><span>Track</span>
          <select value={track} onChange={(e) => setTrack(e.target.value as Track)}>
            <option value="concepts">AI Concepts</option><option value="practice">AI Practice</option>
          </select>
        </label>
        <label className="field"><span>Topics (comma separated)</span><input value={topicsText} onChange={(e) => setTopicsText(e.target.value)} /></label>
      </div>
      <SensitiveWarnings texts={[text, solution]} />
      <PublishPanel
        texts={[text, solution]} canPreview={text.trim() !== ""}
        preview={<><p><strong>{text}</strong></p>{solution && <p>Proposed: {solution}</p>}<Topics topics={topics} /></>}
        onPublish={async () => {
          const r = await store.create("question", {
            text: text.trim(), track, topics, buildsOn: [], ...(solution.trim() ? { proposedSolution: solution.trim() } : {}),
          });
          if (r.ok) onDone();
          return r;
        }}
      />
    </div>
  );
}

export function QuestionsPage() {
  const { discovery, now } = useServices();
  const [track, setTrack] = useState<Track | "all">("all");
  const [asking, setAsking] = useState(false);
  const qs = useData(() => discovery.listQuestions({ track: track === "all" ? undefined : track }), [track]);
  return (
    <div>
      <div className="page-head">
        <h2>Questions</h2>
        <button type="button" className="primary" onClick={() => setAsking(!asking)}>{asking ? "Close" : "Ask a question"}</button>
      </div>
      {asking && <AskForm onDone={() => setAsking(false)} />}
      <div className="segmented" role="group" aria-label="Track">
        {(["all", "concepts", "practice"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={track === v} onClick={() => setTrack(v)}>
            {v === "all" ? "All" : v === "concepts" ? "AI Concepts" : "AI Practice"}
          </button>
        ))}
      </div>
      {qs.loading && <Loading />}
      {(qs.data ?? []).map((q) => (
        <Link key={q.ref.uri} to={{ name: "question", uri: q.ref.uri }} className="card question-card">
          <div className="card-head"><TrackBadge track={q.value.track} /><AuthorName did={q.author} /><span className="muted">· {daysAgo(q.createdAt, now())}</span></div>
          <h3>{q.value.text}</h3>
          {q.value.proposedSolution && <p className="muted">Proposed solution included</p>}
          <Topics topics={q.value.topics} />
        </Link>
      ))}
    </div>
  );
}

function ReplyForm({ subject, label, onDone }: { subject: RecordRef; label: string; onDone: () => void }) {
  const { store } = useServices();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"solution" | "followUp">("solution");
  return (
    <div className="reply">
      <div className="segmented" role="group" aria-label="Reply type">
        <button type="button" aria-pressed={kind === "solution"} onClick={() => setKind("solution")}>Proposed solution</button>
        <button type="button" aria-pressed={kind === "followUp"} onClick={() => setKind("followUp")}>Follow-up question</button>
      </div>
      <label className="field"><span>{label}</span><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></label>
      <SensitiveWarnings texts={[text]} />
      <PublishPanel
        texts={[text]} canPreview={text.trim() !== ""} preview={<p>{text}</p>}
        onPublish={async () => {
          const r = await store.create("response", { subject, kind, text: text.trim() });
          if (r.ok) { setText(""); onDone(); }
          return r;
        }}
      />
    </div>
  );
}

function Thread({ subjectUri, depth }: { subjectUri: AtUri; depth: number }) {
  const { discovery, now } = useServices();
  const [replyTo, setReplyTo] = useState<AtUri | null>(null);
  const responses = useData(() => discovery.getResponses(subjectUri), [subjectUri]);
  return (
    <div className={depth ? "thread nested" : "thread"}>
      {(responses.data ?? []).map((r) => (
        <div key={r.ref.uri} className="response">
          <div className="card-head">
            <span className={`badge ${r.value.kind}`}>{r.value.kind === "solution" ? "Solution" : "Follow-up"}</span>
            <AuthorName did={r.author} /><span className="muted">· {daysAgo(r.createdAt, now())}</span>
          </div>
          <p>{r.value.text}</p>
          {depth < 3 && <button type="button" className="link" onClick={() => setReplyTo(replyTo === r.ref.uri ? null : r.ref.uri)}>Reply</button>}
          {replyTo === r.ref.uri && <ReplyForm subject={r.ref} label="Your reply" onDone={() => setReplyTo(null)} />}
          <Thread subjectUri={r.ref.uri} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

export function QuestionPage({ uri }: { uri: AtUri }) {
  const { store } = useServices();
  const q = useData(() => store.get(uri), [uri]);
  if (q.loading) return <Loading />;
  if (!q.data || q.data.kind !== "question") return <ErrorNote error={q.error ?? { kind: "notFound", message: "Not a question." }} />;
  const question = q.data as StoredRecord<"question">;
  return (
    <div>
      <p><Link to={{ name: "questions" }}>← All questions</Link></p>
      <div className="card hero">
        <div className="card-head"><TrackBadge track={question.value.track} /><AuthorName did={question.author} /></div>
        <h2>{question.value.text}</h2>
        {question.value.proposedSolution && <p><strong>Proposed solution:</strong> {question.value.proposedSolution}</p>}
        <Topics topics={question.value.topics} />
        <div className="actions"><Link to={{ name: "chain", uri }} className="button">View chain</Link></div>
      </div>
      <h3 className="section">Responses</h3>
      <Thread subjectUri={uri} depth={0} />
      <h3 className="section">Add a response</h3>
      <ReplyForm subject={question.ref} label="Your response" onDone={() => navigate({ name: "question", uri })} />
    </div>
  );
}
