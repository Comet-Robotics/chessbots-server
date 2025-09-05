import {
    Button,
    Dialog,
    DialogBody,
    NonIdealState,
    DialogFooter,
} from "@blueprintjs/core";
import { useState } from "react";
import type { SendMessage } from "../../common/message/message";
import {
    GameHoldMessage,
    GameInterruptedMessage,
} from "../../common/message/game-message";
import {
    GameHoldReason,
    GameInterruptedReason,
} from "../../common/game-end-reasons";
import { bgColor, buttonColor, textColor } from "../check-dark-mode";
import "../colors.css";

interface DrawDialogProps {
    sendMessage: SendMessage;
}

/**
 * allows the player to offer a draw to the other people
 * @param props - function for sending messages
 * @returns - draw dialog
 */
export function OfferDrawDialog(props: DrawDialogProps) {
    const [isOpen, setIsOpen] = useState(true);
    const actions = (
        <>
            <Button
                text="Yes"
                rightIcon="arrow-up"
                intent="primary"
                className={buttonColor()}
                onClick={() => {
                    props.sendMessage(
                        new GameHoldMessage(GameHoldReason.DRAW_OFFERED),
                    );
                }}
            />
            <Button
                text="No"
                rightIcon="arrow-down"
                intent="primary"
                className={buttonColor()}
                onClick={() => {
                    props.sendMessage(
                        new GameHoldMessage(GameHoldReason.DRAW_DENIED),
                    );
                }}
            />
        </>
    );
    return (
        <Dialog
            className={bgColor()}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            canOutsideClickClose={false}
            canEscapeKeyClose={false}
        >
            <DialogBody>
                <NonIdealState>
                    <h4 className={textColor()}>Offer draw?</h4>
                </NonIdealState>
            </DialogBody>
            <DialogFooter minimal actions={actions} />
        </Dialog>
    );
}

/**
 * Allow a player to accept another player's draw request
 * @param props - function for sending messages
 * @returns - draw accept dialog
 */
export function AcceptDrawDialog(props: DrawDialogProps) {
    const [isOpen, setIsOpen] = useState(true);
    const actions = (
        <>
            <Button
                text="Yes"
                rightIcon="arrow-up"
                intent="primary"
                className={buttonColor()}
                onClick={() => {
                    props.sendMessage(
                        new GameInterruptedMessage(
                            GameInterruptedReason.DRAW_ACCEPTED,
                        ),
                    );
                }}
            />
            <Button
                text="No"
                rightIcon="arrow-down"
                intent="primary"
                className={buttonColor()}
                onClick={() => {
                    props.sendMessage(
                        new GameHoldMessage(GameHoldReason.DRAW_DENIED),
                    );
                }}
            />
        </>
    );
    return (
        <Dialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            canOutsideClickClose={false}
            canEscapeKeyClose={false}
        >
            <DialogBody>
                <NonIdealState title={"Accept draw?"} />
            </DialogBody>
            <DialogFooter minimal actions={actions} />
        </Dialog>
    );
}
