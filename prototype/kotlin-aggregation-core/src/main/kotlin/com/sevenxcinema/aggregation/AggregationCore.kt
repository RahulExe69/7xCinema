package com.sevenxcinema.aggregation

import java.net.URLEncoder
import java.nio.charset.StandardCharsets.UTF_8
import java.text.Normalizer
import java.util.Locale

enum class MediaType { MOVIE, SERIES, EPISODE }
enum class ClaimKind { EMBEDDED_AUDIO, DUBBED_VERSION, SUBTITLE, REPORTED }
enum class ClaimEvidence { PROVIDER_METADATA, FILENAME, SUBTITLE_API, UNKNOWN, PLAYER_PROBE }
enum class PlayerTrackType { AUDIO, SUBTITLE }

data class ProviderLanguageClaim(
    val languageCode: String? = null,
    val language: String? = null,
    val label: String? = null,
    val kind: ClaimKind = ClaimKind.REPORTED,
    val evidence: ClaimEvidence = ClaimEvidence.PROVIDER_METADATA,
    val releaseName: String? = null,
)

data class CatalogueItem(
    val providerItemId: String,
    val title: String,
    val mediaType: String,
    val year: Int? = null,
    val externalIds: Map<String, String> = emptyMap(),
    val seasonNumber: Int? = null,
    val episodeNumber: Int? = null,
    val languageClaims: List<ProviderLanguageClaim> = emptyList(),
    val posterUrl: String? = null,
    val description: String? = null,
)

data class LanguageClaim(
    val languageCode: String?,
    val language: String,
    val kind: ClaimKind,
    val evidence: ClaimEvidence,
    val sourceId: String,
    val selectable: Boolean = false,
    val reportedKind: ClaimKind? = null,
    val releaseName: String? = null,
)

data class SourceRecord(
    val sourceId: String,
    val providerId: String,
    val providerItemId: String,
    val providerPriority: Int,
    val title: String,
    val alternateTitles: List<String> = emptyList(),
    val identityConflict: Boolean = false,
    val normalisedTitle: String,
    val mediaType: MediaType,
    val year: Int?,
    val externalIds: Map<String, String>,
    val seasonNumber: Int?,
    val episodeNumber: Int?,
    val languageClaims: List<LanguageClaim>,
    val posterUrl: String? = null,
    val description: String? = null,
)

data class LogicalTitle(
    val canonicalId: String,
    val mediaType: MediaType,
    val title: String,
    val alternateTitles: List<String>,
    val year: Int?,
    val yearConflict: Boolean,
    val externalIds: Map<String, String>,
    val matchMethods: List<String>,
    val matchConfidence: String,
    val sources: List<SourceRecord>,
    val languageClaims: List<LanguageClaim>,
)

data class PlayerTrack(
    val type: PlayerTrackType,
    val languageCode: String? = null,
    val language: String? = null,
    val label: String? = null,
)

fun normaliseTitle(title: String): String {
    val decomposed = Normalizer.normalize(title.trim(), Normalizer.Form.NFKD)
    return decomposed
        .replace("\\p{M}+".toRegex(), "")
        .lowercase(Locale.ROOT)
        .replace("[’']".toRegex(), "")
        .replace("[^\\p{L}\\p{N}]+".toRegex(), " ")
        .trim()
        .replace("\\s+".toRegex(), " ")
}

private fun clean(value: String?): String? = value?.trim()?.takeIf { it.isNotEmpty() }

private fun normaliseIdentifier(value: String?): String? =
    clean(value)?.lowercase(Locale.ROOT)

private fun encoded(value: String): String =
    URLEncoder.encode(value, UTF_8).replace("+", "%20").replace("%7E", "~")

private fun sourceIdFor(providerId: String, providerItemId: String): String =
    "${encoded(providerId)}::${encoded(providerItemId)}"

private fun normaliseExternalIds(input: Map<String, String>): Map<String, String> =
    input.entries.mapNotNull { (rawNamespace, rawId) ->
        val namespace = normaliseIdentifier(rawNamespace)
        val id = normaliseIdentifier(rawId)
        if (namespace != null && id != null && namespace.matches(Regex("[a-z0-9_-]{1,32}"))) {
            namespace to id
        } else {
            null
        }
    }.toMap()

fun normaliseProviderItem(providerId: String, priority: Int = 100, item: CatalogueItem): SourceRecord {
    val cleanProviderId = clean(providerId) ?: throw IllegalArgumentException("Provider ID must not be blank")
    val providerItemId = clean(item.providerItemId)
        ?: throw IllegalArgumentException("Provider item ID must not be blank")
    val title = clean(item.title) ?: throw IllegalArgumentException("Title must not be blank")
    val mediaType = runCatching { MediaType.valueOf(item.mediaType.trim().uppercase(Locale.ROOT)) }
        .getOrElse { throw IllegalArgumentException("Unsupported media type") }
    val year = item.year?.takeIf { it in 1800..2200 }
    val sourceId = sourceIdFor(cleanProviderId, providerItemId)

    val claims = item.languageClaims.mapNotNull { claim ->
        val code = normaliseIdentifier(claim.languageCode)
        val language = clean(claim.language) ?: clean(claim.label) ?: code
        if (language == null && code == null) return@mapNotNull null
        val kind = if (claim.kind == ClaimKind.EMBEDDED_AUDIO) ClaimKind.REPORTED else claim.kind
        LanguageClaim(
            languageCode = code,
            language = language ?: code!!,
            kind = kind,
            evidence = claim.evidence,
            sourceId = sourceId,
            selectable = false,
            reportedKind = if (claim.kind == ClaimKind.EMBEDDED_AUDIO) ClaimKind.EMBEDDED_AUDIO else null,
            releaseName = clean(claim.releaseName),
        )
    }

    return SourceRecord(
        sourceId = sourceId,
        providerId = cleanProviderId,
        providerItemId = providerItemId,
        providerPriority = priority,
        title = title,
        normalisedTitle = normaliseTitle(title),
        mediaType = mediaType,
        year = year,
        externalIds = normaliseExternalIds(item.externalIds),
        seasonNumber = item.seasonNumber?.takeIf { it >= 0 },
        episodeNumber = item.episodeNumber?.takeIf { it >= 0 },
        languageClaims = dedupeClaims(claims),
        posterUrl = clean(item.posterUrl),
        description = clean(item.description),
    )
}

private fun dedupeClaims(claims: List<LanguageClaim>): List<LanguageClaim> =
    claims.distinct().sortedWith(
        compareBy<LanguageClaim> { it.languageCode ?: it.language }
            .thenBy { it.kind.name }
            .thenBy { it.sourceId },
    )

internal fun dedupeProviderRecords(records: List<SourceRecord>): List<SourceRecord> {
    val bySourceId = linkedMapOf<String, SourceRecord>()
    for (record in records) {
        val existing = bySourceId[record.sourceId]
        if (existing == null) {
            bySourceId[record.sourceId] = record
            continue
        }

        val yearConflict = existing.year != null && record.year != null && existing.year != record.year
        val episodeConflict = existing.mediaType == MediaType.EPISODE && record.mediaType == MediaType.EPISODE &&
            (existing.seasonNumber != record.seasonNumber || existing.episodeNumber != record.episodeNumber)
        var idConflict = false
        val ids = existing.externalIds.toMutableMap()
        for ((namespace, value) in record.externalIds) {
            val oldValue = ids[namespace]
            if (oldValue != null && oldValue != value) {
                idConflict = true
            } else if (oldValue == null) {
                ids[namespace] = value
            }
        }

        val hasNewConflict = existing.mediaType != record.mediaType || yearConflict || episodeConflict || idConflict
        val identityConflict = existing.identityConflict || hasNewConflict
        val year = when {
            hasNewConflict -> null
            existing.identityConflict -> null
            existing.year == null -> record.year
            else -> existing.year
        }
        val aliases = (existing.alternateTitles + record.title + record.alternateTitles)
            .filter { it != existing.title }
            .distinct()
            .sorted()

        bySourceId[record.sourceId] = existing.copy(
            alternateTitles = aliases,
            identityConflict = identityConflict,
            year = year,
            externalIds = ids,
            languageClaims = dedupeClaims(existing.languageClaims + record.languageClaims),
            posterUrl = existing.posterUrl ?: record.posterUrl,
            description = existing.description ?: record.description,
        )
    }
    return bySourceId.values.toList()
}

private fun episodeCoordinatesValid(source: SourceRecord): Boolean =
    source.mediaType != MediaType.EPISODE ||
        (source.seasonNumber != null && source.seasonNumber >= 0 &&
            source.episodeNumber != null && source.episodeNumber >= 0)

private fun matchingReason(left: SourceRecord, right: SourceRecord): String? {
    if (left.identityConflict || right.identityConflict) return null
    if (left.mediaType != right.mediaType) return null
    if (left.mediaType == MediaType.EPISODE) {
        if (!episodeCoordinatesValid(left) || !episodeCoordinatesValid(right)) return null
        if (left.seasonNumber != right.seasonNumber || left.episodeNumber != right.episodeNumber) return null
    }

    val namespaces = left.externalIds.keys + right.externalIds.keys
    var sharedIdentifier = false
    for (namespace in namespaces) {
        val a = left.externalIds[namespace]
        val b = right.externalIds[namespace]
        if (a != null && b != null && a != b) return null
        if (a != null && a == b) sharedIdentifier = true
    }
    if (sharedIdentifier) return "shared-external-id"

    // Title/year fallback is deliberately restricted to records with no external IDs.
    if (left.externalIds.isEmpty() && right.externalIds.isEmpty() &&
        left.normalisedTitle.isNotEmpty() && left.normalisedTitle == right.normalisedTitle &&
        left.year != null && left.year == right.year
    ) {
        return "title-year"
    }
    return null
}

private fun compareSources(left: SourceRecord, right: SourceRecord): Int =
    compareValuesBy(left, right, SourceRecord::providerPriority, SourceRecord::providerId, SourceRecord::providerItemId)

private data class Group(val sources: List<SourceRecord>, val reasons: List<String>)

private fun buildGroups(records: List<SourceRecord>): List<Group> {
    val parent = records.indices.toMutableList()
    val rank = MutableList(records.size) { 0 }
    val edgeReasons = mutableListOf<Triple<Int, Int, String>>()

    fun find(index: Int): Int {
        var current = index
        while (parent[current] != current) {
            parent[current] = parent[parent[current]]
            current = parent[current]
        }
        return current
    }

    fun union(a: Int, b: Int) {
        var rootA = find(a)
        var rootB = find(b)
        if (rootA == rootB) return
        if (rank[rootA] < rank[rootB]) {
            val temp = rootA
            rootA = rootB
            rootB = temp
        }
        parent[rootB] = rootA
        if (rank[rootA] == rank[rootB]) rank[rootA] += 1
    }

    for (left in records.indices) {
        for (right in left + 1 until records.size) {
            val reason = matchingReason(records[left], records[right]) ?: continue
            union(left, right)
            edgeReasons += Triple(left, right, reason)
        }
    }

    val grouped = linkedMapOf<Int, MutableList<SourceRecord>>()
    records.forEachIndexed { index, source ->
        grouped.getOrPut(find(index)) { mutableListOf() }.add(source)
    }
    val reasonsByRoot = mutableMapOf<Int, MutableSet<String>>()
    for ((left, _, reason) in edgeReasons) {
        reasonsByRoot.getOrPut(find(left)) { linkedSetOf() }.add(reason)
    }

    return grouped.map { (root, sources) ->
        Group(sources, reasonsByRoot[root].orEmpty().toList().sorted())
    }
}

private fun canonicalId(sources: List<SourceRecord>): String {
    for (namespace in listOf("imdb", "tmdb")) {
        val values = sources.mapNotNull { it.externalIds[namespace] }.distinct().sorted()
        if (values.size == 1) return "$namespace:${values.single()}"
    }
    val sample = sources.minWithOrNull(::compareSources)!!
    return if (sample.mediaType == MediaType.EPISODE) {
        "episode:${sample.normalisedTitle}:${sample.year ?: "unknown"}:s${sample.seasonNumber}e${sample.episodeNumber}"
    } else {
        "title:${sample.mediaType.name.lowercase(Locale.ROOT)}:${sample.normalisedTitle}:${sample.year ?: "unknown"}"
    }
}

private fun makeLogicalTitle(group: Group): LogicalTitle {
    val sources = group.sources.sortedWith(::compareSources)
    val first = sources.first()
    val titles = (sources.flatMap { listOf(it.title) + it.alternateTitles }).distinct()
    val years = sources.mapNotNull { it.year }.distinct()
    val allNamespaces = sources.flatMap { it.externalIds.keys }.distinct()
    val ids = allNamespaces.mapNotNull { namespace ->
        val values = sources.mapNotNull { it.externalIds[namespace] }.distinct()
        if (values.size == 1) namespace to values.single() else null
    }.toMap()

    return LogicalTitle(
        canonicalId = canonicalId(sources),
        mediaType = first.mediaType,
        title = first.title,
        alternateTitles = titles.filter { it != first.title }.sorted(),
        year = years.singleOrNull(),
        yearConflict = years.size > 1,
        externalIds = ids,
        matchMethods = group.reasons,
        matchConfidence = when {
            "shared-external-id" in group.reasons -> "strong"
            "title-year" in group.reasons -> "fallback-title-year"
            else -> "single-source"
        },
        sources = sources,
        languageClaims = dedupeClaims(sources.flatMap { it.languageClaims }),
    )
}

fun groupCatalogueRecords(records: List<SourceRecord>): List<LogicalTitle> =
    buildGroups(dedupeProviderRecords(records))
        .map(::makeLogicalTitle)
        .sortedWith(compareBy<LogicalTitle> { it.title }.thenBy { it.year ?: 0 }.thenBy { it.canonicalId })

/** Only this API can create selectable embedded-audio claims, using prepared-player observations. */
fun addVerifiedPlayerTracks(title: LogicalTitle, sourceId: String, tracks: List<PlayerTrack>): LogicalTitle {
    require(title.sources.any { it.sourceId == sourceId }) {
        "The track source does not belong to this logical title"
    }
    val claims = tracks.map { track ->
        val code = normaliseIdentifier(track.languageCode)
        val language = clean(track.language) ?: clean(track.label) ?: code
            ?: throw IllegalArgumentException("A player track needs a language")
        LanguageClaim(
            languageCode = code,
            language = language,
            kind = if (track.type == PlayerTrackType.AUDIO) ClaimKind.EMBEDDED_AUDIO else ClaimKind.SUBTITLE,
            evidence = ClaimEvidence.PLAYER_PROBE,
            sourceId = sourceId,
            selectable = true,
        )
    }
    return title.copy(languageClaims = dedupeClaims(title.languageClaims + claims))
}
