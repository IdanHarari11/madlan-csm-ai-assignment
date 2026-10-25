# Runtime setup and completion checklist

## Model

Configure `AI_MODEL` and exactly one provider secret in the hosting environment:

- `AI_GATEWAY_API_KEY`: model ID is the full provider/model ID available in that Gateway account.
- `OPENAI_API_KEY`: model ID must be available in the associated OpenAI project and support structured output.

Use the supported OpenAI Developers connection/key flow; never put keys in source, screenshots, URLs, client code or chat. Keep local development values in ignored `.dev.vars`. There is no silently selected model and no rule-based fake chat fallback. `/api/status` reports only readiness booleans, never keys. Model calls are sent only after configuration and persisted budget checks succeed.

For local CLI evals, supply the same provider configuration in the process environment. The runtime `.dev.vars` file is not automatically loaded by CLI evals. Example commands deliberately omit secret values:

```sh
pnpm eval:live
EVAL_REPEATS=3 pnpm eval:live
pnpm eval:tasks
```

## Dedicated Jira Cloud project

Create a dedicated evaluation tenant/project rather than granting the demo access to an operational Jira project. A connector connection alone is not the hosted app's service credential. Configure the adapter explicitly:

| Key | Meaning |
|---|---|
| `JIRA_BASE_URL` | HTTPS origin such as your dedicated tenant's `*.atlassian.net` |
| `JIRA_EMAIL` | Dedicated bot account email |
| `JIRA_API_TOKEN` | Secret, restricted service token |
| `JIRA_PROJECT_KEY` | The dedicated project key |
| `JIRA_ISSUE_TYPE_ID` | Real create-enabled issue type ID in that project |
| `JIRA_ENABLED` | Keep `false` until ready to test; `true` enables writes |
| `CSM_EMAILS` | Comma-separated allowlist of verified signed-in CSM emails |

Token account needs Browse Projects and Create Issues in the dedicated project. Project field requirements must match the adapter's submitted fields. A required custom field may cause a definite rejection; adapt intentionally rather than disabling validation. Category and priority are included explicitly in the description; the MVP does not assume that Jira priority/issue-type IDs match its own enum. One configured issue type is used for all proposals.

Visitor sign-in establishes identity, NOT CSM membership. The empty allowlist denies every write. Never set the allowlist to a wildcard, and never accept a role from the client. The public demo can stay read-only while specific evaluators are granted CSM rights separately.

## Local database

Generate a build to obtain the wrangler config, then apply each pending migration ONCE, in order:

```sh
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_thick_firedrake.sql
```

The next local migration is `drizzle/0001_polite_unus.sql`; apply it once after 0000 using the same command with the new filename. Hosted migrations are applied by Sites publication. Do not create tables during request processing. Preserve applied migrations. The quotas and uniqueness are database guarantees; do not replace them with module memory on a distributed deployment.

## Before submission

1. Connect a real model, pin its ID and run the full live planner corpus three times. Review wrong filters, unsupported requests and follow-ups; every critical case must pass.
2. Run live task evals and manually verify the generated Hebrew descriptions, requirements and unknowns.
3. Grant a dedicated CSM account. Create one approved issue in the dedicated project; confirm fields and evidence in Jira itself.
4. Verify duplicate/replay handling and unauthorized rejection. Test uncertain transport outcomes with the automated mock suite; perform any live fault test only in the dedicated evaluation environment.
5. Confirm public anonymous read access to the published URL and protected writes. Link the final public GitHub repository, guide and AI log.
6. Re-run build/checks after any integration changes. Update `docs/QA_REPORT.md` with actual live results; do not replace blocked status with assumptions.

## Unknown operation runbook

Find the operation by trace/audit reference in D1. Search Jira for label `madlan-op-<operation UUID>` or `madlan-fp-<fingerprint>`. If an issue exists, reconcile the stored key/status. If an operator has verified that no issue was created, clear/requeue only through a controlled administrative change. Never automatically retry an unknown POST solely because time passed. The MVP provides no public endpoint for resetting these guards.
