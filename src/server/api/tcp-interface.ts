import * as net from "node:net";
import config from "./bot-server-config.json";
import {
    type Packet,
    SERVER_PROTOCOL_VERSION,
    jsonToPacket,
    packetToJson,
    PacketType,
} from "../utils/tcp-packet";
import { EventEmitter } from "@posva/event-emitter";
import { randomUUID } from "node:crypto";
import { RobotManager } from "../robot/robot-manager";

type RobotEventEmitter = EventEmitter<{
    actionComplete: {
        success: boolean;
        packetId: string;
        reason?: string;
    };
}>;

/**
 * The tunnel for handling communications to the robots
 */
export class BotTunnel {
    connected: boolean = false;
    dataBuffer: Buffer | undefined;
    address: string | undefined;
    id: string | undefined;
    emitter: RobotEventEmitter;

    /**
     * take the robot socket and creates an emitter to notify dependencies
     *
     * @param socket - socket of the incoming connections
     * @param onHandshake - handshake handler
     */
    constructor(
        private socket: net.Socket | null,
        private onHandshake: (packetContent: string) => void,
    ) {
        this.emitter = new EventEmitter();
    }

    isActive() {
        return this.socket!.readyState === "open";
    }

    /**
     * get the most relevant identifier possible
     *
     * @returns - a robot identifier
     */
    getIdentifier(): string {
        if (this.id !== undefined) {
            return "ID: " + this.id;
        } else if (this.address !== undefined) {
            return "MAC Address: " + this.address;
        } else if (this.socket!.remoteAddress !== undefined) {
            return "IP: " + this.socket!.remoteAddress;
        } else {
            return "Unnamed Robot";
        }
    }

    /**
     * log when data comes in
     * @param data - the incoming data
     */
    async onData(data: Buffer) {
        console.log(
            "connection data from %s: %j",
            this.getIdentifier(),
            data.toString(),
        );
        await this.handleData(data);
    }

    /**
     * log errors and update connection status
     * @param err - the error message
     */
    onError(err: Error) {
        console.error(
            "Connection error from %s: %s",
            this.getIdentifier(),
            err,
        );
        this.connected = false;
    }

    /**
     * log when a connection is removed or lost
     */
    onClose() {
        console.log("Lost connection to %s", this.getIdentifier());
        this.connected = false;
    }

    /**
     * Sets up the data buffer for it to be handled by the queue
     *
     * @param data - data to be handled
     */
    async handleData(data: Buffer) {
        console.log("Handling Data");
        console.log("Current Data: ");
        console.log(this.dataBuffer);
        if (this.dataBuffer !== undefined) {
            console.log("Buffer Not Undefined!");
            this.dataBuffer = Buffer.concat([this.dataBuffer, data]);
        } else {
            this.dataBuffer = data;
        }

        await this.handleQueue();
    }

    /**
     * handles the incoming data and check if it is valid
     *
     * emits result for further handling
     *
     * @returns - nothing if nothing happened and nothing if something happened
     */
    async handleQueue() {
        if (this.dataBuffer === undefined || this.dataBuffer.length < 3) {
            return;
        }

        // get the data and find the terminator
        let str = this.dataBuffer.toString();
        const terminator = str.indexOf(";");

        // if there is no terminator, wait for it
        if (terminator === -1) {
            if (str.length > 200) {
                // Invalid state, reset buf
                this.dataBuffer = undefined;
            }

            // Continue waiting for rest of packet
            return;
        }

        str = str.substring(0, terminator);

        // check if the buffer is the correct length based on where the terminator is
        if (this.dataBuffer.length > terminator) {
            this.dataBuffer = this.dataBuffer.subarray(terminator + 1);
        } else {
            this.dataBuffer = undefined;
        }

        console.log("Current String: ");
        console.log(str);

        try {
            const packet = jsonToPacket(str);
            const { packetId } = packet;
            console.log("Received Packet");

            // Parse packet based on type
            switch (packet.type) {
                // register new robot
                case "CLIENT_HELLO": {
                    this.onHandshake(packet.macAddress);
                    await this.send(this.makeHello(packet.macAddress));
                    this.connected = true;
                    break;
                }
                // respond to pings
                case "PING_SEND": {
                    await this.send({ type: PacketType.PING_RESPONSE });
                    break;
                }
                // emit a action complete for further processing
                case PacketType.ACTION_SUCCESS: {
                    this.emitter.emit("actionComplete", {
                        success: true,
                        packetId,
                    });
                    break;
                }
                // emit a action fail for further processing
                case PacketType.ACTION_FAIL: {
                    this.emitter.emit("actionComplete", {
                        success: false,
                        reason: packet.reason,
                        packetId,
                    });
                    break;
                }
            }
        } catch (e) {
            console.warn("Received invalid packet with error", e);
        }

        // Handle next message if the data buffer has another one
        if (
            this.dataBuffer !== undefined &&
            this.dataBuffer.indexOf(";") !== -1
        ) {
            await this.handleQueue();
        }
    }

    /**
     * send packets to robot. promise resolves when the robot acknowledges that the action is complete
     * @param packet - packet to send
     * @returns - the packet id
     */
    async send(packet: Packet): Promise<string> {
        const packetId = randomUUID();

        const str = packetToJson(packet, packetId);
        const msg = str + ";";

        // If the connection isn't active, there is no robot
        if (!this.isActive()) {
            console.error(
                "Connection to",
                this.getIdentifier(),
                "is inactive, failed to write",
                msg,
            );
            // throw new Error(
            //     "Cannot send packet to inactive connection: " +
            //         this.getIdentifier(),
            // );
        }

        console.log({ msg });

        // Packets that don't need to be waited on for completion
        const EXCLUDED_PACKET_TYPES = [PacketType.SERVER_HELLO];

        return new Promise((res, rej) => {
            if (EXCLUDED_PACKET_TYPES.includes(packet.type)) {
                this.socket!.write(msg);
                res(packetId);
            } else {
                const removeListener = this.emitter.on(
                    "actionComplete",
                    (args) => {
                        if (args.packetId !== packetId) return;
                        removeListener();
                        console.log("action complete", args);
                        if (args.success) res(args.packetId);
                        else rej(args.reason);
                    },
                );

                this.socket!.write(msg);
            }
        });
    }

    makeHello(mac: string): Packet {
        // Map of config nodes to send over
        // n: name, v: value
        const configEntries = {};

        // Where a bot has a specific config changed, like a different encoder multiplier or pin location
        const overrides =
            (config[config.bots[mac]] ?? { attributes: {} })["attributes"] ??
            {};

        for (const i of config.botConfigSchema) {
            if (i.name in overrides) {
                configEntries[i.name] = overrides[i.name];
            }
        }

        const ret: Packet = {
            type: PacketType.SERVER_HELLO,
            protocol: SERVER_PROTOCOL_VERSION,
            config: configEntries,
        };

        console.error(JSON.stringify(ret));

        return ret;
    }
}

/**
 * Handles tcp tunnels and maintains a list of connections
 */
export class TCPServer {
    private server: net.Server;

    /**
     * creates a tcp server on port from server config and registers passed in ids with their corresponding bot tunnels
     *
     * when a robot connects, bind it to the server
     *
     * @param connections - bot connections in a id:BotTunnel array
     */
    constructor(
        private connections: { [id: string]: BotTunnel } = {},
        private robotManager: RobotManager,
    ) {
        this.server = net.createServer();
        this.server.on("connection", this.handleConnection.bind(this));
        this.server.listen(config["tcpServerPort"], "0.0.0.0", () => {
            console.log(
                "TCP bot server listening to %j",
                this.server.address(),
            );
        });
    }

    /**
     * When a robot connects, add the tunnel to the robot connections at its id
     *
     * assign a random id to new robots
     *
     * @param socket - the incoming connection socket information
     */
    private handleConnection(socket: net.Socket) {
        const remoteAddress = socket.remoteAddress + ":" + socket.remotePort;
        console.log("New client connection from %s", remoteAddress);
        socket.setNoDelay(true);

        // create a new bot tunnel for the connection
        const tunnel = new BotTunnel(
            socket,
            ((mac: string) => {
                // add the new robot to the array if it isn't in bots config
                console.log("Adding robot with mac", mac, "to arr");
                let id: string;
                if (!(mac in config["bots"])) {
                    id = `unknown-robot-${randomUUID()}`;
                    console.log(
                        "Address not found in config! Assigning random ID: " +
                            id,
                    );
                    config["bots"][mac] = id;
                } else {
                    id = config["bots"][mac];
                    if (!(id in this.robotManager.idsToRobots)) {
                        this.robotManager.createRobotFromId(id);
                    }
                    console.log("Found address ID: " + id);
                }
                tunnel.id = id;
                tunnel.address = mac;
                this.connections[id] = tunnel;
            }).bind(this),
        );

        // bind the sockets to the corresponding functions
        socket.on("data", tunnel.onData.bind(tunnel));
        socket.once("close", tunnel.onClose.bind(tunnel));
        socket.on("error", tunnel.onError.bind(tunnel));
    }

    /**
     * get the robot tunnel based on the robot id string
     * @param id - id string
     * @returns - tcp tunnel
     */
    public getTunnelFromId(id: string): BotTunnel {
        return this.connections[id];
    }

    /**
     * get a list of connected ids
     * @returns - list of id keys
     */
    public getConnectedIds(): string[] {
        return Object.keys(this.connections);
    }
}
