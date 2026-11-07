# AT Protocol Project: Learning Chains (v2)

*Working title. A study platform for collaborative, cumulative thinking about AI.*

Draft v2 · 2026-11-06 · Yinuo Zhou · Team of 7 · Replaces nothing: [v1](PROPOSAL.md) and the [short version](PROPOSAL_SHORT.md) are kept.

**What's new in v2**
1. **§4 How we use AT Protocol**: the exact tools, packages, and endpoints behind each feature, verified against primary sources on 2026-11-06.
2. **§5 Architecture and modules**: the app split into seven independent modules, one per team member, each with its input, output, expected behavior, and done criteria.
3. Updated tech stack, timeline, and decisions to match.

Detailed design documents: [ATPROTO_TOOLS.md](ATPROTO_TOOLS.md) · [MODULES.md](MODULES.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DESIGN_PRINCIPLES.md](DESIGN_PRINCIPLES.md)

---

## 1. Summary

AI has changed how CS students learn. Many now ask an AI to explain a solution, or simply to give one, instead of working through the material, homework, and office hours. What matters is shifting toward what AI can't replace: creativity, teamwork and discussion, deep understanding, and using AI well.

Today's tools don't support that kind of learning. AI chatbots are private and give answers by default. Piazza and Ed are tied to one course and its assignments. Discord is unstructured, and discussions vanish. Textbooks are static.

**Learning Chains** is an app on the AT Protocol (the open protocol behind Bluesky). Students hold study sessions on AI, publish what they learned, ask questions, and **link each new idea to the earlier ideas it builds on**. Over time these links form public **chains of learning** across sessions and across students.

> **Value proposition:** a dedicated place for collaborative, cumulative thinking about AI, where students' learning builds on each other's over time, in public, and stays with the student.

## 2. Scope

**Domain: AI, in two tracks.** *AI Concepts* (theory: how models work) and *AI Practice* (using AI tools and agents, building projects). One domain keeps enough students per topic for matching to work at pilot scale (20–50 users). The record format itself works for any domain.

**Core services**

| Service | What it does |
|---|---|
| Study sessions | Host or join sessions; filter by track and topic; RSVP |
| Takeaways | Publish what you learned after a session |
| Questions | Post a theoretical question and a proposed solution; peers reply with solutions or follow-ups |
| Learning chains | Link work as **deepens** or **broadens**. Shared topics only *suggest* links; **students confirm every link** |
| Review & private notes | Revisit takeaways after 7 and 30 days; private notes never leave the browser |
| AI follow-up questions *(optional, off by default)* | AI asks probing questions about a takeaway. It never gives answers |

**Out of scope this quarter:** file uploads, group-private content, domains outside AI, a recommender system, native mobile, video calls.

## 3. Guiding principles

1. **Collaborative learning:** learn with and from peers across courses and campuses.
2. **A long-term, expanding knowledge base:** learning accumulates and stays with each student.
3. **Deep knowledge cultivated by human thinking:** students do the reasoning; AI supports it but never replaces it.
4. **Encouraging innovation:** turn ideas into projects, and theory into practice.

---

## 4. How we use AT Protocol

AT Protocol gives every user a permanent identity (a **DID**) and a personal **repository** of records on their own server (a **PDS**). Apps define their own record types (**Lexicons**), write them into users' repositories, and read everyone's changes from a public stream. Learning Chains uses that machinery as follows.

### 4.1 Feature-by-feature

| What the student does | What happens in AT Protocol | Tool |
|---|---|---|
| **Signs in** with their Bluesky handle | OAuth on their own PDS. We request write access to **our five record types only**: `atproto repo:<ns>.session repo:<ns>.rsvp repo:<ns>.takeaway repo:<ns>.question repo:<ns>.response` | `@atproto/oauth-client-browser`, granular permission scopes |
| **Publishes** a session, takeaway, question, or reply | A new record is created **in the student's own repository**, with a time-sortable key. The response gives its address (AT URI) and version hash (CID) | `com.atproto.repo.createRecord` |
| **Links** a takeaway to earlier work | The record stores a **strongRef** (address + version) to each record it builds on, in anyone's repository, plus `deepens` or `broadens` | `com.atproto.repo.strongRef` in our Lexicons |
| **RSVPs** | One record per session, with a key derived from the session, so re-RSVPing overwrites | `com.atproto.repo.putRecord` |
| **Edits or deletes** | Compare-and-swap edit on the old version; idempotent delete | `putRecord` with `swapRecord`; `deleteRecord` |
| **Sees others' work** | Our indexer listens to the public stream for our five types only, validates each record, and stores a searchable copy | **Jetstream v2** via `@bsky/jetstream` `LexIndexer`, filter `collections=<ns>.*` |
| **Sees "built on by"** | Backlinks are computed from the stored links | Our own SQLite index; **Constellation** as a cross-check |
| **Sees names and avatars** | Public profile lookup, batched and cached | `app.bsky.actor.getProfiles` on `public.api.bsky.app` |
| **Reports** a record | MVP: hidden from our index. Later: a labeler marks it for every app | In-app reports; later **Ozone** + `com.atproto.moderation.createReport` |
| **Writes a private note** | Stays in the browser. Not an AT Protocol record | Later: **Spaces** personal space (alpha since Aug 2026) |

### 4.2 Our record types (Lexicons)

Defined in Lexicon JSON; `@atproto/lex` generates TypeScript types and validators **shared by the browser and the indexer**.

| Record | Key fields | Record key |
|---|---|---|
| `session` | title, track, format, topics, startsAt, description, buildsOn[] | tid |
| `rsvp` | subject (strongRef → session), status | derived from session |
| `takeaway` | subject (strongRef → session), text, topics, buildsOn[] | tid |
| `question` | text, track, topics, proposedSolution?, buildsOn[] | tid |
| `response` | subject (strongRef → question or response), kind (solution / followUp), text | tid |

`buildsOn[]` entries are `{ target: strongRef, relation: "deepens" | "broadens" }`. There is **no meeting-link or location field**, by design.

### 4.3 Four facts that shape the design

1. **The PDS doesn't validate our record types.** It stores unknown types as "unknown" (and rejects them if asked to validate). So we validate twice: in the browser before writing, and in the indexer on everything that arrives, since anyone can write anything to their own repository.
2. **There is no "search everyone" in the protocol.** Each repository knows only its own records. That's why we need an indexer, and why it's only a rebuildable copy, not the source of truth.
3. **NSIDs are tied to a domain we must own.** Record type names look like `app.learningchains.takeaway`; publishing schemas and permission sets is proven through DNS. Names can't change once records exist, so **the domain is a one-way-door decision**.
4. **Browser-only sign-in sessions last at most 2 weeks.** Acceptable for a class pilot (students re-sign-in every two weeks); a backend client would allow longer sessions at the cost of a secret to protect.

### 4.4 Testing without touching real Bluesky

- **`@atproto/dev-env`** runs a local identity directory + PDS inside our tests, so the real `RecordStore` adapter is tested against a real PDS.
- The indexer is tested on **recorded Jetstream event files**.
- Manual end-to-end checks use throwaway test accounts and the OAuth **loopback client** for localhost.

Full details, versions, caveats, and sources: [ATPROTO_TOOLS.md](ATPROTO_TOOLS.md).

---

## 5. Architecture and modules

### 5.1 The big picture

We build two small parts: a **web app** and an **indexer**. AT Protocol provides accounts, storage, and the event stream.

- **Write path:** browser → the student's own repository. Our server never holds logins or records.
- **Read path:** repository → Jetstream → indexer → other students' screens, a few seconds behind.
- **Inside the web app:** feature screens → app rules (pure code) → four interfaces (`RecordStore`, `Discovery`, `NotesStore`, `Questioner`) → swappable adapters. The demo already runs on in-memory adapters; the real ones plug into the same interfaces.

### 5.2 Seven modules, one owner each

| Module | Owner focus | Input | Output | Must do | Done when |
|---|---|---|---|---|---|
| **M1 Schemas & Contracts** | Foundation | Data model decisions; field requests | Lexicon JSON, generated types and validators, sample data, contract test suites, CI | Keep records valid forever; run the schema review | Every type has a Lexicon + validator tests; contract suites run on every adapter in CI |
| **M2 Identity & Repository** | AT Protocol, browser | Handle; record values; record addresses | Signed-in session; real `RecordStore`; profiles | OAuth with least-privilege scopes; write to the student's repository; map errors to our `Result` | Passes the `RecordStore` contract suite on a local PDS; sign-in works end to end |
| **M3 Indexer Ingest** | AT Protocol, server | Jetstream events for our 5 types; backfill | SQLite tables (`records`, `links`, `tags`, `hidden`) + saved cursor | Validate everything; apply deletes; replay-safe; resume after crash | Replaying an event file twice gives identical tables; a record lands within 10 s on a test network |
| **M4 Indexer Query & Discovery** | Server API + browser adapter | SQLite (read-only); HTTP requests | Read-only HTTP API; real `Discovery` adapter | Every `Discovery` method with paging; backlinks; link suggestions; hide reported | Browser adapter passes the `Discovery` contract suite; p95 < 200 ms on pilot data |
| **M5 Sessions & Questions** | Feature UI | `RecordStore`, `Discovery` | Session list/detail/host/RSVP; questions and threads | No meeting links in public records; every publish through the publish panel | Component tests for host, RSVP, ask, reply; unchanged when real adapters are swapped in |
| **M6 Takeaways & Chains** | Feature UI + app rules | `RecordStore`, `Discovery` | Composer with link suggestions; chain view; review list | Student confirms every link; cycle-safe, depth-capped chains; deleted targets shown as missing | Chain-builder and review tests; publish-flow component test; 3-student chain renders |
| **M7 Trust, Safety & AI** | Feature UI + small server part | Text to publish; reports; public takeaways | Publish panel; sensitive-data check; private notes; report endpoint; AI follow-up endpoint (flag off) | Preview + notice on every publish; AI asks, never answers; AI key stays on the server | Warning check precision/recall reported; AI answer-leakage measured; reported records disappear |

### 5.3 The contracts between modules

Everything crossing a module boundary is one of five written contracts. Changing one needs agreement from both sides, in its own small pull request.

| Contract | Between | Form |
|---|---|---|
| Record schemas | M1 → everyone | Lexicon JSON + generated types |
| Ports | M5–M7 → M2, M4 | TypeScript interfaces (already written in the demo) |
| Contract tests | M1 → M2, M4 | Test suites every adapter must pass (already written) |
| Database schema | M3 → M4 | SQLite tables; M3 writes, M4 only reads |
| Query API | M4 → web app, M7 | Read-only HTTP + JSON (`/v1/sessions`, `/v1/backlinks`, `/v1/suggestions`, …) |

### 5.4 Why this split works

- **Nobody waits on anybody.** Feature owners (M5–M7) build on the in-memory adapters that already exist. Platform owners (M2–M4) build real adapters against the same contract tests. Integration is a swap.
- **Each module is one folder with one owner**, enforced by a `CODEOWNERS` file.
- **The critical path is short and visible:** M1's schemas → M2's sign-in and M3's ingest → swapping in real adapters. The schema review has to happen before that swap, because records published afterwards can't change shape.

Full module cards, API and database drafts, and the repository layout: [MODULES.md](MODULES.md).

---

## 6. Validate demand first

The biggest open risk isn't technical: **do students want public, cumulative collaboration, or is a private Discord group enough?** Before the team builds platform modules, we test it:

1. **Interviews** with 10–15 CSE students: how they study AI now, and what they'd share publicly.
2. **A 2-week concierge test** using existing tools: sessions announced as Bluesky posts with a shared hashtag, takeaways as replies, and a hand-kept chain map. Ideally compared with a Discord group on the same topics.
3. **Measure behavior:** do students return, post publicly, and build on each other's work unprompted?

Go / pivot / stop thresholds are agreed **before** the test. If students only want private groups, the AT Protocol design loses its point until Spaces matures.

## 7. Privacy and integrity

- **Nothing is published automatically.** Every publish shows a preview and a "this will be public" notice.
- **A live warning** flags emails, student IDs, API keys, and meeting links. Meeting links are rejected in public records.
- **Deletes are honored** in our app; copies elsewhere may remain, and we say so.
- **Text only, no uploads.** Questions are conceptual; prompts ask for reasoning. We can't stop a determined student from leaking homework, but the app never rewards it.
- **Least privilege:** the OAuth scope covers only our five record types; the server stores no logins, no private notes, and no meeting links.

## 8. Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript everywhere; Node 22+ (all `@atproto/*` packages require it) |
| Web app | React + Vite |
| Schemas | Lexicon JSON + `@atproto/lex` |
| Sign-in and writes | `@atproto/oauth-client-browser`; `com.atproto.repo.*` |
| Indexer | Node + `@bsky/jetstream` (`LexIndexer`); SQLite; `@atproto/identity` |
| Tests | Vitest, Testing Library, `@atproto/dev-env` for a local PDS |
| CI | GitHub Actions: type-check, tests, build, Gitleaks secret scan (running today) |

## 9. Risks

| Risk | Mitigation |
|---|---|
| Students don't want public collaboration | Validate first (§6); pivot to group-private if needed |
| Record formats are a one-way door | Domain chosen and schemas reviewed before the first real record |
| AT Protocol tooling is moving fast (new Lexicon SDK, Jetstream v2 in 2026) | Pin versions; M1 and M3 confirm unverified points in week 1 (browser support for `@atproto/lex`, local Jetstream recipe) |
| Academic integrity | Text only; conceptual questions; report button; honest about limits |
| AI gives answers anyway | Prompt forbids answers; leakage rate measured on a fixed test set |
| Cold start | One domain, small tag list, team seeds the first sessions |
| Dependence on Bluesky-run infrastructure | Indexer is rebuildable; Tap or the raw firehose as fallbacks |

## 10. Status and plan

**Done:** proposal and design documents; demo app (real screens and rules on in-memory data); 71 automated tests; CI with tests, build, and secret scan, passing on GitHub; presentation deck.

| Phase | What happens |
|---|---|
| **0. Validate** | Interviews and the 2-week test; go / pivot / stop |
| **1. Contracts** | Domain chosen; Lexicons and generated types (M1); OAuth prototype on a test network (M2); recorded event files (M3); API spec (M4); features continue on in-memory adapters (M5–M7) |
| **2. Build** | Real `RecordStore` and `Discovery` pass the contract suites; ingest is replay-safe; report flow and test sets |
| **3. Integrate** | **Schema review**, then swap in real adapters; indexer on live Jetstream; AI endpoint behind its flag |
| **4. Pilot** | 20–50 students; measure the four principles; fix from feedback |

## 11. Success criteria

**Engineering (measurable now):** every module's "done when" in §5.2; contract suites pass on every adapter; CI green on main; no secrets in the repository.

**Product (targets set after validation):** share of takeaways that link to earlier work; share of links between different students; return rate to sessions; review completion. Reported honestly, including misses.

## 12. Open questions

1. **Domain for our NSIDs.** Needed before any real record is written.
2. **Module owners.** Who takes M1–M7?
3. **Course rubric.** What CSE 210 requires in the proposal and final deliverable.
4. **Hosting** for the indexer, and who pays for AI calls if that feature is built.
5. **Pilot recruitment**, and whether a study with students needs approval.
6. **Project name.** "Learning Chains" is a placeholder.
