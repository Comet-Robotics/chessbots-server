import { EventEmitter } from "@posva/event-emitter";
import { BotTunnel } from "./api/tcp-interface";
import { Robot } from "./robot/robot";
import config from "./api/bot-server-config.json";
import { Packet, PacketType } from "./utils/tcp-packet";
import { Position, ZERO_POSITION } from "./robot/position";
import path from "path";
import {
    SimulatorUpdateMessage,
    StackFrame,
} from "../common/message/simulator-message";
import { socketManager } from "./api/managers";
import { randomUUID } from "node:crypto";
import { GridIndices } from "./robot/grid-indices";
import { getStartHeading, Side } from "../common/game-types";
import { gridIndicesToPosition } from "./robot/path-materializer";

const srcDir = path.resolve(__dirname, "../");

/**
 * get the current error stack
 * @param justMyCode - restricts the scope of the stack to just the code in the chessbots-server project. Example: if there is an error thrown in a file in the node_modules folder, this will not be included in the stack.
 * @returns - the stack of the error
 */
function getStack(justMyCode = true) {
    // inspired by https://stackoverflow.com/a/56651526
    const err = new Error();
    Error.captureStackTrace(err, getStack);

    const { stack } = err;
    if (!stack) return;
    const cleanedStack = parseErrorStack(stack);

    if (justMyCode) {
        const chessBotsCodeEndFrame = cleanedStack.findIndex(
            (frame) => !frame.fileName.startsWith(srcDir),
        );
        if (chessBotsCodeEndFrame !== -1) {
            cleanedStack.splice(chessBotsCodeEndFrame);
        }
    }

    return cleanedStack;
}

/**
 * parse the stack for important information like file, function, and line
 * @param stack - the stack to parse
 * @returns the stack frames as readable objects
 */
const parseErrorStack = (stack: string): StackFrame[] => {
    const lines = stack.split("\n");
    const frames = lines.slice(1).reduce<StackFrame[]>((result, line) => {
        const match = line.match(/^\s+at (?:(.+) \()?(.+):(\d+):(\d+)\)?$/);
        if (!match) {
            console.warn(`Invalid stack frame: ${line}`);
            return result;
        }
        const [, functionName, fileName, lineNumber, columnNumber] = match;
        if (!fileName || !lineNumber || !columnNumber) {
            console.warn(
                `Failed to parse location details from stack frame: ${line}`,
            );
        }
        result.push({
            fileName,
            functionName,
            lineNumber: lineNumber ? parseInt(lineNumber) : undefined,
            columnNumber: columnNumber ? parseInt(columnNumber) : undefined,
        });
        return result;
    }, []);
    return frames;
};

/**
 * A mock of the regular robot tunnel for the simulator robots
 */
export class VirtualBotTunnel extends BotTunnel {
    connected = true;

    headingRadians = 0;
    position = ZERO_POSITION;

    static messages: {
        ts: Date;
        message: SimulatorUpdateMessage;
    }[] = [];

    constructor(private robotId: string) {
        super(null, (_) => {});

        // pulling initial heading and position from robot, then only depending on messages sent to the 'robot' to update the position and heading
        const robot = virtualRobots.get(robotId)!;
        this.headingRadians = robot.headingRadians;
        this.position = robot.position;

        this.emitter = new EventEmitter();
    }

    isActive(): boolean {
        return true;
    }

    getIdentifier(): string {
        return "Virtual Bot ID: " + this.robotId;
    }

    private emitActionComplete(packetId: string) {
        setTimeout(
            () =>
                this.emitter.emit("actionComplete", {
                    success: true,
                    packetId,
                }),
            750,
        ); // needs to match simulator.scss animation timeout
    }

    async send(packet: Packet): Promise<string> {
        const packetId = randomUUID();
        let stack: StackFrame[] = [];
        try {
            stack = getStack() ?? stack;
        } catch (e) {
            console.warn("Error getting stack trace", e);
        }

        return new Promise((res, rej) => {
            const removeListener = this.emitter.on("actionComplete", (args) => {
                if (args.packetId !== packetId) return;
                removeListener();
                if (args.success) res(args.packetId);
                else rej(args.reason);
            });

            // NOTE: need to ensure that all the packets which are used in the Robot class (src/server/robot/robot.ts) are also provided with a matching virtual implementation here
            switch (packet.type) {
                case PacketType.TURN_BY_ANGLE: {
                    this.headingRadians += packet.deltaHeadingRadians;
                    this.emitActionComplete(packetId);
                    break;
                }
                case PacketType.DRIVE_TILES: {
                    const distance = packet.tileDistance;
                    const deltaX = distance * Math.cos(this.headingRadians);
                    const deltaY = distance * Math.sin(this.headingRadians);

                    const newPosition = this.position.add(
                        new Position(deltaX, deltaY),
                    );
                    console.log(
                        `Robot ${this.robotId} moved to ${newPosition.x}, ${newPosition.y} from ${this.position.x}, ${this.position.y}`,
                    );
                    this.position = newPosition;

                    this.emitActionComplete(packetId);
                    break;
                }
                default:
                    console.warn(
                        `Unhandled packet type (${packet.type}) from ${this.robotId} - packetId: ${packetId}`,
                    );
                    this.emitActionComplete(packetId);
            }

            const message = new SimulatorUpdateMessage(
                this.robotId,
                {
                    position: {
                        x: this.position.x,
                        y: this.position.y,
                    },
                    headingRadians: this.headingRadians,
                },
                { ...packet, packetId },
                stack,
            );
            VirtualBotTunnel.messages.push({ ts: new Date(), message });
            socketManager.sendToAll(message);
        });
    }
}

/**
 * virtual robots that can be moved around
 */
export class VirtualRobot extends Robot {
    public getTunnel(): BotTunnel {
        return virtualBotTunnels.get(this.id)!;
    }
}

const virtualBotIds = Array(32)
    .fill(undefined)
    .map((_, i) => `robot-${(i + 1).toString()}`);

/**
 * a map of all the created virtual robots with ids, positions, and homes
 */
export const virtualRobots = new Map<string, VirtualRobot>(
    virtualBotIds.map((id, idx) => {
        const realRobotConfig = config[id];
        return [
            id,
            new VirtualRobot(
                id,
                new GridIndices(
                    realRobotConfig.homePosition.x,
                    realRobotConfig.homePosition.y,
                ),
                new GridIndices(
                    realRobotConfig.defaultPosition.x,
                    realRobotConfig.defaultPosition.y,
                ),
                getStartHeading(idx < 16 ? Side.WHITE : Side.BLACK),
                gridIndicesToPosition(new GridIndices(
                    realRobotConfig.homePosition.x,
                    realRobotConfig.homePosition.y,
                )),
            ),
        ] as const;
    }),
);

/** a map of all the current virtual robot tunnels */
const virtualBotTunnels = new Map<string, BotTunnel>(
    virtualBotIds.map((id) => [id, new VirtualBotTunnel(id)]),
);
