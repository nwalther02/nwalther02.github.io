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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

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

    // Held so CancelFinish can cancel it before it fires. (Fix 1)
    private var finishConfirmJob: Job? = null

    init {
        _uiState.update { it.copy(advisoryGhostWeight = domain.getAdvisoryTargetWeight()) }
    }

    fun processIntent(intent: SessionIntent) {
        val current = _uiState.value

        when (intent) {
            is SessionIntent.LogSet -> {
                if (current.phase != SessionPhase.ACTIVE) return

                // Fix 3: durable I/O off the main thread.
                viewModelScope.launch {
                    val restSeconds = withContext(Dispatchers.IO) {
                        domain.calculateRest(intent.weight)
                    }
                    val newLoad = withContext(Dispatchers.IO) {
                        domain.logSet(intent.weight, intent.reps)
                    }
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
            }

            SessionIntent.SkipRest -> {
                if (current.phase != SessionPhase.RESTING) return
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
                        phaseBeforeFinishing = current.phase,  // Fix 2: capture for restore
                    )
                }

                // Fix 1: store the job so CancelFinish can cancel it.
                finishConfirmJob?.cancel()
                finishConfirmJob = viewModelScope.launch {
                    kotlinx.coroutines.delay(FINISH_UNDO_WINDOW_MS)
                    processIntent(SessionIntent.ConfirmFinish)
                }
            }

            SessionIntent.CancelFinish -> {
                if (current.phase != SessionPhase.FINISHING) return

                // Fix 1: cancel the pending auto-confirm before it fires.
                finishConfirmJob?.cancel()
                finishConfirmJob = null

                // Fix 2: restore the phase that was active before the gesture.
                _uiState.update {
                    it.copy(
                        phase = it.phaseBeforeFinishing ?: SessionPhase.ACTIVE,
                        finishRequestedAtElapsedMs = null,
                        phaseBeforeFinishing = null,
                    )
                }
            }

            SessionIntent.ConfirmFinish -> {
                // Fix 1: guard on FINISHING, not just COMPLETE, so a late-firing
                // auto-confirm job is a no-op if CancelFinish already ran.
                if (current.phase != SessionPhase.FINISHING) return

                viewModelScope.launch {
                    // Fix 3: durable I/O off the main thread.
                    withContext(Dispatchers.IO) { domain.markSessionComplete() }

                    // WorkManager persists the task to its own DB before returning —
                    // the export survives process death even if this scope is torn down
                    // immediately after. KEEP policy makes this idempotent.
                    val exportRequest = OneTimeWorkRequestBuilder<ExportSessionWorker>().build()
                    WorkManager.getInstance(getApplication())
                        .enqueueUniqueWork(EXPORT_WORK_NAME, ExistingWorkPolicy.KEEP, exportRequest)

                    _uiState.update {
                        it.copy(
                            phase = SessionPhase.COMPLETE,
                            finishRequestedAtElapsedMs = null,
                            phaseBeforeFinishing = null,
                        )
                    }
                }
            }
        }
    }

    private fun triggerEffect(effect: SessionEffect) {
        viewModelScope.launch { _effectChannel.send(effect) }
    }
}
