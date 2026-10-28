# 7xCinema — Product Vision

## 1. The vision

7xCinema should deliver a cohesive, MovieBox-style discovery and playback experience while handling multiple independent provider integrations internally. The user should not have to know which provider carries a title or manually repeat searches across sources.

**North-star statement:** One search, one unified catalogue, all discoverable and verifiable compatible options.

This is a product direction, not a promise that every title or language can always be found. Availability depends on the providers, rights, territories, network, and playback formats available at the time of a search.

## 2. The problem

A single catalogue or provider can be incomplete, unavailable, or missing a preferred language. Separate providers may expose different seasons, episodes, versions, metadata, audio tracks, subtitles, and playback methods. Searching each independently creates duplicated results and makes users do provider-selection work.

7xCinema coordinates provider responses, reconciles matching titles, makes language availability understandable, and helps the user select a playable option.

## 3. Core user outcomes

A user should be able to:

1. Search a title once and receive results from all enabled, eligible providers.
2. See useful results before the slowest provider has responded.
3. Open one logical title with relevant seasons, episodes, alternate cuts, and available sources organised clearly.
4. Understand whether a language is an embedded audio track, a separate dubbed version, or a subtitle.
5. Prefer a language and have the app prioritise compatible sources that genuinely offer it.
6. Start playback and, when a source fails, automatically try a compatible alternative where safe and appropriate.
7. Understand why a source failed without needing to understand the provider architecture.
8. Use favourites, history, and continue-watching features without losing source provenance.

## 4. Product principles

### Search broadly, report honestly
Search every enabled provider allowed for the request. Show partial results and disclose when some providers time out or are unavailable. Never imply that the search covered sources it did not query.

### One logical title, many source options
Deduplication must not discard legitimate differences such as theatrical/director's cuts, remasters, regional edits, seasons, episodes, language versions, or different release packages.

### Language is first-class metadata
Represent audio tracks, standalone dubbed files, subtitles, and unverified provider claims as distinct things. Keep the source and confidence for each claim.

### Playback quality is more important than raw source count
Rank sources using evidence such as resolution, supported format, language fit, availability, latency, and recent success rate. Don't inflate the result with stale or unverifiable links.

### Providers are replaceable
Provider-specific code belongs behind adapters. Provider outages or upstream changes should not require rewriting the catalogue, UI, or player.

### Privacy and responsible access by default
Use authorised integrations; respect licences, terms, regional rules, and access controls. Minimise retained personal data and protect all credentials and provider tokens.

## 5. Primary audience and use cases

- Viewers who want one search across multiple authorised catalogues.
- Viewers who prefer Hindi, Bengali, Tamil, Telugu, or other audio languages.
- Viewers who want subtitles or the original audio.
- Viewers of series who need season and episode completeness.
- Developers maintaining provider adapters independently from the app.

## 6. In scope

- Multi-provider search and detail lookup.
- Title/season/episode reconciliation and deduplication.
- Aggregated audio and subtitle availability with source provenance.
- Source ranking, playback hand-off, compatible-source retries, and meaningful error states.
- Provider health and capability reporting.
- Local preferences such as preferred language, favourites, search history, and continue watching, subject to a privacy review.
- Automated tests and research documentation.

## 7. Out of scope for the first milestone

- Guaranteeing access to every title, region, provider, or language.
- Building or hosting a catalogue of unauthorised copyrighted streams.
- DRM circumvention, credential theft, access-control bypass, or evasion of provider restrictions.
- Re-encoding or merging different providers' video files to manufacture a single stream.
- An account/social network system before the core search and playback experience is proven.
- Committing to a specific mobile framework or backend before a technical spike.
- Downloads, casting, multi-device sync, and advanced recommendation models before core reliability is measured.

These items may be reconsidered only through explicit product and security decisions.

## 8. Experience principles

- Use a strong cinematic home screen, clear title pages, season/episode navigation, and a player with familiar controls.
- Make language choice visible before playback where source information is known.
- Keep provider technical details out of the default path; expose source details in a useful “source options” view.
- Prefer immediate, progressive feedback over a blank screen while multiple providers are queried.
- Provide retry, alternate source, and clear recovery actions rather than a transparent overlay that does nothing.
- Do not announce a source as “working” until a defined health/playback check supports that claim.

## 9. Success measures

Track these with privacy-preserving, aggregate telemetry only if telemetry is adopted with clear user choice and a retention policy:

- Search coverage: enabled providers attempted / eligible providers intended.
- Useful-result rate: searches that return at least one valid, non-duplicate title.
- First-result latency and time to settled results (p50/p95).
- Provider timeout and error rates.
- Duplicate false-positive and false-negative rates from a labelled evaluation set.
- Language-claim precision: advertised language matches verified source/track evidence.
- Playback-start success and time to first frame for each supported playback mode.
- Fallback recovery rate after a genuine source failure.
- Crash-free sessions and accessibility/usability issue counts.

Avoid logging full search histories, stream URLs, signed tokens, cookies, or personally identifiable data by default.

## 10. What success looks like

A user searches once, sees a coherent catalogue entry assembled from available providers, can tell which audio/subtitle options are actually offered, chooses a compatible option, and either starts playback or receives a useful explanation plus sensible alternatives. A failure in one provider remains a provider-level failure—not an application-wide failure.

## 11. Status and assumptions

This document captures the agreed direction. The app is at the planning/research stage. Framework, provider execution location, exact sources, and detailed UI remain open decisions until repository and capability research is complete.


## 12. Coverage without false promises

“Don't miss content” means maximising discovery across eligible catalogues and showing verified compatible options; it does not mean promising 100% global availability. A title may be discoverable but not playable in-app.

7xCinema should reason about three complementary layers:
1. **Discovery:** identify titles, seasons and episodes across catalogue sources.
2. **In-app playback:** identify permitted, compatible playback candidates and verified audio/subtitle capabilities.
3. **Official destination:** when internal playback is unavailable, optionally show a validated official provider destination or availability offer.

The UI must not label an official destination as a playable stream or claim a language exists just because a different source has it. Measure discovery, playback and destination coverage separately.
