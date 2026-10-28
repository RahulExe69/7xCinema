# Playback and Source Selection

## Goal

The Watch action must initiate a real, observable playback flow. Search success and URL extraction are not proof that the media will play. The app must model resolution, player compatibility, startup, playback, failure, and recovery as separate states.

## 1. Playback lifecycle

1. User selects a title/episode and optionally a language or source.
2. The playback coordinator gathers candidates associated with the exact title, episode, and media version.
3. Candidates are filtered by permitted access, source status, language preference, player capability, and known restrictions.
4. Candidates are ranked using a transparent policy.
5. The selected provider resolves a candidate through its supported, authorised mechanism.
6. The app validates the resolved result and chooses the appropriate player or authorised embed hand-off.
7. The UI moves through resolving, preparing, buffering, playing, or a typed failure state.
8. A startup failure may trigger a compatible fallback; a healthy active stream must not be switched without user intent.
9. The player reports actual audio/subtitle tracks if supported.
10. If all candidates fail, show a clear message and the remaining source/retry options.

## 2. Candidate compatibility

A candidate can record the following where known:
- media title, episode and version identity;
- source/provider and time last verified;
- transport type, such as direct file, HLS, DASH, or authorised embedded player;
- container, codec, resolution, and audio/subtitle track evidence;
- required headers/session context only when legitimately supplied by the provider;
- player compatibility, region/access constraints, expiry, and recent health outcome.

A URL is not automatically a stream. Validate safe schemes, redirects, response types, and access constraints. Do not expose arbitrary URLs to an unrestricted proxy.

## 3. Source ranking

A configurable default score may consider:
- exact episode/version match;
- preferred language match and evidence level;
- playback compatibility;
- confirmed recent startup success;
- resolution/quality preference;
- response latency and provider health;
- source freshness and expiry risk;
- supported subtitles and other user preferences.

Never use an undocumented “magic score” as the only decision. Record rank reasons that can be translated into useful diagnostics. Rights/access eligibility is a gate, not a score that can be overcome by a high quality rating.

## 4. Fallback rules

Retry another source when there is a genuine, retryable failure such as resolution timeout, expired/invalid source, unsupported format, or startup failure. Respect provider rate limits and retry policies.

Do not blindly retry:
- user cancellation;
- unsupported content;
- permission/access denial;
- invalid credentials;
- a policy or regional restriction;
- a player error that is known to be independent of the source.

Fallback should preserve selected language where possible. Do not replace a Hindi-dubbed source with an English-only source silently. If no matching-language candidate remains, ask or tell the user before switching to another language.

Resume position can carry over only if the next source represents the same title/version and the player can seek reliably. Never jump to a different episode or edition merely because a fallback exists.

## 5. Playback state machine

Expected states:
- idle;
- resolving;
- preparing;
- buffering;
- playing;
- paused;
- recoverable failure;
- trying alternate source;
- exhausted/final failure;
- ended;
- cancelled.

Every transition should be tested. A click handler that displays an overlay without progressing to a state transition is a product defect.

Loading states need deadlines and a recovery action. Repeated failures should not create an infinite loop between the same sources; maintain a per-attempt exclusion list.

## 6. Player integration research

Compare native playback options using evidence:
- supported streaming formats and codecs;
- Android lifecycle/background behaviour;
- audio-track/subtitle selection;
- hardware acceleration;
- error and buffering callbacks;
- safe header/session support;
- app size, maintenance, licensing, accessibility, and integration effort.

Media3/ExoPlayer is a candidate for compatible direct streams, not a universal solution for arbitrary embedded players. A WebView-based fallback must be constrained to authorised content and must not grant untrusted content privileged bridge access.

## 7. Diagnostics and privacy

Internally capture an error category and a redacted provider identifier. Never log signed playback URLs, cookies, bearer tokens, credentials, or full headers. Avoid retaining watch history or stream identifiers in crash analytics without an explicit, reviewed policy.

## 8. Playback acceptance tests

Use local/test fixtures and authorized streams to verify:
- valid direct file, HLS, DASH, and unsupported formats;
- provider resolver success and failure;
- startup timeout;
- one source fails and the next succeeds;
- no fallback when the user cancels;
- preferred-language preservation;
- source version mismatch prevention;
- repeated-source exclusion;
- audio track and subtitle menu correctness;
- Watch action cannot remain stuck in loading/transparent-overlay state.
