import { useState } from "react";
import { SendMessage } from "../../common/message/message";
import { Button, FormGroup, InputGroup, NumericInput } from "@blueprintjs/core";
import { SetRobotVariableMessage } from "../../common/message/robot-message";

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
            <FormGroup label="Variable Name" labelFor="variable-name">
                <InputGroup
                    id="variable-name"
                    value={variableName}
                    onValueChange={(value: string) => {
                        setVariableName(value);
                    }}
                    placeholder="Variable name"
                />
            </FormGroup>
            <FormGroup label="Variable Value" labelFor="variable-value">
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
