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
    getIndicesToIds(): Map<string, string> {
        return Array.from(this.idsToRobots.values()).reduce((acc, robot) => {
            const positionAsGridIndices = GridIndices.fromPosition(
                robot.position
            );
            acc.set(positionAsGridIndices.toString(), robot.id);
            return acc;
        }, new Map<string, string>());
    }

    constructor(robots: Robot[]) {
        robots.forEach((robot) => this.addRobot(robot));
    }

    addRobot(robot: Robot) {
        this.idsToRobots.set(robot.id, robot);
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
        if (robotId === undefined) {
            throw new Error("Failed to find robot at indices " + indices);
        }
        return this.getRobot(robotId);
    }

    updateRobot(robotId: string, indices: GridIndices) {
        const indicesToIds = this.getIndicesToIds();
        // if (indicesToIds.has(indices.toString())) {
        //     indicesToIds.delete(indices.toString());
        // }
        for (const [i, r] of indicesToIds.entries()) {
            if (robotId === r) indicesToIds.delete(i);
        }
        indicesToIds.set(indices.toString(), robotId);
    }
}
