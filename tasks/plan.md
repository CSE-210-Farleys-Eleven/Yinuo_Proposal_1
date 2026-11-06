# Demo App Plan

Source: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) §10. No separate SPEC.md: the architecture doc and the proposal serve as the spec.

Goal: the real web app's screens and domain logic, running on **in-memory adapters** with sample data. No network, no AT Protocol login, no indexer yet.

| # | Task | Acceptance | Verify | Status |
|---|---|---|---|---|
| T0 | Repo setup | `.gitignore` (incl. secrets), README, docs copied | `git status` clean after commit | Done (eb10620) |
| T1 | Scaffold | Vite + React + TS app in `app/`; Vitest runs; record types, `Result`, and the four ports defined | `npm test`, `npm run build` | Done (f6593fc) |
| T2 | Domain logic | Pure, tested: sensitive-data check, review scheduler, chain builder, link suggestions, record validation | Unit tests pass | Done (244255b) |
| T3 | In-memory adapters | `RecordStore`, `Discovery`, `NotesStore`, `Questioner` in memory, seeded with Alice/Bob/Carol; contract tests per seam | Contract tests pass | Done (e3f7e9b) |
| T4 | Screens | Sessions (filters), session detail, publish takeaway (suggest links, deepens/broadens, sensitive warning, preview), chain view, questions + responses, review, private notes, demo user switcher | Component test for the publish flow; build passes | Done (b9dcebe) |
| T5 | Browser check | Core loop works end-to-end in a real browser, no console errors | Manual run with screenshots | Done (bbd0039) |

Out of scope: real AT Protocol adapter, OAuth, indexer, AI calls, report button.
