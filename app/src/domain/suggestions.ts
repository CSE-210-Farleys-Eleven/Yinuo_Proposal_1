// Ranks link candidates by shared tags. It only SUGGESTS; the student confirms every link.
import { normalizeTopic } from "./validation";

interface Candidate {
  uri: string;
  topics: string[];
  createdAt: string;
}

export function rankSuggestions<T extends Candidate>(
  candidates: T[],
  tags: string[],
  exclude: string[] = [],
  limit = 5,
): T[] {
  const wanted = new Set(tags.map(normalizeTopic).filter(Boolean));
  const skip = new Set(exclude);
  return candidates
    .filter((c) => !skip.has(c.uri))
    .map((c) => ({ c, shared: c.topics.map(normalizeTopic).filter((t) => wanted.has(t)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || b.c.createdAt.localeCompare(a.c.createdAt))
    .slice(0, limit)
    .map((x) => x.c);
}
