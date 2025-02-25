import EventEmitter from "node:events";
import { BotTunnel } from "./api/tcp-interface";
import { Robot } from "./robot/robot";
import config from "./api/bot-server-config.json";
import { Packet } from "./utils/tcp-packet";
import { Position, ZERO_POSITION } from "./robot/position";
import path from "path";
import {
    SimulatorUpdateMessage,
    StackFrame,
} from "../common/message/simulator-message";
import { socketManager } from "./api/managers";
import { randomUUID } from "node:crypto";

const srcDir = path.resolve(__dirname, "../");

/**
 * get the current error stack
 * @param justMyCode - restricts the scope of the stack to just the code in the chessBot project. ex: if there is an error thrown in a file in the node_modules folder, this will not be included in the stack.
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
        const chessBotCodeEndFrame = cleanedStack.findIndex(
            (frame) => !frame.fileName.startsWith(srcDir),
        );
        if (chessBotCodeEndFrame !== -1) {
            cleanedStack.splice(chessBotCodeEndFrame);
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
    const frames = lines.slice(1).map((line) => {
        const match = line.match(/^\s+at (?:(.+) \()?(.+):(\d+):(\d+)\)?$/);
        if (!match) {
            throw new Error(`Invalid stack frame: ${line}`);
        }
        const [, functionName, fileName, lineNumber, columnNumber] = match;
        return {
            fileName,
            functionName,
            lineNumber: parseInt(lineNumber),
            columnNumber: parseInt(columnNumber),
        };
    });
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
        this.emitter.emit("actionComplete", { success: true, packetId });
    }

    async send(packet: Packet): Promise<string> {
        const packetId = randomUUID();
        const stack = getStack();

        return new Promise((res, rej) => {
            const onActionComplete = (args) => {
                if (args.packetId !== packetId) return;
                this.emitter.off("actionComplete", onActionComplete);
                if (args.success) res(args.packetId);
                else rej(args.reason);
            }

            this.emitter.on("actionComplete", onActionComplete);

            // NOTE: need to ensure that all the packets which are used in the Robot class (src/server/robot/robot.ts) are also provided with a matching virtual implementation here
        switch (packet.type) {
            case "TURN_BY_ANGLE":
                this.headingRadians += packet.deltaHeadingRadians;
                this.emitActionComplete(packetId);
                break;
            case "DRIVE_TILES": {
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
                throw new Error(
                    "Unhandled packet type for virtual bot: " + packet.type,
                );
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
            packet,
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
    .map((_, i) => `virtual-robot-${(i + 1).toString()}`);

/**
 * a map of all the created virtual robots with ids, positions, and homes
 */
export const virtualRobots = new Map<string, VirtualRobot>(
    virtualBotIds.map((id) => {
        const realRobotConfig = config[id.replace("virtual-", "")];
        return [
            id,
            new VirtualRobot(
                id,
                realRobotConfig.homePosition,
                undefined,
                new Position(
                    realRobotConfig.defaultPosition.x + 0.25,
                    realRobotConfig.defaultPosition.y + 0.25,
                ),
            ),
        ] as const;
    }),
);

/** a map of all the current virtual robot tunnels */
const virtualBotTunnels = new Map<string, BotTunnel>(
    virtualBotIds.map((id) => [id, new VirtualBotTunnel(id)]),
);
