import type { Square } from "chess.js";
import type { Robot } from "../server/robot/robot";
import { DEGREE } from "./units";

/**
 * Defines a specific piece.
 * Values are defined to be consistent with the chess.js library.
 */
export enum PieceType {
    PAWN = "p",
    BISHOP = "b",
    KNIGHT = "n",
    ROOK = "r",
    QUEEN = "q",
    KING = "k",
}

/**
 * Defines playing with the white or black pieces.
 * Values are defined to be consistent with the chess.js library.
 */
export enum Side {
    WHITE = "w",
    BLACK = "b",
    SPECTATOR = "s",
}

/**
 * gets the opposite enum value of a side
 * @param side - a side
 * @returns the opposite of the input side
 */
export function oppositeSide(side: Side) {
    return side === Side.WHITE ? Side.BLACK : Side.WHITE;
}

/**
 * get the robot's start heading based on the side it is on
 * @param side - the current side
 * @returns angle in radians
 */
export function getStartHeading(side: Side) {
    return side === Side.WHITE ? 90 * DEGREE : 270 * DEGREE;
}

/**
 * holds the piece side, type, robot, and square
 */
export class Piece {
    constructor(
        public readonly side: Side,
        public readonly pieceType: PieceType,
        public readonly robot: Robot,
        public square: Square,
    ) {}
}

/**
 * the movement shown as FROM one square TO another, and if it is a promotion
 */
export interface Move {
    from: Square;
    to: Square;
    promotion?: PieceType;
}
