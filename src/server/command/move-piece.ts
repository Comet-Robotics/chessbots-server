import { type Robot } from "../robot/robot";
import type { Command, RobotCommand, Reversible } from "./command";
import { ParallelCommandGroup, SequentialCommandGroup } from "./command";
import { CenterCommand } from "./move-command";

export type ReversibleRobotCommand = RobotCommand &
    Reversible<ReversibleRobotCommand>;

/**
 * Executes a set of setupMoves in parallel, followed by a mainMove.
 * The setupMoves are automatically undone afterwards.
 */
export class MovePiece extends SequentialCommandGroup {
    constructor(
        public setupMoves: SequentialCommandGroup[],
        public mainMove: Command,
        public noReverse: boolean = false,
    ) {
        super([
            new ParallelCommandGroup(setupMoves),
            mainMove,
            new ParallelCommandGroup(
                setupMoves
                    .map(
                        (command) => (!noReverse ? command.reverse() : command),
                        // .then(new RotateToStartCommand(command.robotId)), // TODO have rotatetostart at end of pathmat
                    )
                    .reverse(),
            ),

            new ParallelCommandGroup(
                setupMoves.map(
                    (command) =>
                        new CenterCommand(
                            ([...command.requirements][0] as Robot).id,
                        ),
                ),
            ),
        ]);
    }
}
