import { genreNames } from "../catalogue";
import type { MediaItem, MediaKind, SearchProvider, WatchProvider, WatchProviderResponse } from "../types";

const API_ROOT = "https://api.themoviedb.org/3";
const IMAGE_ROOT = "https://image.tmdb.org/t/p";

export function getTmdbKey(): string {
  const fromBuild = import.meta.env.VITE_TMDB_API_KEY?.trim() ?? "";
  if (fromBuild) return fromBuild;
  try {
    return localStorage.getItem("7xcinema.tmdbApiKey")?.trim() ?? "";
  } catch {
    return "";
  }
}

export function hasTmdbKey(): boolean {
  return Boolean(getTmdbKey());
}

export function setTmdbKey(value: string) {
  try {
    if (value.trim()) localStorage.setItem("7xcinema.tmdbApiKey", value.trim());
    else localStorage.removeItem("7xcinema.tmdbApiKey");
  } catch {
    throw new Error("This device did not allow saving the API key.");
  }
}

async function tmdbRequest<T>(path: string, params: Record<string, string> = {}, signal?: AbortSignal): Promise<T> {
  const key = getTmdbKey();
  if (!key) throw new Error("Add a TMDB v3 API key in Settings to enable live catalogue search.");
  const url = new URL(`${API_ROOT}${path}`);
  url.searchParams.set("api_key", key);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) {
    if (response.status === 401) throw new Error("TMDB rejected this API key. Check it in Settings.");
    if (response.status === 429) throw new Error("TMDB rate limit reached. Try again shortly.");
    throw new Error(`TMDB request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

interface TmdbListResponse {
  results?: TmdbRecord[];
}

interface TmdbRecord {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  original_language?: string;
  genre_ids?: number[];
  runtime?: number;
  number_of_seasons?: number;
}

function mapRecord(record: TmdbRecord, fallbackKind?: MediaKind): MediaItem | null {
  const media = record.media_type ?? fallbackKind;
  if (media !== "movie" && media !== "tv") return null;
  const release = media === "movie" ? record.release_date : record.first_air_date;
  const title = media === "movie" ? (record.title ?? record.original_title) : (record.name ?? record.original_name);
  if (!title) return null;
  const genreIds = record.genre_ids ?? [];
  return {
    id: `tmdb:${media}:${record.id}`,
    tmdbId: record.id,
    kind: media,
    title,
    originalTitle: record.original_title ?? record.original_name ?? title,
    year: release ? Number(release.slice(0, 4)) || undefined : undefined,
    overview: record.overview ?? "",
    posterPath: record.poster_path ?? undefined,
    backdropPath: record.backdrop_path ?? undefined,
    rating: Number.isFinite(record.vote_average) ? record.vote_average : undefined,
    voteCount: record.vote_count ?? undefined,
    originalLanguage: record.original_language ?? undefined,
    genreIds,
    genres: genreIds.map((id) => genreNames[id] ?? "Other"),
    runtimeMinutes: record.runtime ?? undefined,
    seasonCount: record.number_of_seasons ?? undefined,
    sources: ["tmdb"],
  };
}

export function createTmdbSearchProvider(): SearchProvider {
  return {
    id: "tmdb",
    label: "TMDB live catalogue",
    async search(query, signal) {
      if (!getTmdbKey()) return [];
      const response = await tmdbRequest<TmdbListResponse>("/search/multi", {
        query,
        include_adult: "false",
        language: "en-US",
        page: "1",
      }, signal);
      return (response.results ?? [])
        .map((item) => mapRecord(item))
        .filter((item): item is MediaItem => item !== null);
    },
  };
}

export async function fetchTrending(signal?: AbortSignal): Promise<MediaItem[]> {
  const response = await tmdbRequest<TmdbListResponse>("/trending/all/week", {
    language: "en-US",
  }, signal);
  return (response.results ?? [])
    .map((item) => mapRecord(item))
    .filter((item): item is MediaItem => item !== null);
}

export async function fetchWatchProviders(
  item: MediaItem,
  country: string,
  signal?: AbortSignal,
): Promise<WatchProviderResponse> {
  if (!item.tmdbId) throw new Error("This title does not have a confirmed TMDB ID.");
  const response = await tmdbRequest<{ results?: Record<string, {
    link?: string;
    flatrate?: { provider_id: number; provider_name: string; logo_path?: string }[];
    free?: { provider_id: number; provider_name: string; logo_path?: string }[];
    ads?: { provider_id: number; provider_name: string; logo_path?: string }[];
    rent?: { provider_id: number; provider_name: string; logo_path?: string }[];
    buy?: { provider_id: number; provider_name: string; logo_path?: string }[];
  }> }>(`/${item.kind}/${item.tmdbId}/watch/providers`, {}, signal);
  const entry = response.results?.[country.toUpperCase()];
  if (!entry) return { country: country.toUpperCase(), providers: [] };
  const buckets: WatchProviderResponse["providers"] = [];
  const types = ["flatrate", "free", "ads", "rent", "buy"] as const;
  for (const bucket of types) {
    for (const provider of entry[bucket] ?? []) {
      buckets.push({
        providerId: provider.provider_id,
        name: provider.provider_name,
        logoPath: provider.logo_path ? `${IMAGE_ROOT}/w92${provider.logo_path}` : undefined,
        link: entry.link,
        bucket,
      });
    }
  }
  const seen = new Set<string>();
  const providers = buckets.filter((provider) => {
    const key = `${provider.providerId}:${provider.bucket}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { country: country.toUpperCase(), link: entry.link, providers };
}
