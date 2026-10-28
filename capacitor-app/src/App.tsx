import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Browser } from "@capacitor/browser";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { isNativePlayerAvailable, NativePlayer } from "./native-player";
import { backdropUrl, getStableMediaId, languageNames, posterUrl, starterCatalogue } from "./catalogue";
import { createOfflineProvider, mergeResults, searchEveryProvider } from "./core/search";
import { getPlaybackIntent } from "./core/playback";
import { createInternetArchiveProvider } from "./services/internetArchive";
import { createTmdbSearchProvider, fetchTrending, fetchWatchProviders, fetchOfficialTrailer, getTmdbKey, hasTmdbKey, setTmdbKey } from "./services/tmdb";
import { authenticateJellyfin, buildJellyfinPlayback, createJellyfinSearchProvider, fetchJellyfinEpisodes, fetchJellyfinLibrary, fetchJellyfinSeasons, type JellyfinEpisode, type JellyfinSeason, type JellyfinSession } from "./services/jellyfin";
import { clearJellyfinSession, persistJellyfinSession, restoreJellyfinSession } from "./services/jellyfinSession";
import type { AppPage, MediaItem, ProviderReport, WatchProviderResponse } from "./types";

const NAV: { page: AppPage; label: string; icon: string }[] = [
  { page: "home", label: "Home", icon: "⌂" }, { page: "movies", label: "Movies", icon: "▣" },
  { page: "series", label: "Series", icon: "▤" }, { page: "watchlist", label: "My List", icon: "＋" },
];
const REGIONS = [["IN", "India"], ["US", "United States"], ["GB", "United Kingdom"], ["CA", "Canada"], ["AU", "Australia"], ["BD", "Bangladesh"]] as const;
function readWatchlist(): MediaItem[] { try { const value = JSON.parse(localStorage.getItem("7xcinema.watchlist") ?? "[]") as MediaItem[]; return Array.isArray(value) ? value : []; } catch { return []; } }
function readRegion(): string { try { return localStorage.getItem("7xcinema.region") ?? "IN"; } catch { return "IN"; } }
function kindLabel(item: MediaItem) { return item.kind === "movie" ? "MOVIE" : "SERIES"; }
function ratingLabel(item: MediaItem) { return typeof item.rating === "number" && item.rating > 0 ? item.rating.toFixed(1) : "—"; }

export default function App() {
  const [page, setPage] = useState<AppPage>("home");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaItem[]>([]);
  const [reports, setReports] = useState<ProviderReport[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [watchlist, setWatchlist] = useState<MediaItem[]>(readWatchlist);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [watchData, setWatchData] = useState<WatchProviderResponse | null>(null);
  const [watchLoading, setWatchLoading] = useState(false);
  const [watchError, setWatchError] = useState("");
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerMessage, setTrailerMessage] = useState("");
  const [region, setRegion] = useState(readRegion);
  const [apiKeyDraft, setApiKeyDraft] = useState(getTmdbKey);
  const [apiRevision, setApiRevision] = useState(0);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [trending, setTrending] = useState<MediaItem[]>(starterCatalogue);
  const [trendingBusy, setTrendingBusy] = useState(false);
  const [playTarget, setPlayTarget] = useState<MediaItem | null>(null);
  const [playUrl, setPlayUrl] = useState("");
  const [playbackQueue, setPlaybackQueue] = useState<string[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [showAdvancedSource, setShowAdvancedSource] = useState(false);
  const [genreFilter, setGenreFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState<"all" | "movie" | "tv">("all");
  const [jellyfinSession, setJellyfinSession] = useState<JellyfinSession | null>(null);
  const [jellyfinServerUrl, setJellyfinServerUrl] = useState(() => {
    try { return localStorage.getItem("7xcinema.jellyfin.server") ?? ""; } catch { return ""; }
  });
  const [jellyfinUsername, setJellyfinUsername] = useState("");
  const [jellyfinPassword, setJellyfinPassword] = useState("");
  const [jellyfinBusy, setJellyfinBusy] = useState(false);
  const [jellyfinMessage, setJellyfinMessage] = useState("");
  const [jellyfinChecking, setJellyfinChecking] = useState(true);
  const [jellyfinLibrary, setJellyfinLibrary] = useState<MediaItem[]>([]);
  const [jellyfinLibraryBusy, setJellyfinLibraryBusy] = useState(false);
  const [jellyfinLibraryError, setJellyfinLibraryError] = useState("");
  const [jellyfinSeasons, setJellyfinSeasons] = useState<JellyfinSeason[]>([]);
  const [jellyfinSeasonId, setJellyfinSeasonId] = useState("");
  const [jellyfinEpisodes, setJellyfinEpisodes] = useState<JellyfinEpisode[]>([]);
  const [jellyfinEpisodesBusy, setJellyfinEpisodesBusy] = useState(false);
  const [jellyfinEpisodesMessage, setJellyfinEpisodesMessage] = useState("");
  const activeSearchId = useRef(0);
  const nativeBackState = useRef<{ page: AppPage; selected: MediaItem | null; playTarget: MediaItem | null }>({
    page, selected, playTarget,
  });
  nativeBackState.current = { page, selected, playTarget };
  const tmdbEnabled = hasTmdbKey();

  useEffect(() => {
    let active = true;
    restoreJellyfinSession()
      .then((session) => {
        if (!active) return;
        setJellyfinSession(session);
        if (session) setJellyfinServerUrl(session.baseUrl);
      })
      .catch(() => {
        if (active) setJellyfinMessage("Could not restore the saved library session. Reconnect it in Settings.");
      })
      .finally(() => { if (active) setJellyfinChecking(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!jellyfinSession) {
      setJellyfinLibrary([]);
      setJellyfinLibraryError("");
      setJellyfinLibraryBusy(false);
      return;
    }
    const controller = new AbortController();
    setJellyfinLibraryBusy(true);
    setJellyfinLibraryError("");
    fetchJellyfinLibrary(jellyfinSession, controller.signal, 100)
      .then((items) => {
        if (!controller.signal.aborted) {
          setJellyfinLibrary(items);
          if (!items.length) setJellyfinLibraryError("No movies or series were returned by this Jellyfin library.");
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setJellyfinLibraryError(error instanceof Error ? error.message : "Could not load your Jellyfin library.");
      })
      .finally(() => { if (!controller.signal.aborted) setJellyfinLibraryBusy(false); });
    return () => controller.abort();
  }, [jellyfinSession?.baseUrl, jellyfinSession?.userId]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    let disposed = false;
    let handle: { remove: () => Promise<void> } | undefined;
    void CapacitorApp.addListener("backButton", (event) => {
      const current = nativeBackState.current;
      if (current.playTarget) { setPlayTarget(null); return; }
      if (current.selected) { setSelected(null); return; }
      if (current.page !== "home") { setPage("home"); setSearchMessage(""); return; }
      if (event.canGoBack) { window.history.back(); return; }
      void CapacitorApp.exitApp();
    }).then((registered) => {
      if (disposed) void registered.remove();
      else handle = registered;
    }).catch(() => {
      // Web previews and unsupported host contexts retain normal browser navigation.
    });
    return () => {
      disposed = true;
      if (handle) void handle.remove();
    };
  }, []);

  useEffect(() => {
    if (!tmdbEnabled) { setTrending(starterCatalogue); setTrendingBusy(false); return; }
    const controller = new AbortController();
    setTrendingBusy(true);
    fetchTrending(controller.signal).then((items) => { if (items.length) setTrending(items); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setSearchMessage(error instanceof Error ? error.message : "Live discovery is temporarily unavailable."); })
      .finally(() => { if (!controller.signal.aborted) setTrendingBusy(false); });
    return () => controller.abort();
  }, [tmdbEnabled, apiRevision]);

  useEffect(() => {
    if (!selected || selected.libraryItemType !== "series" || !selected.libraryItemId || !jellyfinSession) {
      setJellyfinSeasons([]);
      setJellyfinSeasonId("");
      setJellyfinEpisodes([]);
      setJellyfinEpisodesMessage("");
      setJellyfinEpisodesBusy(false);
      return;
    }
    const controller = new AbortController();
    setJellyfinSeasons([]);
    setJellyfinSeasonId("");
    setJellyfinEpisodes([]);
    setJellyfinEpisodesMessage("");
    fetchJellyfinSeasons(jellyfinSession, selected.libraryItemId, controller.signal)
      .then((seasons) => {
        if (controller.signal.aborted) return;
        setJellyfinSeasons(seasons);
        setJellyfinSeasonId(seasons[0]?.id ?? "");
        if (!seasons.length) setJellyfinEpisodesMessage("No seasons were returned by this Jellyfin library item.");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setJellyfinEpisodesMessage(error instanceof Error ? error.message : "Could not load seasons.");
      });
    return () => controller.abort();
  }, [selected?.libraryItemId, selected?.libraryItemType, jellyfinSession?.userId]);

  useEffect(() => {
    if (!selected || selected.libraryItemType !== "series" || !selected.libraryItemId || !jellyfinSession || !jellyfinSeasonId) {
      setJellyfinEpisodes([]);
      setJellyfinEpisodesBusy(false);
      return;
    }
    const controller = new AbortController();
    setJellyfinEpisodesBusy(true);
    setJellyfinEpisodes([]);
    setJellyfinEpisodesMessage("");
    fetchJellyfinEpisodes(jellyfinSession, selected.libraryItemId, jellyfinSeasonId, controller.signal)
      .then((episodes) => {
        if (!controller.signal.aborted) {
          setJellyfinEpisodes(episodes);
          if (!episodes.length) setJellyfinEpisodesMessage("No episodes were returned for this season.");
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setJellyfinEpisodesMessage(error instanceof Error ? error.message : "Could not load episodes.");
      })
      .finally(() => { if (!controller.signal.aborted) setJellyfinEpisodesBusy(false); });
    return () => controller.abort();
  }, [selected?.libraryItemId, selected?.libraryItemType, jellyfinSeasonId, jellyfinSession?.userId]);

  useEffect(() => {
    if (!selected || !tmdbEnabled) { setWatchData(null); setWatchError(""); return; }
    const controller = new AbortController();
    setWatchLoading(true); setWatchError("");
    fetchWatchProviders(selected, region, controller.signal).then(setWatchData)
      .catch((error: unknown) => { if (!controller.signal.aborted) setWatchError(error instanceof Error ? error.message : "Availability could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setWatchLoading(false); });
    return () => controller.abort();
  }, [selected?.id, region, tmdbEnabled, apiRevision]);

  useEffect(() => {
    if (!selected || !tmdbEnabled) {
      setTrailerUrl(null); setTrailerLoading(false); setTrailerMessage("");
      return;
    }
    const controller = new AbortController();
    setTrailerUrl(null); setTrailerLoading(true); setTrailerMessage("");
    fetchOfficialTrailer(selected, controller.signal)
      .then((url) => {
        if (controller.signal.aborted) return;
        setTrailerUrl(url);
        if (!url) setTrailerMessage("No official trailer or teaser was listed for this title.");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setTrailerMessage(error instanceof Error ? error.message : "Trailer lookup is temporarily unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setTrailerLoading(false); });
    return () => controller.abort();
  }, [selected?.id, tmdbEnabled, apiRevision]);

  const openPage = useCallback((next: AppPage) => {
    setPage(next); setSelected(null); setPlayTarget(null);
    if (next !== "search") setSearchMessage("");
  }, []);

  const runSearch = useCallback(async (rawQuery = query) => {
    const clean = rawQuery.trim();
    if (!clean) { setSearchMessage("Enter a title, genre, or year to search the catalogue."); setPage("search"); return; }
    const searchId = ++activeSearchId.current;
    setQuery(clean); setPage("search"); setSelected(null); setSearching(true); setSearchMessage(""); setResults([]);
    const providers = [createOfflineProvider(), createInternetArchiveProvider()];
    if (hasTmdbKey()) providers.push(createTmdbSearchProvider());
    if (jellyfinSession) providers.push(createJellyfinSearchProvider(jellyfinSession));
    try {
      const snapshot = await searchEveryProvider(clean, providers, (partial) => {
        if (activeSearchId.current !== searchId) return;
        setResults(partial.results); setReports(partial.providers);
      }, 6000);
      if (activeSearchId.current !== searchId) return;
      setResults(snapshot.results); setReports(snapshot.providers);
      if (!snapshot.results.length) setSearchMessage(hasTmdbKey() || jellyfinSession
        ? "No matches found. Try the original title or a shorter query."
        : "No match in the offline starter catalogue. Connect TMDB for live metadata, or connect a Jellyfin library for your own movies and series.");
    } catch (error) {
      if (activeSearchId.current === searchId) setSearchMessage(error instanceof Error ? error.message : "Search failed. Please try again.");
    } finally {
      if (activeSearchId.current === searchId) setSearching(false);
    }
  }, [query, jellyfinSession]);

  useEffect(() => {
    if (jellyfinSession && query.trim()) void runSearch(query);
  }, [jellyfinSession?.userId]);

  const connectJellyfin = async () => {
    setJellyfinBusy(true);
    setJellyfinMessage("");
    try {
      const session = await authenticateJellyfin(jellyfinServerUrl, jellyfinUsername, jellyfinPassword);
      const persisted = await persistJellyfinSession(session);
      setJellyfinSession(session);
      setJellyfinServerUrl(session.baseUrl);
      try { localStorage.setItem("7xcinema.jellyfin.server", session.baseUrl); } catch { /* Server address is non-secret; connection still works in memory. */ }
      setJellyfinPassword("");
      setJellyfinMessage(persisted
        ? "Connected. Your session token is stored in Android secure storage."
        : "Connected for this browser session only. The token was not saved to unencrypted browser storage.");
    } catch (error) {
      setJellyfinMessage(error instanceof Error ? error.message : "Could not connect to this Jellyfin server.");
    } finally {
      setJellyfinBusy(false);
    }
  };

  const disconnectJellyfin = async () => {
    setJellyfinBusy(true);
    try {
      await clearJellyfinSession();
      setJellyfinSession(null);
      setJellyfinPassword("");
      setJellyfinUsername("");
      setJellyfinMessage("Jellyfin disconnected and its saved session token was cleared.");
      try { localStorage.removeItem("7xcinema.jellyfin.server"); } catch { /* Ignore local preference cleanup errors. */ }
    } catch (error) {
      setJellyfinMessage(error instanceof Error ? error.message : "Could not clear the saved Jellyfin session.");
    } finally {
      setJellyfinBusy(false);
    }
  };

  const toggleWatchlist = useCallback((item: MediaItem) => {
    const stableId = getStableMediaId(item);
    setWatchlist((current) => {
      const exists = current.some((entry) => getStableMediaId(entry) === stableId);
      const next = exists ? current.filter((entry) => getStableMediaId(entry) !== stableId) : [{ ...item }, ...current];
      try { localStorage.setItem("7xcinema.watchlist", JSON.stringify(next)); } catch { /* Keep the in-memory list usable. */ }
      return next;
    });
  }, []);
  const isSaved = useCallback((item: MediaItem) => watchlist.some((entry) => getStableMediaId(entry) === getStableMediaId(item)), [watchlist]);
  const openOfficialDestination = useCallback(async (url?: string) => {
    if (!url) return;
    try { await Browser.open({ url }); } catch { window.open(url, "_blank", "noopener,noreferrer"); }
  }, []);

  const visibleItems = useMemo(() => {
    let items = page === "watchlist"
      ? watchlist
      : page === "search"
        ? results
        : (page === "movies" || page === "series")
          ? mergeResults([...trending, ...jellyfinLibrary])
          : trending;
    if (page === "movies") items = items.filter((item) => item.kind === "movie");
    if (page === "series") items = items.filter((item) => item.kind === "tv");
    if (kindFilter !== "all" && page !== "movies" && page !== "series") items = items.filter((item) => item.kind === kindFilter);
    if (genreFilter !== "all") items = items.filter((item) => item.genres.includes(genreFilter));
    return items;
  }, [page, watchlist, results, trending, jellyfinLibrary, kindFilter, genreFilter]);
  const hero = trending.find((item) => item.backdropPath) ?? starterCatalogue[0];

  const querySubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void runSearch(); };
  const saveSettings = () => {
    try {
      setTmdbKey(apiKeyDraft); localStorage.setItem("7xcinema.region", region);
      setSettingsMessage(apiKeyDraft.trim() ? "Settings saved on this device. Live features are enabled if the API key is valid." : "Settings saved. Offline catalogue mode is ready.");
      setApiRevision((value) => value + 1); setSearchMessage("");
    } catch (error) { setSettingsMessage(error instanceof Error ? error.message : "Settings could not be saved."); }
  };
  const openMediaSource = async (item: MediaItem, rawUrl: string, fallbackUrls: string[] = [], sourceHeaders?: Record<string, string>) => {
    const candidates = [rawUrl, ...fallbackUrls];
    const intent = getPlaybackIntent({
      playableUrl: rawUrl,
      playbackSources: candidates.map((url, index) => ({
        id: `selected-source:${index}`,
        providerId: item.sources[0] ?? "manual-source",
        label: index === 0 ? "Selected source" : `Fallback source ${index + 1}`,
        url,
        type: "unknown" as const,
      })),
    });
    if (intent.type !== "direct") {
      setPlayerError("That source did not provide a valid HTTP(S) media URL.");
      return;
    }
    const queue = [intent.url, ...intent.fallbackUrls];
    setPlayTarget(item);
    setPlaybackQueue(queue);
    setCurrentSourceIndex(0);
    setPlayUrl(intent.url);
    setPlayerLoaded(false);
    setPlayerError("");
    setShowAdvancedSource(false);
    if (isNativePlayerAvailable()) {
      try {
        await NativePlayer.play({ url: intent.url, fallbackUrls: intent.fallbackUrls, headers: sourceHeaders, title: item.title });
        setPlayTarget(null);
      } catch (error) {
        setPlayerError(error instanceof Error ? error.message : "The native player could not open this source.");
      }
      return;
    }
    if (sourceHeaders && Object.keys(sourceHeaders).length > 0) {
      setPlayerError("Authenticated personal-library playback requires the native Android Media3 player. Open this library from the Android app.");
      return;
    }
    setPlayerLoaded(true);
  };

  const startPlayback = (item: MediaItem) => {
    if (item.libraryItemType === "series" && item.libraryItemId) {
      setPlayTarget(null);
      setSelected(item);
      return;
    }
    setPlayTarget(item);
    setPlayUrl("");
    setPlaybackQueue([]);
    setCurrentSourceIndex(0);
    setPlayerLoaded(false);
    setPlayerError("");
    setShowAdvancedSource(false);
    if (item.libraryItemId && jellyfinSession && (item.libraryItemType === "movie" || item.libraryItemType === "episode")) {
      try {
        const source = buildJellyfinPlayback(jellyfinSession, item.libraryItemId);
        void openMediaSource(item, source.url, [], source.headers);
      } catch (error) {
        setPlayerError(error instanceof Error ? error.message : "Could not open this Jellyfin item.");
      }
      return;
    }
    const intent = getPlaybackIntent(item);
    if (intent.type === "direct") {
      // Adapter-supplied URLs open immediately; remaining candidates are tried
      // automatically if the first source fails.
      void openMediaSource(item, intent.url, intent.fallbackUrls);
    }
  };

  const validatePlaybackUrl = async () => {
    if (!playTarget) return;
    await openMediaSource(playTarget, playUrl);
  };

  const handleWebPlaybackError = () => {
    const nextIndex = currentSourceIndex + 1;
    if (nextIndex < playbackQueue.length) {
      setCurrentSourceIndex(nextIndex);
      setPlayUrl(playbackQueue[nextIndex]);
      setPlayerError("");
      setPlayerLoaded(true);
      return;
    }
    setPlayerError(playbackQueue.length > 1
      ? "Every supplied media source failed. Choose an official destination or review the original item."
      : "This URL could not be played. Check the link, permissions, format, and device support.");
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => openPage("home")} aria-label="7xCinema home"><span className="brand-mark"><span>7x</span><i>▶</i></span><span className="brand-word">7x<span>CINEMA</span></span></button>
      <div className="side-label">YOUR SPACE</div>
      <nav className="side-nav" aria-label="Main navigation">{NAV.map((item) => <button key={item.page} className={"nav-item " + (page === item.page ? "active" : "")} onClick={() => openPage(item.page)}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.page === "watchlist" && watchlist.length > 0 && <span className="nav-count">{watchlist.length}</span>}</button>)}</nav>
      <div className="side-label browse-label">DISCOVER</div>
      <button className={"nav-item " + (page === "search" ? "active" : "")} onClick={() => openPage("search")}><span className="nav-icon">⌕</span><span>Search everything</span></button>
      <div className="sidebar-spacer" />
      <div className="side-status"><span className={"status-dot " + (tmdbEnabled ? "online" : "")} /><div><strong>{tmdbEnabled ? "Live catalogue ready" : "Offline-ready mode"}</strong><small>{tmdbEnabled ? "TMDB configured" : "No API key required"}</small></div></div>
      <button className={"nav-item settings-link " + (page === "settings" ? "active" : "")} onClick={() => openPage("settings")}><span className="nav-icon">⚙</span><span>Settings</span></button>
      <div className="sidebar-foot">MADE FOR THE NEXT BINGE<br /><span>7xCINEMA · EARLY ACCESS</span></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="mobile-brand" onClick={() => openPage("home")}>7x<span>CINEMA</span></button>
        <form className="global-search" onSubmit={querySubmit}><span className="search-symbol">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movies, series, years…" aria-label="Search catalogue" />{query && <button type="button" className="clear-search" onClick={() => setQuery("")} aria-label="Clear search">×</button>}<kbd>↵</kbd></form>
        <button className="region-pill" onClick={() => openPage("settings")} title="Change watch availability region"><span className="region-globe">◎</span>{region}<span className="chevron">⌄</span></button>
        <button className="avatar-button" onClick={() => openPage("settings")} aria-label="Open settings">R</button>
      </header>

      <div className="content-wrap">
        {page === "home" && <>
          <section className="hero" style={{ backgroundImage: hero.backdropPath ? 'linear-gradient(90deg, rgba(8,10,16,.97) 0%, rgba(8,10,16,.82) 42%, rgba(8,10,16,.17) 100%), linear-gradient(0deg, #080a10 0%, transparent 40%), url("' + backdropUrl(hero.backdropPath) + '")' : undefined }}>
            <div className="hero-glow" /><div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> THE CINEMA UNIVERSE, CONNECTED</div>
              <h1>Your next<br /><em>obsession</em><br />starts here.</h1>
              <p>One search. Every catalogue you connect. Find your next favourite without the endless scrolling.</p>
              <div className="hero-actions"><button className="button button-primary" onClick={() => void runSearch(query.trim() || "Dune")}>⌕ &nbsp;Explore titles <span>→</span></button><button className="button button-ghost" onClick={() => openPage("watchlist")}>＋ &nbsp;My list</button></div>
              <div className="hero-meta"><span>✦ Curated discovery</span><span>•</span><span>Language-aware metadata</span><span>•</span><span>Official watch destinations</span></div>
            </div><div className="hero-footnote"><span className="hero-fallback-number">7X</span><span>YOUR SCREEN.<br />YOUR STORIES.</span></div>
          </section>

          {!tmdbEnabled && <div className="setup-banner"><div className="setup-icon">✳</div><div><strong>Unlock live catalogue search</strong><p>Connect a TMDB API key to search live movie/series metadata and check official streaming destinations for your region.</p></div><button onClick={() => openPage("settings")}>Set up <span>→</span></button></div>}

          {jellyfinSession && <section className="section-block"><div className="section-heading"><div><div className="section-kicker">YOUR PERSONAL MEDIA SERVER</div><h2>Continue in your library <span className="heading-star">✳</span></h2><p>Recently added titles from {jellyfinSession.username}'s Jellyfin server.</p></div><button className="text-action" onClick={() => openPage("movies")}>Browse library <span>→</span></button></div>
            {jellyfinLibraryBusy && <div className="inline-loading"><span className="spinner" /> Loading your library…</div>}
            {jellyfinLibraryError && !jellyfinLibraryBusy && <div className="watch-message">{jellyfinLibraryError}</div>}
            {jellyfinLibrary.length > 0 && <MediaGrid items={mergeResults(jellyfinLibrary).slice(0, 8)} onSelect={setSelected} onWatch={startPlayback} isSaved={isSaved} onToggleSave={toggleWatchlist} />}
          </section>}
          <section className="section-block"><div className="section-heading"><div><div className="section-kicker">HAND-PICKED FOR YOUR SESSION</div><h2>{tmdbEnabled ? "Trending this week" : "Your starter collection"} <span className="heading-star">✳</span></h2><p>{tmdbEnabled ? "Freshly fetched from the live catalogue." : "A ready-to-browse collection that works even offline."}</p></div><button className="text-action" onClick={() => openPage("movies")}>Explore all <span>→</span></button></div>
            {trendingBusy && <div className="inline-loading"><span className="spinner" /> Loading trending titles…</div>}<MediaGrid items={trending.slice(0, 8)} onSelect={setSelected} onWatch={startPlayback} isSaved={isSaved} onToggleSave={toggleWatchlist} /></section>

          <section className="feature-strip"><div className="feature-item"><span className="feature-icon">⌕</span><div><strong>One search, many catalogues</strong><p>Provider searches run in parallel, with partial results and individual failure handling.</p></div></div><div className="feature-item"><span className="feature-icon">◎</span><div><strong>Honest language details</strong><p>Original-language metadata is not mislabeled as a verified audio or subtitle track.</p></div></div><div className="feature-item"><span className="feature-icon">↗</span><div><strong>Watch from official sources</strong><p>Availability links come from catalogue data, never invented by the app.</p></div></div></section>
          <section className="section-block"><div className="section-heading"><div><div className="section-kicker">KEEP EXPLORING</div><h2>Different worlds. One place.</h2><p>Jump into a mood, a universe, or a whole new story.</p></div></div><div className="mood-grid">
            <button className="mood-card mood-scifi" onClick={() => { setQuery("Sci-Fi"); void runSearch("Sci-Fi"); }}><span>01 / SPECULATIVE</span><strong>Beyond<br />the known.</strong><i>SCI-FI & FANTASY ↗</i></button>
            <button className="mood-card mood-drama" onClick={() => { setQuery("Drama"); void runSearch("Drama"); }}><span>02 / HUMAN STORIES</span><strong>Feel it<br />all.</strong><i>DRAMA ↗</i></button>
            <button className="mood-card mood-action" onClick={() => { setQuery("Action"); void runSearch("Action"); }}><span>03 / ADRENALINE</span><strong>No time<br />to blink.</strong><i>ACTION & ADVENTURE ↗</i></button>
          </div></section>
        </>}

        {(page === "movies" || page === "series" || page === "watchlist" || page === "search") && <section className="catalogue-page">
          <div className="page-heading"><div><div className="section-kicker">{page === "watchlist" ? "SAVED FOR LATER" : page === "search" ? "SEARCH ACROSS ENABLED CATALOGUES" : "YOUR NEXT MARATHON"}</div><h1>{page === "watchlist" ? "My List" : page === "search" ? <>Search <em>results</em></> : page === "movies" ? <>Movies for <em>tonight.</em></> : <>Series worth <em>staying up for.</em></>}</h1><p>{page === "watchlist" ? "Your personal queue, saved on this device." : page === "search" ? 'Results for “' + query + '”' : "Find a story worth pressing play for."}</p></div>
            {page !== "watchlist" && <div className="results-count">{visibleItems.length} <span>TITLES</span></div>}</div>
          {page !== "watchlist" && page !== "search" && <div className="filter-row"><div className="filter-chips"><button className={"filter-chip " + (kindFilter === "all" ? "selected" : "")} onClick={() => setKindFilter("all")}>Everything</button><button className={"filter-chip " + (kindFilter === "movie" ? "selected" : "")} onClick={() => setKindFilter("movie")}>Movies</button><button className={"filter-chip " + (kindFilter === "tv" ? "selected" : "")} onClick={() => setKindFilter("tv")}>Series</button></div><select className="genre-select" value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)} aria-label="Filter by genre"><option value="all">All genres</option>{[...new Set(trending.flatMap((item) => item.genres))].sort().map((genre) => <option key={genre} value={genre}>{genre}</option>)}</select></div>}
          {page === "search" && reports.length > 0 && <div className="provider-reports">{reports.map((report) => <span key={report.providerId} className={"provider-report report-" + report.state}><i />{report.label}: {report.state === "success" ? report.count + " found" : report.message ?? report.state}</span>)}</div>}
          {page === "search" && searching && <div className="inline-loading"><span className="spinner" /> Searching every enabled catalogue. Results appear as sources finish…</div>}
          {page === "search" && searchMessage && !searching && <div className="notice-panel"><strong>Nothing to show yet</strong><p>{searchMessage}</p>{!tmdbEnabled && <button className="button button-secondary" onClick={() => openPage("settings")}>Connect live catalogue</button>}</div>}
          {page === "watchlist" && watchlist.length === 0 && <div className="empty-state"><span className="empty-symbol">＋</span><h2>Your list is a blank canvas.</h2><p>Save movies and series you want to remember. They’ll stay here on this device.</p><button className="button button-primary" onClick={() => openPage("home")}>Discover something <span>→</span></button></div>}
          {visibleItems.length > 0 && <MediaGrid items={visibleItems} onSelect={setSelected} onWatch={startPlayback} isSaved={isSaved} onToggleSave={toggleWatchlist} />}
          {page === "search" && !searching && !searchMessage && visibleItems.length === 0 && <div className="empty-state"><span className="empty-symbol">⌕</span><h2>No matching titles.</h2><p>Try a shorter title, a genre, or a different spelling.</p></div>}
        </section>}

        {page === "settings" && <section className="settings-page">
          <div className="section-kicker">MAKE 7XCINEMA YOURS</div><h1>Settings & <em>connections.</em></h1><p className="settings-intro">Choose your region, connect live catalogue metadata, and control where the app looks for official watch destinations.</p>
          <div className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon">⌘</span><div><h2>TMDB catalogue</h2><p>Live movie/series search, trending titles, and official availability destinations.</p></div><span className={"connection-status " + (tmdbEnabled ? "connected" : "")}>{tmdbEnabled ? "CONFIGURED" : "OPTIONAL"}</span></div>
            <label className="field-label" htmlFor="tmdb-key">TMDB v3 API key</label><input id="tmdb-key" className="settings-input" type="password" autoComplete="off" placeholder="Paste your TMDB API key…" value={apiKeyDraft} onChange={(event) => setApiKeyDraft(event.target.value)} />
            <div className="field-help">Stored on this device in the app’s local storage. Use a public client API key only—never paste a privileged server secret or access token.</div><div className="settings-inline-link">Need a key? <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">Get one from TMDB ↗</a></div>
            <div className="settings-divider" /><label className="field-label" htmlFor="region">Streaming availability region</label><select id="region" className="settings-input" value={region} onChange={(event) => setRegion(event.target.value)}>{REGIONS.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}</select>
            <p className="field-help">Availability varies by country and subscription. TMDB reports provider destinations; it does not guarantee your account can play a title.</p><div className="settings-actions"><button className="button button-primary" onClick={saveSettings}>Save settings <span>→</span></button><button className="button button-ghost" onClick={() => { setApiKeyDraft(""); setSettingsMessage(""); }}>Clear key</button></div>{settingsMessage && <p className="settings-feedback">{settingsMessage}</p>}
          </div>
          <div className="settings-card jellyfin-settings-card">
            <div className="settings-card-heading"><span className="settings-card-icon">▣</span><div><h2>Jellyfin personal library</h2><p>Search and play movies or series from a server you own or are authorised to use.</p></div><span className={"connection-status " + (jellyfinSession ? "connected" : "")}>{jellyfinChecking ? "CHECKING" : jellyfinSession ? "CONNECTED" : "OPTIONAL"}</span></div>
            {jellyfinChecking ? <div className="inline-loading"><span className="spinner" /> Checking saved library session…</div>
              : jellyfinSession ? <><div className="jellyfin-connected"><span className="status-dot online" /><div><strong>{jellyfinSession.username}</strong><small>{jellyfinSession.baseUrl}</small></div></div><p className="field-help">Your session is connected. Search the catalogue and Jellyfin results will be merged by shared TMDB IDs when available. Library movies and episodes play through native Media3.</p><button className="button button-ghost danger-button" disabled={jellyfinBusy} onClick={() => void disconnectJellyfin()}>{jellyfinBusy ? "Disconnecting…" : "Disconnect library"}</button></>
              : <><label className="field-label" htmlFor="jellyfin-url">Server URL</label><input id="jellyfin-url" className="settings-input" type="url" inputMode="url" autoComplete="url" placeholder="https://jellyfin.example.com" value={jellyfinServerUrl} onChange={(event) => setJellyfinServerUrl(event.target.value)} />
                <label className="field-label jellyfin-field-gap" htmlFor="jellyfin-username">Jellyfin username</label><input id="jellyfin-username" className="settings-input" autoComplete="username" placeholder="Your server username" value={jellyfinUsername} onChange={(event) => setJellyfinUsername(event.target.value)} />
                <label className="field-label jellyfin-field-gap" htmlFor="jellyfin-password">Password</label><input id="jellyfin-password" className="settings-input" type="password" autoComplete="current-password" placeholder="Used only to connect; not saved" value={jellyfinPassword} onChange={(event) => setJellyfinPassword(event.target.value)} />
                <p className="field-help">7xCinema sends these credentials directly to the server URL you entered. It keeps the resulting session token in Android secure storage; on web preview, the session is memory-only. Use HTTPS for remote servers. Plain HTTP exposes credentials and should only be used on a trusted private network.</p>
                <button className="button button-primary jellyfin-connect-button" disabled={jellyfinBusy || jellyfinChecking || !jellyfinServerUrl.trim() || !jellyfinUsername.trim() || !jellyfinPassword} onClick={() => void connectJellyfin()}>{jellyfinBusy ? "Connecting…" : "Connect my library"} <span>→</span></button>
              </>}
            {jellyfinMessage && <p className="settings-feedback">{jellyfinMessage}</p>}
          </div>
          <div className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon">♡</span><div><h2>My List</h2><p>{watchlist.length} saved {watchlist.length === 1 ? "title" : "titles"} on this device.</p></div></div><button className="button button-ghost danger-button" disabled={!watchlist.length} onClick={() => { setWatchlist([]); localStorage.removeItem("7xcinema.watchlist"); }}>Clear saved list</button></div>
          <div className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon">ⓘ</span><div><h2>About this build</h2><p>7xCinema 0.2.0 · React + TypeScript + Capacitor</p></div></div><p className="about-copy">The offline starter catalogue works without an account. TMDB supplies catalogue metadata, trailers and official availability—not full movie streams. Connect your own Jellyfin library for authenticated in-app playback of your personal media. Open-license archive items can auto-play when a compatible direct file is available. Android playback uses native Media3 with actual audio/subtitle selection and source fallback; manual URLs remain under Advanced.</p></div>
        </section>}
        <footer className="app-footer"><span>7XCINEMA <b>·</b> DISCOVER MORE, SCROLL LESS.</span><span>METADATA IS NOT A PLAYABLE SOURCE. <b>✳</b></span></footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">{NAV.map((item) => <button key={item.page} className={page === item.page ? "mobile-nav-active" : ""} onClick={() => openPage(item.page)}><span>{item.icon}</span><small>{item.label}</small></button>)}<button className={page === "settings" ? "mobile-nav-active" : ""} onClick={() => openPage("settings")}><span>⚙</span><small>Settings</small></button></nav>
    </main>

    {selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="detail-modal" role="dialog" aria-modal="true" aria-label={selected.title}>
      <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close details">×</button><div className="detail-backdrop" style={{ backgroundImage: selected.backdropPath ? 'linear-gradient(0deg, #11141d 0%, rgba(17,20,29,.22) 100%), url("' + backdropUrl(selected.backdropPath) + '")' : undefined }} />
      <div className="detail-content"><div className="detail-poster-wrap">{selected.imageUrl || selected.posterPath ? <img className="detail-poster" src={selected.imageUrl ?? posterUrl(selected.posterPath)} alt={selected.title + " poster"} /> : <div className="poster-missing">7x</div>}</div>
        <div className="detail-info"><div className="section-kicker">{kindLabel(selected)} · {selected.year ?? "Year unknown"}</div><h2>{selected.title}</h2><div className="detail-facts"><span className="rating-star">★</span><strong>{ratingLabel(selected)}</strong><span>{selected.kind === "movie" ? (selected.runtimeMinutes ? selected.runtimeMinutes + " min" : "Feature film") : (selected.seasonCount ? selected.seasonCount + " seasons" : "Series")}</span><span className="fact-divider">|</span><span>{selected.originalLanguage ? languageNames[selected.originalLanguage] ?? selected.originalLanguage.toUpperCase() : "Original language unknown"}</span></div>
          <p className="detail-overview">{selected.overview || "No synopsis is available for this title yet."}</p><div className="genre-tags">{selected.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
          {selected.sources.length > 0 && <div className="catalogue-provenance"><span>CATALOGUE MATCHES</span><div>{selected.sources.map((source) => <span key={source}>{catalogueSourceLabel(source)}</span>)}</div></div>}
          {selected.itemPageUrl && selected.licenseUrl && <div className="open-license-note"><strong>Uploader-marked open-license media</strong><p>This item's metadata declares {selected.licenseUrl.includes("/zero/1.0") ? "CC0 1.0" : "Public Domain Mark 1.0"}. The label is an uploader claim, not an independent legal verification.</p><div className="open-license-links"><button className="text-action" onClick={() => void openOfficialDestination(selected.itemPageUrl)}>Review archive item ↗</button><button className="text-action" onClick={() => void openOfficialDestination(selected.licenseUrl)}>Review licence ↗</button></div>{selected.creator && <p>Creator/uploader metadata: {selected.creator}</p>}</div>}
          {(selected.languageClaims?.length ?? 0) > 0 && <section className="language-evidence" aria-label="Language evidence"><div className="section-kicker">LANGUAGE EVIDENCE</div><div className="language-claim-list">{selected.languageClaims?.map((claim) => <div className={"language-claim " + (claim.selectable && claim.evidence === "player-probe" ? "verified" : "reported")} key={[claim.sourceId, claim.languageCode, claim.kind, claim.evidence, claim.reportedKind].join(":")}><strong>{claim.language}</strong><small>{languageClaimLabel(claim)} · {catalogueSourceLabel(claim.sourceId)}</small></div>)}</div><p className="language-evidence-note">Reported metadata is not proof that a particular stream contains this track. Selectable audio and subtitles are confirmed only by the prepared player.</p></section>}
          {selected.libraryItemType === "series" && <section className="library-episodes" aria-label="Jellyfin series episodes">
            <div className="section-kicker">YOUR JELLYFIN LIBRARY</div><h3>Episodes</h3>
            {!jellyfinSession ? <div className="watch-message">Reconnect your Jellyfin library in Settings to browse seasons and play episodes.</div>
              : <><label className="field-label" htmlFor="jellyfin-season">Season</label>
                <select id="jellyfin-season" className="settings-input" value={jellyfinSeasonId} onChange={(event) => setJellyfinSeasonId(event.target.value)} disabled={!jellyfinSeasons.length}>
                  {jellyfinSeasons.map((season) => <option value={season.id} key={season.id}>{season.name}</option>)}
                </select>
                {jellyfinEpisodesBusy && <div className="inline-loading"><span className="spinner" /> Loading episodes…</div>}
                {jellyfinEpisodesMessage && <p className="field-help">{jellyfinEpisodesMessage}</p>}
                <div className="episode-list">{jellyfinEpisodes.map((episode) => <button className="episode-row" key={episode.id} onClick={() => {
                  const episodeItem: MediaItem = {
                    ...selected,
                    id: "jellyfin:" + episode.id,
                    title: episode.name,
                    overview: episode.overview,
                    libraryItemId: episode.id,
                    libraryItemType: "episode",
                    kind: "tv",
                    episodeNumber: episode.number,
                    seasonNumber: episode.seasonNumber,
                    runtimeMinutes: episode.runtimeMinutes,
                    playableUrl: undefined,
                    playbackSources: undefined,
                  };
                  setSelected(null);
                  startPlayback(episodeItem);
                }}>
                  <span className="episode-number">S{String(episode.seasonNumber ?? 1).padStart(2, "0")}E{String(episode.number ?? 0).padStart(2, "0")}</span>
                  <span className="episode-row-copy"><strong>{episode.name}</strong><small>{episode.runtimeMinutes ? episode.runtimeMinutes + " min" : "Episode"}{episode.overview ? " · " + episode.overview : ""}</small></span>
                  <span className="episode-play-icon">▶</span>
                </button>)}</div>
              </>}
          </section>}
          <div className="detail-actions"><button className="button button-primary" onClick={() => startPlayback(selected)}>{selected.libraryItemId ? (selected.libraryItemType === "series" ? "▷  Browse episodes" : "▶  Play from library") : (getPlaybackIntent(selected).type === "direct" ? "▶  Play now" : "▷  Where to watch")}</button><button className={"button " + (isSaved(selected) ? "button-saved" : "button-secondary")} onClick={() => toggleWatchlist(selected)}>{isSaved(selected) ? "✓ In My List" : "＋ Add to My List"}</button>{trailerUrl && <button className="button button-secondary" onClick={() => void openOfficialDestination(trailerUrl)}>Watch official trailer ↗</button>}</div>
          {trailerLoading && <p className="field-help">Checking for an official trailer…</p>}
          {trailerMessage && tmdbEnabled && <p className="field-help">{trailerMessage}</p>}
        </div>
      </div>
      <div className="watch-section"><div className="watch-heading"><div><div className="section-kicker">WHERE TO WATCH</div><h3>Official destinations <span>{region}</span></h3></div><span className="official-tag">TMDB DATA</span></div>
        {!tmdbEnabled ? <div className="watch-message">Connect your TMDB API key in Settings to look up reported official streaming, rental, and purchase destinations for your region.</div>
          : watchLoading ? <div className="inline-loading"><span className="spinner" /> Checking reported availability…</div>
          : watchError ? <div className="watch-message">{watchError}</div>
          : watchData && watchData.providers.length ? <><div className="watch-providers">{watchData.providers.map((provider) => <div key={provider.providerId + "-" + provider.bucket} className="watch-provider" title={"Reported availability: " + provider.name}>{provider.logoPath ? <img src={provider.logoPath} alt="" /> : <span className="provider-initial">{provider.name.slice(0,1)}</span>}<strong>{provider.name}</strong><small>{provider.bucket === "flatrate" ? "Subscription" : provider.bucket === "free" ? "Free" : provider.bucket === "ads" ? "With ads" : provider.bucket === "rent" ? "Rent" : "Buy"}</small></div>)}</div>{watchData.link && <button className="text-action availability-link" onClick={() => void openOfficialDestination(watchData.link)}>View all reported options on TMDB <span>↗</span></button>}<p className="availability-note">Provider names are availability metadata, not guaranteed direct links. Use TMDB's regional listing to confirm access and open the service.</p></>
          : <div className="watch-message">TMDB has no provider data for this title in {region}. This does not prove that the title is unavailable everywhere.</div>}
      </div>
    </section></div>}

    {playTarget && <div className="modal-backdrop player-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPlayTarget(null); }}><section className="player-modal" role="dialog" aria-modal="true" aria-label={"Player for " + playTarget.title}>
      <div className="player-top"><div><div className="section-kicker">{playerLoaded && playUrl ? "7XCINEMA PLAYER" : "7XCINEMA WATCH"}</div><h2>{playTarget.title}</h2></div><button className="modal-close inline-close" onClick={() => setPlayTarget(null)} aria-label="Close player">×</button></div>
      {!playerLoaded || !playUrl || playerError ? <div className="player-entry">
        <div className="player-entry-icon">{getPlaybackIntent(playTarget).type === "direct" ? "↻" : "↗"}</div>
        {getPlaybackIntent(playTarget).type === "direct" && playerError
          ? <><h3>That source didn’t start.</h3><p>Try the original source page, or choose another authorised destination. We won’t pretend a metadata result is a working stream.</p><button className="button button-primary" onClick={() => startPlayback(playTarget)}>Retry source <span>→</span></button></>
          : <><h3>Choose how to watch.</h3><p className="source-choice-note">7xCinema checks the available playback information first. When a real media source is present, it opens automatically. Otherwise, choose an official destination or trailer below.</p></>}
        {watchLoading && <div className="inline-loading"><span className="spinner" /> Checking official watch options…</div>}
        {watchError && <div className="watch-message">{watchError}</div>}
        {watchData?.providers?.length ? <div className="source-provider-list"><div className="field-label">REPORTED IN {watchData.country}</div><div className="source-provider-chips">{watchData.providers.map((provider) => <span key={provider.providerId + "-" + provider.bucket}>{provider.name}<small>{provider.bucket === "flatrate" ? "Subscription" : provider.bucket === "free" ? "Free" : provider.bucket === "ads" ? "With ads" : provider.bucket === "rent" ? "Rent" : "Buy"}</small></span>)}</div></div> : null}
        {watchData?.link && <button className="button button-primary source-action-button" onClick={() => void openOfficialDestination(watchData.link)}>Open official watch options ({watchData.country}) <span>↗</span></button>}
        {trailerUrl && <button className="button button-secondary source-action-button" onClick={() => void openOfficialDestination(trailerUrl)}>Watch official trailer <span>↗</span></button>}
        {playTarget.itemPageUrl && <button className="button button-secondary source-action-button" onClick={() => void openOfficialDestination(playTarget.itemPageUrl)}>Open original source page <span>↗</span></button>}
        {playTarget.licenseUrl && <button className="button button-ghost source-action-button" onClick={() => void openOfficialDestination(playTarget.licenseUrl)}>Review licence <span>↗</span></button>}
        {!watchData?.link && !trailerUrl && !playTarget.itemPageUrl && !playTarget.playableUrl && <p className="watch-message">{tmdbEnabled ? "No direct playback source or official destination was returned for this title. It may need another catalogue/provider integration." : "Connect TMDB in Settings to discover official viewing options. Direct playback only appears when a source adapter returns a compatible media URL."}</p>}
        {playerError && <div className="player-error">{playerError}</div>}
        <div className="advanced-source-toggle"><button className="text-action" onClick={() => setShowAdvancedSource((value) => !value)}>{showAdvancedSource ? "Hide advanced source entry" : "Advanced · enter a direct media URL manually"} <span>{showAdvancedSource ? "−" : "+"}</span></button></div>
        {showAdvancedSource && <div className="advanced-source-panel"><label className="field-label" htmlFor="media-url">Direct media URL (advanced fallback)</label><input id="media-url" className="settings-input" inputMode="url" autoComplete="off" placeholder="https://example.com/authorised-video.mp4" value={playUrl} onChange={(event) => { setPlayUrl(event.target.value); setPlaybackQueue([]); setCurrentSourceIndex(0); setPlayerError(""); setPlayerLoaded(false); }} /><p className="field-help">For a source you are authorised to access. HTTP(S) only; URLs containing credentials are rejected. Protected streams and provider restrictions are not bypassed.</p><button className="button button-secondary" onClick={validatePlaybackUrl}>Load manual source <span>→</span></button></div>}
      </div>
        : <div className="video-stage"><video key={playUrl} src={playUrl} controls autoPlay playsInline preload="metadata" onError={handleWebPlaybackError} /><div className="video-actions"><button className="button button-ghost" onClick={() => { setPlayUrl(""); setPlaybackQueue([]); setCurrentSourceIndex(0); setPlayerLoaded(false); setPlayerError(""); setShowAdvancedSource(true); }}>Change source</button><span>Direct source · native Media3 on Android</span></div>{playerError && <div className="player-error">{playerError}</div>}</div>}
    </section></div>}
  </div>;
}

function catalogueSourceLabel(sourceId: string): string {
  if (sourceId === "offline-catalogue") return "Offline catalogue";
  if (sourceId === "tmdb" || sourceId.startsWith("tmdb:")) return "TMDB";
  if (sourceId === "internet-archive-open-license") return "Internet Archive · open-license";
  return sourceId.split("::")[0] || sourceId;
}
function languageClaimLabel(claim: import("./types").LanguageClaim): string {
  if (claim.selectable && claim.evidence === "player-probe" && claim.kind === "embedded-audio") return "Verified audio track";
  if (claim.selectable && claim.evidence === "player-probe" && claim.kind === "subtitle") return "Verified subtitle track";
  if (claim.kind === "embedded-audio") return "Reported audio claim · not verified";
  if (claim.kind === "dubbed-version") return "Dubbed version reported";
  if (claim.kind === "subtitle") return "Subtitle reported";
  return "Original-language metadata";
}

function MediaGrid({ items, onSelect, onWatch, isSaved, onToggleSave }: { items: MediaItem[]; onSelect: (item: MediaItem) => void; onWatch: (item: MediaItem) => void; isSaved: (item: MediaItem) => boolean; onToggleSave: (item: MediaItem) => void }) {
  return <div className="media-grid">{items.map((item) => <article className="media-card" key={getStableMediaId(item)}>
    <button className="poster-button" onClick={() => onSelect(item)} aria-label={"View details for " + item.title}>
      {item.imageUrl || item.posterPath ? <img className="poster-image" src={item.imageUrl ?? posterUrl(item.posterPath)} alt={item.title + " poster"} loading="lazy" /> : <div className="poster-missing">7x<span>CINEMA</span></div>}
      <span className="poster-kind">{kindLabel(item)}</span><span className="poster-rating"><i>★</i> {ratingLabel(item)}</span><span className="poster-hover"><i>↗</i><small>VIEW DETAILS</small></span>
    </button>
    <button className="poster-watch-action" onClick={() => onWatch(item)} aria-label={item.libraryItemId ? (item.libraryItemType === "series" ? "Browse episodes for " + item.title : "Play " + item.title + " from your library") : (getPlaybackIntent(item).type === "direct" ? "Play " + item.title : "Find where to watch " + item.title)}>{item.libraryItemId ? (item.libraryItemType === "series" ? "▷ Episodes" : "▶ Play from library") : (getPlaybackIntent(item).type === "direct" ? "▶ Play now" : "▷ Watch")}</button>
    <div className="media-card-info"><button className="media-title" onClick={() => onSelect(item)}>{item.title}</button><div className="media-subline"><span>{item.year ?? "Year unknown"}</span><i /><span>{item.sources.length > 1 ? item.sources.length + " catalogues" : (item.genres[0] ?? (item.kind === "movie" ? "Film" : "Series"))}</span></div><button className={"save-small " + (isSaved(item) ? "is-saved" : "")} onClick={() => onToggleSave(item)} aria-label={isSaved(item) ? "Remove " + item.title + " from My List" : "Save " + item.title + " to My List"}>{isSaved(item) ? "✓" : "+"}</button></div>
  </article>)}</div>;
}
