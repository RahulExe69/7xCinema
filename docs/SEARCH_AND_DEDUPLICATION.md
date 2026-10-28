# Universal Search and Deduplication

## Goal

A single user query fans out to eligible providers, combines results into a useful catalogue, and preserves the differences that matter. The system must prefer a small number of correct groups over an aggressive merge that hides the wrong movie or episode.

## 1. Search orchestration

1. Normalise whitespace and basic punctuation without destroying meaningful words or non-Latin characters.
2. Determine query type only when evidence is strong; otherwise search the general catalogue.
3. Select enabled, eligible providers by capability and constraints.
4. Dispatch requests concurrently using bounded concurrency, individual deadlines, and cancellation.
5. Publish results incrementally; do not wait for every provider before showing useful content.
6. Normalise metadata and retain the original title, provider IDs, aliases, and provenance.
7. group high-confidence duplicate records, preserve ambiguous cases, and aggregate source/language claims.
8. Rank groups independently from playback candidates.
9. Indicate whether results are complete, partial, cancelled, or affected by provider errors.

## 2. Matching signals

Matching may consider:
- stable third-party IDs when reliable and semantically compatible;
- normalized original title and alternate titles;
- media type;
- release year/date within a reviewed tolerance;
- season and episode number;
- runtime/duration when available;
- original language and country as supporting—not conclusive—signals;
- edition/cut/remaster identifiers;
- provider identifier relationships already verified.

No single fuzzy string score should be the only criterion. Transliterations, translated titles, sequel numbering, regional titles, and punctuation can produce false matches.

## 3. Safe merge rules

- Exact trusted IDs can be strong evidence only when the ID type and media type are known.
- Movies and series must not merge with each other.
- Episodes must retain series, season, and episode identity.
- Same title but different year should usually remain distinct until corroborated.
- Theatrical, extended, director's cut, remaster, or regional edition labels should remain distinguishable where evidence exists.
- A provider's “season pack” is not an episode itself.
- Duplicate artwork or similar filenames are weak evidence by themselves.
- When confidence is below a tested threshold, keep separate results and mark them as possible matches rather than merging them silently.

## 4. Canonical identity

Use an internal canonical ID independent of a provider's ID. Store source records beneath it. Do not treat a title's display name as its unique ID. If a trusted external metadata identifier is used, store namespace and value separately.

A canonical grouping should be reversible: the system must retain each source record and metadata claim so future matching improvements can split or regroup results without losing provenance.

## 5. Metadata conflict resolution

Do not choose the first provider's field blindly. For each field:
- retain the original per-provider claim;
- prefer a reviewed authority/source policy where appropriate;
- consider freshness and confidence;
- preserve disagreements if no clear winner exists;
- never invent a missing value to make a card look complete.

Display title selection may depend on user language and available title data, while the original title should remain discoverable.

## 6. Ranking title groups

Title-discovery ranking can consider query relevance, exact title match, original/alternate titles, year match, media type, popularity data from a permitted source, metadata completeness, and duplicate confidence. Avoid equating provider count with title relevance.

Source ranking is a separate policy described in [PLAYBACK.md](PLAYBACK.md).

## 7. Performance

- Cache search/metadata responses using explicit TTLs.
- Coalesce identical in-flight queries when safe.
- Limit provider concurrency and response body sizes.
- Cancel obsolete requests when search text changes.
- Keep UI state for loading, partial, complete, empty, and error outcomes distinct.
- Avoid repeatedly re-fetching provider details for each row when existing verified metadata is sufficient.

## 8. Test dataset

Maintain a small curated, rights-appropriate fixture set covering:
- exact duplicates;
- translated/transliterated titles;
- same-name movies from different years;
- movies vs series with similar names;
- sequel/subtitle variations;
- same-series episodes with differing numbering conventions;
- separate cuts/editions;
- conflicting metadata;
- partial failures/timeouts.

Measure both false-positive merges (unrelated items merged) and false-negative splits (same item shown more than once). False positives are especially damaging because they can make users play the wrong item.
