import {
    Button,
    Dialog,
    DialogBody,
    DialogFooter,
    NonIdealState,
} from "@blueprintjs/core";
import { useState } from "react";

interface DrawDialogProps {
    dialogText?: string;
}

/**
 * Shows a paused dialog that cannot be closed
 * @param props - dialog text
 * @returns - pause dialog
 */
export function PauseDialog(props: DrawDialogProps) {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <Dialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            canOutsideClickClose={false}
            canEscapeKeyClose={false}
        >
            <DialogBody>
                <NonIdealState>
                    <h4>
                        {props.dialogText || "Game Paused"}
                    </h4>
                </NonIdealState>
            </DialogBody>
        </Dialog>
    );
}

interface NotificationDialogProps {
    dialogText: string;
}

/**
 * Shows a closable notification dialog
 * @param props - dialog text
 * @returns - notification dialog
 */
export function NotificationDialog(props: NotificationDialogProps) {
    const [isOpen, setIsOpen] = useState(true);

    /** okay button */
    const actions = (
        <Button
            text="Continue"
            rightIcon="arrow-right"
            intent="primary"
            onClick={() => {
                setIsOpen(false);
            }}
        />
    );

    return (
        <Dialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            canOutsideClickClose={true}
            canEscapeKeyClose={true}
        >
            <DialogBody>
                <NonIdealState>
                    <h4>{props.dialogText}</h4>
                </NonIdealState>
            </DialogBody>
            <DialogFooter minimal actions={actions} />
        </Dialog>
    );
}
