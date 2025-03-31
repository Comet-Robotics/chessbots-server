import { Button, useHotkeys } from "@blueprintjs/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DriveRobotMessage } from "../../common/message/robot-message";
import { SendMessage } from "../../common/message/message";
import { Joystick } from "react-joystick-component";
import type { IJoystickUpdateEvent } from "react-joystick-component/build/lib/Joystick";
import { DriveSlider } from "./drive-slider";
import {
    joystickInColor,
    joystickOutColor,
    textColor,
} from "../check-dark-mode";

interface DriveRobotProps {
    robotId: string;
    sendMessage: SendMessage;
}

const ROBOT_MSG_THROTTLE_MS = 50;

function almostEqual(v1: number, v2: number, epsilon: number = 0.01): boolean {
    return Math.abs(v1 - v2) <= epsilon;
}

/**
 * A component which can be used to drive an individual robot around.
 * @param props - the robotid and the send message function
 */
export function DriveRobot(props: DriveRobotProps) {
    // state variable for handling the power levels of the robot
    const [power, setPower] = useState({ left: 0, right: 0 });
    const [prevPad, setPrevPad] = useState({ left: 0, right: 0 });
    const [prev, setPrev] = useState({ left: 0, right: 0 });

    // useEffect hook to send the power levels to the robot if there is a change in the power levels
    useEffect(() => {
        if (
            almostEqual(prev.left, power.left) &&
            almostEqual(prev.right, power.right)
        ) {
            return;
        }
        props.sendMessage(
            new DriveRobotMessage(props.robotId, power.left, power.right),
        );
        setPrev({ left: power.left, right: power.right });
    }, [props, power.left, power.right, prev]);

    // allow use of a gamepad
    useEffect(() => {
        if (!navigator.getGamepads) {
            console.log("Gamepad API not supported");
            return;
        }
        const handleGamepadInput = () => {
            for (const gamepad of navigator.getGamepads()) {
                if (gamepad) {
                    // tank-style drive
                    // deadzone and scaling to be more sensitive at lower values
                    const DEADZONE = 0.15;
                    let padLeftPower = gamepad.axes[1] * -1;
                    let padRightPower = gamepad.axes[3] * -1;
                    if (Math.abs(padLeftPower) < DEADZONE) padLeftPower = 0;
                    if (Math.abs(padRightPower) < DEADZONE) padRightPower = 0;
                    padLeftPower =
                        Math.sign(padLeftPower) * Math.pow(padLeftPower, 2);
                    padRightPower =
                        Math.sign(padRightPower) * Math.pow(padRightPower, 2);
                    if (
                        prevPad.left === 0 &&
                        prevPad.right === 0 &&
                        padLeftPower === 0 &&
                        padRightPower === 0
                    ) {
                        continue;
                    }
                    // set power based on pad values
                    setPower({ left: padLeftPower, right: padRightPower });
                    setPrevPad({ left: padLeftPower, right: padRightPower });
                }
            }
        };

        const gamepadPollingInterval = setInterval(
            handleGamepadInput,
            ROBOT_MSG_THROTTLE_MS,
        );

        return () => {
            clearInterval(gamepadPollingInterval);
        };
    }, [props, prevPad]);

    // the move types and corresponding motor powers
    const handleStopMove = useCallback(() => {
        setPower({ left: 0, right: 0 });
    }, []);

    const handleDriveForward = useCallback(() => {
        setPower({ left: 1, right: 1 });
    }, []);
    const handleDriveBackward = useCallback(() => {
        setPower({ left: -1, right: -1 });
    }, []);
    const handleTurnRight = useCallback(() => {
        setPower({ left: 0.5, right: -0.5 });
    }, []);
    const handleTurnLeft = useCallback(() => {
        setPower({ left: -0.5, right: 0.5 });
    }, []);

    // handle when the left and right powers change
    const handleLeftPowerChange = useCallback(
        (value: number) => {
            setPower({ left: value, right: power.right });
        },
        [power.right],
    );
    const handleRightPowerChange = useCallback(
        (value: number) => {
            setPower({ left: power.left, right: value });
        },
        [power.left],
    );

    /** use wasd and arrows to control robots */
    const hotkeys = useMemo(
        () => [
            {
                combo: "w",
                group: "Debug",
                global: true,
                label: "Drive forward",
                onKeyDown: handleDriveForward,
                onKeyUp: handleStopMove,
            },
            {
                combo: "s",
                group: "Debug",
                global: true,
                label: "Drive backward",
                onKeyDown: handleDriveBackward,
                onKeyUp: handleStopMove,
            },
            {
                combo: "a",
                group: "Debug",
                global: true,
                label: "Turn right",
                onKeyDown: handleTurnRight,
                onKeyUp: handleStopMove,
            },
            {
                combo: "d",
                group: "Debug",
                global: true,
                label: "Turn left",
                onKeyDown: handleTurnLeft,
                onKeyUp: handleStopMove,
            },
            {
                combo: "up",
                group: "Debug",
                global: false,
                label: "Drive forward",
                onKeyDown: handleDriveForward,
                onKeyUp: handleStopMove,
            },
            {
                combo: "down",
                group: "Debug",
                global: false,
                label: "Drive backward",
                onKeyDown: handleDriveBackward,
                onKeyUp: handleStopMove,
            },
            {
                combo: "right",
                group: "Debug",
                global: false,
                label: "Turn right",
                onKeyDown: handleTurnRight,
                onKeyUp: handleStopMove,
            },
            {
                combo: "left",
                group: "Debug",
                global: false,
                label: "Turn left",
                onKeyDown: handleTurnLeft,
                onKeyUp: handleStopMove,
            },
        ],
        [
            handleStopMove,
            handleDriveForward,
            handleDriveBackward,
            handleTurnLeft,
            handleTurnRight,
        ],
    );

    // show instructions and on screen buttons
    const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

    const convertJoystickXYToMotorPowers = useCallback(
        (x: number, y: number) => {
            const maxPower = 1;
            let leftPower = y + x;
            let rightPower = y - x;
            // Normalize powers to be within -1 to 1
            const maxInitialPower = Math.max(
                Math.abs(leftPower),
                Math.abs(rightPower),
            );
            if (maxInitialPower > maxPower) {
                leftPower /= maxInitialPower;
                rightPower /= maxInitialPower;
            }
            return { left: leftPower, right: rightPower };
        },
        [],
    );
    const convertMotorPowersToJoystickXY = useCallback(
        (left: number, right: number) => {
            const y = (left + right) / 2;
            const x = (left - right) / 2;
            return { x, y };
        },
        [],
    );

    const handleUiJoystickMove = useCallback(
        (evt: IJoystickUpdateEvent) => {
            const { x, y } = evt;
            console.log(`Joystick move event: x=${x}, y=${y}`);
            if (x === null || y === null) {
                console.log("Joystick move event missing x or y");
                return;
            }

            setPower(convertJoystickXYToMotorPowers(-x, y));
        },
        [convertJoystickXYToMotorPowers],
    );
    return (
        <div tabIndex={0} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}>
            <br />
            <p className={textColor()}>
                Control this robot using the buttons below, arrow keys, WASD, or
                a connected gamepad. If arrow keys are not working, make sure
                controls are in focus.
            </p>
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    width: "95%",
                }}
            >
                <div>
                    <DriveSlider
                        power={power.left}
                        onChange={handleLeftPowerChange}
                    />
                </div>
                <div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <Joystick
                            baseColor={joystickOutColor()}
                            stickColor={joystickInColor()}
                            throttle={ROBOT_MSG_THROTTLE_MS}
                            size={150}
                            pos={convertMotorPowersToJoystickXY(
                                power.left,
                                power.right,
                            )}
                            move={handleUiJoystickMove}
                            stop={handleStopMove}
                        ></Joystick>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <Button
                            icon="arrow-up"
                            onMouseUp={handleStopMove}
                            onMouseDown={handleDriveForward}
                        />
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <Button
                            icon="arrow-left"
                            onMouseUp={handleStopMove}
                            onMouseDown={handleTurnLeft}
                        />
                        <Button
                            icon="arrow-down"
                            onMouseUp={handleStopMove}
                            onMouseDown={handleDriveBackward}
                        />
                        <Button
                            icon="arrow-right"
                            onMouseUp={handleStopMove}
                            onMouseDown={handleTurnRight}
                        />
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                        }}
                    >
                        <Button
                            icon="stop"
                            onClick={handleStopMove}
                            title="Stop"
                        />
                    </div>
                </div>
                <div>
                    <DriveSlider
                        power={power.right}
                        onChange={handleRightPowerChange}
                    />
                </div>
            </div>
        </div>
    );
}
