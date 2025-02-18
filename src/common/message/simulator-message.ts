import { Message, MessageType } from "./message";
import type { Packet } from "../../server/utils/tcp-packet";
export type SimulatedRobotLocation = {
    position: { x: number; y: number };
    headingRadians: number;
};

export type StackFrame = {
    fileName: string;
    functionName?: string;
    lineNumber: number;
    columnNumber: number;
};

/**
 * An update message for the simulator with the robot id, rotation and position
 */
export class SimulatorUpdateMessage extends Message {
    protected type = MessageType.SIMULATOR_UPDATE;

    constructor(
        public readonly robotId: string,
        public readonly location: SimulatedRobotLocation,
        public readonly packet: Packet,
        public readonly stackTrace?: StackFrame[],
    ) {
        super();
    }

    protected toObj(): object {
        return {
            ...super.toObj(),
            robotId: this.robotId,
            location: {
                position: {
                    x: this.location.position.x,
                    y: this.location.position.y,
                },
                headingRadians: this.location.headingRadians,
            },
            packet: this.packet,
            stackTrace: this.stackTrace,
        };
    }
}
