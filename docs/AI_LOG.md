# AI Working Log — Map, Transactions and Chat

Updated: 27 October 2026

This is a focused summary of development decisions, AI assistance and verification for the submitted product.

## Goal and approach

The product explores the supplied property-transaction sample through a map, cards and Hebrew chat. Users can ask about the full sample or select up to three transactions for focused investigation and comparison. For a CSM, the value is turning a question about a number into a reproducible, explainable check.

I used ChatGPT/Codex for planning, implementation, data inspection, tests and documentation. Product decisions and observed behavior informed review and corrections alongside automated checks.

## Design decisions

- **The model interprets; code calculates.** The model converts questions, filters and follow-ups into a validated structured plan. Code computes every statistic and evidence list. A complete table of 530 rows and 520 unique transaction IDs does not need vector retrieval.
- **No invented locations.** The CSV lacks house numbers and coordinates. Transactions are grouped at 18 attributed GeoNames city points over OpenStreetMap tiles. The interface states this precision; individual properties are not scattered at fabricated street positions.
- **Preserve sources.** Duplicate IDs count once. Conflicting variants remain unresolved rather than receiving an authoritative price. Missing or suspicious records are excluded according to explicit calculation rules and exposed to the user.
- **Make context explicit.** The server enforces selection membership. Answers retain their scope labels. At most six same-scope turns enter model memory after their results are replayed from the data; browser-provided numbers are not trusted facts.
- **Restore and report progress.** Up to 20 turns are saved in the browser tab and reconstructed after refresh. The server streams workflow events, then a verified result. Cancellation propagates to the provider, alongside a hard deadline and no automatic retry.

## Mistakes caught and corrected

**An evidence follow-up was misunderstood.** After a Holon median calculation, a misspelled Hebrew follow-up meaning “Which transactions?” prompted the model to ask for a city again despite the context. I added an explicit evidence-inspection operation: the server preserves the previous metric, filters and exclusions and lists its included records immediately. The full six-turn sequence passed twice against the live model and an independent CSV oracle, returning D100027, D100074 and D100211. The original input is retained in `evals/evidence-live.ts`, with plans and results in `evals/results/evidence-live.json`.

**Comparison was substituted for an average.** With two selected deals, the model returned a comparison instead of calculating their mean sale price. I clarified the distinction between individual-record comparison and an aggregate over the selection, then reran the tests. The failed run remains in `evals/results/map-scope-aggregate-failure.json`.

**Requested filters disappeared.** Broader checks found quality analysis that ignored filters and a price-threshold request that became a wider query without the threshold. The quality implementation was fixed. Supported filtering capabilities were made explicit, with unsupported constraints refused rather than silently dropped.

**Styles did not load.** A manually supplied screenshot showed the explorer without its card layout despite a successful build. I moved its styles into a page-loaded stylesheet and added a gate that inspects the emitted CSS and page manifest. The user subsequently confirmed that the page looked good. The exact browser/network cause was not established.

## Verification

The recorded results include 147 code, contract, service, rendering, session and stream tests; 155 independent CSV comparisons; and 88 live-model checks, including repeated conversation sequences. Hosted PostgreSQL verification passed 7/7. See [QA_REPORT.md](QA_REPORT.md) and `evals/results/` for results, source hashes and retained failures.

Checks compare transaction IDs and exclusions, not just model-output structure. Provider failures, invalid output, cancellation and disconnected streams use mocked transports and are not described as live-provider outages. Cases used to refine prompts are regression cases, not independent evidence on unseen questions.

## Limits and responsibility

The tool uses the supplied sample only. It does not verify production behavior, value properties, predict prices, infer customer losses or create tickets. Streaming progress is not token-by-token explanatory text. Restored conversations recompute results using the current as-of date.

Full automated browser verification remained blocked by tool permissions; code and rendering tests do not replace it. Manual screenshots and user feedback informed corrections but do not establish complete browser, mobile or accessibility coverage. A finite test corpus cannot guarantee correct interpretation of every future question.
