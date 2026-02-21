import type { WebSocket } from "ws";
import type { SocketManager } from "./socket-manager";
import { ClientType } from "../../common/client-types";
import type { Message } from "../../common/message/message";

/**
 * A class which maps player client ids to their corresponding websocket (if any).
 *
 * gets, sends, and assigns client information
 */
export class ClientManager {
    constructor(
        private socketManager: SocketManager,
        private hostId?: string,
        private clientId?: string,
        private spectatorIds: Set<string> = new Set([]),
    ) {}

    /**
     * get the host's socket
     * @returns the host socket
     */
    public getHostSocket(): Set<WebSocket> | undefined {
        if (this.hostId !== undefined) {
            return this.socketManager.getSockets(this.hostId);
        }
        return undefined;
    }

    /**
     * finds the host and sends a message
     * @param message - the message to be sent
     * @returns if the socket was found
     */
    public sendToHost(message: Message): boolean {
        const sockets = this.getHostSocket();
        if (sockets !== undefined) {
            for (const socket of sockets) socket.send(message.toJson());
        }
        return sockets !== undefined;
    }

    /**
     * finds the client and sends a message
     * @param message - the message to be sent
     * @returns if the socket was found
     */
    public sendToClient(message: Message): boolean {
        const sockets = this.getClientSocket();
        if (sockets !== undefined) {
            for(const socket of sockets) socket.send(message.toJson());
        }
        return sockets !== undefined;
    }

    /**
     * send an update message to all spectators
     * @param message - the message to send
     * @returns if it completed successfully
     */
    public sendToSpectators(message: Message): boolean {
        if (this.spectatorIds.size !== 0) {
            for (const item of this.spectatorIds) {
                const potentialSocket = this.socketManager.getSockets(item)
                if (potentialSocket != null) {
                    for (const socket of potentialSocket)
                    {
                        socket.send(message.toJson());
                    }
                }
            }
            return true;
        }
        return false;
    }

    /**
     * get the client socket
     * @returns the socket of the client
     */
    public getClientSocket(): Set<WebSocket> | undefined {
        if (this.clientId !== undefined) {
            return this.socketManager.getSockets(this.clientId);
        }
        return undefined;
    }

    /**
     * @param id - the cookie id of the request
     * @returns the client type
     */
    public getClientType(id: string): ClientType {
        if (id === this.hostId) {
            return ClientType.HOST;
        } else if (id === this.clientId) {
            return ClientType.CLIENT;
        }
        return ClientType.SPECTATOR;
    }

    /**
     * assigns the passed id to either host/client
     * @param id - the cookie id of the request
     */
    public assignPlayer(id: string): void {
        if (this.hostId === undefined || id === this.hostId) {
            this.hostId = id;
        } else if (this.clientId === undefined || id === this.clientId) {
            this.clientId = id;
        } else {
            this.spectatorIds.add(id);
        }
    }

    public removeHost(): void {
        this.hostId = undefined;
    }

    public removeClient(): void {
        this.clientId = undefined;
    }

    public removeSpectator(id: string): void {
        this.spectatorIds.delete(id);
    }

    public isPlayer(id: string): boolean {
        console.log(
            `Id passed in is ${id}, host id is ${this.hostId}, and client id is ${this.clientId}`,
        );
        return id === this.hostId || id === this.clientId;
    }

    /**
     * gets the ids of all currently connected clients
     * @returns - list of ids, if available
     */
    public getIds(): undefined | [string, string] {
        if (this.hostId !== undefined && this.clientId !== undefined) {
            return [this.hostId, this.clientId];
        } else {
            return;
        }
    }
}

/**
 * a function to create a client manager from a socket manager, not currently used in code
 * @param socketManager - manages the client sockets
 * @returns a new client manager
 */
export function makeClientManager(socketManager: SocketManager): ClientManager {
    return new ClientManager(socketManager);
}
