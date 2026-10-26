# Vercel deployment

The Vercel target replaces the Sites runtime with native Next.js, dedicated Neon Postgres and verified-email Neon Auth. The original Sites publication is separate; it is not changed by a Vercel deployment.

## Project

- Vercel project: `madlan-csm-chat` (`prj_m7SPbDQtYgKQ8Q71wdx8sX78QAqX`).
- Team: `idanharari11s-projects`.
- Database: a new isolated Neon resource `madlan-csm-db`, provisioned on the existing Free plan in Frankfurt. No other project database is reused.
- Node 22.x; `vercel.json` owns the framework, install/build commands and function region.
- Public production site; preview deployments require Vercel authentication. Application write authorization is independently enforced in each protected API route.

## Environment

All provider/database/session secrets live only in Vercel server environment settings. The deployment uses production and preview scopes. Neon injects the database and auth endpoint variables via its project connection.

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Dedicated project key created through the secure flow; expires after the selected 30 days |
| `AI_MODEL` | Pinned `gpt-4.1-2025-04-14` |
| `DATABASE_URL` | Neon pooled PostgreSQL connection |
| `NEON_AUTH_BASE_URL` | Managed auth endpoint supplied by Neon |
| `NEON_AUTH_COOKIE_SECRET` | Random, server-only session-cookie signing secret |
| `CSM_EMAILS` | Explicit allowed verified-email addresses |
| `JIRA_BASE_URL` | Dedicated Atlassian origin |
| `JIRA_PROJECT_KEY` | `KAN` |
| `JIRA_ENABLED` | `false` until a controlled live integration test |
| `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_ISSUE_TYPE_ID` | Still missing; do not insert placeholders or claim live Jira works |

No value is prefixed `NEXT_PUBLIC_`. Additional database variable names injected by Neon are managed by that integration; the app only consumes `DATABASE_URL` and `NEON_AUTH_BASE_URL`.

## Data and transactions

`pnpm db:migrate` applies `postgres/001_initial.sql` inside a transaction with a migration advisory lock. `pnpm verify:postgres` runs the active adapter against a unique temporary schema in the same dedicated database and drops only that test schema afterward. It verifies 40 competing global reservations, concurrent duplicates, revision/owner binding, edit locks, unknown outcomes, failed-attempt quotas and atomic model budgets. No Jira service is contacted by these checks.

Vercel's build runs both commands before `pnpm build`. A failed database check prevents a new deployment. Production HTTP handlers never create schemas. Operations stay durable across serverless instances and deployments. Model budgets retain the original persistent caps. App metadata and transaction IDs are not a substitute for row-level ownership checks.

## Identity

`/auth/sign-in` requests a one-time code using the managed Neon Auth service. It verifies email ownership without storing a password in this app. `getCurrentUser()` validates the provider session and requires verified email; `requireCSM()` then checks the server allowlist. The old `oai-authenticated-user-*` headers do not grant any access on Vercel. External users may sign in but receive no CSM privileges unless explicitly allowlisted.

## Completion gates

After deployment, test the actual public chat and evidence, the sign-in page, negative auth and disabled Jira behavior. Completing a sign-in requires the user to enter their emailed code. Live Jira remains a separate task requiring its missing credentials and explicit approval of a reviewed draft.
