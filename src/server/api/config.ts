import { z } from "zod"
import json_config from "./config.json"
import type { Side, Piece } from "../../common/chess"

export let piece_schema = z.object({
    color: z.enum(["w", "b"]) satisfies z.ZodType<Side>,
    symbol: z.enum(["p", "n", "b", "r", "q", "k"]) satisfies z.ZodType<Piece>
})

export type RobotId = z.infer<typeof robot_id_schema>
export type RobotConfig = z.infer<typeof robot_schema>
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
    home_pos: z.object({ x: z.int(), y: z.int() }),
    home_rot: z.number()
})

let config_schema = z.object({
    tcpPort: z.int().lt(65536),
    bots: z.record(z.mac(), robot_schema)
})

export const config = config_schema.parse(json_config)