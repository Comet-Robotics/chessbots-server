import useWebSocket from "react-use-websocket";
import type {
    Message,
    SendMessage,
    MessageHandler,
} from "../common/message/message";
import { RegisterWebsocketMessage } from "../common/message/message";
import { useId, useMemo } from "react";
import { parseMessage } from "../common/message/parse-message";
import { useQuery } from "@tanstack/react-query";

/**
 * A wrapper around `useQuery` which causes the wrapped query to be trigged once each time the page renders.
 */
export function useEffectQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    retry?: boolean | number,
) {
    // id guarantees query is the same every time
    const id = useId();
    return useQuery({
        queryKey: [queryKey, id],
        queryFn,
        // Prevents query from refetching in the background
        staleTime: Infinity,
        retry: retry ?? 1,
    });
}

/**
 * The URL to use for connecting to the websocket backend.
 */
const USE_SSL = window.location.protocol === "https:";
const WS_PROTOCOL = USE_SSL ? "wss" : "ws";
const WEBSOCKET_URL = `${WS_PROTOCOL}://${new URL(window.location.href).host}/ws`;

/**
 * A custom hook which allows using a websocket to connect to the server.
 *
 * @param onMessage - A function which gets invoked each time a message is received.
 * @param onOpen - A function which gets invoked when the socket is opened.
 * @returns A function which can be used to send messages.
 */
export function useSocket(
    onMessage?: MessageHandler,
    onOpen?: () => void,
): SendMessage {
    // handle sending a message and opening it
    const { sendMessage } = useWebSocket(WEBSOCKET_URL, {
        onOpen: () => {
            console.log("Connection established");
            sendMessage(new RegisterWebsocketMessage().toJson());
            if (onOpen !== undefined) {
                onOpen();
            }
        },
        // handle what to do with the message
        onMessage: (msg: MessageEvent) => {
            const message = parseMessage(msg.data.toString());
            console.log("Handle message: " + message.toJson());

            if (onMessage !== undefined) {
                onMessage(message);
            }
        },
        share: true,
    });

    // handle how a message is sent
    const sendMessageHandler = useMemo(() => {
        return (message: Message) => {
            console.log("Sending message: " + message.toJson());
            sendMessage(message.toJson());
        };
    }, [sendMessage]);
    return sendMessageHandler;
}

/**
 * Makes a post request to the backend.
 *
 * @param apiPath - The path to post to. Should generally include a leading slash.
 */
export async function post(
    apiPath: string,
    query: Record<string, string> = {},
    body: object = {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    try {
        // run a post to the provided api path with the provided query
        let normalizedUrl = `/api${apiPath}`;
        if (query) {
            normalizedUrl += `?${new URLSearchParams(query)}`;
        }
        return fetch(normalizedUrl, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }).then((response) => {
            if (!response.ok) {
                // switch to catch flow
                throw new Error("Invalid response");
            }
            return response.json();
        });
    } catch (error) {
        return Promise.reject(error);
    }
}

/**
 * Makes a get request to the backend.
 *
 * @param apiPath - The path to post to. Should generally include a leading slash.
 */
export async function get(
    apiPath: string,
    query: Record<string, string> = {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    try {
        const normalizedUrl = `/api${apiPath}?${new URLSearchParams(query)}`;
        return fetch(normalizedUrl, {
            method: "GET",
            mode: "cors",
            headers: { "Content-Type": "application/json" },
        }).then((response) => {
            if (!response.ok) {
                // switch to catch flow
                throw new Error("Invalid response");
            }
            return response.json();
        });
    } catch (error) {
        return Promise.reject(error);
    }
}
