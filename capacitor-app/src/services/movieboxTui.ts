import { Capacitor, registerPlugin } from "@capacitor/core";
import type { MediaItem, ProviderMediaRef, SearchProvider } from "../types";

export interface BackendConnection {
  baseUrl: string;
  token: string;
}

export interface ProviderOption {
  id: string;
  name: string;
  available: boolean;
  capabilities: Record<string, unknown>;
}

export interface MovieboxCatalogEntry {
  id: ProviderMediaRef;
  title: string;
  media_type: "movie" | "series";
  year?: string | null;
  poster_url?: string | null;
  season_count?: number | null;
  sources?: ProviderMediaRef[];
  languages?: string[];
  provider_count?: number;
}

export interface MovieboxEpisode {
  season: number;
  number: number;
  title?: string | null;
  overview?: string | null;
}

export interface MovieboxMediaDetails {
  id: ProviderMediaRef;
  title: string;
  media_type: "movie" | "series";
  year?: string | null;
  description?: string | null;
  poster_url?: string | null;
  genres: string[];
  seasons: Array<{ number: number; episodes: MovieboxEpisode[] }>;
  dubs: Array<{ subject_id: string; language: string; label: string }>;
}

export interface MovieboxRelease {
  provider: string;
  filename: string;
  quality?: string | null;
  codec?: string | null;
  language?: string | null;
  size_bytes?: number | null;
  season?: number | null;
  episode?: number | null;
  mirrors: Array<{ label: string; resolver_url: string; headers: [string, string][]; direct_file: boolean }>;
  resource_id?: string | null;
}

export interface MovieboxReleaseSource {
  provider: string;
  media_id: string;
  release_index: number;
}

export interface MovieboxPlaybackResponse {
  provider: string;
  media_id: string;
  season: number;
  episode: number;
  releases: MovieboxRelease[];
  subtitles: Array<{ name: string; url: string }>;
  release_sources: MovieboxReleaseSource[];
  provider_sources: ProviderMediaRef[];
}

export interface MovieboxResolvedSource {
  provider: string;
  url: string;
  headers: [string, string][];
  subtitle?: string | null;
  source_label: string;
  max_height?: number | null;
}

interface MobileBackendPlugin {
  start(): Promise<BackendConnection>;
  stop(): Promise<void>;
}

const NativeBackend = registerPlugin<MobileBackendPlugin>("MobileBackend");
let connectionPromise: Promise<BackendConnection> | null = null;

export function isMovieboxTuiAvailable(): boolean {
  if (Capacitor.getPlatform() === "android") return true;
  return Boolean(import.meta.env.VITE_MOVIEBOX_TUI_BASE_URL && import.meta.env.VITE_MOVIEBOX_TUI_TOKEN);
}

export function resetMovieboxTuiConnection(): void {
  connectionPromise = null;
}

async function connectBackend(): Promise<BackendConnection> {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      if (Capacitor.getPlatform() === "android") {
        return NativeBackend.start();
      }
      const baseUrl = import.meta.env.VITE_MOVIEBOX_TUI_BASE_URL;
      const token = import.meta.env.VITE_MOVIEBOX_TUI_TOKEN;
      if (!baseUrl || !token) {
        throw new Error("The MovieBox-TUI engine starts inside the Android app. Configure a local API URL and token for browser development.");
      }
      const parsed = new URL(baseUrl);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new Error("The MovieBox-TUI API URL must be an HTTP(S) URL without embedded credentials.");
      }
      return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
    })().catch((error: unknown) => {
      connectionPromise = null;
      throw error;
    });
  }
  return connectionPromise;
}

export async function movieboxApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!path.startsWith("/api/v1/")) throw new Error("Invalid MovieBox-TUI API path.");
  const connection = await connectBackend();
  const headers = new Headers(init.headers);
  headers.set("X-7xCinema-Token", connection.token);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(connection.baseUrl + path, { ...init, headers, cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error("Could not reach the on-device MovieBox-TUI service. Reopen the app and try again.");
  }
  let payload: unknown = null;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) {
    const detail = typeof payload === "object" && payload !== null && "error" in payload
      ? (payload as { error?: unknown }).error : null;
    throw new Error(typeof detail === "string" ? detail : "MovieBox-TUI request failed (" + response.status + ").");
  }
  return payload as T;
}

function stableMovieboxTitleId(row: MovieboxCatalogEntry): string {
  const normalizedTitle = row.title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  const identity = normalizedTitle || row.id.value;
  return `moviebox-tui:${row.media_type}:${encodeURIComponent(identity)}:${row.year?.trim() || "unknown"}`;
}

export function mapMovieboxCatalogEntry(row: MovieboxCatalogEntry): MediaItem {
  const sourceRefs = row.sources?.length ? row.sources : [row.id];
  const languages = [...new Set((row.languages ?? []).map((value) => value.trim()).filter(Boolean))];
  const languageClaims = languages.map((language) => ({
    language,
    kind: "reported" as const,
    evidence: "provider-metadata" as const,
    sourceId: "moviebox-tui:merged-catalogue",
    selectable: false,
  }));
  return {
    id: stableMovieboxTitleId(row),
    kind: row.media_type === "series" ? "tv" : "movie",
    title: row.title,
    originalTitle: row.title,
    year: row.year && /^\d{4}$/.test(row.year) ? Number(row.year) : undefined,
    overview: "",
    imageUrl: row.poster_url ?? undefined,
    seasonCount: row.season_count ?? undefined,
    genreIds: [],
    genres: [],
    sources: [...new Set(sourceRefs.map((source) => source.provider))],
    providerItems: sourceRefs.map((source) => ({ provider: source.provider, value: source.value })),
    languageClaims,
  };
}

export function createMovieboxTuiProvider(): SearchProvider {
  return {
    id: "moviebox-tui",
    label: "MovieBox-TUI · all configured sources",
    timeoutMs: 25_000,
    async search(query, signal) {
      const rows = await movieboxApiRequest<MovieboxCatalogEntry[]>("/api/v1/search", {
        method: "POST",
        body: JSON.stringify({ provider: "all", query, page: 1 }),
        signal,
      });
      if (!Array.isArray(rows)) throw new Error("MovieBox-TUI returned an invalid catalogue response.");
      return rows.map(mapMovieboxCatalogEntry);
    },
  };
}

export async function fetchMovieboxProviders(signal?: AbortSignal): Promise<ProviderOption[]> {
  const providers = await movieboxApiRequest<ProviderOption[]>("/api/v1/providers", { signal });
  return Array.isArray(providers) ? providers : [];
}

export async function fetchMovieboxDetails(source: ProviderMediaRef, signal?: AbortSignal): Promise<MovieboxMediaDetails> {
  return movieboxApiRequest<MovieboxMediaDetails>("/api/v1/details", {
    method: "POST",
    body: JSON.stringify({ provider: source.provider, media_id: source.value }),
    signal,
  });
}

export async function fetchMovieboxPlaybackSources(
  source: ProviderMediaRef,
  season = 0,
  episode = 0,
  signal?: AbortSignal,
): Promise<MovieboxPlaybackResponse> {
  return movieboxApiRequest<MovieboxPlaybackResponse>("/api/v1/playback/sources", {
    method: "POST",
    body: JSON.stringify({ provider: source.provider, media_id: source.value, season, episode }),
    signal,
  });
}

export async function resolveMovieboxPlayback(
  source: MovieboxReleaseSource,
  season: number,
  episode: number,
  subtitleIndex?: number,
  signal?: AbortSignal,
): Promise<MovieboxResolvedSource> {
  return movieboxApiRequest<MovieboxResolvedSource>("/api/v1/playback/resolve", {
    method: "POST",
    body: JSON.stringify({
      provider: source.provider,
      media_id: source.media_id,
      season,
      episode,
      release_index: source.release_index,
      ...(subtitleIndex === undefined ? {} : { subtitle_index: subtitleIndex }),
    }),
    signal,
  });
}
