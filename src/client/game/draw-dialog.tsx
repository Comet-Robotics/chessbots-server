import {
    Button,
    Dialog,
    DialogBody,
    NonIdealState,
    DialogFooter,
} from "@blueprintjs/core";
import { useState } from "react";
import { GameHoldReason, GameInterruptedReason, MessageSender, MessageType, type Message } from "../../common/message";



/**
 * allows the player to offer a draw to the other people
 * @param props - function for sending messages
 * @returns - draw dialog
 */
export function OfferDrawDialog(props: { sendMessage: MessageSender }) {
    const [isOpen, setIsOpen] = useState(true);
    const actions = (
        <>
            <Button
                text="Yes"
                rightIcon="arrow-up"
                intent="primary"
                onClick={() => {
                    props.sendMessage({
                        type: MessageType.GAME_HELD,
                        reason: GameHoldReason.DRAW_OFFERED,
                    });
                }}
            />
            <Button
                text="No"
                rightIcon="arrow-down"
                intent="primary"
                onClick={() => {
                    props.sendMessage({
                        type: MessageType.GAME_HELD,
                        reason: GameHoldReason.DRAW_DENIED,
                    });
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
                <NonIdealState>
                    <h4>Offer draw?</h4>
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
export function AcceptDrawDialog(props: { sendMessage: MessageSender }) {
    const [isOpen, setIsOpen] = useState(true);
    const actions = (
        <>
            <Button
                text="Yes"
                rightIcon="arrow-up"
                intent="primary"
                onClick={() => {
                    props.sendMessage({
                        type: MessageType.GAME_INTERRUPTED,
                        reason: GameInterruptedReason.DRAW_ACCEPTED,
                    });
                }}
            />
            <Button
                text="No"
                rightIcon="arrow-down"
                intent="primary"
                onClick={() => {
                    props.sendMessage({
                        type: MessageType.GAME_HELD,
                        reason: GameHoldReason.DRAW_DENIED,
                    });
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
