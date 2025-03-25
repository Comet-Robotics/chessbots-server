import { GridIndices } from "./grid-indices";
import { Robot } from "./robot";

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
