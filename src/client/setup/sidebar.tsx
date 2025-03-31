import { Button, NonIdealState, Spinner } from "@blueprintjs/core";
import { Dispatch, useState } from "react";
import { MessageHandler } from "../../common/message/message";
import { JoinQueue, UpdateQueue } from "../../common/message/game-message";
import { get, useEffectQuery, useSocket } from "../api";

function getMessageHandler(setQueue: Dispatch<string[]>): MessageHandler {
    return (message) => {
        if (message instanceof UpdateQueue) {
            setQueue(message.queue.slice());
        }
    };
}

interface sidebarProps {
    top?: number | undefined;
}

/**
 * Creates a sidebar to hold the queue elements
 * @returns sidebar container
 */
export function Sidebar(props: sidebarProps): JSX.Element {
    const [queue, setQueue] = useState<string[]>([]);
    const [name, setName] = useState<string>(
        "player " + Math.floor(Math.random() * 10000),
    );

    const sendMessage = useSocket(getMessageHandler(setQueue));
    const { isPending, data, isError } = useEffectQuery(
        "get-queue",
        async () => {
            return get("/get-queue").then((newQueue) => {
                setQueue(newQueue);
                return newQueue;
            });
        },
        true,
    );

    const names = useEffectQuery(
        "get-name",
        async () => {
            return get("/get-name").then((name) => {
                if (name.message) setName(name.message);
                return name;
            });
        },
        true,
    );

    if (names.isError) {
        console.log(names.isError);
    }
    //ts wanted me to do something with my data
    data;
    if (isPending || names.isPending) {
        return <NonIdealState />;
    } else if (isError) {
        console.log(isError);
    }

    return (
        <div
            className="sidebar flex-container"
            style={{ paddingTop: props.top }}
        >
            <h3>Player Queue</h3>
            <ul style={{ listStyle: "decimal" }}>
                {queue.map(function (data) {
                    return <li key={data}>{data}</li>;
                })}
            </ul>
            <div className="button-container">
                <label>Name:</label>
                <input
                    value={name}
                    maxLength={30}
                    onChange={(e) => setName(e.target.value)}
                />
                <Button
                    type="submit"
                    style={{ textAlign: "start" }}
                    onClick={async () => {
                        sendMessage(new JoinQueue(name));
                    }}
                >
                    Join queue
                </Button>
            </div>
        </div>
    );
}
