import { Chessboard, ChessboardOptions, PieceDropHandlerArgs } from "react-chessboard";
import { BLACK, QUEEN, WHITE, type ChessEngine, type Square } from "../../common/chess";
import { JSX, useState } from "react";
import { BoardContainer } from "./board-container";
import type { Move, Piece } from "../../common/chess";
import { Side } from "../../common/chess";
import { customSquareRenderer } from "./custom-square-renderer";
import { CustomSquareContext } from "./custom-square-context";
import { move } from "js-chess-engine";

type ChessboardWrapperProps = {
    chess: ChessEngine;
    side: Side;

    /**
     * A callback function this component invokes whenever a move is made.
     */
    onMove: (move: Move) => void;
}

export function ChessboardWrapper(props: ChessboardWrapperProps) {
    const { chess, side, onMove } = props;

    /**
     * The width of the chessboard in pixels.
     */
    const [width, setWidth] = useState<number>(0);
    const [lastClickedSquare, setLastClickedSquare] = useState<
        Square | undefined
    >();

    const [showingPromotionDialog, setShowingPromotionDialog] = useState<
        boolean
    >(false);

    const [orientation, setOrientation] = useState<Side>(WHITE);

    const options: ChessboardOptions = {
        boardOrientation: orientation == WHITE ? "white" : "black",
        position: chess.fen,

        onPieceDrop: (({
            piece: reactPiece,
            sourceSquare,
            targetSquare
        }: PieceDropHandlerArgs): boolean => {
            const piece = reactPiece.pieceType.charAt(1).toLowerCase() as Piece;
            const from = sourceSquare as Square;
            const to = targetSquare as Square;

            if (chess.getLegalSquares(from).includes(to)) {
                const promoting = chess.checkPromotion(from, to);
                
                if (showingPromotionDialog !== undefined) {
                    doMove({
                        // `from` is undefined in manual promotion flow
                        from,
                        // `to: manualPromotionSquare` is also valid
                        to,
                        promotion: promoting ? QUEEN : undefined,
                    });
                    setShowingPromotionDialog(undefined);
                } else {
                    
                    doMove({
                        from,
                        to,
                        // Include piece only if promoting
                        promotion: promoting ? QUEEN : undefined,
                    });
                }
                return true;
            }
            return false;
        }),



        // handle square clicking
        onSquareClick: (({ square: reactSquare }) => {
            const square = reactSquare as Square
            
            setShowingPromotionDialog(undefined);

            // check if the square is legal
            if (chess.getLegalSquares(lastClickedSquare).includes(square)) {
                if (chess.checkPromotion(lastClickedSquare, square)) {
                    setShowingPromotionDialog(true);
                } else {
                    // make the move normally
                    doMove({
                        from: lastClickedSquare,
                        to: square,
                    });
                }
                // Square is clicked again
            } else if (lastClickedSquare === square) {
                // Deselect square
                setLastClickedSquare(undefined);
            } else {
                // Select clicked square
                setLastClickedSquare(square);
            }
        }),

        canDragPiece: ({ piece }) => {
            return piece[0] === side;
        },

        squareRenderer: customSquareRenderer
    }

    /**
     * make to move passed in and unset lastClickedSquare
     *
     * @param move - the move made
     */
    const doMove = (move: Move): void => {
        console.log("doMoveCalled: ", move)
        onMove(move);
        setLastClickedSquare(undefined);
    };

    // Don't render while width isn't set
    let chessboard: JSX.Element | null = null;
    if (width !== undefined && !Number.isNaN(width)) {
        chessboard = (
            <Chessboard options={options}/>
        );
    }

    // return the created chessboard inside the board container
    return (
        <BoardContainer
            side={side}
            onWidthChange={setWidth}
        >
            <CustomSquareContext.Provider
                value={{ legalSquares: [], chess, lastClickedSquare, side }}
            >
                {chessboard}
            </CustomSquareContext.Provider>
        </BoardContainer>
    );
}
