export type GameEndReason = GameFinishedReason | GameInterruptedReason;

/**
 * map possible end reasons to their string versions
 */
export enum GameFinishedReason {
    /**
     * White is checkmated.
     */
    WHITE_CHECKMATED = "white-checkmated",
    /**
     * Black is checkmated.
     */
    BLACK_CHECKMATED = "black-checkmated",
    STALEMATE = "stalemate",
    THREEFOLD_REPETITION = "threefold-repetition",
    INSUFFICIENT_MATERIAL = "insufficient-material",
    FIFTY_MOVES = "fifty-moves",
    // chess.js doesn't support the following:
    // FIVEFOLD_REPETITION,

    /** Client solved a puzzle */
    PUZZLE_SOLVED = "puzzle-solved",
}

/**
 * A reason for a game to be stopped outside the normal flow of moves.
 */
export enum GameInterruptedReason {
    WHITE_RESIGNED = "white-resigned",
    BLACK_RESIGNED = "black-resigned",
    DRAW_ACCEPTED = "draw-accepted",
    ABORTED = "aborted",
}

/**
 * a reason for the game to pause temporarily, but not end the game
 */
export enum GameHoldReason {
    DRAW_OFFERED = "draw-offered",
    DRAW_CONFIRMATION = "draw-confirmation",
    DRAW_DENIED = "draw-denied",
}
