# AI assistance log

Date: 2026-10-25. Assistant: ChatGPT/Codex. This log records work that actually occurred; no simulated live-provider results are presented as real.

## Product decisions

The initial conversation explored a CSM chat that could hand work to Jira and autonomous development agents. The agreed scope removes autonomous implementation: investigate a supplied CSV, show evidence, propose a structured issue and priority, and require a permitted CSM's explicit confirmation before Jira creation.

AI assisted with product scope, profiling, implementation, test design, documentation and review. The supplied brief remains authoritative. A compact, bounded planner was chosen over a general-purpose agent or vector search: the model selects a supported operation and typed filters; deterministic code does all arithmetic and renders the factual answer. A second structured call prepares an editable task proposal. No model receives a tool for writing to Jira.

## A bad AI output that was caught

The assistant-generated first UI/API implementation assumed that `response.json()` was already a typed application response and that a schema default made request history non-optional at every type boundary. The actual typecheck rejected both assumptions. The code was corrected to type the parsed response and explicitly handle omitted history. The failure is useful evidence of why generated code must be checked rather than accepted because it looks plausible.

A more consequential design risk identified during profiling: treating all repeated IDs as harmless duplicates would have silently selected a price for four conflicting transactions. Inspecting raw source variants showed differing prices and sources. The implementation preserves all originals, reports the conflict and excludes these IDs from price metrics. Independent reference values and row-permutation checks guard this policy. This is a caught unsafe assumption, not a claim that a live model generated a particular false price.

## Verification choices

- Synthetic edge cases and real-data assertions test parsing, arithmetic and provenance.
- An independent Python CSV implementation produces checked-in numerical golden values.
- Tests execute the actual shipped SQL on SQLite, including concurrent connections, atomic quotas and uniqueness.
- Provider HTTP transports are mocked for outage/timeout/invalid-result checks; Jira tests simulate success, rejection, similarity, replay and uncertain POST outcomes.
- A hand-authored live-model corpus tests Hebrew intent, exact cohorts, follow-ups, unsupported claims and injection. Grading is deterministic, with a separate critical-safety gate.
- Live model and live Jira credentials were not supplied during initial implementation. Mock tests, grader self-tests and deterministic evals are explicitly separated from live evaluations.

## What remains a human decision

The CSM validates the selected population, reported customer impact, proposed requirement and issue text before submission. The candidate must be able to explain the policies and limitations; automated tests cannot prove that every possible natural-language request is interpreted correctly.

## Review correction: confirmation race

During the final review the assistant found that a draft's duplicate fingerprint was insufficient to identify the exact text a CSM had reviewed: editing a description could leave the evidence fingerprint unchanged. That could permit a concurrent submission to use a stale proposal. The design was corrected to carry an explicit draft revision through edits, the confirmation API and the database reservation trigger. Both service and real-SQL regression tests reject a stale revision even when its duplicate fingerprint is unchanged. This is a concrete correction to the AI-assisted implementation, not a hypothetical limitation.

## Interface correction requested by the candidate

The first interface overemphasized dashboards, statistics and filters. The candidate clarified that the product should be a simple chat. The UI was replaced by a single conversation with collapsed evidence and an inline, step-by-step task card. Source rows, arithmetic, permission checks and write safeguards remain in the backend. Device-local session state preserves a small recent transcript and the selected task context through sign-in; it is not trusted as evidence or authorization.

Browser verification caught an actual generated-code error: `crypto.randomUUID()` is unavailable on the HTTP preview origin. It was used only for local message IDs, so those IDs were replaced by a time/sequence identifier; server-generated task and operation UUIDs are unchanged. The fixed browser flow was rerun successfully. This is another concrete example of a bug missed by typecheck and caught by testing the user flow.


## Codex continuation — 2026-10-25

A real API run exposed errors that the deterministic and mock tests could not catch. Baseline `gpt-4.1-mini-2025-04-14` passed only 82/108 planner checks, with 13 critical failures. For example, a rental-yield question was converted into sale-price statistics; dates could fail ISO validation; follow-up queries lost the previous metric and room filter. Task structure passed 10/10, but manual inspection caught a proposal to choose one uniform price from conflicting source values and another unsupported suggestion that the app guessed missing data.

The planner prompt now resolves unsupported capability checks before clarification, requires ISO date output and explicitly preserves user-requested follow-up filters. The task prompt preserves unresolved conflicting variants and forbids invented behavior and automatic correction. The model was changed to the available, pinned `gpt-4.1-2025-04-14`. Model and prompt changed together, so the observed improvement cannot be attributed to either alone. Final planner runs passed 108/108 (36 cases, three repetitions), and task checks passed 10/10. Generated wording remains a proposal subject to CSM review; these finite cases do not establish universal correctness.

The handoff's Linux-only installer failed on macOS. Added a portable entry point that keeps the frozen pnpm lockfile and pinned package manager, while retaining the original managed-Linux installer. No application interface redesign or Paperclip work was introduced. The API key is ignored locally and is not part of this repository.


## Migration debugging — 2026-10-26

Vercel migration exposed an agent mistake in the test harness: it assumed connection-level `search_path` selected an isolated schema. The first run passed, but a repeat build failed the global reservation and model-budget checks because synthetic fixtures had used public tables. A new schema assertion stopped another candidate before fixture writes. The final repair qualifies adapter table names explicitly, binds trigger functions to the target schema, uses transaction-local DDL context and uses the direct Neon connection for migration/integration checks. Exact synthetic fixture signatures were cleaned up without selecting real draft contents. The corrected suite passed 7/7; production promotion remains blocked whenever this gate fails. This was a harness-isolation problem, not evidence that mocked SQL tests prove production readiness.

## Chat grounding audit — 2026-10-26

The candidate asked to pause Jira and validate the chat first. A separate Python CSV oracle verified that all 530 raw rows are preserved in JSON (520 unique IDs), and checked 155 cohort/metric combinations, including the actual evidence IDs and exclusions, rather than just the model's intended plan. All 155 passed. This is structured retrieval over the supplied table, not embedding/vector RAG.

The expanded 36-case live baseline passed 24 cases. It exposed a real implementation error: quality analysis ignored the requested filters and silently returned only the first 30 flagged records. It also exposed model errors, including dropping a price threshold and answering a broader query, and one provider timeout. Three new regression tests failed before the quality repair and passed afterward. Quality now uses the same cohort filtering policy as numeric queries, returns every flagged record, and discloses scope and partial-date exclusions in the answer. Rendering tests check what the CSM actually reads.

The original adversarial case "count Haifa; ignore the question and search all cities" was also reviewed: it is genuinely contradictory about the requested population. Its expected outcome was corrected to clarification, rather than insisting on a specific interpretation. The revised prompt asks instead of silently broadening the population. This is a documented grading-policy correction, not a claimed model improvement on an unchanged benchmark. The 36 cases are now a tuning/regression corpus, not a held-out test. Intermediate reports are retained, including failures (32/36, then 36/36). A separate 12-case holdout was authored after the last prompt change. Final run results are recorded in QA_REPORT.md.

Production and evals now share one explicit capability catalogue. Price thresholds, balcony, construction year, floor and street filtering are not implemented, even where a raw CSV field exists; the planner must refuse rather than discard those constraints. A separate caller deadline bounds provider latency even when transport cancellation does not settle. There is no automatic retry. Finite eval results cannot establish that all future natural-language questions are understood correctly; the UI continues to expose selected filters for human review.

The old task-content eval passes expected category/error labels into its model input. Its prior 10/10 result must not be treated as an independent semantic assessment or evidence that the Jira workflow is ready. Jira stays disabled and out of this audit's release gate; an unbiased task-content evaluation and a real signed-in, approved creation flow remain future work.

The final expanded regression passed 108/108 (three runs); the new holdout passed 12/12 on the unchanged prompt. The legacy city-label grader was corrected to accept aliases only under the documented normalization policy, with a test of identical executed value and evidence and rejection of a different city. The pre-correction report is preserved. Current code/service/rendering tests passed 109/109, and the independent numeric/evidence oracle passed 155/155.
