package com.ironlogic.ui.screen

import android.os.SystemClock
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.weight
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ironlogic.domain.SessionPhase
import com.ironlogic.ui.intent.SessionIntent
import com.ironlogic.ui.viewmodel.SessionViewModel
import kotlinx.coroutines.delay

@Composable
fun IronLogicGlassCockpit(viewModel: SessionViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxSize()) {

        if (state.phase == SessionPhase.RESTING && state.restEndsAtElapsedMs != null) {
            RestTimerHeaderBar(targetEpochMs = state.restEndsAtElapsedMs!!)
        }

        AnatomicalHeatmap(loadMap = state.normalizedMuscleLoad)

        ExerciseList(
            advisoryGhost = state.advisoryGhostWeight,
            onLogSet = { w, r -> viewModel.processIntent(SessionIntent.LogSet(w, r)) },
        )

        Spacer(modifier = Modifier.weight(1f))

        if (state.phase == SessionPhase.FINISHING && state.finishRequestedAtElapsedMs != null) {
            FinishUndoBanner(
                requestedAtElapsedMs = state.finishRequestedAtElapsedMs!!,
                onUndo = { viewModel.processIntent(SessionIntent.CancelFinish) },
            )
        }

        if (state.phase != SessionPhase.COMPLETE) {
            SlideToFinishButton(
                enabled = state.phase == SessionPhase.ACTIVE || state.phase == SessionPhase.RESTING,
                onSwipeComplete = { viewModel.processIntent(SessionIntent.RequestFinishSession) },
            )
        }
    }
}

/**
 * Renders a progress bar that advances toward [targetEpochMs].
 * Samples monotonic time at ~60 fps for animation only — owns no business logic.
 */
@Composable
fun RestTimerHeaderBar(targetEpochMs: Long) {
    var currentElapsed by remember { mutableStateOf(SystemClock.elapsedRealtime()) }

    LaunchedEffect(targetEpochMs) {
        while (currentElapsed < targetEpochMs) {
            delay(16L)
            currentElapsed = SystemClock.elapsedRealtime()
        }
        currentElapsed = targetEpochMs  // clamp on completion
    }

    val remainingMs = maxOf(0L, targetEpochMs - currentElapsed)
    // TODO: render progress bar driven by remainingMs
}

// ---------------------------------------------------------------------------
// Stub composables — implementations wired up in subsequent PRs
// ---------------------------------------------------------------------------

@Composable
fun AnatomicalHeatmap(loadMap: Map<String, Float>) { /* TODO */ }

@Composable
fun ExerciseList(advisoryGhost: Float?, onLogSet: (Float, Int) -> Unit) { /* TODO */ }

@Composable
fun SlideToFinishButton(enabled: Boolean, onSwipeComplete: () -> Unit) { /* TODO */ }

@Composable
fun FinishUndoBanner(requestedAtElapsedMs: Long, onUndo: () -> Unit) { /* TODO */ }
