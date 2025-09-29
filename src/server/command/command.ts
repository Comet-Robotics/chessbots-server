import { gamePaused } from "../api/managers";
import { robotManager } from "../robot/robot-manager";

/**
 * An command which operates on one or more robots.
 */
export interface Command {
    /**
     * The set of objects that this command requires to execute. Used to place mutexes on
     * common resources to ensure they don't receive multiple inputs at once.
     */
    requirements: Set<object>;

    /**
     * Executes the command.
     */
    execute(): Promise<void>;

    /**
     * Implicitly wraps a Command into a Sequential Command.
     * @param next - The command which is run next.
     */
    then(next: Command): SequentialCommandGroup;

    /**
     * Decorates the command with a "time point" - if the command finishes in less than the
     * given duration, it will wait until this number of seconds has elapsed before continuing.
     * @param seconds - The number of seconds that the command will execute for, at minimum.
     */
    withTimePoint(seconds: number): Command;
}

/**
 * An interface for a command which can be reversed (undone).
 */
export interface Reversible<T extends Reversible<T>> {
    reverse(): T;
}

/**
 * A command base class.
 * Used to circumvent TypeScript abstract/interface weirdness by providing a version of Command
 * which can be extended with attributes and constructors.
 */
export abstract class CommandBase implements Command {
    protected _requirements: Set<object> = new Set();

    public abstract execute(): Promise<void>;

    public then(next: Command): SequentialCommandGroup {
        return new SequentialCommandGroup([this, next]);
    }

    public withTimePoint(seconds: number): Command {
        return new ParallelCommandGroup([this, new WaitCommand(seconds)]);
    }

    public get requirements(): Set<object> {
        return this._requirements;
    }

    /**
     * A utility method for adding multiple requirements at once.
     */
    protected addRequirements(reqs: object[]) {
        reqs.forEach((req) => this._requirements.add(req));
    }
}

/**
 * A command which operates on an individual Robot.
 * Note this class redirects the execute implementation to executeRobot.
 */
export abstract class RobotCommand extends CommandBase {
    constructor(public readonly robotId: string) {
        super();
        // TO DISCUSS: idk if its possible for a robot object to change between adding it as a requrement and executing the command but if it is, adding the robot object as a requirement semi defeats the purpose of using robot ids everywhere
        const robot = robotManager.getRobot(robotId);
        this.addRequirements([robot]);
    }
}

/**
 * A command that waits for a given number of seconds.
 */
export class WaitCommand extends CommandBase {
    constructor(public readonly durationSec: number) {
        super();
    }
    public async execute(): Promise<void> {
        return new Promise((resolve) =>
            setTimeout(resolve, this.durationSec * 1000),
        );
    }
}

/**
 * A type of command which groups other commands and runs them together.
 */
export abstract class CommandGroup extends CommandBase {
    constructor(public readonly commands: Command[]) {
        super();
        this.addRequirements(commands.map((c) => [...c.requirements]).flat());
    }
    public abstract reverse();
}
function isReversable(obj): obj is Reversible<typeof obj> {
    return typeof obj.reverse() === "function";
}

/**
 * Executes one or more commands in parallel.
 */
export class ParallelCommandGroup extends CommandGroup {
    public async execute(): Promise<void> {
        const promises = this.commands.map((move) => {
            if (!gamePaused) return move.execute();
        });
        return Promise.all(promises).then(null);
    }
    public async reverse(): Promise<void> {
        const promises = this.commands.map((move) => {
            if (isReversable(move)) {
                move.reverse();
            }
        });
        return Promise.all(promises).then(null);
    }
}

/**
 * Executes one or more commands in sequence, one after another.
 */
export class SequentialCommandGroup extends CommandGroup {
    public async execute(): Promise<void> {
        let promise = Promise.resolve();
        for (const command of this.commands) {
            promise = promise.then(() => {
                if (!gamePaused) return command.execute();
            });
        }
        return promise;
    }
    public async reverse(): Promise<void> {
        let promise = Promise.resolve();
        for (const command of this.commands) {
            if (isReversable(command)) {
                promise = promise.then(() => command.reverse());
            }
        }
        return promise;
    }
}
