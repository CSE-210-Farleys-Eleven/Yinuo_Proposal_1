// Small shared UI pieces. No business rules here: they call domain functions.
import { useState, type ReactNode } from "react";
import { useData, useServices } from "../app/services";
import { href, type Route } from "../app/router";
import { SENSITIVE_LABELS, checkSensitive } from "../domain/sensitiveCheck";
import type { AppError, Result } from "../domain/result";
import type { AnyRecord, Did, Track } from "../domain/types";

export const Link = ({ to, children, className }: { to: Route; children: ReactNode; className?: string }) => (
  <a href={href(to)} className={className}>{children}</a>
);

export function AuthorName({ did }: { did: Did }) {
  const { discovery } = useServices();
  const p = useData(() => discovery.getProfile(did), [did]);
  return <span className="author">{p.data?.displayName ?? "…"}</span>;
}

export const TrackBadge = ({ track }: { track: Track }) => (
  <span className={`badge track-${track}`}>{track === "concepts" ? "AI Concepts" : "AI Practice"}</span>
);

export const Topics = ({ topics }: { topics: string[] }) => (
  <span className="topics">{topics.map((t) => <span key={t} className="topic">#{t}</span>)}</span>
);

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
export function daysAgo(iso: string, now: Date): string {
  const d = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

export const KIND_LABEL: Record<AnyRecord["kind"], string> = {
  session: "Session", takeaway: "Takeaway", question: "Question", response: "Response", rsvp: "RSVP",
};

/** The main text of any record. */
export function recordText(r: AnyRecord): string {
  switch (r.kind) {
    case "session": return r.value.title;
    case "rsvp": return `RSVP: ${r.value.status}`;
    default: return r.value.text;
  }
}

export const ErrorNote = ({ error }: { error?: AppError }) =>
  error ? <p className="error" role="status">{error.message}</p> : null;

export const Loading = () => <p className="muted">Loading…</p>;

/** Live warnings while typing. */
export function SensitiveWarnings({ texts }: { texts: string[] }) {
  const findings = texts.flatMap(checkSensitive);
  if (!findings.length) return null;
  return (
    <div className="warning" role="alert">
      <strong>Check before publishing.</strong> This looks like it contains{" "}
      {[...new Set(findings.map((f) => SENSITIVE_LABELS[f.kind]))].join(", ")}. Everything you publish is public.
    </div>
  );
}

/**
 * Every publish goes through here: preview → public notice → explicit confirm.
 * If the text has sensitive-looking content, the student must tick an override.
 */
export function PublishPanel({ texts, canPreview, preview, onPublish }: {
  texts: string[];
  canPreview: boolean;
  preview: ReactNode;
  onPublish: () => Promise<Result<unknown>>;
}) {
  const [previewing, setPreviewing] = useState(false);
  const [override, setOverride] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AppError>();
  const risky = texts.some((t) => checkSensitive(t).length > 0);

  if (!previewing) {
    return (
      <div className="actions">
        <button type="button" className="primary" disabled={!canPreview} onClick={() => setPreviewing(true)}>Preview</button>
      </div>
    );
  }
  return (
    <section className="preview" aria-label="Preview">
      <h3>Preview</h3>
      <div className="preview-body">{preview}</div>
      <p className="notice">
        <strong>This will be public:</strong> visible to anyone, and other services may copy it. You can delete it later,
        but copies may remain.
      </p>
      {risky && (
        <label className="check">
          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
          Publish anyway: I checked the warnings above
        </label>
      )}
      <ErrorNote error={error} />
      <div className="actions">
        <button type="button" onClick={() => setPreviewing(false)}>Back to edit</button>
        <button
          type="button" className="primary" disabled={busy || (risky && !override)}
          onClick={async () => {
            setBusy(true);
            const r = await onPublish();
            setBusy(false);
            if (!r.ok) setError(r.error);
          }}
        >Publish publicly</button>
      </div>
    </section>
  );
}

/** Compact card for any record, linking to its chain. */
export function RecordCard({ record, extra }: { record: AnyRecord; extra?: ReactNode }) {
  const { now } = useServices();
  return (
    <article className={`card kind-${record.kind}`}>
      <header className="card-head">
        <span className="kind">{KIND_LABEL[record.kind]}</span>
        <AuthorName did={record.author} />
        <span className="muted">· {daysAgo(record.createdAt, now())}</span>
      </header>
      <p className="card-text">{recordText(record)}</p>
      {"topics" in record.value && <Topics topics={record.value.topics} />}
      <footer className="card-foot">
        {extra}
        <Link to={{ name: "chain", uri: record.ref.uri }} className="chain-link">View chain →</Link>
      </footer>
    </article>
  );
}
