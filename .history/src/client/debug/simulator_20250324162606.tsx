import { Card, Button, H1, Tooltip, Collapse } from "@blueprintjs/core";
import { useEffect, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, useSocket } from "../api";
import {
    SimulatedRobotLocation,
    SimulatorUpdateMessage,
    StackFrame,
} from "../../common/message/simulator-message";
import { Tag, CompoundTag } from "@blueprintjs/core";
import "./simulator.scss";
import { bgColor, textColor } from "../checkDarkMode";

const tileSize = 60;
const robotSize = tileSize / 2;
const cellCount = 12;

/**
 * Creates a robot simulator for testing robot commands
 *
 * does not require physical robots to be connected
 * @returns the simulator screen as a card
 */
export function Simulator() {
    const navigate = useNavigate();

    type RobotState = { [robotId: string]: SimulatedRobotLocation };

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
    const [messageLog, setMessageLog] = useState<
        { message: SimulatorUpdateMessage; ts: Date }[]
    >([]);

    // update the simulator when a message comes in
    useSocket((message) => {
        if (message instanceof SimulatorUpdateMessage) {
            dispatch({
                type: "UPDATE_ROBOT",
                payload: { robotId: message.robotId, state: message.location },
            });
            setMessageLog((log) => [...log, { message, ts: new Date() }]);
        }
    });

    // fetch the current state of the robots and update all the sim robots
    const fetchRobotState = async () => {
        const { robotState, messages } = await get(
            "/get-simulator-robot-state",
        );
        dispatch({ type: "SET_ALL_ROBOTS", payload: robotState });
        setMessageLog(
            messages.map(({ message, ts }) => ({ message, ts: new Date(ts) })),
        );
    };

    useEffect(() => {
        fetchRobotState();
    }, []);

    // get /do-smth to move the robot randomly
    const moveRandomBot = async () => {
        const response = await get("/do-smth");
        if (!response.ok) {
            console.warn("Failed to move random bot");
        }
    };

    const logListRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (logListRef.current) {
            logListRef.current.scrollTop = logListRef.current.scrollHeight;
        }
    }, [messageLog]);

    /**
     * make the simulator screen
     *
     * made by creating an array for the entire chessboard
     * add all the robots on top of the board
     */
    return (
        <Card className={bgColor()}>
            <Button
                minimal
                style={{ float: "right" }}
                icon="home"
                onClick={() => navigate("/home")}
            />
            <Button
                minimal
                style={{ float: "right" }}
                icon="cog"
                onClick={() => navigate("/debug")}
            />
            <div
                style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "1rem",
                    alignItems: "center",
                }}
            >
                <H1 className={textColor()}>Robot Simulator</H1>
                <Button icon="refresh" onClick={fetchRobotState}>
                    Refresh
                </Button>
                <Button icon="random" onClick={moveRandomBot}>
                    Move Random Bot
                </Button>
            </div>
            <div style={{ display: "flex", gap: "1rem", width: "95vw" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${cellCount}, ${tileSize}px)`,
                        gridTemplateRows: `repeat(${cellCount}, ${tileSize}px)`,
                        position: "relative",
                    }}
                >
                    {new Array(cellCount * cellCount)
                        .fill(undefined)
                        .map((_, i) => {
                            const row = Math.floor(i / cellCount);
                            const col = i % cellCount;
                            const isCenterCell =
                                row >= 2 && row < 10 && col >= 2 && col < 10;
                            return (
                                <div
                                    key={i}
                                    style={{
                                        border: "1px solid black",
                                        backgroundColor:
                                            !isCenterCell ? "lightgray" : (
                                                "transparent"
                                            ),
                                    }}
                                />
                            );
                        })}
                    {/* TODO: implement onTopOfRobots */}
                    {Object.entries(robotState).map(([robotId, pos]) => (
                        <Robot
                            pos={pos}
                            robotId={robotId}
                            key={robotId}
                            onTopOfRobots={[]}
                        />
                    ))}
                </div>
                <div
                    style={{
                        width: "100%",
                        height: cellCount * (tileSize - 1),
                    }}
                >
                    <div
                        ref={logListRef}
                        style={{
                            height: "100%",
                            overflowY: "scroll",
                            display: "flex",
                            flexDirection: "column",
                        }}
                        className="log-list"
                    >
                        {messageLog.map(({ message, ts }, index) => {
                            return (
                                <LogEntry
                                    key={index}
                                    message={message}
                                    ts={ts}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </Card>
    );
}

/**
 * open a simulator frame in a editor
 * @param frame - the frame to view
 * @returns nothing
 */
const openInEditor = async (frame: StackFrame) => {
    if (!frame) {
        console.warn("No stack frame provided for opening in editor");
        return;
    }
    const params = new URLSearchParams({
        file: frame.fileName,
        line: frame.lineNumber.toString(),
        column: frame.columnNumber.toString(),
    });
    await fetch(`/__open-in-editor?${params.toString()}`);
};

/**
 * the message log, used to show the commands sent to the robot
 * @param props - the message and time
 * @returns the clickable message box
 */
function LogEntry(props: { message: SimulatorUpdateMessage; ts: Date }) {
    const { message, ts } = props;

    const kv = {
        x: message.location.position.x.toFixed(4),
        y: message.location.position.y.toFixed(4),
        headingRadians: message.location.headingRadians.toFixed(4),
    };

    const [isOpen, setIsOpen] = useState(false);
    const toggleOpen = () => setIsOpen((open) => !open);

    return (
        <div>
            <div
                onClick={toggleOpen}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.1rem",
                    padding: "0.5rem",
                    alignItems: "flex-start",
                    border: "none",
                }}
            >
                <div style={{ display: "flex", margin: 0, gap: "0.25rem" }}>
                    <Tag intent="warning">
                        {ts.getHours()}:{ts.getMinutes()}.{ts.getMilliseconds()}
                    </Tag>
                    <Tag intent="primary">{message.robotId}</Tag>
                    <Tag intent="success">{message.packet.type}</Tag>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.25rem",
                    }}
                >
                    {Object.entries(kv).map(([key, value]) => {
                        return (
                            <CompoundTag key={key} leftContent={key} minimal>
                                {value}
                            </CompoundTag>
                        );
                    })}
                </div>
            </div>
            {message.stackTrace && (
                <Collapse isOpen={isOpen}>
                    <pre
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                            whiteSpace: "pre-wrap",
                            padding: "0 0.75rem",
                        }}
                    >
                        {JSON.stringify(message.packet, null, 2)}
                        {message.stackTrace.map((frame, index) => {
                            const location = `${frame.fileName}:${frame.lineNumber}:${frame.columnNumber}`;
                            const msg =
                                frame.functionName ?
                                    `at ${frame.functionName} (${location})`
                                :   `at ${location}`;
                            return (
                                <a
                                    onClick={() => openInEditor(frame)}
                                    key={index}
                                    style={{
                                        display: "flex",
                                        gap: "0.25rem",
                                        textDecoration: "underline",
                                    }}
                                >
                                    {msg}
                                </a>
                            );
                        })}
                    </pre>
                </Collapse>
            )}
        </div>
    );
}

/**
 * Creates a robot icon to show in the simulator
 * @param props - the robot position and id
 * @returns the robot icon scaled to the board
 */
function Robot(props: {
    pos: SimulatedRobotLocation;
    robotId: string;
    onTopOfRobots: string[];
}) {
    return (
        <div
            className="robot"
            style={{
                position: "absolute",
                left: `${props.pos.position.x * tileSize - 0.25 * tileSize}px`,
                bottom: `${props.pos.position.y * tileSize - 0.25 * tileSize}px`,
            }}
        >
            <Tooltip content={`${props.robotId}: ${JSON.stringify(props.pos)}`}>
                <div className={}
                    style={{
                        transform: `rotate(-${props.pos.headingRadians}rad)`,
                        backgroundColor: "white",
                        borderRadius: "50%",
                        border: `4px solid ${props.onTopOfRobots.length > 0 ? "red" : "black"}`,
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        width: robotSize,
                        height: robotSize,
                        padding: "2px",
                        boxShadow: "0 0 3px black",
                    }}
                >
                    <div
                        style={{
                            width: robotSize / 4,
                            height: robotSize / 4,
                            backgroundColor: "black",
                            borderRadius: "50%",
                        }}
                    />
                </div>
            </Tooltip>
        </div>
    );
}
