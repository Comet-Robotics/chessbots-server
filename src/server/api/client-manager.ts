import { WebSocket } from "ws";
import { SocketManager } from "./socket-manager";
import { ClientType } from "../../common/client-types";
import { Message } from "../../common/message/message";

/**
 * A class which maps client ids to their corresponding sockets (if any).
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
    public getHostSocket(): WebSocket | undefined {
        if (this.hostId !== undefined) {
            return this.socketManager.getSocket(this.hostId);
        }
        return undefined;
    }

    /**
     * finds the host and sends a message
     * @param message - the message to be sent
     * @returns if the socket was found
     */
    public sendToHost(message: Message): boolean {
        const socket = this.getHostSocket();
        if (socket !== undefined) {
            socket.send(message.toJson());
        }
        return socket !== undefined;
    }

    /**
     * finds the client and sends a message
     * @param message - the message to be sent
     * @returns if the socket was found
     */
    public sendToClient(message: Message): boolean {
        const socket = this.getClientSocket();
        if (socket !== undefined) {
            socket.send(message.toJson());
        }
        return socket !== undefined;
    }

    /**
     * send an update message to all spectators
     * @param message - the message to send
     * @returns if it completed successfully
     */
    public sendToSpectators(message: Message): boolean {
        if (this.spectatorIds.size !== 0) {
            for (const item of this.spectatorIds) {
                if (this.socketManager.getSocket(item))
                    this.socketManager.getSocket(item).send(message.toJson());
            }
            return true;
        }
        return false;
    }

    /**
     * get the client socket
     * @returns the socket of the client
     */
    public getClientSocket(): WebSocket | undefined {
        if (this.clientId !== undefined) {
            return this.socketManager.getSocket(this.clientId);
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

    /**
     * gets the ids of all currently connected clients
     * @returns - list of ids, if available
     */
    public getIds(): undefined | [string, string] {
        if (this.hostId && this.clientId) {
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
