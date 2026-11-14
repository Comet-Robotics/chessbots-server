import { gridPositionFromPosition } from "../../common/units";
import { Robot } from "./robot";
import { config, RobotId } from "../api/config";
import type { GridPosition, Position } from "../../common/units";
import { PacketType } from "../api/tunnel/packet";
import { TCPServer } from "../api/tunnel/tcpserver";
import { randomUUID } from "node:crypto";

/**
 * Stores robots. Provides utilities for finding them by position.
 */
export class RobotManager {
    /**
     * Maps robot ids to robots.
     */
    robots: Map<RobotId, Robot> = new Map();

    constructor() {}

    createRobot(mac: string): RobotId {
        const robot = new Robot(mac)
        this.addRobot(robot);
        return config.bots[mac].id
    }
    
    addRobot(robot: Robot) {
        this.robots.set(robot.id, robot);
    }

    connectedRobots(): RobotId[] {
        return this.robots.keys().filter(
            (robotId) => this.isConnected(robotId)
        ).toArray()
    }
    
    robotPositions(): { id: RobotId, position: Position, rotation: number }[] {
        const iter = this.connectedRobots().map((id) => {
            const robot = this.robots.get(id)!
            
            return {
                id,
                position: robot.position,
                rotation: robot.heading,
            }
        })

        return Array.from(iter)
    }

    isConnected(robot: RobotId): boolean {
        return this.robots.get(robot)?.connected() ?? false
    }

    /**
     * Updates a robot's stored position to a new grid position.
     */
    updateRobot(robotId: RobotId, newPos: GridPosition) {
        const robot = this.robots.get(robotId);
        if (robot) {
            robot.position = { x: newPos.x, y: newPos.y };
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
    getRobot(robotId: RobotId): Robot {
        let robot = this.robots.get(robotId);
        if (!robot) {
            console.error(`Failed to find robot ${robotId}`)
        }

        return robot!;
    }

    isRobotAtGridPos(pos: GridPosition): boolean {
        return this.getRobotAtGridPos(pos) != undefined
    }

    /**
     * Retrieves a robot at `indices`.
     * Throws if no robot is found.
     */
    getRobotAtGridPos(pos: GridPosition): Robot | undefined {
        this.robots.forEach((robot, _id) => {
            if (gridPositionFromPosition(robot.position) == pos) {
                return robot
            }
        })

        return undefined
    }

    stopAllRobots() {
        this.robots.forEach((robot) => {
            robot.send({
                packetId:randomUUID(),
                type: PacketType.ESTOP
            });
        });
    }
}

export const robotManager = new RobotManager();
export const tcpServer: TCPServer = new TCPServer(robotManager);