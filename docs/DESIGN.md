# DESIGN — HackDataV2 Synthetic Data Platform

Version 1.0 · 2026-09-29 · UI and generated-document visual spec
Related: [PRD](PRD.md) · [TRD](TRD.md) · [ARCHITECTURE](ARCHITECTURE.md)

## 1. Direction
The product is a workbench for people who need data they can defend. The identity continues the pitch deck's palette (navy, teal, mint), but the app is quieter than the slides: dense, calm, and precise.

**The one memorable element is the proof bar.** It is a slim bar pinned above the preview showing:
- the three Trust verdicts;
- the seed;
- the dataset hash.

It updates with every change, so "you don't have to take it on faith" is visible on every screen. Everything else stays restrained.

Principles:
- **Evidence sits next to output.** Every generated thing has its check beside it: row counts, "Query satisfied", verdicts.
- **One workspace, three modes.** Switching modes never loses configuration.
- **Honest states.** N/A, degraded, and over-limit are first-class states with plain explanations.
- **Data is the hero.** Chrome is thin; the preview gets the most space.

## 2. Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| `ink` | #172239 | Primary text, header bar, ER node headers |
| `teal` | #167A6D | Primary actions, focus ring, links, selected mode (5.2:1 on white) |
| `mint` | #E3F1EF | Selected rows, hover fills, info banners |
| `paper` | #FAFAF8 | App background |
| `sand` | #F3F0E9 | Side panels, document canvas backdrop |
| `slate` | #5B6475 | Secondary text (5.9:1 on white) |
| `line` | #E2E1DC | Borders and grid lines |

Status colors are always paired with an icon and a word, never color alone:

| Token | Hex | Shown as |
|---|---|---|
| `pass` | #1B7F3B | ✓ Pass |
| `warn` | #A15C07 | ! Warn |
| `fail` | #B42318 | ✕ Fail |
| `na` | #6B7280 | – N/A |
| `chaos` | #7A3EB1 | Outline and dotted underline on injected cells |

Light theme only for the MVP. Every text/background pair is ≥ 4.5:1.

### Type
- **IBM Plex Sans** for all UI text. Scale: 12 / 14 (base) / 16 / 20 / 28. Weights 400, 500, 600. Numbers use `font-variant-numeric: tabular-nums`.
- **IBM Plex Mono** (13 px) for data-grid cells, seeds, hashes, and DSL JSON.
- **Space Grotesk** for the product wordmark and the start-screen headline only, for continuity with the deck.

Fonts are self-hosted with `@fontsource`, so there are no external requests. Use sentence case everywhere; no all-caps labels.

### Space, radius, elevation, motion
- Spacing: 4 px base grid; panel padding 16; section gaps 24.
- Radius: 6 for inputs and buttons, 10 for panels and dialogs, none for tables.
- Elevation: only dialogs and the Trust drawer cast a shadow.
- Motion: 150–200 ms for panel open/close and verdict changes. One choreographed moment only: proof-bar verdicts settle left to right after generation. `prefers-reduced-motion` disables it.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Synthetic Data Platform   [Tabular] [Relational] [Documents]   Recipe ▾  │ header (ink)
├───────────────┬──────────────────────────────────────────┬───────────────┤
│ Configure     │ ✓ Correct  ✓ Realistic  ✓ Safe            │ Trust report  │
│ 360 px        │ seed 42   hash 3f9a0c1b2e7d   50,000 rows │ 400 px,       │
│               ├──────────────────────────────────────────┤ collapsible   │
│ Tables        │                                          │               │
│ Columns       │  Preview canvas                          │ Cards and     │
│ Privacy       │  (50-row grid / ER diagram / PDF)        │ expert tables │
│ Edge cases    │                                          │               │
│ Size estimate │                                          │               │
├───────────────┴──────────────────────────────────────────┴───────────────┤
│ Degraded banner (only when AI drafting is offline)                       │
└──────────────────────────────────────────────────────────────────────────┘
```
- ≥ 1280 px: three columns. 768–1279 px: the Trust drawer overlays. < 768 px: read-only preview with a notice.
- Text is left-aligned; numbers are right-aligned in grids.

## 4. Screens

### 4.1 Start (empty state)
Headline: "What data do you need?" Three actions, stacked as full-width rows rather than a card grid:
- **Describe it.** Text box, placeholder "Online store with customers, orders and items, plus GST invoices". Button: "Draft schema".
- **Upload a sample.** CSV or JSON, up to 4 MB. Note: "Your file stays in this browser tab. Only column statistics are sent to the AI."
- **Start from a template.** Retail store, Subscription SaaS, Personal banking.

### 4.2 Tabular
- Left panel: table picker, column list (name, type, generator, null %, privacy), "Add column", row count, seed with a "New seed" button, locale.
- Center: 50-row virtualized grid (TanStack Table). Column headers show the type and a small distribution sparkline.
- With the dirty variant on, injected cells get the chaos outline. Hover explains the injection, e.g. "Injected: outlier (12× p99)".

### 4.3 Relational
- Center: ER diagram (React Flow) with crow's-foot edges and cardinality labels such as "1 → 0..8, Poisson λ = 3". Clicking a table opens its grid in a split below.
- Left panel: relationships with a cardinality editor, and invariants written in readable form, e.g. "orders.total = sum(order_items.qty × unit_price) + tax".

### 4.4 Documents
- Left panel: document type, template, count, locale, payment terms.
- Query bar above the preview. Text field: "e.g. last 90 days, balance over $500". The parsed DSL appears as a mono chip. The result chip reads "Query satisfied ✓ (min balance $512.40 on 14 Aug)".
- Center: PDF preview in a sandboxed iframe, with page thumbnails.
- "Show linked records" highlights the matching customer, order, and statement debit. This is the one-world moment of the demo.
- "Scanned variant" toggle.

### 4.5 Trust drawer
Three cards in fixed order: Correct, Realistic, Safe. Each card has:
- a verdict chip;
- a one-line reason, e.g. "0 orphans; all 1,204 invoice totals reconcile";
- a "Why this matters" tooltip;
- an expandable expert table (metric, value, threshold, verdict).

In schema-only mode the Realistic card reads "N/A — no reference data. Showing spec fidelity and coverage instead." The drawer footer has "Download trust_report.json".

### 4.6 Export dialog
- Format checklist: CSV, JSONL, SQL, SQLite (when available), PDFs, ground truth, chaos manifest, recipe, Trust Report.
- Size estimate, and progress per table (blocks done of total).
- A clean/dirty variant selector when chaos is on.
- Final button: "Download ZIP".

### 4.7 Recipe menu
Save, Load, Duplicate, Share link, Re-plan with AI. Sharing a sample-mode recipe first asks: "This recipe contains statistics learned from your sample. Share anyway?" (ADR-0012)

## 5. Components (built on shadcn/ui)
ModeTabs, ProofBar, ConfigSection, ColumnEditorRow, GeneratorPicker, PrivacyRuleSelect, ChaosPanel, SizeEstimate, PreviewGrid, ChaosCell, ERDiagram, CardinalityEditor, QueryBar, DslChip, PdfPreview, LinkedRecords, TrustCard, MetricTable, ProvenanceBadge ("Drafted by {model} via {provider}, validated"), DegradedBanner, ExportDialog, HashChip, ProblemToast.

## 6. States
| State | Treatment |
|---|---|
| Loading preview | Keep previous rows dimmed to 60 %; spinner in the proof bar |
| Degraded (no LLM) | Banner: "AI drafting is offline. Templates and built-in rules are in use; everything else works." |
| Over limit | Inline under the field: "This plan makes 1.2M rows. The limit is 200,000. Lower the customer count or orders per customer." Generate is disabled |
| Validation error | Field-level message from Zod or problem+json; never a generic toast |
| N/A metric | Gray chip with the reason |
| Fail verdict | Red chip plus "Show failing rows" (up to 20) |

## 7. Microcopy
- Buttons name the action: "Draft schema", "Generate preview", "Export ZIP", "Re-plan with AI".
- Errors say what happened and what to do, e.g. "The table name `orders; DROP` isn't allowed. Use letters, numbers and underscores."
- Differential-privacy wording follows TRD §8.2 exactly.
- Never use: "AI-powered magic", "100 % private", "differentially private dataset".

## 8. Accessibility (WCAG 2.2 AA)
- Every action is keyboard reachable, with a visible 2 px teal focus ring and 2 px offset. The grid supports arrow-key navigation.
- Verdicts use icon + word + color. The proof bar has `aria-live="polite"`.
- Targets are ≥ 24 × 24 px. No drag-only interactions: ER nodes can also be arranged with "Auto layout".
- The ER diagram has a text alternative (a table list with relationships).
- Reduced motion is respected.

## 9. Generated documents
- **Invoice templates:** Classic (ruled table), Modern (sidebar totals), Compact (single column, receipt-like).
- **Statement templates:** Retail bank, Digital bank, Minimal.
- **Every page:** repeated diagonal watermark "SYNTHETIC — NOT A REAL DOCUMENT" (45°, 48 pt, 12 % opacity, #6B7280); footer per TRD §6.5; fictional seller and bank names with monogram logos only; numbers `SYN-INV-…` and `SYN-STM-…`.
- **Font:** Noto Sans subsets (covers ₹, €, $).
- **Locale formats via Babel:**

| Locale | Date | Amount |
|---|---|---|
| en_US | Sep 29, 2026 | $1,234.56 |
| en_IN | 29 Sep 2026 | ₹1,23,456.78 |
| de_DE | 29.09.2026 | 1.234,56 € |

## 10. Demo presets
Three saved recipes load in one click and have pre-warmed (cached) plans:
- **Indian D2C store** — the one-world demo;
- **SaaS subscriptions** — tabular and sample mode;
- **Personal banking** — statements and queries.
