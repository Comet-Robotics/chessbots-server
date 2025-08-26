import { CommandExecutor } from "../command/executor";
import type { GameManager } from "./game-manager";

export const executor = new CommandExecutor();
export const gameManager: GameManager | null = null;

// teehee :p
