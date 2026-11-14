import type { WebSocket } from "ws";
import type { SocketManager } from "./socket-manager";
import { ClientType } from "../../common/chess";
import type { Message } from "../../common/message";
import { WebSocketLike } from "@hono/node-server";
import { WSContext } from "hono/ws";

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

    public registerUser(uuid: string) {
        console.log(`registering user ${uuid}`)
        if (!this.hostId) {
            this.hostId = uuid 
        } else if (!this.clientId) {
            this.clientId = uuid
        } else {
            this.spectatorIds.add(uuid)
        }
    }

    public getSocket(id: string) {
        return this.socketManager.getSocket(id)
    }
    
    /**
     * get the host's socket
     * @returns the host socket
     */
    /**
     * finds the host and sends a message
     * @param message - the message to be sent
     * @returns if the socket was found
     */
    public sendToHost(message: Message) {
        if (this.hostId) {
            this.socketManager.sendToSocket(this.hostId, message);
        }
    }

    /**
     * finds the client and sends a message
     * @param message - the message to be sent
     * @returns if the socket was found
     */
    public sendToClient(message: Message) {
        if (this.clientId) {
            this.socketManager.sendToSocket(this.clientId, message);
        }
    }

    /**
     * send an update message to all spectators
     * @param message - the message to send
     * @returns if it completed successfully
     */
    public sendToSpectators(message: Message) {
        for (let spectatorId in this.spectatorIds) {
            this.socketManager.sendToSocket(spectatorId, message);
        }
    }

    public sendToAll(message: Message) {
        this.socketManager.sendToAll(message)
    }

    /**
     * @param id - the cookie id of the request
     * @returns the client type
     */
    public getClientType(id: string): ClientType | undefined {
        console.log(`idL ${id}, hostid: ${this.hostId}, clientid: ${this.clientId}`)
        if (id === this.hostId) {
            return ClientType.HOST;
        } else if (id === this.clientId) {
            return ClientType.CLIENT;
        } else if (this.spectatorIds.has(id)) {
            return ClientType.SPECTATOR;
        }
        
        return undefined
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