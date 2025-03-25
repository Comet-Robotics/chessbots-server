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
    sliderColor,
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

    //we have this slider value because it's the only way to automatically
    //update the slider. Set it to currenet user setting initially.
    //instead of changing the value, we just refresh the page.
    const [sliderValue] = useState(getUserSetting());

    //we have this because until its declared false, we know our program is still rendering.
    //So, we wait for the useEFfect to then know what we're done refreshing
    const [rendering] = useState("true");

    // This effect will run after every render
    useEffect(() => {
        //now that we're done refreshing, we set the status of refreshing to false
        localStorage.setItem("refreshing", "false");
    }, [rendering]); // You can add specific dependencies here (like count) to only trigger on those changes

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
            <h3 className={textColor()}>Display Settings:</h3>
            <Slider
                //colorSliderPos just shortens the slider; otherwise, the text goes off the screen.
                className={
                    sliderColor() + " " + textColor() + " colorSliderPos"
                }
                max={2}
                min={0}
                value={sliderValue}
                showTrackFill
                stepSize={1}
                onChange={(newVal) => {
                    //change the local storage variable storing the current setting
                    changeUserSetting(newVal);
                    //now we are going to refresh, so we shouldn't overwrite the user setting while refreshing.
                    localStorage.setItem("refreshing", "true");
                    //actually do the refresh
                    window.location.reload();
                }}
                //maps our numeric labels to text
                labelRenderer={(value) => {
                    if (value === 0) {
                        return "System";
                    } else if (value === 1) {
                        return "Light";
                    }
                    return "Dark";
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
