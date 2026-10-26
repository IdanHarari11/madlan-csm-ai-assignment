# Evidence follow-up repair — current release

A real pasted user conversation exposed a missed follow-up: `איזהנעסקאות?` immediately after a median should show its records instead of asking for city/type again. The repair adds an evidence-inspection intent and server resolution to the latest same-scope calculation. It preserves metric, filters and eligibility; it does not silently become a broader count query. The UI lists IDs and transaction details immediately and exposes original exclusions.

- Code/service/rendering/session/stream/evidence regressions: 147/147 passed.
- Exact six-turn user conversation: 12/12 live checks (two repetitions), with independent CSV values/counts/evidence IDs. Report: `evals/results/evidence-live.json`.
- Global planner regression: 36/36; selected-scope regression: 24/24; prior conversation transitions: 16/16 on the current source.
- The independent 155-case numeric/evidence oracle passed in the global audit.
- Tests explicitly distinguish the original price-eligible evidence from all matching records, reject silently changed filters, preserve anchors across clarification, stop stale anchors after unrelated tools, restore evidence without its original turn, and check singular count wording.

The report keeps proposed and server-canonical plans, prompt/source hashes and actual evidence IDs. Live corpus expectations never enter model input. A finite conversation suite does not prove all typos or follow-ups work. Visual/browser verification remains blocked by the saved browser permission/managed policy; SSR evidence-table rendering is not browser QA. Deployment, hosted Postgres/style verification and CI results for the exact published commit are stored in the delivery artifact. Jira was not enabled.

---

## Earlier release evidence

# Conversation continuity and SSE progress — current release

The current scope adds bounded structured memory, restoration after refresh, scope-stamped prior answers, streaming progress and provider cancellation. Jira remains disabled and no new integration or external conversation store was introduced.

| Check | Result | Evidence |
| --- | --- | --- |
| Unit/service/contract/rendering/stream/session tests | 141/141 | `pnpm test`, including `tests/conversation-stream.test.ts` |
| Independent CSV values, cohorts and evidence | 155/155 | `evals/results/chat-source-audit.json` |
| Live follow-up context transitions | 16/16 (8 cases × 2) | `evals/results/conversation-live.json` |
| Current global regression | 36/36 | `evals/results/conversation-global-regression.json` |
| Current selection regression | 24/24 (12 cases × 2) | `evals/results/map-scope.json` |

The new tests cover scope branches, replayed numeric values rather than client claims, source-free session serialization, refresh reconstruction, malformed/obsolete sessions, history/body byte limits, SSE progress before completion, fragmented UTF-8/CRLF, sanitized terminal errors, truncated streams, retained traces and cancellation through stream/SDK/provider signals. A source-only TypeScript issue in a new eval helper was caught by the build and corrected before publication. Finite model corpora do not prove all conversations are correct.

SSE carries actual workflow events followed by one complete verified result. It is not token-by-token explanatory text and never publishes partial model arithmetic. Local sessions retain up to 20 turns; at most six same-scope plans/questions form model memory, reduced if needed to fit the request byte budget. The server replays these plans and computes verified result summaries. Refresh re-executes saved plans from current data and labels the current as-of date; raw rows and client-provided numbers are not trusted persistent facts. An obsolete data version resets restoration.

No browser/device verification is claimed: the saved permission/managed policy still blocks the supported browser tool. API streaming/cancellation behavior is verified with real Web Streams and mocked provider transports; the live model runs exercise actual planning with reconstructed context. They do not establish real-device UI or a deployed-network streaming measurement. Hosted build, Postgres/style gates and CI results for the exact shipped commit are recorded in the delivery artifact.

---

## Earlier release evidence

# Map explorer release — current scope

The primary interface is now a map/card explorer with a selection-bound chat. Earlier complaint-led release sections below are historical. See MAP_EXPLORER.md for exact behavior, geographic precision and provider attribution.

- 124 code/service/contract/rendering tests passed locally. New tests cover all 18 city points, invalid selections, selected-only aggregates, cross-scope model IDs, conflict exclusions and comparison-filter handling.
- 155 independent CSV value/cohort/evidence checks passed. The original CSV is unchanged.
- Scoped live model corpus: **24/24 passed** (12 cases, two repeats); current scores and source hashes are in `evals/results/map-scope.json`. The earlier passing pre-filter-guard report and a 22/24 aggregate-classification failure are retained separately. The latter confused an average with side-by-side comparison; the prompt repair was evaluated again on the frozen current source.
- Current global planner regression passed 36/36 and natural-language browsing passed 4/4; reports are `map-global-regression.json` and `map-browse.json`.
- TypeScript and production build passed; hosting also runs Postgres checks and CI runs the source oracle. Exact deployment results are in the delivery artifact outside the source tree.
- Geographic points are city-level GeoNames records, not geocoded property addresses. No precise positioning or per-deal geographic accuracy is claimed.
- Saved browser permission/managed policy still blocks interactive/visual QA. SSR tests and build success are not browser verification. Modal focus and clipboard behavior are implemented but not interactively verified.

---

## Earlier release evidence

# Submission release — customer investigation

This is the current release record; earlier audit sections below are historical.

**Primary public workflow:** complaint or deal ID → source records and arithmetic → assessment and next step → copyable proposed customer reply and internal handoff. Public investigation requires no login. Jira is deferred, disabled and hidden from this workflow. No email or ticket is sent.

| Gate | Observed result | Evidence |
| --- | --- | --- |
| Code/service/contract/rendering tests | 117/117 | `pnpm test`, including `tests/customer-case.test.ts` |
| Independent CSV values and evidence | 155/155 | `evals/results/chat-source-audit.json` |
| Current customer workflow live eval | 36/36 (12 cases, three repetitions) | `evals/results/submission-customer-final.json` |
| Current expanded chat live regression | 36/36 | `evals/results/submission-regression-final.json` |
| Prior deterministic harness | 107/107; not live calls | `evals/results/deterministic.json` |
| Legacy SQLite concurrency guards | 11/11 | `pnpm test:db` |
| TypeScript and production build | Passed locally | Deployment separately gates migration and isolated-schema hosted Postgres verification |

The current reports pin the model and hash the prompt and relevant source files. They supersede older live scores when discussing this release. The earlier 12-case holdout was genuinely new at the time of its initial run; it does not establish held-out coverage of every subsequent prompt change. Customer workflow cases are a regression corpus, not held out. A failed 33/36 customer baseline is retained: financial-loss questions with a deal ID were incorrectly routed to deal inspection. Capability refusal now takes precedence over ID routing.

The proposed customer text is generated deterministically from tool facts and reviewed by the CSM. Conflict, missing-area, future-date and suspicious-data cases cannot produce an authoritative per-sqm value. Tests verify the real conflict's source rows and raw prices, unknown-ID behavior, lossless evidence and the actual rendered findings/reply. A normal arithmetic result does not claim validation against the customer's screen. Clipboard failure has a manual-copy message, but actual clipboard behavior has not been browser-verified.

**Browser gate remains blocked:** after the user stated they changed permission to Allow, the supported browser tool was retried once and rejected the origin again due to a saved permission or managed policy. No workaround was used. Desktop/mobile appearance, keyboard interaction, clipboard and actual browser navigation cannot be claimed verified. This is a material remaining validation limitation. It does not prevent code/tests/publication or delivery of the source, guide, AI log and demo materials.

**Deferred extension:** positive OTP sign-in, real Jira creation and anonymous Jira links are unverified and outside the submitted public workflow. The older task-content eval leaked expected labels and is not independent semantic proof. These features must be revalidated before enabling the extension. No claim of universal correctness or original five-hour completion is made.

Deployment/CI identifiers for the exact shipped revision are recorded in the external submission delivery artifact, avoiding a self-referential commit hash in this source file.

---

## Previous chat audit

# Current chat audit — 2026-10-26

This section supersedes historical readiness statements below. User direction: validate the chat first; Jira is deferred and remains disabled. Paperclip is out of scope.

| Check | Actual result | Evidence |
| --- | --- | --- |
| CSV provenance | 530 source rows, 520 unique IDs; JSON is lossless | `chat-source-audit.json`, CSV SHA256 `cfe4a245e08a1bda6daf53a0e16c8f745c4b2e154713ce63fee8bca8ab9aac88` |
| Independent numeric/evidence audit | 155/155 | Python stdlib reads raw CSV independently; five metrics across 31 cohorts; compares values, counts, exact included/excluded IDs and partial dates |
| Expanded live regression | 108/108 (36 cases × 3) | `evals/results/chat-final.json`; pinned `gpt-4.1-2025-04-14`, prompt/code hashes |
| New held-out questions | 12/12, one run | `evals/results/chat-holdout.json`; authored after prompt freeze, expectations never enter model input |
| Code, contracts, services, failure behavior, answer rendering | 109/109 | `pnpm test` |
| Legacy SQL guards | 11/11 | `pnpm test:db`; SQLite, not a substitute for hosted PostgreSQL |
| Earlier deterministic harness | 107/107 | Contains 60 numeric checks and 36 grader self-checks; not live calls |
| TypeScript and Next.js build | Passed | Local final source checks; hosted build independently gates migration/Postgres verification |

The new live audit executes the actual planner and deterministic investigation pipeline. Numeric and quality results are compared to a separate CSV oracle, including evidence membership. It is not a visual/browser end-to-end test, a human review of every possible answer, or a proof of universal correctness. Expanded regression cases were used for prompt tuning. The separate 12-case holdout was not used for tuning.

**Repairs:** scoped quality analysis, complete flagged evidence, visible quality filters and cohort size, partial-month disclosure, shared production/eval capability catalogue, unsupported-filter refusal guidance, contradictory-scope clarification, and an explicit caller deadline even for an abort-ignoring transport. Three quality regressions failed before the fix. No automatic model retry was added.

**Grading corrections:** the contradictory-city case now expects clarification; this changes one baseline expectation and is documented in AI_LOG.md. The old planner grader rejected literal `מודיעין`, although the tool normalizes it to the same cohort as `מודיעין מכבים רעות`. Its original 35/36 report is retained as `chat-legacy-before-alias-grading.json`. The grader now accepts supported city aliases, with a regression checking identical executed values/evidence and rejection of `מודיעין עילית`.

**Assignment fit:** public Hebrew RTL chat, genuine LLM intent/filter interpretation, deterministic table retrieval/arithmetic, source disclosure and honest unsupported/failure messages. The CSM guide and AI log are included. No vector database is needed for a complete 530-row structured dataset. Filters and assumptions remain visible for CSM review.

**Remaining limits:** public-site browser QA is blocked by the saved browser permission, so SSR rendering tests are not called browser QA. A real verified-email positive sign-in flow is not tested. Jira is disabled; no real issue, anonymous issue link, or final Jira workflow is claimed. Earlier task-content evaluation leaked expected labels into input and does not independently validate semantics; it requires replacement before enabling Jira. Hosted PostgreSQL gates were previously repaired and passed; every new deployment reruns them. Current deployment and CI confirmation are reported in the delivery status artifact.

---

# Historical QA evidence (retained for audit)

# QA evidence — 2026-10-25

## Verified

| Layer | Result | Evidence |
|---|---|---|
| TypeScript | Passed | `pnpm typecheck` |
| Unit, service, contracts and mocked-provider failures | 100 passed, 0 failed | `pnpm test` |
| Real SQL | 11 passed, 0 failed | `pnpm test:db`; exact shipped SQL on SQLite |
| Deterministic evaluation harness | 107 passed, 0 failed | `evals/results/deterministic.json` |
| Numerical oracle subset | 60 independent CSV cohort/metric checks | `evals/golden.json`, `evals/reference.py` |
| Build | Passed before final packaging; final source built again for publication | Vinext production build |
| Browser | Desktop RTL, stats, filtering, conflicting record provenance, explicit model-unconfigured error and write-auth boundary inspected | Actual local preview through supported browser |

The 107 harness checks include 36 grader self-checks; they are NOT 107 live model prompts. The 100 test suite includes actual AI SDK calls against mock HTTP transports, not a live provider. The SQL test opens 40 concurrent connections and confirms the global cap permits exactly 25 reservations. A separate service test submits one draft 20 times in parallel and observes one external create through a simulated Jira port.

## Concrete browser observation

For Holon, apartment, exactly 4 rooms, median computed ppsm: 3 included records, 0 exclusions, 38,260 NIS/sqm (rounded display). Evidence IDs: D100027, D100074, D100211. A small-sample warning is part of the final UI. The raw detail dialog for D100017 shows source rows 11 and 475 with prices 1,919,000 and 1,851,548. No authoritative price or computed ppsm is displayed for this conflict. Attempting to prepare a task anonymously shows the CSM sign-in boundary.

## Not verified / blocked

- Live model planner evals: **not run**, no configured model/API key. `eval:live` exits 2 with an explicit blocked message.
- Live model task evals: corpus and runner implemented; **not run** without credentials. Human semantic review is required even after structured checks pass.
- Real Jira account/project, credential permissions, issue-type requirements, real issue creation and reconciliation: **not connected or exercised**. The adapter and error paths are tested with mocks; that is not a substitute for integration QA.
- Public GitHub repository: `IdanHarari11/madlan-csm-ai-assignment` was created through the user’s local browser. Source upload via the GitHub connector was rejected with HTTP 403 (Resource not accessible by integration), including an attempt excluding workflow files. It currently contains only its initial README, not the project source. A source ZIP and the deployed Site source remain available; write access must be resolved before claiming GitHub delivery is complete.
- Mobile browser/device and assistive-technology audit: responsive CSS implemented; desktop browser exercised, no physical-device verification.
- A direct HTTP script could not reach the preview daemon from the executor network. No successful HTTP-suite result is claimed. Browser interactions reached the actual app APIs; API contract/error helpers are tested separately.

## Readiness judgment

The deterministic product core is reviewable and tested. The project is **not yet ready for final interview submission** because the brief requires a real LLM doing useful work and the agreed scope includes live Jira. Connect the model and dedicated Jira, run the live gates, review failures and update this report with actual evidence. No finite suite can establish readiness for every conceivable input.

## Chat-only interface revision — verified separately

The dashboard was replaced by a single conversation. The current source retains 100 passing code/service tests, 11 real-SQL tests and 107 deterministic harness checks. The general live-model and real-Jira gates above remain blocked; a visual redesign does not clear them.

Desktop browser verification on the updated preview:

- Welcome screen contains the conversation input and three sample questions; no sidebar, statistics grid or persistent filter panel.
- An explicit direct-tool example produces the real Holon result (38,260 NIS/sqm, 3 records), labeled “without AI”, as an assistant turn. Evidence is collapsed until requested.
- Expanding evidence shows the exact filters and source IDs; selecting a source and preparing a task renders the CSM authorization boundary inline.
- Reload restores the completed turn and the selected task context from sessionStorage.
- A subsequent free-text question with no configured model produces a separate honest error with a trace ID, while the prior answer remains attached to its original question.
- Browser testing caught and corrected unsupported `crypto.randomUUID()` usage on the HTTP preview origin. Client message IDs use a local sequence; server operation IDs and safeguards were not changed.

A physical mobile device and a live authenticated task-generation flow have not yet been exercised. Responsive CSS and the guided task component are implemented; do not describe that as completed live integration QA.


## Codex continuation — 2026-10-25 (current local evidence)

This section supersedes the earlier local-model blocked status; hosted and Jira gates remain separate.

- Local API key creation and a genuine Responses API request succeeded. Secret stored only in ignored `.dev.vars`.
- Pinned `gpt-4.1-2025-04-14`: 108/108 live planner checks (36 cases × 3), zero critical failures, gate passed. Report: `evals/results/live.json`.
- Live task proposals: 10/10 structure/category/evidence checks. Report: `evals/results/tasks-live.json`. Agent inspection found no invented evidence IDs or customer-impact figures in the final proposals. This is not independent human review. Wording and proposed scope still need CSM review before Jira approval.
- Baseline mini-model reports retained for honest comparison: 82/108 planner, 13 critical failures, plus semantically unsafe task proposals despite 10/10 structural checks.
- Re-ran typecheck, 100 code/service tests, 11 SQL tests and 107 deterministic eval checks successfully. The final prompt revision passed a fresh portable production build.
- Both local D1 migrations applied. Local development server started with the configured model. Initial page HTTP response was 200 before browser approval was requested.
- Current browser QA was **not performed**: browser access approvals were declined for both the existing ChatGPT page and local preview. Previous browser evidence remains historical.
- Hosted runtime still has only the prior CSM/Jira configuration; no hosted OpenAI secret was configured in this continuation. No new production deployment is claimed.
- Jira service credentials and issue type are not yet verified; no issue was created. Keep `JIRA_ENABLED=false`.
- GitHub source delivery succeeded at commit `5d8f0015fee1e35d690e2a3bdf4648beb95783e9`. The full Linux GitHub Actions workflow passed: https://github.com/IdanHarari11/madlan-csm-ai-assignment/actions/runs/40224274936 (installation, typecheck, all deterministic checks and production build).

The project is not ready for final submission until hosted AI, dedicated Jira, independent task-content review and the authenticated end-to-end workflow are verified.


## Vercel migration — 2026-10-26

The active deployment is now https://madlan-csm-chat.vercel.app/ on native Next.js, dedicated Neon PostgreSQL and Neon Auth. This supersedes the previous hosted-model blocked status for Vercel; the old Sites publication was not changed.

- Vercel production build and database migration succeeded.
- The active PostgreSQL adapter passed 6 integration scenarios plus their parent test (7/7). Tests use a unique temporary schema and real pooled connections. Forty parallel owners received exactly 25 global reservations; twenty duplicate reservations produced one winner; budget races allowed exactly 30. Owner/revision checks, edit-after-reservation, unknown states and quotas for failed attempts passed.
- Local migration checks: typecheck, 100 code/service tests, 11 historical SQLite tests and 107 deterministic eval checks passed. SQLite is reference coverage, not the active persistence layer.
- Production `/api/status` returned 200 with `modelReady=true`, `jiraReady=false`, `user=null`, `canCreate=false`.
- An actual public AI request for four-room apartments in Holon returned 38,260 NIS/sqm with the three expected evidence IDs. A rental-yield request was rejected as unsupported and invoked no data tools.
- An issue-creation request with forged Sites user headers returned 401 AUTH_REQUIRED. A cross-origin chat request returned 403 ORIGIN_DENIED.
- Home, login page and the Neon Auth session endpoint responded successfully; anonymous session was null. No login email was sent by the agent. Completing verified-email sign-in and exercising an authenticated draft requires the user's emailed code and remains unverified.
- Browser UI QA was not performed: browser permission for the Vercel origin was declined. HTTP and API evidence above was collected before that denial; no browser workaround was attempted.
- OpenAI, database and session secrets are configured as sensitive Vercel values for production and preview. Dedicated Jira credentials and issue type remain missing; JIRA_ENABLED=false and no real issue was created.


### Repeat-run failure caught and repaired

The initial database test run passed but did not prove fixture isolation. A repeat deployment correctly failed: the original test's connection-level search-path assumption let synthetic fixtures use public tables. The release gate prevented promotion of that candidate. The adapter now qualifies every table with its schema, tests apply and verify DDL search path inside a transaction, and migration/test commands use `DATABASE_URL_UNPOOLED`. Database trigger functions are explicitly bound to their own schema. A narrow repair SQL file removes only the exact synthetic fixture payload/fingerprint patterns and the fixed test-only budget key; production DraftPayloads and SHA-256 fingerprints cannot match these patterns.

The repaired production deployment passed all 7 Postgres tests (6 scenarios plus parent), with no failures. A subsequent GitHub deployment reruns them to check repeatability. This is recorded as a genuine migration error and correction, not hidden by the earlier green run.
