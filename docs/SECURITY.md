# Security and Privacy Requirements

## 1. Threat model

Provider integrations interact with external APIs, redirects, HTML, metadata, media URLs, subtitles, and occasionally session-specific data. Treat all external responses as untrusted. Potential failures include malformed content, malicious URLs, server-side request forgery (SSRF), open-proxy abuse, credential leakage, excessive resource use, tracking, and supply-chain compromise.

## 2. Network destination safety

- Allow only explicitly supported schemes; reject unexpected protocols.
- Validate DNS resolution and redirects to prevent access to loopback, private, link-local, cloud metadata, and internal network addresses in server-side flows.
- Revalidate redirect destinations and bound redirect count.
- Set connect/read/overall timeouts, response-size limits, decompression limits, and concurrency caps.
- Do not provide a user-controlled arbitrary URL-fetching or proxy endpoint.
- Use an allowlist or a clearly constrained provider destination policy where appropriate.
- Avoid bypassing provider restrictions or anti-abuse controls.

## 3. Secrets and session data

- Never commit API keys, tokens, passwords, cookies, or signed stream URLs.
- Keep privileged credentials on a trusted server or secure platform storage; don't ship secrets in a public mobile bundle.
- Redact authorization headers, cookies, signed URL query values, and session tokens in logs.
- Minimise how long sensitive resolution values are retained.
- Rotate exposed credentials and use least-privilege access.
- Test builds and repository history for accidental secret inclusion.

## 4. Provider output

- Treat title strings, HTML, image links, subtitle files, MIME types, redirects, and media metadata as hostile input.
- Render text safely; do not execute untrusted page script in a privileged WebView context.
- Validate artwork/subtitle size and type, and handle malformed character encodings.
- Avoid unsafe deserialisation and unchecked path/file writes.
- Use a restrictive WebView configuration and no privileged JavaScript bridge for untrusted content.
- Do not open external intents using unvalidated destinations.

## 5. Abuse prevention

Any remote service must have authentication where appropriate, request quotas, concurrency limits, per-provider rate limits, abuse detection, and operational controls. Do not turn a backend into a public proxy for arbitrary URLs or provide unlimited relay for third-party content.

## 6. Privacy

- Prefer local-first preferences and viewing history when feasible.
- Collect no analytics by default until a privacy decision approves the purpose, disclosure, opt-out, retention, and deletion.
- Never log complete search/viewing history, full stream URLs, or personal identifiers by default.
- If user accounts or cross-device sync are proposed, add a separate threat model and data lifecycle plan.
- Provide a way to clear local history/cache and explain what data is stored.

## 7. Legal and source eligibility

Before enabling an integration, document the intended access method, applicable licence and terms, rights to display/stream the content, territorial constraints, attribution obligations, and contact/takedown process. Public code or a public endpoint does not establish permission to redistribute content.

Do not implement DRM circumvention, credential theft, access-control bypass, CAPTCHA evasion, or tools intended to evade a provider's restrictions. If access is denied, report the failure rather than bypassing the restriction.

## 8. Incident handling

If a secret is committed, revoke/rotate it; removing it from the latest file is not enough. If a provider's access terms or rights change, disable the integration while reviewing it. If a vulnerability is found, document scope and mitigation, avoid publishing live secrets/exploits, and release a fix with a clear note.

## 9. Security release checklist

- [ ] Dependency and licence review completed.
- [ ] No secrets in source, logs, builds, or history.
- [ ] External URL and redirect validation tested.
- [ ] SSRF and open-proxy risks reviewed for backend/network features.
- [ ] Resource limits and rate limits configured.
- [ ] Sensitive URL/header redaction tested.
- [ ] WebView and external-intent boundaries reviewed.
- [ ] Data retention and deletion documented.
- [ ] Provider eligibility and terms reviewed.
- [ ] Release artifact and update process verified.
