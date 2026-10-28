# 7xCinema Capacitor Migration

**Decision:** Make React + TypeScript + Vite inside Capacitor 8 the primary application shell. Retain the Kotlin/Compose + Media3 app under `android-app/` as a feasibility/reference implementation until the Capacitor experience has equivalent verified playback capability.

**Status:** Migration MVP in implementation; CI and device verification are required before describing the branch as build-ready or production-ready.

## Why this direction

The project needs a fast mobile-first UI iteration loop and a shared web-compatible search domain. React/TypeScript fits that goal and allows the existing JavaScript search prototype to guide the new provider contract. Capacitor produces a real Android application package while retaining a web app for preview. It does not eliminate the need for native Android media integration: advanced HLS/DASH support, precise audio/subtitle selection, lifecycle and background playback may still require a dedicated Media3 plugin.

## Current architecture

- **UI:** React components and responsive CSS.
- **Build:** Vite + TypeScript.
- **Android container:** Capacitor 8.
- **Search orchestration:** dependency-light TypeScript provider interface with bounded per-provider timeouts, progressive result publication, provider-level error reporting, conservative ID-based deduplication, and source provenance.
- **Local data:** offline starter catalogue and device-local My List.
- **Live catalogue integration:** optional TMDB v3 API key stored on device; build-time `VITE_TMDB_API_KEY` is also supported but is public in the bundle.
- **First direct-media integration:** Internet Archive metadata search limited to uploader-declared Public Domain Mark/CC0 items with compatible MP4 files. The app links the user to the item's licence and detail page; these uploader claims still need verification.
- **Official availability:** TMDB watch-provider endpoint filtered to a user-selected region. Provider records link to TMDB's reported availability page, rather than inventing a direct streaming URL.
- **Playback (current MVP):** local native AndroidX Media3 player bridge for user-supplied direct HTTP(S) URLs, with play/pause/seek and track selection based on actual prepared-player audio/subtitle groups; the web preview uses HTML5 video. URL schemes and embedded credentials are validated on both sides.
- **Build verification:** GitHub Actions installs JS dependencies, tests search orchestration, builds the web bundle, generates a fresh Capacitor Android project, builds the debug APK, and uploads an artifact.

## Deliberate safety and correctness rules

1. Metadata lookup is not source resolution and is not a promise that a title can play.
2. TMDB's original-language field is not proof that a particular stream has that audio track.
3. A provider's claim of a dub/subtitle remains a claim until a provider/source or the prepared player verifies it.
4. Provider integrations must be individually reviewed for licences, terms, source permission, rate limits, regional restrictions, and stability.
5. Do not add an unrestricted media proxy, DRM/access-control bypass, or credential-forwarding scheme.
6. Keep the source/provider ID attached throughout search, deduplication, details, and eventual playback.
7. One provider timeout must not suppress successful results from other providers.

## Acceptance gates

### Gate A — Capacitor migration
- [ ] Vite production build succeeds.
- [ ] Unit tests pass for provider fan-out, progressive results, deduplication, failure isolation, and timeout handling.
- [ ] Clean CI can generate and build a Capacitor debug APK.
- [ ] Android back navigation, screen insets, keyboard behaviour, and small-screen layout are checked on a real device.
- [ ] App opens in offline mode without a blank screen or forced API key.

### Gate B — Discovery integration
- [ ] TMDB search/trending works with a valid user-supplied key.
- [ ] Invalid key, no result, timeout, rate limit, network loss, and missing region data all show understandable states.
- [ ] Watch-provider cards open the reported official destinations and do not imply the user has a subscription.
- [ ] My List survives process/app restart.

### Gate C — Native playback
- [x] A local Capacitor bridge wraps AndroidX Media3 and exposes a native playback Activity.
- [ ] Verify the native bridge's Gradle integration and debug APK in CI.
- [ ] Add a dedicated Capacitor bridge API that can report selected-track details back to React if the UX needs them.
- [ ] Authorized test assets cover supported direct MP4, HLS, and DASH media where technically compatible.
- [ ] Audio and subtitle tracks are listed from the prepared player, with verified selection events.
- [ ] Loading, failure, retry, seek, orientation, app backgrounding, and teardown are tested on real Android devices.
- [ ] No provider-reported language is presented as selectable until the player actually exposes the track.

### Gate D — Real provider adapters and release readiness
- [ ] Each source integration has a recorded terms/licence/permission review.
- [ ] Every adapter has tests and a source health/timeout budget.
- [ ] Search includes only explicitly enabled and eligible providers.
- [ ] Stream URL validation blocks unsafe schemes and private-network targets; redirects and DNS rebinding are addressed where server-side resolution is introduced.
- [ ] A clean release build, privacy notice, attribution, permissions review, crash handling, and device QA are complete.

## Non-goals for this migration change

This change does not promise a broad library of commercial streaming sources, all-country availability accuracy, DRM handling, account sync, or a fully verified player. Archive licence metadata is uploader-supplied and must not be treated as independently verified legal status. Those need separate source-specific and playback tasks with repeatable tests. "Better than every competitor" is a product ambition, not a fact we can verify from a scaffold; measurable quality gates are used instead.

## Rollback / coexistence

The current Kotlin app is retained as an independent reference under `android-app/`; the migration does not delete the Kotlin aggregation core, research documents, existing Kotlin Media3 player probe, or JS prototype. If Capacitor cannot satisfy playback/accessibility/performance gates, the team can reuse the native player or revisit a hybrid UI/native-player split without losing the previous evidence.
