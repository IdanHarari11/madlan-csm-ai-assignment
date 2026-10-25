# Evaluation and release gates

## Layers (do not conflate them)

1. **Unit/service tests:** normalization, statistics, missing/zero/invalid values, strict schemas, priority, cross-owner access, concurrency/idempotency, simulated Jira and model failures. These are deterministic code tests, not proof of model intelligence.
2. **Database tests:** execute the exact shipped SQL with real SQLite, including 40 independent concurrent connections and the global quota. Confirms atomic guards without relying on an in-memory fake.
3. **Numerical oracle:** `reference.py` reads the original CSV independently from the TypeScript app and creates 60 golden cohort/metric results. Review the policy and golden diff when changing data or rules. Do not regenerate goldens merely to make a failing test pass.
4. **Metamorphic checks:** permutation invariance, duplicate handling, price scaling, evidence/exclusion consistency and no data tools for unsupported/clarify.
5. **Live-model intent eval:** 36 manually labeled cases, including Hebrew/English, room precision, city aliases, date ranges, follow-up context, missing data, unsupported valuation/causality, prompt injection and forbidden writes. `eval:live` calls the actual configured planner and deterministic graders. A valid schema is not a passing answer if the cohort or metric is wrong.
6. **Live-model task eval:** see task corpus and run command below. Grounding, categories and evidence validation are checked; wording still needs human review.
7. **HTTP/browser:** actual app endpoints and visible workflow, including filter results, raw conflicting records, disabled configuration, role rejection, guide and model-error path. Live Jira E2E remains a separate required gate.

## Commands

```sh
pnpm typecheck
pnpm test
pnpm test:db
pnpm eval
# Credentials in untracked local runtime environment, never in Git:
pnpm eval:live
EVAL_REPEATS=3 pnpm eval:live
pnpm eval:tasks
```

Live eval defaults to one pass over all cases, hard capped at three repeats. `EVAL_LIMIT` supports a small smoke subset. Model output token cap is 3500, timeout 20 seconds, automatic retries disabled. Three consecutive provider failures stop a run to avoid blind spending. No API credentials: exit 2, explicitly blocked, never a green pass.

## Gates

- Typecheck/build and all deterministic checks must pass.
- For live intent: zero failures in injection, action-boundary and unsupported categories; at least 95% overall exact-plan pass rate; every selected case must actually execute. Human-review all failures and a random sample of passes. Multiple acceptable actions are listed explicitly for ambiguous inputs.
- Task generation: no unsupported references or ungrounded facts; every incident without evidence must be rejected. Structured correctness alone is insufficient: review descriptions and acceptance criteria in Hebrew against supplied evidence.
- Repeat the final live suite three times on the pinned production model. Record model ID, date, case IDs, plans, errors and latency. Do not call the app ready for submission while these are unrun.
- In a dedicated Jira project, verify one actual create, replay of that draft, rejection of unauthorized accounts, similarity candidates and an uncertain response. Never fault-inject into a shared real project. Verify that the issue has correct project, body, evidence and labels, and that a second issue was not created.
- Exercise a real model outage/timeout safely using the mock-transport tests during the demo; do not change live credentials or stop a shared service just to demonstrate failure.

## Residual risks

A closed schema prevents arbitrary execution but not an incorrect valid plan. The finite corpus cannot cover all language or business scenarios. Rules for suspicious values are product choices, not truths about housing. Semantic dedup may block unrelated issues. Shared IP budgets may penalize multiple legitimate users. The MVP fails closed on unknown Jira outcomes and needs manual operator reconciliation. The public demo's write permission must be separately granted to evaluators; do not grant it to every signed-in visitor.
