import type WebSocket from "ws";
import type { Message } from "../../common/message/message";

/**
 * A class which maps player client ids to their corresponding websocket (if any).
 */
export class SocketManager {
    constructor(private sockets: Record<string, Set<WebSocket>>) {}

    public registerSocket(id: string, socket: WebSocket): void {
        if (this.sockets[id] === null || this.sockets[id] === undefined) {
            this.sockets[id] = new Set<WebSocket>();
        }
        console.log(`Id is: ${id}`);
        this.sockets[id].add(socket);
    }

    /**
     * deletes the socket at the provided id
     * @param id - id to be deleted
     */
    public handleSocketClosed(id: string, socket: WebSocket): void {
        // find if the socket exists and is in the set for that user
        if (this.sockets[id] && this.sockets[id].has(socket)) {
            // if so, KILL IT!
            this.sockets[id].delete(socket);
            return;
        }
    }

    /**
     * gets the socket at the provided id, which may be multiple if they have multiple tabs open
     * @param id - id of the desired socket
     */
    public getSockets(id: string): Set<WebSocket> | undefined {
        if (this.sockets[id]) return this.sockets[id];
        return undefined;
    }

    /**
     * get the total number of connected sockets
     * @returns the number of sockets
     */
    public getSocketCount(): number {
        return Object.keys(this.sockets).length;
    }

    /**
     * Sends a message to a socket with the specified id.
     * Returns true if the message was sent successfully, and false otherwise.
     */
    public sendToSocket(id: string, message: Message): boolean {
        const sockets = this.getSockets(id);
        if (sockets !== undefined) {
            for (const socket of sockets) socket.send(message.toJson());
            return true;
        }
        return false;
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
                socket.send(message.toJson());
            }
        }
        return true;
    }
}
