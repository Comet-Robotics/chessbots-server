import { DEGREE, gridPositionFromPosition } from "../../common/units";
import { Robot } from "./robot";
import { config, RobotId } from "../api/config";
import {
    USE_BANQUET_INDICES,
    USE_HEXAPAWN_INDICES,
    USE_VIRTUAL_ROBOTS,
} from "../env";
import type { GridPosition } from "../../common/units";

/**
 * Stores robots. Provides utilities for finding them by position.
 */
export class RobotManager {
    /**
     * Maps robot ids to robots.
     */
    robots: Map<RobotId, Robot> = new Map();

    constructor() {}

    createRobot(mac: string) {

    }
    
    addRobot(robot: Robot) {
        this.robots.set(robot.id, robot);
    }

    /**
     * Updates a robot's stored position to a new grid position.
     */
    updateRobot(robotId: RobotId, newPos: GridPosition) {
        const robot = this.robots.get(robotId);
        if (robot) {
            robot.position = { x: newPos.i, y: newPos.j };
        }
    }

    //use this so on disconnect and reconnect we don't just have a bunch of bots in here that shouldn't exist cause they're disconnected
    removeRobot(robotId: RobotId) {
        this.robots.delete(robotId);
    }

    /**
     * Retrieves a robot by id.
     * Throws if no robot is found.
     */
    getRobot(robotId: RobotId): Robot | undefined {
        return this.robots.get(robotId);
    }

    isRobotAtPos(pos: GridPosition): boolean {
        return this.getRobotAtGridPos(pos) != undefined
    }

    /**
     * Retrieves a robot at `indices`.
     * Throws if no robot is found.
     */
    getRobotAtGridPos(pos: GridPosition): Robot | undefined {
        this.robots.forEach((robot, id) => {
            if (gridPositionFromPosition(robot.position) == pos) {
                return robot
            }
        })

        return undefined
    }

    stopAllRobots() {
        this.robots.forEach((robot) => {
            robot.sendStopPacket();
        });
    }
}

export const robotManager = new RobotManager();
