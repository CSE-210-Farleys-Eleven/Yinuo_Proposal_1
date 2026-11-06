import { rankSuggestions } from "./suggestions";

const rec = (uri: string, topics: string[], createdAt: string) => ({ uri, topics, createdAt });

describe("rankSuggestions", () => {
  const candidates = [
    rec("one-tag-old", ["transformers"], "2026-10-01T00:00:00Z"),
    rec("two-tags", ["transformers", "attention"], "2026-10-02T00:00:00Z"),
    rec("no-overlap", ["rl"], "2026-10-05T00:00:00Z"),
    rec("one-tag-new", ["attention"], "2026-10-04T00:00:00Z"),
  ];

  it("keeps only records sharing at least one tag", () => {
    expect(rankSuggestions(candidates, ["transformers", "attention"]).map((c) => c.uri)).not.toContain("no-overlap");
  });

  it("ranks by number of shared tags, then newest first", () => {
    expect(rankSuggestions(candidates, ["transformers", "attention"]).map((c) => c.uri))
      .toEqual(["two-tags", "one-tag-new", "one-tag-old"]);
  });

  it("matches tags regardless of case and spacing", () => {
    expect(rankSuggestions(candidates, ["  RL "]).map((c) => c.uri)).toEqual(["no-overlap"]);
  });

  it("leaves out excluded records, such as the draft's own session", () => {
    expect(rankSuggestions(candidates, ["attention"], ["two-tags"]).map((c) => c.uri)).toEqual(["one-tag-new"]);
  });

  it("returns at most the requested number", () => {
    expect(rankSuggestions(candidates, ["transformers", "attention"], [], 2)).toHaveLength(2);
  });
});
