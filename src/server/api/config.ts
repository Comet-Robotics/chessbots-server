import { z } from "zod"
import json_config from "./config.json"
import type { Side, Piece, Square } from "../../common/chess"

export type RobotId = z.infer<typeof robot_id_schema>
export type RobotConfig = z.infer<typeof robot_schema>

let piece_schema = z.object({
    color: z.enum(["w", "b"]) satisfies z.ZodType<Side>,
    symbol: z.enum(["p", "n", "b", "r", "q", "k"]) satisfies z.ZodType<Piece>
})

let square_schema = z.enum([
    'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
    'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
    'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
    'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
    'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
    'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
    'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
    'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'
]) satisfies z.ZodType<Square>

let robot_id_schema =  z.literal(
    [
        1, 2, 3, 4, 5, 6, 7, 8,
        9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24,
        25, 26, 27, 28, 29, 30, 31, 32
    ]
)

let robot_schema = z.object({
    id: robot_id_schema,
    piece: piece_schema,

    start_pos: z.object({ x: z.int(), y: z.int() }),
    start_rot: z.number(),

    vanilla_home_pos: square_schema,
    hexapawn_home_pos: square_schema,
    puzzle_home_pos: square_schema
})

let config_schema = z.object({
    tcpPort: z.int().lt(65536),
    bots: z.record(z.mac(), robot_schema)
})

export const config = config_schema.parse(json_config)