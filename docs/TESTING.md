# Testing Strategy

## Purpose

Testing must distinguish the health of the user interface, search aggregation, individual providers, language claims, source resolution, and actual playback. A passing unit test or HTTP status code alone must not be reported as proof that a provider can stream a specific title.

## 1. Test layers

### Unit tests
- query normalisation;
- title matching and deduplication;
- metadata conflict resolution;
- BCP 47 language normalisation;
- separation of embedded audio, dubbed versions, and subtitles;
- source ranking;
- provider error classification;
- fallback eligibility and loop prevention.

### Contract tests
Every provider adapter must satisfy shared contract cases for search, capability declaration, typed failures, timeouts, malformed responses, and provenance. Use deterministic, minimal, redacted fixtures.

### Orchestration tests
Use fake providers to simulate:
- multiple fast providers;
- one slow provider;
- timeout and cancellation;
- empty results;
- malformed data;
- rate limiting;
- duplicate/conflicting titles;
- a provider that fails while others succeed.

Assert partial results, result ordering policy, status reporting, and isolation.

### Integration tests
Use only approved test endpoints or provider-supported test paths. Record date, region/network, release/commit, and exact test method. Keep live integration tests opt-in where rate limits or flakiness make normal CI inappropriate.

### Player tests
Use known test media and authorised assets to test direct file, HLS/DASH when supported, unsupported formats, startup failure, audio/subtitle track reporting, resume, and fallback.

### UI/device tests
Test on real Android devices and representative screen sizes. Include lifecycle changes, network loss, back navigation, rotation where relevant, app background/foreground, slow network, and error recovery.

## 2. Core regression scenarios

1. Search fans out to all eligible enabled fake providers.
2. One provider timeout does not hide results from healthy providers.
3. Search clearly indicates incomplete coverage when one provider failed.
4. Duplicate movie entries merge with all provider sources retained.
5. Same-name titles from different years remain separate unless evidence supports matching.
6. Seasons and episodes do not collapse into the series record.
7. A language from Source B is not falsely assigned as a track of Source A's file.
8. Preferred language ranks the correct source while preserving alternatives.
9. A failed first source triggers one compatible fallback.
10. User cancellation and non-retryable permission failures do not initiate endless retries.
11. A title page with missing artwork or metadata still loads.
12. The Watch button transitions into a real resolving/preparing/player state and cannot remain stuck behind a transparent overlay.
13. Signed URLs, cookies, and tokens never appear in logs.
14. Malicious redirects and arbitrary internal URLs are rejected by network-safety tests.

## 3. Quality measurements

Maintain a test dataset with adjudicated expected matches. Track:
- deduplication precision and recall;
- language claim precision by evidence class;
- source resolution success;
- playback startup success;
- startup latency and provider response time;
- fallback recovery rate;
- test flake rate.

Always state sample size and test environment when publishing these numbers.

## 4. CI approach

After the framework is selected, add reproducible formatting, linting, static analysis, unit/contract tests, dependency checks, and build verification. Keep external provider integration checks separate from deterministic pull-request tests. Do not put private credentials in CI logs or fixtures.

## 5. Definition of verified provider

A provider can be called **search-verified** only when searches produce expected structured results in a dated test. It can be called **resolve-verified** only when a source resolves using the intended supported flow. It can be called **playback-verified** only when an authorised test candidate starts in the target player under a documented environment. These labels are not interchangeable.
