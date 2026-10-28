package com.sevenxcinema.android

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.sevenxcinema.aggregation.CatalogueItem
import com.sevenxcinema.aggregation.ClaimEvidence
import com.sevenxcinema.aggregation.ClaimKind
import com.sevenxcinema.aggregation.LogicalTitle
import com.sevenxcinema.aggregation.PlayerTrack
import com.sevenxcinema.aggregation.PlayerTrackType
import com.sevenxcinema.aggregation.ProviderLanguageClaim
import com.sevenxcinema.aggregation.ProviderSearchStatus
import com.sevenxcinema.aggregation.SearchProvider
import com.sevenxcinema.aggregation.SearchSnapshot
import com.sevenxcinema.aggregation.SourceRecord
import com.sevenxcinema.aggregation.addVerifiedPlayerTracks
import com.sevenxcinema.aggregation.aggregateSearch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Locale

private val CinemaBackground = Color(0xFF0B0D12)
private val CinemaSurface = Color(0xFF171B24)
private val CinemaAccent = Color(0xFF70E0C0)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = CinemaAccent,
                    onPrimary = Color(0xFF071711),
                    background = CinemaBackground,
                    surface = CinemaSurface,
                    onSurface = Color(0xFFF4F6FA),
                ),
            ) {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    SevenXCinemaApp()
                }
            }
        }
    }
}

@Composable
private fun SevenXCinemaApp() {
    val context = LocalContext.current
    val activity = context as? ComponentActivity
    val scope = rememberCoroutineScope()
    var query by remember { mutableStateOf("Dune Part Two") }
    var snapshot by remember { mutableStateOf<SearchSnapshot?>(null) }
    var titles by remember { mutableStateOf<List<LogicalTitle>>(emptyList()) }
    var searching by remember { mutableStateOf(false) }
    var selectedSource by remember { mutableStateOf<SourceRecord?>(null) }

    if (selectedSource != null) {
        PlaybackProbeScreen(
            title = selectedSource!!.title,
            provider = selectedSource!!.providerId,
            onBack = { selectedSource = null },
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CinemaBackground)
            .padding(horizontal = 18.dp, vertical = 20.dp),
    ) {
        Text(
            text = "7xCINEMA",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Black,
            color = CinemaAccent,
        )
        Text(
            text = "One search. Multiple sources. One result list.",
            style = MaterialTheme.typography.bodyMedium,
            color = Color(0xFFB3BBC9),
            modifier = Modifier.padding(top = 4.dp, bottom = 18.dp),
        )

        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.weight(1f),
                singleLine = true,
                label = { Text("Movie or series") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
            )
            Button(
                enabled = query.isNotBlank() && !searching,
                onClick = {
                    searching = true
                    scope.launch {
                        val next = withContext(Dispatchers.IO) {
                            aggregateSearch(
                                query = query,
                                providers = demoProviders(),
                                timeoutMillis = 2_000,
                                concurrency = 3,
                                onUpdate = { partial ->
                                    activity?.runOnUiThread {
                                        snapshot = partial
                                        titles = partial.results
                                    }
                                },
                            )
                        }
                        snapshot = next
                        titles = next.results
                        searching = false
                    }
                },
            ) {
                Text(if (searching) "Searching…" else "Search")
            }
        }

        Text(
            text = "DEMO DATA ONLY · No third-party providers are connected",
            style = MaterialTheme.typography.labelSmall,
            color = Color(0xFF9CA7B8),
            modifier = Modifier.padding(top = 10.dp, bottom = 8.dp),
        )
        snapshot?.let { state ->
            Text(
                text = when {
                    state.totalProviders == 0 -> "No eligible providers configured"
                    state.allProvidersFailed -> "All demo adapters failed"
                    state.hasPartialFailure -> "${state.successfulProviders}/${state.totalProviders} adapters returned; partial results kept"
                    state.queryCompleted -> "${state.successfulProviders}/${state.totalProviders} adapters completed"
                    else -> "${state.completedProviders}/${state.totalProviders} adapters completed · updating"
                },
                style = MaterialTheme.typography.bodySmall,
                color = if (state.hasPartialFailure) Color(0xFFFFC27A) else CinemaAccent,
                modifier = Modifier.padding(bottom = 10.dp),
            )
        }

        if (titles.isEmpty() && snapshot != null && !searching) {
            Text("No demo matches for this query.", color = Color(0xFFB3BBC9))
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.weight(1f),
            ) {
                items(titles, key = { it.canonicalId }) { title ->
                    LogicalTitleCard(title = title, onSelectSource = { selectedSource = it })
                }
            }
        }
        if (snapshot == null) {
            Spacer(Modifier.height(6.dp))
            OutlinedButton(
                onClick = {
                    searching = true
                    scope.launch {
                        val next = withContext(Dispatchers.IO) {
                            aggregateSearch("Dune Part Two", demoProviders(), timeoutMillis = 2_000, concurrency = 3) { partial ->
                                activity?.runOnUiThread {
                                    snapshot = partial
                                    titles = partial.results
                                }
                            }
                        }
                        snapshot = next
                        titles = next.results
                        searching = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Run demo search")
            }
        }
    }
}

@Composable
private fun LogicalTitleCard(title: LogicalTitle, onSelectSource: (SourceRecord) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = CinemaSurface),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(title.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(
                        text = listOfNotNull(title.year?.toString(), title.mediaType.name.lowercase(Locale.ROOT).replaceFirstChar { it.titlecase() })
                            .joinToString(" · "),
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFFB3BBC9),
                    )
                }
                Text(
                    text = when (title.matchConfidence) {
                        "strong" -> "ID MATCH"
                        "fallback-title-year" -> "TITLE/YEAR"
                        else -> "SINGLE"
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = CinemaAccent,
                )
            }
            if (title.alternateTitles.isNotEmpty()) {
                Text(
                    text = "Also listed as: " + title.alternateTitles.joinToString(" · "),
                    color = Color(0xFFB3BBC9),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            val languages = title.languageClaims
                .groupBy { it.language }
                .map { (language, claims) ->
                    val kinds = claims.map { claim ->
                        when (claim.kind) {
                            ClaimKind.EMBEDDED_AUDIO -> "player audio"
                            ClaimKind.DUBBED_VERSION -> "dubbed version"
                            ClaimKind.SUBTITLE -> "subtitle"
                            ClaimKind.REPORTED -> "reported"
                        }
                    }.distinct().joinToString("/")
                    "$language · $kinds"
                }
            if (languages.isNotEmpty()) {
                Text(
                    text = languages.joinToString("  |  "),
                    color = Color(0xFFCFD7E3),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Divider(color = Color(0xFF303847))
            title.sources.forEach { source ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(source.providerId, fontWeight = FontWeight.SemiBold)
                        Text(
                            text = source.title,
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFB3BBC9),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    OutlinedButton(onClick = { onSelectSource(source) }) {
                        Text("Open player")
                    }
                }
            }
        }
    }
}

private fun demoProviders(): List<SearchProvider> = listOf(
    SearchProvider(
        id = "demo-english",
        enabled = true,
        eligible = true,
        searchCapable = true,
        priority = 1,
        search = {
            listOf(
                CatalogueItem(
                    providerItemId = "dune-en",
                    title = "Dune: Part Two",
                    mediaType = "movie",
                    year = 2024,
                    externalIds = mapOf("imdb" to "tt15239678", "tmdb" to "693134"),
                    languageClaims = listOf(
                        ProviderLanguageClaim("en", "English", kind = ClaimKind.REPORTED, evidence = ClaimEvidence.PROVIDER_METADATA),
                    ),
                ),
            )
        },
    ),
    SearchProvider(
        id = "demo-hindi-version",
        enabled = true,
        eligible = true,
        searchCapable = true,
        priority = 2,
        search = {
            Thread.sleep(140)
            listOf(
                CatalogueItem(
                    providerItemId = "dune-hi",
                    title = "Dune Part Two (Hindi Dub)",
                    mediaType = "movie",
                    year = 2024,
                    externalIds = mapOf("imdb" to "tt15239678"),
                    languageClaims = listOf(
                        ProviderLanguageClaim("hi", "Hindi", kind = ClaimKind.DUBBED_VERSION, evidence = ClaimEvidence.PROVIDER_METADATA),
                    ),
                ),
            )
        },
    ),
    SearchProvider(
        id = "demo-bengali-subtitles",
        enabled = true,
        eligible = true,
        searchCapable = true,
        priority = 3,
        search = {
            Thread.sleep(280)
            listOf(
                CatalogueItem(
                    providerItemId = "dune-bn-subs",
                    title = "Dune Part Two",
                    mediaType = "movie",
                    year = 2024,
                    externalIds = mapOf("tmdb" to "693134"),
                    languageClaims = listOf(
                        ProviderLanguageClaim("bn", "Bengali", kind = ClaimKind.SUBTITLE, evidence = ClaimEvidence.SUBTITLE_API),
                    ),
                ),
            )
        },
    ),
)

private data class TrackRow(
    val groupIndex: Int,
    val trackIndex: Int,
    val type: Int,
    val label: String,
    val supported: Boolean,
)

@Composable
private fun PlaybackProbeScreen(title: String, provider: String, onBack: () -> Unit) {
    val context = LocalContext.current
    val player = remember(context) { ExoPlayer.Builder(context).build() }
    var mediaUrl by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("Paste a permitted media URL to test the player.") }
    var tracks by remember { mutableStateOf<List<TrackRow>>(emptyList()) }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                status = when (playbackState) {
                    Player.STATE_BUFFERING -> "Buffering…"
                    Player.STATE_READY -> "Player ready"
                    Player.STATE_ENDED -> "Playback ended"
                    Player.STATE_IDLE -> if (status.startsWith("Loading")) "Idle" else status
                    else -> status
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                status = "Playback failed: " + (error.errorCodeName ?: "unknown player error")
            }

            override fun onTracksChanged(currentTracks: Tracks) {
                tracks = currentTracks.groups.flatMapIndexed { groupIndex, group ->
                    if (group.type != C.TRACK_TYPE_AUDIO && group.type != C.TRACK_TYPE_TEXT) {
                        emptyList()
                    } else {
                        (0 until group.length).map { trackIndex ->
                            val format = group.getTrackFormat(trackIndex)
                            val language = format.language?.takeUnless { it == "und" } ?: format.label ?: "Unknown language"
                            TrackRow(
                                groupIndex = groupIndex,
                                trackIndex = trackIndex,
                                type = group.type,
                                label = (if (group.type == C.TRACK_TYPE_AUDIO) "Audio" else "Subtitle") + " · " + language,
                                supported = group.isTrackSupported(trackIndex),
                            )
                        }
                    }
                }
            }
        }
        player.addListener(listener)
        onDispose {
            player.removeListener(listener)
            player.release()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CinemaBackground)
            .verticalScroll(rememberScrollState())
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        OutlinedButton(onClick = onBack) { Text("← Back to results") }
        Text("Playback test", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("$title · $provider", color = Color(0xFFB3BBC9), style = MaterialTheme.typography.bodySmall)
        Card(
            colors = CardDefaults.cardColors(containerColor = CinemaSurface),
            shape = RoundedCornerShape(14.dp),
        ) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Prototype boundary", fontWeight = FontWeight.Bold, color = CinemaAccent)
                Text(
                    "The selected source comes from synthetic catalogue data; automatic source resolution is not connected yet. Paste a URL for media you are authorised to play. The player will report the tracks it actually detects.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFFCFD7E3),
                )
            }
        }
        AndroidView(
            factory = { viewContext ->
                PlayerView(viewContext).apply {
                    this.player = player
                    useController = true
                    setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING)
                }
            },
            update = { it.player = player },
            modifier = Modifier
                .fillMaxWidth()
                .height(220.dp)
                .background(Color.Black, RoundedCornerShape(12.dp)),
        )
        OutlinedTextField(
            value = mediaUrl,
            onValueChange = { mediaUrl = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Authorised HTTP(S) media URL") },
            placeholder = { Text("https://…") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            singleLine = true,
        )
        Button(
            modifier = Modifier.fillMaxWidth(),
            enabled = mediaUrl.trim().isNotEmpty(),
            onClick = {
                val uri = runCatching { Uri.parse(mediaUrl.trim()) }.getOrNull()
                if (uri == null || uri.scheme !in setOf("http", "https") || uri.host.isNullOrBlank()) {
                    status = "Enter a valid HTTP(S) media URL."
                } else {
                    tracks = emptyList()
                    status = "Loading media in ExoPlayer…"
                    player.setMediaItem(MediaItem.fromUri(uri))
                    player.prepare()
                    player.playWhenReady = true
                }
            },
        ) {
            Text("Load and play")
        }
        Text(status, color = if (status.startsWith("Playback failed")) Color(0xFFFF9A9A) else CinemaAccent)
        Text("Detected audio/subtitle tracks", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        if (tracks.isEmpty()) {
            Text("No tracks reported yet. Start playback to inspect the prepared media.", color = Color(0xFFB3BBC9))
        } else {
            tracks.forEach { track ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(track.label, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                    OutlinedButton(
                        enabled = track.supported,
                        onClick = {
                            val group = player.currentTracks.groups.getOrNull(track.groupIndex)
                            if (group == null) {
                                status = "Track list changed; reload the media and try again."
                            } else {
                                val builder = player.trackSelectionParameters.buildUpon()
                                    .clearOverridesOfType(track.type)
                                    .addOverride(TrackSelectionOverride(group.mediaTrackGroup, listOf(track.trackIndex)))
                                    .setTrackTypeDisabled(track.type, false)
                                player.trackSelectionParameters = builder.build()
                                status = "Selected ${track.label}"
                            }
                        },
                    ) {
                        Text("Select")
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
    }
}
