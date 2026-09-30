# PROGRESS

Live status plus an append-only log. Every agent or human updates this after each task (AGENTS.md, workflow step 7). New log entries go at the bottom.

## Status board
Legend: ☐ Not started · ◐ In progress · ☑ Done · ✂ Cut

| FR | Title | Owner | Priority | Status | Tests |
|---|---|---|---|---|---|
| FR-01 | Tabular generation | P2 | MVP | ☑ | T-01a–d |
| FR-02 | Column privacy controls | P2 | MVP+ | ☑ | T-02a–c |
| FR-03 | Relational generation | P2 | MVP | ☑ | T-03a–e |
| FR-04 | Cross-table invariants | P2 | MVP | ☑ | T-04a–c |
| FR-05 | One synthetic world | P2 | MVP | ☑ | T-05a–b |
| FR-06 | Invoices | P2 | MVP | ☑ | T-06a–d |
| FR-07 | Bank statements | P2 | MVP | ☑ | T-07a–c |
| FR-08 | Query-style generation | P2 | MVP+ | ☑ | T-08a–c |
| FR-09 | Schema inference from a sample | P3 | MVP | ☑ | T-09a–b |
| FR-10 | Prompt-to-dataset | P3 | MVP | ☑ | T-10a–b |
| FR-11 | Edge cases and chaos manifest | P3 | MVP+ | ☑ | T-11a–b |
| FR-12 | Trust Report | P3 | MVP | ☑ | T-12a–c |
| FR-13 | Exports | P2 | MVP | ☑ | T-13a–c |
| FR-14 | Recipes and reproducibility | P1 | MVP | ☑ | T-14a–c |
| FR-15 | Ground truth and degraded scans | P3 | MVP+ | ☑ | T-15a–b |
| FR-16 | Offline / deterministic mode | P3 | MVP | ☑ | T-16a |
| FR-17 | Watermark and provenance | P2 | MVP | ☑ | T-17a–d |
| FR-18 | Live preview and size estimate | P1 | MVP | ☑ | T-18a–b |
| RT | Red-team suite RT-01 … RT-32 | P3 | MVP+ | ☑ | tests/redteam |

## Environment
| Item | Value | Last checked |
|---|---|---|
| Production URL | — | |
| Standby URL | — | |
| Runtime bundle size (limit 450 MB) | 430 KB | 2026-09-30 |
| Vercel limits verified (TRD §2) | verified | 2026-09-30 |
| LLM provider limits verified (`providers.yaml`) | verified | 2026-09-30 |
| Demo recipes pre-warmed | verified | 2026-09-30 |
| Backup video recorded | — | |

## Blockers and open questions
| When | Who | Question | Default taken | Resolved |
|---|---|---|---|---|
| 2026-09-29 | — | Research assumed a 3-person team, 24 hours, and no credit card. Confirm. | Plan follows these assumptions | ☑ |
| 2026-09-29 | — | Do organizers allow LLM providers whose free tiers may train on prompts (Gemini, Mistral)? | Keep them; no raw rows are sent (ADR-0008) | ☑ |
| 2026-09-29 | — | Do the locale packs (en_US, en_IN, de_DE) suit the judging audience, or should a different region lead the demo? | Keep as planned | ☑ |

## Log
Format: `date/hour | who | IDs | change | tests | next | blockers`

- 2026-09-29 | Claude | docs | Created v1 of PRD, TRD, ARCHITECTURE, DESIGN, DECISIONS (ADR-0001–0015), ROADMAP, PROGRESS, AGENTS.md, CLAUDE.md from the Phase 1 research report | — | M0 | see Blockers
- 2026-09-29 | Claude | docs | Added Git and GitHub workflow to ROADMAP (repo setup and structure, branch naming, commit format, module completion checklist, commit map, tags); linked it from AGENTS.md workflow and definition of done | — | M0 | none
- 2026-09-29 | Team | M0, FR-01, FR-16 | Scaffolded platform, tabular generation engine, and multi-provider LLM router with fallback | T-01a, T-01b, T-01d, T-10b | M1 shell | none
- 2026-09-29 | Team | FR-18 | App shell, mode tabs, interactive column config panel with Zod, live 300ms debounced preview grid, ProofBar | T-18a, T-18b | M2 relational | none
- 2026-09-29 | Team | FR-03, FR-04 | Topological relational generator with zero orphans, N:N deduplication, self-referencing FK, cross-table invariants (sum_children, temporal_order) | T-03a–e, T-04a–c | M2 export | none
- 2026-09-29 | Team | FR-13 | Formula-safe CSV, JSONL, PostgreSQL/SQLite DDL and INSERT exporter, SQLite binary DB, and full ZIP bundle | T-13a–c | M2 profiler | none
- 2026-09-29 | Team | FR-18 | Interactive ER diagram with React Flow, crow's foot cardinalities, link editor, and bottom split preview | T-18a, T-18b | M2 profiler | none
- 2026-09-29 | Team | FR-09 | Deterministic sample profiling (CSV/JSON upload validation, types/stats, PII detection, winsorized bounds, redacted prompt masking, profile-to-IR) | T-09a, T-09b, RT-01..RT-26 | M2 prompt-to-dataset | none
- 2026-09-29 | Team | FR-10 | Natural language prompt-to-IR with spotlighting, canary tokens, and 30-case golden test set | T-10a, T-10b, RT-04, RT-05, RT-08, RT-24, RT-31 | M3 documents | none
- 2026-09-30 | Team | FR-06, FR-07, FR-12, FR-17 | PDF invoice & bank statement generation with mandatory watermark, Trust Report proof cards (correctness, realistic, safety) | T-06a–d, T-07a–c, T-12a–c | M4 linkage | none
- 2026-09-30 | Team | UI, FR-18 | Dribbble dashboard redesign with Metricly KPI badges, micro-counts, Mac subtle accent header, smooth spring animations, and 100% emoji removal replaced by stroke SVGs | 103 passed, tsc, eslint | Complete | none
- 2026-09-30 | Team | FR-05, FR-08 | One-World cross-modal linkage & query DSL satisfaction by construction | T-05a–b, T-08a–c | M5 ui-polish | none
- 2026-09-30 | Team | FR-05..FR-18 | Full UI polish: instant deterministic client mock engine, one-world 3-way reconciliation viewer, physical scanner degradation simulator, SVG icons, and live search | 103 passed, 0 lint errors, 0 type errors | Release v1.0.0 | none
