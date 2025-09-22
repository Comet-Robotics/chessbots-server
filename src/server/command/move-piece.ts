import type { Command, RobotCommand, Reversible } from "./command.js";
import { SequentialCommandGroup, ParallelCommandGroup } from "./command.js";

export type ReversibleRobotCommand = RobotCommand &
    Reversible<ReversibleRobotCommand>;

/**
 * Executes a set of setupMoves in parallel, followed by a mainMove.
 * The setupMoves are automatically undone afterwards.
 */
export class MovePiece extends SequentialCommandGroup {
    constructor(
        public setupMoves: ReversibleRobotCommand[],
        public mainMove: Command,
    ) {
        super([
            new ParallelCommandGroup(setupMoves),
            mainMove,
            new ParallelCommandGroup(
                setupMoves
                    .map(
                        (command) => command.reverse(),
                        // .then(new RotateToStartCommand(command.robotId)), // TODO have rotatetostart at end of pathmat
                    )
                    .reverse(),
            ),
        ]);
    }
}
