package com.ironlogic.ui.intent

/** Exhaustive set of ways the View can talk to the ViewModel. */
sealed class SessionIntent {
    data class LogSet(val weight: Float, val reps: Int) : SessionIntent()
    object SkipRest : SessionIntent()

    /** Triggered by Slide-to-Finish gesture completing. */
    object RequestFinishSession : SessionIntent()

    /** User taps Undo within the 3-second window. */
    object CancelFinish : SessionIntent()

    /** Undo window expired or user explicitly confirmed. */
    object ConfirmFinish : SessionIntent()
}
