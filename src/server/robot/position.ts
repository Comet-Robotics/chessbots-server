import { Pair } from "../utils/pair.js";
import type { GridIndices } from "./grid-indices.js";

/**
 * x,y positions
 */
export class Position extends Pair<Position> {
    constructor(
        public readonly x: number,
        public readonly y: number,
    ) {
        super(x, y);
    }

    protected create(x: number, y: number): Position {
        return new Position(x, y);
    }

    public static fromGridIndices(gridIndices: GridIndices): Position {
        return new Position(gridIndices.i + 0.5, gridIndices.j + 0.5);
    }
}

export const ZERO_POSITION = new Position(0, 0);
