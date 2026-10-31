import { robotManager } from "../robot/robot-manager";
import { MAX_RETRIES, MOVE_TIMEOUT } from "../env";
import { RobotId } from "../api/config";
import { gameManager } from "../main";
import { gridPositionFromPosition, Position } from "../../common/units";
import { PacketType } from "../api/tunnel/packet";

/**
 * An command which operates on one or more robots.
 */
export abstract class Command {
    completed: boolean = false;

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

    execute(): Promise<void> {
        if (!this.completed && !gameManager.paused) {
            return this.inner_execute()
        } else {
            return Promise.resolve()
        }
    }

    abstract inner_execute(): Promise<void>;
    abstract reverse(): Command

    /**
     * Implicitly wraps a Command into a Sequential Command.
     * @param next - The command which is run next.
     */
    then(next: Command): SequentialCommandGroup {
        return new SequentialCommandGroup([this, next])
    }

    alongside(next: Command): ParallelCommandGroup {
        return new ParallelCommandGroup([this, next])
    }
}

export class NoopCommand extends Command {
    public inner_execute(): Promise<void> { return Promise.resolve() }
    public reverse(): Command { return this }
}

/**
 * Executes one or more commands in parallel.
 */
export class ParallelCommandGroup extends Command {
    constructor(public readonly commands: Command[]) {
        super();

        this.depth = commands.map((c => c.depth)).reduce((a, b) => (a > b ? a : b));
    }

    public async inner_execute(): Promise<void> {
        const promises = this.commands.map(async (move) => {
            return move.execute()
        })

        await Promise.all(promises)
            
        return
    }

    public reverse(): Command {
        return new ParallelCommandGroup(this.commands.map((c) => c.reverse()));
    }
}

/**
 * Executes one or more commands in sequence, one after another.
 */
export class SequentialCommandGroup extends Command {
    constructor(public readonly commands: Command[]) {
        super()

        this.depth = commands.reduce((acc, command) => { return acc + command.depth }, 0)
    }

    public async inner_execute(): Promise<void> {
        let promise = Promise.resolve();

        for (const command of this.commands) {
            await command.execute()
        }
    }

    public reverse(): Command {
        return new SequentialCommandGroup(this.commands.map((c) => c.reverse()).reverse());
    }
}

/**
 * Tell the robot to center
 */
export class CenterCommand extends Command {
    robotId: RobotId

    constructor(robotId: RobotId){
        super()

        this.robotId = robotId
    }

    public async inner_execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);
        
        robot.send({
            type: PacketType.CENTER_SEND
        })
    }

    reverse(): Command {
        return new NoopCommand()
    }
}

// export class AbsoluteRotateCommand extends Command {
//     public async execute(): Promise<void> {
//         const robot = robotManager.getRobot(this.robotId);
//         return this.completed ?
//                 Promise.resolve()
//             :   (timeoutRetry(
//                     robot.absoluteRotate(this.headingRadians).then(() => {
//                         this.completed = true;
//                     }),
//                     MAX_RETRIES,
//                     this.depth,
//                     0,
//                     `Absolute Rotate Command Error at Robot:${this.robotId}`,
//                 ) as Promise<void>);
//     }
// }

// /**
//  * Resets a robot to its starting heading.
//  */
// export class RotateToStartCommand extends Command {
//     public async execute(): Promise<void> {
//         const robot = robotManager.getRobot(this.robotId);
//         if (!robot) {
//             return;
//         }

//         return this.completed ?
//             Promise.resolve()
//             : (timeoutRetry(
//                 robot.absoluteRotate(robot?.config.start_rot).then(() => {
//                     this.completed = true;
//                 }),
//                 MAX_RETRIES,
//                 this.depth,
//                 0,
//                 `Rotate to Start Command Error at Robot:${this.robotId}`,
//             ) as Promise<void>);
//     }

//     reverse(): Command {
//         return new WaitCommand(this.robotId, 0)
//     }
// }

/**
 * Drives a robot for a distance equal to a number of tiles. Distance
 * may be negative, indicating the robot drives backwards.
 *
 * Does not modify robot's stored position, must be done on the
 * caller's side.
 */
// export class DriveCommand
//     extends Command {
//     constructor(
//         robotId: RobotId,
//         public tileDistance: number,
//     ) {
//         super(robotId);
//     }

//     public async execute(): Promise<void> {
//         const robot = robotManager.getRobot(this.robotId);
//         const currentPosition = robot.position;
//         const newPositionX = this.tileDistance * Math.cos(robot.headingRadians);
//         const newPositionY = this.tileDistance * Math.sin(robot.headingRadians);
//         robot.position = {
//             x: newPositionX + currentPosition.x,
//             y: newPositionY + currentPosition.y,
//         };

//         robotManager.updateRobot(
//             this.robotId,
//             gridPositionFromPosition(robot.position),
//         );
//         return this.completed ?
//             Promise.resolve()
//             : (timeoutRetry(
//                 robot.sendDrivePacket(this.tileDistance).then(() => {
//                     this.completed = true;
//                 }),
//                 MAX_RETRIES,
//                 this.depth,
//                 0,
//                 `Drive Command Error at Robot:${this.robotId}`,
//             ) as Promise<void>);
//     }

//     public reverse(): DriveCommand {
//         return new DriveCommand(this.robotId, -this.tileDistance);
//     }
// }

/**
 * Moves a robot to a global location. WARNING: Only moves in a straight line
 */

// Be careful when integrating with pathmat, it might assume
// absolute moves are relative to (0, 0), the starting position of the robot
export class AbsoluteMoveCommand extends Command {
    saved_position: Position | undefined
    saved_rotation: number | undefined

    position: Position
    rotation: number

    robotId: RobotId

    constructor(robotId: RobotId, position: Position, rotation: number) {
        super()

        this.robotId = robotId
        this.position = position
        this.rotation = rotation
    }

    public async inner_execute(): Promise<void> {
        const robot = robotManager.getRobot(this.robotId);

        this.saved_position = robot.position;
        this.saved_rotation = robot.heading

        await robot.send({
            type: PacketType.DRIVE_ABSOLUTE,
            x: this.position.x,
            y: this.position.y,
            rot: this.rotation
        })

        robot.position = gridPositionFromPosition(this.position)
    }
    
    reverse(): Command {
        if (!this.saved_position || !this.saved_rotation) {
            return new NoopCommand()
        }

        return new AbsoluteMoveCommand(this.robotId, this.saved_position, this.saved_rotation)
    }
}

// export function timeoutRetry<T>(
//     promise: Promise<T>,
//     maxRetries: number,
//     height: number,
//     count: number,
//     debugInfo?: string,
// ): Promise<T> {
//     const timeout = new Promise<void>((_, rej) => {
//         //time for each move to execute plus time to handle errors
//         setTimeout(
//             () => {
//                 rej("Move Timeout");
//             },
//             height * MOVE_TIMEOUT * maxRetries * 1.1,
//         );
//     }).catch();

//     return Promise.race([promise, timeout]).catch((reason) => {
//         if (reason.indexOf("Move Timeout") >= 0) {
//             if (count < MAX_RETRIES) {
//                 return timeoutRetry(
//                     promise,
//                     maxRetries,
//                     height,
//                     count + 1,
//                     debugInfo,
//                 ).catch();
//             } else {
//                 throw `${reason} failed at height: ${height.toString()} with error: ${debugInfo} \\`;
//             }
//         }
//     });
// }
