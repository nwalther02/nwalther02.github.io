package com.ironlogic.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/**
 * Enqueued exclusively via WorkManager.enqueueUniqueWork() in SessionViewModel
 * after domain.markSessionComplete() succeeds. Not routed through the effect
 * Channel — WorkManager's own persistence guarantees delivery even if the
 * process is killed immediately after the swipe gesture completes.
 */
class ExportSessionWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            // TODO: fetch completed session from domain / DB
            // TODO: export to CSV
            // TODO: sync to Health Connect
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}
