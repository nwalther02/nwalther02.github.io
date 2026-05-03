package com.ironlogic.domain

/**
 * Pure domain interface — owns business validation, volume calculation, and
 * progression rules. No coroutine scope; all calls are synchronous.
 */
interface IronLogicEngine {

    /** Returns target rest duration in seconds based on the logged load. */
    fun calculateRest(weightLbs: Float): Int

    /**
     * Persists the set to durable storage and returns the updated
     * normalised muscle-load map (0.0–1.0 per muscle group key).
     */
    fun logSet(weightLbs: Float, reps: Int): Map<String, Float>

    /** Returns the advisory target weight for the current exercise (read-only). */
    fun getAdvisoryTargetWeight(): Float?

    /** Persists session completion marker; idempotent. */
    fun markSessionComplete()
}
