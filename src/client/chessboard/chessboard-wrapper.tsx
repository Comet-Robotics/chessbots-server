import { Chessboard } from "react-chessboard";
import { Square } from "chess.js";
import { useState } from "react";
import { BoardContainer } from "./board-container";
import { ChessEngine } from "../../common/chess-engine";
import { Move } from "../../common/game-types";
import { Side, PieceType } from "../../common/game-types";
import { customSquareRenderer } from "./custom-square-renderer";
import { CustomSquareContext } from "./custom-square-context";

/**
 * an interface of relevant properties for chessboard
 */
interface ChessboardWrapperProps {
    /**
     * The chess.js instance displayed by this class.
     */
    chess: ChessEngine;
    /**
     * The side of the current player.
     */
    side: Side;
    /**
     * A callback function this component invokes whenever a move is made.
     */
    onMove: (move: Move) => void;
}

/**
 *
 * @param props - chess(ChessEngine), side, onMove
 * @returns
 */
export function ChessboardWrapper(props: ChessboardWrapperProps): JSX.Element {
    const { chess, side, onMove } = props;

    /**
     * The width of the chessboard in pixels.
     */
    const [width, setWidth] = useState<number | undefined>();

    const [lastClickedSquare, setLastClickedSquare] = useState<
        Square | undefined
    >();

    //promotion sets
    const [isPromoting, setIsPromoting] = useState(false);

    const [manualPromotionSquare, setManualPromotionSquare] = useState<
        Square | undefined
    >();

    // Maps squares to style objects
    let legalSquares: string[] = [];
    if (lastClickedSquare !== undefined) {
        legalSquares = chess.getLegalSquares(lastClickedSquare);
    }

    /**
     * Returns true if a move is legal, and false otherwise.
     */
    const isLegalMove = (from: Square, to: Square): boolean => {
        return (
            chess.getLegalSquares(from).includes(to) &&
            chess.getPieceSide(from) === side
        );
    };

    /**
     * make to move passed in and unset lastClickedSquare
     * 
     * @param move - the move made
     */
    const doMove = (move: Move): void => {
        onMove(move);
        setLastClickedSquare(undefined);
    };

    // Don't render while width isn't set
    let chessboard: JSX.Element | null = null;
    if (width !== undefined) {
        chessboard = (
            <Chessboard
                //set up the board
                boardOrientation={side === Side.WHITE ? "white" : "black"}
                boardWidth={width}
                position={chess.fen}

                //do a promotion check
                onPromotionCheck={(from: Square, to: Square) => {
                    const promoting = chess.checkPromotion(from, to);
                    setIsPromoting(promoting);
                    return promoting;
                }}
                showPromotionDialog={manualPromotionSquare !== undefined}
                promotionToSquare={manualPromotionSquare}

                //handle dragging and dropping pieces
                onPieceDrop={(
                    from: Square,
                    to: Square,
                    pieceAndSide: string,
                ): boolean => {
                    const piece: PieceType =
                        pieceAndSide[1].toLowerCase() as PieceType;
                    if (isLegalMove(from, to)) {
                        if (manualPromotionSquare !== undefined) {
                            doMove({
                                // `from` is undefined in manual promotion flow
                                from: lastClickedSquare!,
                                // `to: manualPromotionSquare` is also valid
                                to,
                                promotion: piece,
                            });
                            setManualPromotionSquare(undefined);
                        } else {
                            doMove({
                                from,
                                to,
                                // Include piece only if promoting
                                promotion: isPromoting ? piece : undefined,
                            });
                        }

                        // Reset state
                        setIsPromoting(false);
                        return true;
                    }
                    return false;
                }}

                //when you start dragging, unset clicked square
                onPieceDragBegin={(_, square: Square) => {
                    if (square !== lastClickedSquare) {
                        setLastClickedSquare(undefined);
                    }
                }}
                
                //handle square clicking
                onSquareClick={(square: Square) => {
                    setManualPromotionSquare(undefined);

                    // Protects the type of lastClickedSquare, and is true when the clicked square is legal
                    const isSquareLegalMove =
                        lastClickedSquare !== undefined &&
                        isLegalMove(lastClickedSquare, square);

                    //check if the square is legal
                    if (isSquareLegalMove) {
                        if (chess.checkPromotion(lastClickedSquare, square)) {
                            // Manually show promotion dialog
                            setManualPromotionSquare(square);
                        } else {
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
                }}
                isDraggablePiece={({ piece }) => {
                    // piece is color and piece type, e.g. "wP"
                    return piece[0] === side;
                }}
                arePremovesAllowed={false}
                customSquare={customSquareRenderer}
            />
        );
    }

    //return the created chessboard inside the board container
    return (
        <BoardContainer onWidthChange={setWidth}>
            <CustomSquareContext.Provider
                value={{ legalSquares, chess, lastClickedSquare, side }}
            >
                {chessboard}
            </CustomSquareContext.Provider>
        </BoardContainer>
    );
}
