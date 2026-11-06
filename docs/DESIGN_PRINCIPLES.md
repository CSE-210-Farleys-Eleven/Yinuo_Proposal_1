# Design Principles: Learning Chains

These principles guide every design decision for the app. Each one is applied to this project specifically. When a design choice breaks a principle, write down why.

Sources: the installed `codebase-design` and `api-and-interface-design` skills, which draw on Parnas (information hiding, 1972), Ousterhout (*A Philosophy of Software Design*), Feathers (seams, *Working Effectively with Legacy Code*), and Cockburn (hexagonal architecture / ports & adapters).

## Vocabulary

| Term | Meaning |
|---|---|
| **Module** | Anything with an interface and an implementation: a function, class, package, or whole slice of the app |
| **Interface** | Everything a caller must know to use the module: types, but also rules, ordering, error cases, and performance |
| **Deep module** | Lots of behavior behind a small interface (good). **Shallow**: the interface is almost as complex as what's behind it (avoid) |
| **Seam** | The place where a module's interface lives, where behavior can be swapped without editing callers |
| **Adapter** | A concrete thing that fills a seam, e.g. the real AT Protocol store vs. an in-memory fake |

## Core principles

| Principle | Meaning | In Learning Chains |
|---|---|---|
| **Separation of concerns** | Each part has one job | The UI shows things; a records module talks to AT Protocol; the indexer stores and searches; chain logic decides what links to what. None does another's job. |
| **Modularization: deep modules** | Lots of behavior behind a small interface | e.g. `chains.getChain(id)` hides fetching, backlinks, and ordering. The rest of the app doesn't know how chains are built. |
| **Abstraction / information hiding** | Callers know *what* a module does, not *how* | The UI never sees Jetstream, OAuth tokens, or database tables. |
| **Decoupling** | Change one part without breaking others | Switching our own backlink index to Constellation touches one module only. |
| **Dependency inversion (ports & adapters)** | Depend on an interface, not a concrete service | The app talks to a `RecordStore` interface: a real AT Protocol adapter in production, an in-memory fake in tests and the demo. |
| **High cohesion** | Things that change together live together | Everything about sessions (record type, validation, UI) sits together. |

## Rules

1. **Contract first.** Define record types (Lexicons) and module interfaces before writing code. See PROPOSAL.md §4.2–4.3.
2. **Prefer addition over modification.** Once a record type is published, only add optional fields. Records already in students' repos must stay valid. **One-way door:** review schemas before the first publish.
3. **Validate at the edges.** Records arriving from Jetstream are written by anyone. Check them once on arrival; trust them inside.
4. **Accept dependencies, don't create them.** Pass in the record store, clock, and AI client so tests can swap in fakes.
5. **Return results, don't hide side effects.** e.g. a function that computes review reminders returns a list; it doesn't send notifications itself.
6. **One adapter = a hypothetical seam; two adapters = a real one.** Only add an abstraction where two things actually vary across it (here: real store vs. fake). No abstractions "just in case."
7. **The deletion test.** Imagine deleting a module. If complexity vanishes, it was a pass-through. If complexity reappears in many callers, it earns its place.
8. **The interface is the test surface.** Test modules through their interface. Needing to test past it means the module is the wrong shape.
9. **Consistent errors.** Every module reports failure the same way, never a mix of throwing, returning null, and returning `{ error }`.

## Why this matters for the demo

Because of rule 4 and the `RecordStore` seam, the demo app can run on an in-memory store with sample students, sessions, and chains, before any real AT Protocol work. Moving to the real network later means adding the real adapter without changing the UI or chain logic.
