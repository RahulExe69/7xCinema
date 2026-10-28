# 7xCinema

**One search. Multiple catalogues. One cinematic discovery experience.**

7xCinema is an independent media-discovery application designed around one unified search, careful deduplication, source provenance, language accuracy, and trustworthy watch destinations. The primary app shell is now **React + TypeScript + Vite + Capacitor 8**. The previous Kotlin/Compose application remains in the repository as a player-feasibility reference, not the primary UI.

## What exists in the Capacitor app

- A responsive, cinematic interface for Android and web.
- A curated offline starter catalogue so the app opens without an account or API key.
- Parallel search across enabled catalogue adapters, progressive results, provider-level timeout/error isolation, and conservative ID-based deduplication.
- Optional live TMDB multi-search and trending titles when a user configures a TMDB v3 API key.
- Region-aware official watch/rent/buy destinations reported by TMDB.
- A device-local watchlist, title details, genre/kind filters, and settings.
- Optional Jellyfin personal-library integration: server login, secure Android session storage, library browsing, season/episode selection, resume positions, and progress reports from the native player.
- A watch-first flow modelled on 7xAnime: actual direct sources open automatically, title cards have a one-tap Watch action, and manual URL entry is tucked under Advanced.
- A native AndroidX Media3 player bridge with actual audio/subtitle track selection; the web preview uses HTML5 video for compatible direct HTTP(S) media URLs.
- Metadata-only titles offer TMDB-reported official destinations and a real trailer when available, instead of presenting a paste-URL form as the default player screen.
- A first live public-domain/CC0 Internet Archive adapter that searches explicit uploader-declared public-domain metadata and can play a compatible MP4 directly after its item page/licence is exposed for user review.
- Unit tests for deduplication, provenance, partial results, provider errors, and timeouts.
- GitHub Actions that tests the app, builds web assets, generates the Capacitor Android shell, builds a debug APK, and uploads it.

## Project status — migration MVP, not a finished streaming service

The Capacitor app now includes a native AndroidX Media3 player and a watch-first source chooser. Jellyfin playback uses its authenticated library stream and reports progress back to the user's server; the web preview cannot play authenticated Jellyfin streams. Internet Archive is the first public direct-media adapter, gated to uploader-declared Public Domain Mark/CC0 entries, which still require review on the original item page. TMDB supplies catalogue metadata, official destinations and listed trailers—not full movie streams. There is no generic commercial-stream resolver. The app is **not yet production-complete**: authorised external services beyond these integrations still need adapter work, and device-level playback, account/network edge cases, audio/subtitle selection, and resume/progress sync need real-phone validation.

## Run the app

Requires Node.js 22.12+ and, for Android, Android Studio and Android SDK.

```sh
cd capacitor-app
npm install
npm run dev
npm test
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

For a later frontend rebuild, run `npm run android:sync`. See [capacitor-app/README.md](capacitor-app/README.md). The generated Android platform directory is ignored in this migration phase; CI creates a clean native project and uploads the APK artifact.

## Configure live catalogue data

Open **Settings**, enter your own TMDB v3 API key, choose the availability region, and save. The key is stored in the app's local WebView storage. A build-time `VITE_TMDB_API_KEY` is also supported, but any build-time client value is bundled into the app and must be treated as public. Do not include privileged server secrets or access tokens. Review [TMDB's documentation](https://developer.themoviedb.org/docs) and terms/branding requirements before public distribution.

TMDB provides catalogue metadata and reported official destinations—not stream URLs or guaranteed subscription access.

## Architecture and research

- [Capacitor app guide](capacitor-app/README.md) — setup, current app capabilities, build output, and limitations.
- [Capacitor migration decision and remaining gates](docs/CAPACITOR_MIGRATION.md).
- [Universal JavaScript search-core prototype](prototype/aggregation-core/README.md) — framework-neutral proof of concept and tests.
- [Kotlin aggregation core](prototype/kotlin-aggregation-core/README.md) — Kotlin/JVM title grouping, language provenance, bounded fan-out, and timeout isolation.
- [Previous Kotlin/Compose/Media3 feasibility slice](android-app/README.md) — retained reference, not the new primary shell.
- [Product vision](docs/PRODUCT_VISION.md), [requirements](docs/REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), [provider system](docs/PROVIDER_SYSTEM.md), [coverage model](docs/COVERAGE_MODEL.md), [multilingual model](docs/MULTILINGUAL.md), [search and deduplication](docs/SEARCH_AND_DEDUPLICATION.md), and [playback](docs/PLAYBACK.md).
- [Research summary](docs/RESEARCH_SUMMARY.md), [research register](docs/RESEARCH_REGISTER.md), [provider matrix](docs/PROVIDER_MATRIX.md), [technical audit](docs/TECHNICAL_AUDIT.md), [framework comparison](docs/FRAMEWORK_COMPARISON.md), [base repository comparison](docs/BASE_REPOSITORY_COMPARISON.md), and [Android feasibility gate](docs/ANDROID_FEASIBILITY_GATE.md).
- [Roadmap](docs/ROADMAP.md), [decisions](docs/DECISIONS.md), [security and privacy](docs/SECURITY.md), [testing strategy](docs/TESTING.md), [glossary](docs/GLOSSARY.md), and [contribution guide](CONTRIBUTING.md).

The repository's existing research evaluated MovieBox-TUI, NuvioMobile, AIOStreams, FlixQuest, CloudStream, Stremio add-ons, official-source directories, subtitle APIs, and metadata/availability services. Use that evidence before selecting a real integration. A public repository, a responding endpoint, or a provider name in documentation does not by itself establish that its sources are authorised, safe, stable, or appropriate to integrate.

## Product principles

1. Search all configured catalogue adapters in parallel; do not force the user to select a provider first.
2. Merge by strong, shared IDs before considering conservative title/year matching; never erase meaningful edition, season, episode, or media-type differences.
3. Preserve each result's provider provenance and distinguish original-language metadata, separate dubbed versions, subtitles, and player-verified tracks.
4. Prefer working and authorised destinations to inflated source counts.
5. Keep provider failures isolated, give useful progress, and never strand the user behind a spinner.
6. Review provider terms, licensing, privacy, network safety, and regional restrictions before enabling any real integration.

## Responsible use

7xCinema is intended for services and sources the project is authorised to access and present. Do not implement DRM circumvention, access-control bypasses, credential theft, or methods to evade provider restrictions. Respect applicable law, terms, licences, regional restrictions, and takedown requirements. Metadata and provider responses are untrusted input; follow [security guidance](docs/SECURITY.md) before exposing integrations or hosting a backend.
