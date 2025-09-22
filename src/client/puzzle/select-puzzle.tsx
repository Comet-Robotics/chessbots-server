import { Button, MenuItem } from "@blueprintjs/core";
import type { ItemRenderer } from "@blueprintjs/select";
import { Select } from "@blueprintjs/select";
import { post } from "../api.js";
import { useNavigate } from "react-router-dom";
import type { PuzzleComponents } from "../../server/api/puzzles.js";

const renderPuzzleOptions: ItemRenderer<string> = (
    puzzleNumber,
    { modifiers, handleFocus, handleClick },
) => {
    return (
        <MenuItem
            key={puzzleNumber}
            active={modifiers.active}
            roleStructure="listoption"
            text={puzzleNumber}
            onFocus={handleFocus}
            onClick={handleClick}
        />
    );
};

interface SelectPuzzleProps {
    puzzles: Record<string, PuzzleComponents>;
    selectedPuzzle: string | undefined;
    onPuzzleSelected: (puzzle: string) => void;
}

export function SelectPuzzle(props: SelectPuzzleProps) {
    const navigate = useNavigate();
    const hasSelection = props.selectedPuzzle !== undefined;

    const submit = (
        <Button
            text="Play"
            icon="arrow-right"
            intent="primary"
            onClick={async () => {
                if (props.selectedPuzzle && props.puzzles) {
                    //convert puzzle to map and send to start puzzles
                    const puzzle = props.puzzles as Record<
                        string,
                        PuzzleComponents
                    >;
                    const promise = post("/start-puzzle-game", {
                        puzzle: JSON.stringify(puzzle[props.selectedPuzzle]),
                    });
                    promise.then(() => {
                        navigate("/game");
                    });
                }
            }}
        />
    );
    return (
        <>
            <Select<string>
                items={[...Object.keys(props.puzzles)]}
                itemRenderer={renderPuzzleOptions}
                onItemSelect={props.onPuzzleSelected}
                filterable={false}
                popoverProps={{ minimal: true }}
            >
                <Button
                    text={
                        hasSelection ?
                            props.selectedPuzzle
                        :   "Select a puzzle..."
                    }
                    endIcon="double-caret-vertical"
                />
            </Select>
            {submit}
        </>
    );
}
