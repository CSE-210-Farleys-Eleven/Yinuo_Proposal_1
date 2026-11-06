# Demo App Plan

Source: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) §10. No separate SPEC.md: the architecture doc and the proposal serve as the spec.

Goal: the real web app's screens and domain logic, running on **in-memory adapters** with sample data. No network, no AT Protocol login, no indexer yet.

| # | Task | Acceptance | Verify |
|---|---|---|---|
| T0 | Repo setup | `.gitignore` (incl. secrets), README, docs copied | `git status` clean after commit |
| T1 | Scaffold | Vite + React + TS app in `app/`; Vitest runs; record types, `Result`, and the four ports defined | `npm test`, `npm run build` |
| T2 | Domain logic | Pure, tested: sensitive-data check, review scheduler, chain builder, link suggestions, record validation | Unit tests pass |
| T3 | In-memory adapters | `RecordStore`, `Discovery`, `NotesStore`, `Questioner` in memory, seeded with Alice/Bob/Carol; contract tests per seam | Contract tests pass |
| T4 | Screens | Sessions (filters), session detail, publish takeaway (suggest links, deepens/broadens, sensitive warning, preview), chain view, questions + responses, review, private notes, demo user switcher | Component test for the publish flow; build passes |
| T5 | Browser check | Core loop works end-to-end in a real browser, no console errors | Manual run with screenshots |

Out of scope: real AT Protocol adapter, OAuth, indexer, AI calls, report button.
