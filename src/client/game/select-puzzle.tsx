import { Button, MenuItem } from "@blueprintjs/core";
import type { ItemRenderer } from "@blueprintjs/select";
import { Select } from "@blueprintjs/select";
import { post } from "../api";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { puzzles } from "../../server/game/puzzles";
import { Puzzle } from "../../common/chess";

let [selectedPuzzle, setSelectedPuzzle] = useState(0);

const renderPuzzleOptions: ItemRenderer<number> = (
    puzzleId,
    { modifiers, handleFocus, handleClick },
) => {
    const puzzle = puzzles[puzzleId];

    return (
        <MenuItem
            key={puzzle.name}
            active={modifiers.active}
            roleStructure="listoption"
            text={puzzle.name}
            onFocus={handleFocus}
            onClick={handleClick}
        />
    );
};

type SelectPuzzleProps = {
    onPuzzleSelected: (puzzle: number) => void;
}

export function SelectPuzzle(props: SelectPuzzleProps) {
    const navigate = useNavigate();
    const hasSelection = selectedPuzzle !== undefined;

    const submit = (
        <Button
            text="Play"
            icon="arrow-right"
            intent="primary"
            onClick={async () => {
                if (selectedPuzzle) {
                    const promise = post("/start-puzzle-game", {
                        puzzle: String(selectedPuzzle)
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
            <Select<number>
                items={[...Array(puzzles.length).keys()]}
                itemRenderer={renderPuzzleOptions}
                onItemSelect={props.onPuzzleSelected}
                filterable={false}
                popoverProps={{ minimal: true }}
            >
                <Button
                    text={
                        hasSelection ?
                            puzzles[selectedPuzzle].name
                        :   "Select a puzzle..."
                    }
                    endIcon="double-caret-vertical"
                />
            </Select>
            {submit}
        </>
    );
}
