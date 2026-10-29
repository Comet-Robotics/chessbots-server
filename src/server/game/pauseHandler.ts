import { GameHoldReason } from "../../common/game-end-reasons";
import {
    createGameHoldMessage,
    createSetChessMessage,
} from "../../common/message";
import { robotManager } from "../robot/robot-manager";
import { VirtualRobot } from "../simulator";
import { clientManager, gameManager, socketManager } from "./managers";
import { SaveManager } from "./save-manager";
import type { GridPosition } from "../../common/units";
import { positionFromGridPosition, gridPositionFromString } from "../../common/units";

export let gamePaused = false;
let pauser: string = "none";

export function setPaused(pauseFlag: boolean) {
    gamePaused = pauseFlag;
}

function setPauser(name: string) {
    pauser = name;
}

//have to put this method here, cause if we put it in api.ts where it initially was, we have dependency cycle.
export function setAllRobotsToDefaultPositions(
    defaultPositionsMap?: Map<string, GridPosition>,
): void {
    if (defaultPositionsMap) {
        for (const [robotId, indices] of defaultPositionsMap.entries()) {
            const robot = robotManager.getRobot(robotId);
            robot.position = positionFromGridPosition(indices);
            if (robot instanceof VirtualRobot)
                robot.updateTunnelPosition(robot.position);
        }
    } else {
        for (const robot of robotManager.idsToRobots.values()) {
            robot.position = positionFromGridPosition(robot.defaultIndices);
            if (robot instanceof VirtualRobot)
                robot.updateTunnelPosition(robot.position);
            robotManager.updateRobot(robot.id, robot.defaultIndices);
        }
    }
}

//function to actually do the rollback that tommy made
function doRollBack() {
    const ids = clientManager.getIds();
    if (ids) {
        const oldSave = SaveManager.loadGame(ids[0]);
        gameManager?.chess.loadFen(oldSave!.oldPos);
        setAllRobotsToDefaultPositions(
            new Map<string, GridPosition>(
                oldSave!.oldRobotPos?.map<[string, GridPosition]>((obj) => [
                    obj[1],
                    gridPositionFromString(obj[0]),
                ]) || [],
            ),
        );
        socketManager.sendToAll(createSetChessMessage(oldSave!.oldPos));
    }
}

// created a pause and unpause game function separately from the endpoint call so that another backend function can call it as well.
export function pauseGame(clientSide: boolean) {
    // means game is already paused
    if (gamePaused === true) {
        return { message: "failure" };
    }

    console.log("Pausing Game!");

    setPaused(true);
    robotManager.stopAllRobots();
    socketManager.sendToAll(createGameHoldMessage(GameHoldReason.GAME_PAUSED));

    // set the person who paused it
    setPauser(clientSide ? "admin" : "server");

    return { message: "success" };
}

export function unpauseGame(clientSide: boolean) {
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
    setPaused(false);
    doRollBack();
    socketManager.sendToAll(createGameHoldMessage(GameHoldReason.GAME_UNPAUSED));

    console.log("Resuming Game!");

    return { message: "success" };
}
