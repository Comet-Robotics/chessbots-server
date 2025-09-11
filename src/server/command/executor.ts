import type { Command } from "./command";

/**
 * Custom error class to indicate a conflict in requirements.
 */
class RequirementError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RequirementError";
    }
}

/**
 * The executor for commands. Handles requirements checking for commands
 * to ensure commands do not use the same requirement concurrently.
 */
export class CommandExecutor {
    constructor() {}

    private runningCommands: Command[] = [];

    private checkRequirements(command: Command) {
        for (const req of command.requirements) {
            for (const runningCmd of this.runningCommands) {
                console.log(
                    `Checking requirement ${req} against running command ${runningCmd}`,
                );
                if (runningCmd.requirements.has(req)) {
                    throw new RequirementError(
                        `Command already requires ${req}!`,
                    );
                }
            }
        }
    }

    /**
     * Executes a command after checking the requirements.
     * @param command - The command to execute.
     */
    public async execute(command: Command): Promise<void> {
        this.checkRequirements(command);
        this.runningCommands.push(command);
        return command.execute().finally(() => {
            const index = this.runningCommands.indexOf(command);
            if (index >= 0) {
                this.runningCommands.splice(index, 1);
            }
        });
    }

    public getRunningCommands(): ReadonlyArray<Command> {
        return this.runningCommands;
    }
}

export const executor = new CommandExecutor();
