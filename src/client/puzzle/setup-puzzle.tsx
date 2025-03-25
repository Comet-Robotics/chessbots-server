import { useState } from "react";
import { SetupBase } from "../setup/setup-base";
import { SelectPuzzle } from "./select-puzzle";
import { NonIdealState, Spinner } from "@blueprintjs/core";
import { get, useEffectQuery } from "../api";
import { Navigate } from "react-router-dom";

export function SetupPuzzle() {
    const [selectedPuzzle, setSelectedPuzzle] = useState<string | undefined>();

    //get puzzles from api
    const { isPending, data, isError } = useEffectQuery(
        "get-puzzles",
        async () => {
            return get("/get-puzzles").then((puzzles) => {
                return puzzles;
            });
        },
        false,
    );

    if (isPending) {
        return (
            <NonIdealState
                icon={<Spinner intent="primary" />}
                title="Loading..."
            />
        );
    } else if (isError) {
        return <Navigate to="/home" />;
    }

    if (data === undefined) {
        return <Spinner intent="primary" />;
    } else {
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
}
