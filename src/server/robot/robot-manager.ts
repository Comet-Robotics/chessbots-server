import { DEGREE } from "../../common/units";
import { Robot, RobotId } from "./robot";
import { config } from "../api/config";
import {
    USE_BANQUET_INDICES,
    USE_HEXAPAWN_INDICES,
    USE_VIRTUAL_ROBOTS,
} from "../env";

/**
 * Stores robots. Provides utilities for finding them by position.
 */
export class RobotManager {
    /**
     * Maps robot ids to robots.
     */
    robots: Map<RobotId, Robot> = new Map();
    
    constructor() {}

    addRobot(robot: Robot) {
        this.robots.set(robot.id, robot);
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
            new GridIndices(iIndex, jIndex),
            new GridIndices(
                robotConfig?.defaultIndices.x,
                robotConfig?.defaultIndices.y,
            ),
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
    isRobotAtIndices(indices: GridIndices): boolean {
        const indicesToIds = this.getIndicesToIds();
        return indicesToIds.has(indices.toString());
    }

    /**
     * Retrieves a robot at `indices`.
     * Throws if no robot is found.
     */
    getRobotAtIndices(indices: GridIndices): Robot {
        const indicesToIds = this.getIndicesToIds();
        const robotId = indicesToIds.get(indices.toString());
        const theKeys = indicesToIds.keys();
        const keyArr = [...theKeys];
        console.log(
            `Indices is ${indices.toString()}, current id's are,`,
            keyArr,
        );

        if (robotId === undefined) {
            throw new Error("Failed to find robot at indices " + indices);
        }
        return this.getRobot(robotId);
    }

    stopAllRobots() {
        this.robots.forEach((robot) => {
            robot.sendStopPacket();
        });
    }
}

export const robotManager = new RobotManager();
