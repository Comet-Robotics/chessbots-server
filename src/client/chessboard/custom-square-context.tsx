import { createContext } from "react";
import { ChessEngine } from "../../common/chess-engine.js";
import type { Square } from "chess.js";
import { Side } from "../../common/game-types.js";

/**
 * A context used to pass arguments to custom square renderer.
 */
export const CustomSquareContext = createContext({
    // default values for type hinting
    legalSquares: [] as string[],
    chess: new ChessEngine(),
    lastClickedSquare: undefined as Square | undefined,
    side: Side.WHITE as Side,
});
