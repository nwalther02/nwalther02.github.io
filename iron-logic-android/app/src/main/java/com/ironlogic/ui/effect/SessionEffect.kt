package com.ironlogic.ui.effect

/**
 * One-shot UI effects delivered via Channel. Intentionally limited to
 * ephemeral, process-local effects (haptics, snackbars).
 *
 * Durable work (CSV export, Health Connect sync) is NOT routed through this
 * Channel — the ViewModel calls WorkManager.enqueueUniqueWork() directly so
 * the task survives process death regardless of whether any collector is alive.
 */
sealed class SessionEffect {
    object PlayHapticPulse : SessionEffect()
}
