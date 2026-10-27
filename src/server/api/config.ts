import { z } from "zod"
import json_config from "./config.json"
import { Color, PieceSymbol } from "chess.js"

export let piece_schema = z.object({
    color: z.enum(["w", "b"]) satisfies z.ZodType<Color>,
    symbol: z.enum(["p", "n", "b", "r", "q", "k"]) satisfies z.ZodType<PieceSymbol>
})

let config_schema = z.object({
    tcpPort: z.int().lt(65536),
    bots: z.record(z.mac(), 
        z.object({
            robot_id: z.int().gt(0).lt(33),
            piece: piece_schema,

            start_pos: z.object({ x: z.int(), y: z.int() }),
            start_rot: z.number(),
            home_pos: z.object({ x: z.int(), y: z.int() }),
            home_rot: z.number()
        })
    ),
})

export const config = config_schema.parse(json_config)