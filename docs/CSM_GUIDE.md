# User Guide — Map, Transactions and Chat

Updated: 27 October 2026

Use this tool to investigate the supplied property-transaction sample, inspect sources and compare deals. These are historical transactions, not current sale listings or valuations. The interface is in Hebrew; control names below are English translations.

## Get started

1. **Explore.** Filter by city, property type and rooms. Click a city marker to preview transactions, then open a card's details and source records. Click the map to activate scroll-wheel zoom; you can also use +/-, touch pinch and full-screen mode. The all-results control fits the current search results.
2. **Ask about the sample.** Try: “What is the median price per square metre for four-room apartments in Holon?” Inspect the interpreted filters, evidence and exclusions. An aggregate question over the full sample also updates map/list filters. Follow with “Which transactions were included?” to see the records behind that calculation.
3. **Focus and compare.** Use the ask-about-this-transaction action on a card to restrict chat to it. Select up to three deals and ask: “Compare their price per square metre and features,” or open the selection's comparison table. “What is their average sale price?” calculates an aggregate over that selection.
4. **Check scope.** Selected deals appear above chat. Manual list filters do not change chat scope, even when a selected card disappears from the list. Return to the full sample to remove the selection. Earlier answers retain their original scope labels.
5. **Continue or clear.** Up to 20 turns, map filters and selection survive a refresh in the same tab. Results are reconstructed from the sample using the current as-of date. Clearing chat removes its saved contents without changing selection. Progress arrives from the server; numbers appear after validation. You can cancel a request.

## Read results carefully

**City-level locations only:** the CSV has no house numbers or property coordinates. GeoNames supplies city points; OpenStreetMap supplies the background. Cards and chat remain available if tiles fail to load.

**Source quality matters:** price per square metre is price divided by area. The mean of these ratios is not area-weighted. Duplicate IDs count once. Conflicting, missing or suspicious data may be excluded under the rules shown in the answer. A dash is not zero, unknown parking is not “no parking,” and a warning does not prove a software bug.

**Limits:** chat supports city, neighborhood, property type, rooms, date, parking, elevator and safe-room filters. Price thresholds, street, floor, year-built and balcony filters are unsupported. There is no forecasting, purchase advice, root-cause diagnosis, customer-loss data or access to Madlan production. The tool sends no messages and creates no tickets.

## When a customer says “this number is wrong”

Ask for a deal ID or screenshot showing the metric and filters. Reproduce the selection and compare source rows before promising a correction.

> Thank you for flagging the discrepancy. Please share the transaction ID or a screenshot with the metric and filters so we can compare the same result. We will check the calculation against its source and identify missing or conflicting information. We cannot yet establish what caused the difference.

Failures show an explanation without automatic retries. Use the trace ID when one is provided, or return the question to editing. Do not enter personal information or secrets into chat.
