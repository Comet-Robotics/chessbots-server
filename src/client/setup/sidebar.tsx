import { Button, NonIdealState } from "@blueprintjs/core";
import type { Dispatch } from "react";
import { useState } from "react";
import type { MessageHandler } from "../../common/message/message";
import { JoinQueue, UpdateQueue } from "../../common/message/game-message";
import { get, useEffectQuery, useSocket } from "../api";
import {
    bgColor,
    buttonColor,
    textBoxColor,
    textColor,
} from "../check-dark-mode";

function getMessageHandler(setQueue: Dispatch<string[]>): MessageHandler {
    return (message) => {
        if (message instanceof UpdateQueue) {
            setQueue(message.updatedPlayerList.slice());
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

    const { isPending, isError } = useEffectQuery(
        "get-queue",
        async () => {
            const newQueue = await get("/get-queue");
            setQueue(newQueue);
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
    if (isPending || names.isPending) {
        return <NonIdealState />;
    } else if (isError) {
        console.log(isError);
    }

    return (
        <div
            className={"sidebar flex-container " + bgColor()}
            style={{ paddingTop: props.top }}
        >
            <h3 className={textColor()}>Player Queue</h3>
            <ul style={{ listStyle: "decimal" }}>
                {queue.map(function (data) {
                    return (
                        <li className={textColor()} key={data}>
                            {data}
                        </li>
                    );
                })}
            </ul>
            <div className={"button-container"}>
                <label className={textColor()}>Name:</label>
                <input
                    className={textBoxColor() + " " + textColor()}
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
                    className={buttonColor()}
                >
                    Join queue
                </Button>
            </div>
        </div>
    );
}
