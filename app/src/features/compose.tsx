// Publish a takeaway after a session, linking it to earlier work.
// Tags only SUGGEST links; the student ticks the ones it really builds on.
import { useEffect, useState } from "react";
import { useData, useServices } from "../app/services";
import { normalizeTopics } from "../domain/validation";
import { err } from "../domain/result";
import type { AnyRecord, AtUri, Relation } from "../domain/types";
import { AuthorName, KIND_LABEL, PublishPanel, SensitiveWarnings, Topics, recordText } from "../ui/components";

export function ComposeTakeaway({ sessionUri, buildsOnUri, onPublished }: {
  sessionUri: AtUri;
  /** Pre-select a link, e.g. when following up on a review. */
  buildsOnUri?: AtUri;
  onPublished: (uri: AtUri) => void;
}) {
  const { store, discovery } = useServices();
  const session = useData(() => store.get(sessionUri), [sessionUri]);
  const preset = useData(async () => (buildsOnUri ? store.get(buildsOnUri) : err<AnyRecord>("notFound", "none")), [buildsOnUri]);

  const [text, setText] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [links, setLinks] = useState<Record<AtUri, Relation>>(buildsOnUri ? { [buildsOnUri]: "deepens" } : {});

  // Start with the session's topics once it loads.
  const sessionTopics = session.data && "topics" in session.data.value ? session.data.value.topics : null;
  useEffect(() => { if (sessionTopics) setTopicsText((t) => t || sessionTopics.join(", ")); }, [sessionTopics?.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const topics = normalizeTopics(topicsText);
  const suggestions = useData(
    () => discovery.suggestLinks({ tags: topics, exclude: [sessionUri] }),
    [topics.join(), sessionUri],
  );
  const candidates = [
    ...(preset.data ? [preset.data] : []),
    ...(suggestions.data ?? []).filter((s) => s.ref.uri !== buildsOnUri),
  ];
  const byUri = Object.fromEntries(candidates.map((c) => [c.ref.uri, c]));

  const toggle = (uri: AtUri, on: boolean) =>
    setLinks((l) => { const next = { ...l }; if (on) next[uri] = "deepens"; else delete next[uri]; return next; });

  return (
    <div className="compose">
      <h2>Write a takeaway</h2>
      {session.data && <p className="muted">From session: <strong>{recordText(session.data)}</strong></p>}

      <label className="field">
        <span>What did you learn? What's still unclear?</span>
        <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Explain it in your own words. Reasoning, not solutions." />
      </label>
      <SensitiveWarnings texts={[text]} />

      <label className="field">
        <span>Topics (comma separated)</span>
        <input value={topicsText} onChange={(e) => setTopicsText(e.target.value)} />
      </label>

      <section className="suggestions">
        <h3>Does this build on earlier work?</h3>
        <p className="muted">Suggested because they share a topic. Tick only what your takeaway really builds on.</p>
        {candidates.length === 0 && <p className="muted">No suggestions for these topics.</p>}
        {candidates.map((c) => {
          const chosen = links[c.ref.uri];
          return (
            <fieldset key={c.ref.uri} className={`suggestion ${chosen ? "chosen" : ""}`}>
              <legend className="visually-hidden">Suggested link: {recordText(c).slice(0, 60)}</legend>
              <label className="check">
                <input type="checkbox" checked={!!chosen} onChange={(e) => toggle(c.ref.uri, e.target.checked)} />
                <span>
                  <span className="kind">{KIND_LABEL[c.kind]}</span> by <AuthorName did={c.author} />: {recordText(c)}
                  {"topics" in c.value && <> <Topics topics={c.value.topics} /></>}
                </span>
              </label>
              <div className="relation" role="radiogroup" aria-label="How it relates">
                {(["deepens", "broadens"] as const).map((rel) => (
                  <label key={rel} className={!chosen ? "disabled" : ""}>
                    <input type="radio" name={`rel-${c.ref.uri}`} disabled={!chosen} checked={chosen === rel}
                      onChange={() => setLinks((l) => ({ ...l, [c.ref.uri]: rel }))} />
                    {rel === "deepens" ? "Deepens" : "Broadens"}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </section>

      <PublishPanel
        texts={[text]}
        canPreview={text.trim().length > 0 && !!session.data}
        preview={
          <>
            <p>{text.trim()}</p>
            <Topics topics={topics} />
            {Object.entries(links).map(([uri, rel]) => (
              <p key={uri} className="muted">↳ {rel} {byUri[uri] ? `"${recordText(byUri[uri]).slice(0, 60)}"` : uri}</p>
            ))}
          </>
        }
        onPublish={async () => {
          if (!session.data) return err("notFound", "Session not loaded yet.");
          const buildsOn = Object.entries(links)
            .filter(([uri]) => byUri[uri])
            .map(([uri, relation]) => ({ target: byUri[uri].ref, relation }));
          const r = await store.create("takeaway", { subject: session.data.ref, text: text.trim(), topics, buildsOn });
          if (r.ok) onPublished(r.value.ref.uri);
          return r;
        }}
      />
    </div>
  );
}
