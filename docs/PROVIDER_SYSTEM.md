# Provider Integration System

## Purpose

Providers are independent integration adapters. The user searches once; the provider gateway coordinates eligible integrations behind the scenes. The core app should not need to know a provider's page structure, API schema, identifier format, or individual quirks.

## 1. Adapter responsibilities

A provider adapter may implement the capabilities it genuinely supports:

- search titles;
- retrieve title details;
- list seasons and episodes;
- provide artwork/metadata claims;
- expose audio-language and subtitle claims;
- resolve a playback candidate using an authorised interface;
- identify a compatible playback transport;
- report structured errors and optional health observations.

A provider may implement only some capabilities. Capability declarations are authoritative for orchestration; unsupported operations should return a typed unsupported-capability result, not an ambiguous empty list.

## 2. Conceptual contract

```text
ProviderAdapter
  id() -> StableProviderId
  displayInfo() -> ProviderDisplayInfo
  capabilities() -> Set<Capability>
  search(query, filters, cancellation) -> ProviderSearchResult
  details(providerItemId) -> ProviderDetailsResult
  episodes(seriesOrSeasonId) -> EpisodeListResult       [optional]
  resolve(providerItemId, episodeId?, preference) -> PlaybackResolutionResult [optional]
  healthCheck() -> ProviderHealthResult                  [optional]
```

Exact types, async model, runtime, and interface language remain open until the architecture spike.

Every method needs a timeout, cancellation semantics where supported, typed errors, bounded resource consumption, and redacted diagnostics.

## 3. Normalised response requirements

Each result should retain:
- stable provider ID and provider item ID;
- reported title and aliases;
- media type, release year, season/episode identity where available;
- source URL or playback reference only where permitted and needed;
- source of each metadata claim;
- retrieval timestamp and confidence;
- supported quality, transport, audio/subtitle capabilities, and known restrictions;
- a provider-specific opaque identifier for troubleshooting when safe.

The aggregator must not discard raw provenance when normalising data. Raw provider payloads should not be stored indefinitely; fixtures used in tests must be minimal and redacted.

## 4. Provider registration and eligibility

Each integration should have a registry entry containing:
- stable ID, display name, adapter version, maintainer/ownership;
- repository/interface reference;
- supported capabilities;
- allowed regions or other known constraints;
- legal/terms review state;
- required credentials and secure configuration keys, if any;
- rate limits and concurrency policy;
- cache rules;
- test coverage and last verification date;
- maturity state: research, experimental, beta, stable, disabled, or retired.

A provider should not be enabled in production merely because code exists. It must pass the project’s source-eligibility review and test gate.

## 5. Lifecycle and reliability

Suggested lifecycle:
1. **Discovered:** found during research; no assumption of functionality.
2. **Inspected:** implementation and licence reviewed.
3. **Eligible:** access method and terms reviewed; security risks documented.
4. **Prototype:** adapter works against test fixtures and a lawful test path.
5. **Verified:** end-to-end tests confirm expected response and playback behaviour.
6. **Stable:** sufficient monitoring, documentation, and maintainership exist.
7. **Degraded/disabled:** repeated failures or an upstream change reduces availability.
8. **Retired:** removed safely after breakage, permission changes, or abandonment.

Health checks should be low-cost and respect rate limits. A healthy homepage/API does not prove every title resolves or plays. Maintain separate measures for search availability, detail availability, resolution success, and playback startup.

## 6. Concurrency, retries, and rate limits

- Use bounded concurrency globally and per provider.
- Apply request deadlines and cancellation.
- Use exponential backoff with jitter only for retryable transient failures and within provider rules.
- Respect explicit rate-limit responses and Retry-After when provided.
- Do not retry access-denied, invalid-credential, or unsupported-content errors indefinitely.
- Avoid duplicate work using in-flight request coalescing where appropriate.
- Ensure one slow or hostile adapter cannot exhaust shared memory, threads, or sockets.

## 7. Failure isolation

Catch and classify adapter errors at the boundary. One provider's malformed JSON, timeout, TLS error, or empty result must not poison all other results. Keep enough redacted evidence to diagnose it. Avoid silently replacing an error with an empty result because that makes coverage appear better than it was.

## 8. Security requirements

- Treat provider metadata, URLs, HTML, redirects, MIME types, and subtitle files as untrusted.
- Validate schemes and destinations; block private/loopback/link-local infrastructure targets when resolving external URLs unless a narrowly controlled local flow explicitly requires them.
- Prevent SSRF and unrestricted proxying.
- Do not execute scripts from provider pages in privileged app contexts.
- Do not bypass authentication, DRM, access restrictions, CAPTCHAs, or technical protections.
- Never embed service credentials or private API keys in a public client.
- Redact signed URLs, cookies, auth headers, and tokens from logs and crash reports.
- Review licences, provider terms, rights, region restrictions, and takedown requests.

## 9. Provider test contract

Every adapter should provide:
- deterministic tests with redacted fixtures;
- normal search, empty result, malformed result, timeout, rate-limit, and upstream-failure tests;
- capability-declaration tests;
- title and language provenance tests;
- resolver tests where resolution is implemented;
- integration evidence dated and labelled by network/region;
- a documented disable/retirement procedure.

## 10. Adding an adapter

Before adding a provider:
1. create a research-register entry;
2. inspect source, licence, terms, and maintenance;
3. declare scope and capabilities;
4. define normalized mapping and error mapping;
5. implement with bounded networking and secure logging;
6. add deterministic tests;
7. test the authorised end-to-end path;
8. document verification date and known limitations;
9. enable only after review.
