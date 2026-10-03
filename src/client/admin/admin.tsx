import {
    Card,
    Button,
    H1,
    Code,
    H2,
    Tabs,
    Tab,
    FormGroup,
    NumericInput,
    InputGroup,
} from "@blueprintjs/core";
import {
    bgColor,
    darkModeIcon,
    toggleUserSetting,
    textColor,
    buttonColor,
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
import type { SendMessage } from "../../common/message/message";
import {
    SetRobotPieceMessage,
    SetRobotPositionMessage,
} from "../../common/message/robot-message";

interface AdminProps {
    status: string;
    numberRobots: string;
    players: number;
    board: string | null;
    turn: string | null;
}

export function Admin() {
    const [selectedRobot, setSelectedRobot] =
        useState<[string, SimulatedRobotLocation]>();

    const [info, setInfo] = useState<AdminProps>();

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

    const [robotPieces, setRobotPieces] = useState<[string, string]>(["",""]);

    const fetchRobotPieces = async () => {
        const { robotState } = await get("/get-robot-pieces");
        setRobotPieces(robotState);
    };

    const fetchAdminState = async () => {
        await get("/admin-state").then((props) => {
            const holder: AdminProps = {
                status: props.status,
                numberRobots: props.numberRobots,
                players: props.players,
                board: props.board,
                turn: props.turn,
            };
            setInfo(holder);
        });
    };

    useEffect(() => {
        setInterval(() => {
            fetchRobotState();
            fetchAdminState();
            fetchRobotPieces();
        }, 250);
    }, []);

    //End of simulator duplicate

    //get user selected robot
    const onClick = (id) => {
        Object.entries(robotState).find((robot) => {
            robot[0] === id ? setSelectedRobot(robot) : null;
        });
    };

    const robotGrid: ReactNode = (
        <div
            style={{
                display: "grid",
                placeItems: "center",
                width: "50vw",
            }}
        >
            <div
                style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "1rem",
                    alignItems: "center",
                }}
            >
                <H1 className={textColor()}>Robot Positions</H1>
                <Button icon="refresh" onClick={fetchRobotState}>
                    Refresh
                </Button>
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
                <RobotGrid robotState={robotState} onClick={onClick} />
            </div>
        </div>
    );

    //start of debug duplicate

    // create the select and move buttons
    let drive: ReactNode;
    if (selectedRobot === undefined) {
        drive = (
            <div
                style={{ width: "25vw", display: "grid", placeItems: "center" }}
            >
                <H2 className={textColor()}>Select Robot</H2>
            </div>
        );
    } else {
        drive = (
            <div className="debug-section " style={{ width: "25vw" }}>
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

    //end of debug duplicate

    const gameInfo: ReactNode = (
        <div style={{ width: "25vw" }}>
            <h2 className={textColor()}>
                status:
                <Code style={{ background: "rgba(0,0,0,0)" }}>
                    {info?.status ? "Paused" : "Running"}
                </Code>
                <br />
                number of robots:
                <Code style={{ background: "rgba(0,0,0,0)" }}>
                    {info?.numberRobots}
                </Code>
                <br />
                player count:
                <Code style={{ background: "rgba(0,0,0,0)" }}>
                    {info?.players}
                </Code>
                <br />
                board state:
                <Code style={{ background: "rgba(0,0,0,0)" }}>
                    {info?.board}
                </Code>
                <br />
                turn:
                <Code style={{ background: "rgba(0,0,0,0)" }}>
                    {info?.turn}
                </Code>
            </h2>
        </div>
    );

    let overrides: ReactNode;
    if (selectedRobot === undefined) {
        overrides = (
            <div
                style={{ width: "25vw", display: "grid", placeItems: "center" }}
            >
                <H2 className={textColor()}>Select Robot</H2>
            </div>
        );
    } else {
        overrides = (
            <div className="debug-section " style={{ width: "25vw" }}>
                {selectedRobot[0] === undefined ? null : (
                    <>
                        <div className="debug-section">
                            <H2 className={textColor()}>
                                Overrides for <Code>{selectedRobot[0]}</Code>
                            </H2>
                            <SetRobotPos
                                sendMessage={sendMessage}
                                robotId={selectedRobot[0]}
                                robotPos={selectedRobot[1]}
                            />
                            <SetRobotPiece
                                sendMessage={sendMessage}
                                robotId={selectedRobot[0]}
                                robotPiece={robotPieces[selectedRobot[0]]}
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
            <Tabs className="tabs">
                <Tab
                    id="running"
                    className={textColor()}
                    title="running"
                    panel={
                        <div className="container">
                            {drive}
                            {robotGrid}
                            {gameInfo}
                        </div>
                    }
                />
                <Tab
                    id="override"
                    title="overrides"
                    className={textColor()}
                    panel={
                        <div className="container">
                            {overrides}
                            {robotGrid}
                            {gameInfo}
                        </div>
                    }
                />
            </Tabs>
        </Card>
    );
}

interface SetRobotVariableProps {
    robotId: string;
    robotPos: SimulatedRobotLocation;
    sendMessage: SendMessage;
}

/**
 * set a variable for a robot
 * @param props - function for setting the variable
 * @returns - setup form
 */
export function SetRobotPos(props: SetRobotVariableProps): JSX.Element {
    const [variableX, setVariableX] = useState("");
    const [variableY, setVariableY] = useState("");
    const [degrees, setDegrees] = useState("");
    return (
        <>
            <FormGroup
                label={<p className={textColor()}>Position override</p>}
                labelFor="variable-name"
            >
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "auto auto",
                    }}
                >
                    <NumericInput
                        id="variable-value"
                        value={variableX}
                        onValueChange={(
                            _valueAsNumber: number,
                            value: string,
                        ) => {
                            setVariableX(value);
                        }}
                        placeholder={props.robotPos.position.x.toString()}
                        buttonPosition="right"
                        style={{ width: "205px" }}
                        min={0}
                        max={11.9}
                        step={0.5}
                    />
                    <NumericInput
                        id="variable-value"
                        value={variableY}
                        onValueChange={(
                            _valueAsNumber: number,
                            value: string,
                        ) => {
                            setVariableY(value);
                        }}
                        placeholder={props.robotPos.position.y.toString()}
                        buttonPosition="right"
                        style={{ width: "205px" }}
                        min={0}
                        max={11.9}
                        step={0.5}
                    />
                </div>
                <InputGroup
                    id="variable-name"
                    value={degrees}
                    onValueChange={(value: string) => {
                        setDegrees(value);
                    }}
                    placeholder={
                        Math.round(
                            (props.robotPos.headingRadians * 180) / Math.PI,
                        ).toString() + "°"
                    }
                />
            </FormGroup>
            <Button
                className={buttonColor()}
                text="Submit"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => {
                    props.sendMessage(
                        new SetRobotPositionMessage(
                            props.robotId,
                            variableX === "" ?
                                props.robotPos.position.x
                            :   parseFloat(variableX),
                            variableY === "" ?
                                props.robotPos.position.y
                            :   parseFloat(variableY),
                            degrees === "" ?
                                props.robotPos.headingRadians
                            :   parseFloat(degrees),
                        ),
                    );
                }}
            />
        </>
    );
}

interface SetRobotPieceProps {
    robotId: string;
    robotPiece: string;
    sendMessage: SendMessage;
}

/**
 * set a variable for a robot
 * @param props - function for setting the variable
 * @returns - setup form
 */
export function SetRobotPiece(props: SetRobotPieceProps): JSX.Element {
    const [piece, setPiece] = useState(props.robotPiece);

    return (
        <>
            <FormGroup
                label={<p className={textColor()}>Piece override</p>}
                labelFor="variable-name"
            >
                <InputGroup
                    id="variable-name"
                    value={piece}
                    onValueChange={(value: string) => {
                        setPiece(value);
                    }}
                    placeholder={
                        props.robotPiece
                    }
                />
            </FormGroup>
            <Button
                className={buttonColor()}
                text="Submit"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => {
                    if(piece !== props.robotPiece && ["w_king","w_queen","w_bishop","w_knight","w_rook","w_pawn","b_king","b_queen","b_bishop","b_knight","b_rook","b_pawn"].includes(piece))
                        props.sendMessage(
                            new SetRobotPieceMessage(
                                props.robotId,
                                piece
                            ),
                        );
                }}
            />
        </>
    );
}


interface SendRobotMoveProps {
    robotId: string;
    robotPiece: string;
    sendMessage: SendMessage;
}

/**
 * set a variable for a robot
 * @param props - function for setting the variable
 * @returns - setup form
 */
export function SendRobotMove(props: SendRobotMoveProps): JSX.Element {
    const [piece, setPiece] = useState(props.robotPiece);

    return (
        <>
            <FormGroup
                label={<p className={textColor()}>Force Movement</p>}
                labelFor="variable-name"
            >
                <InputGroup
                    id="variable-name"
                    value={piece}
                    onValueChange={(value: string) => {
                        setPiece(value);
                    }}
                    placeholder={
                        props.robotPiece
                    }
                />
            </FormGroup>
            <Button
                className={buttonColor()}
                text="Submit"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => {
                        props.sendMessage(
                            new SetRobotPieceMessage(
                                props.robotId,
                                piece
                            ),
                        );
                }}
            />
        </>
    );
}