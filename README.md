# Madlan — Map, Transactions and Scoped Chat

Explore the historical transaction sample on an interactive map, open deal cards, select up to three transactions and ask the AI to investigate or compare that explicit selection. Without selection, chat covers the full dataset. Map/list filters and chat scope are clearly distinguished; numeric chat queries synchronize the displayed filters.

**Location honesty:** the CSV has no coordinates or house numbers. All 520 unique deals are grouped at 18 attributed city points, never jittered into invented property locations. Every record is accessible in cards. This is not a map of available listings or exact building locations. City points come from GeoNames (CC BY); tiles from OpenStreetMap with visible attribution and graceful fallback.

**Try:** click a city marker → open a deal → “שאלו על העסקה”; or select two cards and ask “השווה את המחיר למ״ר והמאפיינים שלהן”. The server enforces selection membership; the model cannot silently broaden it. Comparison preserves missing values and price exclusions and does not choose an authoritative conflicting price.

See [map/scoped-chat architecture, provenance and validation](docs/MAP_EXPLORER.md), the [current guide](docs/CSM_GUIDE.md), [AI log](docs/AI_LOG.md) and [QA report](docs/QA_REPORT.md). Live app: https://madlan-csm-chat.vercel.app/ . Repository: https://github.com/IdanHarari11/madlan-csm-ai-assignment .

This section supersedes the prior product positioning below; underlying data arithmetic, failure handling and deferred Jira scope remain unchanged. `NEXT_PUBLIC_MAP_TILE_URL` optionally changes the tile provider at build time; no additional secret is required. Do not bulk-download tiles. GeoNames attribution and the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/) are documented in MAP_EXPLORER.md.

---

## Inspect calculation evidence

After a numeric answer ask “איזה עסקאות נכללו?” to see the actual included IDs/details immediately. The server reuses the previous verified metric/filters and eligibility rules, preserving exclusions rather than substituting a new count over a broader cohort. Typos and short same-city confirmations are covered by the real-user regression in `evals/results/evidence-live.json`.

## Conversation continuity and streaming progress

Up to 20 turns are saved locally in this browser tab and reconstructed from validated plans after refresh. Prior answers retain their selection/filter labels when scope changes. The server replays up to six same-scope steps and supplies actual verified previous results, rather than trusting numbers from browser storage. The saved data version is checked; raw records are not copied into the session snapshot.

The chat uses SSE to stream actual progress events, then a complete verified result or sanitized error. It does not stream unvalidated partial numbers or simulate token-by-token typing. Client cancellation reaches the server and provider signal; the hard deadline still bounds an uncooperative transport. No external memory service, conversation database or Jira work was added. Visual browser verification remains blocked by the saved permission/managed policy.

## Prior investigation implementation and setup

# Madlan — Customer Data Investigation

A public Hebrew/RTL chat for a Customer Success Manager investigating “this number looks wrong.” Give it a transaction ID or a reproducible metric question. It inspects the supplied CSV, shows source records and calculations, and provides a proposed customer reply and an internal investigation summary.

- **Live app:** https://madlan-csm-chat.vercel.app/
- **Repository:** https://github.com/IdanHarari11/madlan-csm-ai-assignment
- **One-page CSM guide:** [Hebrew guide](docs/CSM_GUIDE.md) · [live guide](https://madlan-csm-chat.vercel.app/guide)
- **AI working log:** [AI_LOG.md](docs/AI_LOG.md)
- **Validation and limits:** [QA_REPORT.md](docs/QA_REPORT.md)
- **English demo:** [DEMO.md](docs/DEMO.md)

This is an independent assignment prototype, not an official Madlan product or a connection to Madlan production. The CSM workflow is a product hypothesis inferred from the role, not a claim based on customer interviews.

## Try one investigation

Ask: **לקוח מדווח שהמחיר בעסקה D100017 לא נכון. מה אפשר לבדוק?**

The source has two prices, 1,919,000 and 1,851,548 NIS, under the same ID (CSV rows 11 and 475). The app preserves both, avoids selecting an authoritative value, explains the price-calculation exclusion, and proposes a bounded customer reply. Expand the raw records and copy the internal summary. Nothing is automatically corrected, emailed or submitted to Jira.

Then ask: **מה חציון המחיר למ״ר בדירות 4 חדרים בחולון?** The expected sample result is approximately **38,260 NIS/sqm**, based on IDs D100027, D100074 and D100211, with a small-sample warning. A bare “this number is wrong” prompts clarification.

## Why this product

A CSM needs to distinguish a different metric definition from missing or conflicting source data before promising a fix or escalating to engineering. The product closes one useful loop: customer question → source investigation → understandable answer and reproducible handoff. The CSV supports that loop; it cannot establish root cause, production state, customer impact or property valuation.

The LLM does substantive work: interpreting Hebrew/English intent, supported constraints, follow-ups and ambiguity into a strict tool plan. Code retrieves the records and performs every calculation. Customer-facing explanations are deliberately assembled from tool findings, rather than adding a second unconstrained model writer. Drafts require human review before use.

## Data and assumptions

`data/deals.csv` is the unchanged supplied file: 530 rows, 520 unique transaction IDs. `data/deals.json` is lossless parsed CSV. Fields include location, property characteristics, amenities, date, price, reported price per sqm and source. No embeddings, external enrichment or vector database is needed to search this complete small table.

Duplicate IDs count once. Materially conflicting variants are preserved and excluded from price metrics; no source is declared authoritative. Missing/invalid inputs, future dates and suspicious price/area values are excluded under explicit policies. A month-only date matches only when the whole month lies in the requested interval. Computed price per sqm is price/area; the mean is a mean of ratios, not area-weighted. A flag is a reason to investigate, not proof of an erroneous record. See [DECISIONS.md](docs/DECISIONS.md).

Supported filters: city, neighborhood, property type, rooms, date, parking, elevator and safe room. Price thresholds, floor, balcony, year built and street filters are not implemented. Raw field availability does not imply a filtering capability. Unsupported constraints must not silently disappear.

## Run and verify

Use Node 22.x and the pinned pnpm version. Follow [VERCEL_SETUP.md](docs/VERCEL_SETUP.md) for dedicated PostgreSQL and Neon Auth configuration. Store secrets only in ignored local environment files or hosting secrets.

```sh
npm run install:ci
pnpm typecheck
pnpm test
pnpm test:db
pnpm eval
pnpm eval:chat
pnpm build
pnpm dev
```

Without configured AI credentials, free-text questions receive an explicit configuration error; only the labeled example buttons can invoke direct tools. Do not describe direct-mode examples as live AI.

Run live evals with your ignored environment file (never commit keys):

```sh
EVAL_REPORT_PATH=evals/results/my-regression.json node --env-file=.dev.vars --import tsx evals/chat-audit.ts --live
EVAL_REPEATS=3 EVAL_REPORT_PATH=evals/results/my-customer.json node --env-file=.dev.vars --import tsx evals/chat-audit.ts --live --customer
```

The Python CSV oracle independently checks numeric values, cohorts and exact evidence/exclusions. Model eval expectations never enter the planner input. Reports retain model and code hashes, failed intermediate runs and grading-policy changes. No finite eval corpus proves universal correctness.

## Architecture

- `lib/ai.ts`, `lib/contracts.ts`: strict model plan, capability boundary, bounded latency and typed errors; zero automatic retries.
- `lib/domain.ts`: normalization, duplicates, filtering, quality checks and arithmetic.
- `lib/investigation.ts`, `lib/customer-case.ts`: deterministic tool dispatch, evidence-based case assessment and proposed replies.
- `app/desk.tsx`, `app/components/`: single RTL conversation, expandable sources, copyable draft and internal handoff.
- `tests/`, `evals/`: unit/service/rendering tests, CSV oracle, live planner/customer scenarios and SQL concurrency tests.
- `lib/postgres-store.ts`, `postgres/`: active persistence, authorization, quotas and atomic write safeguards for the deferred authenticated extension.

Hosting uses Next.js on Vercel, a dedicated Neon Postgres database, and pinned `gpt-4.1-2025-04-14`. Production deployment gates migration, isolated-schema PostgreSQL tests and the build. CI also runs the independent CSV audit. Logs record trace IDs, model, latency and token counts, without logging the API key.

## Deliberate scope cuts

No production/customer data integration, source correction, valuation, forecasting, causal diagnosis or automatic outbound messages. Jira is a deferred user-requested extension, not an original assignment requirement; it stays disabled and its unavailable actions are hidden from the public workflow. No Paperclip. Legacy Sites/D1 and protected Jira adapter code remain for continuity; the active deployment is Vercel/Postgres.

Saved browser permissions have blocked visual end-to-end verification; server rendering tests are not a substitute. Actual browser QA status and any remaining limits are recorded in QA_REPORT.md. Positive OTP sign-in and real Jira creation are outside the submitted public investigation workflow and are not claimed verified.
