# Athens Markets — Cloud Favorites staging note (09 October 2026)

## Deployment hold

**Not live yet.** This is review branch `feature/supabase-cloud-favorites-2026-10-09` / PR #6. Do not merge before the owner configures Supabase Auth redirect URLs and successfully tests a REAL magic-link sign-in against the production map address.

## Supabase backend

- Owner organization: `vitalypolovnikov's Org` (Free, new project confirmed $0/month at creation).
- Project: `Athens Markets`, project ref `ctqiscyorobaoiamvswa`, EU Central.
- Browser API URL: `https://ctqiscyorobaoiamvswa.supabase.co`. Only a publishable client key is embedded in `cloud-sync.js`, not a secret or service-role key.
- Two tables: `public.athens_favorite_profiles` and `public.athens_favorite_items`; RLS enabled, access scoped via `auth.uid() = user_id`.
- User favorite keys are stable market IDs, with per-item selected state including tombstones (unfavorite), server timestamps.
- Restricted authenticated-only function `public.athens_initialize_favorites(text[])` seeds the local list ONLY for the account's first initialization. No permission to invoke anonymously.
- Realtime publication includes `athens_favorite_items`. Security Advisor returned zero findings at initial check.

## Browser integration

- `index.html` exposes a small API to its existing local Favorites logic; adds opt-in sign-in/status controls.
- `cloud-sync.js` manages Supabase magic-link session, private subscription, 30-second foreground refresh, reconnection, and per-user offline pending mutations.
- Sign-in bootstrap imports existing browser favorites if the user has not previously initialized their cloud account.
- When connecting a second device to an EXISTING cloud account, cloud favorites are authoritative. If this device has additional deliberate local favorites, it displays a one-time **Merge this device's favorites** action instead of silently resurrecting stale/deleted entries. An unedited default Kokkinara favorite isn't offered as a merge.
- User can continue using local favorites without signing in; browser storage remains available.
- Sign-out clears local view of the signed-in cloud favorites, so private data is not left visibly signed in.
- No changes to original 27 Bio market sources, 264 regular-market records or geographical coordinates.

## Browser QA

PR #6 Chromium workflow run `37928123299` PASS:
- Original source/geometry/function tests on desktop (1440px) and mobile (390/320px).
- Full 27 Bio and 259 currently valid regular popup inspection with zero JavaScript exceptions.
- Cloud mock: three independent browser devices, two different signed-in users, first-visit import, remote addition and removal, second-device retrieval and automatic refresh; runtime errors zero.

**Caveat:** the cloud test uses a fully simulated backend for deterministic functional QA. Real SMTP Magic Link delivery, project URL allow-list, production sessions and actual remote Realtime events have NOT yet been independently exercised. Do not call this production-ready before an owner-side end-to-end sign-in test.

## One owner-side required setting

In Supabase Dashboard → Project **Athens Markets** → Authentication → URL Configuration:

- **Site URL**: `https://vitalypolovnikov.github.io/athens-map/`
- **Redirect URLs**: add exactly `https://vitalypolovnikov.github.io/athens-map/` as allowed return URL.

The GitHub Pages app sends `emailRedirectTo` to this exact page. These settings are not exposed by the currently available connected management actions and must be entered by the project owner.

**Email caveat:** Supabase's built-in SMTP sends only to the organization's own team member email addresses (and currently only 2 messages/hour). To use another email address or broader public sign-up, configure custom SMTP first. Supabase Free plans may pause low-activity projects, affecting availability.

## Release gates

1. Dashboard URL Configuration confirmed by owner.
2. Sign in on real device using organization email and verify the magic link lands in the Athens Markets app.
3. Test moving cloud favorite from phone to Mac and removal in opposite direction.
4. Recheck RLS and security advisors; validate no private/secret API keys in site; GitHub Actions PASS.
5. Merge reviewed PR #6, verify GitHub Pages successful deployment, recheck live app in production.

Rollback: revert PR #6; existing local-only Favorites remain in previous GitHub Pages release.
