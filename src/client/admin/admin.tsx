import { Card, Button, H1, Code, H2 } from "@blueprintjs/core";
import {
    bgColor,
    darkModeIcon,
    toggleUserSetting,
    textColor,
} from "../check-dark-mode";
import type { RobotState } from "../debug/simulator";
import { RobotGrid } from "../debug/simulator";
import { useNavigate } from "react-router-dom";
import { get, useSocket } from "../api";
import type { SimulatedRobotLocation } from "../../common/message/simulator-message";
import { DriveRobot } from "../debug/drive-robot";
import type { ReactNode } from "react";
import { useState, useReducer, useEffect } from "react";
import "./admin.scss";

export function Admin() {
    const [selectedRobot, setSelectedRobot] =
        useState<[string, SimulatedRobotLocation]>();

    const navigate = useNavigate();
    const sendMessage = useSocket();

    //Start of simulator duplicate

    type Action =
        | { type: "SET_ALL_ROBOTS"; payload: RobotState }
        | {
              type: "UPDATE_ROBOT";
              payload: { robotId: string; state: SimulatedRobotLocation };
          };

    /** compress robot states for performance */
    const robotStateReducer = (
        state: RobotState,
        action: Action,
    ): RobotState => {
        switch (action.type) {
            case "SET_ALL_ROBOTS":
                return action.payload;
            case "UPDATE_ROBOT":
                return {
                    ...state,
                    [action.payload.robotId]: action.payload.state,
                };
            default:
                return state;
        }
    };

    const [robotState, dispatch] = useReducer(robotStateReducer, {});
    // fetch the current state of the robots and update all the sim robots
    const fetchRobotState = async () => {
        const { robotState } = await get("/get-real-robot-state");
        dispatch({ type: "SET_ALL_ROBOTS", payload: robotState });
    };

    useEffect(() => {
        fetchRobotState();
    }, []);

    //End of simulator duplicate

    //get user selected robot
    const onClick = (id) => {
        Object.entries(robotState).find((robot) => {
            robot[0] === id ? setSelectedRobot(robot) : null;
        });
    };

    //start of debug duplicate

    // create the select and move buttons
    let body: ReactNode;
    if (selectedRobot === undefined) {
        body = <div></div>;
    } else {
        body = (
            <div className="debug-section " style={{width:"25vw"}}>
                <H2 className={textColor()}>Select Robot</H2>
                {selectedRobot[0] === undefined ? null : (
                    <>
                        <div className="debug-section">
                            <H2 className={textColor()}>
                                Motor Control for{" "}
                                <Code>{selectedRobot[0]}</Code>
                            </H2>
                            <DriveRobot
                                sendMessage={sendMessage}
                                robotId={selectedRobot[0]}
                            />
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <Card className={bgColor()}>
            <Button
                variant="minimal"
                style={{ float: "right" }}
                icon="home"
                onClick={() => navigate("/home")}
            />
            <Button
                variant="minimal"
                style={{ float: "right" }}
                icon="cog"
                onClick={() => navigate("/debug")}
            />
            <Button
                variant="minimal"
                style={{ float: "right" }}
                icon={darkModeIcon()}
                onClick={toggleUserSetting}
            />
            <div className="container">
                {body}
                <div style={{display:"grid", placeItems:"center", width:"50vw"}}>
                    <div
                        style={{
                            display:"flex",
                            gap: "1rem",
                            marginBottom: "1rem",
                            alignItems: "center",
                        }}
                    >
                        <H1 className={textColor()}>Robot Simulator</H1>
                        <Button icon="refresh" onClick={fetchRobotState}>
                            Refresh
                        </Button>
                    </div>
                    <div
                        style={{ display: "flex", gap: "1rem",  }}
                    >
                        <RobotGrid robotState={robotState} onClick={onClick} />
                        
                    </div>
                </div>
            </div>
        </Card>
    );
}
