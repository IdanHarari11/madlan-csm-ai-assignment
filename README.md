# Madlan Evidence Desk

A Hebrew/RTL investigation desk for Customer Success: ask a question about the supplied transaction CSV, inspect deterministic calculations and source records, and prepare an evidence-backed Jira proposal with a policy-based priority. A permitted CSM must review and explicitly confirm every write.

**Release state:** local live AI is validated on pinned `gpt-4.1-2025-04-14`: 108/108 planner checks (36 cases × 3) and 10/10 task structure/grounding checks. The public Site still needs its OpenAI runtime secret and redeployment; live Jira and authenticated end-to-end checks remain incomplete. See `docs/QA_REPORT.md` before submission.

## Quick start

Node 22.13+ and pnpm. Install using the included macOS/Linux environment-aware helper, then run the checks:

```sh
npm run install:ci
pnpm typecheck
pnpm test
pnpm test:db
pnpm eval
pnpm dev
```

For this Sites checkout use the Sites install/build helpers specified by its skill; the authored source is ordinary TypeScript/React and the hosting adapters are explicit.

The CSV is unchanged at `data/deals.csv`; `data/deals.json` is its lossless parsed representation. The domain accepts an explicit as-of date. No external data enrichment, vector DB or Redis is required for 530 input rows.

## Architecture

- `lib/domain.ts`: parsing, canonical labels, duplicate/conflict policy, independent tools, statistics, provenance and priority.
- `lib/contracts.ts`: closed planner and task schemas; strict server request contracts.
- `lib/ai.ts`: bounded structured planning and task generation through the installed AI SDK; 20-second timeout, zero retries, typed errors. Supports AI Gateway or OpenAI Responses provider.
- `lib/investigation.ts`: tool dispatcher and factual response construction. All numerical answers come from code; the model never writes the numeric answer.
- `lib/task-service.ts`: ownership, draft expiry, idempotency, duplicate gate, external-call state transitions.
- `lib/store.ts`, `db/schema.ts`, `drizzle/`: persistent D1 storage and atomic SQL quota/uniqueness guards.
- `lib/jira.ts`: tenant-scoped Jira Cloud v3 adapter, ADF descriptions and conservative unknown-outcome handling.
- `app/desk.tsx`, `app/components/`: a single RTL chat, on-demand source inspection and inline guided task confirmation.
- `tests/`, `evals/`: deterministic tests, actual SQL concurrency tests, independent Python golden oracle, live-model corpora and gates.

See [decisions and limitations](docs/DECISIONS.md), [CSM guide](docs/CSM_GUIDE.md), [AI log](docs/AI_LOG.md), [evaluation plan](docs/EVAL_PLAN.md), [setup](docs/SETUP.md) and [English demo](docs/DEMO.md).

## Commands

| Command | Purpose |
|---|---|
| `pnpm typecheck` | Type safety |
| `pnpm test` | Domain, service, API contract and mocked-provider tests |
| `pnpm test:db` | Actual shipped SQL on SQLite, including concurrent writes |
| `pnpm eval` | Numerical goldens, invariants and grader self-checks (not live AI) |
| `pnpm eval:live` | Actual model planner; exits 2 without credentials |
| `pnpm eval:tasks` | Actual model task proposals; human semantic review still required |
| `python3 evals/reference.py` | Deliberate regeneration of independent goldens; review the diff |

Live model ID is configured, not guessed. Runtime secrets are never committed. The public experience is read-only unless a signed-in user's email appears in the explicit CSM allowlist. Missing identity, database, key or write-enable flag fails closed. There is no hard-coded admin token and no production auth bypass.

## Hosting

This version targets Sites (Vinext on Cloudflare Workers with D1). Identity headers are trusted ONLY behind the Sites dispatch boundary. Hosting directly elsewhere without replacing identity and persistence adapters is unsafe. Do not expose the raw worker with client-supplied identity headers. Hosted migrations run before publication; local preview migrations must be applied explicitly as described in setup.

No automatic Jira reconciliation is included. A timeout after an external POST is not treated as proof of failure: retain the operation and investigate by its label before retrying. External search is eventually consistent, so local atomic deduplication is the primary defense against this app's concurrent writes.

## Reference documentation verified during implementation

- Installed `ai@7.0.143` and `@ai-sdk/openai@4.0.96` bundled docs/source for `generateText`, `Output.object`, custom providers and abort/retry options.
- [Jira enhanced JQL search](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/).
- [Jira issue creation / ADF](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/).

Work remains the candidate's. No affiliation with or endorsement by Madlan is implied.
