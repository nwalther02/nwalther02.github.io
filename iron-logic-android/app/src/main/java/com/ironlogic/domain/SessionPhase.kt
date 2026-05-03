package com.ironlogic.domain

enum class SessionPhase {
    ACTIVE,
    RESTING,

    /** Slide-to-finish triggered; 3-second undo window is open. */
    FINISHING,

    COMPLETE
}
