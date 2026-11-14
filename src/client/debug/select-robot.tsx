import { Button, MenuItem } from "@blueprintjs/core";
import type { ItemRenderer } from "@blueprintjs/select";
import { Select } from "@blueprintjs/select";
import { RobotId } from "../../server/api/config";

/**
 * Creates a robot menu item
 *
 * @param robotId - id of the robot
 * @param param1 - handlers for active, focus, and click
 * @returns a menu item for the robot id
 */
const renderRobotIds: ItemRenderer<RobotId> = (
    robotId,
    { modifiers, handleFocus, handleClick },
) => {
    return (
        <MenuItem
            key={robotId}
            active={modifiers.active}
            roleStructure="listoption"
            text={"Robot " + robotId}
            onFocus={handleFocus}
            onClick={handleClick}
        />
    );
};

/**
 * Ids, selected id, and on robot selected function
 */
interface SelectRobotProps {
    robotIds: RobotId[];
    selectedRobotId: RobotId | undefined;
    onRobotIdSelected: (robotId: RobotId) => void;
}

/**
 * Creates the robot selector dialog
 *
 * @param props - robot ids and select function
 * @returns - select dropdown
 */
export function SelectRobot(props: SelectRobotProps) {
    const hasSelection = props.selectedRobotId !== undefined;

    return (
        // get all the robot ids in the list for selection
        <Select<RobotId>
            items={props.robotIds}
            itemRenderer={renderRobotIds}
            onItemSelect={props.onRobotIdSelected}
            filterable={false}
            popoverProps={{ minimal: true }}
        >
            <Button
                text={
                    hasSelection ?
                        "Robot " + props.selectedRobotId
                    :   "Select a robot..."
                }
                rightIcon="double-caret-vertical"
            />
        </Select>
    );
}
