# DECISIONS — Architecture Decision Records

Format: MADR-lite (Status · Context · Decision · Alternatives · Consequences).
All ADRs live in this file. Add new ones at the bottom with the next number. Never edit an accepted decision; supersede it with a new ADR.

| ADR | Title | Status |
|---|---|---|
| 0001 | One canonical IR for all modules | Accepted |
| 0002 | LLM as a validated planner; plan frozen in the recipe | Accepted |
| 0003 | Hand-rolled multi-provider router with deterministic fallback | Accepted |
| 0004 | No SDV, Synthcity, or deep models at runtime; own metrics with SDMetrics parity | Accepted |
| 0005 | Stack and hosting | Accepted |
| 0006 | fpdf2 for PDFs; no HTML-to-PDF | Accepted |
| 0007 | DP claims limited to Laplace-noised marginals | Accepted |
| 0008 | No raw rows sent to LLMs | Accepted |
| 0009 | Stateless deterministic chunking instead of a job queue | Accepted |
| 0010 | Row-addressable generation | Accepted (added in doc review) |
| 0011 | Stateless-safe rate limiting and breakers | Accepted (added in doc review) |
| 0012 | Sample lifecycle and recipe privacy | Accepted (added in doc review) |
| 0013 | Holdout split and minimum sample size | Accepted (added in doc review) |
| 0014 | Chaos data as a separate dirty variant | Accepted (added in doc review) |
| 0015 | Always-on watermark and fictional entities | Accepted |

---

## ADR-0001 One canonical IR for all modules
**Context.** Tabular, relational, and document generation, plus the AI layer and the UI, must agree on one model of the data.
**Decision.** The Pydantic v2 `Dataset` IR (TRD §4) is the only contract. Its JSON Schema generates the TS types. Documents are views over relational entities.
**Alternatives.** Per-module configs (they drift). SDV's metadata format (tied to a BSL ecosystem; no documents).
**Consequences.** One validator, and the "one synthetic world" costs little. IR changes ripple through the codebase, so they require a version bump.

## ADR-0002 LLM as a validated planner; plan frozen in the recipe
**Context.** LLM output is nondeterministic, quota-limited, and injectable.
**Decision.** The LLM only proposes IR fragments, labels, DSL, text pools, and edge cases. Everything passes an `extra="forbid"` validator and is frozen into the recipe with provenance. Reruns never call an LLM.
**Alternatives.** LLM-written rows (the research estimates ~6.6k rows/day on Groq's free tier, plus leakage risk). An LLM with tools (excessive agency).
**Consequences.** Reproducible, cheap, and safe. Bulk realism depends on our engines, not the model.

## ADR-0003 Hand-rolled multi-provider router with deterministic fallback
**Context.** Free LLM tiers in Sept 2026 are small and change without notice (research §5).
**Decision.** A ~150-line router on the `openai` SDK: a provider registry in YAML, a circuit breaker per provider, a cache, a per-task provider order, and a deterministic fallback (TRD §9.2).
**Alternatives.** LiteLLM Router (heavier, with known cooldown quirks). OpenRouter alone (50 requests/day). Vercel AI SDK (TypeScript, which would split validators across languages).
**Consequences.** Small and testable, but we own its bugs, so it needs unit tests for 429 handling and failover.

## ADR-0004 No SDV, Synthcity, or deep models at runtime; own metrics with SDMetrics parity
**Context.** SDV uses the Business Source License. Synthcity and deep models need torch, which breaks the bundle limit. The build window is 24 hours.
**Decision.** Generate with Faker pools, rule samplers, and our own Gaussian copula. Compute the Trust Report with ~300 lines of our own metrics. SDMetrics (MIT) is a dev dependency used only for parity tests.
**Alternatives.** SDV HMA, CTGAN/TVAE, mostlyai-qa at runtime.
**Consequences.** Fits the bundle, clean licenses, fast. Nonlinear dependence is captured less well, and we say so if asked.

## ADR-0005 Stack and hosting
**Decision.**
- Frontend: Vite, React, TypeScript, Tailwind, shadcn/ui, TanStack Table, React Flow, Zod, Zustand, fflate.
- Backend: Python 3.12, FastAPI, Pydantic v2, NumPy, SciPy, scikit-learn, Faker, Babel, fpdf2, pypdfium2, Pillow, openai.
- Hosting: Vercel Hobby (primary), Render free (standby), local Docker.

**Alternatives.** Next.js (heavier; SSR isn't needed). Streamlit or Gradio (weak workspace UX). HF Spaces (new compute Spaces need a paid plan per the research). Cloud Run, Fly.io, Koyeb (card required).
**Consequences.** Matches the team's React + Python ML skills. The stateless constraint drives ADR-0009 and ADR-0011.

## ADR-0006 fpdf2 for PDFs; no HTML-to-PDF
**Context.** HTML engines fetch resources (SSRF, `file://` reads), and Chromium is ~280 MB.
**Decision.** Programmatic layout with fpdf2 and templates written in Python. Previews show server PDFs in a sandboxed iframe.
**Alternatives.** WeasyPrint (needs system libraries and a locked-down URL fetcher). Playwright.
**Consequences.** Removes a whole vulnerability class, and bounding boxes for ground truth come free. Layout is manual work, so we cap it at 3 templates per type.

## ADR-0007 DP claims limited to Laplace-noised marginals
**Decision.** Offer "DP marginals (ε)" only in sample mode, with the exact wording in TRD §8.2. Everything else is called noise perturbation or privacy by construction.
**Consequences.** We have an honest, precise answer for judges. The fact that correlations are fitted non-privately is disclosed on screen.

## ADR-0008 No raw rows sent to LLMs
**Context.** Some free tiers may use prompts for training or human review (research §5).
**Decision.** Send only profiler stats plus at most 5 masked examples per column. Enforced by RT-26.
**Consequences.** Privacy holds whichever provider answers. Semantic labels may be slightly less accurate, so the profiler does most of the work.

## ADR-0009 Stateless deterministic chunking instead of a job queue
**Context.** Free serverless has no persistent workers, 4.5 MB bodies, and a 300 s limit.
**Decision.** The client requests fixed blocks, the server regenerates them from the seed, and the client zips the result.
**Alternatives.** Celery/RQ with Redis (needs an always-on worker). One big request (timeouts).
**Consequences.** Idempotent, retry-safe blocks. Requires row-addressable generation (ADR-0010).

## ADR-0010 Row-addressable generation
**Context.** The research recommended chunking, but relational children depend on their parents (FKs, dates), and parent totals depend on their children. Naive chunking breaks determinism and invariants at chunk boundaries.
**Decision.**
- Fixed 10k-row blocks, with a `SeedSequence` per (table, stream, block).
- Child counts → prefix sums → parent lookup via `searchsorted`.
- Parent columns and child-derived totals are regenerated on demand, memoized per request (TRD §5.3).
- The block size is part of `engine_version`.

**Alternatives.** Generate the whole dataset per request and slice it (times out at scale). Store generated data (no storage available).
**Consequences.** Any block produces identical bytes anywhere, and the dataset hash is stable. There is some recomputation cost, bounded by memoization. Privacy-filter redraws must also use seeded streams.

## ADR-0011 Stateless-safe rate limiting and breakers
**Context.** Serverless instances don't share memory, so an in-memory per-IP token bucket or circuit breaker only works per instance.
**Decision.** Safety rests on stateless hard caps checked on every request (TRD §2): rows, fan-out, upload size, prompt length, documents per request, and token budgets. The per-IP limit and breakers are best-effort per instance. A shared limiter (e.g., the Upstash Redis free tier) is a stretch item.
**Consequences.** No extra service to run. A determined abuser could burn LLM quota; the cache, offline fallback, and provider-side usage caps limit the damage.

## ADR-0012 Sample lifecycle and recipe privacy
**Context.** In sample mode, the recipe stores fitted copula parameters (quantiles, correlations) learned from real data. Sharing that recipe by URL would leak those statistics.
**Decision.**
- Samples exist only in memory for one request. The browser keeps the file and re-sends it for `/trust`.
- Recipes with `derived_from_sample = true` show a warning before sharing.
- When DP marginals are on, only the DP-noised marginals are stored.

**Consequences.** The privacy story is honest. After a page reload, users must re-select the file to recompute sample-based metrics.

## ADR-0013 Holdout split and minimum sample size
**Context.** DCR share and NNDR need a holdout the generator never saw. Without one, the Safe card's claims are unfounded.
**Decision.** Samples with ≥ 200 rows get a seeded 80/20 split, and fitting uses only the training part. Below 200 rows, distance metrics are N/A and the UI suggests a larger sample.
**Consequences.** Follows mostlyai-qa conventions. Fitting has 20 % less data.

## ADR-0014 Chaos data as a separate dirty variant
**Context.** Chaos mode injects violations on purpose, which conflicts with the "0 violations" claim.
**Decision.** Clean data is generated first. Chaos is applied to a copy using stream 4. The Correct card evaluates the clean variant. The dirty variant passes when its violations exactly equal the manifest.
**Consequences.** Both claims stay true, and QA teams get an answer key. There are two variants to export.

## ADR-0015 Always-on watermark and fictional entities
**Context.** Realistic invoices and statements could be misused as fake proof of funds or income.
**Decision.** Every document gets a watermark, footer, metadata, `SYN-` numbers, and fictional banks and sellers, and a blocklist replaces real names. No parameter disables any of this, and bulk document generation is rate-limited. C2PA provenance is a roadmap item.
**Consequences.** We have a credible answer to "can this forge a bank statement?" Documents look deliberately less "real".
