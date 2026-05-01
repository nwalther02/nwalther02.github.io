"""
Iron Logic Workout Generator
=============================
generate_scheduled_workout(template_id, history_df, ...) -> WorkoutPlan

Every load decision is fully traceable to a specific history row and named rule.
No randomness.  All rounding is deterministic.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

import pandas as pd


# =============================================================================
# Constants
# =============================================================================

DB_CEILING       = 40.0   # lb — hard equipment limit for all dumbbells
DB_INCREMENT     = 2.5    # lb — smallest dumbbell step available
BAR_INCREMENT_LO = 2.5    # lb — barbell increments below 100 lb
BAR_INCREMENT_HI = 5.0    # lb — barbell increments at/above 100 lb
LOAD_RATE        = 1.025  # +2.5% per qualifying session (RPE <= threshold)
RPE_THRESHOLD    = 8.0    # RPE at or below this value triggers load increase

# Ceiling gap thresholds that determine technique escalation
GAP_TEMPO_MAX = 5.0    # 0 < gap < 5  → Tempo (3-1-1-0)
GAP_MYO_MAX   = 15.0   # 5 <= gap <= 15 → Myo-reps
# gap > 15 → Mechanical Drop Set (or Myo-reps if no MDS chain defined)

# Novelty score by recency (sessions ago → score contribution)
NOVELTY_BY_OFFSET: dict[int, float] = {1: 0.0, 2: 0.33, 3: 0.67}
NOVELTY_NOT_SEEN = 1.0


# =============================================================================
# Data classes
# =============================================================================

@dataclass
class SetPrescription:
    exercise_id:         int
    exercise_name:       str
    slot_order:          int
    sets:                int
    reps_low:            int
    reps_high:           int
    weight_lbs:          float          # actual load — never exceeds ceiling
    virtual_weight_lbs:  float          # unconstrained progression lineage
    technique:           str            # Standard | Tempo | Myo-reps | Mechanical_Drop_Set
    tempo_notation:      Optional[str]  # '3-1-1-0' or None
    ceiling_triggered:   bool
    progression_reason:  str            # full audit string


@dataclass
class WorkoutPlan:
    template_id:    int
    prescriptions:  list[SetPrescription]
    trace:          list[str]           # one entry per decision, ordered


# =============================================================================
# Utility formulas
# =============================================================================

def epley_e1rm(weight: float, reps: int) -> float:
    """
    Epley formula:  e1RM = W * (1 + r / 30)

    For Myo-reps sessions, pass the activation-set weight and reps only.
    Do NOT aggregate mini-set reps — they are post-failure and inflate the
    estimate.
    """
    if reps <= 1:
        return float(weight)
    return round(weight * (1.0 + reps / 30.0), 2)


def round_to(value: float, increment: float) -> float:
    """Round `value` to the nearest `increment`."""
    return round(round(value / increment) * increment, 4)


def bar_increment(weight: float) -> float:
    return BAR_INCREMENT_HI if weight >= 100.0 else BAR_INCREMENT_LO


# =============================================================================
# Ceiling resolver
# =============================================================================

def resolve_ceiling(
    virtual_weight:   float,
    ceiling:          float,
    mds_fallback_name: Optional[str],
) -> tuple[float, str, Optional[str], bool, float]:
    """
    Map a virtual (unconstrained) weight to an actual load + technique.

    Technique is a pure function of gap = virtual - ceiling:

        gap <= 0            → Standard at virtual_weight (below ceiling)
        0 < gap < 5         → Tempo (3-1-1-0) at ceiling
        5 <= gap <= 15      → Myo-reps at ceiling
        gap > 15            → Mechanical Drop Set at ceiling
                              (falls back to Myo-reps if no MDS chain defined)

    Returns
    -------
    (actual_weight, technique, tempo_notation, ceiling_triggered, gap)
    """
    gap = virtual_weight - ceiling

    if gap <= 0:
        return virtual_weight, 'Standard', None, False, gap

    actual = ceiling

    if gap < GAP_TEMPO_MAX:
        return actual, 'Tempo', '3-1-1-0', True, gap

    if gap <= GAP_MYO_MAX:
        return actual, 'Myo-reps', None, True, gap

    # gap > GAP_MYO_MAX
    if mds_fallback_name:
        return actual, 'Mechanical_Drop_Set', None, True, gap
    # No MDS chain defined for this exercise — stay with Myo-reps
    return actual, 'Myo-reps', None, True, gap


# =============================================================================
# Anchor lift progression
# =============================================================================

def compute_anchor_prescription(
    exercise_id:   int,
    exercise_name: str,
    slot:          dict,
    history_df:    pd.DataFrame,
    trace:         list[str],
) -> SetPrescription:
    """
    Anchor rule (Bench Press, Squat):

      RPE <= 8.0  →  W_next = round(W_last * 1.025, nearest 2.5 or 5 lb)
      RPE >  8.0  →  hold W_last, note target rep as last_reps + 1

    Source row for each decision is recorded by session_date in
    `progression_reason` so every output is traceable to a specific set_log row.

    Anchor lifts are barbell-only; virtual_weight_lbs == weight_lbs (no ceiling).
    """
    ex_hist = (
        history_df[history_df['exercise_id'] == exercise_id]
        .sort_values(['session_date', 'set_number'], ascending=[False, False])
    )

    if ex_hist.empty:
        start = slot.get('default_start_weight', 95.0)
        reason = (
            f"No history found for {exercise_name}. "
            f"Using default start weight {start} lb."
        )
        trace.append(f"[Anchor | {exercise_name}] {reason}")
        return SetPrescription(
            exercise_id=exercise_id,
            exercise_name=exercise_name,
            slot_order=slot['slot_order'],
            sets=slot['sets_target'],
            reps_low=slot['reps_low'],
            reps_high=slot['reps_high'],
            weight_lbs=start,
            virtual_weight_lbs=start,
            technique='Standard',
            tempo_notation=None,
            ceiling_triggered=False,
            progression_reason=reason,
        )

    last       = ex_hist.iloc[0]
    last_vw    = float(last['virtual_weight_lbs'])
    last_rpe   = float(last['rpe']) if pd.notna(last['rpe']) else 8.5
    last_reps  = int(last['reps'])
    last_date  = str(last['session_date'])

    if last_rpe <= RPE_THRESHOLD:
        raw       = last_vw * LOAD_RATE
        inc       = bar_increment(last_vw)
        next_w    = round_to(raw, inc)
        reason    = (
            f"Source: session {last_date}, {last_vw} lb x {last_reps} @ RPE {last_rpe:.1f}. "
            f"RPE {last_rpe:.1f} <= {RPE_THRESHOLD} -> load increase: "
            f"{last_vw} * {LOAD_RATE} = {raw:.2f} -> rounded to nearest {inc} lb = {next_w} lb."
        )
    else:
        next_w = last_vw
        reason = (
            f"Source: session {last_date}, {last_vw} lb x {last_reps} @ RPE {last_rpe:.1f}. "
            f"RPE {last_rpe:.1f} > {RPE_THRESHOLD} -> hold load at {next_w} lb, "
            f"target reps = {last_reps + 1}."
        )

    trace.append(f"[Anchor | {exercise_name}] {reason}")

    return SetPrescription(
        exercise_id=exercise_id,
        exercise_name=exercise_name,
        slot_order=slot['slot_order'],
        sets=slot['sets_target'],
        reps_low=slot['reps_low'],
        reps_high=slot['reps_high'],
        weight_lbs=next_w,
        virtual_weight_lbs=next_w,  # barbell: no ceiling
        technique='Standard',
        tempo_notation=None,
        ceiling_triggered=False,
        progression_reason=reason,
    )


# =============================================================================
# Accessory lift progression
# =============================================================================

def compute_accessory_prescription(
    exercise:   dict,
    slot:       dict,
    history_df: pd.DataFrame,
    trace:      list[str],
) -> SetPrescription:
    """
    Accessory rule: identical RPE gate as anchor lifts, applied to
    `virtual_weight_lbs` (not weight_lbs).

    The virtual weight is the continuous, unconstrained progression value.
    It is NOT rounded — small fractional increases are intentional to track
    where the load would sit without the ceiling.  The actual weight is
    either rounded-to-increment (below ceiling) or pinned at the ceiling.

    Technique is then determined solely by the gap between virtual and ceiling.
    This makes technique escalation an automatic consequence of training age,
    not a separate manual decision.
    """
    ex_id   = exercise['exercise_id']
    name    = exercise['name']
    ceiling = exercise.get('weight_ceiling')      # None for barbell accessories
    mds_fb  = exercise.get('mds_fallback_name')   # display name of fallback exercise

    ex_hist = (
        history_df[history_df['exercise_id'] == ex_id]
        .sort_values(['session_date', 'set_number'], ascending=[False, False])
    )

    if ex_hist.empty:
        start = float(slot.get('default_start_weight', 25.0))
        reason = (
            f"No history found for {name}. "
            f"Using default start weight {start} lb."
        )
        trace.append(f"[Accessory | {name}] {reason}")
        actual, technique, tempo, triggered, gap = (
            resolve_ceiling(start, ceiling, mds_fb)
            if ceiling is not None
            else (round_to(start, DB_INCREMENT), 'Standard', None, False, 0.0)
        )
        return SetPrescription(
            exercise_id=ex_id,
            exercise_name=name,
            slot_order=slot['slot_order'],
            sets=slot['sets_target'],
            reps_low=slot['reps_low'],
            reps_high=slot['reps_high'],
            weight_lbs=actual,
            virtual_weight_lbs=start,
            technique=technique,
            tempo_notation=tempo,
            ceiling_triggered=triggered,
            progression_reason=reason,
        )

    last      = ex_hist.iloc[0]
    last_vw   = float(last['virtual_weight_lbs'])
    last_rpe  = float(last['rpe']) if pd.notna(last['rpe']) else 8.5
    last_reps = int(last['reps'])
    last_date = str(last['session_date'])

    if last_rpe <= RPE_THRESHOLD:
        # Virtual weight progresses continuously (no increment rounding)
        next_vw   = last_vw * LOAD_RATE
        rpe_clause = (
            f"RPE {last_rpe:.1f} <= {RPE_THRESHOLD} -> "
            f"virtual: {last_vw} * {LOAD_RATE} = {next_vw:.4f} lb"
        )
    else:
        next_vw   = last_vw
        rpe_clause = (
            f"RPE {last_rpe:.1f} > {RPE_THRESHOLD} -> "
            f"hold virtual at {next_vw:.4f} lb, target reps = {last_reps + 1}"
        )

    if ceiling is not None:
        actual, technique, tempo, triggered, gap = resolve_ceiling(
            next_vw, ceiling, mds_fb
        )
        if triggered:
            ceiling_clause = (
                f" | ceiling={ceiling} lb, gap={gap:.4f} lb -> "
                f"technique={technique}"
            )
            if technique == 'Mechanical_Drop_Set' and mds_fb:
                ceiling_clause += f" (drop to {mds_fb})"
        else:
            # Below ceiling: round actual to nearest DB increment
            actual = round_to(actual, DB_INCREMENT)
            ceiling_clause = f" | below ceiling, actual rounded to {actual} lb"
    else:
        inc    = bar_increment(next_vw)
        actual = round_to(next_vw, inc)
        technique, tempo, triggered, gap = 'Standard', None, False, 0.0
        ceiling_clause = f" | barbell, rounded to nearest {inc} lb = {actual} lb"

    reason = (
        f"Source: session {last_date}, virtual={last_vw:.4f} lb x {last_reps} @ RPE {last_rpe:.1f}. "
        f"{rpe_clause}.{ceiling_clause}"
    )
    trace.append(f"[Accessory | {name}] {reason}")

    return SetPrescription(
        exercise_id=ex_id,
        exercise_name=name,
        slot_order=slot['slot_order'],
        sets=slot['sets_target'],
        reps_low=slot['reps_low'],
        reps_high=slot['reps_high'],
        weight_lbs=actual,
        virtual_weight_lbs=next_vw,
        technique=technique,
        tempo_notation=tempo,
        ceiling_triggered=triggered,
        progression_reason=reason,
    )


# =============================================================================
# Accessory rotation scorer
# =============================================================================

def score_accessory_candidate(
    candidate:          dict,
    rotation_history:   list[int],   # [exercise_id used 1 session ago, 2 ago, 3 ago]
    anchor_angle:       Optional[str],
    slot_equipment_ids: list[int],
) -> float:
    """
    Score = (0.4 * Novelty) + (0.4 * Angle_Variance) + (0.2 * Equipment_Fit)

    Novelty
    -------
    1.0  if not seen in last 3 rotations for this slot
    0.67 if seen 3 sessions ago
    0.33 if seen 2 sessions ago
    0.0  if seen last session

    Angle_Variance
    --------------
    Applied only to pressing movements (angle_variant is not None).
    1.0 if candidate angle differs from the session anchor angle.
    0.0 if same angle as anchor (redundant stimulus).
    0.5 if angle comparison is not applicable (non-pressing movement).

    Equipment_Fit
    -------------
    1.0 if equipment_id matches the slot's expected equipment ids.
    0.3 otherwise (usable but not ideal for this slot context).
    """
    ex_id        = candidate['exercise_id']
    angle        = candidate.get('angle_variant')
    equipment_id = candidate['equipment_id']

    # Novelty
    try:
        offset  = rotation_history.index(ex_id) + 1   # 1 = last session
        novelty = NOVELTY_BY_OFFSET.get(offset, NOVELTY_NOT_SEEN)
    except ValueError:
        novelty = NOVELTY_NOT_SEEN

    # Angle_Variance
    if anchor_angle is not None and angle is not None:
        angle_variance = 0.0 if angle == anchor_angle else 1.0
    else:
        angle_variance = 0.5

    # Equipment_Fit
    equipment_fit = 1.0 if equipment_id in slot_equipment_ids else 0.3

    return round(0.4 * novelty + 0.4 * angle_variance + 0.2 * equipment_fit, 6)


# =============================================================================
# Slot rotation history helper
# =============================================================================

def get_slot_rotation_history(
    slot_order:  int,
    template_id: int,
    history_df:  pd.DataFrame,
    lookback:    int = 3,
) -> list[int]:
    """
    Return the exercise_ids used in `slot_order` position across the last
    `lookback` sessions of `template_id`, most recent first.

    Requires history_df to have columns: [session_id, session_date, template_id,
    slot_order_logged, exercise_id].  If slot_order_logged is unavailable the
    function returns an empty list (no novelty penalty applied).
    """
    if history_df.empty:
        return []

    needed_cols = {'session_id', 'session_date', 'template_id', 'slot_order_logged', 'exercise_id'}
    if not needed_cols.issubset(history_df.columns):
        return []

    slot_rows = history_df[
        (history_df['template_id'] == template_id) &
        (history_df['slot_order_logged'] == slot_order)
    ].sort_values('session_date', ascending=False).head(lookback)

    return slot_rows['exercise_id'].tolist()


# =============================================================================
# Main generator
# =============================================================================

def generate_scheduled_workout(
    template_id:    int,
    history_df:     pd.DataFrame,
    template_slots: list[dict],
    exercises:      dict[int, dict],
    candidate_pool: Optional[dict[str, list[dict]]] = None,
) -> WorkoutPlan:
    """
    Deterministic workout generator.

    Parameters
    ----------
    template_id
        Which template to generate: 1=Upper A, 2=Upper B, 3=Lower A, 4=Lower B.

    history_df
        DataFrame of previously logged sets.  Required columns:
          exercise_id        int
          session_id         int
          session_date       str  'YYYY-MM-DD'
          set_number         int
          weight_lbs         float
          virtual_weight_lbs float   -- MUST be persisted; carries ceiling lineage
          reps               int
          rpe                float   -- may be NaN; treated as 8.5 if missing
          technique          str
        Optional columns (used for rotation scoring):
          template_id        int
          slot_order_logged  int

    template_slots
        All slot rows from the database (all templates; filtered internally).
        Each dict: {template_id, exercise_id, slot_type, slot_order,
                    sets_target, reps_low, reps_high, rest_seconds,
                    default_start_weight (optional)}

    exercises
        Dict keyed by exercise_id.  Each value is an exercise row dict with at
        minimum: {exercise_id, name, muscle_group, movement_plane, equipment_id,
                  is_anchor, angle_variant, weight_ceiling, mds_fallback_name}.

    candidate_pool
        Optional dict of muscle_group -> [exercise dicts] used when a slot
        participates in accessory rotation scoring.  If None or if the muscle
        group has only one candidate, the slot's default exercise is used
        without scoring.

    Returns
    -------
    WorkoutPlan containing one SetPrescription per slot and a complete trace.
    """
    trace:         list[str]          = []
    prescriptions: list[SetPrescription] = []

    slots = sorted(
        [s for s in template_slots if s['template_id'] == template_id],
        key=lambda s: s['slot_order'],
    )

    # Identify anchor angle for Angle_Variance scoring
    anchor_angle: Optional[str] = None
    for s in slots:
        if s['slot_type'] == 'anchor':
            anchor_angle = exercises.get(s['exercise_id'], {}).get('angle_variant')
            break

    trace.append(
        f"generate_scheduled_workout | template_id={template_id} "
        f"anchor_angle={anchor_angle!r} slots={len(slots)}"
    )

    for slot in slots:
        ex_id     = slot['exercise_id']
        exercise  = exercises[ex_id]
        slot_type = slot['slot_type']

        if slot_type == 'anchor':
            p = compute_anchor_prescription(
                exercise_id=ex_id,
                exercise_name=exercise['name'],
                slot=slot,
                history_df=history_df,
                trace=trace,
            )

        else:
            muscle        = exercise.get('muscle_group', '')
            candidates    = (candidate_pool or {}).get(muscle)

            # Use rotation scoring only when multiple candidates exist
            if candidates and len(candidates) > 1:
                rotation_hist = get_slot_rotation_history(
                    slot_order=slot['slot_order'],
                    template_id=template_id,
                    history_df=history_df,
                )
                acceptable_eq = [exercise['equipment_id']]
                scored = sorted(
                    [
                        (score_accessory_candidate(c, rotation_hist, anchor_angle, acceptable_eq), c)
                        for c in candidates
                    ],
                    key=lambda x: (-x[0], x[1]['exercise_id']),   # score desc, id asc for ties
                )
                best_score, chosen = scored[0]
                trace.append(
                    f"[Rotation | slot {slot['slot_order']}] scores: "
                    + "; ".join(f"{c['name']}={s:.4f}" for s, c in scored)
                    + f"  ->  selected {chosen['name']} (score={best_score:.4f})"
                )
                exercise = chosen
                ex_id    = chosen['exercise_id']

            p = compute_accessory_prescription(
                exercise=exercise,
                slot=slot,
                history_df=history_df,
                trace=trace,
            )

        prescriptions.append(p)

    return WorkoutPlan(
        template_id=template_id,
        prescriptions=prescriptions,
        trace=trace,
    )


# =============================================================================
# Validation examples
# =============================================================================

def _run_ceiling_validation() -> None:
    """
    Demonstrates the 40 lb ceiling trigger logic for two exercises.

    DB Lateral Raise — virtual crosses ceiling from 40.0 lb
    DB Row           — virtual has been above ceiling for several sessions
    """

    # ── Shared exercise registry ─────────────────────────────────────────────
    exercises = {
        7: {
            'exercise_id':       7,
            'name':              'DB Lateral Raise',
            'muscle_group':      'shoulder',
            'movement_plane':    'isolation',
            'equipment_id':      2,
            'is_anchor':         0,
            'angle_variant':     None,
            'weight_ceiling':    40.0,
            'mds_fallback_name': 'DB Front Raise',
        },
        8: {
            'exercise_id':       8,
            'name':              'DB Row',
            'muscle_group':      'back',
            'movement_plane':    'horizontal_pull',
            'equipment_id':      2,
            'is_anchor':         0,
            'angle_variant':     None,
            'weight_ceiling':    40.0,
            'mds_fallback_name': None,  # no MDS chain -> falls back to Myo-reps at gap > 15
        },
    }

    slot_lateral = {
        'slot_order': 5, 'sets_target': 3, 'reps_low': 12, 'reps_high': 15,
        'default_start_weight': 20.0,
    }
    slot_row = {
        'slot_order': 4, 'sets_target': 3, 'reps_low': 8, 'reps_high': 12,
        'default_start_weight': 25.0,
    }

    # ── Example 1: DB Lateral Raise — first session above ceiling ────────────
    # History: last set was Standard at 40.0 lb (virtual = 40.0).
    # Next virtual = 40.0 * 1.025 = 41.0; gap = 1.0 -> Tempo.
    hist_lateral = pd.DataFrame([{
        'exercise_id':        7,
        'session_id':         101,
        'session_date':       '2026-04-17',
        'set_number':         1,
        'weight_lbs':         40.0,
        'virtual_weight_lbs': 40.0,    # exactly at ceiling — next step crosses it
        'reps':               12,
        'rpe':                7.5,
        'technique':          'Standard',
    }])

    trace1: list[str] = []
    p1 = compute_accessory_prescription(
        exercise=exercises[7],
        slot=slot_lateral,
        history_df=hist_lateral,
        trace=trace1,
    )

    print("=" * 72)
    print("VALIDATION 1 — DB Lateral Raise: first session above 40 lb ceiling")
    print("=" * 72)
    print(f"  Last session : virtual={40.0} lb x 12 reps @ RPE 7.5 (Standard)")
    print(f"  virtual_next : {40.0} * {LOAD_RATE} = {40.0 * LOAD_RATE:.4f} lb")
    print(f"  gap          : {40.0 * LOAD_RATE - 40.0:.4f} lb  (< {GAP_TEMPO_MAX} lb -> Tempo)")
    print(f"  weight_lbs   : {p1.weight_lbs} lb  (pinned at ceiling)")
    print(f"  technique    : {p1.technique}")
    print(f"  tempo        : {p1.tempo_notation}")
    print(f"  ceiling_trig : {p1.ceiling_triggered}")
    print(f"  Reason       : {p1.progression_reason}")
    print()

    # ── Example 2: DB Row — virtual already 52.0 lb (ceiling for several weeks)
    # gap = 52.0 * 1.025 - 40.0 = 53.3 - 40.0 = 13.3 -> Myo-reps (5 <= gap <= 15)
    hist_row = pd.DataFrame([{
        'exercise_id':        8,
        'session_id':         102,
        'session_date':       '2026-04-18',
        'set_number':         1,
        'weight_lbs':         40.0,
        'virtual_weight_lbs': 52.0,    # 6+ sessions above ceiling
        'reps':               10,
        'rpe':                7.5,
        'technique':          'Myo-reps',
    }])

    trace2: list[str] = []
    p2 = compute_accessory_prescription(
        exercise=exercises[8],
        slot=slot_row,
        history_df=hist_row,
        trace=trace2,
    )

    vw_next = 52.0 * LOAD_RATE
    gap2    = vw_next - 40.0
    print("=" * 72)
    print("VALIDATION 2 — DB Row: virtual well above ceiling (Myo-reps zone)")
    print("=" * 72)
    print(f"  Last session : virtual={52.0} lb x 10 reps @ RPE 7.5 (Myo-reps)")
    print(f"  virtual_next : {52.0} * {LOAD_RATE} = {vw_next:.4f} lb")
    print(f"  gap          : {gap2:.4f} lb  ({GAP_TEMPO_MAX} <= gap <= {GAP_MYO_MAX} -> Myo-reps)")
    print(f"  weight_lbs   : {p2.weight_lbs} lb  (pinned at ceiling)")
    print(f"  technique    : {p2.technique}")
    print(f"  ceiling_trig : {p2.ceiling_triggered}")
    print(f"  Reason       : {p2.progression_reason}")
    print()

    # ── e1RM note ────────────────────────────────────────────────────────────
    e1rm_lateral = epley_e1rm(40.0, 12)
    e1rm_row_act = epley_e1rm(40.0, 10)   # activation set only for Myo-reps
    print("=" * 72)
    print("e1RM (Epley) — informational only, not used for DB ceiling progression")
    print("=" * 72)
    print(f"  DB Lateral Raise 40 lb x 12 : {e1rm_lateral} lb")
    print(f"  DB Row 40 lb x 10 (act set)  : {e1rm_row_act} lb")
    print(
        "  Note: e1RM is NOT comparable across technique changes.\n"
        "        Progression is tracked via virtual_weight_lbs lineage,\n"
        "        not via e1RM trend.\n"
    )


if __name__ == '__main__':
    _run_ceiling_validation()
