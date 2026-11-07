import {
    Button,
    H3,
    NonIdealState,
    Spinner,
} from "@blueprintjs/core";
import { SetupBase } from "./setup-base";
import type { Dispatch, JSX } from "react";
import { useState } from "react";
import { SetupGame } from "./setup-game";
import { Navigate, useNavigate } from "react-router-dom";
import { get, useEffectQuery } from "../api";
import { ClientType, GameType } from "../../common/chess";
import { SelectPuzzle } from "../game/select-puzzle";

enum SetupType {
    COMPUTER = "computer",
    HUMAN = "human",
    PUZZLE = "puzzle",
    HEXAPAWN = "hexapawn",
}

// function playPuzzle() {
//     const promise = post("/start-puzzle-game", {
//         puzzle: String(selectedPuzzle)
//     });

//     promise.then(() => {
//         navigate("/game");
//     });
// }

/**
 * Lets the host choose a game type and includes the debug button
 *
 * @returns A setup base with the proper setup dialog
 */
export function Setup(): JSX.Element {
    const [setupType, setSetupType] = useState<SetupType | undefined>();
    const { isPending, data } = useEffectQuery("client-information", () =>
        get("/client-information"),
    );

    if (isPending) {
        return (
            <SetupBase>
                <NonIdealState
                    icon={<Spinner intent="primary" />}
                    title="Loading..."
                />
            </SetupBase>
        );
    }

    //if the client is a host, let them choose a game type
    if (data.clientType === ClientType.HOST) {
        return (
            <SetupBase>
                {setupType === SetupType.MAIN ?
                    <SetupMain onPageChange={setSetupType} />
                :   null}
                {(
                    setupType === SetupType.COMPUTER ||
                    setupType === SetupType.HUMAN ||
                    setupType === SetupType.HEXAPAWN
                ) ?
                    <SetupGame
                        gameType={
                            setupType === SetupType.COMPUTER ? GameType.COMPUTER
                            : setupType === SetupType.HUMAN ?
                                GameType.HUMAN
                            :   GameType.HEXAPAWN
                        }
                    />
                :   null}
                {setupType === SetupType.PUZZLE ?
                    <SelectPuzzle playPuzzle={() => {}}/>
                :   null}
            </SetupBase>
        );
    } else {
        return <Navigate to="/lobby" />;
    }
}

            <div className="main-dialog">
                <Outlet />
                <ChessboardWrapper
                    chess={new ChessEngine()}
                    side={WHITE}
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
                    <div className="roundedBorder">
                        <DialogBody>{props.children}</DialogBody>
                        <DialogFooter minimal actions={props.actions} />
                    </div>
                </Dialog>
            </div>
            <Sidebar />

/**
 * Triggers a state change in setup type
 */
interface SetupMainProps {
    onPageChange: Dispatch<SetupType>;
}

/**
 * The initial buttons for choosing game types
 *
 * @param props - the hook for changing setup type
 * @returns Setup buttons and debug button elements
 */
function SetupMain(props: SetupMainProps) {
    const navigate = useNavigate();

    const debugButton = (
        <Button
            variant="minimal"
            style={{ float: "right", color: "white" }}
            icon="cog"
            onClick={() => navigate("/debug")}
        />
    );

    /** computer, human, and puzzle buttons */
    const actions = (
        <>
            <Button
                large
                text="Play with the computer"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => props.onPageChange(SetupType.COMPUTER)}
            />
            <Button
                large
                text="Play Against A Human"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => props.onPageChange(SetupType.HUMAN)}
            />
            <Button
                large
                text="Puzzle"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => props.onPageChange(SetupType.PUZZLE)}
            />
            <Button
                large
                text="Hexapawn"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => props.onPageChange(SetupType.HEXAPAWN)}
            />

        </>
    );

    // return all the buttons and the title
    return (
        <>
            {debugButton}
            <div
                style={{
                    alignItems: "center",
                    display: "flex",
                    flex: "1 0 auto",
                    flexDirection: "column",
                    justifyContent: "space-around",
                }}
            >
                <H3>Welcome to Chess Bot!</H3>

                {actions}
            </div>
        </>
    );
}


