// Brings old takeaways back for review after 7 and 30 days.
import { useState } from "react";
import { useData, useServices } from "../app/services";
import { dueForReview, reviewKey } from "../domain/reviewScheduler";
import type { StoredRecord } from "../domain/types";
import { Link, Loading, RecordCard } from "../ui/components";

export function ReviewPage() {
  const { store, discovery, prefs, now } = useServices();
  const key = `learnchain.reviews.${store.me}`;
  const [done, setDone] = useState<string[]>(() => JSON.parse(prefs.getItem(key) ?? "[]"));
  const mine = useData(() => discovery.listByAuthor(store.me), [store.me]);
  const takeaways = (mine.data ?? []).filter((r): r is StoredRecord<"takeaway"> & typeof r => r.kind === "takeaway");
  const byUri = Object.fromEntries(takeaways.map((t) => [t.ref.uri, t]));
  const due = dueForReview(takeaways.map((t) => ({ uri: t.ref.uri, createdAt: t.createdAt })), now(), done);

  const markDone = (uri: string, interval: number) => {
    const next = [...done, reviewKey(uri, interval)];
    setDone(next);
    prefs.setItem(key, JSON.stringify(next)); // private: stays in this browser
  };

  if (mine.loading) return <Loading />;
  return (
    <div>
      <h2>Review</h2>
      <p className="muted">Takeaways come back after 7 and 30 days. Is it still clear? Can you go deeper?</p>
      <h3 className="section">Due now ({due.length})</h3>
      {due.length === 0 && <p className="muted">Nothing due. Nice.</p>}
      {due.map((d) => (
        <RecordCard key={d.uri} record={byUri[d.uri]} extra={
          <span className="review-actions">
            <span className="badge">{d.intervalDays}-day review</span>
            <Link to={{ name: "compose", session: byUri[d.uri].value.subject.uri, buildsOn: d.uri }} className="button small">Go deeper</Link>
            <button type="button" className="small" onClick={() => markDone(d.uri, d.intervalDays)}>Still clear, mark reviewed</button>
          </span>
        } />
      ))}
      <h3 className="section">All my takeaways ({takeaways.length})</h3>
      {takeaways.map((t) => <RecordCard key={t.ref.uri} record={t} />)}
    </div>
  );
}
