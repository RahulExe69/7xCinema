import type { MediaItem, SearchProvider } from "../types";

const API = "https://archive.org";
const PROVIDER_ID = "internet-archive-open-license";

interface ArchiveDocument {
  identifier?: string;
  title?: string;
  year?: string | number;
  description?: string | string[];
  creator?: string | string[];
}
interface ArchiveSearchResponse { response?: { docs?: ArchiveDocument[]; numFound?: number }; }
interface ArchiveFile { name?: string; format?: string; size?: string | number; }
interface ArchiveMetadata {
  metadata?: {
    identifier?: string;
    title?: string;
    year?: string | number;
    date?: string;
    description?: string | string[];
    creator?: string | string[];
    licenseurl?: string | string[];
    language?: string | string[];
  };
  files?: ArchiveFile[];
}

function firstText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.find((entry) => typeof entry === "string" && entry.trim())?.trim() ?? "";
  return typeof value === "string" ? value.trim() : "";
}
function cleanYear(value: string | number | undefined): number | undefined {
  const match = String(value ?? "").match(/\b(18\d{2}|19\d{2}|20\d{2}|21\d{2})\b/);
  if (!match) return undefined;
  const year = Number(match[1]);
  return year >= 1800 && year <= new Date().getUTCFullYear() + 2 ? year : undefined;
}
function cleanIdentifier(value: string | undefined): string | undefined {
  return typeof value === "string" && /^[a-z0-9_-]{5,80}$/i.test(value) ? value : undefined;
}
function encodePath(value: string): string {
  return value.split("/").map((part) => encodeURIComponent(part)).join("/");
}

/**
 * This deliberately accepts only public-domain-mark and CC0 labels from the
 * item metadata. It is not a legal determination: the uploader's claim still
 * needs verification on the item page before reuse or redistribution.
 */
export function isExplicitOpenLicense(value: unknown): boolean {
  const candidates = Array.isArray(value) ? value : [value];
  return candidates.some((candidate) => {
    if (typeof candidate !== "string") return false;
    try {
      const url = new URL(candidate);
      if (!["creativecommons.org", "www.creativecommons.org"].includes(url.hostname.toLowerCase())) return false;
      return /^\/publicdomain\/(?:mark|zero)\/1\.0\/?$/i.test(url.pathname);
    } catch {
      return false;
    }
  });
}

export function chooseArchiveMp4(files: ArchiveFile[]): ArchiveFile | undefined {
  return files
    .filter((file) => {
      if (!file.name || file.name.startsWith("__ia_thumb") || file.name.includes("/__ia_thumb")) return false;
      const pathSegments = file.name.split("/");
      if (pathSegments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))) return false;
      if (!/\.mp4$/i.test(file.name) || /(?:sample|preview|thumbnail|thumb)\.mp4$/i.test(file.name)) return false;
      const format = (file.format ?? "").toLowerCase();
      return !format || /mpeg\s*-?4|h\.?264|video/i.test(format);
    })
    .sort((left, right) => Number(right.size ?? 0) - Number(left.size ?? 0))[0];
}

async function archiveJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, credentials: "omit", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Internet Archive request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try { results[index] = await worker(items[index]); }
      catch { /* One malformed/unavailable archive item must not break sibling results. */ }
    }
  }));
  return results;
}

async function resolveArchiveDocument(
  doc: ArchiveDocument,
  signal: AbortSignal,
): Promise<MediaItem | null> {
  const identifier = cleanIdentifier(doc.identifier);
  if (!identifier) return null;
  const metadataUrl = `${API}/metadata/${encodeURIComponent(identifier)}`;
  const record = await archiveJson<ArchiveMetadata>(metadataUrl, signal);
  const metadata = record.metadata;
  if (!metadata) return null;
  const licenseValue = metadata.licenseurl;
  const licenseUrl = Array.isArray(licenseValue)
    ? licenseValue.find(isExplicitOpenLicense)
    : licenseValue;
  if (!licenseUrl || !isExplicitOpenLicense(licenseUrl)) return null;

  const file = chooseArchiveMp4(record.files ?? []);
  if (!file?.name) return null;
  const title = firstText(metadata.title) || firstText(doc.title);
  if (!title) return null;
  const year = cleanYear(metadata.year ?? metadata.date ?? doc.year);
  const description = firstText(metadata.description) || firstText(doc.description);
  const creator = firstText(metadata.creator) || firstText(doc.creator);
  const safeId = encodeURIComponent(identifier);

  return {
    id: `archive:${identifier}`,
    kind: "movie",
    title,
    originalTitle: title,
    year,
    overview: description,
    imageUrl: `${API}/services/img/${safeId}`,
    playableUrl: `${API}/download/${safeId}/${encodePath(file.name)}`,
    itemPageUrl: `${API}/details/${safeId}`,
    licenseUrl,
    creator: creator || undefined,
    genreIds: [],
    genres: ["Open-license"],
    sources: [PROVIDER_ID],
  };
}

export function createInternetArchiveProvider(): SearchProvider {
  return {
    id: PROVIDER_ID,
    label: "Open-license archive",
    async search(query, signal) {
      const term = query.trim();
      if (!term || signal.aborted) return [];
      const escapedPhrase = '"' + term.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
      const searchQuery = `mediatype:movies AND licenseurl:http*publicdomain* AND (title:${escapedPhrase} OR description:${escapedPhrase} OR subject:${escapedPhrase})`;
      const params = new URLSearchParams({ q: searchQuery, rows: "12", page: "1", output: "json" });
      for (const field of ["identifier", "title", "year", "description", "creator", "licenseurl"]) params.append("fl[]", field);
      const response = await archiveJson<ArchiveSearchResponse>(`${API}/advancedsearch.php?${params.toString()}`, signal);
      const docs = (response.response?.docs ?? []).slice(0, 10);
      return (await mapWithConcurrency(docs, 3, (doc) => resolveArchiveDocument(doc, signal)))
        .filter((item): item is MediaItem => item !== undefined && item !== null);
    },
  };
}
