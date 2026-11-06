# AT Protocol Project: Learning Chains

*Working title. A study platform for collaborative, cumulative thinking about AI.*

Draft v0.1 · Yinuo Zhou · 2026-11-06

---

## 1. Summary

AI has changed how CS students learn. Students used to work through material on their own, grind on homework, and use office hours when stuck. Now many go straight to an AI model, either to explain a solution or to hand them one. Instructors are needed less for explaining material, and courses are moving toward what AI can't replace: creativity, teamwork and discussion, deep understanding, and *using AI well* instead of trading solutions.

No tool supports that kind of learning well:
- **AI chatbots** are one-on-one and private. They have no peers, no shared history, and they give answers by default.
- **Course forums** (Piazza, Ed) are tied to one course, focus on assignments, and are abandoned at the end of the quarter.
- **Chat apps** (Discord, GroupMe) are unstructured and hard to search; discussions disappear within days.
- **General social media** has no structure for learning.

**We propose Learning Chains**, an app on the AT Protocol where students hold study sessions on AI topics, publish what they learned, and link each new idea to the earlier ideas it builds on. Over time this forms public **chains of learning** that show how understanding deepened or broadened across sessions and across students.

**Value proposition:** a dedicated place for collaborative, cumulative thinking about AI, where students' learning builds on each other's over time, in public, and stays with the student.

## 2. Why AT Protocol

AT Protocol is the open protocol underneath Bluesky. Each user has a personal repository of records that is publicly readable, belongs to the user, and works across every app on the network. Each app defines its own record types (schemas called **Lexicons**) and builds its own view of the data.

That matches what this project needs:

| Need | What AT Protocol provides |
|---|---|
| A student's learning history should outlive any course, campus, or app | Records live in the **student's own repo**, not our database |
| Students on any campus can join | Users sign in with their **existing Bluesky account** via OAuth; we build no account system |
| Ideas link across students | Records can **reference records in other users' repos**, the same way Bluesky replies do |
| Discovering activity in real time | **Jetstream** streams new records; we subscribe only to our own record types |
| Moderation | **Labelers** are a built-in protocol mechanism for flagging content |

Comparable apps already prove the pattern: **Smoke Signal** (events and RSVPs) and **Popfeed** (media reviews) define their own record types on AT Protocol.

## 3. Validate the need first (proof of concept)

The biggest open risk isn't technical. **We don't yet know whether students want this.** The most obvious alternative is a private Discord group: it's free, real-time, private, and students already use it. Before building the app, we test whether the value we claim is real.

### 3.1 Hypotheses

| # | Hypothesis | Why it might be false |
|---|---|---|
| H1 | Students want to study AI with peers outside their own course or friend group | They may only trust people they already know |
| H2 | Students are willing to share their thinking **publicly** | They may share only in private groups, which is Discord's strength |
| H3 | Students value an accumulated, linked history of learning over time | They may only care about this week's problem |
| H4 | Students will actually link their work to others' (build on it) | Linking may feel like extra work nobody does |

**H2 is the one that decides the AT Protocol fit.** If students only want private groups, the core of this design (public, student-owned, linkable records) loses its point until private data on AT Protocol matures.

### 3.2 How we test it (no app code needed)

1. **Interviews (about 10–15 CSE students):** how they study AI now, what tools they use, what they'd share publicly vs. only in a private group, and what Discord fails at for them.
2. **Concierge test (about 2 weeks):** run real study sessions using tools that already exist. Sessions are announced as Bluesky posts with a shared hashtag, and takeaways are posted as replies. Our team manually keeps a simple chain map, e.g. in a shared doc, showing who built on whom. Ideally run a comparison group on Discord with the same topics.
3. **Observe behavior, not just opinions:** do students come back for a second session? Do they post takeaways publicly? Do they reference each other's takeaways without being asked? Does anyone look at the chain map?

### 3.3 Decision after validation

The team agrees on the go / pivot / stop thresholds **before** the test starts, so results can't be reinterpreted afterwards.

- **Go:** the evidence supports H1–H4. Build the MVP as scoped in §4.
- **Pivot:** students want collaboration but not in public. Refocus on group-private features and reconsider whether AT Protocol is the right base right now.
- **Stop or reframe:** students don't come back or don't value the history. A private Discord group is enough for them, and the project should target a different problem.

Whatever the outcome, the validation results go into the final report. A well-run test that disproves the idea is still a valid result.

## 4. Scope

### 4.1 Domain: AI, in two tracks

The record schema works for any domain, but **the first deployment is limited to AI** so that matching has enough people per topic at small scale (we expect 20–50 pilot users). Expanding to other domains later only needs a new tag list; no data changes.

| Track | Covers | Example formats | Starter tags |
|---|---|---|---|
| **AI Concepts** | Theory: how models work | Concept review, mock interview | `transformers`, `rl`, `optimization`, `ml-theory`, `ai-ethics` |
| **AI Practice** | Using AI tools and agents, building projects | Workflow share, build jam, debugging with AI | `ai-assisted-coding`, `prompting`, `agents`, `evaluation`, `rag` |

### 4.2 Features (capability map)

| Module id | Responsibility | Depends on | In MVP? |
|---|---|---|---|
| `auth` | Sign in with Bluesky (OAuth) | — | Yes |
| `sessions` | Create, browse, and filter study sessions by track and tag; RSVP | `auth` | Yes |
| `takeaways` | Publish a public takeaway after a session | `sessions` | Yes |
| `questions` | Post a theoretical question, optionally with a proposed solution; others reply with their own solutions or follow-up questions | `auth`, `indexer` | Yes |
| `chains` | Link a takeaway or session to earlier ones as **deepens** or **broadens**; show "builds on ↑ / built on by ↓". **Links are always declared by a student.** The app suggests candidates that share tags, and the student confirms which ones their work actually builds on. | `takeaways`, `indexer` | Yes |
| `indexer` | Small backend that subscribes to Jetstream for our record types, stores them, and answers queries (search, backlinks) | — | Yes |
| `private-notes` | Raw reflections stored **only in the student's browser** | `auth` | Yes |
| `review` | Suggest revisiting past takeaways (e.g. after 7 and 30 days) | `takeaways` | Yes |
| `ai-questioner` | On request, AI generates 2–3 follow-up questions about a takeaway. It never gives answers. | `takeaways` | Stretch, behind a flag that is off by default |
| `chain-graph` | Visual graph of a whole chain | `chains` | Stretch |

Build order: `auth`, `indexer` → `sessions`, `questions` → `takeaways` → `chains`, `private-notes`, `review` → stretch modules.

### 4.3 Data model (draft record types)

Namespace placeholder: `<our-domain>.learnchain.*`. Lexicon names must come from a domain we control (see Open Questions).

- **`session`**: title, track (`concepts` | `practice`), topics[], format, startsAt, description, buildsOn[]
- **`rsvp`**: subject (link to a session), status (`going` | `interested`)
- **`takeaway`**: subject (link to a session), text, topics[], buildsOn[]
- **`question`**: text, track, topics[], proposedSolution (optional)
- **`response`**: subject (link to a question or another response), kind (`solution` | `followUp`), text
- **`buildsOn` entry**: link to an earlier session, takeaway, or question (any user's) + relation (`deepens` | `broadens`)

**How links are made.** Shared tags only produce *suggestions* ("these 3 takeaways share `transformers`"). A link becomes part of a chain only when a student confirms it. Tags say two things are on the same subject; a confirmed link says one actually built on the other. Keeping that judgment human follows principle 3 (deep-level knowledge cultivated by human thinking) and keeps chains meaningful.

Private notes are **not** AT Protocol records. They live in browser storage only.

### 4.4 Out of scope (this quarter)

- File uploads or attachments (text only, by design; see Risks)
- Group-private content (needs AT Protocol "Spaces", alpha since Aug 2026)
- Domains outside AI
- Recommender system (tag filtering is enough at pilot scale)
- Native mobile app
- Video or voice calls; sessions happen on whatever tool students already use (Zoom, in person), and we link to it

## 5. Guiding principles

| Principle | Feature | Metric |
|---|---|---|
| **1. Collaborative learning** | Sessions with RSVP, matched by tag; questions with peer solutions and follow-ups | Sessions per active student; % of students with a repeat partner; % of questions with at least one peer response |
| **2. A long-term, sustainable, expanding knowledge base** | Takeaways and questions stay in students' repos and build up across terms; `review` brings old ones back | Growth in linked records per month; % of takeaways revisited within 30 days |
| **3. Deep-level knowledge cultivated by human thinking** | Deep thinking is the core of this principle: students do the reasoning, AI never replaces it. Prompts ask "why", "what's still unclear", and "what would you try next"; chain links are declared by students, not generated; **deepens** links push one idea further over time; AI (optional) only asks questions, never answers | % of takeaways with a confirmed link; average length of deepens chains; reflection depth, scored by an LLM judge against a rubric and checked against a human-labeled sample |
| **4. Encouraging innovation** | "Build jam" format in the Practice track; broadens links | Count of Practice sessions; % of broadens links that cross tracks |

## 6. Tech stack (proposed)

| Layer | Choice | Why |
|---|---|---|
| Frontend | TypeScript + React (Vite) | Standard, team-friendly |
| AT Protocol client | `@atproto/api`, `@atproto/oauth-client-browser` | Official SDKs |
| Indexer | Node.js + TypeScript, Jetstream consumer filtered to our collections | Small, single-purpose |
| Indexer storage | SQLite (Postgres if needed) | Enough for pilot scale |
| Backlinks | Our own index; Constellation as an alternative to evaluate | Needed for "built on by ↓" |
| AI (stretch) | Claude API, called **from the indexer server**, never the browser | Keeps the API key out of client code |
| Tests | Vitest (unit), Playwright (end-to-end) | Common TS tooling |

## 7. Risks and mitigations

| Risk | Mitigation | Remaining limitation |
|---|---|---|
| **Academic integrity**: students post graded work, or a "proposed solution" is really a homework answer | Text only, no uploads; questions are framed as conceptual, not course assignments; prompts ask for reasoning, not solutions; AI domain isn't tied to one course's homework; report button hides content from our index (labeler as stretch) | A determined student can still leak work, as on any platform. We design so the app never **rewards** it. |
| **Privacy: exposing data a student didn't mean to share** | See §8, a dedicated section | Long-run concern, not fully solved this quarter |
| **AI-questioner privacy**: text sent to the AI leaves the browser | Only public takeaways are sent, never private notes; explicit per-use opt-in | Third-party model provider processes the text |
| **AI gives answers anyway** | System prompt forbids answers; we evaluate on a test set of takeaways for answer leakage | Not 100% guaranteed; measured rate is reported |
| **Cold start**: too few users for matching | Single domain, a small tag list, seeding with our own team's sessions | Pilot results may not generalize |
| **Lexicon schemas are hard to change once published** (records already written in users' repos must stay valid) | Review the schema before first publish; only add optional fields afterward | **One-way door**: get schema review before launch |
| **Dependence on Bluesky-run infrastructure** (Jetstream, PDS hosting) | Indexer can re-sync from repos; Jetstream is replaceable by the raw firehose | Outage on their side affects freshness |

## 8. Privacy and data control

Everything a student publishes on AT Protocol is public, readable by anyone, and may be copied by other services. The app being public by default is deliberate (§1), so privacy here means one thing: **a student exposes only what they meant to expose, and nothing else.** This is a long-run concern. The MVP covers the basics below; full solutions depend on protocol features that are still immature.

### 8.1 What is public, what is not

| Data | Visibility | Where it lives |
|---|---|---|
| Sessions, takeaways, questions, responses, chain links | Public, **only when the student presses publish** | Student's repo |
| RSVPs | Public (they are records too). Note: this reveals who attended what and when | Student's repo |
| Private notes | Never leaves the browser | Browser storage |
| Meeting links (Zoom, etc.) and physical locations | **Never put in public records**: anyone could join or show up. Host shares them by DM in the MVP | Not stored by us |
| Personal stats (if added) | Computed only from already-public records; showing them on a profile is opt-in | Computed on request |
| Text sent to the AI questioner (if built) | Only public takeaways, per-use opt-in | Sent to the model provider |

### 8.2 Preventing accidental exposure (MVP)

1. **Nothing is published automatically.** Every public record comes from an explicit publish action.
2. **Preview before publish.** The student sees exactly what will be public, labeled "visible to anyone, may be copied."
3. **Sensitive-data check before publish.** A client-side scan warns on emails, phone numbers, student IDs, physical addresses, and **API keys or tokens**. The last matters in the AI Practice track, where students paste code and prompts. The scan uses deterministic pattern matching first, so no text leaves the browser to be checked.
4. **Data minimization.** The indexer stores only our public record types. It keeps no analytics on private notes, no browsing logs tied to identity, and no meeting links.
5. **Plain-language notices** at sign-up and in the publish dialog: what is public, what is permanent, what we can and can't delete.

### 8.3 Editing and deletion

- Students can edit or delete their own records at any time.
- Our indexer **honors deletes and edits** from the event stream, so deleted content disappears from our app.
- **Honest limit:** other services may already have copied the record, and we can't remove those copies. Anything published should be treated as potentially permanent. We say this before publishing, not after.

### 8.4 Long-run directions (beyond this quarter)

- **Group-private content** (notes shared only with a session's participants) through AT Protocol **Spaces**. Spaces has been in alpha since Aug 2026 and provides access control, not encryption. Adopt it behind a flag that is off by default, once it is stable.
- **Private RSVPs**, so attendance isn't public. Also depends on Spaces.
- **Community flagging of leaked sensitive data** through a labeler, with flagged records hidden from our app.
- **Better sensitive-data detection**, e.g. a small local model, measured for precision and recall on a labeled test set.
- **Measuring the privacy safeguards** (how well the sensitive-data check catches keys and emails, how fast deletes take effect) once the app exists and validation (§3) has shown the need is real.
- **Data export**, so students can take their full history to another app (largely free thanks to AT Protocol).
- **Institutional use.** If a course officially adopts the app, education-privacy rules (e.g. FERPA in the US) may apply. That needs advice from the university before any official use.

## 9. Existing tools

| Tool | What it does | Gap this project fills |
|---|---|---|
| ChatGPT / AI tutors | One-on-one Q&A | No peers, no shared history, answer-first |
| Piazza / Ed | Course Q&A forums | Course-bound, assignment-focused, gone after the quarter |
| Discord / GroupMe | Group chat | Ephemeral, unstructured, not searchable |
| Smoke Signal (AT Protocol) | Events and RSVPs | General events; no learning structure or idea links |
| Popfeed (AT Protocol) | Logging and reviewing media | Media, not learning |
| Bluesky custom feeds | Topic-filtered posts | Posts aren't structured; no sessions or chains |

## 10. Success criteria

**Product (pilot, only after validation in §3 passes):** numeric targets are set after validation, from what the concierge test actually shows

- Each MVP module in §4.2 works end-to-end for a signed-in user
- Share of takeaways that link to an earlier session or takeaway
- Share of chain links that cross between different students
- The metrics in §5 are computed from real pilot data and reported honestly, including misses

**Engineering**

- A new record shows up in the app within 10 seconds of being written (indexer latency, measured at p95)
- Lexicon schemas validated by automated tests
- Unit tests for indexer and record logic; at least one end-to-end test per MVP user flow
- CI runs tests on every push
- No secrets (API keys, OAuth client secrets, `.env`) in the repo; checked by a secret scanner in CI
- No public record type has a field for meeting links or locations (checked by schema tests)
- If built: AI questioner answer-leakage rate measured on a fixed test set (target < 5%)

## 11. Milestones

*(Assumes ~8 build weeks; adjust to the actual course calendar.)*

| Milestone | Delivers |
|---|---|
| M0 | Validation (§3): interviews, 2-week concierge test, go / pivot / stop decision |
| M1 | Lexicon schemas reviewed; OAuth sign-in; indexer receiving records from Jetstream |
| M2 | Create, browse, filter sessions; RSVP |
| M3 | Takeaways; private notes |
| M4 | Learning chains (builds on / built on by); review reminders |
| M5 | Pilot with real students; collect metrics |
| M6 | Stretch features if time allows; final report with measured results |

## 12. Open questions

1. **Team size and roles.** Not decided yet.
2. **Course rubric.** What does CSE210 require in the proposal and final deliverable? This draft follows a peer's structure plus added sections.
3. **Domain name** for the Lexicon namespace. We need a domain the team controls.
4. **Hosting** for the indexer (school server, free tier, etc.) and who pays for AI API calls, if that feature is built.
5. **Pilot recruitment.** Which students, and does a study involving students need any approval?
6. **Project name.** "Learning Chains" is a placeholder.
7. **Personal learning stats.** Should each student's profile show stats (sessions, topics over time, chain contributions)? Which ones, and should they be public? Not decided; not in the MVP.
8. **Meeting-link sharing.** DMs work for the MVP but are clunky. Is a better way worth building before Spaces is stable?
