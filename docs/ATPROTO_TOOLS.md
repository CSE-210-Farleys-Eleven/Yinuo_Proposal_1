# AT Protocol Tools: How Learning Chains Uses Them

Draft v0.1 · 2026-11-06 · Companion to [ARCHITECTURE.md](ARCHITECTURE.md) and [MODULES.md](MODULES.md)

This document names the **exact AT Protocol tools, packages, and endpoints** each module uses, how we use them, and their caveats. Facts were checked against primary sources (atproto.com specs and blog, bsky.network docs, official READMEs, npm package sources, and live requests) on 2026-11-06. Anything not confirmed is marked **unverified**. Sources are listed per section.

> **Versions move fast.** Several tools below changed in 2026 (new Lexicon SDK, Jetstream v2, granular OAuth scopes). Re-check versions when the team starts building.

---

## 0. At a glance

| Need | Tool we use | Module | Instead of / fallback |
|---|---|---|---|
| Record schemas, types, validation | **Lexicon** JSON + **`@atproto/lex`** (`lex build`) | M1 | Older `@atproto/lex-cli` (heading to maintenance) |
| Publishing our schemas | **`goat lex publish`** + `_lexicon` DNS TXT record | M1 | Not strictly required, but needed for permission sets |
| Sign-in | **`@atproto/oauth-client-browser`** with granular `repo:` scopes | M2 | App passwords (never for real users) |
| Writing records | **`com.atproto.repo.createRecord / putRecord / deleteRecord`** | M2 | `applyWrites` for batches (≤200 ops) |
| Reading one record | **`com.atproto.repo.getRecord`** on the author's PDS | M2 | Slingshot cache (pre-release) |
| Who is this user, where is their data | **DID document** (`#atproto_pds` service), handle resolution | M2, M3 | Slingshot `resolveMiniDoc` |
| Display names and avatars | **`app.bsky.actor.getProfiles`** on `public.api.bsky.app` | M2, M4 | Fall back to the handle |
| Live stream of new records | **Jetstream v2** + **`@bsky/jetstream`** `LexIndexer` | M3 | **Tap** (verified sync + automatic backfill) |
| Catching up on old records | **`com.atproto.sync.listReposByCollection`** → `listRecords` | M3 | Tap signal-collection mode |
| "Who built on this?" | **Our own SQLite `links` table** | M4 | **Constellation** `getBacklinks` as a cross-check |
| Moderation | In-app reports + `hidden` table (MVP) | M7 | **Ozone** labeler + `createReport` (stretch) |
| Private notes | Browser storage (MVP) | M7 | **Spaces** personal space (alpha; future) |
| Integration tests | **`@atproto/dev-env`** `TestNetworkNoAppView` (local PLC + PDS) | M1, M2 | Throwaway real test accounts for manual checks |
| CLI for debugging | **`goat`** (`resolve`, `get`, `firehose`, `lex …`) | all | — |

**Platform requirement:** all `@atproto/*` packages are ESM-only and need **Node 22 or newer**. Our CI already uses Node 24.

---

## 1. Record schemas: Lexicon and `@atproto/lex` (M1)

**What it is.** Lexicon is AT Protocol's schema language. Each record type has a JSON schema with a globally unique name (an **NSID**). `@atproto/lex` (0.4.x) is the current SDK: `lex build` turns Lexicon JSON into TypeScript types and validators.

**How we use it**
- One Lexicon file per record type: `session`, `rsvp`, `takeaway`, `question`, `response`.
- Links use the standard **`com.atproto.repo.strongRef`** type (`{ uri, cid }`), e.g. `takeaway.subject` and each `buildsOn[].target`.
- `lex build` generates types plus `$validate` / `$safeParse` helpers. **The same generated code runs in the browser (before writing) and in the indexer (on every incoming record)**, replacing the hand-written `validation.ts` from the demo.
- Our own schemas live in the repo; `lexicons.json` points `lex` at a local directory resolver.

**Naming (NSIDs).** An NSID is a reverse domain plus a name, e.g. `app.learningchains.takeaway` if the team owns `learningchains.app`. Rules: at least 3 segments; the name part is letters and digits only (camelCase). **We must own the domain**, because publishing schemas and permission sets is proven through DNS. Avoid `edu.ucsd.*` unless the university delegates that DNS.

**Evolution rules (the one-way door).** After records exist: new fields must be optional; required fields can't be removed; types and limits can't change. A breaking change needs a new NSID. **Decide the domain and review the schemas before the first real record is written.**

**Publishing.** Schemas are published as `com.atproto.lexicon.schema` records (record key = the NSID) in an account the team controls, plus a DNS TXT record at `_lexicon.<reversed domain>` with `did=<that account's DID>`. Tool: `goat lex lint`, `goat lex publish`, `goat lex check-dns`. Publishing isn't required for the app to work, but it's required for permission sets (§2) and it lets other apps discover our schemas.

**Caveats**
- `@atproto/lex` is a "stable preview"; `@atproto/lex-cli` still works but is heading to maintenance mode.
- **Unverified:** that `@atproto/lex` runs in the browser. Likely (it documents Vite tree-shaking), but M1 should confirm in week 1. Fallback: keep our hand-written validators.

**Sources:** atproto.com/specs/lexicon · atproto.com/specs/nsid · atproto.com/guides/installing-lexicons · atproto.com/guides/publishing-lexicons · atproto.com/blog/ts-sdk-upgrades · github.com/bluesky-social/goat

---

## 2. Sign-in: OAuth with granular scopes (M2)

**What it is.** AT Protocol OAuth (OAuth 2.1 with PKCE, PAR, and DPoP). Students sign in with their existing Bluesky account on their own PDS; we never see a password.

**Package.** `@atproto/oauth-client-browser`.

**How we use it**
1. Host a public **client metadata** JSON at a URL we control, e.g. `https://learningchains.app/oauth-client-metadata.json`. That URL *is* our `client_id`. Key fields: `redirect_uris`, `scope`, `grant_types: ["authorization_code","refresh_token"]`, `token_endpoint_auth_method: "none"`, `application_type: "web"`, `dpop_bound_access_tokens: true`.
2. On page load: `client.init()` restores a session or finishes a redirect.
3. Sign in: `client.signIn(handle)` redirects to the student's PDS for consent.
4. The session gives us the student's DID (`RecordStore.me`) and an authenticated way to call their PDS.

**The scope we request (least privilege).** Write access to **our five collections only**. Reading public data needs no permission at all:

```
atproto repo:<ns>.session repo:<ns>.rsvp repo:<ns>.takeaway repo:<ns>.question repo:<ns>.response
```

The PDS enforces this on every write. Students may approve fewer scopes than requested, so M2 checks what was granted. Later, once our schemas are published, we can bundle these into a **permission set** (`include:<ns>.authFull`) for a friendlier consent screen. We do **not** request `transition:generic` (discouraged), image uploads, email, or anything else.

**Session length.** A browser-only (public) client gets sessions of **at most 2 weeks**, so students re-sign-in every two weeks. A small backend acting as a confidential client would allow long sessions, but it adds a private key to protect. For a class project, 2 weeks is acceptable; revisit for production.

**Local development.** A special loopback client (`client_id = http://localhost?...`, redirect to `http://127.0.0.1:<port>`) works without hosting metadata. Limits: refresh tokens last about 1 day, and the consent screen can't be customized.

**Caveats**
- Resolving handles through bsky.social shares users' IPs and handles with Bluesky. Prefer the DNS-over-HTTPS handle resolver the package offers.
- **Unverified:** whether every non-Bluesky PDS enforces granular scopes.

**Sources:** atproto.com/specs/oauth · atproto.com/specs/permission · atproto.com/guides/permission-sets · atproto.com/guides/about-oauth · github.com/bluesky-social/atproto (packages/oauth/oauth-client-browser)

---

## 3. Writing and reading records (M2)

**Endpoints** (all on the student's own PDS):

| Our action | Endpoint | Notes |
|---|---|---|
| Publish a session, takeaway, question, response | `com.atproto.repo.createRecord` | Record key type `tid` (time-sortable, 13 chars). Returns `uri` + `cid` for strongRefs |
| RSVP (one per student per session) | `com.atproto.repo.putRecord` | Deterministic record key derived from the session's address, so re-RSVPing overwrites instead of duplicating |
| Edit a record | `com.atproto.repo.putRecord` with `swapRecord` | Compare-and-swap on the old version: fails cleanly if it changed meanwhile |
| Delete | `com.atproto.repo.deleteRecord` | Idempotent |
| Read any public record | `com.atproto.repo.getRecord` | No auth; on the author's PDS (found via their DID document) |

**Validation: our responsibility.** The PDS doesn't know our schemas. If `validate` is left unset, it stores our records with `validationStatus: "unknown"`; if `validate: true`, it **rejects** them. So:
- leave `validate` unset;
- validate in the browser before writing (M1's generated validators);
- validate again in the indexer, since anyone can write anything to their own repository.

**Show your own writes immediately.** The indexer sees a new record a few seconds later, so the app uses the `createRecord` response to show it right away.

**Rate limits** (Bluesky-hosted PDS, per account): 5,000 write points/hour and 35,000/day; a create costs 3 points (about 1,666 creates/hour). Far above what a student generates.

**Sources:** com.atproto.repo.* Lexicons (github.com/bluesky-social/atproto/lexicons) · atproto.com/specs/record-key · atproto.com/specs/tid · atproto.com/guides/writing-data · bsky.network/docs/rate-limits · `@atproto/pds` source (`repo/prepare.js`)

---

## 4. Identity and profiles (M2, M3, M4)

**Identity.** Every user has a **DID** (`did:plc:…` resolved at `plc.directory`, or `did:web`). Their DID document lists their handle (`alsoKnownAs`), signing key, and **PDS address** (the `#atproto_pds` service). Handles are verified both ways via DNS TXT `_atproto.<handle>` or `https://<handle>/.well-known/atproto-did`.

- **Browser:** the OAuth client resolves identity itself during sign-in.
- **Indexer:** `@atproto/identity` (`IdResolver`, Node-only) resolves each new author once and caches the result; refresh on Jetstream `identity` events. The PDS address is needed only for backfill.

**Profiles.** `app.bsky.actor.getProfiles` (up to **25** users per call) on **`https://public.api.bsky.app`**, with no sign-in needed. Returns display name, avatar, handle. The indexer batches and caches them. Users without a Bluesky profile still have a handle: fall back to it.

**Optional cache:** Slingshot (`slingshot.microcosm.blue`) `resolveMiniDoc` returns `{did, handle, pds}` in one call, but it describes itself as pre-release.

**Sources:** atproto.com/specs/did · atproto.com/specs/handle · bsky.network/docs/api-directory · github.com/bluesky-social/atproto (packages/identity) · slingshot.microcosm.blue/openapi

---

## 5. The indexer's data feed: Jetstream (M3)

**What it is.** Jetstream is Bluesky's public stream of every change on the network, as JSON, filterable by record type. **Jetstream v2** runs at `wss://jetstream.us-east.bsky.network` and `wss://jetstream.us-west.bsky.network`. The official TypeScript SDK is **`@bsky/jetstream`** (1.0).

**How M3 uses it**
- Subscribe with `collections=<ns>.*` to get **only our five record types**, not the whole of Bluesky.
- Use the SDK's **`LexIndexer`**: register a handler per record type (`put` for create/update, `del` for delete). It validates records against our Lexicons, keeps per-record order, and checkpoints the cursor. That's most of M3's job done by the official tool.
- Save the cursor in SQLite **in the same transaction** as the rows it produced, so a crash never loses or double-applies events.
- Delivery is **at least once**, so every write is an upsert keyed on the record's AT URI. Replaying is safe.
- Handle `account` events (deactivated or deleted accounts) by hiding that user's rows.

**Limits and gaps**
- The live stream is free and needs no key. It covers up to 100 collections and 10,000 users per subscription; we use 1 filter.
- The stream keeps **36 hours** of history. If the indexer is down longer, it must backfill (below). Longer history (Network Replay) needs an API key and is metered.

**Backfill (catching up).** `com.atproto.sync.listReposByCollection?collection=<ns>.session` on the relay lists every user who has any record of that type (checked live), then `com.atproto.repo.listRecords` on each user's PDS (100 per page). Our collections are small, so this is cheap.

**Alternative: Tap.** Bluesky's official self-hosted sync tool (Go, beta) verifies data cryptographically and **backfills automatically**: with `TAP_SIGNAL_COLLECTION=<ns>.session` it tracks every user with a Learning Chains record and replays their history. TS client: `@atproto/tap`. Cost: one more service to run. **Recommendation:** start with Jetstream (simpler); switch to Tap if backfill or data verification becomes a pain.

**Sources:** bsky.network/docs/jetstream · bsky.network/docs/jetstream-sdk · bsky.network/docs/jetstream-replay · atproto.com/blog/introducing-bluesky-protocol-services · atproto.com/blog/introducing-tap · github.com/bluesky-social/indigo (cmd/tap) · atproto.com/guides/backfilling

---

## 6. Backlinks: our index, with Constellation as a cross-check (M4)

**Our own index.** Every `buildsOn` entry becomes a row in the `links` table (from, to, version, relation). "Built on by" is a simple lookup. We own it, it's deterministic, and it has no third-party dependency.

**Constellation** (`constellation.microcosm.blue`) is a community-run backlink index of the whole network that works for any record type, ours included. Endpoint: `/xrpc/blue.microcosm.links.getBacklinks?subject=<at-uri>&source=<ns>.takeaway:buildsOn.target.uri` (path syntax to be confirmed for array fields). The older `/links` endpoints are deprecated. **Use:** a cross-check in tests, or a fallback if our indexer is down. Not the primary source, since it's run by a single maintainer and its historical backfill is "coming soon".

**Sources:** microcosm.blue · constellation.microcosm.blue (live check)

---

## 7. Moderation: reports now, a labeler later (M7)

**MVP.** A report button sends `POST /v1/reports` to our indexer, which adds the record to a `hidden` table that every query excludes. Simple and fully under our control.

**Stretch: a real labeler.** AT Protocol moderation works through **labels**: signed tags a labeler attaches to any AT URI, including our record types.
- Run **Ozone** (Bluesky's reference labeler, self-hosted with Docker and Postgres) under a team account.
- Declare in its service record that it labels only our collections, with custom label values (e.g. `possible-graded-work`).
- Students report through the standard `com.atproto.moderation.createReport`; moderators review in Ozone.
- The indexer subscribes to our labeler (`com.atproto.label.subscribeLabels`) and hides labeled records.

`@skyware/labeler`, a popular lightweight option, was **archived in February 2026**. Don't adopt it.

**Sources:** atproto.com/specs/label · atproto.com/guides/creating-a-labeler · atproto.com/blog/report-based-moderation · github.com/bluesky-social/ozone

---

## 8. Private data: browser now, Spaces later (M7)

**Spaces** is AT Protocol's private-data feature: a "personal space" (only the owner) or a "member space" (a group). It provides **access control, not encryption**. The **alpha has been live since August 20, 2026**, with breaking changes since and launch targeted for "this year". It needs `space:` scopes, alpha SDKs, and an alpha PDS that real users' accounts don't run on.

**Decision:** private notes stay in browser storage for this project. Spaces stays a future option behind a flag that's off by default: a personal space for notes that sync across devices, and a member space for study groups (which would also allow private RSVPs and meeting links).

**Sources:** atproto.com/blog/atproto-spaces-alpha · atproto.com/blog/space-sync · github.com/bluesky-social/proposals (0016-permissioned-data)

---

## 9. Testing without touching real Bluesky (M1, M2, M3)

| Level | Tool | Used by |
|---|---|---|
| Unit | Generated validators; indexer logic fed by **recorded Jetstream event files** | M1, M3 |
| Contract / integration | **`@atproto/dev-env`** `TestNetworkNoAppView`: an in-process PLC + PDS for Vitest. Create test accounts, write records with our real `RecordStore`, read them back | M1, M2 |
| End to end | Throwaway Bluesky test accounts + the OAuth loopback client | M2, everyone |
| Debugging | `goat resolve`, `goat get at://…`, `goat firehose` | all |

**Unverified:** a documented recipe connecting dev-env's local PDS to a local Jetstream or Tap. M3 therefore tests against recorded event files, plus a short manual check on the live Jetstream.

**Secrets.** Test-account app passwords and any Jetstream API key go in `.env` (already gitignored and secret-scanned in CI). The browser OAuth client has no secret.

**Sources:** `@atproto/dev-env` package source · github.com/bluesky-social/goat · github.com/bluesky-social/jetstream

---

## 10. Decisions this document asks the team to make

| Decision | Recommendation | Why it matters |
|---|---|---|
| **Domain for our NSIDs** | Buy a short domain (e.g. `learningchains.app`) before any real record is written | NSIDs can't change once records exist (one-way door) |
| Jetstream or Tap for the indexer | Jetstream first | Simpler; Tap stays the fallback for backfill |
| Browser-only OAuth or a backend client | Browser-only | No secret to protect; 2-week sessions are acceptable for a class pilot |
| Publish our Lexicons | Yes, after schema review | Required for permission sets; lets other apps reuse our records |
| Labeler | Not in the MVP | In-app reports cover the pilot; Ozone is heavy to host |

## 11. What's unverified (check in week 1)

- `@atproto/lex` running in the browser, and plugging a browser OAuth session into its `Client`
- Granular-scope enforcement on non-Bluesky PDSes
- Constellation's path syntax for links inside arrays (`buildsOn[].target.uri`)
- A local Jetstream or Tap connected to dev-env's PDS
- Rate limits for plc.directory, Constellation, and Slingshot (not published)
