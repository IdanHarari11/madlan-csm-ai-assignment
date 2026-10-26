# English demo — map and scoped chat (10 minutes)

## 0:00–2:00 — Browse the actual data

“I built an explorer for the supplied historical transaction sample. The map gives geographic context, cards expose records, and chat lets a user investigate or compare an explicit selection. These are not live sale listings.”

Click a city marker. Open a popup preview and a deal card. Show reported price, characteristics, date, quality flags and raw source rows. Explain the important constraint first: there are no house numbers or coordinates in the CSV. The map groups transactions at city-level GeoNames points; it does not invent precise property positions. Attribution is visible. Card pagination makes all 520 unique deals accessible.

## 2:00–4:00 — Ask about the whole dataset

Ask `מה חציון המחיר למ״ר בדירות 4 חדרים בחולון?`.

Inspect the actual filters, 38,260 NIS/sqm result, three evidence IDs and small-sample warning. The map/list synchronizes to interpreted query filters. Arithmetic is deterministic; the LLM translates intent and constraints. Manual map filters do not silently change chat scope; the header explicitly states that the conversation covers the whole sample until records are selected.

## 4:00–7:00 — Selection and comparison

Select two cards. The scope chips show their IDs. Ask `השווה את המחיר למ״ר והמאפיינים שלהן`. Show the per-deal table, amenities and evidence. Then ask `מה המחיר הממוצע של העסקאות שבחרתי?` to distinguish a side-by-side comparison from an aggregate. The server restricts both to the selected IDs.

Open D100017 alongside another deal. Its contradictory source prices are not collapsed into an authoritative comparison value. Null is not zero. Show that direct comparison remains available without AI. Clearing selection returns to all data and resets conversation context. Changing map filters does not silently discard a selected record; the chips retain it.

## 7:00–9:00 — Failure and evidence

Ask for future value or customer financial losses; these are unsupported. Ask to ignore selection and use every city; the model must clarify rather than escape the server scope. Unknown IDs and oversized selections are rejected.

Show `tests/map-scope.test.ts`, the independent Python CSV oracle and `evals/results/map-scope.json`. Preserve and show the failed aggregate run: the model confused an average with comparison; explain the repair. Separate mock-provider failures from actual live calls and distinguish a finite corpus from universal correctness. A provider timeout returns an honest message with a trace ID, with no automatic retry.

## 9:00–10:00 — Tradeoffs

Proudest of: preserving the boundary between natural-language planning, server-enforced selection, deterministic numbers and source evidence.

Next improvements: obtain accurate licensed street/building coordinates before mapping individual properties; observe real users and expand supported filters based on their needs. City aggregation is an explicit precision tradeoff, not a hidden implementation detail. State honestly that automated browser access remained blocked by saved permission/managed policy; do not claim visual/mobile/clipboard QA. The layout and controls are implemented and server rendering/build/tests passed.

Jira, outbound customer messages, predictions and Paperclip are out of this release. No production system or customer impact is inferred from the sample.
