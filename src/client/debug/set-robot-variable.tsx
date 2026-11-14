import { useState } from "react";
import { MessageType, type MessageSender } from "../../common/message";
import { Button, FormGroup, InputGroup, NumericInput } from "@blueprintjs/core";
import { RobotId } from "../../server/api/config";

interface SetRobotVariableProps {
    robotId: RobotId;
    sendMessage: MessageSender;
}

/**
 * set a variable for a robot
 * @param props - function for setting the variable
 * @returns - setup form
 */
export function SetRobotVariable(props: SetRobotVariableProps) {
    const [variableName, setVariableName] = useState("");
    const [variableValue, setVariableValue] = useState("");
    return (
        <>
            <FormGroup
                label="Variable Name"
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
                label="Variable Value"
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
                disabled={variableName === ""}
                text="Submit"
                rightIcon="arrow-right"
                intent="primary"
                onClick={() => {
                    props.sendMessage({
                        type: MessageType.SET_ROBOT_VARIABLE,
                        id: props.robotId,
                        variableName,
                        variableValue: Number(variableValue)
                    });
                }}
            />
        </>
    );
}
