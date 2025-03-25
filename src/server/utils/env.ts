import { config } from "dotenv";

config();

export const IS_DEVELOPMENT = process.env.NODE_ENV === "development";
export const IS_PRODUCTION = !IS_DEVELOPMENT;
export const USE_VIRTUAL_ROBOTS = process.env.VIRTUAL_ROBOTS === "true";
