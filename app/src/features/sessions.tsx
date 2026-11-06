// Browse, host, and join study sessions.
import { useState } from "react";
import { navigate } from "../app/router";
import { useData, useServices } from "../app/services";
import { normalizeTopics } from "../domain/validation";
import type { AtUri, SessionFormat, StoredRecord, Track } from "../domain/types";
import {
  AuthorName, ErrorNote, Link, Loading, PublishPanel, RecordCard, SensitiveWarnings, Topics, TrackBadge, formatDate,
} from "../ui/components";

const FORMAT_LABEL: Record<SessionFormat, string> = {
  "concept-review": "Concept review", "mock-interview": "Mock interview", discussion: "Discussion",
  "workflow-share": "Workflow share", "build-jam": "Build jam", debugging: "Debugging with AI",
};

function SessionCard({ s }: { s: StoredRecord<"session"> }) {
  return (
    <Link to={{ name: "session", uri: s.ref.uri }} className="card session-card">
      <div className="card-head"><TrackBadge track={s.value.track} /><span className="muted">{FORMAT_LABEL[s.value.format]}</span></div>
      <h3>{s.value.title}</h3>
      <p className="muted">{formatDate(s.value.startsAt)} · hosted by <AuthorName did={s.author} /></p>
      <Topics topics={s.value.topics} />
    </Link>
  );
}

export function SessionsPage() {
  const { discovery, now } = useServices();
  const [track, setTrack] = useState<Track | "all">("all");
  const [tag, setTag] = useState<string | null>(null);
  const all = useData(() => discovery.listSessions(), []);
  const shown = useData(
    () => discovery.listSessions({ track: track === "all" ? undefined : track, tags: tag ? [tag] : undefined }),
    [track, tag],
  );
  const allTags = [...new Set((all.data ?? []).flatMap((s) => s.value.topics))].sort();
  const t = now().toISOString();
  const upcoming = (shown.data ?? []).filter((s) => s.value.startsAt >= t);
  const past = (shown.data ?? []).filter((s) => s.value.startsAt < t).reverse();

  return (
    <div>
      <div className="page-head">
        <h2>Study sessions</h2>
        <Link to={{ name: "newSession" }} className="button primary">Host a session</Link>
      </div>
      <div className="filters">
        <div className="segmented" role="group" aria-label="Track">
          {(["all", "concepts", "practice"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={track === v} onClick={() => setTrack(v)}>
              {v === "all" ? "All" : v === "concepts" ? "AI Concepts" : "AI Practice"}
            </button>
          ))}
        </div>
        <div className="tag-filter" role="group" aria-label="Topic">
          {allTags.map((x) => (
            <button key={x} type="button" className="topic" aria-pressed={tag === x} onClick={() => setTag(tag === x ? null : x)}>#{x}</button>
          ))}
        </div>
      </div>
      {shown.loading && <Loading />}
      <ErrorNote error={shown.error} />
      <h3 className="section">Upcoming</h3>
      {upcoming.length ? <div className="grid">{upcoming.map((s) => <SessionCard key={s.ref.uri} s={s} />)}</div>
        : <p className="muted">No upcoming sessions match.</p>}
      <h3 className="section">Past</h3>
      {past.length ? <div className="grid">{past.map((s) => <SessionCard key={s.ref.uri} s={s} />)}</div>
        : <p className="muted">No past sessions match.</p>}
    </div>
  );
}

function Rsvp({ session }: { session: StoredRecord<"session"> }) {
  const { store, discovery } = useServices();
  const mine = useData(() => discovery.listByAuthor(store.me), [store.me]);
  const existing = (mine.data ?? []).find((r): r is StoredRecord<"rsvp"> & typeof r => r.kind === "rsvp" && r.value.subject.uri === session.ref.uri);
  const [error, setError] = useState<string>();
  const setStatus = async (status: "going" | "interested") => {
    const r = existing
      ? await store.update(existing.ref, { subject: session.ref, status })
      : await store.create("rsvp", { subject: session.ref, status });
    setError(r.ok ? undefined : r.error.message);
  };
  return (
    <div className="rsvp">
      <span>Your RSVP{existing ? `: ${existing.value.status}` : ""}</span>
      <button type="button" aria-pressed={existing?.value.status === "going"} onClick={() => setStatus("going")}>Going</button>
      <button type="button" aria-pressed={existing?.value.status === "interested"} onClick={() => setStatus("interested")}>Interested</button>
      {existing && <button type="button" onClick={() => store.remove(existing.ref)}>Cancel</button>}
      <span className="muted small">RSVPs are public.</span>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

export function SessionPage({ uri }: { uri: AtUri }) {
  const { store, discovery } = useServices();
  const session = useData(() => store.get(uri), [uri]);
  const takeaways = useData(() => discovery.listTakeaways(uri), [uri]);
  if (session.loading) return <Loading />;
  if (!session.data || session.data.kind !== "session") return <ErrorNote error={session.error ?? { kind: "notFound", message: "Not a session." }} />;
  const s = session.data as StoredRecord<"session">;
  return (
    <div>
      <p><Link to={{ name: "sessions" }}>← All sessions</Link></p>
      <div className="card hero">
        <div className="card-head"><TrackBadge track={s.value.track} /><span className="muted">{FORMAT_LABEL[s.value.format]}</span></div>
        <h2>{s.value.title}</h2>
        <p className="muted">{formatDate(s.value.startsAt)} · hosted by <AuthorName did={s.author} /></p>
        <p>{s.value.description}</p>
        <Topics topics={s.value.topics} />
        <p className="notice small">The meeting link is shared by the host by DM. It's never put in a public record.</p>
        <Rsvp session={s} />
        <div className="actions">
          <Link to={{ name: "compose", session: uri }} className="button primary">Write a takeaway</Link>
          <Link to={{ name: "chain", uri }} className="button">View chain</Link>
        </div>
      </div>
      <h3 className="section">Takeaways from this session</h3>
      {takeaways.data?.length ? takeaways.data.map((t) => <RecordCard key={t.ref.uri} record={t} />)
        : <p className="muted">No takeaways yet. Be the first.</p>}
    </div>
  );
}

export function NewSessionPage() {
  const { store } = useServices();
  const [title, setTitle] = useState("");
  const [track, setTrack] = useState<Track>("concepts");
  const [format, setFormat] = useState<SessionFormat>("discussion");
  const [startsAt, setStartsAt] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [description, setDescription] = useState("");
  const topics = normalizeTopics(topicsText);
  return (
    <div className="compose">
      <p><Link to={{ name: "sessions" }}>← All sessions</Link></p>
      <h2>Host a session</h2>
      <label className="field"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <div className="row">
        <label className="field"><span>Track</span>
          <select value={track} onChange={(e) => setTrack(e.target.value as Track)}>
            <option value="concepts">AI Concepts</option><option value="practice">AI Practice</option>
          </select>
        </label>
        <label className="field"><span>Format</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as SessionFormat)}>
            {Object.entries(FORMAT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="field"><span>When</span><input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></label>
      </div>
      <label className="field"><span>Topics (comma separated)</span><input value={topicsText} onChange={(e) => setTopicsText(e.target.value)} /></label>
      <label className="field"><span>Description</span>
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="What will you work through? Don't put a meeting link here: share it by DM." />
      </label>
      <SensitiveWarnings texts={[title, description]} />
      <PublishPanel
        texts={[title, description]}
        canPreview={title.trim() !== "" && startsAt !== ""}
        preview={<><strong>{title}</strong><p>{description}</p><Topics topics={topics} /></>}
        onPublish={async () => {
          const r = await store.create("session", {
            title: title.trim(), track, format, topics, description: description.trim(),
            startsAt: new Date(startsAt).toISOString(), buildsOn: [],
          });
          if (r.ok) navigate({ name: "session", uri: r.value.ref.uri });
          return r;
        }}
      />
    </div>
  );
}
