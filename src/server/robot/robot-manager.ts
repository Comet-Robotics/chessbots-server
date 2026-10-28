import { DEGREE } from "../../common/units";
import { Robot, RobotId } from "./robot";
import { config } from "../api/config";
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
    robots: Map<string, Robot> = new Map();
    
    /**
     * Alias for robots (for backward compatibility).
     */
    get idsToRobots(): Map<string, Robot> {
        return this.robots;
    }
    
    constructor() {}

    addRobot(robot: Robot) {
        this.robots.set(robot.id, robot);
    }

    /**
     * Updates a robot's stored position to a new grid position.
     */
    updateRobot(robotId: string, newPos: GridPosition): void {
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

    createRobotFromId(robotId: string) {
        const robotConfig = config[robotId];
        if (!robotConfig) {
            return;
        }

        const iIndex =
            USE_BANQUET_INDICES && robotConfig.banquetIndices !== undefined ?
                robotConfig?.banquetIndices.x
            : (
                USE_HEXAPAWN_INDICES &&
                robotConfig.hexapawnIndices !== undefined
            ) ?
                robotConfig?.hexapawnIndices.x
            :   robotConfig?.homeIndices.x;
        const jIndex =
            USE_BANQUET_INDICES && robotConfig.banquetIndices !== undefined ?
                robotConfig?.banquetIndices.y
            : (
                USE_HEXAPAWN_INDICES &&
                robotConfig.hexapawnIndices !== undefined
            ) ?
                robotConfig?.hexapawnIndices.y
            :   robotConfig?.homeIndices.y;

        console.log("Hexapawn status " + USE_HEXAPAWN_INDICES);
        if (robotConfig.banquetIndices !== undefined) {
            console.log("Ok so we should be using them, specifically ti is:");
            console.log(
                robotConfig?.hexapawnIndices.x +
                    " " +
                    robotConfig?.hexapawnIndices.y,
            );
        }

        const robot = new Robot(
            robotId,
            { i: iIndex, j: jIndex },
            {
                i: robotConfig?.defaultIndices.x,
                j: robotConfig?.defaultIndices.y,
            },
            robotConfig?.startHeadingRadians * DEGREE,
            robotConfig?.attributes.piece_type,
        );
        this.addRobot(robot);
        console.log("We have the following:" + robotConfig?.defaultIndices);
        return robot;
    }

    /**
     * Returns `true` if a Robot is at the specified position, and `false` otherwise.
     */
    isRobotAtIndices(indices: GridPosition): boolean {
        const indicesToIds = this.getIndicesToIds();
        return indicesToIds.has(indices.i + ", " + indices.j);
    }

    /**
     * Retrieves a robot at `indices`.
     * Throws if no robot is found.
     */
    getRobotAtIndices(indices: GridPosition): Robot {
        const indicesToIds = this.getIndicesToIds();
        const robotId = indicesToIds.get(indices.i + ", " + indices.j);
        const theKeys = indicesToIds.keys();
        const keyArr = [...theKeys];
        console.log(
            `Indices is ${indices.i}, ${indices.j}, current id's are,`,
            keyArr,
        );

        if (robotId === undefined) {
            throw new Error("Failed to find robot at indices " + indices.i + ", " + indices.j);
        }
        return this.robots.get(robotId) as Robot;
    }

    stopAllRobots() {
        this.robots.forEach((robot) => {
            robot.sendStopPacket();
        });
    }
}

export const robotManager = new RobotManager();
