import { z } from "zod"
import json_config from "./config.json"

let piece_schema = z.enum([
    "w_bishop",
    "w_knight",
    "w_rook",
    "w_pawn",
    "w_king",
    "w_queen",
    "b_bishop",
    "b_knight",
    "b_rook",
    "b_pawn",
    "b_king",
    "b_queen"
])

let config_schema = z.object({
    tcpPort: z.int().lt(65536),
    bots: z.record(z.mac(), 
        z.object({
            robot_id: z.string(),
            piece: piece_schema,
            start_pos: z.object({ x: z.int(), y: z.int() }),
            start_rot: z.number(),

            home_pos: z.object({ x: z.int(), y: z.int() }),
            home_rot: z.number()
        })
    ),
})

export const config = config_schema.parse(json_config)