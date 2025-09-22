import type { Square } from "chess.js";
import { Position } from "../robot/position.js";

const FILE_LOOKUP = "abcdefgh";

/**
 * convert physical position to pgn square
 *
 * @param position - physical position
 * @returns - pgn square
 */
export function positionToSquare(position: Position): Square {
    const letter = FILE_LOOKUP[Math.floor(position.x - 2)];

    if (letter === undefined) {
        throw new Error(
            `Position (${position.x}, ${position.y}) is not on the chess board.`,
        );
    }

    const number = Math.floor(position.y - 1);

    if (number < 2 || number > 10) {
        throw new Error(
            `Position (${position.x}, ${position.y}) is not on the chess board.`,
        );
    }

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
    const j = parseInt(square.charAt(1));
    return new Position(i + 0.5 + 2, j + 0.5 + 1);
}
