import { Chessboard } from "react-chessboard";
import { BLACK, WHITE, type ChessEngine, type Square } from "../../common/chess";
import { JSX, useState } from "react";
import { BoardContainer } from "./board-container";
import type { Move, Piece } from "../../common/chess";
import { Side } from "../../common/chess";
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
     * The rotation of the current player.
     */
    rotation: number;
    /**
     * A callback function this component invokes whenever a move is made.
     */
    onMove: (move: Move) => void;
}

/**
 * Creates a chessboard that uses our custom properties inside a board container
 *
 * These include width, moves, promotions, piece dragging, square highlighting, and
 * @param props - chess(ChessEngine), side, onMove
 * @returns JSX.Element chessboard
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

    // promotion states
    const [isPromoting, setIsPromoting] = useState(false);

    const [manualPromotionSquare, setManualPromotionSquare] = useState<
        Square | undefined
    >();

    const [orientation, setOrientation] = useState<Side>(WHITE);

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
            chess.getPieceColor(from) === side
        );
    };


    const options = {
                    boardOrientation: orientation == WHITE ? "white" : "black",
                    position: chess.fen,

                    // handle dragging and dropping pieces
                    onPieceDrop: ((
                        from: Square,
                        to: Square,
                        pieceAndSide: string,
                    ): boolean => {
                        const piece: Piece =
                            pieceAndSide[1].toLowerCase() as Piece;
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
                    }),



                // handle square clicking
                onSquareClick: ((square: Square) => {
                    setManualPromotionSquare(undefined);

                    // Protects the type of lastClickedSquare, and is true when the clicked square is legal
                    const isSquareLegalMove =
                        lastClickedSquare !== undefined &&
                        isLegalMove(lastClickedSquare, square);

                    // check if the square is legal
                    if (isSquareLegalMove) {
                        if (chess.checkPromotion(lastClickedSquare, square)) {
                            // Manually show promotion dialog
                            setManualPromotionSquare(square);
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
        onMove(move);
        setLastClickedSquare(undefined);
    };

    // Don't render while width isn't set
    let chessboard: JSX.Element | null = null;
    if (width !== undefined) {
        chessboard = (
            <Chessboard options={options}/>
        );
    }

    // return the created chessboard inside the board container
    return (
        <BoardContainer
            side={side}
            onWidthChange={setWidth}
            rotation={props.rotation}
        >
            <CustomSquareContext.Provider
                value={{ legalSquares, chess, lastClickedSquare, side }}
            >
                {chessboard}
            </CustomSquareContext.Provider>
        </BoardContainer>
    );
}
