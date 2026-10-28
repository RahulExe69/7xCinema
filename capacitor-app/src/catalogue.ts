import type { MediaItem } from "./types";

export const genreNames: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  10769: "Foreign",
};

export const languageNames: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  fr: "French",
  de: "German",
  zh: "Chinese",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  pt: "Portuguese",
  ar: "Arabic",
  it: "Italian",
  ru: "Russian",
  tr: "Turkish",
  th: "Thai",
};

export const posterUrl = (path?: string, size: "w342" | "w500" | "original" = "w500") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

export const backdropUrl = (path?: string) =>
  path ? `https://image.tmdb.org/t/p/original${path}` : undefined;

const seed = (
  id: string,
  kind: MediaItem["kind"],
  title: string,
  year: number,
  posterPath: string,
  backdropPath: string,
  overview: string,
  rating: number,
  originalLanguage: string,
  genreIds: number[],
  extras: Partial<MediaItem> = {},
): MediaItem => ({
  id,
  tmdbId: Number(id.replace(/\D/g, "")) || undefined,
  kind,
  title,
  originalTitle: title,
  year,
  posterPath,
  backdropPath,
  overview,
  rating,
  voteCount: 0,
  originalLanguage,
  genreIds,
  genres: genreIds.map((genreId) => genreNames[genreId]).filter(Boolean),
  sources: ["offline-catalogue"],
  ...extras,
});

// Curated offline starter catalogue: it works without an API key or network call.
// TMDB IDs are used only as stable catalogue identifiers, not as evidence of availability.
export const starterCatalogue: MediaItem[] = [
  seed("693134", "movie", "Dune: Part Two", 2024, "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg", "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg", "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.", 8.2, "en", [878, 12, 28], { runtimeMinutes: 166 }),
  seed("157336", "movie", "Interstellar", 2014, "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", "/xJHokMbljvjADYdit5fK5VQsXEG.jpg", "A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars.", 8.7, "en", [12, 18, 878], { runtimeMinutes: 169 }),
  seed("27205", "movie", "Inception", 2010, "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg", "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg", "A skilled thief who steals secrets through dream-sharing technology is offered a chance to erase his criminal past.", 8.4, "en", [28, 878, 12], { runtimeMinutes: 148 }),
  seed("945961", "movie", "Alien: Romulus", 2024, "/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg", "/b3mdmjYTEL70j7nuXATUAD9qgu4.jpg", "Young space colonizers come face to face with the most terrifying life form in the universe.", 7.2, "en", [878, 27, 53], { runtimeMinutes: 119 }),
  seed("299534", "movie", "Avengers: Endgame", 2019, "/or06FN3Dka5tukK1e9sl16pB3iy.jpg", "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg", "The Avengers assemble once more to reverse the devastation caused by Thanos.", 8.2, "en", [12, 878, 28], { runtimeMinutes: 181 }),
  seed("1022789", "movie", "Inside Out 2", 2024, "/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg", "/stKGOm8UyhuLPR9sZLjs5AkmncA.jpg", "Riley enters her teenage years as new emotions arrive at headquarters.", 7.6, "en", [16, 10751, 12, 35], { runtimeMinutes: 96 }),
  seed("438631", "movie", "Dune", 2021, "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg", "/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg", "A gifted young man must travel to the most dangerous planet in the universe to ensure the future of his people.", 7.8, "en", [878, 12, 18], { runtimeMinutes: 155 }),
  seed("157239", "movie", "The Raid 2", 2014, "/olA39iaXISiKE3a2hWb2A5u1m4A.jpg", "/7FJYw4U0xJfJqzZ6u1w2xV7yXqX.jpg", "An undercover officer enters a violent criminal underworld in a fight to protect his family and expose corruption.", 7.7, "id", [28, 80, 53], { runtimeMinutes: 150 }),
  seed("66732", "tv", "Stranger Things", 2016, "/uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg", "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg", "When a young boy vanishes, a small town uncovers a mystery involving secret experiments and supernatural forces.", 8.6, "en", [18, 10765, 9648], { seasonCount: 4 }),
  seed("94605", "tv", "Arcane", 2021, "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg", "/rkB4LyZHo1NHXFEDHl9vSD9r1lI.jpg", "Two sisters find themselves on opposing sides of a conflict between a prosperous city and its neglected underground.", 9.0, "en", [16, 18, 10765, 28], { seasonCount: 2 }),
  seed("93405", "tv", "Squid Game", 2021, "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg", "/qvZ91Fw3xkRZrw6v5eO2lK1eYb4.jpg", "Hundreds of cash-strapped contestants accept an invitation to compete in children's games for a tempting prize.", 7.8, "ko", [18, 9648, 10765], { seasonCount: 2 }),
  seed("1399", "tv", "Game of Thrones", 2011, "/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg", "/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg", "Noble families fight for control of the Iron Throne while an ancient threat gathers beyond the Wall.", 8.5, "en", [18, 10765, 10759], { seasonCount: 8 }),
  seed("94997", "tv", "House of the Dragon", 2022, "/z2yahl2uefxDCl0nogcRBstwruJ.jpg", "/etj8E2o0bud0HkONVQPjyCkIvpv.jpg", "The Targaryen dynasty reaches the height of its power in a story of succession and civil war.", 8.3, "en", [18, 10765, 10759], { seasonCount: 2 }),
  seed("124364", "tv", "The Boys", 2019, "/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg", "/mGVrXeIjyecj6TKmwPVpHlscEmw.jpg", "A group of vigilantes sets out to expose superheroes who abuse their fame and power.", 8.5, "en", [10759, 10765, 18], { seasonCount: 4 }),
];

export function getStableMediaId(item: MediaItem): string {
  return item.tmdbId ? `${item.kind}:${item.tmdbId}` : item.id;
}

export function matchesQuery(item: MediaItem, query: string): boolean {
  const value = query.trim().toLocaleLowerCase();
  if (!value) return true;
  const haystack = [item.title, item.originalTitle, item.year?.toString(), ...item.genres]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  return haystack.includes(value);
}
