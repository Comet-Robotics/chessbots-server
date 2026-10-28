import type { Square } from "chess.js";

/**
 * The value of a degree in radians.
 * Usage:
 * 90 * DEGREE - Converts 90 degrees to radians (= 1.57)
 * 1.57 / DEGREE - Converts radians to degrees (= 90)
 */
export const DEGREE = Math.PI / 180;

/**
 * The value of a radian in radians.
 */
export const RADIAN = 1;

export const FULL_ROTATION = 360 * DEGREE;

export function clampHeading(radians: number): number {
    // First mod knocks range to (-360, 360)
    // Then add 360 -> range is (0, 720)
    // Final mod results in [0, 360)
    return ((radians % FULL_ROTATION) + FULL_ROTATION) % FULL_ROTATION;
}

/**
 * Size of one grid cell in pixels for UI/editor rendering.
 * Used to convert between board grid coordinates and pixel coordinates.
 */
export const GRID_CELL_PX = 60;

export type Position = {
    x: number;
    y: number;
}

export type GridPosition = {
    i: number;
    j: number;
}

/** Helper to create a Position */
export function createPosition(x: number, y: number): Position {
    return { x, y };
}

/** Helper to create a GridPosition */
export function createGridPosition(i: number, j: number): GridPosition {
    return { i, j };
}

/** Position arithmetic */
export function positionAdd(a: Position, b: Position): Position {
    return { x: a.x + b.x, y: a.y + b.y };
}

export function positionSub(a: Position, b: Position): Position {
    return { x: a.x - b.x, y: a.y - b.y };
}

export function positionNeg(a: Position): Position {
    return { x: -a.x, y: -a.y };
}

/** GridPosition arithmetic */
export function gridPositionAddTuple(
    pos: GridPosition,
    tuple: [number, number],
): GridPosition {
    return { i: pos.i + tuple[0], j: pos.j + tuple[1] };
}

export function gridPositionEquals(a: GridPosition, b: GridPosition): boolean {
    return a.i === b.i && a.j === b.j;
}

/**
 * Converts a chess square (e.g. "a1") to a GridPosition.
 * Files a-h map to columns 1-8, ranks 1-8 map to rows 1-8.
 */
export function squareToGrid(square: Square): GridPosition {
    const fileIndex = square.charCodeAt(0) - 96; // 'a' -> 1, ..., 'h' -> 8
    const rankIndex = parseInt(square[1], 10);
    return { i: fileIndex, j: rankIndex };
}

/**
 * Converts a pixel Position to a GridPosition by rounding.
 */
export function gridPositionFromPosition(pos: Position): GridPosition {
    return { i: Math.round(pos.x), j: Math.round(pos.y) };
}

/**
 * Converts a GridPosition to a pixel Position by adding 0.5 center offset.
 */
export function positionFromGridPosition(gp: GridPosition): Position {
    return { x: gp.i + 0.5, y: gp.j + 0.5 };
}

/**
 * Converts a GridPosition to a string representation "i, j".
 */
export function gridPositionToString(pos: GridPosition): string {
    return `${pos.i}, ${pos.j}`;
}

/**
 * Parses a string "i, j" back into a GridPosition.
 */
export function gridPositionFromString(str: string): GridPosition {
    const parts = str.split(", ");
    return { i: parseInt(parts[0], 10), j: parseInt(parts[1], 10) };
}