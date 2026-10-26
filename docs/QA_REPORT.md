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
