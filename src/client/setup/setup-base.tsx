import { Dialog, DialogBody, DialogFooter } from "@blueprintjs/core";
import { Outlet } from "react-router-dom";
import { ChessboardWrapper } from "../chessboard/chessboard-wrapper";
import { PropsWithChildren, ReactNode } from "react";
import { Chess, DEFAULT_POSITION, Square } from "chess.js";
import { ChessEngine } from "../../common/chess-engine";
import { Side } from "../../common/types";

interface SetupBaseProps extends PropsWithChildren {
    actions?: ReactNode;
}

export function SetupBase(props: SetupBaseProps): JSX.Element {
    return (
        <>
            <Outlet />
            <ChessboardWrapper
                chess={new ChessEngine()}
                side={Side.WHITE}
                onMove={() => {}}
            />
            <Dialog
                isOpen
                canEscapeKeyClose={false}
                canOutsideClickClose={false}
            >
                <DialogBody>{props.children}</DialogBody>
                <DialogFooter minimal actions={props.actions} />
            </Dialog>
        </>
    );
}
