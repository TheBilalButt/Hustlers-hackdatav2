# PROGRESS

Live status plus an append-only log. Every agent or human updates this after each task (AGENTS.md, workflow step 7). New log entries go at the bottom.

## Status board
Legend: ☐ Not started · ◐ In progress · ☑ Done · ✂ Cut

| FR | Title | Owner | Priority | Status | Tests |
|---|---|---|---|---|---|
| FR-01 | Tabular generation | P2 | MVP | ☐ | T-01a–d |
| FR-02 | Column privacy controls | P2 | MVP+ | ☐ | T-02a–c |
| FR-03 | Relational generation | P2 | MVP | ☐ | T-03a–e |
| FR-04 | Cross-table invariants | P2 | MVP | ☐ | T-04a–c |
| FR-05 | One synthetic world | P2 | MVP | ☐ | T-05a–b |
| FR-06 | Invoices | P2 | MVP | ☐ | T-06a–d |
| FR-07 | Bank statements | P2 | MVP | ☐ | T-07a–c |
| FR-08 | Query-style generation | P2 | MVP+ | ☐ | T-08a–c |
| FR-09 | Schema inference from a sample | P3 | MVP | ☐ | T-09a–b |
| FR-10 | Prompt-to-dataset | P3 | MVP | ☐ | T-10a–b |
| FR-11 | Edge cases and chaos manifest | P3 | MVP+ | ☐ | T-11a–b |
| FR-12 | Trust Report | P3 | MVP | ☐ | T-12a–c |
| FR-13 | Exports | P2 | MVP | ☐ | T-13a–c |
| FR-14 | Recipes and reproducibility | P1 | MVP | ☐ | T-14a–c |
| FR-15 | Ground truth and degraded scans | P3 | MVP+ | ☐ | T-15a–b |
| FR-16 | Offline / deterministic mode | P3 | MVP | ☐ | T-16a |
| FR-17 | Watermark and provenance | P2 | MVP | ☐ | T-17a–d |
| FR-18 | Live preview and size estimate | P1 | MVP | ☐ | T-18a–b |
| RT | Red-team suite RT-01 … RT-32 | P3 | MVP+ | ☐ | tests/redteam |

## Environment
| Item | Value | Last checked |
|---|---|---|
| Production URL | — | |
| Standby URL | — | |
| Runtime bundle size (limit 450 MB) | — | |
| Vercel limits verified (TRD §2) | — | |
| LLM provider limits verified (`providers.yaml`) | — | |
| Demo recipes pre-warmed | — | |
| Backup video recorded | — | |

## Blockers and open questions
| When | Who | Question | Default taken | Resolved |
|---|---|---|---|---|
| 2026-09-29 | — | Research assumed a 3-person team, 24 hours, and no credit card. Confirm. | Plan follows these assumptions | ☐ |
| 2026-09-29 | — | Do organizers allow LLM providers whose free tiers may train on prompts (Gemini, Mistral)? | Keep them; no raw rows are sent (ADR-0008) | ☐ |
| 2026-09-29 | — | Do the locale packs (en_US, en_IN, de_DE) suit the judging audience, or should a different region lead the demo? | Keep as planned | ☐ |

## Log
Format: `date/hour | who | IDs | change | tests | next | blockers`

- 2026-09-29 | Claude | docs | Created v1 of PRD, TRD, ARCHITECTURE, DESIGN, DECISIONS (ADR-0001–0015), ROADMAP, PROGRESS, AGENTS.md, CLAUDE.md from the Phase 1 research report | — | M0 | see Blockers
- 2026-09-29 | Claude | docs | Added Git and GitHub workflow to ROADMAP (repo setup and structure, branch naming, commit format, module completion checklist, commit map, tags); linked it from AGENTS.md workflow and definition of done | — | M0 | none
- 2026-09-29 | Bilal | M0 | Scaffold complete: virtual environment set up, all Python deps and node modules installed, React/Vite/TS app shell and layout components created, pytest (10 passed) and tsc clean | 10 passed, tsc green | M1 | none
- 2026-09-29 | Bilal | FR-01, T-01a, T-01b, T-01d | Implemented tabular engine with seeded streams, value pools, null/outlier injection, row addressability, canonical hashing, and /api/preview | 15 passed | M1 (router) | none
