import { Dialog, DialogBody, DialogFooter } from "@blueprintjs/core";
import { Outlet } from "react-router-dom";
import { ChessboardWrapper } from "../chessboard/chessboard-wrapper";
import type { PropsWithChildren, ReactNode } from "react";
import { ChessEngine, WHITE } from "../../common/chess";
import { Sidebar } from "./sidebar";

interface SetupBaseProps {
    actions?: ReactNode;
}

/**
 * Create the background chessboard and applies a dialog on top
 *
 * @param props - any dialogs that need to be shown on screen
 */
export function SetupBase(props: PropsWithChildren<SetupBaseProps>) {
    return (
        <>
            <div className="main-dialog">
                <Outlet />
                <ChessboardWrapper
                    chess={new ChessEngine()}
                    side={WHITE}
                    onMove={() => {}}
                />
                <Dialog
                    style={{
                        backgroundColor: "transparent",
                        boxShadow: "none",
                    }}
                    isOpen
                    canEscapeKeyClose={false}
                    canOutsideClickClose={false}
                    usePortal={false}
                    enforceFocus={false}
                >
                    <div className="roundedBorder">
                        <DialogBody>{props.children}</DialogBody>
                        <DialogFooter minimal actions={props.actions} />
                    </div>
                </Dialog>
            </div>
            <Sidebar />
        </>
    );
}
