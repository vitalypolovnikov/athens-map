# Athens Markets — Official Regular-Market Layer (09 October 2026)

## Scope

The previous live map had **27 Bio market pins** and **18 unverified, legacy ordinary-market pins**. This release preserves the existing 27 Bio markets and changes the ordinary-market layer to use **264 directly georeferenced location records from the Attica regular-markets operator**, across Monday–Saturday. There are no regular markets listed for Sunday. The 18 legacy pins are not used as substitutes for official positions; existing source HTML retains their definitions solely for rollback.

This is a **dated official snapshot, not a continuously live API**. It was retrieved on **2026-10-09T10:25:57.777061+00:00** and is subject to future relocations and amendments. The interface links directly to the official live register for up-to-date verification.

## Primary source and extraction

- Official authority: [Φορέας Λειτουργίας Λαϊκών Αγορών Περιφέρειας Αττικής](https://www.foreaslaikon.gov.gr/markets-map/).
- Directly parse map's `addMarker(lon,lat,id,type,day,area,address,start,end,thumb)` entries. Every coordinate, area, road, and validity date originates in those published entries.
- No coordinate guessing, map-centre substitution, third-party geocoding or private credentials.
- Raw market snapshot: `data/attica_regular_markets_official.json` (264 records including those with future validity).
- Reproducible source-only extraction: `scripts/build_regular_markets.py`.
- Each marker opens the corresponding authority's individual record `my-market?id=...`.
- General selling hours **07:30–15:30**, with official exceptions, not asserted as individual times. [Official FAQ](https://www.foreaslaikon.gov.gr/faq/).

## Inventory

| Weekday | Next occurrence from 09 Oct 2026 | Source-listed locations | Valid at next occurrence |
|---|---|---:|---:|
| Monday | 2026-10-12 | 42 | 41 |
| Tuesday | 2026-10-13 | 49 | 49 |
| Wednesday | 2026-10-14 | 44 | 43 |
| Thursday | 2026-10-15 | 39 | 39 |
| Friday | 2026-10-09 | 47 | 44 |
| Saturday | 2026-10-10 | 43 | 43 |
| **TOTAL** | | **264** | **259** |

**Important:** locations and sites are *records*, not a proven count of unique recurring markets. Date windows may describe temporary relocations; different records from the same market can appear in the source over time. The UI shows only records valid on the next occurrence of the matching weekday, based on the current date in the **Europe/Athens** timezone.

## Application changes

- Default remains organic-only so the user's original Bio experience remains uncluttered.
- Select `Regular (official)` to see source-backed blue markers, `All markets` to see both layers.
- Existing weekday filter applies to both layers.
- Original 18 regular legacy markers are suppressed to prevent duplicates and misleading positions.
- Popup: Greek area and street, official general sales hours, date-window and source link.
- Original organic marker coordinates and popups unchanged.
- Corrected a pre-existing filtering-data error that labelled three working Bio sites as closed: **Kifisia, Neo Iraklio and Agia Varvara**. Closed Bio markets correctly remain **Elliniko and Glyfada**, consistent with official primary pages.

## Quality and limitations

- Extraction requires at least 225 records, counts by weekday are checked against the authority's map page, and invalid or out-of-region coordinates and malformed dates abort generation.
- The ordinary markets list was checked against all six official day-map listings; 264 distinct IDs, no duplicated identical day+coordinates in this snapshot.
- The browser-side date filter is explicitly designed to omit not-yet-effective/expired temporary placements.
- The static site does **not** automatically re-download official data. Repeat source extraction and validation before relying on future weeks. Website may occasionally correct entries or change layout.
- Operator states that locations can be subject to relocations and temporary suspension; always verify on the primary site before travelling.
- Full interactive browser QA is performed separately using `tests/smoke_map.cjs`; only claim browser-tested success if the GitHub Actions job passes.

## Engineering provenance

- Original first-revision backup: `backup/pre-2026-10-09-revision`.
- Pre-this-change stable version remains in Git history at `main` commit `b5b094b7aaf46dc7a8ee95b311fdbf481dc70f68` until this change is merged.
- The earlier note `MARKET_DATA_AUDIT_2026-10-09.md` documents the previous **18-legacy-marker** state; this note supersedes its regular-market coverage assessment.
