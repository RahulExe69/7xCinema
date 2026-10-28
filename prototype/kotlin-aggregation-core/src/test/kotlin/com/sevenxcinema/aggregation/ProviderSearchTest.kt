package com.sevenxcinema.aggregation

import java.util.Collections
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class ProviderSearchTest {
    private fun provider(
        id: String,
        enabled: Boolean = true,
        eligible: Boolean = true,
        searchCapable: Boolean = true,
        priority: Int = 10,
        search: ((String) -> List<CatalogueItem>)? = { emptyList() },
    ) = SearchProvider(
        id = id,
        enabled = enabled,
        eligible = eligible,
        searchCapable = searchCapable,
        priority = priority,
        search = search,
    )

    private fun item(
        id: String,
        title: String,
        imdb: String? = null,
        year: Int? = 2024,
        claims: List<ProviderLanguageClaim> = emptyList(),
    ) = CatalogueItem(
        providerItemId = id,
        title = title,
        mediaType = "movie",
        year = year,
        externalIds = imdb?.let { mapOf("imdb" to it) } ?: emptyMap(),
        languageClaims = claims,
    )

    @Test
    fun fansOutSearchAndGroupsMatchingTitlesAcrossProviders() {
        val updates = Collections.synchronizedList(mutableListOf<SearchSnapshot>())
        val calls = AtomicInteger()
        val providers = listOf(
            provider("english", priority = 1) { query ->
                assertEquals("Dune Part Two", query)
                calls.incrementAndGet()
                listOf(item("en-1", "Dune: Part Two", "tt15239678", claims = listOf(
                    ProviderLanguageClaim("en", "English", kind = ClaimKind.REPORTED),
                )))
            },
            provider("hindi", priority = 2) {
                calls.incrementAndGet()
                listOf(item("hi-1", "Dune Part Two Hindi Dub", "tt15239678", claims = listOf(
                    ProviderLanguageClaim("hi", "Hindi", kind = ClaimKind.DUBBED_VERSION),
                )))
            },
            provider("bengali-subs", priority = 3) {
                calls.incrementAndGet()
                listOf(item("bn-1", "Dune Part Two", "tt15239678", claims = listOf(
                    ProviderLanguageClaim("bn", "Bengali", kind = ClaimKind.SUBTITLE, evidence = ClaimEvidence.SUBTITLE_API),
                )))
            },
        )

        val result = aggregateSearch(" Dune Part Two ", providers, timeoutMillis = 1_000, concurrency = 3) {
            updates += it
        }

        assertEquals(3, calls.get())
        assertEquals(1, result.results.size)
        val title = result.results.single()
        assertEquals(3, title.sources.size)
        assertEquals("strong", title.matchConfidence)
        assertTrue(title.languageClaims.any { it.languageCode == "en" })
        assertTrue(title.languageClaims.any { it.languageCode == "hi" && it.kind == ClaimKind.DUBBED_VERSION })
        assertTrue(title.languageClaims.any { it.languageCode == "bn" && it.kind == ClaimKind.SUBTITLE })
        assertEquals(3, result.completedProviders)
        assertEquals(3, result.successfulProviders)
        assertEquals("complete", result.phase)
        assertEquals(3, updates.size)
        assertTrue(updates.first().completedProviders == 1)
        assertTrue(updates.first().phase == "partial")
    }

    @Test
    fun oneProviderTimeoutDoesNotDiscardOtherResults() {
        val slowStarted = AtomicBoolean(false)
        val fast = provider("fast") {
            listOf(item("fast-item", "Available Title"))
        }
        val slow = provider("slow") {
            slowStarted.set(true)
            Thread.sleep(250)
            listOf(item("slow-item", "Too Late"))
        }

        val result = aggregateSearch("example", listOf(slow, fast), timeoutMillis = 40, concurrency = 2)

        assertTrue(slowStarted.get())
        assertTrue(result.results.any { it.title == "Available Title" })
        assertFalse(result.results.any { it.title == "Too Late" })
        assertEquals(ProviderSearchStatus.TIMEOUT, result.providerStatuses.single { it.providerId == "slow" }.status)
        assertTrue(result.hasPartialFailure)
        assertFalse(result.allProvidersFailed)
    }

    @Test
    fun disabledUnapprovedAndNonSearchProvidersAreSkipped() {
        val unapprovedCalled = AtomicBoolean(false)
        val result = aggregateSearch(
            "example",
            listOf(
                provider("disabled", enabled = false) { error("must not run") },
                provider("unapproved", eligible = false) { unapprovedCalled.set(true); emptyList() },
                provider("metadata-only", searchCapable = false) { error("must not run") },
                provider("valid") { listOf(item("one", "Kept Result")) },
            ),
            timeoutMillis = 500,
        )

        assertFalse(unapprovedCalled.get())
        assertEquals(1, result.results.size)
        assertEquals(ProviderSearchStatus.SKIPPED, result.providerStatuses.single { it.providerId == "disabled" }.status)
        assertEquals(ProviderSearchStatus.SKIPPED, result.providerStatuses.single { it.providerId == "unapproved" }.status)
        assertEquals(ProviderSearchStatus.SKIPPED, result.providerStatuses.single { it.providerId == "metadata-only" }.status)
        assertEquals(ProviderSearchStatus.SUCCESS, result.providerStatuses.single { it.providerId == "valid" }.status)
    }

    @Test
    fun emptyAndErrorAreDistinctAndErrorsDoNotLeakDetails() {
        val result = aggregateSearch(
            "example",
            listOf(
                provider("empty") { emptyList() },
                provider("broken") { throw IllegalStateException("secret URL and token must not be displayed") },
            ),
            timeoutMillis = 500,
        )

        assertEquals(ProviderSearchStatus.EMPTY, result.providerStatuses.single { it.providerId == "empty" }.status)
        val error = result.providerStatuses.single { it.providerId == "broken" }
        assertEquals(ProviderSearchStatus.ERROR, error.status)
        assertEquals("Provider request failed", error.message)
        assertTrue(result.allProvidersFailed.not())
        assertTrue(result.hasPartialFailure)
    }

    @Test
    fun concurrencyIsBoundedAndDuplicateSourceRowsCollapse() {
        val active = AtomicInteger()
        val peak = AtomicInteger()
        val providers = (0 until 6).map { index ->
            provider("p$index") {
                val count = active.incrementAndGet()
                peak.updateAndGet { old -> maxOf(old, count) }
                try {
                    Thread.sleep(15)
                    listOf(
                        item("same-$index", "Shared $index", year = 2020 + index),
                        item("same-$index", "Shared $index", year = 2020 + index),
                    )
                } finally {
                    active.decrementAndGet()
                }
            }
        }

        val result = aggregateSearch("example", providers, timeoutMillis = 1_000, concurrency = 2)

        assertTrue(peak.get() <= 2)
        assertEquals(6, result.successfulProviders)
        assertEquals(6, result.results.size)
        assertTrue(result.providerStatuses.all { it.resultCount == 1 })
    }

    @Test
    fun validatesQueryConfigurationAndDuplicateIds() {
        assertFailsWith<IllegalArgumentException> { aggregateSearch("  ", emptyList()) }
        assertFailsWith<IllegalArgumentException> { aggregateSearch("x", emptyList(), timeoutMillis = 0) }
        assertFailsWith<IllegalArgumentException> { aggregateSearch("x", emptyList(), concurrency = 0) }
        assertFailsWith<IllegalArgumentException> {
            aggregateSearch("x", listOf(provider("duplicate"), provider("duplicate")))
        }

        val result = aggregateSearch("x", emptyList())
        assertEquals(0, result.totalProviders)
        assertEquals(0, result.completedProviders)
        assertNotNull(result.phase)
        assertTrue(result.queryCompleted)
    }

    @Test
    fun callbackFailureCannotFailProviderSearch() {
        val result = aggregateSearch(
            "example",
            listOf(provider("valid") { listOf(item("one", "Kept Result")) }),
            onUpdate = { throw IllegalStateException("UI callback failure") },
        )
        assertEquals(1, result.results.size)
        assertEquals("Kept Result", result.results.single().title)
    }
}
