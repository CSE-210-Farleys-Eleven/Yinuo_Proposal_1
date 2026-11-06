// Sample students and records for the demo. Dates are relative to "now",
// so some takeaways are always due for review. Every record passes validation.
import type { BuildsOn, Did, Profile, RecordKind, RecordValue, StoredRecord } from "../../domain/types";
import type { MemoryNetwork } from "./index";

export const ALICE = "did:plc:alice-demo";
export const BOB = "did:plc:bob-demo";
export const CAROL = "did:plc:carol-demo";

export const SEED_USERS: Profile[] = [
  { did: ALICE, handle: "alice.bsky.social", displayName: "Alice" },
  { did: BOB, handle: "bob.bsky.social", displayName: "Bob" },
  { did: CAROL, handle: "carol.bsky.social", displayName: "Carol" },
];

const DAY = 24 * 60 * 60 * 1000;

export function seedNetwork(net: MemoryNetwork, now: Date): void {
  const at = (days: number) => new Date(now.getTime() + days * DAY).toISOString();
  function put<K extends RecordKind>(author: Did, kind: K, value: RecordValue<K>, daysAgo: number): StoredRecord<K> {
    const r = net.write(author, kind, value, { createdAt: at(-daysAgo) });
    if (!r.ok) throw new Error(`Invalid seed ${kind}: ${r.error.message}`);
    return r.value;
  }
  const link = (target: StoredRecord, relation: BuildsOn["relation"]): BuildsOn => ({ target: target.ref, relation });

  // --- Past sessions ---
  const s1 = put(ALICE, "session", {
    title: "Attention from first principles", track: "concepts", topics: ["transformers", "attention"],
    format: "concept-review", startsAt: at(-20), buildsOn: [],
    description: "Work through scaled dot-product attention on paper before touching code.",
  }, 22);
  const s2 = put(BOB, "session", {
    title: "Mock interview: transformer internals", track: "concepts", topics: ["transformers", "ml-interview"],
    format: "mock-interview", startsAt: at(-9), buildsOn: [link(s1, "deepens")],
    description: "Take turns explaining attention, multi-head attention, and positional encoding out loud.",
  }, 11);
  const s3 = put(CAROL, "session", {
    title: "Build jam: a tiny RAG app", track: "practice", topics: ["rag", "ai-assisted-coding"],
    format: "build-jam", startsAt: at(-5), buildsOn: [link(s1, "broadens")],
    description: "Build a retrieval-augmented app in an hour, with an AI assistant, and compare choices.",
  }, 7);

  // --- Upcoming sessions ---
  put(ALICE, "session", {
    title: "Prompting vs. fine-tuning: when to use which", track: "practice", topics: ["prompting", "evaluation"],
    format: "discussion", startsAt: at(2), buildsOn: [],
    description: "Bring one real project. We decide together which approach fits and how we'd measure it.",
  }, 1);
  put(BOB, "session", {
    title: "RL basics: policy gradients", track: "concepts", topics: ["rl"],
    format: "concept-review", startsAt: at(4), buildsOn: [],
    description: "Derive REINFORCE step by step. No code until everyone can explain the log-derivative trick.",
  }, 1);
  const s6 = put(CAROL, "session", {
    title: "Debugging with AI: read the stack trace first", track: "practice", topics: ["ai-assisted-coding", "debugging"],
    format: "debugging", startsAt: at(6), buildsOn: [],
    description: "Bring a bug. Explain it to a peer before asking an AI, then compare what each of them caught.",
  }, 0);

  // --- Takeaways: one chain across three students ---
  const t1 = put(ALICE, "takeaway", {
    subject: s1.ref, topics: ["transformers", "attention"], buildsOn: [],
    text: "Self-attention compares every token with every other token; the output is a weighted mix of the values. Still unclear: why divide by √d?",
  }, 20);
  const t2 = put(ALICE, "takeaway", {
    subject: s1.ref, topics: ["attention"], buildsOn: [link(t1, "deepens")],
    text: "Dividing by √d keeps dot products from growing with the dimension, so softmax doesn't saturate and gradients stay usable.",
  }, 18);
  put(BOB, "takeaway", {
    subject: s2.ref, topics: ["transformers", "attention"], buildsOn: [link(t2, "deepens")],
    text: "Explaining multi-head attention out loud showed me each head can learn a different relation. I wrote one from scratch in NumPy to check.",
  }, 9);
  const t4 = put(CAROL, "takeaway", {
    subject: s3.ref, topics: ["rag", "attention"], buildsOn: [link(t2, "broadens")],
    text: "Retrieval works like attention over documents: embed, score by similarity, and mix the top results into the prompt. Built a 60-line RAG demo.",
  }, 5);
  put(CAROL, "takeaway", {
    subject: s3.ref, topics: ["ai-assisted-coding", "rag"], buildsOn: [link(t4, "deepens")],
    text: "The AI wrote most of the boilerplate, but I had to fix the chunking myself. Lesson: ask the AI to justify its chunking choice before accepting it.",
  }, 4);

  // --- Questions and responses ---
  const q1 = put(BOB, "question", {
    text: "Why does LayerNorm come after attention in the original transformer, but before it in most modern ones?",
    track: "concepts", topics: ["transformers"], buildsOn: [link(t2, "deepens")],
    proposedSolution: "Pre-norm seems to train more stably in deep stacks, but I can't explain why.",
  }, 8);
  const r1 = put(ALICE, "response", {
    subject: q1.ref, kind: "solution",
    text: "Pre-norm keeps a clean residual path, so gradients reach early layers without passing through a normalization step.",
  }, 7);
  put(CAROL, "response", {
    subject: r1.ref, kind: "followUp",
    text: "Does that mean post-norm depends more on learning-rate warmup?",
  }, 6);
  put(CAROL, "question", {
    text: "How do you evaluate a RAG app beyond \"it looks right\"?", track: "practice", topics: ["rag", "evaluation"],
    buildsOn: [link(t4, "deepens")],
  }, 3);

  // --- RSVPs ---
  put(ALICE, "rsvp", { subject: s6.ref, status: "going" }, 0);
}
