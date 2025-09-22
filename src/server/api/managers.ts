/**
 * This module creates global singleton instances of the various manager classes.
 */

import { ClientManager } from "./client-manager.js";
import { type GameManager } from "./game-manager.js";
import { SocketManager } from "./socket-manager.js";

export const socketManager = new SocketManager({});
export const clientManager = new ClientManager(socketManager);
export let gameManager: GameManager | null = null;

export function setGameManager(manager: GameManager) {
    gameManager = manager;
}
