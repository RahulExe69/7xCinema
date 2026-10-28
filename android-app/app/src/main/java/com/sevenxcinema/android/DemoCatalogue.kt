package com.sevenxcinema.android

import com.sevenxcinema.aggregation.CatalogueItem
import com.sevenxcinema.aggregation.ClaimEvidence
import com.sevenxcinema.aggregation.ClaimKind
import com.sevenxcinema.aggregation.LogicalTitle
import com.sevenxcinema.aggregation.ProviderLanguageClaim
import com.sevenxcinema.aggregation.SearchProvider
import com.sevenxcinema.aggregation.normaliseTitle

/**
 * Fixture catalogue for exercising aggregation and source/language presentation.
 * These adapters deliberately contain no real provider URLs.
 */
fun demoProviders(): List<SearchProvider> = listOf(
    SearchProvider(
        id = "demo-english",
        enabled = true,
        eligible = true,
        searchCapable = true,
        priority = 1,
        search = { query ->
            if (!isDemoSearchQuery(query)) {
                emptyList()
            } else {
                listOf(
                    CatalogueItem(
                        providerItemId = "dune-en",
                        title = "Dune: Part Two",
                        mediaType = "movie",
                        year = 2024,
                        externalIds = mapOf("imdb" to "tt15239678", "tmdb" to "693134"),
                        languageClaims = listOf(
                            ProviderLanguageClaim(
                                "en",
                                "English",
                                kind = ClaimKind.REPORTED,
                                evidence = ClaimEvidence.PROVIDER_METADATA,
                            ),
                        ),
                    ),
                )
            }
        },
    ),
    SearchProvider(
        id = "demo-hindi-version",
        enabled = true,
        eligible = true,
        searchCapable = true,
        priority = 2,
        search = { query ->
            if (!isDemoSearchQuery(query)) {
                emptyList()
            } else {
                Thread.sleep(140)
                listOf(
                    CatalogueItem(
                        providerItemId = "dune-hi",
                        title = "Dune Part Two (Hindi Dub)",
                        mediaType = "movie",
                        year = 2024,
                        externalIds = mapOf("imdb" to "tt15239678"),
                        languageClaims = listOf(
                            ProviderLanguageClaim(
                                "hi",
                                "Hindi",
                                kind = ClaimKind.DUBBED_VERSION,
                                evidence = ClaimEvidence.PROVIDER_METADATA,
                            ),
                        ),
                    ),
                )
            }
        },
    ),
    SearchProvider(
        id = "demo-bengali-subtitles",
        enabled = true,
        eligible = true,
        searchCapable = true,
        priority = 3,
        search = { query ->
            if (!isDemoSearchQuery(query)) {
                emptyList()
            } else {
                Thread.sleep(280)
                listOf(
                    CatalogueItem(
                        providerItemId = "dune-bn-subs",
                        title = "Dune Part Two",
                        mediaType = "movie",
                        year = 2024,
                        externalIds = mapOf("tmdb" to "693134"),
                        languageClaims = listOf(
                            ProviderLanguageClaim(
                                "bn",
                                "Bengali",
                                kind = ClaimKind.SUBTITLE,
                                evidence = ClaimEvidence.SUBTITLE_API,
                            ),
                        ),
                    ),
                )
            }
        },
    ),
)

private fun isDemoSearchQuery(query: String): Boolean {
    val normalized = normaliseTitle(query)
    return normalized.contains("dune") ||
        normalized.contains("part two") ||
        normalized == "tt15239678" ||
        normalized == "693134"
}

/**
 * Display language claims without hiding either their evidence type or source.
 * Provider-reported audio claims are explicitly not presented as selectable tracks.
 */
fun describeLanguageClaims(title: LogicalTitle): List<String> {
    val providerBySource = title.sources.associate { it.id to it.providerId }
    return title.languageClaims.distinct().map { claim ->
        val detail = when (claim.kind) {
            ClaimKind.EMBEDDED_AUDIO ->
                if (claim.selectable && claim.evidence == ClaimEvidence.PLAYER_PROBE) {
                    "verified audio track"
                } else {
                    "audio claim"
                }
            ClaimKind.DUBBED_VERSION -> "dubbed version"
            ClaimKind.SUBTITLE ->
                if (claim.selectable && claim.evidence == ClaimEvidence.PLAYER_PROBE) {
                    "verified subtitle track"
                } else {
                    "subtitle"
                }
            ClaimKind.REPORTED ->
                if (claim.reportedKind == ClaimKind.EMBEDDED_AUDIO) "unverified audio claim" else "reported claim"
        }
        val source = providerBySource[claim.sourceId] ?: "unknown source"
        "${claim.language} · $detail ($source)"
    }.distinct().sorted()
}
