import { Dialog, DialogBody, NonIdealState } from "@blueprintjs/core";
import { useState } from "react";
import { bgColor, textColor } from "../check-dark-mode";

interface DrawDialogProps {
    dialogText: string;
}

/**
 * Shows a paused dialog that cannot be closed
 * @param props - dialog text
 * @returns - draw dialog
 */
export function PauseDialog(props: DrawDialogProps) {
    const [isOpen, setIsOpen] = useState(true);
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
                    <h4 className={textColor()}>{props.dialogText || "Game Paused"}</h4>
                </NonIdealState>
            </DialogBody>
        </Dialog>
    );
}