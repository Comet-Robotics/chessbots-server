import { robotManager } from "../robot/robot-manager";
import { MAX_RETRIES, MOVE_TIMEOUT } from "../env";
import { RobotId } from "../api/config";
import { gameManager } from "../main";

/**
 * An command which operates on one or more robots.
 */
export abstract class Command {
    /**
     * The set of objects that this command requires to execute. Used to place mutexes on
     * common resources to ensure they don't receive multiple inputs at once.
     */
    requirements: Set<RobotId> = new Set();

    /**
     * The depth of the Command in Comand execution tree.
     * One command may call another, or call mutiple commands
     */
    depth: number = 1;

    abstract execute(): Promise<void>;

    /**
     * Implicitly wraps a Command into a Sequential Command.
     * @param next - The command which is run next.
     */
    then(next: Command): SequentialCommandGroup {

    }

    alongside(next: Command): ParallelCommandGroup {

    }

    /**
     * Decorates the command with a "time point" - if the command finishes in less than the
     * given duration, it will wait until this number of seconds has elapsed before continuing.
     * @param seconds - The number of seconds that the command will execute for, at minimum.
     */
    withTimeout(seconds: number): Command;
}

/**
 * An interface for a command which can be reversed (undone).
 */
export interface Reversible<T extends Reversible<T>> {
    reverse(): T;
}

export class WaitCommand extends Command {
    constructor(public readonly durationSec: number) {
        super();
        //in case there is a long wait that isn't accounted for in the regular timeout
        this.depth = durationSec / MOVE_TIMEOUT;
    }
    public async execute(): Promise<void> {
        return new Promise((resolve) =>
            setTimeout(resolve, this.durationSec * 1000),
        );
    }
}

/**
 * Executes one or more commands in parallel.
 */
export class ParallelCommandGroup extends Command {
    constructor(public readonly commands: Command[]) {
        super();

        this.depth = commands.map((c => c.depth)).reduce((a, b) => (a > b ? a : b));
    }

    public async execute(): Promise<void> {
        const promises = this.commands.map(async (move) => {
            if (!gameManager.paused) {
                return move.execute();
            }
            
            else return new Promise<void>(() => {});
        })

        if (promises) {
            return timeoutRetry(
                Promise.all(promises),
                MAX_RETRIES,
                this.depth,
                0,
                "Parallel Group Error",
            ) as Promise<void>;
        }
    }

    public reverse(): ParallelCommandGroup {
        const commands: Command[] = [];
        for (const command of this.commands) {
            if (isReversable(command)) {
                commands.push(command.reverse());
            }
        }
        return new ParallelCommandGroup(commands);
    }
}

/**
 * Executes one or more commands in sequence, one after another.
 */
export class SequentialCommandGroup
    extends Command
    implements Reversible<SequentialCommandGroup>
{
    constructor(public readonly commands: Command[]) {
        super();
        let sum = 0;
        for (let x = 0; x < commands.length; x++) {
            sum += commands[x].depth;
        }
        this.depth = sum;
    }

    public async execute(): Promise<void> {
        let promise = Promise.resolve();

        for (const command of this.commands) {
            promise = promise
                .then(() => {
                    if (!gameManager.paused) return command.execute().catch();
                })
                .catch();
        }

        return timeoutRetry(
            promise,
            MAX_RETRIES,
            this.depth,
            0,
            "Sequential Group Error",
        ) as Promise<void>;
    }

    public reverse(): SequentialCommandGroup {
        const commands: Command[] = [];
        for (const command of this.commands) {
            if (isReversable(command)) {
                commands.push(command.reverse());
            }
        }
        return new SequentialCommandGroup(commands.reverse());
    }
}


/**
 * Represents a rotation.
 */
abstract class RotateCommand extends Command {
    constructor(
        robotId: RobotId,
        public headingRadians: number,
    ) {
        super();
    }
}

/**
 * Rotates a robot a relative amount.
 */
export class RelativeRotateCommand
    extends Command
    implements Reversible<RelativeRotateCommand>
{
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return this.commandIsCompleted ?
                Promise.resolve()
            :   (timeoutRetry(
                    robot.relativeRotate(this.headingRadians).then(() => {
                        this.commandIsCompleted = true;
                    }),
                    MAX_RETRIES,
                    this.depth,
                    0,
                    `Relative Rotate Command Error at Robot:${this.robotId}`,
                ) as Promise<void>);
    }

    public reverse(): RelativeRotateCommand {
        return new RelativeRotateCommand(this.robotId, -this.headingRadians);
    }
}

/**
 * Tell the robot to center
 */
export class CenterCommand
    extends Command
{
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return this.commandIsCompleted ?
                Promise.resolve()
            :   (timeoutRetry(
                    robot.sendCenterPacket().then(() => {
                        this.commandIsCompleted = true;
                    }),
                    MAX_RETRIES,
                    this.depth,
                    0,
                    `Center Command Error at Robot:${this.robotId}`,
                ) as Promise<void>);
    }
}

/**
 * Rotates a robot to a given heading.
 */
export class AbsoluteRotateCommand extends Command {
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return this.commandIsCompleted ?
                Promise.resolve()
            :   (timeoutRetry(
                    robot.absoluteRotate(this.headingRadians).then(() => {
                        this.commandIsCompleted = true;
                    }),
                    MAX_RETRIES,
                    this.depth,
                    0,
                    `Absolute Rotate Command Error at Robot:${this.robotId}`,
                ) as Promise<void>);
    }
}

/**
 * Resets a robot to its starting heading.
 */
export class RotateToStartCommand extends Command {
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        if (!robot) {
            return;
        }
        
        return this.commandIsCompleted ?
                Promise.resolve()
            :   (timeoutRetry(
                    robot.absoluteRotate(robot?.config.start_rot).then(() => {
                        this.commandIsCompleted = true;
                    }),
                    MAX_RETRIES,
                    this.depth,
                    0,
                    `Rotate to Start Command Error at Robot:${this.robotId}`,
                ) as Promise<void>);
    }
}

export class StopCommand extends Command {
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        return this.commandIsCompleted ?
                Promise.resolve()
            :   (timeoutRetry(
                    robot.sendDrivePacket(0).then(() => {
                        this.commandIsCompleted = true;
                    }),
                    MAX_RETRIES,
                    this.depth,
                    0,
                    `Stop Command Error at Robot:${this.robotId}`,
                ) as Promise<void>);
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
    extends Command
    implements Reversible<DriveCommand>
{
    constructor(
        robotId: RobotId,
        public tileDistance: number,
    ) {
        super();
    }

    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        const currentPosition = robot.position;
        const newPositionX = this.tileDistance * Math.cos(robot.headingRadians);
        const newPositionY = this.tileDistance * Math.sin(robot.headingRadians);
        robot.position = {
            x: newPositionX + currentPosition.x,
            y: newPositionY + currentPosition.y,
        };
        robotManager.updateRobot(
            this.robotId,
            gridPositionFromPosition(robot.position),
        );
        return this.commandIsCompleted ?
                Promise.resolve()
            :   (timeoutRetry(
                    robot.sendDrivePacket(this.tileDistance).then(() => {
                        this.commandIsCompleted = true;
                    }),
                    MAX_RETRIES,
                    this.depth,
                    0,
                    `Drive Command Error at Robot:${this.robotId}`,
                ) as Promise<void>);
    }

    public reverse(): DriveCommand {
        return new DriveCommand(this.robotId, -this.tileDistance);
    }
}

/**
 * Shifts a robot a relative amount.
 * The heading of the robot after the move is arbitrary.
 */
export class RelativeMoveCommand
    extends Command
    implements Reversible<RelativeMoveCommand>
{
    public async execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        robotManager.updateRobot(
            this.robotId,
            gridPositionFromPosition(positionAdd(robot.position, this.position)),
        );
        return this.commandIsCompleted ?
                Promise.resolve()
            :   (timeoutRetry(
                    robot.relativeMove(this.position).then(() => {
                        this.commandIsCompleted = true;
                    }),
                    MAX_RETRIES,
                    this.depth,
                    0,
                    `Relative Move Command Error at Robot:${this.robotId}`,
                ) as Promise<void>);
    }

    public reverse(): RelativeMoveCommand {
        return new RelativeMoveCommand(this.robotId, { x: -this.position.x, y: -this.position.y });
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
            gridPositionFromPosition(this.position),
        );
        return this.commandIsCompleted ?
                Promise.resolve()
            :   (timeoutRetry(
                    robot
                        .relativeMove(this.position.sub(robot.position))
                        .then(() => {
                            this.commandIsCompleted = true;
                        }),
                    MAX_RETRIES,
                    this.depth,
                    0,
                    `Absolute Move Command Error at Robot:${this.robotId}`,
                ) as Promise<void>);
    }
}

export function timeoutRetry(
    promise: Promise<unknown>,
    maxRetries: number,
    height: number,
    count: number,
    debugInfo?: string,
): typeof promise {
    const timeout = new Promise<void>((_, rej) => {
        //time for each move to execute plus time to handle errors
        setTimeout(
            () => {
                rej("Move Timeout");
            },
            height * MOVE_TIMEOUT * maxRetries * 1.1,
        );
    }).catch();
    return Promise.race([promise, timeout]).catch((reason) => {
        if (reason.indexOf("Move Timeout") >= 0) {
            if (count < MAX_RETRIES) {
                return timeoutRetry(
                    promise,
                    maxRetries,
                    height,
                    count + 1,
                    debugInfo,
                ).catch();
            } else {
                throw `${reason} failed at height: ${height.toString()} with error: ${debugInfo} \\`;
            }
        }
    });
}
