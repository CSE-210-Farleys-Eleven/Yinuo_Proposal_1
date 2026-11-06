// Private notes: raw thinking that stays in this browser and is never published.
import { useState } from "react";
import { useData, useServices } from "../app/services";
import { daysAgo } from "../ui/components";

export function NotesPage() {
  const { notes, now } = useServices();
  const [text, setText] = useState("");
  const [tick, setTick] = useState(0); // notes aren't network records, so reload on our own saves
  const list = useData(() => notes.list(), [tick, notes]);
  return (
    <div>
      <h2>Private notes</h2>
      <p className="notice">These notes stay in this browser only. They are never published and never sent to the AI.</p>
      <div className="card compose">
        <label className="field"><span>New note</span>
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Raw thoughts, confusions, half-formed ideas…" />
        </label>
        <div className="actions">
          <button type="button" className="primary" disabled={!text.trim()} onClick={async () => {
            await notes.save({ id: crypto.randomUUID(), text: text.trim(), updatedAt: now().toISOString() });
            setText(""); setTick((t) => t + 1);
          }}>Save privately</button>
        </div>
      </div>
      {(list.data ?? []).map((n) => (
        <article key={n.id} className="card note">
          <p>{n.text}</p>
          <footer className="card-foot">
            <span className="muted">{daysAgo(n.updatedAt, now())}</span>
            <button type="button" className="link" onClick={async () => { await notes.remove(n.id); setTick((t) => t + 1); }}>Delete</button>
          </footer>
        </article>
      ))}
    </div>
  );
}
