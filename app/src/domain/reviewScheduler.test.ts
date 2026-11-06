import { dueForReview, reviewKey } from "./reviewScheduler";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-30T12:00:00Z");
const item = (uri: string, daysAgo: number) => ({ uri, createdAt: new Date(now.getTime() - daysAgo * day).toISOString() });

describe("dueForReview", () => {
  it("returns nothing for a takeaway written today", () => {
    expect(dueForReview([item("a", 0)], now, [])).toEqual([]);
  });

  it("makes a takeaway due 7 days after it was written", () => {
    expect(dueForReview([item("a", 7)], now, [])).toEqual([{ uri: "a", intervalDays: 7, daysAgo: 7 }]);
  });

  it("makes it due again at 30 days, once the 7-day review is done", () => {
    const due = dueForReview([item("a", 31)], now, [reviewKey("a", 7)]);
    expect(due).toEqual([{ uri: "a", intervalDays: 30, daysAgo: 31 }]);
  });

  it("asks only for the earliest unfinished review, not both at once", () => {
    expect(dueForReview([item("a", 40)], now, []).map((d) => d.intervalDays)).toEqual([7]);
  });

  it("returns nothing once every review is done", () => {
    expect(dueForReview([item("a", 40)], now, [reviewKey("a", 7), reviewKey("a", 30)])).toEqual([]);
  });

  it("lists the oldest takeaways first", () => {
    expect(dueForReview([item("new", 8), item("old", 20)], now, []).map((d) => d.uri)).toEqual(["old", "new"]);
  });
});
