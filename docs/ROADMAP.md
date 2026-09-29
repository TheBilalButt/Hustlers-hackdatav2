# ROADMAP — 24-hour build plan

Version 1.0 · 2026-09-29 · H0 = hackathon start (relative clock)
Owners:
- **P1** frontend and UI
- **P2** engines, exports, documents
- **P3** AI layer, Trust Report, security

Related: [PRD](PRD.md) · [TRD](TRD.md) · [PROGRESS](PROGRESS.md)

## Pre-flight (only what the rules allow before H0)
- [ ] Confirm permitted pre-work, team size, duration, and submission format.
- [ ] Create accounts: GitHub, Vercel, Render. Get LLM keys (Groq, Gemini, Cloudflare, OpenRouter, Mistral) and set provider-side usage caps.
- [ ] Re-check free-tier limits (the research is from Sept 2026) and update `synth/llm/providers.yaml`.
- [ ] Pick the product name.

## Git and GitHub workflow
**Rule: commit and push after every module.** A module is one row of the commit map below — usually one FR, one `synth/` package, or one UI view. Nothing should stay uncommitted for more than about an hour. Frequent, timestamped commits also show judges that the work was done during the event.

### Repository setup (M0)
- Create the GitHub repo `hackdatav2-synthetic-data-platform` and add all three members as collaborators. Check whether the rules require a public repo.
- Protect `main`: changes only through pull requests, CI must pass, no force pushes. Don't require approvals; that would stall a 24-hour build. Ask a teammate for a quick review when one is free.
- Connect Vercel to the repo: production deploys from `main`, and every PR gets a preview URL.
- Before the first feature commit, add:
  - `.gitignore` covering Python, Node, `.env*`, `.vercel`, `node_modules`, `dist`, `__pycache__`, and generated datasets;
  - `.env.example` listing every variable name without values;
  - `README.md` and `LICENSE` (MIT);
  - pre-commit hooks (ruff, gitleaks);
  - the `.github/` files below.

### Repository structure
```
hackdatav2-synthetic-data-platform/
├── .github/
│   ├── workflows/ci.yml          ruff, mypy, pytest, red-team, pnpm lint/typecheck,
│   │                             bundle size, FR→test traceability, gitleaks, pip-audit
│   ├── pull_request_template.md  FR/RT IDs, tests run, PROGRESS updated, UI screenshots
│   ├── ISSUE_TEMPLATE/bug.md
│   └── CODEOWNERS                src/ → P1
│                                 synth/engines, documents, export, locales → P2
│                                 synth/llm, profiler, trust, security, tests/redteam → P3
├── docs/                         PRD, TRD, ARCHITECTURE, DESIGN, DECISIONS, ROADMAP, PROGRESS
├── api/                          FastAPI entry (Vercel function)
├── synth/                        Python package (layout in ARCHITECTURE §12)
├── src/                          React app
├── tests/                        unit, golden, parity, redteam, fixtures
├── scripts/                      bundle_size.sh, gen_types.sh, warm_demo.sh
├── AGENTS.md  CLAUDE.md  README.md  LICENSE
├── .env.example  .gitignore  .pre-commit-config.yaml
└── vercel.json  Dockerfile  docker-compose.yml  requirements.txt  requirements-dev.txt
    package.json  pnpm-lock.yaml
```

### Branches and commit messages
- One branch per module, named `p1/<module>`, `p2/<module>`, or `p3/<module>` (e.g., `p2/relational`). Branch from the latest `main` and merge within about 3 hours.
- Commit message format (Conventional Commits plus requirement IDs): `<type>(<scope>): <summary> [<IDs>]`.
  - Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`.
  - Example: `feat(relational): topological generation with zero orphans [FR-03, T-03a]`.
- Small work-in-progress commits are fine. The required commit is the one that completes the module.

### Module completion checklist (in order)
1. `pytest -q` passes, plus `pnpm lint && pnpm typecheck` if the frontend changed.
2. `docs/PROGRESS.md` has a new log line and an updated status board.
3. `git status` shows no `.env` files, keys, uploaded samples, or generated datasets.
4. Commit using the format above and push the branch.
5. Open a PR with the template; CI must be green.
6. Squash-merge into `main`, delete the branch, and confirm the Vercel deploy succeeded.
7. Teammates pull `main` before starting their next module.

### Commit map (one merge into `main` per row)
| Milestone | Module | Owner | Branch | Merge commit |
|---|---|---|---|---|
| M0 | Repo scaffold, docs, CI | P3 | `chore/scaffold` | `chore: scaffold repo, docs and CI [M0]` |
| M0 | IR v1 | P2 | `p2/ir` | `feat(ir): IR v1 models and JSON Schema [M0]` |
| M0 | Deploy hello-world | P1 | `p1/deploy` | `chore(deploy): Vercel SPA and /api/health [M0]` |
| M1 | App shell | P1 | `p1/shell` | `feat(ui): app shell, mode tabs, config panel [FR-18]` |
| M1 | Seeds, pools, tabular | P2 | `p2/tabular` | `feat(tabular): seeded pools and samplers [FR-01]` |
| M1 | LLM router | P3 | `p3/router` | `feat(llm): router, breakers, deterministic fallback [FR-16, RT-31]` |
| M2 | Preview grid and ER | P1 | `p1/preview-er` | `feat(ui): preview grid and ER diagram [FR-18]` |
| M2 | Relational and invariants | P2 | `p2/relational` | `feat(relational): generation and invariants [FR-03, FR-04]` |
| M2 | Exporters | P2 | `p2/export` | `feat(export): CSV, JSONL and SQL encoders [FR-13]` |
| M2 | Profiler | P3 | `p3/profiler` | `feat(profiler): deterministic sample profiling [FR-09]` |
| M2 | Prompt-to-dataset | P3 | `p3/nl-to-ir` | `feat(llm): nl_to_ir with spotlighting [FR-10]` |
| M3 | Documents view and proof bar | P1 | `p1/documents-ui` | `feat(ui): documents view and proof bar [FR-06, FR-07, FR-12]` |
| M3 | Invoices, statements, locale packs | P2 | `p2/documents` | `feat(documents): invoices, statements, watermark [FR-06, FR-07, FR-17]` |
| M3 | Trust metrics | P3 | `p3/trust` | `feat(trust): validity, fidelity and privacy metrics [FR-12]` |
| M4 | Trust drawer, chaos cells, linked records | P1 | `p1/trust-ui` | `feat(ui): trust drawer and linked records [FR-05, FR-11, FR-12]` |
| M4 | One-world linkage | P2 | `p2/one-world` | `feat(documents): link invoices and statements to orders [FR-05]` |
| M4 | Query DSL | P2 | `p2/query-dsl` | `feat(documents): query DSL satisfied by construction [FR-08]` |
| M4 | Chaos manifest | P3 | `p3/chaos` | `feat(engines): chaos variant and manifest [FR-11]` |
| M4 | Ground truth and scans | P3 | `p3/ground-truth` | `feat(documents): ground truth and degraded scans [FR-15]` |
| M5 | Red-team suite | P3 | `p3/redteam` | `test(redteam): RT-01 to RT-32 [NFR-06]` |
| M5 | Privacy controls | P2 | `p2/privacy` | `feat(privacy): filter, HMAC, DP marginals [FR-02]` |
| M5 | Recipes, accessibility, presets | P1 | `p1/recipes-a11y` | `feat(ui): recipes, accessibility, demo presets [FR-14, NFR-08]` |
| M6 | README and submission | all | `docs/submission` | `docs: README and submission text [M6]` |

A module that gets cut (cut list below) is recorded as ✂ in PROGRESS.md instead of being merged half-done.

### Tags
Tag `main` at every milestone exit: `m0` … `m5`, `mvp` at the H12 checkpoint, and `v1.0-submission` when submitting:
`git tag -a m2 -m "M2 exit" && git push origin --tags`
The submission tag is what judges review; nothing merges into `main` after it.

## M0 · H0–H1 · Foundation (all)
- Create the GitHub repo and apply the setup above (protected `main`, CI, Vercel connected).
- Scaffold the repo per the structure above; commit the docs, AGENTS.md, and CLAUDE.md.
- IR v1: Pydantic models, JSON Schema export, generated TS types (TRD §4).
- Vercel hello-world (SPA + `/api/health`), with the full runtime dependencies installed to measure the bundle.
- Keys in Vercel env; Render service created from the same Dockerfile.

**Exit:**
- [ ] `main` is protected, CI runs on every PR, and Vercel deploys from GitHub.
- [ ] `/api/health` is live on Vercel.
- [ ] Bundle size ≤ 450 MB, recorded in PROGRESS.
- [ ] `pytest` and `pnpm typecheck` are green.

## M1 · H1–H4 · Engines and router
- **P1:** app shell, header, mode tabs, config panel with Zod; API client with failover.
- **P2:** `seeds.py` (TRD §5.2), Faker pools, samplers, null and outlier injection, row plan and caps (FR-01; FR-18 estimate).
- **P3:** router, `providers.yaml`, task contracts, breaker and 429 tests (FR-16); RT-05, RT-31.

**Exit:**
- [ ] T-01a, T-01b, T-01d, T-10b pass.
- [ ] Shell deployed.

## M2 · H4–H8 · Relational and AI planning
- **P1:** virtualized preview grid, ER diagram, start screen.
- **P2:** relational generator (FR-03), invariants (FR-04), CSV/JSONL/SQL exporters with encoders (FR-13).
- **P3:** profiler (FR-09), `nl_to_ir` with spotlighting (FR-10), a golden set of ~30 cases.

**Exit:**
- [ ] Prompt → IR → ER diagram + preview works end-to-end on the deployed build.
- [ ] T-03a–e, T-04a–c, T-09a, T-10a pass.

## M3 · H8–H12 · Documents and Trust core
- **P1:** Documents view, PDF preview, proof bar.
- **P2:** `InvoiceDoc` / `StatementDoc`, locale packs (en_US, en_IN, de_DE), fpdf2 templates with watermark (FR-06, FR-07, FR-17).
- **P3:** Trust metrics (validity, fidelity, privacy) and report JSON (FR-12).

**Exit — H12 checkpoint (hard):**
- [ ] MVP deployed to Vercel and Render.
- [ ] Demo steps 1–4 (below) work.
- [ ] Anything still broken is cut per the cut list.

## M4 · H12–H16 · Differentiators
- **P1:** Trust drawer UI, chaos cell highlighting, "Show linked records".
- **P2:** one-world linkage (FR-05), query DSL with satisfaction by construction (FR-08).
- **P3:** chaos manifest (FR-11), ground truth plus one degraded variant (FR-15).

**Exit:**
- [ ] T-05a–b, T-08a–c, T-11a–b, T-15a pass.

## M5 · H16–H19 · Hardening
- **P3:** full red-team suite RT-01 … RT-32 in CI.
- **P2:** privacy filter, HMAC hashing, DP marginals (FR-02), holdout split.
- **P1:** accessibility pass (DESIGN §8), recipe save/load/share (FR-14), demo presets.

**Exit:**
- [ ] All MVP tests and the RT suite are green.
- [ ] The determinism test passes on the deployed build.

## M6 · H19–H24 · Freeze, rehearse, submit
- **H19–H21:** feature freeze; production deploy; standby warm; pre-warm demo recipes; record the backup video; write README and submission text.
- **H21–H23:** rehearse the demo 3× on the deployed build. Fix only demo-blocking bugs.
- **H23–H24:** buffer; tag `v1.0-submission`, then submit.

## Cut list (if behind at H12, cut in this order)
1. All stretch items
2. Degraded scan variant (keep ground-truth JSON)
3. de_DE locale pack
4. SQLite export (keep `.sql`)
5. DP marginals (keep Mask, HMAC, Drop, Generalize)
6. Share-by-URL (keep file save/load)
7. Third template per document type

**Never cut:**
- FR-05 one-world linkage
- FR-12 Correct card
- FR-14 reproducibility
- FR-16 offline mode
- FR-17 watermark

## Stretch (priority order, only after the M5 exit)
1. FR-S6 TSTR utility score
2. FR-S1 planted fraud ring with answer key
3. FR-S2 Anonymeter
4. Shared rate limiter (ADR-0011)
5. FR-S3 OCR character error rate
6. FR-S4 MySQL dialect and Parquet
7. FR-S5 RTL locale
8. C2PA provenance

## Rest
Each person takes one 2–3 hour rest block between H14 and H20. Stagger them so no two people rest at once, and schedule each block around that person's milestone tasks. Agree on the blocks at the H12 checkpoint.

## Demo script (4 minutes)
1. **0:00 · Hook (20 s).** "Test data is either fake-looking or legally risky. We generate a whole synthetic world, and prove it."
2. **0:20 · Prompt-to-dataset (40 s).** Type "Indian D2C shop with customers, orders, items; GST invoices". Show the schema, the ER diagram, and the provenance badge.
3. **1:00 · Trust (50 s).** Generate 50k rows. Point to 0 orphans and reconciled totals. Change the seed and change it back to show the identical hash.
4. **1:50 · One world (50 s).** Pick one customer → their orders → the watermarked GST invoice → the matching statement debit. Query "last 90 days, balance over ₹5,000" → "Query satisfied ✓".
5. **2:40 · Chaos and ground truth (30 s).** Show highlighted cells, `chaos_manifest.json`, and a noisy scan next to its JSON labels.
6. **3:10 · Security (25 s).** Upload a CSV whose header says "Ignore previous instructions…". It is rejected, and the plan stays valid.
7. **3:35 · Close (25 s).** Architecture slide. Unplug the LLMs (offline mode) and show it still works. Roadmap.
