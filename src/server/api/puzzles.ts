import type { PuzzleComponents } from "./api";

const puzzles: Record<string, PuzzleComponents> = {
    "Puzzle 1": {
        fen: "8/1p3p1k/8/p1p2Kr1/P2pP3/1P1P4/2P5/8 w - - 0 1",
        moves: [{ from: "f5", to: "g5" }],
        rating: 511,
        robotDefaultPositions: {
            "robot-1": "c2",
            "robot-2": "b3",
            "robot-3": "d3",
            "robot-4": "a4",
            "robot-5": "d4",
            "robot-6": "e4",
            "robot-7": "a5",
            "robot-8": "c5",
            "robot-9": "f5",
            "robot-10": "g5",
            "robot-11": "b7",
            "robot-12": "f7",
            "robot-13": "h7",
        },
    },
    "Puzzle 2": {
        fen: "5rk1/p5pp/4q3/8/1P1P4/2P4P/P2p1RP1/5RK1 w",
        moves: [{ from: "f2", to: "f8" }],
        rating: 514,
    },
    "Puzzle 3": {
        fen: "8/8/8/8/2Prk1p1/2K5/8/5R2 w - - 0 1",
        moves: [
            { from: "f1", to: "e1" },
            { from: "e4", to: "f3" },
            { from: "c3", to: "d4" },
        ],
        rating: 1000,
    },
    "Puzzle 4": {
        fen: "1r3k2/R4p2/5Kp1/1p1Pp3/2p1PbP1/2P2P2/4B3/8 b - - 0 1",
        moves: [
            { from: "b8", to: "b6" },
            { from: "d5", to: "d6" },
            { from: "b6", to: "d6" },
        ],
        rating: 1000,
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
        robotDefaultPositions: {
            "robot-4": "e3",
            "robot-5": "e6",
            "robot-12": "e1",
            "robot-7": "e8",
        },
    },
    "Puzzle 7": {
        fen: "8/8/3k4/8/8/3K4/8/3R4 w - - 0 1",
        moves: [
            { from: "d3", to: "e3" },
            { from: "d6", to: "d5" },
        ],

        rating: 1000,
        robotDefaultPositions: {
            "robot-4": "d3",
            "robot-12": "d6",
        },
    },
};

export default puzzles;
