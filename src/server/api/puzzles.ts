import { type Square } from "chess.js";
import { type Move } from "../../common/game-types";
import config from "./bot-server-config.json";

export interface PuzzleComponents {
    fen: string;
    moves: Move[];
    rating: number;
    tooltip: string;
    // the key is a physical robot id. value is the square where the robot should be at the start of the game.
    robotDefaultPositions: Record<string, Square>;
}

// i actually hate typescript bro
interface BotValue {
    attributes?: {
        piece_type?: string;
    };
    [key: string]: unknown; // other possible keys
}

// This function takes in the FEIN position recorder, and processes it into which robots should go where. Specifically also
// chooses the correct robot numbers based on their piece types, and does so in about O(n + m) time, where n is # of pieces in
// the FEIN record, and m is the # of chess pieces total
const processFEINToDefaultPos = (fein) => {
    // only want what comes before the space
    const feinBoard = fein.split(" ")[0];
    // can split the rows by this as the slash is a delimeter in this type of position recorder
    const feinArr = feinBoard.split("/");

    // when goign through the columns, can encode them as letters by having this type of array
    const columnRows = ["a", "b", "c", "d", "e", "f", "g", "h"];

    // store the dict of piece type and position combos, so we can assign robots to them
    const piecePositionCombo: Record<string, Square[]> = {};

    // loop through the rows
    for (let row = 0; row < feinArr.length; row++) {
        // for columns, chess doesn't use zero indexing
        let column = 1;
        // go through each char in the current row
        for (const char of feinArr[row]) {
            // if it's a number, skip ahead by that amount
            if (/[0-9]/.test(char)) {
                column += Number(char);
            }
            // means we have a piece to place
            else {
                let pieceType = "";

                // lowercase the character for easier checking and also to check if white or black piece
                const normalizedChar = char.toLowerCase();
                // check if its a black piece, or uppercase
                if (char === normalizedChar) {
                    pieceType = "b_";
                } else {
                    pieceType = "w_";
                }

                // obvio
                switch (normalizedChar) {
                    case "p":
                        pieceType += "pawn";
                        break;
                    case "r":
                        pieceType += "rook";
                        break;
                    case "b":
                        pieceType += "bishop";
                        break;
                    case "k":
                        pieceType += "king";
                        break;
                    case "q":
                        pieceType += "queen";
                        break;
                    case "n":
                        pieceType += "knight";
                        break;
                    default:
                        pieceType += "none";
                        break;
                }

                // subtract by 1 since arrays are indexed at 0 obviously, for the row that's 8 - row because FEIN lists
                // rows top down, but standard chess format lists them bottom up
                const position = columnRows[column - 1] + (8 - row);
                // if the piece is already in the puzzle, add the position as an extra element so we remember
                if (pieceType in piecePositionCombo) {
                    piecePositionCombo[pieceType].push(position as Square);
                }
                // otherwise, create the initial array
                else {
                    piecePositionCombo[pieceType] = [position as Square];
                }

                // now that you placed this piece, go one to the right
                column += 1;
            }
        }
    }

    const newBoardConfig: Record<string, Square> = {};

    // loop through all the robot configs to check their piece type
    for (const [key, value] of Object.entries(
        config as Record<string, unknown>,
    )) {
        // these ones we ignore
        if (
            key !== "tcpServerPort" &&
            key !== "bots" &&
            key !== "botConfigSchema"
        ) {
            // kinda needed as we don't know the type of "value"?
            const v = value as BotValue;
            const botPieceType = v.attributes?.piece_type;
            // if its a piece we need to place, do that
            if (botPieceType && botPieceType in piecePositionCombo) {
                // put it in the last position recorded, and remove that elemnt from the arr
                newBoardConfig[key] = piecePositionCombo[botPieceType].pop()!;
                // if array empty, no more positions of that type, so remove it from the dictionary
                if (piecePositionCombo[botPieceType].length === 0) {
                    delete piecePositionCombo[botPieceType];
                }
            }
        }
    }

    // print for debugging
    console.log(JSON.stringify(newBoardConfig, null, 2));

    return newBoardConfig;
};

export const puzzles: Record<string, PuzzleComponents> = {
    "Puzzle 1": {
        fen: "8/1p3p1k/8/p1p2Kr1/P2pP3/1P1P4/2P5/8 w - - 0 1",
        moves: [{ from: "f5", to: "g5" }],
        rating: 511,
        tooltip: "tooltip for puzzle 1",
        robotDefaultPositions: processFEINToDefaultPos(
            "8/1p3p1k/8/p1p2Kr1/P2pP3/1P1P4/2P5/8 w - - 0 1",
        ),
    },
    "Puzzle 2": {
        fen: "5rk1/p5pp/4q3/8/1P1P4/2P4P/P2p1RP1/5RK1 w",
        moves: [{ from: "f2", to: "f8" }],
        rating: 514,
        tooltip: "tooltip for puzzle 2",
        robotDefaultPositions: processFEINToDefaultPos(
            "5rk1/p5pp/4q3/8/1P1P4/2P4P/P2p1RP1/5RK1 w",
        ),
    },
    "Puzzle 3": {
        fen: "8/8/8/8/2Prk1p1/2K5/8/5R2 w - - 0 1",
        moves: [
            { from: "f1", to: "e1" },
            { from: "e4", to: "f3" },
            { from: "c3", to: "d4" },
        ],
        rating: 1000,
        tooltip: "tooltip for puzzle 3",
        robotDefaultPositions: processFEINToDefaultPos(
            "8/8/8/8/2Prk1p1/2K5/8/5R2 w - - 0 1",
        ),
    },
    "Puzzle 4": {
        fen: "1r3k2/R4p2/5Kp1/1p1Pp3/2p1PbP1/2P2P2/4B3/8 b - - 0 1",
        moves: [
            { from: "b8", to: "b6" },
            { from: "d5", to: "d6" },
            { from: "b6", to: "d6" },
        ],
        rating: 1000,
        tooltip: "tooltip",
        robotDefaultPositions: processFEINToDefaultPos(
            "1r3k2/R4p2/5Kp1/1p1Pp3/2p1PbP1/2P2P2/4B3/8 b - - 0 1",
        ),
    },
    "Puzzle 5": {
        fen: "r1b3k1/1pq1b1r1/p2p3Q/3Pp3/3p1P2/P2B3P/1PP3P1/1R3RK1 w - - 0 1",
        moves: [
            { from: "f4", to: "e5" },
            { from: "d6", to: "e5" },
            { from: "d5", to: "d6" },
            { from: "c7", to: "c6" },
            { from: "f1", to: "f3" },
            { from: "c6", to: "f3" },
            { from: "d3", to: "c4" },
        ],
        rating: 2915,
        tooltip: "tooltip for puzzle 5",
        robotDefaultPositions: processFEINToDefaultPos(
            "r1b3k1/1pq1b1r1/p2p3Q/3Pp3/3p1P2/P2B3P/1PP3P1/1R3RK1 w - - 0 1",
        ),
    },
    //whoever made this puzzle is pretty stupid
    "Puzzle 6": {
        fen: "4k3/8/4p3/8/8/4P3/8/4K3 w - - 0 1",
        moves: [
            { from: "e3", to: "e4" },
            { from: "e6", to: "e5" },
            { from: "e1", to: "e2" },
            { from: "e8", to: "e7" },
        ],

        rating: 1000,
        tooltip: "tooltip for puzzle 6",
        robotDefaultPositions: processFEINToDefaultPos(
            "4k3/8/4p3/8/8/4P3/8/4K3 w - - 0 1",
        ),
    },
    "Puzzle 7": {
        fen: "8/8/3k4/8/8/3K4/8/3R4 w - - 0 1",
        moves: [
            { from: "d3", to: "e3" },
            { from: "d6", to: "d5" },
        ],

        rating: 1000,
        tooltip: "tooltip for puzzle 7",
        robotDefaultPositions: processFEINToDefaultPos(
            "8/8/3k4/8/8/3K4/8/3R4 w - - 0 1",
        ),
    },
};
