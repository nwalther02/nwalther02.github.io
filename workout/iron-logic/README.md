# Iron Logic Workout Generator

A deterministic, fully traceable progressive overload engine for a rolling 4-day Upper/Lower split targeting a 160 lb Bench Press.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | SQLite V1 database schema — tables, seed data, and indexes |
| `generator.py` | Pure Python progression engine — no randomness, all decisions are auditable |

---

## Database Schema (`schema.sql`)

### Tables

#### `techniques`
Defines how a set is performed and its relative time-under-tension vs a Standard rep.

| technique_id | name | tut_multiplier |
|---|---|---|
| 1 | Standard | 1.0 |
| 2 | Tempo (3-1-1-0) | 2.5 |
| 3 | Myo-reps | 1.6 |
| 4 | Mechanical_Drop_Set | 1.8 |

A 40 lb Tempo set and a 40 lb Standard set for the same exercise share one progression lineage. Technique is a phase label derived from `virtual_weight_lbs − weight_ceiling` on every prescription call; it is not a lineage discriminator. The stored `technique` value in `set_log` is the logged outcome for reference only.

**Lineage identity** — In the current JS app, progression history is keyed by `exercise_id` alone. The app does not store or filter by `technique_id` in history. Users who want independent Standard and Tempo progression tracks for the same movement must register them as distinct exercises with distinct IDs.

#### `equipment_types`
`barbell` (1) · `dumbbell` (2) · `bodyweight` (3)

#### `exercises`
21 exercises — 2 anchor barbell lifts, 5 barbell accessories, 12 dumbbell accessories, 2 bodyweight.

Key columns:

- **`weight_ceiling`** — 40.0 lb for all dumbbell exercises (home-gym hard limit); `NULL` for barbell.
- **`mds_fallback_id`** — next exercise in the Mechanical Drop Set chain.  
  Example chain: DB Lateral Raise → DB Front Raise → DB Shoulder Press.
- **`metadata`** — JSON blob of per-exercise constants (grip, setup notes, unilateral flag, tempo defaults). Stored as JSON because these values do not participate in joins.

#### `workout_templates`
Four template days in a rolling split:

| template_id | name | split_type | focus |
|---|---|---|---|
| 1 | Upper A | upper | push |
| 2 | Upper B | upper | pull |
| 3 | Lower A | lower | squat |
| 4 | Lower B | lower | hinge |

#### `template_slots`
Assigns exercises to each template day with rep ranges, set counts, and rest intervals.

Current slot assignments:

**Upper A** — horizontal push/pull emphasis  
Barbell Bench Press · Barbell Row · Barbell OHP · Chin-up · DB Lateral Raise · DB Tricep Overhead Ext

**Upper B** — vertical pull/push emphasis  
Pull-up / Weighted Pull-up · DB Incline Press · DB Row (one-arm) · DB Shoulder Press · DB Rear Delt Fly · DB Curl

**Lower A** — quad-dominant  
Barbell Back Squat · Barbell Front Squat · DB Bulgarian Split Squat · Lying DB Leg Curl

**Lower B** — hip-dominant  
Barbell Back Squat · Barbell Romanian Deadlift · DB Bulgarian Split Squat · DB Walking Lunge

#### `sessions`
One row per completed workout. Tracks `block_week` (1–6) and `block_number` for periodisation.

#### `set_log`
Core logging table. Key columns:

- **`weight_lbs`** — actual load placed on the bar/dumbbell. Never exceeds `weight_ceiling`.
- **`virtual_weight_lbs`** — unconstrained load that *would* have been prescribed without a ceiling. Must be persisted so the next session applies +2.5% to the correct base. For barbell lifts `virtual_weight_lbs == weight_lbs`.
- **`estimated_1rm`** — Epley formula: `W * (1 + reps / 30)`. For Myo-reps, computed from the activation set only. Not comparable across technique changes.
- **`progression_reason`** — human-readable audit string referencing the exact history row and rule. Never NULL.

### Indexes
- `idx_set_log_exercise_date` on `(exercise_id, session_id)`
- `idx_sessions_template_date` on `(template_id, session_date)`
- `idx_set_log_session` on `(session_id)`

---

## Generator (`generator.py`)

### Entry Point

```python
generate_scheduled_workout(
    template_id,    # 1=Upper A, 2=Upper B, 3=Lower A, 4=Lower B
    history_df,     # DataFrame of previously logged sets
    template_slots, # list of slot dicts from the database
    exercises,      # dict[exercise_id -> exercise dict]
    candidate_pool, # optional dict[muscle_group -> [exercise dicts]] for rotation
) -> WorkoutPlan
```

Returns a `WorkoutPlan` containing one `SetPrescription` per slot and a complete ordered trace of every decision.

### Constants

| Constant | Value | Meaning |
|---|---|---|
| `DB_CEILING` | 40.0 lb | Hard dumbbell equipment limit |
| `DB_INCREMENT` | 2.5 lb | Smallest dumbbell step |
| `BAR_INCREMENT_LO` | 2.5 lb | Barbell increment below 100 lb |
| `BAR_INCREMENT_HI` | 5.0 lb | Barbell increment at/above 100 lb |
| `LOAD_RATE` | 1.025 | +2.5% load increase per qualifying session |
| `RPE_THRESHOLD` | 8.0 | RPE at or below this triggers a load increase |
| `GAP_TEMPO_MAX` | 5.0 lb | Gap ceiling for Tempo technique |
| `GAP_MYO_MAX` | 15.0 lb | Gap ceiling for Myo-reps technique |

### Progression Rules

#### Anchor Lifts (Barbell Bench Press, Barbell Back Squat)
- **RPE ≤ 8.0** → `W_next = round(W_last × 1.025, nearest 2.5 or 5 lb)`
- **RPE > 8.0** → hold `W_last`, note target reps as `last_reps + 1`

Barbell only — `virtual_weight_lbs == weight_lbs` (no ceiling).

#### Accessory Lifts
Same RPE gate, applied to `virtual_weight_lbs` (not `weight_lbs`). The virtual weight is continuous and unrounded — small fractional increases intentionally track where the load would sit without the equipment ceiling. Technique is then determined solely by the gap:

| Gap (virtual − ceiling) | Technique |
|---|---|
| ≤ 0 | Standard (below ceiling, load rounded to nearest increment) |
| 0 < gap < 5 | Tempo (3-1-1-0) at ceiling |
| 5 ≤ gap ≤ 15 | Myo-reps at ceiling |
| gap > 15 | Mechanical Drop Set at ceiling (falls back to Myo-reps if no MDS chain) |

This makes technique escalation an automatic consequence of training age — no manual intervention required.

### Ceiling Resolver (`resolve_ceiling`)
Pure function: `(virtual_weight, ceiling, mds_fallback_name) → (actual_weight, technique, tempo_notation, ceiling_triggered, gap)`.

### Accessory Rotation Scorer (`score_accessory_candidate`)
Used when a slot has multiple exercise candidates for the same muscle group.

```
Score = (0.4 × Novelty) + (0.4 × Angle_Variance) + (0.2 × Equipment_Fit)
```

| Component | 1.0 | 0.5 | 0.33 | 0.0 |
|---|---|---|---|---|
| **Novelty** | Not seen in last 3 rotations | — | Seen 3 sessions ago | Seen last session |
| **Angle_Variance** | Angle differs from anchor | Not applicable | — | Same angle as anchor |
| **Equipment_Fit** | Matches slot equipment | — | — | Does not match (0.3) |

Tiebreak: highest score wins; equal scores resolved by lowest `exercise_id`.

### Utility Functions

| Function | Description |
|---|---|
| `epley_e1rm(weight, reps)` | Estimates one-rep max: `W × (1 + r / 30)` |
| `round_to(value, increment)` | Rounds to nearest increment |
| `bar_increment(weight)` | Returns 2.5 lb below 100 lb, 5.0 lb at/above |

### Running the Built-In Validation

```bash
python generator.py
```

Prints two ceiling-trigger examples:

1. **DB Lateral Raise** — virtual crosses 40 lb ceiling for the first time → Tempo
2. **DB Row** — virtual has been well above ceiling for several sessions → Myo-reps

---

## Design Decisions

- **`virtual_weight_lbs` must be persisted** in `set_log`. Losing it breaks the progression lineage for any dumbbell exercise at its ceiling.
- **No randomness** — every output is reproducible given the same `history_df`.
- **Technique is derived, not stored** — the generator recomputes technique from the gap on every call. The stored `technique` column in `set_log` is the *logged outcome*, not an input.
- **e1RM is informational** — it is not used to drive progression for ceiling-bound dumbbell exercises. Only `virtual_weight_lbs` is authoritative.
