const MEDIA_TYPES = new Set(["movie", "series", "episode"]);
const PROVIDER_EVIDENCE = new Set(["provider-metadata", "filename", "subtitle-api", "unknown"]);
const CLAIM_KINDS = new Set(["embedded-audio", "dubbed-version", "subtitle", "reported"]);
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_CONCURRENCY = 4;

export class ProviderTimeoutError extends Error {
  constructor(providerId, timeoutMs) {
    super("Provider timed out");
    this.name = "ProviderTimeoutError";
    this.providerId = providerId;
    this.timeoutMs = timeoutMs;
  }
}

function asCleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normaliseIdentifier(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim().toLowerCase();
  return text || null;
}

export function normaliseTitle(title) {
  return asCleanString(title)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[’']/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function canonicalEpisodeCoordinates(record) {
  if (record.mediaType !== "episode") return true;
  return Number.isInteger(record.seasonNumber)
    && record.seasonNumber >= 0
    && Number.isInteger(record.episodeNumber)
    && record.episodeNumber >= 0;
}

function normaliseExternalIds(externalIds) {
  const output = {};
  if (!externalIds || typeof externalIds !== "object" || Array.isArray(externalIds)) return output;
  for (const [namespace, value] of Object.entries(externalIds)) {
    const key = normaliseIdentifier(namespace);
    const id = normaliseIdentifier(value);
    if (key && id && /^[a-z0-9_-]{1,32}$/.test(key)) output[key] = id;
  }
  return output;
}

function sourceIdFor(providerId, providerItemId) {
  return encodeURIComponent(providerId) + "::" + encodeURIComponent(providerItemId);
}

function normaliseProviderClaim(claim, sourceId) {
  if (!claim || typeof claim !== "object") return null;
  const languageCode = normaliseIdentifier(claim.languageCode);
  const language = asCleanString(claim.language || claim.label || languageCode || "");
  if (!language && !languageCode) return null;

  const requestedKind = CLAIM_KINDS.has(claim.kind) ? claim.kind : "reported";
  // Catalogue adapters cannot certify embedded tracks. That evidence comes from
  // the actual prepared player's track list, via addVerifiedPlayerTracks().
  const kind = requestedKind === "embedded-audio" ? "reported" : requestedKind;
  const evidence = PROVIDER_EVIDENCE.has(claim.evidence) ? claim.evidence : "provider-metadata";

  return {
    languageCode,
    language: language || languageCode,
    kind,
    ...(requestedKind === "embedded-audio" ? { reportedKind: requestedKind } : {}),
    evidence,
    sourceId,
    selectable: false,
    ...(asCleanString(claim.releaseName) ? { releaseName: asCleanString(claim.releaseName) } : {}),
  };
}

function normaliseRecord(provider, record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("Invalid provider record");
  }

  const providerItemId = asCleanString(record.providerItemId || record.id);
  const title = asCleanString(record.title);
  const mediaType = asCleanString(record.mediaType || record.type).toLowerCase();
  if (!providerItemId || !title || !MEDIA_TYPES.has(mediaType)) {
    throw new TypeError("Provider record is missing a valid ID, title, or media type");
  }

  const year = Number.isInteger(record.year) && record.year >= 1800 && record.year <= 2200
    ? record.year
    : null;
  const seasonNumber = Number.isInteger(record.seasonNumber) && record.seasonNumber >= 0
    ? record.seasonNumber
    : null;
  const episodeNumber = Number.isInteger(record.episodeNumber) && record.episodeNumber >= 0
    ? record.episodeNumber
    : null;

  const sourceId = sourceIdFor(provider.id, providerItemId);
  const rawClaims = Array.isArray(record.languageClaims) ? record.languageClaims : [];
  const languageClaims = rawClaims
    .map(claim => normaliseProviderClaim(claim, sourceId))
    .filter(Boolean);

  return {
    sourceId,
    providerId: provider.id,
    providerItemId,
    providerPriority: Number.isFinite(provider.priority) ? provider.priority : 100,
    title,
    alternateTitles: [],
    identityConflict: false,
    normalisedTitle: normaliseTitle(title),
    mediaType,
    year,
    externalIds: normaliseExternalIds(record.externalIds),
    seasonNumber,
    episodeNumber,
    languageClaims,
    ...(asCleanString(record.posterUrl) ? { posterUrl: asCleanString(record.posterUrl) } : {}),
    ...(asCleanString(record.description) ? { description: asCleanString(record.description) } : {}),
  };
}

function dedupeProviderRecords(records) {
  const bySourceId = new Map();

  for (const record of records) {
    const existing = bySourceId.get(record.sourceId);
    if (!existing) {
      bySourceId.set(record.sourceId, record);
      continue;
    }

    const knownYearsConflict = existing.year !== null && record.year !== null && existing.year !== record.year;
    const episodeCoordinatesConflict = existing.mediaType === "episode"
      && record.mediaType === "episode"
      && (existing.seasonNumber !== record.seasonNumber || existing.episodeNumber !== record.episodeNumber);
    let idConflict = false;
    for (const [namespace, value] of Object.entries(record.externalIds)) {
      if (existing.externalIds[namespace] && existing.externalIds[namespace] !== value) {
        idConflict = true;
      } else if (!existing.externalIds[namespace]) {
        existing.externalIds[namespace] = value;
      }
    }

    if (existing.mediaType !== record.mediaType || knownYearsConflict || episodeCoordinatesConflict || idConflict) {
      existing.identityConflict = true;
      existing.year = null;
    } else if (!existing.identityConflict && existing.year === null && record.year !== null) {
      existing.year = record.year;
    }
    if (record.title !== existing.title && !existing.alternateTitles.includes(record.title)) {
      existing.alternateTitles.push(record.title);
    }
    existing.languageClaims = dedupeClaims([...existing.languageClaims, ...record.languageClaims]);
    existing.posterUrl ||= record.posterUrl;
    existing.description ||= record.description;
  }

  return [...bySourceId.values()];
}

function providerRecordMatches(left, right) {
  if (left.identityConflict || right.identityConflict) return null;
  if (left.mediaType !== right.mediaType) return null;
  if (left.mediaType === "episode") {
    if (!canonicalEpisodeCoordinates(left) || !canonicalEpisodeCoordinates(right)) return null;
    if (left.seasonNumber !== right.seasonNumber || left.episodeNumber !== right.episodeNumber) return null;
  }

  const namespaces = new Set([
    ...Object.keys(left.externalIds),
    ...Object.keys(right.externalIds),
  ]);
  let hasConflict = false;
  let sharesIdentifier = false;

  for (const namespace of namespaces) {
    const a = left.externalIds[namespace];
    const b = right.externalIds[namespace];
    if (a && b && a !== b) hasConflict = true;
    if (a && b && a === b) sharesIdentifier = true;
  }

  // Conflicting IDs in the same namespace outweigh a title/year resemblance.
  if (hasConflict) return null;
  if (sharesIdentifier) return "shared-external-id";

  // Exact title + year is only used when neither record has external IDs.
  // Otherwise an ID-less alias could bridge two records whose IMDb/TMDb IDs
  // disagree, causing a transitive false merge. This is intentionally conservative.
  const leftHasIds = Object.keys(left.externalIds).length > 0;
  const rightHasIds = Object.keys(right.externalIds).length > 0;
  if (!leftHasIds && !rightHasIds
    && left.normalisedTitle
    && left.normalisedTitle === right.normalisedTitle
    && left.year !== null
    && left.year === right.year
  ) {
    return "title-year";
  }

  return null;
}

function unionFindGroups(records) {
  const parent = records.map((_, index) => index);
  const rank = records.map(() => 0);
  const edgeReasons = [];

  const find = index => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };

  const union = (a, b) => {
    let rootA = find(a);
    let rootB = find(b);
    if (rootA === rootB) return;
    if (rank[rootA] < rank[rootB]) [rootA, rootB] = [rootB, rootA];
    parent[rootB] = rootA;
    if (rank[rootA] === rank[rootB]) rank[rootA] += 1;
  };

  for (let left = 0; left < records.length; left += 1) {
    for (let right = left + 1; right < records.length; right += 1) {
      const reason = providerRecordMatches(records[left], records[right]);
      if (!reason) continue;
      union(left, right);
      edgeReasons.push({ left, right, reason });
    }
  }

  const groups = new Map();
  records.forEach((record, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(record);
  });

  const reasonsByRoot = new Map();
  for (const edge of edgeReasons) {
    const root = find(edge.left);
    if (!reasonsByRoot.has(root)) reasonsByRoot.set(root, new Set());
    reasonsByRoot.get(root).add(edge.reason);
  }

  return [...groups.entries()].map(([root, sources]) => ({
    sources,
    reasons: [...(reasonsByRoot.get(root) || new Set())],
  }));
}

function compareSources(left, right) {
  return left.providerPriority - right.providerPriority
    || left.providerId.localeCompare(right.providerId)
    || left.providerItemId.localeCompare(right.providerItemId);
}

function canonicalIdForSources(sources) {
  const namespaceOrder = ["imdb", "tmdb"];
  for (const namespace of namespaceOrder) {
    const values = [...new Set(sources.map(source => source.externalIds[namespace]).filter(Boolean))].sort();
    if (values.length === 1) return namespace + ":" + values[0];
  }

  const sample = [...sources].sort(compareSources)[0];
  if (sample.mediaType === "episode") {
    return "episode:" + sample.normalisedTitle + ":" + (sample.year ?? "unknown")
      + ":s" + sample.seasonNumber + "e" + sample.episodeNumber;
  }
  return "title:" + sample.mediaType + ":" + sample.normalisedTitle + ":" + (sample.year ?? "unknown");
}

function dedupeClaims(claims) {
  const unique = new Map();
  for (const claim of claims) {
    const key = [
      claim.sourceId,
      claim.languageCode || claim.language.toLocaleLowerCase("en"),
      claim.kind,
      claim.evidence,
      claim.reportedKind || "",
      claim.releaseName || "",
    ].join("|");
    if (!unique.has(key)) unique.set(key, claim);
  }
  return [...unique.values()].sort((a, b) =>
    (a.languageCode || a.language).localeCompare(b.languageCode || b.language)
      || a.kind.localeCompare(b.kind)
      || a.sourceId.localeCompare(b.sourceId));
}

function makeLogicalTitle(group) {
  const sources = [...group.sources].sort(compareSources);
  const first = sources[0];
  const titles = [...new Set(sources.flatMap(source => [source.title, ...(source.alternateTitles || [])]))];
  const years = [...new Set(sources.map(source => source.year).filter(Number.isInteger))];
  const ids = {};

  for (const source of sources) {
    for (const [namespace, id] of Object.entries(source.externalIds)) {
      if (!ids[namespace]) ids[namespace] = new Set();
      ids[namespace].add(id);
    }
  }

  return {
    canonicalId: canonicalIdForSources(sources),
    mediaType: first.mediaType,
    title: first.title,
    alternateTitles: titles.filter(title => title !== first.title).sort((a, b) => a.localeCompare(b)),
    year: years.length === 1 ? years[0] : null,
    yearConflict: years.length > 1,
    externalIds: Object.fromEntries(
      [...Object.entries(ids).filter(([, values]) => values.size === 1)
        .map(([namespace, values]) => [namespace, [...values][0]])],
    ),
    matchMethods: group.reasons.sort(),
    matchConfidence: group.reasons.includes("shared-external-id")
      ? "strong"
      : group.reasons.includes("title-year")
        ? "fallback-title-year"
        : "single-source",
    sources: sources.map(source => ({
      id: source.sourceId,
      providerId: source.providerId,
      providerItemId: source.providerItemId,
      title: source.title,
      alternateTitles: source.alternateTitles || [],
      identityConflict: source.identityConflict === true,
      mediaType: source.mediaType,
      year: source.year,
      externalIds: source.externalIds,
      seasonNumber: source.seasonNumber,
      episodeNumber: source.episodeNumber,
      posterUrl: source.posterUrl,
      description: source.description,
    })),
    languageClaims: dedupeClaims(sources.flatMap(source => source.languageClaims)),
  };
}

export function groupCatalogueRecords(records) {
  return unionFindGroups(records)
    .map(makeLogicalTitle)
    .sort((a, b) =>
      a.title.localeCompare(b.title)
        || (a.year ?? 0) - (b.year ?? 0)
        || a.canonicalId.localeCompare(b.canonicalId));
}

/**
 * Adds language tracks observed from a prepared player. Catalogue/provider claims
 * cannot create selectable embedded tracks; only this observation can.
 */
export function addVerifiedPlayerTracks(logicalTitle, sourceId, tracks) {
  if (!logicalTitle || !Array.isArray(logicalTitle.sources) || !logicalTitle.sources.some(source => source.id === sourceId)) {
    throw new TypeError("The track source does not belong to this logical title");
  }
  if (!Array.isArray(tracks)) throw new TypeError("Player tracks must be an array");

  const playerClaims = tracks.map(track => {
    if (!track || !["audio", "subtitle"].includes(track.type)) {
      throw new TypeError("A player track must be audio or subtitle");
    }
    const languageCode = normaliseIdentifier(track.languageCode);
    const language = asCleanString(track.language || track.label || languageCode || "");
    if (!language && !languageCode) throw new TypeError("A player track needs a language");
    return {
      languageCode,
      language: language || languageCode,
      kind: track.type === "audio" ? "embedded-audio" : "subtitle",
      evidence: "player-probe",
      sourceId,
      selectable: true,
    };
  });

  return {
    ...logicalTitle,
    languageClaims: dedupeClaims([...logicalTitle.languageClaims, ...playerClaims]),
  };
}

function isSearchable(provider) {
  return provider
    && typeof provider.id === "string"
    && provider.id.trim()
    && provider.enabled === true
    && provider.eligible === true
    && provider.capabilities?.search === true
    && typeof provider.search === "function";
}

function skippedStatus(provider) {
  let reason = "Provider is not enabled";
  if (provider?.enabled === true && provider.eligible !== true) reason = "Provider has not passed eligibility review";
  else if (provider?.enabled === true && provider.eligible === true && provider.capabilities?.search !== true) {
    reason = "Provider does not declare search support";
  } else if (provider?.enabled === true && provider.eligible === true && provider.capabilities?.search === true && typeof provider.search !== "function") {
    reason = "Provider search adapter is invalid";
  }
  return {
    providerId: typeof provider?.id === "string" ? provider.id : "unknown",
    status: "skipped",
    reason,
    latencyMs: 0,
    resultCount: 0,
  };
}

async function searchOneProvider(provider, query, timeoutMs) {
  const controller = new AbortController();
  const startedAt = Date.now();
  let timeoutHandle;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        controller.abort();
        reject(new ProviderTimeoutError(provider.id, timeoutMs));
      }, timeoutMs);
    });
    const requestPromise = Promise.resolve().then(() => provider.search(query, {
      signal: controller.signal,
    }));
    const response = await Promise.race([requestPromise, timeoutPromise]);
    const items = Array.isArray(response) ? response : response?.items;
    if (!Array.isArray(items)) throw new TypeError("Provider returned an invalid result list");

    const normalized = dedupeProviderRecords(items.map(item => normaliseRecord(provider, item)));
    return {
      records: normalized,
      status: {
        providerId: provider.id,
        status: normalized.length ? "success" : "empty",
        latencyMs: Date.now() - startedAt,
        resultCount: normalized.length,
      },
    };
  } catch (error) {
    const timedOut = error instanceof ProviderTimeoutError || controller.signal.aborted;
    return {
      records: [],
      status: {
        providerId: provider.id,
        status: timedOut ? "timeout" : "error",
        message: timedOut ? "Provider request timed out" : "Provider request failed",
        latencyMs: Date.now() - startedAt,
        resultCount: 0,
      },
    };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function makeSnapshot(records, statuses, completedProviders, totalProviders, phase) {
  const results = groupCatalogueRecords(records);
  const successful = statuses.filter(item => item.status === "success" || item.status === "empty").length;
  const failed = statuses.filter(item => item.status === "error" || item.status === "timeout").length;
  return {
    phase,
    queryCompleted: completedProviders >= totalProviders,
    completedProviders,
    totalProviders,
    successfulProviders: successful,
    failedProviders: failed,
    hasPartialFailure: failed > 0,
    allProvidersFailed: totalProviders > 0 && failed === totalProviders,
    results,
    providerStatuses: [...statuses],
  };
}

/**
 * Search every enabled, eligibility-approved, search-capable provider.
 * Results are snapshots and onUpdate is called as each provider finishes.
 */
export async function aggregateSearch(query, providers, options = {}) {
  if (typeof query !== "string" || !query.trim()) throw new TypeError("Search query must not be blank");
  if (!Array.isArray(providers)) throw new TypeError("Providers must be an array");
  const providerIds = providers.map(provider => provider?.id).filter(id => typeof id === "string" && id.trim());
  if (new Set(providerIds).size !== providerIds.length) {
    throw new TypeError("Provider IDs must be unique within one search");
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError("timeoutMs must be positive");
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new RangeError("concurrency must be a positive integer");

  const skipped = providers.filter(provider => !isSearchable(provider)).map(skippedStatus);
  const eligible = providers.filter(isSearchable);
  const statusById = new Map(skipped.map(status => [status.providerId, status]));
  const completedRecords = [];
  let cursor = 0;
  let completedProviders = 0;
  let updateChain = Promise.resolve();

  const emitUpdate = () => {
    if (typeof options.onUpdate !== "function") return updateChain;
    const snapshot = makeSnapshot(
      completedRecords,
      [...statusById.values()],
      completedProviders,
      eligible.length,
      completedProviders === eligible.length ? "complete" : "partial",
    );
    updateChain = updateChain.then(() => options.onUpdate(snapshot)).catch(() => {
      // A UI callback must not make a provider request fail.
    });
    return updateChain;
  };

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= eligible.length) return;
      const provider = eligible[index];
      const result = await searchOneProvider(provider, query.trim(), timeoutMs);
      completedRecords.push(...result.records);
      statusById.set(provider.id, result.status);
      completedProviders += 1;
      await emitUpdate();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, eligible.length) }, () => worker()),
  );
  await updateChain;

  const finalSnapshot = makeSnapshot(
    completedRecords,
    [...statusById.values()],
    completedProviders,
    eligible.length,
    "complete",
  );
  finalSnapshot.providerStatuses.sort((a, b) => a.providerId.localeCompare(b.providerId));
  return finalSnapshot;
}
