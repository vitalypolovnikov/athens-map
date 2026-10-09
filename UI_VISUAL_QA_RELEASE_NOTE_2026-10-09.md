# Athens Markets — Compact Popups / Visual QA (09 October 2026)

## Why
User screenshots of the already published map showed:
- Kifisia/Kokkinara popup rendered as an exceptionally narrow, tall column, even after a previous shortcut-specific adjustment.
- A large, text-heavy floating toolbar.
- Map displayed very far from Athens, making markets hard to locate.

The root implementation error was Folium-generated `L.popup({"maxWidth": "100%"})` (45 occurrences): Leaflet expects a numeric pixel value for `maxWidth`, not a percentage string. The previous fix changed the popup options only when the Kokkinara shortcut was clicked, not when markers were opened normally.

## Changes
- Replaced **all 45** Folium popup width options with numeric widths; included toolbar-aware auto-pan clearance.
- Bio organic markets: existing source data (all 27 names, weekdays, hours, streets, statuses, official Bioagores URLs and marker coordinates) remains intact; after map initialization cards are rendered in a compact design:
  - identity + weekday;
  - hours or temporary closure;
  - official street;
  - expandable source and coordinate accuracy.
- 264 official ordinary-market source records: compact card with day, area, street, clearly labelled *general* hours; published validity dates, caveat and official URL in a disclosure.
- Changed initial map centre and zoom to **Athens 37.995, 23.79 at zoom 11**. Added **⌖ Athens** reset button. Preserved one-click **📍 Kifisia · Kokkinara**.
- Compact mobile-appropriate top controls, with lengthy source notes hidden under an explicit disclosure. No changes to original data, source-provenance report, periodic date validity checks, or market inclusion.
- Added browser QA on pull requests; screenshots uploaded to GitHub Actions run as `athens-visual-qa`.

## Browser evidence
In headless Chromium with OpenStreetMap tiles, 3 viewports were exercised: **1440×900, 390×844, and 320×690**.

For each viewport, the interactive QA:
- checks the initial view contains the Kokkinara marker;
- uses the *actual visible* favourite and Athens reset controls;
- checks the popup's rendered dimensions, clipping and toolbar overlap;
- expands its source disclosure and verifies the link;
- opens **each of the 27 Bio popups** and checks compact geometry plus source and closure treatment;
- opens **each of 259 currently valid official regular-market popups** and checks geometry, source and date disclosure;
- inspects runtime JavaScript errors.
- Five future-dated regular-market records remain intentionally hidden until their effective dates.

A screenshot-based manual reviewer also inspected **desktop and 390px mobile** renderings of the compact Kifisia popup.

The full test's passing report from the latest validation run: desktop/390px/320px, **27 Bio + 259 regular checked in each**, zero JS errors, zero popup dimension errors. The permanent older smoke and Kifisia-specific tests are rerun on the release PR.

## Limitations
- Chromium is not a native Safari/iOS end-user test. Native Safari rendering remains unverified.
- Official Attica market records are a dated snapshot, not a live feed; periodic refresh is separate.
- Popup widths and initial centre do not establish independently verified coordinates; no source content was altered in this UI-only change.

## Rollback
Revert this pull request or restore the previous `main` commit `30a183b537bba6d621bdc7f3a8dd663dea92bf00`.
