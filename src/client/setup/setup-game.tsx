import { Button, H3, H6, Slider } from "@blueprintjs/core";
import type { Dispatch } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Difficulty, GameType, BLACK, Side, WHITE } from "../../common/chess";
import { post } from "../api";
import { DifficultySlider } from "./difficulty-slider";
import { SelectSide } from "./select-side";
/** User's desired side, b/w/random */
enum DesiredSide {
    WHITE = "white",
    BLACK = "black",
    RANDOM = "random",
}

interface SetupGameProps {
    gameType: GameType;
}

/**
 * Creates the dialog for setting up human and computer games
 *
 * @param props - the chosen game type
 * @returns setup dialog as a div
 */
export function SetupGame(props: SetupGameProps) {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState(Difficulty.BEGINNER);
    const [desiredSide, setDesiredSide] = useState<DesiredSide>(
        DesiredSide.WHITE,
    );

    /**
     * create the difficulty slide if the game type is computer
     */
    const difficultySlider =
        props.gameType === GameType.COMPUTER ?
            <DifficultySlider
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
            />
        :   null;

    /** the select side dropdown */
    const selectSide = (
        <SelectSide
            desiredSide={desiredSide}
            onDesiredSideChange={setDesiredSide}
        />
    );
    /** difficulty and side buttons */
    const options = (
        <>
            {difficultySlider}
            {selectSide}
        </>
    );

    // the title for the dialog
    const title =
        props.gameType === GameType.COMPUTER ?
            "Play Against the Computer"
        :   "Setup Game";

    // handles passing user choices to the api
    const submit = (
        <Button
            text="Play"
            icon="arrow-right"
            intent="primary"
            onClick={async () => {
                // convert the side selected to the side enum
                let selectedSide: Side;
                if (desiredSide === DesiredSide.RANDOM) {
                    selectedSide =
                        Math.random() < 0.5 ? WHITE : BLACK;
                } else {
                    selectedSide =
                        desiredSide === DesiredSide.WHITE ?
                            WHITE
                        :   BLACK;
                }

                // pass the user choice to api
                let promise: Promise<unknown>;
                if (props.gameType === GameType.COMPUTER) {
                    promise = post("/start-computer-game", {
                        side: selectedSide,
                        difficulty: difficulty.toString(),
                    });
                } else if (props.gameType === GameType.HUMAN) {
                    promise = post("/start-human-game", {
                        side: selectedSide,
                    });
                } else {
                    promise = post("/start-hexapawn-game", {
                        side: selectedSide,
                    });
                }
                promise.then(() => {
                                console.log("navmav2")

                    navigate("/game");
                });
            }}
        />
    );

    return (
        <div
            style={{
                alignItems: "center",
                display: "flex",
                flex: "1 0 auto",
                flexDirection: "column",
                justifyContent: "space-around",
            }}
        >
            <H3>{title}</H3>
            {options}
            {submit}
        </div>
    );
}





