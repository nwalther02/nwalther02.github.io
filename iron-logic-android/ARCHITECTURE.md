# Iron Logic Android — MVI Architecture

## Executive Objective

Refactor the Iron Logic workout app to a **Glass Cockpit** UI using MVI
(Model-View-Intent). The presentation layer is completely decoupled from
business logic. The View is a stateless renderer of an immutable `SessionUiState`
and a dispatcher of `SessionIntent` values.

---

## Tri-Layer Contract

| Layer | Responsibility |
|---|---|
| **Domain / Core** | Business validation, volume calculation, monotonic time references, persistent I/O. |
| **ViewModel / Reducer** | Receives intents, calls Domain, reduces results into a single immutable `SessionUiState`. Emits ephemeral UI side-effects via `Channel`. |
| **View (Glass Cockpit)** | Subscribes to `SessionUiState` via `collectAsStateWithLifecycle`. Manages only transient element state (e.g., slider drag offset). |

---

## Strict Implementation Rules

1. **Monotonicity** — All timers use `SystemClock.elapsedRealtime()` as an
   absolute end epoch. No UI-owned decrementing counters.

2. **No Inferring** — The View never infers session status. It must receive an
   explicit `SessionPhase.COMPLETE` state.

3. **Advisory Ghosts** — `advisoryGhostWeight` is loaded from the domain on
   `init`; it is never seeded with a hardcoded literal. It must not bypass
   input validation.

4. **WorkManager Scope** — Used exclusively for post-session guaranteed
   delivery (CSV export, Health Connect sync).  
   **Critical rule:** `WorkManager.enqueueUniqueWork()` is called directly by
   the ViewModel — not via the effect `Channel` — so the task is persisted to
   WorkManager's own database before the ViewModel returns. The task survives
   process death regardless of whether any Channel collector is alive.

5. **Channels for ephemeral effects only** — `SessionEffect` covers haptics
   and other process-local one-shots. It does not carry durable work.

---

## State Machine — Legal Transitions

```
ACTIVE ──LogSet──────────────► RESTING
RESTING ─SkipRest / timer──────► ACTIVE
ACTIVE/RESTING ─RequestFinish──► FINISHING
FINISHING ─CancelFinish─────────► ACTIVE
FINISHING ─ConfirmFinish (auto)─► COMPLETE
```

**Guards enforced in the reducer:**

| Intent | Allowed phase(s) |
|---|---|
| `LogSet` | `ACTIVE` only |
| `SkipRest` | `RESTING` only |
| `RequestFinishSession` | `ACTIVE`, `RESTING` |
| `CancelFinish` | `FINISHING` only |
| `ConfirmFinish` | any except `COMPLETE` (idempotent) |

---

## File Map

```
iron-logic-android/
└── app/src/main/java/com/ironlogic/
    ├── domain/
    │   ├── SessionPhase.kt          # Phase enum
    │   └── IronLogicEngine.kt       # Domain interface
    ├── ui/
    │   ├── state/
    │   │   └── SessionUiState.kt    # Immutable UI state
    │   ├── intent/
    │   │   └── SessionIntent.kt     # Sealed intent hierarchy
    │   ├── effect/
    │   │   └── SessionEffect.kt     # Ephemeral UI effects only
    │   ├── viewmodel/
    │   │   └── SessionViewModel.kt  # Reducer + WorkManager handoff
    │   └── screen/
    │       └── IronLogicGlassCockpit.kt  # Pure composable renderers
    └── worker/
        └── ExportSessionWorker.kt   # WorkManager task
```

---

## Hardening Decisions (Post Perplexity Review)

### 1. Process-Death-Safe Export Handoff

**Problem:** Routing `TriggerExportWorker` through the `Channel` creates a
window where the coroutine scope dies after the swipe but before the collector
calls `WorkManager.enqueue()`.

**Fix:** `ConfirmFinish` in the reducer calls `domain.markSessionComplete()`
then `WorkManager.enqueueUniqueWork(..., ExistingWorkPolicy.KEEP, ...)` directly.
Both calls complete synchronously before `_uiState.update {}` runs. The task is
in WorkManager's durable DB before the UI ever reflects `COMPLETE`.

### 2. Race Condition Guards

**Problem:** `MutableStateFlow.update {}` makes each mutation atomic but does
not define policy for conflicting intents arriving near-simultaneously.

**Fix:** Every `when` branch starts with a phase guard (`if (current.phase != X) return`).
The reducer is a strict state machine, not a general-purpose mutation dispatcher.

### 3. Undo Window Durability

**Problem:** Storing the 3-second undo window as an in-memory coroutine delay
only means the window cannot be recovered after an interruption.

**Fix:** `finishRequestedAtElapsedMs: Long?` is stored in `SessionUiState`.
The auto-confirm delay is driven by this value, and the View can render a
countdown badge from it. On resume, the ViewModel can recheck the elapsed time
against the stored epoch.

### 4. Advisory Weight Init

**Problem:** `advisoryGhostWeight = 160.0f` in the default constructor seeds
the state with fake business data.

**Fix:** Default is `null`. The domain loads the real advisory target in
`SessionViewModel.init {}`.

---

## Additional Hardening (Post Codex Review)

### 5. Cancel-Finish Race Condition

**Problem:** The original `ConfirmFinish` guard was `phase == COMPLETE`, so if
`CancelFinish` reset the phase to `ACTIVE`, the auto-confirm coroutine still
fired and incorrectly moved the session to `COMPLETE`.

**Fix:**
- `ConfirmFinish` guard changed to `phase != FINISHING` — the intent is a
  no-op in every phase except `FINISHING`.
- `finishConfirmJob: Job?` stored on the ViewModel. `CancelFinish` cancels it
  before updating state, eliminating the race window entirely.

### 6. Restore Prior Phase on Undo

**Problem:** `CancelFinish` always returned to `ACTIVE`. If the finish gesture
fired during `RESTING`, the rest timer and its `restEndsAtElapsedMs` epoch were
still valid but the phase was wrong.

**Fix:** `phaseBeforeFinishing: SessionPhase?` added to `SessionUiState`.
Captured in `RequestFinishSession`, consumed in `CancelFinish` to restore the
exact prior phase (`ACTIVE` or `RESTING`).

### 7. Main-Thread I/O

**Problem:** `domain.logSet()` and `domain.markSessionComplete()` imply durable
SQLite writes but were called synchronously on the main thread inside
`processIntent`, risking UI jank.

**Fix:** Both calls wrapped in `withContext(Dispatchers.IO)` inside a
`viewModelScope.launch {}` block. State updates and `WorkManager.enqueueUniqueWork()`
remain on the main dispatcher.
