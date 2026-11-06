import { collectionFor, kindForCollection, makeAtUri, parseAtUri } from "./atUri";

describe("AT URIs", () => {
  it("builds an at:// address from author, record kind, and key", () => {
    const uri = makeAtUri("did:plc:alice", "takeaway", "3abc");
    expect(uri).toBe("at://did:plc:alice/example.learnchain.takeaway/3abc");
  });

  it("parses an address back into its parts", () => {
    const parts = parseAtUri("at://did:plc:bob/example.learnchain.session/xyz");
    expect(parts).toEqual({ did: "did:plc:bob", kind: "session", rkey: "xyz" });
  });

  it("returns null for an address that is not one of our record types", () => {
    expect(parseAtUri("at://did:plc:bob/app.bsky.feed.post/xyz")).toBeNull();
  });

  it("returns null for text that is not an AT URI", () => {
    expect(parseAtUri("https://example.com")).toBeNull();
  });

  it("maps record kinds to collection names and back", () => {
    expect(collectionFor("question")).toBe("example.learnchain.question");
    expect(kindForCollection("example.learnchain.response")).toBe("response");
    expect(kindForCollection("app.bsky.graph.block")).toBeNull();
  });
});
