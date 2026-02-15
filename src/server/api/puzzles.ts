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

const processFEINToDefaultPos = (fein) => {
    const feinBoard = fein.split(" ")[0];
    const feinArr = feinBoard.split("/")

    const columnRows = ["a", "b", "c", "d", "e", "f", "g", "h"]

    // store the dict of piece type and position combos, so we can assign robots to them
    const piecePositionCombo : Record<string, Square[]> = {}

    for (let row = 0; row < feinArr.length; row++)
    {
        let column = 1
        for (const char of feinArr[row])
        {
            // if it's a number, skip ahead by that amount
            if (/[0-9]/.test(char))
            {
                column += Number(char)
            }
            // means we have a piece to place
            else
            {
                let pieceType = ""

                const normalizedChar = char.toLowerCase();
                // check if its a black piece, or uppercase
                if(char === normalizedChar)
                {
                    pieceType = "b_"
                }
                else
                {
                    pieceType = "w_"
                }

                switch (normalizedChar)
                {
                    case 'p':
                        pieceType += "pawn"
                        break
                    case 'r':
                        pieceType += "rook"
                        break
                    case 'b':
                        pieceType += "bishop"
                        break
                    case 'k':
                        pieceType += "king"
                        break
                    case 'q':
                        pieceType += "queen"
                        break
                    case 'n':
                        pieceType += "knight"
                        break
                    default:
                        pieceType += "none"
                        break
                }

                
                const position = (columnRows[column - 1] + (8 - row))
                if(pieceType in piecePositionCombo)
                {
                    piecePositionCombo[pieceType].push(position as Square)
                }
                else
                {
                    piecePositionCombo[pieceType] = [position as Square];
                }

                // now that you placed this piece, go up one to the right
                column += 1
            }
        }
    }

    const newBoardConfig: Record<string, Square> = {}

    for(const [key, value] of Object.entries(config as any))
    {
        if(key != "tcpServerPort" && key != "bots" && key != "botConfigSchema")
        {
            const v = value as any;
            const botPieceType = v.attributes?.piece_type
            // if its a piece we need to place, do that
            if(botPieceType in piecePositionCombo)
            {
                newBoardConfig[key] = piecePositionCombo[botPieceType].pop()!;
                if(piecePositionCombo[botPieceType].length == 0)
                {
                    delete piecePositionCombo[botPieceType]
                }
            }
        }
    }

    // print for debugging
    console.log(JSON.stringify(newBoardConfig, null, 2));

    return newBoardConfig
}



export const puzzles: Record<string, PuzzleComponents> = {
    "Puzzle 1": {
        fen: "8/1p3p1k/8/p1p2Kr1/P2pP3/1P1P4/2P5/8 w - - 0 1",
        moves: [{ from: "f5", to: "g5" }],
        rating: 511,
        tooltip: "tooltip for puzzle 1",
        robotDefaultPositions: processFEINToDefaultPos("8/1p3p1k/8/p1p2Kr1/P2pP3/1P1P4/2P5/8 w - - 0 1")
    },
    "Puzzle 2": {
        fen: "5rk1/p5pp/4q3/8/1P1P4/2P4P/P2p1RP1/5RK1 w",
        moves: [{ from: "f2", to: "f8" }],
        rating: 514,
        tooltip: "tooltip for puzzle 2",
        robotDefaultPositions: processFEINToDefaultPos("5rk1/p5pp/4q3/8/1P1P4/2P4P/P2p1RP1/5RK1 w")
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
        robotDefaultPositions: processFEINToDefaultPos("8/8/8/8/2Prk1p1/2K5/8/5R2 w - - 0 1")
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
        robotDefaultPositions: processFEINToDefaultPos("1r3k2/R4p2/5Kp1/1p1Pp3/2p1PbP1/2P2P2/4B3/8 b - - 0 1")
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
        robotDefaultPositions: processFEINToDefaultPos("1r3k2/R4p2/5Kp1/1p1Pp3/2p1PbP1/2P2P2/4B3/8 b - - 0 1")
    },
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
        robotDefaultPositions: processFEINToDefaultPos("1r3k2/R4p2/5Kp1/1p1Pp3/2p1PbP1/2P2P2/4B3/8 b - - 0 1")
    },
    "Puzzle 7": {
        fen: "8/8/3k4/8/8/3K4/8/3R4 w - - 0 1",
        moves: [
            { from: "d3", to: "e3" },
            { from: "d6", to: "d5" },
        ],

        rating: 1000,
        tooltip: "tooltip for puzzle 7",
        robotDefaultPositions: processFEINToDefaultPos("1r3k2/R4p2/5Kp1/1p1Pp3/2p1PbP1/2P2P2/4B3/8 b - - 0 1")
    },
};
