import type { MediaItem, SearchProvider } from "../types";

export interface JellyfinSession {
  baseUrl: string;
  token: string;
  userId: string;
  username: string;
  serverId?: string;
}

export interface JellyfinItemDto {
  Id?: string;
  Type?: string;
  Name?: string;
  OriginalTitle?: string | null;
  ProductionYear?: number | null;
  Overview?: string | null;
  CommunityRating?: number | null;
  Genres?: string[] | null;
  RunTimeTicks?: number | null;
  ProviderIds?: Record<string, string | undefined> | null;
  IndexNumber?: number | null;
  ParentIndexNumber?: number | null;
  ChildCount?: number | null;
  UserData?: { PlaybackPositionTicks?: number | null } | null;
}
interface JellyfinItemsResponse { Items?: JellyfinItemDto[]; TotalRecordCount?: number; }
interface JellyfinAuthResponse {
  AccessToken?: string;
  ServerId?: string;
  User?: { Id?: string; Name?: string };
}
export interface JellyfinSeason { id: string; name: string; number?: number; }
export interface JellyfinEpisode { id: string; name: string; number?: number; seasonNumber?: number; overview: string; runtimeMinutes?: number; }

const APP_AUTH = {
  Client: "7xCinema",
  Device: "Android",
  DeviceId: "com.sevenxcinema.app",
  Version: "0.2.0",
};

export function normalizeJellyfinBaseUrl(input: string): string {
  const value = input.trim();
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter a valid Jellyfin server URL."); }
  if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error("Use an HTTP(S) server URL without embedded credentials.");
  }
  if (url.search || url.hash) throw new Error("The server URL must not contain a query or fragment.");
  return value.replace(/\/+$/, "");
}

export function buildJellyfinAuthorization(token?: string): string {
  if (token !== undefined && !/^[A-Za-z0-9._~-]{16,512}$/.test(token)) {
    throw new Error("The Jellyfin session token has an invalid format.");
  }
  const fields = [
    'Client="' + APP_AUTH.Client + '"',
    'Device="' + APP_AUTH.Device + '"',
    'DeviceId="' + APP_AUTH.DeviceId + '"',
    'Version="' + APP_AUTH.Version + '"',
  ];
  if (token) fields.push('Token="' + token + '"');
  return "MediaBrowser " + fields.join(", ");
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function providerTmdbId(dto: JellyfinItemDto): number | undefined {
  const raw = dto.ProviderIds?.Tmdb;
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}
function providerImdbId(dto: JellyfinItemDto): string | undefined {
  const raw = dto.ProviderIds?.Imdb?.trim();
  return raw && /^tt\d{5,12}$/.test(raw) ? raw : undefined;
}

export function mapJellyfinItem(dto: JellyfinItemDto): MediaItem {
  if (!dto.Id || !dto.Id.trim()) throw new Error("Jellyfin item is missing its identifier.");
  const type = (dto.Type ?? "").toLocaleLowerCase("en");
  const libraryItemType = type === "movie" ? "movie" : type === "series" ? "series" : type === "episode" ? "episode" : undefined;
  if (!libraryItemType) throw new Error("Unsupported Jellyfin library item type.");
  const title = dto.Name?.trim();
  if (!title) throw new Error("Jellyfin item is missing its title.");
  const genres = [...new Set((dto.Genres ?? []).filter((genre): genre is string => typeof genre === "string").map((genre) => genre.trim()).filter(Boolean))];
  const tmdbId = libraryItemType === "episode" ? undefined : providerTmdbId(dto);
  const imdbId = libraryItemType === "episode" ? undefined : providerImdbId(dto);
  return {
    id: "jellyfin:" + dto.Id,
    libraryItemId: dto.Id,
    libraryItemType,
    kind: libraryItemType === "movie" ? "movie" : "tv",
    title,
    originalTitle: dto.OriginalTitle?.trim() || title,
    year: finiteNumber(dto.ProductionYear),
    overview: dto.Overview?.trim() || "",
    rating: finiteNumber(dto.CommunityRating),
    tmdbId,
    originalLanguage: undefined,
    genreIds: [],
    genres: genres.length ? genres : ["My Library"],
    runtimeMinutes: finiteNumber(dto.RunTimeTicks) !== undefined ? Math.round((dto.RunTimeTicks as number) / 600_000_000) : undefined,
    seasonCount: libraryItemType === "series" ? finiteNumber(dto.ChildCount) : undefined,
    episodeNumber: libraryItemType === "episode" ? finiteNumber(dto.IndexNumber) : undefined,
    seasonNumber: libraryItemType === "episode" ? finiteNumber(dto.ParentIndexNumber) : undefined,
    externalIds: { ...(imdbId ? { imdb: imdbId } : {}) },
    sources: ["jellyfin-library"],
  };
}

function makeApiUrl(baseUrl: string, path: string, params?: Record<string, string>): string {
  const root = normalizeJellyfinBaseUrl(baseUrl);
  const safePath = path.split("/").map((part) => encodeURIComponent(part)).join("/");
  const url = new URL(root + "/" + safePath);
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
  return url.toString();
}

async function requestJson<T>(
  url: string,
  token: string | undefined,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("Authorization")) headers.set("Authorization", buildJellyfinAuthorization(token));
  const response = await fetcher(url, { ...init, headers, credentials: "omit", cache: "no-store" });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Jellyfin rejected the session. Reconnect your library in Settings.");
    if (response.status === 403) throw new Error("This Jellyfin account does not have permission to access that item.");
    if (response.status === 404) throw new Error("The Jellyfin item or endpoint was not found.");
    throw new Error("Jellyfin request failed (" + response.status + ").");
  }
  return response.json() as Promise<T>;
}

export async function authenticateJellyfin(
  baseUrlInput: string,
  usernameInput: string,
  password: string,
  fetcher: typeof fetch = fetch,
): Promise<JellyfinSession> {
  const baseUrl = normalizeJellyfinBaseUrl(baseUrlInput);
  const username = usernameInput.trim();
  if (!username || !password) throw new Error("Enter your Jellyfin username and password.");
  const result = await requestJson<JellyfinAuthResponse>(
    baseUrl + "/Users/AuthenticateByName",
    undefined,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Username: username, Pw: password }),
    },
    fetcher,
  );
  const token = result.AccessToken;
  const userId = result.User?.Id;
  const resolvedName = result.User?.Name?.trim() || username;
  if (!token || !userId) throw new Error("Jellyfin responded without a usable user session.");
  buildJellyfinAuthorization(token);
  return {
    baseUrl,
    token,
    userId,
    username: resolvedName,
    serverId: result.ServerId,
  };
}

export async function fetchJellyfinLibrary(
  session: JellyfinSession,
  signal?: AbortSignal,
  limit = 60,
  fetcher: typeof fetch = fetch,
): Promise<MediaItem[]> {
  const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 150)) : 60;
  const url = makeApiUrl(
    session.baseUrl,
    "Users/" + session.userId + "/Items",
    {
      IncludeItemTypes: "Movie,Series",
      Recursive: "true",
      Limit: String(safeLimit),
      SortBy: "DateCreated",
      SortOrder: "Descending",
      Fields: "Overview,ProductionYear,CommunityRating,Genres,RunTimeTicks,OriginalTitle,ChildCount,ProviderIds",
      EnableTotalRecordCount: "false",
    },
  );
  const response = await requestJson<JellyfinItemsResponse>(url, session.token, { signal }, fetcher);
  return (response.Items ?? []).flatMap((item) => {
    try { return [mapJellyfinItem(item)]; } catch { return []; }
  });
}

export async function searchJellyfin(
  session: JellyfinSession,
  query: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = makeApiUrl(
    session.baseUrl,
    "Users/" + session.userId + "/Items",
    {
      SearchTerm: trimmed,
      IncludeItemTypes: "Movie,Series",
      Recursive: "true",
      Limit: "40",
      Fields: "Overview,ProductionYear,CommunityRating,Genres,RunTimeTicks,OriginalTitle,ChildCount,ProviderIds",
      EnableTotalRecordCount: "false",
    },
  );
  const response = await requestJson<JellyfinItemsResponse>(url, session.token, { signal }, fetcher);
  return (response.Items ?? []).flatMap((item) => {
    try { return [mapJellyfinItem(item)]; } catch { return []; }
  });
}

export function createJellyfinSearchProvider(session: JellyfinSession): SearchProvider {
  return {
    id: "jellyfin-library",
    label: "My Jellyfin Library · " + session.username,
    search: (query, signal) => searchJellyfin(session, query, signal),
  };
}

export async function fetchJellyfinSeasons(
  session: JellyfinSession,
  seriesId: string,
  signal?: AbortSignal,
): Promise<JellyfinSeason[]> {
  const data = await requestJson<JellyfinItemsResponse>(
    makeApiUrl(session.baseUrl, "Shows/" + seriesId + "/Seasons", { userId: session.userId, Fields: "Overview,ProductionYear,ProviderIds" }),
    session.token,
    { signal },
  );
  return (data.Items ?? []).filter((item) => Boolean(item.Id)).map((item) => ({
    id: item.Id!,
    name: item.Name?.trim() || "Season " + (item.IndexNumber ?? "?"),
    number: finiteNumber(item.IndexNumber),
  })).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
}

export async function fetchJellyfinEpisodes(
  session: JellyfinSession,
  seriesId: string,
  seasonId: string,
  signal?: AbortSignal,
): Promise<JellyfinEpisode[]> {
  const data = await requestJson<JellyfinItemsResponse>(
    makeApiUrl(session.baseUrl, "Shows/" + seriesId + "/Episodes", {
      userId: session.userId,
      SeasonId: seasonId,
      Fields: "Overview,RunTimeTicks,ProviderIds,ParentIndexNumber,IndexNumber",
    }),
    session.token,
    { signal },
  );
  return (data.Items ?? []).filter((item) => Boolean(item.Id) && item.Type?.toLocaleLowerCase("en") === "episode").map((item) => ({
    id: item.Id!,
    name: item.Name?.trim() || "Episode " + (item.IndexNumber ?? "?"),
    number: finiteNumber(item.IndexNumber),
    seasonNumber: finiteNumber(item.ParentIndexNumber),
    overview: item.Overview?.trim() || "",
    runtimeMinutes: finiteNumber(item.RunTimeTicks) !== undefined ? Math.round((item.RunTimeTicks as number) / 600_000_000) : undefined,
  })).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
}

export function buildJellyfinPlayback(
  session: JellyfinSession,
  itemId: string,
): { url: string; headers: Record<string, string> } {
  if (!itemId.trim() || /[\r\n]/.test(itemId)) throw new Error("Invalid Jellyfin item identifier.");
  return {
    url: makeApiUrl(session.baseUrl, "Videos/" + itemId + "/stream", { static: "true" }),
    headers: { Authorization: buildJellyfinAuthorization(session.token) },
  };
}
