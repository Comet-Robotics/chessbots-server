/**
 * This module creates global singleton instances of the various manager classes.
 */

import { GameHoldReason } from "../../common/game-end-reasons";
import { GameHoldMessage } from "../../common/message/game-message";
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

// created a pause and unpause game function separately from the endpoint call so that another backend function can call it as well.
export function pauseGame(clientSide) {
    // means game is already paused
    if (gamePaused === true) {
        return { message: "failure" };
    }

    console.log("Pausing Game!");
    setPaused(true);
    socketManager.sendToAll(new GameHoldMessage(GameHoldReason.GAME_PAUSED));

    // set the person who paused it
    setPauser(clientSide ? "admin" : "server");

    return { message: "success" };
}

export function unpauseGame(clientSide) {
    // basically checks if someone is trying to unpause and they're not the ones who paused it.
    if (
        (clientSide && pauser === "server") ||
        (!clientSide && pauser === "admin")
    ) {
        return { message: "failure" };
    }

    if (!gamePaused) {
        return { message: "game not paused" };
    }
    else
    {
        gamePaused = false;
        const ids = clientManager.getIds();
        if (ids) {
            const oldSave = SaveManager.loadGame(ids[0]);
            gameManager?.chess.loadFen(oldSave!.oldPos);
            setAllRobotsToDefaultPositions(
                new Map(
                    oldSave!.oldRobotPos?.map<[string, GridIndices]>((obj) => [
                        obj[1],
                        new GridIndices(
                            parseInt(obj[0].split(", ")[0]),
                            parseInt(obj[0].split(", ")[1]),
                        ),
                    ]),
                ),
            );
            socketManager.sendToAll(new SetChessMessage(oldSave!.oldPos));
        }
        socketManager.sendToAll(
            new GameHoldMessage(GameHoldReason.GAME_UNPAUSED),
        );
    }


    console.log("Resuming Game!");

    return { message: "success" };
}

export function setGameManager(manager: GameManager) {
    gameManager = manager;
}
