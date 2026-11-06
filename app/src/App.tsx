import { navigate, useRoute, type Route } from "./app/router";
import { useServices } from "./app/services";
import { ChainPage } from "./features/chain";
import { ComposeTakeaway } from "./features/compose";
import { NotesPage } from "./features/notes";
import { QuestionPage, QuestionsPage } from "./features/questions";
import { ReviewPage } from "./features/review";
import { NewSessionPage, SessionPage, SessionsPage } from "./features/sessions";
import { Link } from "./ui/components";

const NAV: { label: string; to: Route; match: Route["name"][] }[] = [
  { label: "Sessions", to: { name: "sessions" }, match: ["sessions", "session", "newSession", "compose"] },
  { label: "Questions", to: { name: "questions" }, match: ["questions", "question"] },
  { label: "Review", to: { name: "review" }, match: ["review"] },
  { label: "Private notes", to: { name: "notes" }, match: ["notes"] },
];

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case "sessions": return <SessionsPage />;
    case "newSession": return <NewSessionPage />;
    case "session": return <SessionPage uri={route.uri} />;
    case "compose":
      return <ComposeTakeaway key={route.session + route.buildsOn} sessionUri={route.session} buildsOnUri={route.buildsOn}
        onPublished={(uri) => navigate({ name: "chain", uri })} />;
    case "chain": return <ChainPage uri={route.uri} />;
    case "questions": return <QuestionsPage />;
    case "question": return <QuestionPage uri={route.uri} />;
    case "review": return <ReviewPage />;
    case "notes": return <NotesPage />;
  }
}

export function App() {
  const route = useRoute();
  const { me, users, switchUser, aiFollowUps, setAiFollowUps } = useServices();
  return (
    <>
      <div className="demo-banner">
        Demo: sample students and records, kept in memory. Nothing is published to the AT Protocol network.
      </div>
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden="true"><i /><i /><i /></span>
          <strong>Learning Chains</strong>
        </div>
        <nav aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.label} to={n.to} className={n.match.includes(route.name) ? "active" : ""}>{n.label}</Link>
          ))}
        </nav>
        <div className="controls">
          <label className="small">Viewing as{" "}
            <select value={me.did} onChange={(e) => switchUser(e.target.value)}>
              {users.map((u) => <option key={u.did} value={u.did}>{u.displayName} (@{u.handle})</option>)}
            </select>
          </label>
          <label className="small check" title="Optional feature, off by default">
            <input type="checkbox" checked={aiFollowUps} onChange={(e) => setAiFollowUps(e.target.checked)} />
            AI follow-up questions
          </label>
        </div>
      </header>
      <main>
        <Page route={route} />
      </main>
    </>
  );
}
