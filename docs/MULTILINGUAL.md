# Multilingual Audio and Subtitle Model

## Goal

7xCinema should maximise discoverable language options without falsely claiming that a video contains a track it does not contain. Language availability must be aggregated across matching provider sources while preserving how each claim was obtained.

## 1. Keep these concepts separate

### Embedded audio track
An audio stream available inside a particular media asset. It is selectable only if its player/source exposes the track or the file can be inspected reliably.

### Separate dubbed version
A separate video asset whose audio is dubbed into another language. It is an alternative playback candidate, not an embedded audio track.

### External subtitle
A separate subtitle resource associated with a media asset, with a language and format where known.

### Embedded subtitle track
A subtitle stream contained inside the media asset. Its actual availability depends on the media format and player integration.

### Provider language claim
A label reported by a provider or filename (for example, “Hindi”). It may be correct, incomplete, or misleading; the UI should not present it as verified until evidence supports that.

### Inferred language
A guess from title text, country, cast, release region, or other indirect data. This is low-confidence and must never be shown as confirmed availability.

## 2. Language representation

Use standard language tags, preferably BCP 47 (for example, `en`, `en-GB`, `hi`, `bn`, `ta`, `te`, `ja`). Preserve the provider's original display label separately for diagnostics. Do not assume country equals language or collapse regional variants without a deliberate normalisation rule.

If a language cannot be determined, store it as unknown instead of guessing.

## 3. Suggested option fields

Each audio/subtitle claim should include:
- `kind`: embeddedTrack, separateDubVersion, externalSubtitle, embeddedSubtitleTrack, providerClaim, or unknown;
- `languageTag`: nullable normalized language tag;
- `displayLabel`: original/provider label if useful;
- `evidenceLevel`: verified, providerClaim, inferred, unknown;
- `evidenceMethod`: track metadata, trusted API metadata, provider label, filename, or other reviewed method;
- `providerId` and `providerItemId`;
- `mediaVersionId` or asset identity when known;
- `playerSelectable`: yes, no, or unknown;
- `lastVerifiedAt` and optional expiry;
- optional quality/format/codec details when actually observed.

Do not merge claims that refer to different assets as though they were one audio track.

## 4. Aggregation example

Assume the same verified title has three source records:
- Source A claims English audio.
- Source B provides a Hindi-dubbed separate version.
- Source C exposes English and Bengali tracks in its media metadata.

The title page may show:
- English — embedded track on Source C; English source on Source A.
- Hindi — separate dubbed version on Source B.
- Bengali — embedded track on Source C.

Each option links to its source and confidence. The title-level language summary is a union of the options, not an assertion that every provider or every file supports every language.

## 5. Ranking a language preference

When a user prefers a language, rank candidates approximately in this order:
1. verified selectable audio track in the preferred language;
2. verified separate dubbed version in the preferred language;
3. source with reliable provider metadata for that language;
4. unverified language claim, labelled as uncertain and optionally deprioritised.

The order may be adjusted by the user. Compatibility, rights, availability, quality, and recent success are also relevant. Preferred-language matches should not cause an incompatible or unverified stream to be treated as playable.

Subtitle preference is independent from audio preference. A user may want Japanese audio with English subtitles, for example.

## 6. User interface labels

Use explicit labels such as:
- “Audio tracks: English, Japanese” only when evidence supports tracks inside that asset;
- “Hindi dubbed version available” when a separate source is responsible;
- “Subtitles: Bengali (external)” when appropriate;
- “Language reported by source; not verified” where uncertainty matters.

Do not use a universal badge such as “Hindi available” if the only evidence is an unverified inference. A compact UI may summarise languages but should offer source-level details.

## 7. Player integration

The player must report actual selectable tracks when supported. Do not fabricate track menus from title-level aggregates. A separate dubbed version must be resolved as a different candidate. External subtitles must be validated for format, encoding, size, and matching title/version before loading.

If the player cannot select an embedded audio track, explain that the user can select another available dubbed version instead.

## 8. Testing

Tests must cover:
- duplicate language claims from multiple providers;
- conflicting language claims;
- unknown language labels;
- regional language tags;
- separate dubbed versions vs embedded tracks;
- one source supporting a language while another does not;
- stale language claims;
- subtitle/audio preference independence;
- no false selectable-track claim when playback capability is unknown.


## 9. Subtitle API integration policy

Subtitle discovery is an independent capability. A subtitle search result must not be presented as an audio dub, and the existence of a subtitle file does not prove the video has a corresponding audio track.

An eligible external subtitle adapter should return (where available): title/episode ID, language tag, format, source/provider, release/file-name or hash match, download reference, evidence level, and retrieval time. Validate the returned file type, encoding and size before loading; handle temporary links and redirects securely, and never log signed download URLs or keys.

### Candidates to evaluate
- [OpenSubtitles.com REST API](https://ai.opensubtitles.com/api-docs): current official API for subtitle search, with application API key and documented limits. Do not use legacy OpenSubtitles.org XML-RPC integrations; an official January 2026 notice announced its shutdown/migration.
- [Wyzie Subs](https://docs.wyzie.io/subs/intro): key-based subtitle aggregation API, subject to its published terms and quota. Its terms expressly prohibit use that facilitates copyright infringement/unauthorised distribution or bypasses technical controls.

Before enabling either, confirm current terms, quota, caching/download and attribution conditions, exact version-match quality, and that 7xCinema's intended subtitle use is permitted. Keep provider code behind the subtitle adapter interface so the choice remains replaceable.
