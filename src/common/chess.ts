import type { Color, Move as ChessJsMove, PieceSymbol, Square } from "chess.js";
import { Chess, KING, PAWN, QUEEN, WHITE, BLACK, validateFen } from "chess.js";
import { z } from "zod/v4";
import { gridPositionFromSquare } from "./units";
import { RobotManager } from "../server/robot/robot-manager";
import { RobotId } from "../server/api/config";
import { aiMove } from "js-chess-engine";

export type GameEndReason = GameCompletedReason | GameInterruptedReason;

/**
 * map possible end reasons to their string versions
 */
export enum GameCompletedReason {
    /**
     * White is checkmated.
     */
    WHITE_CHECKMATED = "white-checkmated",
    /**
     * Black is checkmated.
     */
    BLACK_CHECKMATED = "black-checkmated",
    STALEMATE = "stalemate",
    THREEFOLD_REPETITION = "threefold-repetition",
    INSUFFICIENT_MATERIAL = "insufficient-material",
    FIFTY_MOVES = "fifty-moves",
    PUZZLE_SOLVED = "puzzle-solved",
}

/**
 * A reason for a game to be stopped outside the normal flow of moves.
 */
export enum GameInterruptedReason {
    WHITE_RESIGNED = "white-resigned",
    BLACK_RESIGNED = "black-resigned",
    DRAW_ACCEPTED = "draw-accepted",
    ABORTED = "aborted",
}

/**
 * a reason for the game to pause temporarily, but not end the game
 */
export enum GameHoldReason {
    DRAW_OFFERED = "draw-offered",
    DRAW_CONFIRMATION = "draw-confirmation",
    DRAW_DENIED = "draw-denied",
    GAME_PAUSED = "game-paused",
    GAME_UNPAUSED = "game-unpaused",
}


export type Piece = PieceSymbol;
export type Side = Color | typeof SPECTATOR
export { Square };

// Re-export constants used in the codebase
export { KING, PAWN, QUEEN, WHITE, BLACK };
export const SPECTATOR = "s"

export const color_schema = z.enum(['w', 'b']) satisfies z.ZodType<Side>
export const piece_schema = z.enum(['p', 'n', 'b', 'r', 'q', 'k']) satisfies z.ZodType<Piece>
export const square_schema = z.enum([
    'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
    'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
    'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
    'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
    'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
    'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
    'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
    'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'
]) satisfies z.ZodType<Square>

export const move_schema = z.object({
    from: square_schema,
    to: square_schema,
    promotion: piece_schema.optional()
}) satisfies z.ZodType<Pick<ChessJsMove, "from" | "to" | "promotion">>

export const puzzle_schema = z.object({
    name: z.string(),
    fen: z.string().refine((s) => validateFen(s).ok),
    moves: z.array(move_schema),
    rating: z.number(),
    tooltip: z.string().optional(),
})

export type Move = z.infer<typeof move_schema>
export type Puzzle = z.infer<typeof puzzle_schema>

export function oppositeSide(side: Side): Side { 
    if (side == "b") {
        return "w"
    } else {
        return "b"
    }
}

/**
 * Defines a type of session.
 */
export enum ClientType {
    HOST = "host",
    CLIENT = "client",
    SPECTATOR = "spectate",
}

/**
 * Difficulties available for AI.
 */
export enum Difficulty {
    BABY = 0,
    BEGINNER = 1,
    INTERMEDIATE = 2,
    ADVANCED = 3,
}

/**
 * Opponent options for the game.
 */
export enum GameType {
    COMPUTER = "computer",
    HUMAN = "human",
    HEXAPAWN = "hexapawn",
}

/**
 * Creates the engine to manage chess game
 *
 * includes movement, ai moves, castling, en passant, and game finished
 */
export class ChessEngine {
    private chess: Chess;
    private isPuzzle: boolean;

    /**
     * @param pgn - The pgn to use. If undefined, a new game is created.
     */
    constructor(isPuzzle: boolean = false, pgn?: string) {
        this.chess = new Chess();
        this.isPuzzle = isPuzzle;
        if (pgn !== undefined) {
            this.chess.loadPgn(pgn);
        }
    }

    /**
     * Copies the chess engine, optionally with an extra move on the copy.
     * @param move - A move to make.
     */
    copy(move?: Move): ChessEngine {
        const copy = new ChessEngine(this.isPuzzle, this.pgn);
        copy.loadPgn(this.pgn);
        if (move !== undefined) {
            copy.makeMove(move);
        }
        return copy;
    }

    /** get the board position */
    get fen(): string {
        return this.chess.fen();
    }

    /** get the board history */
    get pgn(): string {
        return this.chess.pgn();
    }

    /** undo a move */
    undo(): Move {
        const undo = this.chess.undo();
        return { from: undo?.from, to: undo?.to } as Move;
    }

    /** load a board from history (FEN) */
    loadFen(fen: string) {
        this.chess.load(fen);
    }

    /** load a board from history (PGN) */
    loadPgn(pgn: string) {
        this.chess.loadPgn(pgn);
    }

    /** get the last move made */
    getLastMove(): Move | undefined {
        const moves = this.chess.history({ verbose: true });
        return moves.length > 0 ? moves[moves.length - 1] : undefined;
    }

    /**
     * Determines if a move is a King Side Castle.
     * Assumes that chess hasn't been updated yet
     * @param move - The Move to analyze.
     * @returns true if the move is a King Side Castle
     */
    isKingSideCastling(move: Move): boolean {
        if (this.getPieceTypeFromSquare(move.from) !== KING) {
            return false;
        } else if (this.getPieceColor(move.from) === WHITE) {
            return move.from === "e1" && move.to === "g1";
        } else {
            return move.from === "e8" && move.to === "g8";
        }
    }

    /**
     * Determines if a move is an En Passant Capture.
     * Assumes that chess hasn't been updated yet
     * @param move - The Move to analyze.
     * @returns true if the move is an En Passant Capture
     */
    isEnPassant(move: Move): boolean {
        if (
            move.from[0] !== move.to[0] &&
            this.getPieceTypeFromSquare(move.from) === PAWN
        ) {
            return !this.hasPiece(move.to);
        } else {
            return false;
        }
    }

    /**
     * Determines if a move results in a capture
     * with no special shenanigans.
     * Assumes that chess hasn't been updated yet
     * @param move - The Move to analyze.
     * @returns true if the move is a Capture
     */
    isRegularCapture(move: Move): boolean {
        return this.hasPiece(move.to);
    }

    /**
     * Determines if a move is a Queen Side Castle.
     * Assumes that chess hasn't been updated yet
     * @param move - The Move to analyze.
     * @returns true if the move is a Queen Side Castle
     */
    isQueenSideCastling(move: Move):boolean {
        if (this.getPieceTypeFromSquare(move.from) !== KING) {
            return false;
        } else if (this.getPieceColor(move.from) === WHITE) {
            return move.from === "e1" && move.to === "c1";
        } else {
            return move.from === "e8" && move.to === "c8";
        }
    }

    /**
     * Returns the robot id of the moving piece in a Move.
     * Assumes that chess hasn't been updated yet
     * @param move - The Move to check.
     * @returns The current piece on the square as a it's robot id as a string
     */
    getCapturedPieceId(
        move: Move,
        robotManager: RobotManager,
    ): RobotId | undefined {
        if (this.isEnPassant(move)) {
            return robotManager.getRobotAtGridPos(gridPositionFromSquare(move.to))?.id
        } else if (this.isRegularCapture(move)) {
            const to = gridPositionFromSquare(move.to);
            return robotManager.getRobotAtGridPos(to)?.id;
        }
        return undefined;
    }

    /**
     * Returns the piece on a square or undefined
     * @param square - The Square to check.
     * @returns The current piece on the square as a PieceType enum or undefined if there is no piece
     */
    getPieceTypeFromSquare(square: Square): PieceSymbol | undefined {
        return this.chess.get(square)?.type;
    }

    /**
     * Returns the side of the piece on a square or undefined
     * @param square - The Square to check.
     * @returns The current side of the piece on the square or undefined if there is no piece on the square
     */
    getPieceColor(square: Square): Color | undefined {
        return this.chess.get(square)?.color;
    }

    /**
     * Returns if a square has a piece on it.
     * @param square - The Square to check.
     * @returns true if the square has a piece on it.
     */
    hasPiece(square: Square): boolean {
        return this.getPieceTypeFromSquare(square) !== undefined;
    }

    getLegalMoves(): Move[] {
        let moves: Move[] = this.chess.moves({
            verbose: true,
        }).map(m => {
            return {
                from: m.from,
                to: m.to,
                promotion: m.promotion
            }
        });

        console.log("All legal moves: " + moves)

        return moves
    }

    /**
     * returns a square's legal moves as a map
     * @param square - from square
     * @returns - possible to squares
     */
    getLegalSquares(square: Square): Square[] {
        return this.getLegalMoves().filter((m) => m.from == square).map((m) => m.to);
    }

    /**
     * Makes a move on the chessboard.
     * @returns the move that was made.
     */
    makeMove(move: Move): Move {
        this.chess.move(move);
        return move;
    }

    /**
     * Returns true if a move is a promotion, and false otherwise.
     * Assumes that chess hasn't been updated yet
     */
    checkPromotion(from: Square, to: Square): boolean {
        if (this.getPieceTypeFromSquare(from) !== PAWN) {
            return false;
        }
        
        if (this.getPieceColor(from) === WHITE) {
            return to[1] === "8";
        } else {
            return to[1] === "1";
        }
    }

    /**
     * makes an ai move based on the selected difficulty
     * @param difficulty - a value from 0 to 4 for the ai
     * @returns - the move made
     */
    calculateAiMove(difficulty: Difficulty): Move {
        // result is an object e.g. { "A1": "A2" }
        const result = aiMove(this.fen, difficulty);
        // val is an array e.g. ["A1", "A2"]
        const val = Object.entries(result)[0] as [string, string];
        const from = val[0].toLowerCase() as Square;
        const to = val[1].toLowerCase() as Square;

        if (this.checkPromotion(from, to)) {
            // ai always promotes to queen
            return {
                from,
                to,
                promotion: QUEEN
            };
        }
        return { from, to };
    }

    /**
     * checks if and how the game has ended
     * @returns - a game finished reason from the enum
     */
    getGameFinishedReason(): GameCompletedReason | undefined {
        if (this.isPuzzle) {
            return undefined;
        }

        if (this.chess.isCheckmate()) {
            // If it's your turn, you lost
            return this.chess.turn() === WHITE ?
                    GameCompletedReason.WHITE_CHECKMATED
                :   GameCompletedReason.BLACK_CHECKMATED;
        } else if (this.chess.isStalemate()) {
            return GameCompletedReason.STALEMATE;
        } else if (this.chess.isThreefoldRepetition()) {
            return GameCompletedReason.THREEFOLD_REPETITION;
        } else if (this.chess.isDraw()) {
            return this.chess.isInsufficientMaterial() ?
                    GameCompletedReason.INSUFFICIENT_MATERIAL
                :   GameCompletedReason.FIFTY_MOVES;
        }
        return undefined;
    }

    /**
     * Returns true if `getGameFinishedReason` does not return undefined.
     */
    isGameFinished(): boolean {
        return this.getGameFinishedReason() !== undefined;
    }
}
