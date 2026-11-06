import { href, parseHash, type Route } from "./router";

const uri = "at://did:plc:alice-demo/example.learnchain.takeaway/00000a";

describe("router", () => {
  const routes: Route[] = [
    { name: "sessions" },
    { name: "newSession" },
    { name: "session", uri },
    { name: "compose", session: uri },
    { name: "compose", session: uri, buildsOn: uri + "b" },
    { name: "chain", uri },
    { name: "questions" },
    { name: "question", uri },
    { name: "review" },
    { name: "notes" },
  ];
  it.each(routes)("round-trips %o through the URL hash", (route) => {
    expect(parseHash(href(route))).toEqual(route);
  });

  it("falls back to the sessions page for unknown paths", () => {
    expect(parseHash("#/nowhere")).toEqual({ name: "sessions" });
  });
});
