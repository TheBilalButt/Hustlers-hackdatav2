# AGENTS.md — HackDataV2 Synthetic Data Platform

Read this before every task. It is the working contract for any coding agent (Claude Code, Cursor, Codex) and for humans on the team.

## What we are building
A no-code web platform that generates a coherent **synthetic world**: tabular data, relational databases, and financial documents (invoices, bank statements) that agree with each other. Every dataset ships with a **Trust Report** proving it is correct, realistic, and safe.

Judging criteria: System design, Features, UI, AI, Problem approach.

## Source of truth (when docs conflict, the higher one wins)
1. `docs/DECISIONS.md` — accepted ADRs
2. `docs/TRD.md` — contracts, limits, schemas, thresholds (section numbers are stable: cite as "TRD §n")
3. `docs/PRD.md` — requirements (FR-xx) and acceptance criteria
4. `docs/ARCHITECTURE.md`, `docs/DESIGN.md`
5. `docs/ROADMAP.md` (what to build now) and `docs/PROGRESS.md` (what is done)

## Commands
| Task | Command |
|---|---|
| Install Python deps | `pip install -r requirements.txt -r requirements-dev.txt` |
| Install web deps | `pnpm install` |
| Run API locally | `uvicorn api.index:app --reload --port 8000` |
| Run web locally | `pnpm dev` (proxies `/api` to :8000) |
| All tests | `pytest -q` |
| Red-team suite | `pytest tests/redteam -q` |
| AI golden set (cached fixtures, no live calls) | `pytest tests/golden -q` |
| Metric parity vs SDMetrics (dev only) | `pytest tests/parity -q` |
| Lint and types | `ruff check . && mypy synth` · `pnpm lint && pnpm typecheck` |
| Regenerate TS types from IR | `pnpm gen:types` |
| Bundle size check | `scripts/bundle_size.sh` (must stay ≤ 450 MB) |
| Full stack offline | `OFFLINE_MODE=1 docker compose up` |
| Deploy | `vercel deploy` (preview) · `vercel deploy --prod` |

## Repo map
```
api/index.py        FastAPI app (Vercel entry)
synth/ir/           IR models — the single contract (TRD §4)
synth/profiler/     deterministic sample profiling + redaction
synth/llm/          router, providers.yaml, task contracts, prompts
synth/engines/      seeds, pools, tabular, copula, relational, chaos, privacy
synth/documents/    invoice/statement models, query DSL, fpdf2 rendering, degradation
synth/locales/      en_US, en_IN, de_DE packs (formats, tax, reserved ranges)
synth/trust/        validity, fidelity, privacy, relational metrics, report
synth/export/       csv_safe, sql, jsonl, sqlite encoders
synth/security/     uploads, sanitize, identifiers, limits
src/                React app (views, components, state, api, schemas, types)
tests/              unit, golden, parity, redteam, fixtures
```

## Hard invariants — never break these
1. **Every LLM output is validated** by a Pydantic model with `extra="forbid"` before use.
2. **The LLM is a planner only.** It has no tools. Its output never becomes SQL, HTML, file paths, or code. Values reach exports only through `synth/export/` encoders.
3. **No raw uploaded rows in prompts.** Send column names, profiler stats, and at most 5 masked examples per column (`synth/profiler/redact.py`).
4. **All randomness is seeded** through `synth/engines/seeds.py`. Never use `random`, global `np.random.*`, unseeded `Faker()`, `datetime.now()`, or `uuid4` inside generation.
5. **Generation is row-addressable** (ADR-0010): any block of any table is a pure function of `(recipe, table, block_index)`.
6. **Invariants are computed, not hoped for.** Money is `Decimal` with the locale pack's rounding mode. Validators recompute every invariant.
7. **Exports are escaped.** CSV formula-prefixing is on by default. SQL only via `synth/export/sql.py`. Identifiers must match `^[A-Za-z_][A-Za-z0-9_]{0,62}$` and not be reserved words.
8. **Documents are always watermarked** ("SYNTHETIC — NOT A REAL DOCUMENT"), carry `Synthetic=true` metadata, use `SYN-` numbers and fictional banks/sellers. No parameter disables this.
9. **Safe identifiers only**: RFC 2606/6761 email domains, reserved phone ranges, checksum-invalid IBANs and cards (TRD §8.3).
10. **API keys live in server env only.** Never in `VITE_*` variables, logs, responses, or commits.
11. **DP wording**: say "ε-DP" only for Laplace-noised marginals, using the exact sentences in TRD §8.2.
12. **Hard limits** (TRD §2) are checked server-side before any work starts.

## Never
- Add torch, SDV, Synthcity, Playwright/Chromium, or pandas to runtime dependencies. (SDMetrics is allowed as a dev dependency for parity tests.)
- Render LLM-authored HTML, or build PDFs from HTML.
- Write uploaded samples to disk, logs, or caches.
- Spend live LLM quota in tests. Use the mock LLM and cached fixtures.
- Weaken or skip a test to make it pass. Fix the code, or log a blocker in PROGRESS.md.
- Change `synth/ir/models.py` without bumping `ir_version`, running `pnpm gen:types`, and updating TRD §4.

## Workflow for every task
1. Find the FR / NFR / RT IDs for the current milestone in `docs/ROADMAP.md`.
2. Read only the PRD and TRD sections those IDs reference.
3. If something is ambiguous, pick the more conservative option and log the question under "Blockers" in PROGRESS.md.
4. Write or update the test first. Test names include the ID: `test_fr03_zero_orphans`, `test_rt14_csv_formula_prefix`.
5. Implement the smallest change that passes.
6. Run `pytest -q` (and `pnpm typecheck` if the frontend changed).
7. Append one line to the log in `docs/PROGRESS.md` and update the status board.
8. When the module is complete, commit, push, and open a PR following the module completion checklist in `docs/ROADMAP.md` ("Git and GitHub workflow"). Never push directly to `main`.
9. A new dependency or an architectural change needs a new ADR in DECISIONS.md first.

## Definition of done
- The FR's tests pass, including its RT cases (TRD §12 traceability).
- No new lint or type errors.
- `test_rerun_hash_identical` still passes.
- Bundle size re-checked if dependencies changed.
- PROGRESS.md updated; TRD/ARCHITECTURE updated if a contract changed.
- Committed, pushed, and merged into `main` through a PR with green CI.

## Conventions
- Python 3.12, Pydantic v2, full type hints, `ruff` formatting. Money is `Decimal`, never `float`.
- TypeScript `strict`; no `any`; Zod schemas mirror generated IR types.
- Commits: `<type>(<scope>): <summary> [<IDs>]`, e.g. `feat(documents): GST tax lines [FR-06, T-06b]`. Branches: `p1/<module>` frontend, `p2/<module>` engines, `p3/<module>` AI/trust/security. Full rules in ROADMAP "Git and GitHub workflow".
- Errors from the API use RFC 9457 problem+json with a `code` from TRD §10.
