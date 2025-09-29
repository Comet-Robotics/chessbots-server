/**
 * This module creates global singleton instances of the various manager classes.
 */

import { ClientManager } from "./client-manager";
import { type GameManager } from "./game-manager";
import { SocketManager } from "./socket-manager";

export const socketManager = new SocketManager({});
export const clientManager = new ClientManager(socketManager);
export let gameManager: GameManager | null = null;
export let gamePaused = false;
export let pauser: string = "none";
export const disconnectedBots: Set<string> = new Set();

export function setPaused(theFlag) {
    gamePaused = theFlag;
}

export function setPauser(name: string) {
    pauser = name;
}

export function setGameManager(manager: GameManager) {
    gameManager = manager;
}
