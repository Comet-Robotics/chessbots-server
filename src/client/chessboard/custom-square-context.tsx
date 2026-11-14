import { createContext } from "react";
import { ChessEngine, Side, WHITE, type Square } from "../../common/chess";

/**
 * A context used to pass arguments to custom square renderer.
 */
export const CustomSquareContext = createContext({
    // default values for type hinting
    legalSquares: [] as string[],
    chess: new ChessEngine(),
    lastClickedSquare: undefined as Square | undefined,
    side: WHITE,
});
