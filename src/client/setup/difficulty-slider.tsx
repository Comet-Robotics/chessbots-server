import { H6, Slider } from "@blueprintjs/core";
import { Difficulty } from "../../common/chess";
import type { Dispatch } from "react";

interface DifficultySliderProps {
    difficulty: Difficulty;
    onDifficultyChange: Dispatch<Difficulty>;
}

/**
 * Creates a difficulty slider from 0 to 3
 *
 * @param props - difficulty change handler
 * @returns 4 part difficulty slider
 */
export function DifficultySlider(props: DifficultySliderProps) {
    return (
        <>
            <H6>Difficulty</H6>
            <div style={{ width: "75%" }}>
                <Slider
                    intent="primary"
                    value={props.difficulty}
                    onChange={props.onDifficultyChange}
                    // return string based on user chosen value
                    labelRenderer={(value) => {
                        if (value === Difficulty.BABY) {
                            return "Baby";
                        } else if (value === Difficulty.BEGINNER) {
                            return "Beginner";
                        } else if (value === Difficulty.INTERMEDIATE) {
                            return "Intermediate";
                        } else {
                            return "Advanced";
                        }
                    }}
                    min={0}
                    max={3}
                />
            </div>
        </>
    );
}
