import { useState } from "react";
import { SetupBase } from "../setup/setup-base";
import { SelectPuzzle } from "./select-puzzle";
import { NonIdealState, Spinner } from "@blueprintjs/core";
import { get, useEffectQuery } from "../api";
import { Navigate } from "react-router-dom";
import type { PuzzleComponents } from "../../server/api/puzzles";

export function SetupPuzzle() {
    const [selectedPuzzle, setSelectedPuzzle] = useState<string | undefined>();

    //get puzzles from api
    const { isPending, data, isError } = useEffectQuery(
        "get-puzzles",
        async () =>
            (await get("/get-puzzles")) as Record<string, PuzzleComponents>,
        false,
    );

    if (isPending) {
        return (
            <NonIdealState
                icon={<Spinner intent="primary" />}
                title="Loading..."
            />
        );
    } else if (isError || data === undefined) {
        return <Navigate to="/home" />;
    }

    return (
        <SetupBase>
            <SelectPuzzle
                puzzles={data}
                selectedPuzzle={selectedPuzzle}
                onPuzzleSelected={setSelectedPuzzle}
            />
        </SetupBase>
    );
}
