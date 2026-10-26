# English interview demo — 10 minutes

## 0:00–1:00 — Product decision

“I built a data investigation chat for a CSM who receives ‘this number looks wrong.’ It turns that complaint into a reproducible investigation and a proposed customer response. This is a hypothesis about the workflow, not a claim that I interviewed Madlan's CSM team. The tool sees the supplied CSV, not Madlan production.”

## 1:00–4:00 — Customer moment

Ask: `לקוח מדווח שהמחיר בעסקה D100017 לא נכון. מה אפשר לבדוק?`

Show “What we found,” the next step, and the proposed reply. Open the evidence: source rows 11 and 475 have prices 1,919,000 and 1,851,548 NIS. Both remain available. No authoritative price or per-sqm value is chosen. Explain why a source conflict is not proof of a production bug.

Expand and copy the internal investigation summary. It preserves source rows, unknowns and next steps. Copy the customer response only after reviewing it; the app does not send emails or promise a fix. A missing transaction ID returns a request for clarification.

## 4:00–6:00 — The LLM and the arithmetic

Ask: `מה חציון המחיר למ״ר בדירות 4 חדרים בחולון?`

The result is approximately 38,260 NIS/sqm, with three included IDs: D100027, D100074, D100211. Expand the interpreted filters and the small-sample warning. The LLM translates language into a constrained plan; code searches the full table and calculates the number. Mean per-sqm ratios would not be an area-weighted average. This is structured retrieval, with no vector DB.

Try an unsupported price-threshold or valuation question. The app must refuse rather than silently remove the condition. An anomaly never establishes customer loss, root cause or live production impact.

## 6:00–8:00 — Failures and tests

Show a retained failed baseline and the latest live reports. The independent Python oracle reads raw CSV and compares values and exact evidence membership. It is separate from the app's TypeScript calculation. Explain that tuned regression cases and new held-out questions are different evidence.

For a reproducible provider-failure demonstration, run the explicitly simulated transport tests:

```sh
node --import tsx --test --test-name-pattern='provider|timeout|errors never expose' tests/ai-http.test.ts
node --import tsx --test tests/deadline.test.ts
```

These are simulated failures, not a claimed live-provider outage. The same typed error path returns a clear message and trace ID. There is a caller deadline and no automatic retry. With AI configuration removed in a local environment, free text fails honestly while labeled direct examples remain available. Never alter production credentials during the interview.

## 8:00–10:00 — Tradeoffs and ownership

Proudest of: the boundary between model interpretation, independent evidence, arithmetic and a safe customer explanation.

Least happy with: the limited query language and lack of real CSM feedback. Unsupported requests need a constrained language expansion, not prompt tricks. Explain any browser verification limitation honestly. Jira is disabled and deferred; it was not required by the original assignment. Customer replies are deterministic drafts to minimize invented claims, while the LLM performs intent/filter/follow-up interpretation.

The next step would be observing real CSM investigations and measuring whether the tool reduces time to a correct response. No finite eval suite establishes correctness for every natural-language input.

## Code walkthrough — 15 minutes

1. Follow a request through `lib/contracts.ts` and `lib/ai.ts` into `lib/investigation.ts`.
2. Show conflict/duplicate normalization and exclusion policy in `lib/domain.ts`.
3. Show `lib/customer-case.ts`: no authoritative conflicting price, no invented cause, explicit unknowns.
4. Show tests and `evals/chat-oracle.py`; contrast an actual bug caught with a grading-policy correction.
5. Discuss public read-only investigation vs protected deferred external writes, server-held secrets, quotas and honest timeout behavior.
