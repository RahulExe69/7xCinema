import { getStableMediaId, starterCatalogue } from "../catalogue";
import type { LanguageClaim, MediaItem, ProviderReport, SearchProvider, SearchSnapshot } from "../types";

function timeoutError(message: string) {
  const error = new Error(message);
  error.name = "TimeoutError";
  return error;
}

export function mergeResults(items: MediaItem[]): MediaItem[] {
  const groups = new Map<string, MediaItem>();
  for (const item of items) {
    const id = getStableMediaId(item);
    const existing = groups.get(id);
    if (!existing) {
      groups.set(id, { ...item, genreIds: [...item.genreIds], genres: [...item.genres], sources: [...item.sources], languageClaims: [...(item.languageClaims ?? [])] });
      continue;
    }
    const sources = [...new Set([...existing.sources, ...item.sources])];
    const genreIds = [...new Set([...existing.genreIds, ...item.genreIds])];
    const genres = [...new Set([...existing.genres, ...item.genres])];
    const claims = new Map<string, LanguageClaim>();
    for (const claim of [...(existing.languageClaims ?? []), ...(item.languageClaims ?? [])]) {
      const claimKey = [
        claim.sourceId,
        claim.languageCode ?? claim.language.toLocaleLowerCase("en"),
        claim.kind,
        claim.evidence,
        claim.reportedKind ?? "",
        claim.releaseName ?? "",
        String(claim.selectable),
      ].join("|");
      if (!claims.has(claimKey)) claims.set(claimKey, claim);
    }
    groups.set(id, {
      ...existing,
      ...item,
      // Never allow an empty/partial provider result to erase richer fields.
      title: existing.title || item.title,
      originalTitle: existing.originalTitle || item.originalTitle,
      overview: (existing.overview?.length ?? 0) >= (item.overview?.length ?? 0) ? existing.overview : item.overview,
      posterPath: existing.posterPath || item.posterPath,
      backdropPath: existing.backdropPath || item.backdropPath,
      rating: existing.rating ?? item.rating,
      voteCount: Math.max(existing.voteCount ?? 0, item.voteCount ?? 0) || undefined,
      year: existing.year ?? item.year,
      runtimeMinutes: existing.runtimeMinutes ?? item.runtimeMinutes,
      seasonCount: existing.seasonCount ?? item.seasonCount,
      genres,
      genreIds,
      languageClaims: [...claims.values()],
      sources,
    });
  }
  return [...groups.values()].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

export function createOfflineProvider(): SearchProvider {
  return {
    id: "offline-catalogue",
    label: "Offline catalogue",
    async search(query, signal) {
      if (signal.aborted) throw new DOMException("Search cancelled", "AbortError");
      const normalized = query.trim().toLocaleLowerCase();
      if (!normalized) return starterCatalogue;
      return starterCatalogue.filter((item) => {
        const haystack = [item.title, item.originalTitle, item.year?.toString(), ...item.genres]
          .filter(Boolean).join(" ").toLocaleLowerCase();
        return haystack.includes(normalized);
      });
    },
  };
}

export async function searchEveryProvider(
  query: string,
  providers: SearchProvider[],
  onUpdate?: (snapshot: SearchSnapshot) => void,
  timeoutMs = 5_000,
): Promise<SearchSnapshot> {
  const reports: ProviderReport[] = providers.map((provider) => ({
    providerId: provider.id,
    label: provider.label,
    state: "loading",
    count: 0,
  }));
  let collected: MediaItem[] = [];
  const publish = () => onUpdate?.({ results: mergeResults(collected), providers: reports.map((report) => ({ ...report })) });
  publish();

  await Promise.all(providers.map(async (provider, index) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let didTimeout = false;
    try {
      const timeout = new Promise<MediaItem[]>((_, reject) => {
        timer = setTimeout(() => {
          // Record the cause before aborting: abort listeners can reject the
          // provider promise synchronously, and otherwise win Promise.race.
          didTimeout = true;
          reject(timeoutError("Provider took too long"));
          controller.abort();
        }, timeoutMs);
      });
      const result = await Promise.race([provider.search(query, controller.signal), timeout]);
      collected = [...collected, ...result.map((item) => ({
        ...item,
        sources: [...new Set([...item.sources, provider.id])],
      }))];
      reports[index] = {
        providerId: provider.id,
        label: provider.label,
        state: result.length ? "success" : "empty",
        count: result.length,
        message: result.length ? undefined : "No matching titles",
      };
    } catch (error) {
      const timedOut = didTimeout || (error instanceof Error && error.name === "TimeoutError");
      reports[index] = {
        providerId: provider.id,
        label: provider.label,
        state: timedOut ? "timeout" : "error",
        count: 0,
        message: timedOut ? "Timed out; other results are kept" : (error instanceof Error ? error.message : "Provider failed"),
      };
    } finally {
      if (timer) clearTimeout(timer);
      publish();
    }
  }));

  return { results: mergeResults(collected), providers: reports };
}
