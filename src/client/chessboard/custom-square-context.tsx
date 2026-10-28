import { createContext } from "react";
import type { ChessEngine, Square } from "../../common/chess";
import { Side } from "../../common/game-types";

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
