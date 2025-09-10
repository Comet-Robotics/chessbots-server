import { EventEmitter } from "@posva/event-emitter";
import { Robot } from "./robot/robot";
import config from "./api/bot-server-config.json";
import type { Packet, PacketWithId } from "./utils/tcp-packet";
import { PacketType } from "./utils/tcp-packet";
import { Position } from "./robot/position";
import path from "path";
import type { StackFrame } from "../common/message/simulator-message";
import { SimulatorUpdateMessage } from "../common/message/simulator-message";
import { socketManager } from "./api/managers";
import { randomUUID } from "node:crypto";
import { GridIndices } from "./robot/grid-indices";
import { getStartHeading, Side } from "../common/game-types";
import { BotTunnel, type RobotEventEmitter } from "./api/bot-tunnel";

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
            // stack frame not in the format we expect
            return result;
        }
        const [, functionName, fileName, lineNumber, columnNumber] = match;
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
    emitter: RobotEventEmitter;

    static messages: {
        ts: Date;
        message: SimulatorUpdateMessage;
    }[] = [];

    constructor(
        private robotId: string,
        private headingRadians: number,
        private position: Position,
    ) {
        super();

        // pulls initial heading and position from robot, then only depending on messages sent to the 'robot' to update the position and heading

        this.emitter = new EventEmitter();
    }

    public updatePosition(newPosition: Position): void {
        this.position = newPosition;
    }

    isActive(): boolean {
        return true;
    }

    getIdentifier(): string {
        return "Virtual Bot ID: " + this.robotId;
    }

    private emitActionComplete(
        packetId: string,
        actionCompleteDelay: number = 750,
    ) {
        setTimeout(
            () =>
                this.emitter.emit("actionComplete", {
                    success: true,
                    packetId,
                }),
            actionCompleteDelay,
        ); // needs to match simulator.scss animation timeout
    }

    async processPacket(packet: PacketWithId) {
        const { packetId } = packet;

        // Parse packet based on type
        switch (packet.type) {
            // register new robot
            case "CLIENT_HELLO": {
                // await this.send(this.makeHello(packet.macAddress));
                this.connected = true;
                break;
            }
            // respond to pings
            case "PING_SEND": {
                await this.send({ type: PacketType.PING_RESPONSE });
                break;
            }
            // emit a action complete for further processing
            case PacketType.ACTION_SUCCESS: {
                this.emitter.emit("actionComplete", {
                    success: true,
                    packetId,
                });
                break;
            }
            // emit a action fail for further processing
            case PacketType.ACTION_FAIL: {
                this.emitter.emit("actionComplete", {
                    success: false,
                    reason: packet.reason,
                    packetId,
                });
                break;
            }
        }
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
    constructor(
        id: string,
        homeIndices: GridIndices,
        defaultIndices: GridIndices,
        headingRadians: number,
    ) {
        super(id, homeIndices, defaultIndices, headingRadians);
        this.tunnel = new VirtualBotTunnel(id, headingRadians, this.position);
    }

    public setTunnel(_: BotTunnel): void {}

    public updateTunnelPosition(newPosition: Position): void {
        if (this.tunnel instanceof VirtualBotTunnel) {
            this.tunnel.updatePosition(newPosition);
        }
    }
}

/**
 * a map of all the created virtual robots with ids, positions, and homes
 */
export const virtualRobots = createVirtualRobots();

function createVirtualRobots() {
    const virtualBotIds = Array(32)
        .fill(undefined)
        .map((_, i) => `robot-${(i + 1).toString()}`);

    return new Map<string, VirtualRobot>(
        virtualBotIds.map((id, idx) => {
            const realRobotConfig = config[id];
            return [
                id,
                new VirtualRobot(
                    id,
                    new GridIndices(
                        realRobotConfig.homeIndices.x,
                        realRobotConfig.homeIndices.y,
                    ),
                    new GridIndices(
                        realRobotConfig.defaultIndices.x,
                        realRobotConfig.defaultIndices.y,
                    ),
                    getStartHeading(idx < 16 ? Side.WHITE : Side.BLACK),
                ),
            ] as const;
        }),
    );
}
