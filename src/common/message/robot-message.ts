import { Message, MessageType } from "./message";

/**
 * send a robot message
 */
abstract class RobotMessage extends Message {
    constructor(public readonly id: string) {
        super();
    }

    protected toObj(): object {
        return {
            ...super.toObj(),
            id: this.id,
        };
    }
}

/**
 * A message to set a variable on the robot
 */
export class SetRobotVariableMessage extends RobotMessage {
    constructor(
        id: string,
        public readonly variableName: string,
        public readonly variableValue: number,
    ) {
        super(id);
    }

    protected type = MessageType.SET_ROBOT_VARIABLE;

    protected toObj(): object {
        return {
            ...super.toObj(),
            variableName: this.variableName,
            variableValue: this.variableValue,
        };
    }
}

/**
 * A message to drive the robot based on left and right motor power
 * @returns an object with the id, left, right motor power
 */
export class DriveRobotMessage extends RobotMessage {
    constructor(
        id: string,
        public readonly leftPower: number,
        public readonly rightPower: number,
    ) {
        super(id);
    }

    protected type = MessageType.DRIVE_ROBOT;

    protected toObj(): object {
        return {
            ...super.toObj(),
            leftPower: this.leftPower,
            rightPower: this.rightPower,
        };
    }
}

/**
 * An abstract message used to stop a robot.
 * This message looks to the server like a DriveRobotMessage with power set to 0.
 */
export class StopRobotMessage extends DriveRobotMessage {
    constructor(public readonly id: string) {
        super(id, 0, 0);
    }
}
