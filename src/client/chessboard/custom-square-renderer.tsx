import { CustomSquareProps } from "react-chessboard/dist/chessboard/types";
import { ReactElement, forwardRef, useContext } from "react";
import {
    OutsideCorners,
    CenterDot,
    SquareHighlight,
    ClickedPiece,
} from "./svg-components";
import { CustomSquareContext } from "./custom-square-context";

/**
 * A renderer for the square dots and piece highlighting
 * @param props - the square, its style, and any children 
 */
export const customSquareRenderer = forwardRef<
    HTMLDivElement,
    CustomSquareProps
>((props, ref) => {
    const { legalSquares, chess, lastClickedSquare, side } =
        useContext(CustomSquareContext);

    let selectElement: ReactElement | null = null;
    let lastMoveHighlight: ReactElement | null = null;
    let clickedPieceHighlight: ReactElement | null = null;

    // highlight the last move made
    const lastMove = chess.getLastMove();
    if (
        lastMove !== undefined &&
        (lastMove.from === props.square || lastMove.to === props.square)
    ) {
        lastMoveHighlight = (
            <SquareHighlight
                height={props.style.height}
                width={props.style.width}
            />
        );
    }

    // highlight clicked pieces
    if (
        lastClickedSquare !== undefined &&
        lastClickedSquare === props.square &&
        chess.hasPiece(props.square) &&
        chess.getPieceSide(props.square) === side
    ) {
        clickedPieceHighlight = (
            <ClickedPiece
                height={props.style.height}
                width={props.style.width}
            />
        );
    }

    // highlight legal squares and capture opportunities
    if (legalSquares.includes(props.square)) {
        // Square should be highlighted
        if (chess.hasPiece(props.square)) {
            // Square has a piece on it
            selectElement = (
                <OutsideCorners
                    height={props.style.height}
                    width={props.style.width}
                />
            );
        } else {
            // Square is empty
            selectElement = <CenterDot />;
        }
    }

    // return all the highlights inside a div
    return (
        <div style={props.style} ref={ref}>
            {clickedPieceHighlight}
            {lastMoveHighlight}
            {selectElement}
            {props.children}
        </div>
    );
});
