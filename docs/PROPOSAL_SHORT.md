# Learning Chains: Proposal (short version)

*Working title* · Yinuo Zhou · 2026-11-06 · Full version: [PROPOSAL.md](PROPOSAL.md)

## Problem

AI has changed how CS students learn. Many now ask an AI to explain a solution, or simply to give one, instead of working through the material, homework, and office hours. What matters is shifting toward what AI can't replace: creative ideas, teamwork and discussion, deep understanding, and using AI well.

Today's tools don't support that. AI chatbots are private and give answers by default. Piazza and Ed are tied to one course and its assignments. Discord is unstructured, and discussions vanish. Textbooks are static. **Nothing gives students a place where peers think together, and that thinking builds up over time.**

## What we propose

**Learning Chains** is an app on the AT Protocol (the open protocol behind Bluesky). Students hold study sessions on AI, publish what they learned, ask questions, and **link each new idea to the earlier ideas it builds on**. Over time these links form public **chains of learning** that show how understanding deepened or broadened across sessions and across students.

> A dedicated place for collaborative, cumulative thinking about AI: in public, and owned by the student.

- **Focused domain:** AI only, in two tracks. **AI Concepts** covers theory; **AI Practice** covers using AI tools and building projects. One domain keeps enough students per topic for matching to work.
- **Student-owned:** each student's history lives in their own AT Protocol account, not our database, so it outlives any course, campus, or app.
- **Public by default:** shared thinking is the point. Raw private notes stay in the student's browser.

## Core services

| Service | What it does |
|---|---|
| Study sessions | Host or join sessions; filter by track and topic; RSVP |
| Takeaways | Publish what you learned after a session |
| Questions | Post a theoretical question and a proposed solution; peers reply with solutions or follow-ups |
| Learning chains | Link work as **deepens** or **broadens**. Shared topics only *suggest* links; **students confirm every link** |
| Review & private notes | Revisit takeaways after 7 and 30 days; private notes never leave the browser |
| AI follow-up questions *(optional, off by default)* | AI asks probing questions about a takeaway. It never gives answers |

## Guiding principles

1. **Collaborative learning:** learn with and from peers across courses and campuses.
2. **A long-term, expanding knowledge base:** learning accumulates and stays with each student.
3. **Deep knowledge cultivated by human thinking:** students do the reasoning; AI supports it but never replaces it.
4. **Encouraging innovation:** turn ideas into projects, and theory into practice.

## Why AT Protocol

- **Ownership:** records live in each student's own repository.
- **One account, any campus:** students sign in with their existing Bluesky account.
- **Linking across students:** a record can point to another student's record, the way Bluesky replies do.

## Design in brief

- **We build two small parts:** a web app and an indexer. AT Protocol already provides accounts, storage, and a live stream of changes.
- **Writes go straight to the student's own repository.** Our server never holds logins or records. Reads go through the indexer, a rebuildable searchable copy, because the protocol has no "search everyone."
- **The web app is layered:** screens, then app rules, then four small interfaces, then swappable adapters. The demo runs the real screens and rules on in-memory sample data.
- **One hard-to-reverse decision:** the record formats. Once students have saved records, we can only add optional fields, so the formats get reviewed before launch.

Details: [ARCHITECTURE.md](ARCHITECTURE.md) and [DESIGN_PRINCIPLES.md](DESIGN_PRINCIPLES.md).

## Privacy and integrity

- **Nothing is published automatically.** Every publish shows a preview and a "this will be public" notice.
- **A live warning flags** emails, student IDs, API keys, and meeting links before publishing. Meeting links are never allowed in public records.
- **Deletes are honored** in our app, but copies elsewhere may remain. We say so before publishing.
- **Text only, no uploads.** Prompts ask for reasoning, not solutions, and questions are conceptual. We can't stop a determined student from leaking homework, but the app never rewards it.

## Biggest risk: demand

We don't yet know whether students want *public*, cumulative collaboration, or whether a private Discord group is enough. **Before building further, we validate:** interviews with 10–15 CSE students, then a 2-week test using existing Bluesky posts, ideally compared with a Discord group. Go / pivot / stop thresholds are agreed before the test starts.

## Status

| Done | Next |
|---|---|
| Proposal, design, and principles documents | Validate demand |
| Demo app: real screens and rules on sample data | Real AT Protocol storage and Bluesky sign-in |
| 71 automated tests; CI with tests, build, and secret scan (passing) | Indexer (Jetstream → SQLite) |
| Presentation deck | Pilot with 20–50 students; measure the four principles |

**Open questions:** team roles, the course rubric, a domain for the record names, and indexer hosting.
