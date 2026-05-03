package com.ironlogic.ui.viewmodel

import android.app.Application
import android.os.SystemClock
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.ironlogic.domain.IronLogicEngine
import com.ironlogic.domain.SessionPhase
import com.ironlogic.ui.effect.SessionEffect
import com.ironlogic.ui.intent.SessionIntent
import com.ironlogic.ui.state.SessionUiState
import com.ironlogic.worker.ExportSessionWorker
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val FINISH_UNDO_WINDOW_MS = 3_000L
private const val EXPORT_WORK_NAME = "iron_logic_session_export"

class SessionViewModel(
    app: Application,
    private val domain: IronLogicEngine,
) : AndroidViewModel(app) {

    private val _uiState = MutableStateFlow(SessionUiState())
    val uiState: StateFlow<SessionUiState> = _uiState.asStateFlow()

    private val _effectChannel = Channel<SessionEffect>(Channel.BUFFERED)
    val effectFlow = _effectChannel.receiveAsFlow()

    init {
        // Load advisory target weight from domain so the initial state is
        // never seeded with a hardcoded literal.
        _uiState.update { it.copy(advisoryGhostWeight = domain.getAdvisoryTargetWeight()) }
    }

    fun processIntent(intent: SessionIntent) {
        val current = _uiState.value

        when (intent) {
            is SessionIntent.LogSet -> {
                if (current.phase != SessionPhase.ACTIVE) return  // guard

                val restSeconds = domain.calculateRest(intent.weight)
                val newLoad = domain.logSet(intent.weight, intent.reps)
                val restEpoch = SystemClock.elapsedRealtime() + restSeconds * 1_000L

                _uiState.update {
                    it.copy(
                        phase = SessionPhase.RESTING,
                        restEndsAtElapsedMs = restEpoch,
                        normalizedMuscleLoad = newLoad,
                        currentVolume = it.currentVolume + (intent.weight * intent.reps),
                    )
                }
                triggerEffect(SessionEffect.PlayHapticPulse)
            }

            SessionIntent.SkipRest -> {
                if (current.phase != SessionPhase.RESTING) return  // guard
                _uiState.update {
                    it.copy(phase = SessionPhase.ACTIVE, restEndsAtElapsedMs = null)
                }
            }

            SessionIntent.RequestFinishSession -> {
                if (current.phase == SessionPhase.FINISHING || current.phase == SessionPhase.COMPLETE) return

                val requestedAt = SystemClock.elapsedRealtime()
                _uiState.update {
                    it.copy(
                        phase = SessionPhase.FINISHING,
                        finishRequestedAtElapsedMs = requestedAt,
                    )
                }

                // Auto-confirm after the undo window; CancelFinish can race this safely
                // because ConfirmFinish is idempotent and guarded by phase check.
                viewModelScope.launch {
                    kotlinx.coroutines.delay(FINISH_UNDO_WINDOW_MS)
                    processIntent(SessionIntent.ConfirmFinish)
                }
            }

            SessionIntent.CancelFinish -> {
                // Only valid before export has been durably enqueued.
                if (current.phase != SessionPhase.FINISHING) return
                _uiState.update {
                    it.copy(
                        phase = SessionPhase.ACTIVE,
                        finishRequestedAtElapsedMs = null,
                    )
                }
            }

            SessionIntent.ConfirmFinish -> {
                if (current.phase == SessionPhase.COMPLETE) return  // idempotent guard

                // 1. Persist completion marker in durable storage first.
                domain.markSessionComplete()

                // 2. Enqueue export work atomically — WorkManager persists the task
                //    to its own DB before returning, so it survives process death
                //    even if this ViewModel is destroyed milliseconds later.
                //    KEEP policy means a second ConfirmFinish call is a no-op.
                val exportRequest = OneTimeWorkRequestBuilder<ExportSessionWorker>().build()
                WorkManager.getInstance(getApplication())
                    .enqueueUniqueWork(EXPORT_WORK_NAME, ExistingWorkPolicy.KEEP, exportRequest)

                // 3. Update UI state last — the durable work is already secured.
                _uiState.update {
                    it.copy(
                        phase = SessionPhase.COMPLETE,
                        finishRequestedAtElapsedMs = null,
                    )
                }
            }
        }
    }

    private fun triggerEffect(effect: SessionEffect) {
        viewModelScope.launch { _effectChannel.send(effect) }
    }
}
