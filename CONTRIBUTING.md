# Contributing to 7xCinema

Thank you for helping build 7xCinema. The project is currently in planning and research; contributions should strengthen the product foundation before introducing avoidable complexity.

## Before making a change

1. Read [README.md](README.md), [requirements](docs/REQUIREMENTS.md), and the relevant architecture/provider document.
2. Check the research register and decision log for existing findings.
3. For architecture or dependency changes, document alternatives, evidence, licence implications, and trade-offs before implementation.
4. Keep the scope focused and preserve the product principles: one-search aggregation, source provenance, language accuracy, and provider isolation.

## Provider contributions

Before adding an integration, create or update a research-register entry. Review the code and licence, access method and terms, maintenance, supported capabilities, known regions, and security risks. Then define the adapter contract, error mapping, language evidence model, tests, and verification status.

Do not mark an integration stable based only on a successful HTTP request or a README claim. See [PROVIDER_SYSTEM.md](docs/PROVIDER_SYSTEM.md).

## Code quality

Once the stack is selected:
- follow the project's formatter and lint rules;
- use typed domain models and errors;
- keep provider-specific logic inside its adapter;
- bound network requests, concurrency, payload sizes, and retries;
- test both success and failure paths;
- avoid hard-coded language lists where metadata can be modelled properly;
- preserve title/version/source identity through the playback path;
- document user-visible behaviour and known limitations.

## Security and privacy

Never commit credentials, signed URLs, cookies, personal data, or private configuration. Provider responses and URLs are untrusted. Do not add DRM circumvention, access-control bypasses, CAPTCHA evasion, credential theft, or unrestricted proxy functionality. Follow [SECURITY.md](docs/SECURITY.md).

## Documentation expectations

Update the related requirements, architecture, research register, roadmap, or decision log when behaviour or assumptions materially change. Mark assumptions as assumptions and provide links to evidence. Avoid stating “supports all languages” or “all providers work” without reproducible proof.

## Pull request checklist

- [ ] Scope and motivation are clear.
- [ ] Requirements and docs are updated where needed.
- [ ] Tests cover normal and failure cases.
- [ ] Licence and dependency changes are understood.
- [ ] No secrets or sensitive source URLs are committed.
- [ ] Provider evidence and verification status are recorded.
- [ ] Accessibility, privacy, and error states are considered.
