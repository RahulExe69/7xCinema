import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Browser } from "@capacitor/browser";
import { backdropUrl, getStableMediaId, languageNames, posterUrl, starterCatalogue } from "./catalogue";
import { createOfflineProvider, searchEveryProvider } from "./core/search";
import { createTmdbSearchProvider, fetchTrending, fetchWatchProviders, getTmdbKey, hasTmdbKey, setTmdbKey } from "./services/tmdb";
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
  const [region, setRegion] = useState(readRegion);
  const [apiKeyDraft, setApiKeyDraft] = useState(getTmdbKey);
  const [apiRevision, setApiRevision] = useState(0);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [trending, setTrending] = useState<MediaItem[]>(starterCatalogue);
  const [trendingBusy, setTrendingBusy] = useState(false);
  const [playTarget, setPlayTarget] = useState<MediaItem | null>(null);
  const [playUrl, setPlayUrl] = useState("");
  const [playerError, setPlayerError] = useState("");
  const [genreFilter, setGenreFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState<"all" | "movie" | "tv">("all");
  const tmdbEnabled = hasTmdbKey();

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
    if (!selected || !tmdbEnabled) { setWatchData(null); setWatchError(""); return; }
    const controller = new AbortController();
    setWatchLoading(true); setWatchError("");
    fetchWatchProviders(selected, region, controller.signal).then(setWatchData)
      .catch((error: unknown) => { if (!controller.signal.aborted) setWatchError(error instanceof Error ? error.message : "Availability could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setWatchLoading(false); });
    return () => controller.abort();
  }, [selected?.id, region, tmdbEnabled, apiRevision]);

  const openPage = useCallback((next: AppPage) => {
    setPage(next); setSelected(null); setPlayTarget(null);
    if (next !== "search") setSearchMessage("");
  }, []);

  const runSearch = useCallback(async (rawQuery = query) => {
    const clean = rawQuery.trim();
    if (!clean) { setSearchMessage("Enter a title, genre, or year to search the catalogue."); setPage("search"); return; }
    setQuery(clean); setPage("search"); setSelected(null); setSearching(true); setSearchMessage(""); setResults([]);
    const providers = [createOfflineProvider()];
    if (hasTmdbKey()) providers.push(createTmdbSearchProvider());
    try {
      const snapshot = await searchEveryProvider(clean, providers, (partial) => {
        setResults(partial.results); setReports(partial.providers);
      }, 6000);
      setResults(snapshot.results); setReports(snapshot.providers);
      if (!snapshot.results.length) setSearchMessage(hasTmdbKey()
        ? "No matches found. Try the original title or a shorter query."
        : "No match in the offline starter catalogue. Add a TMDB API key in Settings for live catalogue search.");
    } catch (error) {
      setSearchMessage(error instanceof Error ? error.message : "Search failed. Please try again.");
    } finally { setSearching(false); }
  }, [query]);

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
    let items = page === "watchlist" ? watchlist : (page === "search" ? results : trending);
    if (page === "movies") items = items.filter((item) => item.kind === "movie");
    if (page === "series") items = items.filter((item) => item.kind === "tv");
    if (kindFilter !== "all" && page !== "movies" && page !== "series") items = items.filter((item) => item.kind === kindFilter);
    if (genreFilter !== "all") items = items.filter((item) => item.genres.includes(genreFilter));
    return items;
  }, [page, watchlist, results, trending, kindFilter, genreFilter]);
  const hero = trending.find((item) => item.backdropPath) ?? starterCatalogue[0];

  const querySubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void runSearch(); };
  const saveSettings = () => {
    try {
      setTmdbKey(apiKeyDraft); localStorage.setItem("7xcinema.region", region);
      setSettingsMessage(apiKeyDraft.trim() ? "Settings saved on this device. Live features are enabled if the API key is valid." : "Settings saved. Offline catalogue mode is ready.");
      setApiRevision((value) => value + 1); setSearchMessage("");
    } catch (error) { setSettingsMessage(error instanceof Error ? error.message : "Settings could not be saved."); }
  };
  const startPlayback = (item: MediaItem) => { setPlayTarget(item); setPlayUrl(""); setPlayerError(""); };
  const validatePlaybackUrl = () => {
    let parsed: URL;
    try { parsed = new URL(playUrl.trim()); } catch { setPlayerError("Enter a complete media URL beginning with https:// or http://."); return; }
    if (!["https:", "http:"].includes(parsed.protocol)) { setPlayerError("Only HTTP(S) media URLs are supported."); return; }
    if (parsed.username || parsed.password) { setPlayerError("URLs containing embedded credentials are blocked for your safety."); return; }
    setPlayerError("");
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

          <section className="section-block"><div className="section-heading"><div><div className="section-kicker">HAND-PICKED FOR YOUR SESSION</div><h2>{tmdbEnabled ? "Trending this week" : "Your starter collection"} <span className="heading-star">✳</span></h2><p>{tmdbEnabled ? "Freshly fetched from the live catalogue." : "A ready-to-browse collection that works even offline."}</p></div><button className="text-action" onClick={() => openPage("movies")}>Explore all <span>→</span></button></div>
            {trendingBusy && <div className="inline-loading"><span className="spinner" /> Loading trending titles…</div>}<MediaGrid items={trending.slice(0, 8)} onSelect={setSelected} isSaved={isSaved} onToggleSave={toggleWatchlist} /></section>

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
          {visibleItems.length > 0 && <MediaGrid items={visibleItems} onSelect={setSelected} isSaved={isSaved} onToggleSave={toggleWatchlist} />}
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
          <div className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon">♡</span><div><h2>My List</h2><p>{watchlist.length} saved {watchlist.length === 1 ? "title" : "titles"} on this device.</p></div></div><button className="button button-ghost danger-button" disabled={!watchlist.length} onClick={() => { setWatchlist([]); localStorage.removeItem("7xcinema.watchlist"); }}>Clear saved list</button></div>
          <div className="settings-card"><div className="settings-card-heading"><span className="settings-card-icon">ⓘ</span><div><h2>About this build</h2><p>7xCinema 0.2.0 · React + TypeScript + Capacitor</p></div></div><p className="about-copy">The offline starter catalogue works without an account. Live search and watch-provider availability require your TMDB API key. In-app playback accepts a direct HTTP(S) media URL you are authorised to access and compatible with the device’s video player. Live third-party stream providers are not configured in this build.</p></div>
        </section>}
        <footer className="app-footer"><span>7XCINEMA <b>·</b> DISCOVER MORE, SCROLL LESS.</span><span>METADATA IS NOT A PLAYABLE SOURCE. <b>✳</b></span></footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">{NAV.map((item) => <button key={item.page} className={page === item.page ? "mobile-nav-active" : ""} onClick={() => openPage(item.page)}><span>{item.icon}</span><small>{item.label}</small></button>)}<button className={page === "settings" ? "mobile-nav-active" : ""} onClick={() => openPage("settings")}><span>⚙</span><small>Settings</small></button></nav>
    </main>

    {selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="detail-modal" role="dialog" aria-modal="true" aria-label={selected.title}>
      <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close details">×</button><div className="detail-backdrop" style={{ backgroundImage: selected.backdropPath ? 'linear-gradient(0deg, #11141d 0%, rgba(17,20,29,.22) 100%), url("' + backdropUrl(selected.backdropPath) + '")' : undefined }} />
      <div className="detail-content"><div className="detail-poster-wrap">{selected.posterPath ? <img className="detail-poster" src={posterUrl(selected.posterPath)} alt={selected.title + " poster"} /> : <div className="poster-missing">7x</div>}</div>
        <div className="detail-info"><div className="section-kicker">{kindLabel(selected)} · {selected.year ?? "Year unknown"}</div><h2>{selected.title}</h2><div className="detail-facts"><span className="rating-star">★</span><strong>{ratingLabel(selected)}</strong><span>{selected.kind === "movie" ? (selected.runtimeMinutes ? selected.runtimeMinutes + " min" : "Feature film") : (selected.seasonCount ? selected.seasonCount + " seasons" : "Series")}</span><span className="fact-divider">|</span><span>{selected.originalLanguage ? languageNames[selected.originalLanguage] ?? selected.originalLanguage.toUpperCase() : "Original language unknown"}</span></div>
          <p className="detail-overview">{selected.overview || "No synopsis is available for this title yet."}</p><div className="genre-tags">{selected.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
          <div className="detail-actions"><button className="button button-primary" onClick={() => startPlayback(selected)}>▶ &nbsp;Open player</button><button className={"button " + (isSaved(selected) ? "button-saved" : "button-secondary")} onClick={() => toggleWatchlist(selected)}>{isSaved(selected) ? "✓ In My List" : "＋ Add to My List"}</button></div>
        </div>
      </div>
      <div className="watch-section"><div className="watch-heading"><div><div className="section-kicker">WHERE TO WATCH</div><h3>Official destinations <span>{region}</span></h3></div><span className="official-tag">TMDB DATA</span></div>
        {!tmdbEnabled ? <div className="watch-message">Connect your TMDB API key in Settings to look up reported official streaming, rental, and purchase destinations for your region.</div>
          : watchLoading ? <div className="inline-loading"><span className="spinner" /> Checking reported availability…</div>
          : watchError ? <div className="watch-message">{watchError}</div>
          : watchData && watchData.providers.length ? <><div className="watch-providers">{watchData.providers.map((provider) => <button key={provider.providerId + "-" + provider.bucket} className="watch-provider" onClick={() => void openOfficialDestination(watchData.link)} title={"Open the official availability page for " + provider.name}>{provider.logoPath ? <img src={provider.logoPath} alt="" /> : <span className="provider-initial">{provider.name.slice(0,1)}</span>}<strong>{provider.name}</strong><small>{provider.bucket === "flatrate" ? "Subscription" : provider.bucket === "free" ? "Free" : provider.bucket === "ads" ? "With ads" : provider.bucket === "rent" ? "Rent" : "Buy"}</small></button>)}</div>{watchData.link && <button className="text-action availability-link" onClick={() => void openOfficialDestination(watchData.link)}>View all reported options on TMDB <span>↗</span></button>}<p className="availability-note">Availability is provided by TMDB and may change. Confirm region, subscription, language, and playback on the destination service.</p></>
          : <div className="watch-message">TMDB has no provider data for this title in {region}. This does not prove that the title is unavailable everywhere.</div>}
      </div>
    </section></div>}

    {playTarget && <div className="modal-backdrop player-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPlayTarget(null); }}><section className="player-modal" role="dialog" aria-modal="true" aria-label={"Player for " + playTarget.title}>
      <div className="player-top"><div><div className="section-kicker">7XCINEMA PLAYER</div><h2>{playTarget.title}</h2></div><button className="modal-close inline-close" onClick={() => setPlayTarget(null)} aria-label="Close player">×</button></div>
      {!playUrl || playerError ? <div className="player-entry"><div className="player-entry-icon">▶</div><h3>Bring your own authorised source.</h3><p>This catalogue can discover titles and official watch destinations. It does not invent or resolve third-party stream links.</p><label className="field-label" htmlFor="media-url">Direct media URL</label><input id="media-url" className="settings-input" inputMode="url" placeholder="https://example.com/your-authorised-video.mp4" value={playUrl} onChange={(event) => { setPlayUrl(event.target.value); setPlayerError(""); }} /><p className="field-help">Use an HTTP(S) direct media URL you have permission to access. The device browser player supports compatible formats; some HLS/DASH and protected streams need a native player integration.</p>{playerError && <div className="player-error">{playerError}</div>}<button className="button button-primary" onClick={validatePlaybackUrl}>Load media <span>→</span></button></div>
        : <div className="video-stage"><video key={playUrl} src={playUrl} controls autoPlay playsInline preload="metadata" onError={() => setPlayerError("This URL could not be played. Check the link, permissions, format, and device support.")} /><div className="video-actions"><button className="button button-ghost" onClick={() => { setPlayUrl(""); setPlayerError(""); }}>Change URL</button><span>Direct source · no source resolution</span></div>{playerError && <div className="player-error">{playerError}</div>}</div>}
    </section></div>}
  </div>;
}

function MediaGrid({ items, onSelect, isSaved, onToggleSave }: { items: MediaItem[]; onSelect: (item: MediaItem) => void; isSaved: (item: MediaItem) => boolean; onToggleSave: (item: MediaItem) => void }) {
  return <div className="media-grid">{items.map((item) => <article className="media-card" key={getStableMediaId(item)}>
    <button className="poster-button" onClick={() => onSelect(item)} aria-label={"View details for " + item.title}>
      {item.posterPath ? <img className="poster-image" src={posterUrl(item.posterPath)} alt={item.title + " poster"} loading="lazy" /> : <div className="poster-missing">7x<span>CINEMA</span></div>}
      <span className="poster-kind">{kindLabel(item)}</span><span className="poster-rating"><i>★</i> {ratingLabel(item)}</span><span className="poster-hover"><i>↗</i><small>VIEW DETAILS</small></span>
    </button>
    <div className="media-card-info"><button className="media-title" onClick={() => onSelect(item)}>{item.title}</button><div className="media-subline"><span>{item.year ?? "Year unknown"}</span><i /><span>{item.genres[0] ?? (item.kind === "movie" ? "Film" : "Series")}</span></div><button className={"save-small " + (isSaved(item) ? "is-saved" : "")} onClick={() => onToggleSave(item)} aria-label={isSaved(item) ? "Remove " + item.title + " from My List" : "Save " + item.title + " to My List"}>{isSaved(item) ? "✓" : "+"}</button></div>
  </article>)}</div>;
}
