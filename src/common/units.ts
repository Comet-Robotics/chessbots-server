import type { Square } from "./chess";

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