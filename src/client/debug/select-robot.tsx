import { Button, MenuItem } from "@blueprintjs/core";
import type { ItemRenderer } from "@blueprintjs/select";
import { Select } from "@blueprintjs/select";

/**
 * Creates a robot menu item
 *
 * @param robotId - id of the robot
 * @param param1 - handlers for active, focus, and click
 * @returns a menu item for the robot id
 */
const renderRobotIds: ItemRenderer<string> = (
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
    robotIds: string[];
    selectedRobotId: string | undefined;
    onRobotIdSelected: (robotId: string) => void;
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
        <Select<string>
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
