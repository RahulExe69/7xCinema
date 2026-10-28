package com.sevenxcinema.aggregation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class AggregationCoreTest {
    private fun source(
        provider: String,
        itemId: String,
        title: String = "Example Film",
        year: Int? = 2024,
        ids: Map<String, String> = emptyMap(),
        mediaType: String = "movie",
        season: Int? = null,
        episode: Int? = null,
        claims: List<ProviderLanguageClaim> = emptyList(),
        priority: Int = 10,
    ): SourceRecord = normaliseProviderItem(
        providerId = provider,
        priority = priority,
        item = CatalogueItem(
            providerItemId = itemId,
            title = title,
            mediaType = mediaType,
            year = year,
            externalIds = ids,
            seasonNumber = season,
            episodeNumber = episode,
            languageClaims = claims,
        ),
    )

    @Test
    fun normalisesTitlesAndDowngradesUnverifiedEmbeddedAudioClaims() {
        assertEquals("amelie the sequel", normaliseTitle("  Amélie: The Sequel! "))

        val record = source(
            provider = "provider",
            itemId = "item",
            claims = listOf(
                ProviderLanguageClaim(
                    languageCode = "EN",
                    language = "English",
                    kind = ClaimKind.EMBEDDED_AUDIO,
                    evidence = ClaimEvidence.PROVIDER_METADATA,
                ),
            ),
        )

        assertEquals(ClaimKind.REPORTED, record.languageClaims.single().kind)
        assertEquals(ClaimKind.EMBEDDED_AUDIO, record.languageClaims.single().reportedKind)
        assertFalse(record.languageClaims.single().selectable)
    }

    @Test
    fun combinesSourcesBySharedIdsAndPreservesLanguageProvenance() {
        val records = listOf(
            source(
                provider = "english",
                itemId = "1",
                title = "Dune: Part Two",
                ids = mapOf("imdb" to "tt15239678"),
                claims = listOf(ProviderLanguageClaim("en", "English", kind = ClaimKind.REPORTED)),
                priority = 1,
            ),
            source(
                provider = "hindi",
                itemId = "2",
                title = "Dune Part Two Hindi Dub",
                ids = mapOf("imdb" to "tt15239678"),
                claims = listOf(ProviderLanguageClaim("hi", "Hindi", kind = ClaimKind.DUBBED_VERSION)),
                priority = 2,
            ),
            source(
                provider = "subtitles",
                itemId = "3",
                title = "Dune Part Two",
                ids = mapOf("imdb" to "tt15239678"),
                claims = listOf(
                    ProviderLanguageClaim("bn", "Bengali", kind = ClaimKind.SUBTITLE, evidence = ClaimEvidence.SUBTITLE_API),
                ),
                priority = 3,
            ),
        )

        val result = groupCatalogueRecords(records)
        assertEquals(1, result.size)
        val title = result.single()
        assertEquals("imdb:tt15239678", title.canonicalId)
        assertEquals("strong", title.matchConfidence)
        assertEquals(3, title.sources.size)
        assertTrue(title.alternateTitles.contains("Dune Part Two Hindi Dub"))
        assertTrue(title.languageClaims.any { it.languageCode == "en" && it.sourceId == title.sources[0].sourceId })
        assertTrue(title.languageClaims.any { it.languageCode == "hi" && it.kind == ClaimKind.DUBBED_VERSION })
        assertTrue(title.languageClaims.any { it.languageCode == "bn" && it.kind == ClaimKind.SUBTITLE })
    }

    @Test
    fun conflictedDuplicateSourceCannotRegainItsYearFromLaterRows() {
        val records = listOf(
            source("same-provider", "same-id", year = 2020, ids = mapOf("imdb" to "tt1234567")),
            source("same-provider", "same-id", year = 2021, ids = mapOf("imdb" to "tt1234567")),
            source("same-provider", "same-id", year = 2020, ids = mapOf("imdb" to "tt1234567")),
        )

        val title = groupCatalogueRecords(records).single()
        assertEquals(1, title.sources.size)
        assertTrue(title.sources.single().identityConflict)
        assertNull(title.sources.single().year)
        assertNull(title.year)
    }

    @Test
    fun usesConservativeTitleYearFallbackOnlyWhenNeitherSourceHasIds() {
        val noIdA = source("a", "1", title = "Arrival", year = 2016)
        val noIdB = source("b", "2", title = " Arrival! ", year = 2016)
        val identifiedA = source("c", "3", title = "Arrival", year = 2016, ids = mapOf("imdb" to "tt9999999"))
        val identifiedB = source("d", "4", title = "Arrival", year = 2016, ids = mapOf("imdb" to "tt8888888"))

        val groups = groupCatalogueRecords(listOf(noIdA, noIdB, identifiedA, identifiedB))
        assertEquals(3, groups.size)
        val fallback = groups.single { it.sources.any { source -> source.providerId == "a" } }
        assertEquals(2, fallback.sources.size)
        assertEquals("fallback-title-year", fallback.matchConfidence)
        assertTrue(groups.any { it.sources.any { source -> source.providerId == "c" } && it.sources.size == 1 })
        assertTrue(groups.any { it.sources.any { source -> source.providerId == "d" } && it.sources.size == 1 })
    }

    @Test
    fun doesNotMergeConflictingIdsOrDifferentMediaTypes() {
        val records = listOf(
            source("a", "1", title = "Arrival", year = 2016, ids = mapOf("imdb" to "tt1111111")),
            source("b", "2", title = "Arrival", year = 2016, ids = mapOf("imdb" to "tt2222222")),
            source("c", "3", title = "Arrival", year = 2016, mediaType = "series"),
        )
        assertEquals(3, groupCatalogueRecords(records).size)
    }

    @Test
    fun episodesOnlyMergeWhenSeasonAndEpisodeCoordinatesMatch() {
        val records = listOf(
            source("a", "s1e1", title = "Pilot", ids = mapOf("imdb" to "tt7654321"), mediaType = "episode", season = 1, episode = 1),
            source("b", "s1e1-alt", title = "Episode One", ids = mapOf("imdb" to "tt7654321"), mediaType = "episode", season = 1, episode = 1),
            source("c", "s1e2", title = "Pilot", ids = mapOf("imdb" to "tt7654321"), mediaType = "episode", season = 1, episode = 2),
        )
        val groups = groupCatalogueRecords(records)
        assertEquals(2, groups.size)
        assertEquals(2, groups.single { group -> group.sources.any { it.providerId == "a" } }.sources.size)
    }

    @Test
    fun onlyPreparedPlayerObservationsCreateSelectableTracks() {
        val title = groupCatalogueRecords(
            listOf(
                source(
                    "player-source",
                    "movie",
                    ids = mapOf("imdb" to "tt1234567"),
                    claims = listOf(
                        ProviderLanguageClaim("en", "English", kind = ClaimKind.EMBEDDED_AUDIO),
                    ),
                ),
            ),
        ).single()
        val sourceId = title.sources.single().sourceId
        val verified = addVerifiedPlayerTracks(
            title,
            sourceId,
            listOf(
                PlayerTrack(PlayerTrackType.AUDIO, "en", "English"),
                PlayerTrack(PlayerTrackType.AUDIO, "hi", "Hindi"),
                PlayerTrack(PlayerTrackType.SUBTITLE, "bn", "Bengali"),
            ),
        )

        assertTrue(verified.languageClaims.any {
            it.sourceId == sourceId && it.kind == ClaimKind.EMBEDDED_AUDIO &&
                it.languageCode == "hi" && it.evidence == ClaimEvidence.PLAYER_PROBE && it.selectable
        })
        assertTrue(verified.languageClaims.any {
            it.kind == ClaimKind.SUBTITLE && it.languageCode == "bn" &&
                it.evidence == ClaimEvidence.PLAYER_PROBE && it.selectable
        })
        assertTrue(verified.languageClaims.any {
            it.kind == ClaimKind.REPORTED && it.reportedKind == ClaimKind.EMBEDDED_AUDIO && !it.selectable
        })
        assertFailsWith<IllegalArgumentException> {
            addVerifiedPlayerTracks(title, "unrelated::source", listOf(PlayerTrack(PlayerTrackType.AUDIO, "en", "English")))
        }
    }
}
