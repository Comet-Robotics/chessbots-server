import { Dialog, DialogBody, DialogFooter } from "@blueprintjs/core";
import { Outlet } from "react-router-dom";
import { ChessboardWrapper } from "../chessboard/chessboard-wrapper";
import { PropsWithChildren, ReactNode } from "react";
import { ChessEngine } from "../../common/chess-engine";
import { Side } from "../../common/game-types";
import { Sidebar } from "./sidebar";
import { bgColor } from "../check-dark-mode";
import "../colors.css";

interface SetupBaseProps extends PropsWithChildren {
    actions?: ReactNode;
}

/**
 * Create the background chessboard and applies a dialog on top
 *
 * @param props - any dialogs that need to be shown on screen
 * @returns the background element with a dialog
 */
export function SetupBase(props: SetupBaseProps): JSX.Element {
    return (
        <>
            <div className="main-dialog">
                <Outlet />
                <ChessboardWrapper
                    chess={new ChessEngine()}
                    side={Side.WHITE}
                    onMove={() => {}}
                    rotation={0}
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
                    <div className={bgColor() + " " + "roundedBorder"}>
                    <DialogBody>{props.children}</DialogBody>
                        <DialogFooter minimal actions={props.actions} />
                    </div>
            </Dialog>
            </div>
            <Sidebar />
        </>
    );
}
