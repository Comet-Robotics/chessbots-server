import { NonIdealState, Spinner } from "@blueprintjs/core";
import { SetupBase } from "./setup-base";
import { useNavigate, Navigate } from "react-router-dom";
import { useSocket, useEffectQuery, get } from "../api";
import { MessageType } from "../../common/message";
import { ClientType } from "../../common/chess";

/**
 * check for an active game and waits for one or forwards to setup
 *
 * @returns a setup base with the loading screen or a redirect to /game
 */
export function Lobby() {
    const { isPending, data } = useEffectQuery("client-information", () =>
        get("/client-information"),
    );
    const navigate = useNavigate();

    // use a socket to wait for game started
    useSocket((message) => {
        if (message.type == MessageType.GAME_STARTED ) {
            console.log("navmav1")
            navigate("/game");
        }
    });

    // show a loading screen if the message is pending
    if (isPending) {
        return (
            <SetupBase>
                <NonIdealState
                    icon={<Spinner intent="primary" />}
                    title="Loading..."
                />
            </SetupBase>
        );
    }

    // navigate to setup if the client is a host, or show a loading screen if waiting
    if (data.clientType === ClientType.HOST) {
        return <Navigate to="/setup" />;
    } else {
        return (
            <SetupBase>
                <>
                    <NonIdealState
                        title={
                            data.clientType === ClientType.CLIENT ?
                                "Waiting For Host to Start"
                            :   "Waiting in line"
                        }
                        icon={<Spinner intent="primary" />}
                    />
                    <div
                        style={{
                            alignItems: "center",
                            display: "flex",
                            flex: "1 0 auto",
                            flexDirection: "column",
                            justifyContent: "space-around",
                        }}
                    >
                    </div>
                </>
            </SetupBase>
        );
    }
}
