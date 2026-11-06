// Tiny hash router: enough for a demo, no dependency needed.
import { useEffect, useState } from "react";
import type { AtUri } from "../domain/types";

export type Route =
  | { name: "sessions" }
  | { name: "newSession" }
  | { name: "session"; uri: AtUri }
  | { name: "compose"; session: AtUri; buildsOn?: AtUri }
  | { name: "chain"; uri: AtUri }
  | { name: "questions" }
  | { name: "question"; uri: AtUri }
  | { name: "review" }
  | { name: "notes" };

const enc = encodeURIComponent;

export function href(r: Route): string {
  switch (r.name) {
    case "sessions": return "#/";
    case "newSession": return "#/sessions/new";
    case "session": return `#/session/${enc(r.uri)}`;
    case "compose": return `#/compose/${enc(r.session)}${r.buildsOn ? `?buildsOn=${enc(r.buildsOn)}` : ""}`;
    case "chain": return `#/chain/${enc(r.uri)}`;
    case "questions": return "#/questions";
    case "question": return `#/question/${enc(r.uri)}`;
    case "review": return "#/review";
    case "notes": return "#/notes";
  }
}

export function parseHash(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query);
  switch (parts[0]) {
    case "sessions": return parts[1] === "new" ? { name: "newSession" } : { name: "sessions" };
    case "session": return parts[1] ? { name: "session", uri: parts[1] } : { name: "sessions" };
    case "compose": return parts[1] ? { name: "compose", session: parts[1], buildsOn: params.get("buildsOn") ?? undefined } : { name: "sessions" };
    case "chain": return parts[1] ? { name: "chain", uri: parts[1] } : { name: "sessions" };
    case "questions": return { name: "questions" };
    case "question": return parts[1] ? { name: "question", uri: parts[1] } : { name: "questions" };
    case "review": return { name: "review" };
    case "notes": return { name: "notes" };
    default: return { name: "sessions" };
  }
}

export const navigate = (r: Route) => { window.location.hash = href(r); };

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => { setRoute(parseHash(window.location.hash)); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
