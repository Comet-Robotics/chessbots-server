import { RobotManager } from "../../robot/robot-manager";
import { config } from "../config";
import { BotTunnel } from "./bot-tunnel";
import { RealBotTunnel } from "./real-tunnel";

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
        this.server.listen(config.tcpPort, "0.0.0.0", () => {
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
                if (!(mac in config["bots"])) {
                    console.error(`MAC address ${mac} not found in config, ignoring`);
                    return;
                } 

                this.robotManager.createRobot(mac);                

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
                this.robotManager.createRobot(mac).setTunnel(tunnel);
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

export const tcpServer: TCPServer | null = USE_VIRTUAL_ROBOTS ? null : new TCPServer(robotManager);