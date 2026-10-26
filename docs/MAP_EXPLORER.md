# Map and scoped chat — release notes

## User flow

The primary product is now an explorer of historical transactions: browse a map and cards, filter the dataset, select up to three deals, and ask a scoped question or comparison. A city popup previews up to four deal cards and links to that city's complete list. Every deal is accessible in the paginated card list; no record is silently dropped for lacking exact coordinates. Card details retain raw source rows and quality warnings. Cards refer to historical transactions, not available listings.

The default chat scope is the whole dataset. Successful numeric queries synchronize map/list filters with the actual interpreted filters. Manual map/list filters do not silently redefine chat scope. Selected IDs are displayed above the chat and enforced by the server. A selection can remain active even if map filters hide one of its cards; the chips still expose the complete scope. Changing selection aborts the old request and clears its conversation to avoid history contamination. The explorer chat is ephemeral and is not restored across reloads. A clear action resets the conversation. Clearing selection returns to all data.

Comparison is a separate bounded planner path. Two or three selected records are compared in a deterministic table, including price, area, price per sqm and amenities. Invalid/conflicting/excluded prices are null, not zero, and notes explain exclusions. Supported comparison filters are actually applied; fewer than two remaining records prompts clarification. The selected scope cannot be broadened by model output or untrusted assistant history. Pure prediction, customer impact, financial loss and outside-source questions remain unsupported. A direct comparison table is available independently of the model.

## Geographic precision and provenance

The original CSV has no house numbers or coordinates. The map therefore deliberately groups records at **city-level points**, not at invented building or street positions. It does not jitter multiple transactions into plausible-looking individual markers. All 18 canonical dataset cities have attributed locations in `data/city-locations.json`.

Coordinates were extracted once from the official [GeoNames IL data extract](https://download.geonames.org/export/dump/IL.zip); each entry retains its GeoNames ID, source URL, canonical label and precision `city`. GeoNames data is [CC BY and provided as-is](https://www.geonames.org/export/). This adds geographic city context only; no external property facts or addresses were inferred. No runtime geocoding service or geocoding key is used.

The interactive map uses Leaflet 1.9.4. Tiles default to the standard OpenStreetMap HTTPS endpoint. Attribution to OpenStreetMap and GeoNames stays visible. There is no tile prefetch, proxy or offline download. Browser caching and Referer are preserved. Respect the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/); `NEXT_PUBLIC_MAP_TILE_URL` allows a build-time provider change. OSM is best-effort and may block service; tile errors show an honest fallback while cards and chat remain usable. No new secret is required.

## Verification and remaining limitation

124 code/service/rendering tests and 155 independent CSV-oracle checks passed locally. The scoped live corpus passed 24/24 (12 cases repeated twice); see `evals/results/map-scope.json` for current scores, hashes and plans. It covers comparisons, missing/conflicting values, single selection, aggregate count/mean, scope escape, quality and unsupported requests. The existing global planner adds one browsing rule: show/list/filter requests use count plus evidence records. Its 36-case regression and four browsing smoke cases are recorded separately. Hosted Postgres/build gates and CI are checked for the exact published commit.

Visual browser and real pointer/keyboard/clipboard behavior remain blocked by the saved browser permission/managed policy described in QA_REPORT.md. The map implementation and responsive styles must not be represented as visually verified. Modal Escape, focus containment and restoration are implemented; browser interaction is not claimed tested. External tile availability is not guaranteed. No Jira integration was enabled and no customer message was sent.


## Map interaction update

Embedded maps start with wheel capture inactive to avoid hijacking page scrolling. Clicking/tapping/focusing the map activates cursor-centered wheel/trackpad zoom; leaving it disables wheel capture again. An explicit hint explains activation. Touch pinch, double-click, keyboard and labeled +/- controls remain available. Fractional zoom steps reduce abrupt jumps. Full-window mode enables direct wheel zoom, preserves geographic precision and attribution, closes on Escape, confines keyboard focus and restores prior focus. A “כל התוצאות” control fits the current filtered city points. Selection-only changes preserve the current camera. This follows the distinction between cooperative embedded maps and active/full-window navigation; real-device gesture verification remains limited by browser permission.

The header line containing the dataset count and historical-listing disclaimer was removed at the user's request. The guide still explains what the dataset represents.
