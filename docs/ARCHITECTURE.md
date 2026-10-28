# 7xCinema — Proposed Architecture

## Status

This is a logical architecture, not a final framework choice or implementation specification. The first technical spike must compare feasible options and amend this document with evidence.

## 1. High-level flow

```text
Mobile UI
  ├── Home / Search / Title details / Episode picker
  ├── Language preferences / Library / Player
  └── Loading, partial-result, error and recovery states
            │
            ▼
Application Facade / Use Cases
  ├── Search coordinator
  ├── Catalogue and detail coordinator
  ├── Language aggregation
  ├── Source ranking and playback coordinator
  └── Local preferences and history
            │
            ▼
Provider Gateway
  ├── Provider registry and capability declarations
  ├── Bounded parallel execution / timeout / cancellation
  ├── Normalisation and provenance
  ├── Health metrics / cache
  └── Provider adapters
       ├── Adapter A
       ├── Adapter B
       └── Adapter N
            │
            ▼
External APIs / permitted provider interfaces

Playback coordinator ──► compatible native player or authorised embed hand-off
Metadata layer ────────► approved metadata API(s)
```

## 2. Architectural boundaries

### UI layer
Renders application state and forwards user intent. It must not contain provider-specific scraping/parsing logic or make direct assumptions about provider URL structures.

### Application/use-case layer
Implements user journeys: universal search, details, episode selection, language preference, source selection, playback start, and failure recovery.

### Domain models
Define stable concepts such as `MediaTitle`, `Season`, `Episode`, `ProviderSource`, `AudioOption`, `SubtitleOption`, `PlaybackCandidate`, and typed provider errors. Domain models should not expose provider-specific response shapes.

### Provider gateway
Owns registration, capability checks, concurrency limits, timeouts, cancellation, cache policy, health observations, provider result normalisation, and error isolation.

### Provider adapters
Translate a provider's documented, authorised interface into domain models. Parsing, provider-specific identifiers, and supported capabilities remain within the adapter. An adapter must not be allowed to weaken global security controls.

### Playback coordinator
Chooses a compatible candidate, prepares headers or session context only when legitimately required, invokes the selected playback integration, observes startup outcome, and attempts policy-approved fallbacks.

### Persistence
Start with the minimum persistent data required: preferences, favourites/history if approved, cache, and possibly provider settings. Define retention and deletion behaviour before storing sensitive data or telemetry.

## 3. Candidate execution models

The team must compare these approaches instead of prematurely choosing one:

1. **In-process provider adapters:** simpler deployment where runtimes, libraries, network rules, and licences permit.
2. **Local companion service:** an on-device service exposes a typed local API to the mobile UI. This may reuse suitable Rust components but requires Android lifecycle, packaging, port binding, and cross-compilation validation.
3. **Remote backend:** useful only where provider terms, security, operating costs, and data handling permit. Requires authentication, rate limiting, abuse prevention, observability, and clear responsibility for requests.
4. **Standardised external integration protocol:** consume compatible documented addon/API responses through adapters without equating the protocol itself with a content source.

A technical decision must consider framework maturity, Android ARM64 support, maintenance, licence, performance, user privacy, deployment complexity, and source permissions.

## 4. Universal search sequence

1. Validate and normalise the query; identify supported filters.
2. Snapshot the enabled provider registry and its capabilities.
3. Start eligible provider searches concurrently with bounded concurrency and per-provider timeouts.
4. Emit initial and incremental results as adapters finish.
5. Normalize titles, identifiers, seasons, episodes, language claims, and source references.
6. Deduplicate only when matching confidence passes a defined threshold; preserve ambiguous results separately.
7. Aggregate metadata and language information while keeping provenance.
8. Rank title groups for discovery and rank playback sources separately.
9. Return results with a coverage summary (for example, complete or partial) and typed provider status.
10. Cancel in-flight work when the user cancels or starts an incompatible new search.

Provider responses must be isolated: malformed output from one adapter cannot invalidate the whole search result.

## 5. Illustrative domain shapes

These are conceptual examples, not final language-specific code.

```text
MediaTitle
  canonicalId
  mediaType: movie | series | season | episode
  displayTitle
  aliases[]
  year?
  artwork[]
  metadataClaims[]
  sourceReferences[]
  children[]                 // seasons / episodes as appropriate

ProviderSource
  providerId
  providerItemId
  titleId
  episodeId?
  versionIdentity?
  capabilities[]
  languageClaims[]
  playbackCandidates[]
  lastObservedAt

AudioOption
  kind: embeddedTrack | separateDubVersion | unknown
  languageTag?
  displayName?
  evidence: verified | providerClaim | inferred | unknown
  providerSourceId
  selectableAtPlayback: true | false | unknown

SubtitleOption
  languageTag?
  format?
  kind: embedded | external | providerClaim
  evidence
  providerSourceId

PlaybackCandidate
  providerSourceId
  mediaVersionId?
  transport: directFile | hls | dash | authorisedEmbed | unknown
  quality?
  headers/sessionRequirement?  // secrets must be handled securely and never logged
  compatibility
  healthEvidence
```

The production schema must define stable IDs, nullable fields, language-tag conventions, provenance, and migration/versioning rules before implementation.

## 6. Caching and freshness

Use bounded caches with explicit expiry for metadata/search results and provider health. Avoid caching signed playback URLs, cookies, or authentication tokens beyond what a provider legitimately requires. Cache keys must include relevant query/filter/provider-version inputs. Support invalidation after provider changes and avoid treating cached availability as proof of current playback.

## 7. Error model

Use typed failures such as:
- unsupported capability;
- provider timeout;
- rate limited;
- upstream unavailable;
- malformed response;
- no result;
- source resolution failed;
- incompatible playback format;
- blocked/unauthorised access;
- playback startup failed;
- user cancelled.

Retain detailed internal diagnostics in a redacted form while presenting user-friendly messages.

## 8. Observability

Collect the minimum data needed to diagnose quality: timings, provider result counts, error categories, matching confidence, and playback outcomes. Do not log full stream URLs, signed query parameters, cookies, credentials, or personal viewing history by default. If user analytics are introduced, document opt-in/opt-out, retention, and deletion.

## 9. Architecture gates

Do not lock the framework until:
- the leading candidates have been inspected in code;
- licences and maintenance signals are understood;
- one provider adapter can be exercised in a prototype;
- Android packaging and playback are demonstrated;
- the alternatives and trade-offs are recorded in the decision log.
