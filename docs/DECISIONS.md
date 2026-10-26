# Current decision — map with scoped conversation

The user's chosen product is now an explorer: map and cards supply context, an explicit selection bounds chat, and deterministic tools compare or aggregate historical transactions. It supersedes the complaint-led primary workflow below. Exact property positions cannot be inferred from this CSV, so all records are grouped at sourced city points with explicit precision labels. No invented marker jitter, live geocoder, new credential or paid service was introduced. See MAP_EXPLORER.md for the complete scope and provenance.

---

## Prior product decisions (historical)

# Submission product decision

The primary user is a CSM investigating a reported discrepancy. The shipped public path is question/deal ID → source inspection and calculation → bounded finding → reviewed customer reply and reproducible internal handoff. The workflow is a hypothesis derived from the role, not validated customer research.

The LLM translates natural language into constrained tool plans. Customer response wording is a deterministic proposal based on the tool findings. This intentionally trades stylistic flexibility for traceability: a second model cannot add root causes, promises or invented values. A conflict never yields an authoritative value, and a clean arithmetic result does not verify the customer's production screen. Unsupported capabilities take precedence over the presence of a transaction ID.

Jira is disabled and hidden from the public workflow. It is a deferred extension, not an original assignment acceptance criterion. No outbound message or ticket creation is required to complete an investigation. Paperclip, production integration, valuation, source correction and causal diagnosis remain out of scope.

---

## Earlier implementation decisions (retained)

# Decisions and assumptions

## Product

One workflow: CSM question → bounded data investigation → visible evidence → editable issue proposal → permitted human approval → dedicated Jira project. Jira is optional for read-only use. No Paperclip, code execution, production application access, autonomous changes, valuation or market forecast. A CSV anomaly is not proof of a software defect. Missing customer impact is not invented.

## Data

The original CSV is committed unchanged. JSON is generated with Python's CSV reader. Source row numbers start at 2 to include the header. The dataset has 530 rows, 520 unique IDs and 18 canonical city labels. Six repeated-ID groups are equivalent; four conflict (`D100017`, `D100032`, `D100124`, `D100303`). No source is given authoritative precedence. All raw variants remain visible. City aliases, whitespace, room suffixes and recognized boolean tokens normalize explicitly; unknown booleans remain null.

Dates: ISO, Israeli DD/MM/YYYY and DD.MM.YYYY, or English abbreviated month/year. Impossible calendar dates are rejected. Month precision is preserved: a record is included in a date range only if its whole month is contained. `asOf` is an explicit input to the domain; runtime uses Asia/Jerusalem. Future transactions are excluded from price metrics, not silently erased from counts. Missing neighborhood/year/condition does not automatically invalidate price.

Positive price is needed for price metrics; positive area is additionally needed for price-per-sqm. Reported ppsm is never used in arithmetic. A discrepancy greater than max(1 NIS, 1%) raises a flag. The default calculation excludes conflicting IDs, future dates, area outside 15–1000 sqm, or computed ppsm outside 2,000–200,000 NIS. These are documented conservative investigation thresholds, NOT learned market facts. Excluded records and reasons are visible; original rows are never rewritten.

Count means unique IDs matching filters, including flagged IDs. Price statistics use eligible IDs. Mean ppsm is the arithmetic mean of per-deal price/area ratios, not area-weighted. Small samples (<5) carry a warning. No confidence interval is manufactured from this convenience sample. The first normalized row is used for non-price display of conflicting IDs; every variant is visible. If future source versions have conflicting locations or other filter fields, cohort membership itself needs conflict-aware redesign; do not use the representative row as an authoritative correction.

## AI and grounding

Two bounded structured-output calls, not an unconstrained agent loop. The planner has a closed operation set: find/filter+aggregate, detail, quality, clarify, unsupported. The dispatcher invokes separate deterministic functions. There is no model-generated SQL, model arithmetic or model-authored factual summary. Rejected plans execute no tools. The model may still select a wrong valid filter or metric; visible plan disclosure, evals and human inspection address that residual risk. Prompt instructions alone are not an authorization boundary.

Task proposals use a separate schema. Actual evidence IDs must exist and stay within the supplied set. A data/bug proposal requires evidence. Facts are appended by the server; proposed description, expected behavior and acceptance criteria remain labeled as suggestions. No model assigns priority or creates Jira issues. CSM edits are validated and saved before confirmation is submitted. Immutable raw evidence and the original request remain attached.

## Priority policy v1

Severity describes reported impact. Urgency describes time sensitivity. Priority is a deterministic recommendation, not an SLA commitment. Unknown impact, or missing production/customer/workaround context for incidents, yields TRIAGE. P1: reported active production impact on at least one customer, no workaround, incorrect-data or blocked-action impact. P2: other reported active production impact, or a reported deadline in the next two days. P3: other known low-impact/enhancement cases. A past deadline does not automatically prove an emergency. There is no unsubstantiated P0 and no priority-based bypass of quotas.

## Abuse and write safety

Public read-only investigation; dispatch-owned ChatGPT identity and an explicit server-side CSM email allowlist for all drafts/edits/creation. Missing configuration fails closed. Never accept role/email/priority from request JSON. Same-origin mutation checks, bounded request sizes, strict schemas and private runtime secrets. Jira hostname must be HTTPS on the configured Atlassian Cloud tenant; no user-defined remote URL or redirects. Token permissions must be restricted to the dedicated project.

D1 inserts reserve a creation attempt BEFORE contacting Jira. Uniqueness on draft ID and a conservative fingerprint prevents concurrent duplicate POSTs. Fingerprint = dataset version + category + sorted evidence IDs; no-evidence feature requests use normalized source request. This intentionally favors blocking duplicates and may group distinct reports about the same records; the CSM uses the existing ticket. Cross-record semantic suggestions are fetched from Jira, not treated as proven duplicates. Candidates block creation pending human review; no automatic merge.

SQL triggers atomically enforce 3 attempts/minute and 10/rolling 24h per CSM, 25/rolling 24h globally. Failed attempts count to avoid retries spamming Jira. Drafts expire after one hour. Edits are atomic and blocked after reservation. Each edit increments the draft revision; the confirmation API and SQL trigger bind submission to that exact reviewed revision, even when the duplicate fingerprint is unchanged. Search failure stops creation. Uncertain POST response (timeout, 5xx, invalid success, DB outage after send) is quarantined; no automatic retry. Reconciliation is intentionally manual for this MVP: look up `madlan-op-<operation UUID>` / `madlan-fp-<hash>` in Jira and repair through an authenticated operator procedure. A crashed pending reservation is also not blindly retried.

AI call budgets are persistent and atomic: 150 global/day, 30/actor/day and 5/actor/minute; failed calls count. Anonymous identity is a hash of platform-injected IP (shared fallback), not a new browser session. This is a cost ceiling, not a complete anti-bot system; IP rotation can exhaust the global budget. Production scale would add edge rate limits, tenant budgets and monitoring.

## Debugging and privacy

All API errors carry stable codes and a trace ID. Server logs include timing, outcome code and model token counts without raw provider errors, secrets or full prompts. Audit rows record actor/action/reference; drafts contain the original request and proposed content. Do not paste personal or confidential customer details into the public demo. Retention maintenance removes expired draft/budget batches; operation history is retained for deduplication and requires a future retention/reconciliation policy if used beyond this evaluation.

## Deliberate cuts

No vector database, Redis, autonomous code changes, arbitrary multi-metric comparisons, external property enrichment, billing, full incident lifecycle, background retries, customizable SLA engine or automated Jira reconciliation. These add dependencies and failure modes without improving the core five-hour demonstration. The chosen hosting is Sites/Vinext/Cloudflare Workers+D1, not a Vercel deployment; the source includes a normal app and explicit setup instructions. Migration to Vercel requires replacing the D1/identity adapters, not simply pointing Vercel at this checkout.

## Chat interface revision

The primary surface is now a single Hebrew conversation, without a dashboard, sidebar, persistent statistics or filter form. Each question keeps its own answer or failure, preventing stale results from being mistaken for a newer answer. Computation details and raw records are disclosed on demand. Task preparation is an inline, sequential flow: request, reported impact, production/customer/workaround context when relevant, deadline, then editable draft and explicit approval. A small recent transcript and selected task context live in sessionStorage for sign-in continuity; no credential, role or authoritative draft is stored there. Chat can be canceled without presenting partial text as a verified result.

When no model is configured, only the three explicit sample buttons can run predefined deterministic tools; arbitrary free text still gets an honest model-unavailable response. This is not a fake natural-language AI fallback. All general query interpretation still requires the real model. The deterministic API remains independently testable, but no permanent filter panel is exposed in the product.


## Vercel migration, explicitly requested 2026-10-26

The user requested Vercel hosting and its environment configuration. Native Next.js now replaces Vinext for the active build, and an isolated Neon Postgres resource on the already-installed Free integration replaces D1. The core query tools, priority rules and Jira service boundary are unchanged. Postgres reservations acquire a transaction advisory lock in a database trigger before checking quotas, ownership, expiry and reviewed revision. Editing acquires the same advisory lock, preventing races with reservation. Real concurrent integration tests run before each Vercel build in a disposable test schema. The prior SQLite/D1 implementation is retained only as historical/reference coverage.

Managed Neon Auth verifies user email and sessions. A server allowlist remains a separate authorization gate. No role, user ID or email supplied in request JSON or former Sites headers is accepted. Production is public for investigation; preview is Vercel-protected. The existing Sites publication and unrelated projects are untouched.
