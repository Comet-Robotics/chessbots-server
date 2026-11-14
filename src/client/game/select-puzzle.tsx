import { Button, MenuItem } from "@blueprintjs/core";
import type { ItemRenderer } from "@blueprintjs/select";
import { Select } from "@blueprintjs/select";
import { post } from "../api";
import { useState } from "react";
import { puzzles } from "../../server/game/puzzles";
import { Puzzle } from "../../common/chess";
import { useNavigate } from "react-router-dom";

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
    playPuzzle: (puzzle: number) => void;
}

export function SelectPuzzle(props: SelectPuzzleProps) {
    let [selectedPuzzle, setSelectedPuzzle] = useState(0);
    const navigate = useNavigate();
    return (
        <>
            <Select<number>
                items={[...Array(puzzles.length).keys()]}
                itemRenderer={renderPuzzleOptions}
                onItemSelect={setSelectedPuzzle}
                filterable={false}
                popoverProps={{ minimal: true }}
            >
                <Button
                    text={puzzles[selectedPuzzle].name}
                    endIcon="double-caret-vertical"
                />
            </Select>
            
            <Button
                text="Play"
                icon="arrow-right"
                intent="primary"
                onClick={()=>{
                    props.playPuzzle(selectedPuzzle);
                    navigate("/game");
                }}
            />
        </>
    );
}
