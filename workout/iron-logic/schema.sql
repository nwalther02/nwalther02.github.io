-- =============================================================================
-- Iron Logic Workout Generator — SQLite V1 Schema
-- =============================================================================
-- Migration path: all DDL uses ANSI-compatible syntax.
-- See migration_notes.md for PostgreSQL V2 diff.
-- =============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode  = WAL;

-- ---------------------------------------------------------------------------
-- Technique lookup
-- ---------------------------------------------------------------------------
-- Separates raw external load (weight_lbs) from effective stimulus modifier.
-- technique_id is logged metadata only — it is NOT a lineage discriminator.
-- Progression history is keyed by exercise_id alone; technique is derived
-- from (virtual_weight_lbs - weight_ceiling) on every prescription call.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS techniques (
    technique_id    INTEGER PRIMARY KEY,
    name            TEXT    NOT NULL UNIQUE,
    tut_multiplier  REAL    NOT NULL DEFAULT 1.0,  -- relative time-under-tension vs Standard
    description     TEXT    NOT NULL
);

INSERT INTO techniques (technique_id, name, tut_multiplier, description) VALUES
    (1, 'Standard',            1.0,
        'Controlled rep, ~2 s eccentric, no prescribed cadence'),
    (2, 'Tempo',               2.5,
        '3-1-1-0: 3 s eccentric, 1 s pause at bottom, 1 s concentric, 0 s at top'),
    (3, 'Myo-reps',            1.6,
        'Activation set 12-15 reps to near-failure + 3-4 mini-sets of 3 reps / 20 s rest'),
    (4, 'Mechanical_Drop_Set', 1.8,
        'Continue at same load by shifting to a stronger-leverage position at failure');

-- ---------------------------------------------------------------------------
-- Equipment types (home-gym constraint boundary)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_types (
    equipment_id    INTEGER PRIMARY KEY,
    name            TEXT    NOT NULL UNIQUE   -- 'barbell' | 'dumbbell' | 'bodyweight'
);

INSERT INTO equipment_types (equipment_id, name) VALUES
    (1, 'barbell'),
    (2, 'dumbbell'),
    (3, 'bodyweight');

-- ---------------------------------------------------------------------------
-- Exercises
-- ---------------------------------------------------------------------------
-- weight_ceiling: 40.0 for all dumbbell exercises (home-gym hard limit).
--                 NULL for barbell (no practical ceiling in V1 range).
--
-- virtual_weight_lbs in set_log (not here) carries the unconstrained
-- progression lineage when actual load is pinned at the ceiling.
--
-- mds_fallback_id: the next exercise in the Mechanical Drop Set chain.
--   e.g., DB Lateral Raise → DB Front Raise → DB Shoulder Press
--   Must share the same equipment_type and stay within home-gym constraints.
--
-- metadata (TEXT/JSON): grip, setup notes, unilateral flag, tempo defaults.
--   Stored as JSON because these are per-exercise constants that do not
--   participate in queries or joins — no relational benefit to normalising them.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercises (
    exercise_id     INTEGER PRIMARY KEY,
    name            TEXT    NOT NULL UNIQUE,
    muscle_group    TEXT    NOT NULL,
    -- 'chest' | 'back' | 'shoulder' | 'bicep' | 'tricep' | 'quad' | 'hamstring' | 'calf'
    movement_plane  TEXT    NOT NULL,
    -- 'horizontal_push' | 'horizontal_pull' | 'vertical_push' | 'vertical_pull'
    -- | 'hip_hinge' | 'knee_dominant' | 'isolation'
    equipment_id    INTEGER NOT NULL REFERENCES equipment_types(equipment_id),
    is_anchor       INTEGER NOT NULL DEFAULT 0 CHECK (is_anchor IN (0, 1)),
    angle_variant   TEXT    CHECK (angle_variant IN ('flat', 'incline', 'decline')),
    weight_ceiling  REAL,                                   -- NULL = unconstrained
    mds_fallback_id INTEGER REFERENCES exercises(exercise_id),
    metadata        TEXT                                    -- JSON blob
);

-- Anchor lifts (locked for 6-week block, barbell only)
INSERT INTO exercises
    (exercise_id, name, muscle_group, movement_plane, equipment_id,
     is_anchor, angle_variant, weight_ceiling, mds_fallback_id, metadata)
VALUES
    (1, 'Barbell Bench Press', 'chest', 'horizontal_push', 1,
     1, 'flat', NULL, NULL,
     '{"grip":"pronated","setup":"flat bench + rack","tempo_default":"2-0-1-0"}'),

    (2, 'Barbell Back Squat',  'quad',  'knee_dominant',   1,
     1, NULL,   NULL, NULL,
     '{"setup":"rack + squat stand","cue":"full_depth_brace"}');

-- Barbell accessories (no ceiling in V1 scope)
INSERT INTO exercises
    (exercise_id, name, muscle_group, movement_plane, equipment_id,
     is_anchor, angle_variant, weight_ceiling, mds_fallback_id, metadata)
VALUES
    (3, 'Barbell Incline Bench Press', 'chest',     'horizontal_push', 1,
     0, 'incline', NULL, NULL,
     '{"grip":"pronated","setup":"incline bench + rack"}'),

    (4, 'Barbell Row',                 'back',      'horizontal_pull', 1,
     0, NULL,     NULL, NULL,
     '{"grip":"double_overhand","cue":"chest_to_bar_eccentric_control"}'),

    (5, 'Barbell Overhead Press',      'shoulder',  'vertical_push',   1,
     0, NULL,     NULL, NULL,
     '{"grip":"pronated","cue":"full_lockout_hard_brace"}'),

    (6, 'Barbell Romanian Deadlift',   'hamstring', 'hip_hinge',       1,
     0, NULL,     NULL, NULL,
     '{"cue":"neutral_spine_hamstring_stretch_hinge_deep"}');

-- Dumbbell accessories (weight_ceiling = 40.0 lb)
-- MDS chain: DB Lateral Raise (7) → DB Front Raise (9) → DB Shoulder Press (10)
INSERT INTO exercises
    (exercise_id, name, muscle_group, movement_plane, equipment_id,
     is_anchor, angle_variant, weight_ceiling, mds_fallback_id, metadata)
VALUES
    (7,  'DB Lateral Raise',         'shoulder', 'isolation',       2,
     0, NULL,     40.0, 9,   -- fallback: DB Front Raise
     '{"grip":"neutral","cue":"lead_with_elbows_slight_forward_lean","unilateral":false}'),

    (8,  'DB Row',                   'back',     'horizontal_pull', 2,
     0, NULL,     40.0, NULL, -- no MDS chain; gap > 15 falls back to Myo-reps
     '{"grip":"neutral","setup":"bench_support","unilateral":true}'),

    (9,  'DB Front Raise',           'shoulder', 'isolation',       2,
     0, NULL,     40.0, 10,  -- fallback: DB Shoulder Press
     '{"grip":"neutral","cue":"pronated_stronger_leverage_vs_lateral"}'),

    (10, 'DB Shoulder Press',        'shoulder', 'vertical_push',   2,
     0, NULL,     40.0, NULL,
     '{"grip":"neutral","unilateral":false}'),

    (11, 'DB Incline Press',         'chest',    'horizontal_push', 2,
     0, 'incline', 40.0, NULL,
     '{"grip":"neutral","setup":"incline_bench_30_45_deg"}'),

    (12, 'DB Curl',                  'bicep',    'isolation',       2,
     0, NULL,     40.0, NULL,
     '{"grip":"supinating","cue":"no_momentum_supinate_at_top"}'),

    (13, 'DB Tricep Overhead Ext',   'tricep',   'isolation',       2,
     0, NULL,     40.0, NULL,
     '{"grip":"neutral","cue":"full_extension_elbows_tucked"}'),

    (14, 'DB Bulgarian Split Squat', 'quad',     'knee_dominant',   2,
     0, NULL,     40.0, NULL,
     '{"setup":"bench_rear_foot","unilateral":true}'),

    (15, 'DB Walking Lunge',         'quad',     'knee_dominant',   2,
     0, NULL,     40.0, NULL,
     '{"unilateral":true,"cue":"upright_torso_full_step"}'),

    (16, 'DB Romanian Deadlift',     'hamstring','hip_hinge',       2,
     0, NULL,     40.0, NULL,
     '{"grip":"neutral","unilateral":false}');

-- Bodyweight (pull-up bar only; no external load variable)
INSERT INTO exercises
    (exercise_id, name, muscle_group, movement_plane, equipment_id,
     is_anchor, angle_variant, weight_ceiling, mds_fallback_id, metadata)
VALUES
    (17, 'Pull-up',  'back', 'vertical_pull', 3,
     0, NULL, NULL, NULL,
     '{"grip":"pronated","setup":"pull_up_bar","cue":"dead_hang_full_rom"}'),

    (18, 'Chin-up',  'back', 'vertical_pull', 3,
     0, NULL, NULL, NULL,
     '{"grip":"supinated","setup":"pull_up_bar","cue":"dead_hang_drive_elbows_to_hips","add_load_at_top_of_range":true}');

-- Barbell accessory added with home-gym conversion (replaces Leg Press machine)
INSERT INTO exercises
    (exercise_id, name, muscle_group, movement_plane, equipment_id,
     is_anchor, angle_variant, weight_ceiling, mds_fallback_id, metadata)
VALUES
    (19, 'Barbell Front Squat', 'quad', 'knee_dominant', 1,
     0, NULL, NULL, NULL,
     '{"grip":"clean_or_cross_arm","setup":"rack","cue":"elbows_up_upright_torso_full_depth","notes":"step_out_carefully"}');

-- Dumbbell accessories added with home-gym conversions
INSERT INTO exercises
    (exercise_id, name, muscle_group, movement_plane, equipment_id,
     is_anchor, angle_variant, weight_ceiling, mds_fallback_id, metadata)
VALUES
    (20, 'DB Rear Delt Fly',  'shoulder', 'isolation',  2,
     0, NULL, 40.0, NULL,
     '{"grip":"neutral","setup":"hip_hinge","cue":"soft_elbow_lead_with_elbow_squeeze_rear_delts","unilateral":false}'),

    (21, 'Lying DB Leg Curl', 'hamstring', 'hip_hinge', 2,
     0, NULL, 40.0, NULL,
     '{"setup":"prone_on_bench_dumbbell_between_feet","cue":"full_rom_squeeze_at_top","unilateral":false}');

-- ---------------------------------------------------------------------------
-- Workout templates  (rolling 4-day Upper / Lower split)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_templates (
    template_id     INTEGER PRIMARY KEY,
    name            TEXT    NOT NULL UNIQUE,
    split_day       INTEGER NOT NULL CHECK (split_day BETWEEN 1 AND 4),
    split_type      TEXT    NOT NULL CHECK (split_type IN ('upper', 'lower')),
    focus           TEXT    NOT NULL,   -- 'push' | 'pull' | 'squat' | 'hinge'
    block_weeks     INTEGER NOT NULL DEFAULT 6
);

INSERT INTO workout_templates (template_id, name, split_day, split_type, focus, block_weeks)
VALUES
    (1, 'Upper A', 1, 'upper', 'push',  6),
    (2, 'Upper B', 2, 'upper', 'pull',  6),
    (3, 'Lower A', 3, 'lower', 'squat', 6),
    (4, 'Lower B', 4, 'lower', 'hinge', 6);

-- ---------------------------------------------------------------------------
-- Template slots  (fixed exercise assignments per template day)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS template_slots (
    slot_id         INTEGER PRIMARY KEY,
    template_id     INTEGER NOT NULL REFERENCES workout_templates(template_id),
    exercise_id     INTEGER NOT NULL REFERENCES exercises(exercise_id),
    slot_type       TEXT    NOT NULL CHECK (slot_type IN ('anchor', 'accessory')),
    slot_order      INTEGER NOT NULL,
    sets_target     INTEGER NOT NULL,
    reps_low        INTEGER NOT NULL,
    reps_high       INTEGER NOT NULL,
    rest_seconds    INTEGER NOT NULL DEFAULT 90,
    UNIQUE (template_id, slot_order)
);

-- Upper A: push focus (anchor = Bench Press flat)
INSERT INTO template_slots
    (template_id, exercise_id, slot_type, slot_order, sets_target, reps_low, reps_high, rest_seconds)
VALUES
    (1,  1, 'anchor',    1, 4, 4,  6,  180),  -- Barbell Bench Press
    (1,  4, 'accessory', 2, 4, 6,  8,  180),  -- Barbell Row
    (1,  5, 'accessory', 3, 3, 6,  8,  150),  -- Barbell Overhead Press
    (1, 18, 'accessory', 4, 3, 6, 10,  120),  -- Chin-up (underhand, full dead hang)
    (1,  7, 'accessory', 5, 3, 12, 15,  60),  -- DB Lateral Raise
    (1, 13, 'accessory', 6, 3, 10, 15,  60);  -- DB Tricep Overhead Ext

-- Upper B: pull focus
INSERT INTO template_slots
    (template_id, exercise_id, slot_type, slot_order, sets_target, reps_low, reps_high, rest_seconds)
VALUES
    (2, 17, 'anchor',    1, 4, 5,  8,  180),  -- Pull-up / Weighted Pull-up
    (2, 11, 'accessory', 2, 4, 8,  10, 150),  -- DB Incline Press
    (2,  8, 'accessory', 3, 3, 8,  12,  90),  -- DB Row (one-arm, both sides)
    (2, 10, 'accessory', 4, 3, 8,  10, 120),  -- DB Shoulder Press
    (2, 20, 'accessory', 5, 3, 15, 20,  60),  -- DB Rear Delt Fly
    (2, 12, 'accessory', 6, 3, 10, 12,  60);  -- DB Curl

-- Lower A: squat focus
INSERT INTO template_slots
    (template_id, exercise_id, slot_type, slot_order, sets_target, reps_low, reps_high, rest_seconds)
VALUES
    (3,  2, 'anchor',    1, 4, 4,  6,  180),  -- Barbell Back Squat
    (3, 19, 'accessory', 2, 3, 6, 10,  150),  -- Barbell Front Squat (clean or cross-arm grip)
    (3, 14, 'accessory', 3, 3, 10, 12,  90),  -- DB Bulgarian Split Squat
    (3, 21, 'accessory', 4, 3, 10, 15,  60);  -- Lying DB Leg Curl

-- Lower B: hinge focus
INSERT INTO template_slots
    (template_id, exercise_id, slot_type, slot_order, sets_target, reps_low, reps_high, rest_seconds)
VALUES
    (4,  2, 'anchor',    1, 3, 6,  8,  180),  -- Barbell Back Squat (lighter)
    (4,  6, 'accessory', 2, 3, 8,  10,  90),  -- Barbell Romanian Deadlift
    (4, 14, 'accessory', 3, 3, 10, 12,  90),  -- DB Bulgarian Split Squat
    (4, 15, 'accessory', 4, 2, 12, 12,  60);  -- DB Walking Lunge

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    session_id      INTEGER PRIMARY KEY,
    template_id     INTEGER NOT NULL REFERENCES workout_templates(template_id),
    session_date    TEXT    NOT NULL,       -- ISO 8601: 'YYYY-MM-DD'
    block_week      INTEGER NOT NULL CHECK (block_week BETWEEN 1 AND 6),
    block_number    INTEGER NOT NULL DEFAULT 1,
    started_at      TEXT,                   -- ISO 8601 datetime or NULL
    ended_at        TEXT,
    notes           TEXT
);

-- ---------------------------------------------------------------------------
-- Set log
-- ---------------------------------------------------------------------------
-- weight_lbs:         actual external load placed on the bar or in the hand.
--                     Never exceeds weight_ceiling for dumbbell exercises.
--
-- virtual_weight_lbs: the unconstrained load that WOULD have been prescribed
--                     if equipment had no ceiling.  Carries the progression
--                     lineage through ceiling events.  Must be persisted so
--                     the next session can apply +2.5% to the correct base.
--
--                     For barbell lifts: virtual_weight_lbs == weight_lbs.
--                     For DB at ceiling: virtual_weight_lbs > weight_lbs.
--
-- estimated_1rm:      Epley formula — W * (1 + reps / 30).
--                     For Myo-reps: computed from the activation set only.
--                     Technique differences mean e1RM is NOT comparable
--                     across technique changes; only use within the same
--                     technique lineage for trend analysis.
--
-- progression_reason: human-readable audit string referencing the exact row
--                     and rule that produced this prescription.  Never NULL.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS set_log (
    set_id               INTEGER PRIMARY KEY,
    session_id           INTEGER NOT NULL REFERENCES sessions(session_id),
    exercise_id          INTEGER NOT NULL REFERENCES exercises(exercise_id),
    technique_id         INTEGER NOT NULL DEFAULT 1 REFERENCES techniques(technique_id),
    set_number           INTEGER NOT NULL,
    weight_lbs           REAL    NOT NULL,
    virtual_weight_lbs   REAL    NOT NULL,
    reps                 INTEGER NOT NULL,
    rpe                  REAL    CHECK (rpe BETWEEN 1.0 AND 10.0),
    estimated_1rm        REAL,
    tempo_notation       TEXT,                  -- '3-1-1-0' or NULL
    myo_activation_reps  INTEGER,               -- activation set reps (Myo-reps only)
    myo_mini_sets        INTEGER,               -- number of 3-rep mini-sets (Myo-reps only)
    drop_position        TEXT,                  -- e.g. 'lateral->front' (MDS only)
    ceiling_triggered    INTEGER NOT NULL DEFAULT 0 CHECK (ceiling_triggered IN (0, 1)),
    progression_reason   TEXT    NOT NULL
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_set_log_exercise_date
    ON set_log (exercise_id, session_id);

CREATE INDEX IF NOT EXISTS idx_sessions_template_date
    ON sessions (template_id, session_date);

CREATE INDEX IF NOT EXISTS idx_set_log_session
    ON set_log (session_id);
