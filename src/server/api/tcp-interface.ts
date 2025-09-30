import * as net from "node:net";
import config from "./bot-server-config.json";
import {
    type Packet,
    type PacketWithId,
    SERVER_PROTOCOL_VERSION,
    packetToJson,
    PacketType,
} from "../utils/tcp-packet";
import { EventEmitter } from "@posva/event-emitter";
import { randomUUID } from "node:crypto";
import { robotManager, type RobotManager } from "../robot/robot-manager";
import {
    MAX_PING_FAIL,
    PING_INTERVAL,
    PING_TIMEOUT,
    USE_VIRTUAL_ROBOTS,
} from "../utils/env";
import { BotTunnel, type RobotEventEmitter } from "./bot-tunnel";
import { waitTime } from "../utils/time";
import { disconnectedBots } from "./managers";
import { pauseGame, unpauseGame } from "./pauseHandler";

/**
 * The tunnel for handling communications to the robots
 */
export class RealBotTunnel extends BotTunnel {
    address: string | undefined;
    id: string | undefined;
    emitter: RobotEventEmitter;
    pingReceived: boolean;

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
        super();
        this.emitter = new EventEmitter();
        this.pingReceived = false;
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

    //waits for an interval, then sends a ping. If it doesn't receive a response, adds it to a count of failures.
    //Too many failures means this bot has disconnected.
    async runPings() {
        let countFailures: number = 0;
        for (;;) {
            await waitTime(PING_INTERVAL);
            if (this.connected) {
                // console.log("SENDING PING!")
                await this.send({ type: PacketType.PING_SEND });
                //wait for a bit to receive result of the ping
                await waitTime(PING_TIMEOUT);

                if (this.pingReceived) {
                    // console.log("PING RECEIVED!")
                    this.pingReceived = false;
                    countFailures = 0;
                } else {
                    // console.log("PING NOT RECEIVED!")
                    countFailures++;
                    if (countFailures === MAX_PING_FAIL) {
                        console.log("AAA A BOT DISCONNECTED! ABORT! ABORT!");

                        if (this.id !== undefined) {
                            robotManager.removeRobot(this.id);
                            disconnectedBots.add(this.id);
                        }

                        //send the pause signal.
                        pauseGame(false);

                        // this.emitter.emit("actionComplete", {
                        //     success: true,
                        //     packetId,
                        // });

                        this.connected = false;
                    }
                }
            } else {
                break;
            }
        }
    }

    async processPacket(packet: PacketWithId) {
        const { packetId } = packet;
        console.log("Received Packet");

        // Parse packet based on type
        switch (packet.type) {
            // register new robot
            case "CLIENT_HELLO": {
                this.onHandshake(packet.macAddress);
                await this.send(this.makeHello(packet.macAddress));
                this.connected = true;
                //get to start running pings.
                this.runPings();
                break;
            }
            // respond to pings
            case "PING_RESPONSE": {
                console.log("WE GOT A PING!");
                this.pingReceived = true;
                // await this.send({ type: PacketType.PING_RESPONSE });
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
            //checks if we are receiving from the bot a response for a ping the server sent.
            //if we are, then we can set pingReceived to true.
            // case PacketType.PING_RESPONSE: {
            // }
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
        const EXCLUDED_PACKET_TYPES = [
            PacketType.SERVER_HELLO,
            PacketType.PING_SEND,
        ];

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
        private robotManager: RobotManager,
        private connections: { [id: string]: BotTunnel } = {},
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
        const tunnel = new RealBotTunnel(
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

                // if there was disconnected bot beforehand, remove it. If no more bots disconnected, send signal to unpause game
                if (id !== undefined && disconnectedBots.has(id)) {
                    disconnectedBots.delete(id);
                    if (disconnectedBots.size === 0) {
                        unpauseGame(false);
                    }
                }

                tunnel.id = id;
                tunnel.address = mac;
                this.connections[id] = tunnel;
                this.robotManager.createRobotFromId(id).setTunnel(tunnel);
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
        console.log("Getting tunnel for id", id);
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

export const tcpServer: TCPServer | null =
    USE_VIRTUAL_ROBOTS ? null : new TCPServer(robotManager);
