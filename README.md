# Learning Chains

*Working title.* A study platform on the [AT Protocol](https://atproto.com) for collaborative, cumulative learning about AI. Students hold study sessions, publish what they learned, ask questions, and link each idea to the earlier ideas it builds on, forming public **chains of learning** across sessions and students.

CSE 210 final project proposal · Yinuo Zhou

## What's in this repo

| Path | Contents |
|---|---|
| [`docs/PROPOSAL_SHORT.md`](docs/PROPOSAL_SHORT.md) | Two-page summary of the proposal, with current status |
| [`docs/PROPOSAL.md`](docs/PROPOSAL.md) | Project proposal: motivation, scope, risks, privacy, success criteria |
| [`docs/DESIGN_PRINCIPLES.md`](docs/DESIGN_PRINCIPLES.md) | Engineering principles the design follows |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture: system shape, modules, data model, indexer, decisions |
| [`tasks/plan.md`](tasks/plan.md) | Build plan for the demo |
| `app/` | The demo web app |

## The demo

The demo is the real app's screens and logic running on **in-memory sample data** (students Alice, Bob, and Carol) instead of the live AT Protocol network. It shows the core loop: browse sessions → publish a takeaway → confirm links to earlier work → view the learning chain → review later.

**Not in the demo yet:** sign-in with Bluesky, writing to real AT Protocol repositories, the indexer server, and AI follow-up questions (canned examples are shown instead). See [ARCHITECTURE.md §10](docs/ARCHITECTURE.md).

### Run it

Requires Node.js 20+.

```bash
cd app
npm install
npm run dev      # start the demo at http://localhost:5173
npm test         # run the test suite
npm run build    # type-check and build
```

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and pull request:

1. **Type-check, test, build** (`app/`): `npm ci`, `npm run typecheck`, `npm test`, `npm run build` on Node 24.
2. **Secret scan:** [Gitleaks](https://github.com/gitleaks/gitleaks) over the full git history. A leaked key fails the build.

## Security

No secrets are needed to run the demo. `.env` files, keys, and credentials are ignored by git; never commit them.
