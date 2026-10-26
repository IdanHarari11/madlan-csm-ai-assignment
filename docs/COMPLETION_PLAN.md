# Approved completion plan — 2026-10-26

## Current order — updated after user direction

The user explicitly paused Jira. First audit assignment relevance, data provenance, calculations, answer evidence, model capabilities and graceful failures; fix and evaluate the chat, then publish the verified revision. Jira setup, public issue viewing and signed-in creation remain deferred. The prior task-content score is not independent semantic validation because expected labels entered that eval input.

## Outcome

A simple public Hebrew/RTL CSM chat: live AI interprets requests, separate deterministic tools calculate answers and disclose evidence, a permitted CSM investigates reported impact and reviews a structured draft, and explicit approval creates one Jira issue. The chat returns a real issue link that an evaluator can read without signing in. Paperclip remains out of scope.

Approval: the user approved the completion plan including public ticket viewing. Paid changes or exposure beyond the dedicated evaluation project require renewed user approval.

## Gates

| Gate | Required verification | Current state |
| --- | --- | --- |
| Public app | Public Vercel URL serves the chat and a live AI query returns expected evidence | Passed for server/API; browser UI inspection blocked by browser permission |
| Deterministic core | Typecheck, build, code tests, independent calculation oracle | Passed in prior runs |
| PostgreSQL | Isolated-schema concurrency, limits, uniqueness, reviewed revision, owner checks and unknown outcomes | Passed twice after isolation repair |
| Live AI | Pinned-model intent corpus, unsupported/injection boundaries, structured drafts and semantic review | Planner 108/108 and task structure/evidence 10/10 passed; independent content review remains |
| Identity | Real verified-email sign-in; allowlisted CSM can draft; another user cannot | Anonymous and forged-header rejection passed; positive signed-in path pending |
| Jira setup | Verify dedicated project's type, subscription, browse permissions, API credentials and issue type | Pending access; connector unconnected and service credentials absent |
| Public ticket viewing | Anonymous evaluator can open the actual Jira issue; create/edit remain protected | Pending plan/project inspection; Jira Free and team-managed limitations must be respected |
| Full workflow | Question → evidence → reported impact → structured draft → edit → exact revision approval → one Jira issue → chat link | Pending identity/Jira setup |
| Write safety | Replay creates no second issue; parallel requests, quotas, similarity and uncertain outcomes handled honestly | Code/DB coverage passed; controlled live Jira checks pending |
| Usability | Desktop/mobile RTL, evidence disclosure, clear failures, retained conversation, keyboard/navigation/accessibility checks | Current Vercel browser checks blocked |
| Delivery | Current public URL, full repo, one-page CSM guide, honest AI log, QA report and English demo | Artifacts exist; final integration evidence and review pending |

## Execution rules

- Continue reversible implementation, targeted fixes and tests autonomously within the approved scope.
- Do not widen access beyond the dedicated evaluation Jira project or enable anonymous create/edit.
- Check the actual Jira plan and project management type before promising anonymous browsing. Do not purchase or start a paid trial without approval.
- Do not substitute an app-hosted issue page for public access inside Jira without agreeing the scope change with the user.
- Keep Jira disabled until credentials and issue type are verified. Do not use placeholder secrets or credentials from other projects.
- Use a reviewed test draft and explicit creation approval for a live issue. Test faults only in the dedicated evaluation environment; never blindly retry an uncertain POST.
- Record actual evidence and limitations. Mock tests, successful builds and valid schemas do not establish end-to-end readiness.

## Current blocker

On attempting Jira inspection after approval, browser origin access was declined. No access settings were changed. The Atlassian connector is not connected, and local service credentials are missing. Browser permission or a connected authorized source is required to inspect the account; service credentials are additionally needed for the hosted adapter.
