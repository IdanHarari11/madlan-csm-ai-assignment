# English interview demo (10 minutes)

## 0:00–1:00 — The user and the decision

“I built an investigation desk for a CSM who needs to answer a customer's question about a number. The outcome is an explainable answer or an actionable issue, with enough evidence that an engineer can reproduce the investigation. I kept autonomous code changes out of scope.”

## 1:00–4:00 — One concrete customer question

Ask: “What is the median price per square metre for four-room apartments in Holon?” Inspect the interpreted metric and filters. Explain why a median is not a mean, and why mean per-square-metre ratios are not an area-weighted average. Show the source IDs and the small-sample warning. All arithmetic is deterministic.

If the model is not connected, explicitly demonstrate the labeled direct sample questions and state that the live AI gate remains incomplete. Do not present this as a working AI demo.

Open `D100017`. Show the two source rows: 1,919,000 versus 1,851,548 NIS. The tool does not choose an authoritative source; the ID is excluded from price metrics. This is not proof that Madlan's production application contains a software bug.

## 4:00–6:30 — Customer to engineering

Select the record and prepare a draft. Unknown customer impact stays unknown and produces TRIAGE, rather than a fabricated emergency. Enter a reported active production impact with affected customers and no workaround; show the policy explanation. Edit the proposed text. Confirm explicitly before creating a Jira issue. If Jira is not configured, show its disabled state honestly.

## 6:30–8:30 — Failure and abuse

Show the test cases for provider outage, timeout, invalid schema, unauthorized draft access, concurrent submits and uncertain Jira outcome. A timeout after POST may mean the ticket exists; blind retry is unsafe. D1 reserves a request atomically, and unknown outcomes are quarantined. Priority does not bypass limits.

## 8:30–10:00 — Tradeoffs and proof

Show independent Python golden values and real SQLite concurrency tests. Separate deterministic tests from live-model evals. The finite corpus is evidence, not a guarantee for every possible prompt.

Part I am proudest of: the boundary between model interpretation, deterministic evidence and atomic external-write safety.

Part I would improve next: manual unknown-operation reconciliation and richer live-model coverage, and a richer but still constrained query language. Semantic duplicate suggestions can be over-conservative. I would improve these based on real CSM usage, rather than adding infrastructure preemptively.

## Customer moment

“Please show me the transaction or the filters you used. I will reproduce that selection, compare the included records and source rows, and distinguish a calculation-definition difference from missing or conflicting data. At this point I cannot claim that a software defect caused the discrepancy. I can explain what the supplied data supports and attach a reproducible investigation if engineering review is needed.”
