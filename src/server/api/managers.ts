/**
 * This module creates global singleton instances of the various manager classes.
 */

import { ClientManager } from "./client-manager";
import { type GameManager } from "./game-manager";
import { SocketManager } from "./socket-manager";

export const socketManager = new SocketManager({});
export const clientManager = new ClientManager(socketManager);
export let gameManager: GameManager | null = null;
export const gamePaused = { flag: false };

export function setGameManager(manager: GameManager) {
    gameManager = manager;
}
