import type { Reversible } from "./command.js";
import { RobotCommand } from "./command.js";
import { Position } from "../robot/position.js";
import { GridIndices } from "../robot/grid-indices.js";
import { robotManager } from "../robot/robot-manager.js";

/**
 * Represents a rotation.
 */
export abstract class RotateCommand extends RobotCommand {
    constructor(
        robotId: string,
        public headingRadians: number,
    ) {
        super(robotId);
    }
}

/**
 * Rotates a robot a relative amount.
 */
export class RelativeRotateCommand
    extends RotateCommand
    implements Reversible<RelativeRotateCommand>
{
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return robot.relativeRotate(this.headingRadians);
    }

    public reverse(): RelativeRotateCommand {
        return new RelativeRotateCommand(this.robotId, -this.headingRadians);
    }
}

/**
 * Rotates a robot to a given heading.
 */
export class AbsoluteRotateCommand extends RotateCommand {
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return robot.absoluteRotate(this.headingRadians);
    }
}

/**
 * Rotates a robot to a given heading. Implements Reversible through a
 * heading supplier to return to the previous heading.
 */
export class ReversibleAbsoluteRotateCommand
    extends RobotCommand
    implements Reversible<ReversibleAbsoluteRotateCommand>
{
    private previousHeadingRadians: number | undefined;

    constructor(
        robotId: string,
        protected headingSupplier: () => number,
    ) {
        super(robotId);
    }

    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        this.previousHeadingRadians = robot.headingRadians;
        return robot.absoluteRotate(this.headingSupplier());
    }

    public reverse(): ReversibleAbsoluteRotateCommand {
        return new ReversibleAbsoluteRotateCommand(
            this.robotId,
            (() => this.previousHeadingRadians!).bind(this),
        );
    }
}

/**
 * Resets a robot to its starting heading.
 */
export class RotateToStartCommand extends RobotCommand {
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return robot.absoluteRotate(robot.startHeadingRadians);
    }
}

export class DriveCubicSplineCommand extends RobotCommand {
    constructor(
        robotId: string,
        public startPosition: { x: number; y: number },
        public endPosition: { x: number; y: number },
        public controlPositionA: { x: number; y: number },
        public controlPositionB: { x: number; y: number },
        public timeDeltaMs: number,
    ) {
        super(robotId);
    }

    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return robot.sendDriveCubicPacket(
            this.startPosition,
            this.endPosition,
            this.controlPositionA,
            this.controlPositionB,
            this.timeDeltaMs,
        );
    }
}

export class SpinRadiansCommand extends RobotCommand {
    constructor(
        robotId: string,
        public radians: number,
        public timeDeltaMs: number,
    ) {
        super(robotId);
    }
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return robot.sendSpinPacket(this.radians, this.timeDeltaMs);
    }
}

export class DriveQuadraticSplineCommand extends RobotCommand {
    constructor(
        robotId: string,
        public startPosition: { x: number; y: number },
        public endPosition: { x: number; y: number },
        public controlPosition: { x: number; y: number },
        public timeDeltaMs: number,
    ) {
        super(robotId);
    }
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return robot.sendDriveQuadraticPacket(
            this.startPosition,
            this.endPosition,
            this.controlPosition,
            this.timeDeltaMs,
        );
    }
}

export class StopCommand extends RobotCommand {
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return robot.sendDrivePacket(0);
    }
}

/**
 * Drives a robot for a distance equal to a number of tiles. Distance
 * may be negative, indicating the robot drives backwards.
 *
 * Does not modify robot's stored position, must be done on the
 * caller's side.
 */
export class DriveCommand
    extends RobotCommand
    implements Reversible<DriveCommand>
{
    constructor(
        robotId: string,
        public tileDistance: number,
    ) {
        super(robotId);
    }

    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        const currentPosition = robot.position;
        const newPositionX = this.tileDistance * Math.cos(robot.headingRadians);
        const newPositionY = this.tileDistance * Math.sin(robot.headingRadians);
        robot.position = new Position(
            newPositionX + currentPosition.x,
            newPositionY + currentPosition.y,
        );
        robotManager.updateRobot(
            this.robotId,
            GridIndices.fromPosition(robot.position),
        );
        return robot.sendDrivePacket(this.tileDistance);
    }

    public reverse(): DriveCommand {
        return new DriveCommand(this.robotId, -this.tileDistance);
    }
}

/**
 * Represents a robot translation in x and y.
 *
 * Note this may involve the robot turning first.
 * The orientation after the move is unspecified.
 */
export abstract class MoveCommand extends RobotCommand {
    constructor(
        robotId: string,
        protected position: Position,
    ) {
        super(robotId);
    }
}

/**
 * Shifts a robot a relative amount.
 * The heading of the robot after the move is arbitrary.
 */
export class RelativeMoveCommand
    extends MoveCommand
    implements Reversible<RelativeMoveCommand>
{
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        robotManager.updateRobot(
            this.robotId,
            GridIndices.fromPosition(robot.position.add(this.position)),
        );
        return robot.relativeMove(this.position);
    }

    public reverse(): RelativeMoveCommand {
        return new RelativeMoveCommand(this.robotId, this.position.neg());
    }
}

/**
 * Moves a robot to a global location. WARNING: Only moves in a straight line
 */
export class AbsoluteMoveCommand extends MoveCommand {
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        robotManager.updateRobot(
            this.robotId,
            GridIndices.fromPosition(this.position),
        );
        return robot.relativeMove(this.position.sub(robot.position));
    }
}

export class DriveTicksCommand
    extends RobotCommand
    implements Reversible<DriveTicksCommand>
{
    constructor(
        robotId: string,
        public ticksDistance: number,
    ) {
        super(robotId);
    }

    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return robot.sendDriveTicksPacket(this.ticksDistance);
    }

    public reverse(): DriveTicksCommand {
        return new DriveTicksCommand(this.robotId, -this.ticksDistance);
    }
}

/**
 * Moves a robot to a global location. Implements Reversible through a
 * position supplier to return to the previous position.
 */
export class ReversibleAbsoluteMoveCommand
    extends RobotCommand
    implements Reversible<ReversibleAbsoluteMoveCommand>
{
    private previousPosition: Position | undefined;

    constructor(
        robotId: string,
        protected positionSupplier: () => Position,
    ) {
        super(robotId);
    }

    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        this.previousPosition = robot.position;
        return robot.relativeMove(this.positionSupplier().sub(robot.position));
    }

    public reverse(): ReversibleAbsoluteMoveCommand {
        return new ReversibleAbsoluteMoveCommand(
            this.robotId,
            (() => this.previousPosition!).bind(this),
        );
    }
}
