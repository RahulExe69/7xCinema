# 7xCinema — Product Requirements

This is the initial requirements baseline. Items marked **MVP** are expected for the first end-to-end proof of concept. Later requirements should be accepted through a decision-log update.

## 1. Search and discovery

### FR-SEARCH-01 — Universal search (MVP)
A user submits one query. The orchestration layer concurrently queries every enabled provider that supports the query and is permitted for the request.

**Acceptance:** No provider picker is required for a normal search. Tests prove that one query fans out to multiple fake providers and returns their results.

### FR-SEARCH-02 — Partial results (MVP)
Fast provider results may appear before slow providers complete. Each provider request has a timeout and supports cancellation where feasible.

**Acceptance:** A timed-out provider does not block successful results from other providers; the UI distinguishes loading, partial, complete, and failed search states.

### FR-SEARCH-03 — Search normalisation (MVP)
Normalise query whitespace and safe matching fields, while preserving the user's original query for display. Handle alternate punctuation, transliteration, and common title aliases where evidence supports them.

### FR-SEARCH-04 — Filters and sort
Allow supported filters such as media type, release year, genre, and preferred audio language. A provider that cannot honour a filter must not silently pretend it did.

## 2. Catalogue and title reconciliation

### FR-CATALOG-01 — Unified title (MVP)
Results believed to describe the same logical work should be grouped into one title with multiple source records.

### FR-CATALOG-02 — Preserve distinctions (MVP)
Do not merge results solely because title strings are similar. Preserve different seasons, episodes, cuts, editions, remasters, and release years when available.

### FR-CATALOG-03 — Provenance (MVP)
Each piece of provider-originated metadata records its origin and, where practical, retrieval time and confidence.

### FR-CATALOG-04 — Details and episodes
Show title details, available seasons and episodes, synopsis, year, artwork, and cast only when supported by the chosen metadata sources. Missing optional metadata should not break a title page.

## 3. Languages and subtitles

### FR-LANG-01 — Distinct language concepts (MVP)
Represent embedded audio tracks, separate dubbed versions, subtitles, and unverified language claims separately.

### FR-LANG-02 — Aggregate availability (MVP)
Aggregate language options across all matching sources while keeping the source association for every option.

### FR-LANG-03 — Language preference
A user can set preferred audio and subtitle languages. Preferences influence ranking but must not hide other options unless the user explicitly enables a filter.

### FR-LANG-04 — Evidence and confidence (MVP)
Distinguish verified track metadata from provider labels and inferred claims. Do not label an audio track selectable unless the player/source exposes that track.

### FR-LANG-05 — Graceful missing data
If language metadata is absent or unverified, show “not specified” or an uncertainty indicator rather than inventing availability.

## 4. Source ranking and playback

### FR-PLAY-01 — Source list (MVP)
Each title/episode can present its compatible sources, quality, language evidence, format, and source status to the extent known.

### FR-PLAY-02 — Deterministic ranking (MVP)
Rank compatible sources using explainable factors such as preferred language, verified availability, playback compatibility, resolution, latency, recent success, and provider health. User preference must be able to override the default.

### FR-PLAY-03 — Playback hand-off (MVP)
The Watch action must trigger a real resolution/playback flow and provide explicit loading, success, failure, and recovery states.

### FR-PLAY-04 — Safe fallback (MVP)
On a confirmed failure before useful playback, try the next compatible source according to policy. Do not switch sources unexpectedly during healthy playback. Preserve playback position only when the next source is confirmed to represent the same title/version and seek semantics are supported.

### FR-PLAY-05 — Format capabilities
Playback support is discovered or configured per source: for example, direct MP4, HLS, DASH, or an authorised embedded-player hand-off. Do not assume every URL is playable by every player.

### FR-PLAY-06 — Meaningful errors
Show a useful final message and the available retry/source choices when no compatible option works. Do not leave a transparent layer, spinner, or overlay indefinitely.

## 5. Provider management

### FR-PROV-01 — Adapter interface (MVP)
Providers implement a shared, typed contract and declare capabilities. Provider-specific parsing stays out of core application code.

### FR-PROV-02 — Independent failure (MVP)
Provider timeouts, malformed responses, and maintenance do not crash the application or suppress other providers' results.

### FR-PROV-03 — Health evidence
Track latency, recent error classes, and last successful response. A health probe must not be confused with proof that a specific stream plays.

### FR-PROV-04 — Configuration
Providers can be enabled or disabled centrally and, if suitable, individually by users. The default path should work without asking the user to manually choose a provider.

### FR-PROV-05 — Provider lifecycle
A provider integration is not promoted to stable until its licence/terms, supported features, tests, failure modes, and maintenance approach are documented.

## 6. User-facing product behaviour

### FR-UX-01 — Home and detail views
Create a polished mobile-first discovery experience with featured titles, trending/popular rows where data sources permit, search, details, and series navigation.

### FR-UX-02 — User library
Favourites, recent searches, watch history, and continue watching may be local-first for the MVP unless a cross-device requirement is later approved.

### FR-UX-03 — Accessibility
Support readable contrast, screen reader labels, focus navigation where relevant, scalable text, and touch targets that work on mobile.

### FR-UX-04 — Network states
Communicate offline state, provider partial failure, and retry actions without blaming the user or masking the app.

## 7. Non-functional requirements

- **Reliability:** A single provider failure must not crash a search.
- **Performance:** Use bounded concurrency, timeouts, caching with expiry, and progressive results.
- **Correctness:** Do not silently fabricate titles, languages, seasons, episodes, or playback capabilities.
- **Security:** Provider output is untrusted; never expose secrets or create an unrestricted proxy.
- **Privacy:** Minimise data collection and retention; document any telemetry before enabling it.
- **Maintainability:** Type-check core models and adapters; isolate provider-specific code.
- **Testability:** Use fake providers and deterministic fixtures for aggregation tests.
- **Portability:** Framework and provider runtime choices must be justified by an implementation spike.
- **Accessibility:** The app must be usable without colour alone conveying state.

## 8. MVP acceptance gate

The MVP is not considered demonstrated until a reproducible test proves:
1. a single query reaches at least two test providers concurrently;
2. partial results appear when one provider is slow or fails;
3. duplicate records are merged while different episodes remain distinct;
4. language options preserve track/version/subtitle distinctions and provenance;
5. Watch triggers a real playback-resolution sequence;
6. a broken source falls back to another compatible test source;
7. unit/integration tests and a documented local build path pass.

Real provider adoption is subject to the research and responsible-access requirements.


## 8. Coverage and official destinations

### FR-COVERAGE-01 — Integration category (MVP)
Every integration declares whether it provides metadata/catalogue results, playable sources, official availability destinations, personal-library content, an interoperability protocol, or live TV.

**Acceptance:** A catalogue-only adapter cannot enable Watch unless a compatible playback source is available separately.

### FR-COVERAGE-02 — Official external destination
If a title has no verified compatible in-app source but an eligible availability integration supplies an official destination, the title page may offer “Watch on [official provider]” or an equivalent external hand-off.

**Acceptance:** The option is clearly external; the destination is validated; it is never represented as an internal stream. Provider, region and freshness information are preserved when supplied.

### FR-COVERAGE-03 — Separate coverage metrics
Track catalogue discovery coverage, verified in-app playable-source coverage, official-destination coverage and language coverage separately.

**Acceptance:** Reports and UI cannot treat metadata or a destination link as proof of playable media.

### FR-COVERAGE-04 — Source identity
Every result/source retains provider identity after deduplication.

**Acceptance:** A title matched across three providers retains all three source records, and resolving a candidate uses its correct provider/item identifier rather than a global current-provider assumption.
