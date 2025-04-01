import {
    Button,
    ButtonGroup,
    H3,
    NonIdealState,
    Spinner,
} from "@blueprintjs/core";
import { SetupBase } from "./setup-base";
import { Dispatch, useState } from "react";
import { SetupGame } from "./setup-game";
import { Navigate, useNavigate } from "react-router-dom";
import { ClientType, GameType } from "../../common/client-types";
import { get, useEffectQuery } from "../api";
import {
    allSettings,
    buttonColor,
    setUserSetting,
    getUserSetting,
    textColor,
} from "../check-dark-mode";
import "../colors.css";

enum SetupType {
    MAIN = "main",
    COMPUTER = "computer",
    HUMAN = "human",
    PUZZLE = "puzzle",
}

/**
 * Lets the host choose a game type and includes the debug button
 *
 * @returns A setup base with the proper setup dialog
 */
export function Setup(): JSX.Element {
    const [setupType, setSetupType] = useState(SetupType.MAIN);
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
                    setupType === SetupType.HUMAN
                ) ?
                    <SetupGame
                        gameType={
                            setupType === SetupType.COMPUTER ?
                                GameType.COMPUTER
                            :   GameType.HUMAN
                        }
                    />
                :   null}
            </SetupBase>
        );
    } else {
        return <Navigate to="/lobby" />;
    }
}

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
                className={buttonColor()}
            />
            <Button
                large
                text="Play Against A Human"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => props.onPageChange(SetupType.HUMAN)}
                className={buttonColor()}
            />
            <Button
                large
                text="Puzzle"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => props.onPageChange(SetupType.PUZZLE)}
                className={buttonColor()}
            />
            <ThemeButtons />
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
                <H3 className={textColor()}>Welcome to Chess Bot!</H3>

                {actions}
            </div>
        </>
    );
}

export function ThemeButtons(props): JSX.Element {
    props;
    return (
        <>
            <h3 className={textColor()}>Display Settings:</h3>
            <ButtonGroup variant="outlined">
                {allSettings.map((item, idx) => (
                    <Button
                        textClassName={textColor()}
                        //changed for better visibility
                        icon={item[1]}
                        text={item[0]}
                        active={getUserSetting() === idx}
                        onClick={() => setUserSetting(idx)}
                    />
                ))}
            </ButtonGroup>
        </>
    );
}
