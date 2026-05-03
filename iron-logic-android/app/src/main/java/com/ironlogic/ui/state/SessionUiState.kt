package com.ironlogic.ui.state

import com.ironlogic.domain.SessionPhase

/**
 * Single source of truth emitted to the View. Immutable; replaced wholesale
 * on every state transition.
 *
 * [advisoryGhostWeight] is null until the domain loads it — never seeded with
 * a literal default so no fake business data leaks into the initial render.
 *
 * [restEndsAtElapsedMs] is a monotonic (SystemClock.elapsedRealtime) epoch.
 * The View samples time against this value for animation only; it does not
 * own or decrement any counter.
 *
 * [finishRequestedAtElapsedMs] marks when FINISHING began. The ViewModel uses
 * this to enforce the 3-second undo window before auto-confirming; the View
 * renders it as a countdown badge. Null outside the FINISHING phase.
 *
 * [phaseBeforeFinishing] captures ACTIVE or RESTING at the moment the finish
 * gesture fires, so CancelFinish can restore the correct prior phase rather
 * than always jumping back to ACTIVE.
 */
data class SessionUiState(
    val phase: SessionPhase = SessionPhase.ACTIVE,
    val restEndsAtElapsedMs: Long? = null,
    val advisoryGhostWeight: Float? = null,
    val normalizedMuscleLoad: Map<String, Float> = emptyMap(),
    val currentVolume: Float = 0f,
    val finishRequestedAtElapsedMs: Long? = null,
    val phaseBeforeFinishing: SessionPhase? = null,
)
