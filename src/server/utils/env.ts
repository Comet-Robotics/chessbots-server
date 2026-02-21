import { config } from "dotenv";

config();

export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
export const IS_PRODUCTION = !IS_DEVELOPMENT;
export const DO_SAVES = process.env.ENABLE_SAVES === "true";
export const USE_VIRTUAL_ROBOTS = process.env.VIRTUAL_ROBOTS === "true";
export const START_ROBOTS_AT_DEFAULT =
    process.env.START_ROBOTS_AT_DEFAULT === "true";
export const MOVE_TIMEOUT: number =
    process.env.MOVE_TIMEOUT ? parseInt(process.env.MOVE_TIMEOUT) : 1000;
export const MAX_RETRIES: number =
    process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES) : 2;

export const PING_INTERVAL = 1000;
export const PING_TIMEOUT = 100;
export const MAX_PING_FAIL = 3;
