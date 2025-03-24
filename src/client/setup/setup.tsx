import { Button, H3, NonIdealState, Slider, Spinner } from "@blueprintjs/core";
import { SetupBase } from "./setup-base";
import { Dispatch, useEffect, useState } from "react";
import { SetupGame } from "./setup-game";
import { Navigate, useNavigate } from "react-router-dom";
import { ClientType, GameType } from "../../common/client-types";
import { get, useEffectQuery } from "../api";
import {
    buttonColor,
    changeUserSetting,
    getUserSetting,
    textColor,
} from "../checkDarkMode";
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
    const [sliderValue, setSliderValue] = useState(getUserSetting());

    const [rendering, hasRendered] = useState("true");

    // This effect will run after every render
    useEffect(() => {
        console.log("Render finished!");
        localStorage.setItem("refreshing", "false");
    }, [rendering]); // You can add specific dependencies here (like count) to only trigger on those changes

    console.log(sliderValue);
    const debugButton = (
        <Button
            minimal
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
                text="Play With The Computer"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => props.onPageChange(SetupType.COMPUTER)}
                className={buttonColor()}
                //Used to align the <p> in the center.
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
            <Slider
                max={3}
                min={1}
                value={sliderValue}
                showTrackFill
                stepSize={1}
                onChange={(newVal) => {
                    changeUserSetting(newVal);
                    localStorage.setItem("refreshing", "true");
                    window.location.reload();
                }}
                labelRenderer={(value) => {
                    console.log();
                    if (value === 1) {
                        return "System";
                    } else if (value === 2) {
                        return "Light";
                    } else if (value === 3) {
                        return "Dark";
                    }
                    return "";
                }}
            ></Slider>
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
