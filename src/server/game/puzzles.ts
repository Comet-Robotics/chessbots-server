import z from "zod";
import { puzzle_schema } from "../../common/chess";
import puzzles_json from "./puzzles.json"

export const puzzles = z.parse(z.array(puzzle_schema), puzzles_json)