# Athens Markets — Multi-Favorites Release Note (09 October 2026)

## Scope
Replace the static `Kifisia · Kokkinara` shortcut with a small, reusable ★ Favorites menu. This is an interface-only change; official market locations, Bioagores hours, weekdays, closures, marker identities, existing Leaflet map filters, and the date-aware ordinary-market layer have **not** been edited.

## Interaction
- Every opened Bio and regular market popup receives an accessible ☆/★ button beside the market title.
- A star saves its **permanent record ID**, not just the human-readable market name:
  - Bio: `bio:<original permanent Folium marker UUID>`
  - Regular: `regular:<Attica official listing ID>`
- Toolbar ★ Favorites shows multiple markets, types, weekdays, and removal controls. Selecting one switches the Type and Day filters, reveals closed Bio markets if necessary, zooms to the correct marker, and opens its popup.
- Ordinary-market records outside their official trading-date window are retained in Favorites but shown as **not currently scheduled** and cannot be opened until valid again. They can always be removed.
- Kokkinara is seeded on **first visit only**. An explicitly empty favorites array remains empty after reload (no unwanted carry-over or reseeding).

## Storage and privacy
- Favorites stored locally under browser key `athens-map:favorites:v1`, no backend, login, cookies or third-party data transmission.
- This is browser-/device-specific; Mac and iPhone do **not** synchronize automatically. Clearing site data can erase these favorites.
- If browser storage is unavailable the feature works for the current page session and its UI clearly states that it cannot save.
- The initial seed is written only when there is no existing storage value. Existing, user-selected lists are preserved.

## Browser regression evidence
GitHub Actions PR test run **37923494423** passed all suites in headless Chromium:
- Baseline market layer smoke: 27 Bio markets, 25 visible when two temporary closures hidden, official regular markets' date filtering.
- Full popup QA: 27 Bio and 259 currently valid regular-market popups opened on **1440×900, 390×844, 320×690** viewports, with no JavaScript or geometry errors.
- Kifisia regression: correct source, coords, popup, zooming/navigation in desktop/mobile Chromium.
- Multi-Favorites QA: first-visit seed, explicit deletion followed by reload, multiple Bio favorites and an ordinary market, correct filter switching across types/days, persistence, deletion, future-dated regular market disabled in the menu, no JS errors, and menu stays within the narrow viewport.

## Limitations
- Does not add server-side favorites or cross-device synchronization.
- Native Safari (macOS/iOS) still requires owner-side smoke testing; Chromium coverage does not imply Safari was directly tested.
- Snapshot market status remains dated and separate from the Favorites UI.

## Rollback
Revert PR #5, restoring the earlier Kifisia one-click shortcut and unchanged market source data.
