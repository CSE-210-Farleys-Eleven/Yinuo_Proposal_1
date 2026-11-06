// Decides which takeaways are due for review. Pure: it returns a list and sends nothing.

export const REVIEW_INTERVALS_DAYS = [7, 30] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DueReview {
  uri: string;
  intervalDays: number;
  daysAgo: number;
}

/** Key marking one review as done, e.g. "at://.../abc#7". */
export const reviewKey = (uri: string, intervalDays: number) => `${uri}#${intervalDays}`;

/**
 * For each takeaway, the earliest review not yet done, if its time has come.
 * Oldest takeaways first.
 */
export function dueForReview(
  takeaways: { uri: string; createdAt: string }[],
  now: Date,
  doneKeys: string[],
): DueReview[] {
  const done = new Set(doneKeys);
  const due: DueReview[] = [];
  for (const t of takeaways) {
    const daysAgo = Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / DAY_MS);
    const next = REVIEW_INTERVALS_DAYS.find((d) => !done.has(reviewKey(t.uri, d)));
    if (next !== undefined && daysAgo >= next) due.push({ uri: t.uri, intervalDays: next, daysAgo });
  }
  return due.sort((a, b) => b.daysAgo - a.daysAgo);
}
