package com.sevenxcinema.aggregation

import java.util.concurrent.Callable
import java.util.concurrent.CancellationException
import java.util.concurrent.CompletionService
import java.util.concurrent.ExecutionException
import java.util.concurrent.ExecutorCompletionService
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit

enum class ProviderSearchStatus { SUCCESS, EMPTY, ERROR, TIMEOUT, SKIPPED }

data class SearchProvider(
    val id: String,
    val enabled: Boolean = true,
    val eligible: Boolean = true,
    val searchCapable: Boolean = true,
    val priority: Int = 100,
    val search: ((String) -> List<CatalogueItem>)? = null,
)

data class ProviderStatus(
    val providerId: String,
    val status: ProviderSearchStatus,
    val message: String? = null,
    val latencyMs: Long = 0,
    val resultCount: Int = 0,
)

data class SearchSnapshot(
    val phase: String,
    val queryCompleted: Boolean,
    val completedProviders: Int,
    val totalProviders: Int,
    val successfulProviders: Int,
    val failedProviders: Int,
    val hasPartialFailure: Boolean,
    val allProvidersFailed: Boolean,
    val results: List<LogicalTitle>,
    val providerStatuses: List<ProviderStatus>,
)

private data class ProviderOutcome(
    val providerId: String,
    val records: List<SourceRecord>,
    val status: ProviderStatus,
)

private data class ActiveProviderSearch(
    val provider: SearchProvider,
    val future: Future<ProviderOutcome>,
    val submittedAtNanos: Long,
)

private fun isSearchable(provider: SearchProvider): Boolean =
    provider.id.isNotBlank() &&
        provider.enabled &&
        provider.eligible &&
        provider.searchCapable &&
        provider.search != null

private fun skippedStatus(provider: SearchProvider): ProviderStatus {
    val reason = when {
        !provider.enabled -> "Provider is not enabled"
        !provider.eligible -> "Provider has not passed eligibility review"
        !provider.searchCapable -> "Provider does not declare search support"
        provider.search == null -> "Provider search adapter is invalid"
        else -> "Provider is not enabled"
    }
    return ProviderStatus(
        providerId = provider.id.trim().ifEmpty { "unknown" },
        status = ProviderSearchStatus.SKIPPED,
        message = reason,
    )
}

private fun makeSnapshot(
    records: List<SourceRecord>,
    statuses: Collection<ProviderStatus>,
    completedProviders: Int,
    totalProviders: Int,
): SearchSnapshot {
    val orderedStatuses = statuses.sortedBy { it.providerId }
    val successful = orderedStatuses.count {
        it.status == ProviderSearchStatus.SUCCESS || it.status == ProviderSearchStatus.EMPTY
    }
    val failed = orderedStatuses.count {
        it.status == ProviderSearchStatus.ERROR || it.status == ProviderSearchStatus.TIMEOUT
    }
    return SearchSnapshot(
        phase = if (completedProviders >= totalProviders) "complete" else "partial",
        queryCompleted = completedProviders >= totalProviders,
        completedProviders = completedProviders,
        totalProviders = totalProviders,
        successfulProviders = successful,
        failedProviders = failed,
        hasPartialFailure = failed > 0,
        allProvidersFailed = totalProviders > 0 && failed == totalProviders,
        results = groupCatalogueRecords(records),
        providerStatuses = orderedStatuses,
    )
}

/**
 * Fan out one query across enabled, eligibility-approved and search-capable adapters.
 * Active calls are bounded, each active call gets its own timeout, and each completion
 * emits a safe snapshot. Adapter code should honour thread interruption in its own
 * network client so cancellation can release the worker promptly.
 */
fun aggregateSearch(
    query: String,
    providers: List<SearchProvider>,
    timeoutMillis: Long = 5_000,
    concurrency: Int = 4,
    onUpdate: ((SearchSnapshot) -> Unit)? = null,
): SearchSnapshot {
    require(query.isNotBlank()) { "Search query must not be blank" }
    require(timeoutMillis > 0) { "timeoutMillis must be positive" }
    require(concurrency > 0) { "concurrency must be positive" }

    val knownIds = providers.mapNotNull { it.id.trim().takeIf(String::isNotEmpty) }
    require(knownIds.size == knownIds.distinct().size) {
        "Provider IDs must be unique within one search"
    }

    val skipped = providers.filterNot(::isSearchable).map(::skippedStatus)
    val eligible = providers.filter(::isSearchable)
    val statuses = linkedMapOf<String, ProviderStatus>()
    skipped.forEach { statuses[it.providerId] = it }
    val completedRecords = mutableListOf<SourceRecord>()
    var completedProviders = 0
    val normalizedQuery = query.trim()

    fun snapshot(): SearchSnapshot = makeSnapshot(
        records = completedRecords,
        statuses = statuses.values,
        completedProviders = completedProviders,
        totalProviders = eligible.size,
    )

    fun emitUpdate() {
        try {
            onUpdate?.invoke(snapshot())
        } catch (_: Exception) {
            // A rendering callback must not make a provider request fail.
        }
    }

    if (eligible.isEmpty()) return snapshot()

    val executor = Executors.newFixedThreadPool(minOf(concurrency, eligible.size))
    val completion: CompletionService<ProviderOutcome> = ExecutorCompletionService(executor)
    val active = linkedMapOf<Future<ProviderOutcome>, ActiveProviderSearch>()
    var nextProviderIndex = 0

    fun submitAvailable() {
        while (active.size < concurrency && nextProviderIndex < eligible.size) {
            val provider = eligible[nextProviderIndex++]
            val adapter = provider.search!!
            val submittedAt = System.nanoTime()
            val future = completion.submit(Callable {
                val startedAt = System.nanoTime()
                try {
                    val items = adapter(normalizedQuery)
                    val records = dedupeProviderRecords(items.map {
                        normaliseProviderItem(provider.id, provider.priority, it)
                    })
                    ProviderOutcome(
                        providerId = provider.id,
                        records = records,
                        status = ProviderStatus(
                            providerId = provider.id,
                            status = if (records.isEmpty()) ProviderSearchStatus.EMPTY else ProviderSearchStatus.SUCCESS,
                            latencyMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt),
                            resultCount = records.size,
                        ),
                    )
                } catch (interrupted: InterruptedException) {
                    Thread.currentThread().interrupt()
                    ProviderOutcome(
                        providerId = provider.id,
                        records = emptyList(),
                        status = ProviderStatus(
                            providerId = provider.id,
                            status = ProviderSearchStatus.ERROR,
                            message = "Provider request failed",
                            latencyMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt),
                        ),
                    )
                } catch (_: Exception) {
                    ProviderOutcome(
                        providerId = provider.id,
                        records = emptyList(),
                        status = ProviderStatus(
                            providerId = provider.id,
                            status = ProviderSearchStatus.ERROR,
                            message = "Provider request failed",
                            latencyMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt),
                        ),
                    )
                }
            })
            active[future] = ActiveProviderSearch(provider, future, submittedAt)
        }
    }

    try {
        submitAvailable()
        val timeoutNanos = TimeUnit.MILLISECONDS.toNanos(timeoutMillis)

        while (completedProviders < eligible.size) {
            val finished = completion.poll(20, TimeUnit.MILLISECONDS)
            if (finished != null) {
                val activeSearch = active.remove(finished)
                if (activeSearch != null) {
                    val outcome = try {
                        finished.get()
                    } catch (_: CancellationException) {
                        null
                    } catch (_: ExecutionException) {
                        ProviderOutcome(
                            providerId = activeSearch.provider.id,
                            records = emptyList(),
                            status = ProviderStatus(
                                providerId = activeSearch.provider.id,
                                status = ProviderSearchStatus.ERROR,
                                message = "Provider request failed",
                            ),
                        )
                    }
                    if (outcome != null) {
                        completedRecords.addAll(outcome.records)
                        statuses[outcome.providerId] = outcome.status
                        completedProviders += 1
                        emitUpdate()
                        submitAvailable()
                    }
                }
            }

            val now = System.nanoTime()
            val expired = active.values.filter { now - it.submittedAtNanos >= timeoutNanos }
            for (task in expired) {
                if (active.remove(task.future) != null) {
                    task.future.cancel(true)
                    statuses[task.provider.id] = ProviderStatus(
                        providerId = task.provider.id,
                        status = ProviderSearchStatus.TIMEOUT,
                        message = "Provider request timed out",
                        latencyMs = timeoutMillis,
                    )
                    completedProviders += 1
                    emitUpdate()
                }
            }
            submitAvailable()
        }
    } finally {
        executor.shutdownNow()
    }

    return snapshot()
}
