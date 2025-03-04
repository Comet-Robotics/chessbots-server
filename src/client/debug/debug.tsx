import { Button, Card, Code, H1, H2, Spinner } from "@blueprintjs/core";
import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, useSocket } from "../api";
import { SelectRobot } from "./select-robot";
import { DriveRobot } from "./drive-robot";
import { SetRobotVariable } from "./set-robot-variable";
import "./debug.scss";

/**
 * A debug menu which can be used to manually control individual robots.
 */
export function Debug() {
    const [robotIds, setRobotIds] = useState<string[] | undefined>();
    const [selectedRobotId, setSelectedRobotId] = useState<
        string | undefined
    >();

    // helper functions
    const navigate = useNavigate();
    const sendMessage = useSocket();

    // get all the registered robots
    useEffect(() => {
        const fetchIds = async () => {
            const response = await get("/get-ids");
            setRobotIds(response.ids);
        };
        fetchIds();
    }, [setRobotIds]);

    // create the select and move buttons
    let body: ReactNode;
    if (robotIds === undefined) {
        body = <Spinner intent="primary" />;
    } else {
        body = (
            <div className="debug-section">
                <H2>Select Robot</H2>
                <SelectRobot
                    robotIds={robotIds}
                    selectedRobotId={selectedRobotId}
                    onRobotIdSelected={setSelectedRobotId}
                />
                {selectedRobotId === undefined ? null : (
                    <>
                        <div className="debug-section">
                            <H2>
                                Motor Control for <Code>{selectedRobotId}</Code>
                            </H2>
                            <DriveRobot
                                sendMessage={sendMessage}
                                robotId={selectedRobotId}
                            />
                        </div>
                        <div className="debug-section">
                            <H2>
                                Configuration for <Code>{selectedRobotId}</Code>
                            </H2>
                            <SetRobotVariable
                                sendMessage={sendMessage}
                                robotId={selectedRobotId}
                            />
                        </div>
                    </>
                )}
            </div>
        );
    }

    // return the dialog with buttons for home and simulator
    return (
        <Card>
            <Button
                minimal
                style={{ float: "right" }}
                icon="home"
                onClick={() => navigate("/home")}
            />
            <Button
                minimal
                style={{ float: "right" }}
                icon="airplane"
                onClick={() => navigate("/debug/simulator")}
            />
            <H1>Debug</H1>
            {body}
        </Card>
    );
}
