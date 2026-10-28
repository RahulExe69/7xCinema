export type MediaKind = "movie" | "tv";
export type JellyfinItemType = "movie" | "series" | "episode";
export type LanguageClaimKind = "embedded-audio" | "dubbed-version" | "subtitle" | "reported";
export type LanguageEvidence = "provider-metadata" | "filename" | "subtitle-api" | "player-probe" | "unknown";

export interface LanguageClaim {
  languageCode?: string;
  language: string;
  kind: LanguageClaimKind;
  evidence: LanguageEvidence;
  sourceId: string;
  selectable: boolean;
  reportedKind?: LanguageClaimKind;
  releaseName?: string;
}
export type AppPage = "home" | "search" | "movies" | "series" | "watchlist" | "settings";

export interface PlaybackSource {
  id: string;
  providerId: string;
  label: string;
  url: string;
  type: "mp4" | "hls" | "dash" | "embed" | "unknown";
  itemPageUrl?: string;
  licenseUrl?: string;
}

export interface MediaItem {
  id: string;
  tmdbId?: number;
  externalIds?: Record<string, string>;
  libraryItemId?: string;
  libraryItemType?: JellyfinItemType;
  episodeNumber?: number;
  seasonNumber?: number;
  resumePositionMs?: number;
  kind: MediaKind;
  title: string;
  originalTitle: string;
  year?: number;
  overview: string;
  posterPath?: string;
  backdropPath?: string;
  imageUrl?: string;
  playableUrl?: string;
  playbackSources?: PlaybackSource[];
  itemPageUrl?: string;
  licenseUrl?: string;
  creator?: string;
  rating?: number;
  voteCount?: number;
  originalLanguage?: string;
  languageClaims?: LanguageClaim[];
  genreIds: number[];
  genres: string[];
  runtimeMinutes?: number;
  seasonCount?: number;
  sources: string[];
}

export interface SearchProvider {
  id: string;
  label: string;
  search(query: string, signal: AbortSignal): Promise<MediaItem[]>;
}

export interface ProviderReport {
  providerId: string;
  label: string;
  state: "loading" | "success" | "empty" | "error" | "timeout";
  count: number;
  message?: string;
}

export interface SearchSnapshot {
  results: MediaItem[];
  providers: ProviderReport[];
}

export interface WatchProvider {
  providerId: number;
  name: string;
  logoPath?: string;
  link?: string;
  bucket: "flatrate" | "free" | "ads" | "rent" | "buy";
}

export interface WatchProviderResponse {
  link?: string;
  country: string;
  providers: WatchProvider[];
}
