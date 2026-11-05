import { WebSocket } from "ws";
import type { Message } from "../../common/message";
import { WSContext } from "hono/ws";
import { WebSocketLike } from "@hono/node-server";

/**
 * A class which maps player client ids to their corresponding websocket (if any).
 */
export class SocketManager {
    private sockets: Map<string, WSContext<WebSocketLike>>
    constructor() {
        this.sockets = new Map()
    }

    public registerSocket(id: string, socket: WSContext<WebSocketLike>): void {
        this.sockets[id] = socket;
    }

    /**
     * deletes the socket at the provided id
     * @param id - id to be deleted
     */
    public handleSocketClosed(id: string): void {
       this.sockets.delete(id)
    }

    /**
     * gets the socket at the provided id, which may be multiple if they have multiple tabs open
     * @param id - id of the desired socket
     */
    public getSocket(id: string): WSContext<WebSocketLike> | undefined {
        return this.sockets[id];
    }

    /**
     * Sends a message to a socket with the specified id.
     * Returns true if the message was sent successfully, and false otherwise.
     */
    public sendToSocket(id: string, message: Message): boolean {
        const socket = this.getSocket(id);
        if (!socket) {
            return false
        }

        socket.send(JSON.stringify(message));

        return true;
    }

    /**
     * send a message to all current sockets
     * @param message - message to be sent
     * @returns isSuccessful
     */
    public sendToAll(message: Message): boolean {
        const sockets = Object.values(this.sockets);
        console.log(`Current list of connections are: ${sockets.length}`);
        for (const socketSet of sockets) {
            for (const socket of socketSet) {
                socket.send(JSON.stringify(message));
            }
        }
        return true;
    }
}
