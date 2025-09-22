import { Navigate } from "react-router-dom";
import { get, useEffectQuery } from "./api.js";
import { NonIdealState, Spinner } from "@blueprintjs/core";

/**
 * The home route.
 *
 * Redirects to /game or /lobby automatically based on whether there is an active game.
 */
export function Home() {
    const { isPending, data } = useEffectQuery("client-information", () =>
        get("/client-information"),
    );

    // show loading if the message is pending
    if (isPending) {
        return (
            <NonIdealState
                icon={<Spinner intent="primary" />}
                title="Loading..."
            />
        );
    }

    return <Navigate to={data.isGameActive ? "/game" : "/lobby"} />;
}
