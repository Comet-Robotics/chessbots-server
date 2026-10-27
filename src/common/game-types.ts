import type { Square, PieceSymbol } from "chess.js";

/**
 * the movement shown as FROM one square TO another, and if it is a promotion
 */
export interface Move {
    from: Square;
    to: Square;
    promotion?: PieceSymbol;
}

export type Location = {   
    x: number,
    y: number,
}