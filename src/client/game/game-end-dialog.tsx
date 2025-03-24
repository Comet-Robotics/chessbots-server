import {
    Button,
    Dialog,
    DialogBody,
    DialogFooter,
    Icon,
    NonIdealState,
    NonIdealStateIconSize,
} from "@blueprintjs/core";
import { useNavigate } from "react-router-dom";
import {
    GameEndReason,
    GameFinishedReason,
    GameInterruptedReason,
} from "../../common/game-end-reasons";
import { useState } from "react";
import { Side } from "../../common/game-types";

interface GameEndDialogProps {
    reason: GameEndReason;
    side: Side;
}
/**
 * creates the game ending dialog with a continue button
 *
 * @param props - the game end reason and side
 * @returns a dialog box that can only be closed by clicking the button
 */
export function GameEndDialog(props: GameEndDialogProps) {
    const [isOpen, setIsOpen] = useState(true);
    const navigate = useNavigate();

    /** continue button */
    const actions = (
        <Button
            text="Continue"
            rightIcon="arrow-right"
            intent="primary"
            onClick={() => {
                navigate("/home");
            }}
        />
    );

    // return the dialog with the button and game over reason
    return (
        <Dialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            canOutsideClickClose={false}
            canEscapeKeyClose={false}
        >
            <DialogBody>
                <NonIdealState
                    title={gameOverMessage(props.reason)}
                    icon={gameOverIcon(props.reason, props.side)}
                    iconMuted={false}
                />
            </DialogBody>
            <DialogFooter minimal actions={actions} />
        </Dialog>
    );
}

/**
 * returns the appropriate game over icon based on the reason and side
 *
 * @param reason - the reason the game ended
 * @param side - the current side
 * @returns game over icon
 */
function gameOverIcon(reason: GameEndReason, side: Side) {
    // check which side won
    const whiteWon =
        reason === GameFinishedReason.BLACK_CHECKMATED ||
        reason === GameInterruptedReason.BLACK_RESIGNED ||
        reason === GameFinishedReason.PUZZLE_SOLVED;
    const blackWon =
        reason === GameFinishedReason.WHITE_CHECKMATED ||
        reason === GameInterruptedReason.WHITE_RESIGNED ||
        reason === GameFinishedReason.PUZZLE_SOLVED;

    // checks which side is asking and assigns win/lost accordingly
    const won = side === Side.WHITE ? whiteWon : blackWon;
    const lost = side === Side.WHITE ? blackWon : whiteWon;
    // const draw = !blackWon && !whiteWon;

    // return the correct icon and intent
    if (won) {
        return (
            <Icon
                icon="tick"
                intent="success"
                size={NonIdealStateIconSize.STANDARD}
            />
        );
    } else if (lost) {
        return (
            <Icon
                icon="cross"
                intent="danger"
                size={NonIdealStateIconSize.STANDARD}
            />
        );
    }
    // draw
    return (
        <Icon
            icon="ban-circle"
            intent="warning"
            size={NonIdealStateIconSize.STANDARD}
        />
    );
}

/**
 * returns the game over reason message string
 *
 * @param reason - the game end reason
 * @returns the game end message string
 */
function gameOverMessage(reason: GameEndReason) {
    switch (reason) {
        case GameFinishedReason.WHITE_CHECKMATED:
            return "Checkmate - Black Wins";
        case GameFinishedReason.BLACK_CHECKMATED:
            return "Checkmate - White Wins";
        case GameFinishedReason.STALEMATE:
            return "Draw - Stalemate";
        case GameFinishedReason.PUZZLE_SOLVED:
            return "Puzzle Solved";
        case GameFinishedReason.THREEFOLD_REPETITION:
            return "Draw - Threefold Repetition";
        case GameFinishedReason.INSUFFICIENT_MATERIAL:
            return "Draw By Insufficient Material";
        case GameInterruptedReason.DRAW_ACCEPTED:
            return "Draw by Mutual Agreement";
        case GameInterruptedReason.WHITE_RESIGNED:
            return "White Resigned - Black Wins";
        case GameInterruptedReason.BLACK_RESIGNED:
            return "Black Resigned - White Wins";
        case GameInterruptedReason.ABORTED:
            return "Game Aborted";
    }
}
