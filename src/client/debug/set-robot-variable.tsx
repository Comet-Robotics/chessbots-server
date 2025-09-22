import { useState } from "react";
import type { SendMessage } from "../../common/message/message.js";
import { Button, FormGroup, InputGroup, NumericInput } from "@blueprintjs/core";
import { SetRobotVariableMessage } from "../../common/message/robot-message.js";
import { buttonColor, textColor } from "../check-dark-mode.js";
import "../colors.css";

interface SetRobotVariableProps {
    robotId: string;
    sendMessage: SendMessage;
}

/**
 * set a variable for a robot
 * @param props - function for setting the variable
 * @returns - setup form
 */
export function SetRobotVariable(props: SetRobotVariableProps): JSX.Element {
    const [variableName, setVariableName] = useState("");
    const [variableValue, setVariableValue] = useState("");
    return (
        <>
            <FormGroup
                label={<p className={textColor()}>Variable Name</p>}
                labelFor="variable-name"
            >
                <InputGroup
                    id="variable-name"
                    value={variableName}
                    onValueChange={(value: string) => {
                        setVariableName(value);
                    }}
                    placeholder="Variable name"
                />
            </FormGroup>
            <FormGroup
                label={<p className={textColor()}>Variable Value</p>}
                labelFor="variable-value"
            >
                <NumericInput
                    id="variable-value"
                    value={variableValue}
                    onValueChange={(_valueAsNumber: number, value: string) => {
                        setVariableValue(value);
                    }}
                    placeholder="Variable value"
                    buttonPosition="none"
                />
            </FormGroup>
            <Button
                className={buttonColor()}
                disabled={variableName === ""}
                text="Submit"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => {
                    props.sendMessage(
                        new SetRobotVariableMessage(
                            props.robotId,
                            variableName,
                            parseFloat(variableValue),
                        ),
                    );
                }}
            />
        </>
    );
}
