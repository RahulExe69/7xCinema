package com.sevenxcinema.android

import com.sevenxcinema.aggregation.groupCatalogueRecords
import com.sevenxcinema.aggregation.normaliseProviderItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DemoCatalogueTest {
    @Test
    fun unrelatedQueriesDoNotReturnTheSameDuneFixture() {
        val providers = demoProviders()
        for (query in listOf("The Batman", "Interstellar", "Spirited Away", "")) {
            for (provider in providers) {
                val results = provider.search?.invoke(query) ?: emptyList()
                assertTrue("${provider.id} returned a false match for '$query'", results.isEmpty())
            }
        }
    }

    @Test
    fun duneFixtureGroupsThreeSourcesAndLabelsLanguageProvenance() {
        val records = demoProviders().flatMap { provider ->
            provider.search!!.invoke("Dune Part Two").map { item ->
                normaliseProviderItem(provider.id, provider.priority, item)
            }
        }

        val title = groupCatalogueRecords(records).single()
        assertEquals("Dune: Part Two", title.title)
        assertEquals(3, title.sources.size)

        val labels = describeLanguageClaims(title)
        assertEquals(3, labels.size)
        assertTrue(labels.any { it == "English · reported claim (demo-english)" })
        assertTrue(labels.any { it == "Hindi · dubbed version (demo-hindi-version)" })
        assertTrue(labels.any { it == "Bengali · subtitle (demo-bengali-subtitles)" })
        assertFalse(labels.any { it.contains("verified audio track") })
    }
}
