# 7xCinema Capacitor App Migration Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with Superpowers TDD and verification gates. Use checkboxes to track completed actions.

**Goal:** Make React + TypeScript + Capacitor the primary 7xCinema app shell while preserving honest search results, official availability links, and a path to native Media3 playback.

**Architecture:** A Vite-built React app runs inside Capacitor Android. A TypeScript search core fans out to independently timed provider adapters and merges stable catalogue IDs while preserving provider provenance. TMDB supplies optional metadata and official watch-destination records; playback remains a separate, explicitly bounded component.

**Tech Stack:** React, TypeScript, Vite, Capacitor 8, Vitest, GitHub Actions, Android SDK, optional TMDB v3 API.

**Spec:** `docs/CAPACITOR_MIGRATION.md`

## Global Constraints
- Capacitor app lives at `capacitor-app/`; legacy native app remains under `android-app/` for reference.
- Use Node.js 22+ for Vite/Capacitor 8 and JDK 21 for CI.
- No committed API key, server secret, access token, or unrestricted relay.
- Metadata and reported language fields must not be treated as verified tracks or playable media.
- Real provider adapters are excluded until their terms/licensing/permissions are reviewed.
- Search providers use independent timeouts and preserve successful sibling results.

## Review Focus
- Invalid/missing TMDB API key — show actionable feedback and retain offline mode.
- One provider timing out or failing — keep successful sibling results.
- Different TMDB IDs or media types — never deduplicate into one item.
- Untrusted media URL — reject non-HTTP(S) schemes and URLs embedding credentials.
- API response has no poster/overview/region provider list — render useful fallbacks, not a crash.

---

### Task 1: App shell and configuration

**Files:** `capacitor-app/package.json`, `capacitor-app/tsconfig.json`, `capacitor-app/vite.config.ts`, `capacitor-app/capacitor.config.ts`, `capacitor-app/index.html`, `capacitor-app/src/main.tsx`.

- [ ] Verify toolchain and TypeScript build in CI.
- [ ] Generate Capacitor Android project in a clean runner, integrate the native Media3 bridge, and build debug APK.
- [ ] Verify external official links use the Capacitor browser path.

### Task 2: Search and catalogue domain

**Files:** `capacitor-app/src/types.ts`, `capacitor-app/src/catalogue.ts`, `capacitor-app/src/core/search.ts`, `capacitor-app/src/core/search.test.ts`, `capacitor-app/src/services/tmdb.ts`.

- [ ] Run tests for deduplication, provenance, progressive results, isolated failures, and timeouts.
- [ ] Verify TMDB key error, no-result, rate-limit, and region-empty states.
- [ ] Review the local catalogue IDs and visual fallback assets.

### Task 3: Responsive discovery UX

**Files:** `capacitor-app/src/App.tsx`, `capacitor-app/src/styles.css`.

- [ ] Validate home, search, movies, series, My List, settings, detail modal, watch-provider destination, web player fallback, and native Media3 player.
- [ ] Verify URL cannot be played before the user presses Load and passes validation.
- [ ] Verify keyboard-only focus, reduced-motion preference, mobile bottom navigation, and narrow viewport layout.

### Task 4: Documentation and release workflow

**Files:** `README.md`, `capacitor-app/README.md`, `android-app/README.md`, `.github/workflows/capacitor-android.yml`, `docs/CAPACITOR_MIGRATION.md`.

- [ ] Ensure README identifies Capacitor as primary shell and labels Kotlin app as historical/reference.
- [ ] Verify clean CI build uploads `7xCinema-Capacitor-Debug`.
- [ ] Keep migration MVP limitations explicit.
- [ ] Review branch and CI before proposing merge.

### Task 5: Native playback and approved sources (follow-up)

**Files:** New Capacitor Media3 plugin sources, its Android build configuration, source adapters, playback tests, and updated docs.

- [x] Add an initial native Media3 playback Activity and audio/subtitle track picker through a local Capacitor bridge.
- [ ] Verify the bridge build and all native behaviour in CI and on a physical Android device.
- [ ] Verify actual audio/subtitle track discovery and selection with authorized local/test assets on a physical device.
- [ ] Add only integrations whose terms, licence, reliability, and source permissions have been reviewed.
- [ ] Do not report the app as production-ready until these end-to-end gates pass.

## Rulings
- **Ruling:** Use TMDB as the first live catalogue integration and point users to TMDB-reported official destinations — because the repository has no authorised resolver/API credentials yet; cost if wrong: a narrower first release until another eligible provider is approved.
- **Ruling:** Keep the old Kotlin/Compose project while changing the primary shell — because it contains useful Media3 evidence and removing it would destroy a rollback/reference path; cost if wrong: temporary repository duplication.
- **Ruling:** Build Android project during CI rather than commit generated Android scaffolding in this phase — because generated files are large and reproducible from Capacitor configuration; cost if wrong: contributors must run `npx cap add android` locally before opening Android Studio.
