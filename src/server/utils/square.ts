import { Square } from "chess.js";
import { Position } from "../robot/position";

const FILE_LOOKUP = "abcdefgh";

/**
 * convert physical position to pgn square
 *
 * @param position - physical position
 * @returns - pgn square
 */
export function positionToSquare(position: Position): Square {
    const letter = FILE_LOOKUP[Math.floor(position.x)];
    const number = Math.floor(position.y) + 1;
    return (letter + number) as Square;
}

/**
 * convert pgn square to physical position
 *
 * @param position - pgn square
 * @returns - physical position
 */
export function squareToPosition(square: Square): Position {
    const i = FILE_LOOKUP.indexOf(square.charAt(0));
    const j = parseInt(square.charAt(1)) - 1;
    return new Position(i + 0.5, j + 0.5);
}
