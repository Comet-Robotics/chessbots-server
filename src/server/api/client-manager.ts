import { WebSocket } from "ws";
import { SocketManager } from "./socket-manager";
import { ClientType } from "../../common/client-types";
import { Message } from "../../common/message/message";

/**
 * A class which maps client ids to their corresponding sockets (if any).
 */
export class ClientManager {
    constructor(
        private socketManager: SocketManager,
        private hostId?: string,
        private clientId?: string,
        private spectatorIds: Set<string> = new Set([]),
    ) {}

    public getHostSocket(): WebSocket | undefined {
        if (this.hostId !== undefined) {
            return this.socketManager.getSocket(this.hostId);
        }
        return undefined;
    }

    public sendToHost(message: Message): boolean {
        const socket = this.getHostSocket();
        if (socket !== undefined) {
            socket.send(message.toJson());
        }
        return socket !== undefined;
    }

    public sendToClient(message: Message): boolean {
        const socket = this.getClientSocket();
        if (socket !== undefined) {
            socket.send(message.toJson());
        }
        return socket !== undefined;
    }

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

    public getClientSocket(): WebSocket | undefined {
        if (this.clientId !== undefined) {
            return this.socketManager.getSocket(this.clientId);
        }
        return undefined;
    }

    public getClientType(id: string): ClientType {
        if (id === this.hostId) {
            return ClientType.HOST;
        } else if (id === this.clientId) {
            return ClientType.CLIENT;
        }
        return ClientType.SPECTATOR;
    }

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
        return id === this.hostId || id === this.clientId;
    }

    public getIds(): undefined | string[] {
        if (this.hostId !== undefined && this.clientId !== undefined) {
            return [this.hostId, this.clientId];
        } else {
            return;
        }
    }
}

export function makeClientManager(socketManager: SocketManager): ClientManager {
    return new ClientManager(socketManager);
}
