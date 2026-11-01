import type { SquareHandlerArgs, SquareRenderer } from "react-chessboard";
import type { ReactElement } from "react";
import { forwardRef, useContext } from "react";
import {
    OutsideCorners,
    CenterDot,
    SquareHighlight,
    ClickedPiece,
} from "./svg-components";
import { CustomSquareContext } from "./custom-square-context";
import { Square } from "chess.js";

/**
 * A renderer for the square dots and piece highlighting
 * @param props - the square, its style, and any children
 */
export const customSquareRenderer: SquareRenderer = ({
        piece,
        square: reactSquare,
        children
    }) => {
    const square = reactSquare as Square
    
    const { legalSquares, chess, lastClickedSquare, side } =
        useContext(CustomSquareContext);

    let selectElement: ReactElement | null = null;
    let lastMoveHighlight: ReactElement | null = null;
    let clickedPieceHighlight: ReactElement | null = null;

    // highlight the last move made
    const lastMove = chess.getLastMove();
    if (
        lastMove !== undefined &&
        (lastMove.from === square || lastMove.to === square)
    ) {
        lastMoveHighlight = (
            <SquareHighlight
                height="100%"
                width="100%"
            />
        );
    }

    // highlight clicked pieces
    if (
        lastClickedSquare !== undefined &&
        lastClickedSquare === square &&
        chess.hasPiece(square) &&
        chess.getPieceColor(square) === side
    ) {
        clickedPieceHighlight = (
            <ClickedPiece
                height="100%"
                width="100%"
            />
        );
    }

    // highlight legal squares and capture opportunities
    if (legalSquares.includes(square)) {
        // Square should be highlighted
        if (chess.hasPiece(square)) {
            // Square has a piece on it
            selectElement = (
                <OutsideCorners
                    height="100%"
                    width="100%"
                />
            );
        } else {
            // Square is empty
            selectElement = <CenterDot />;
        }
    }

    // return all the highlights inside a div
    return (
        <div>
            {clickedPieceHighlight}
            {lastMoveHighlight}
            {selectElement}
            {children}
        </div>
    );
};
