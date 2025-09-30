import { GameHoldReason } from "../../common/game-end-reasons";
import {
    GameHoldMessage,
    SetChessMessage,
} from "../../common/message/game-message";
import { GridIndices } from "../robot/grid-indices";
import { Position } from "../robot/position";
import { robotManager } from "../robot/robot-manager";
import { VirtualRobot } from "../simulator";
import { clientManager, gameManager, socketManager } from "./managers";
import { SaveManager } from "./save-manager";

export let gamePaused = false;
export let pauser: string = "none";

export function setPaused(theFlag) {
    gamePaused = theFlag;
}

export function setPauser(name: string) {
    pauser = name;
}

//have to put this method here, cause if we put it in api.ts where it initially was, we have dependency cycle.
export function setAllRobotsToDefaultPositions(
    defaultPositionsMap?: Map<string, GridIndices>,
): void {
    if (defaultPositionsMap) {
        for (const [robotId, indices] of defaultPositionsMap.entries()) {
            const robot = robotManager.getRobot(robotId);
            robot.position = Position.fromGridIndices(indices);
            if (robot instanceof VirtualRobot)
                robot.updateTunnelPosition(robot.position);
        }
    } else {
        for (const robot of robotManager.idsToRobots.values()) {
            robot.position = Position.fromGridIndices(robot.defaultIndices);
            if (robot instanceof VirtualRobot)
                robot.updateTunnelPosition(robot.position);
            robotManager.updateRobot(robot.id, robot.defaultIndices);
        }
    }
}

//function to actually do the rollback that tommy made
export function doRollBack() {
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
}

// created a pause and unpause game function separately from the endpoint call so that another backend function can call it as well.
export function pauseGame(clientSide) {
    // means game is already paused
    if (gamePaused === true) {
        return { message: "failure" };
    }

    console.log("Pausing Game!");

    setPaused(true);
    robotManager.stopAllRobots();
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
    setPaused(false);
    doRollBack();
    socketManager.sendToAll(new GameHoldMessage(GameHoldReason.GAME_UNPAUSED));

    console.log("Resuming Game!");

    return { message: "success" };
}
