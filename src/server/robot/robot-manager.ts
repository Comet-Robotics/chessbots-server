import { DEGREE } from "../../common/units";
import { GridIndices } from "./grid-indices";
import { Position } from "./position";
import { Robot } from "./robot";
import config from "../api/bot-server-config.json";

/**
 * Stores robots. Provides utilities for finding them by position.
 */
export class RobotManager {
    /**
     * Maps robot ids to robots.
     */
    idsToRobots: Map<string, Robot> = new Map();

    /**
     * Maps robot locations to their ids.
     */
    indicesToIds: Map<string, string> = new Map();

    constructor(robots: Robot[]) {
        robots.forEach((robot) => this.addRobot(robot));
    }

    addRobot(robot: Robot) {
        this.idsToRobots.set(robot.id, robot);
        this.indicesToIds.set(JSON.stringify(robot.defaultIndices), robot.id);
    }

    createRobotFromId(robotId: string) {
        const robot = new Robot(
            robotId,
            config[robotId].homePosition,
            config[robotId].defaultPosition,
            config[robotId].startHeading * DEGREE,
        );
        this.addRobot(robot);
    }
    /**
     * Retrieves a robot by id.
     * Throws if no robot is found.
     */
    getRobot(robotId: string): Robot {
        const robot = this.idsToRobots.get(robotId);
        if (robot === undefined) {
            throw new Error("Failed to find robot with id " + robotId);
        }
        return robot;
    }

    createRobotFromId(robotId: string) {
        const robot = new Robot(
            robotId,
            new GridIndices(
                config[robotId].homePosition.x,
                config[robotId].homePosition.y,
            ),
            new GridIndices(
                config[robotId].defaultPosition.x,
                config[robotId].defaultPosition.y,
            ),
            config[robotId].startHeading * DEGREE,
            new Position(
                config[robotId].defaultPosition.x,
                config[robotId].defaultPosition.y,
            ),
        );
        this.addRobot(robot);
    }

    /**
     * Returns `true` if a Robot is at the specified position, and `false` otherwise.
     */
    isRobotAtIndices(indices: GridIndices): boolean {
        return this.indicesToIds.has(JSON.stringify(indices));
    }

    /**
     * Retrieves a robot at `indices`.
     * Throws if no robot is found.
     */
    getRobotAtIndices(indices: GridIndices): Robot {
        const robotId = this.indicesToIds.get(JSON.stringify(indices));
        if (robotId === undefined) {
            throw new Error("Failed to find robot at indices " + indices);
        }
        return this.getRobot(robotId);
    }

    updateRobot(robotId: string, indices: GridIndices) {
        // if (this.indicesToIds.has(JSON.stringify(indices))) {
        //     this.indicesToIds.delete(JSON.stringify(indices));
        // }
        for (const [i, r] of this.indicesToIds.entries()) {
            if (robotId === r) this.indicesToIds.delete(i);
        }
        this.indicesToIds.set(JSON.stringify(indices), robotId);
    }
}
