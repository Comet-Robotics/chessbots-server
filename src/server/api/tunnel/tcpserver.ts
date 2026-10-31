import { RobotManager } from "../../robot/robot-manager";
import { config } from "../config";
import { BotTunnel } from "./bot-tunnel";
import { RealBotTunnel } from "./real-tunnel";
import net from "node:net" 
/**
 * Handles tcp tunnels and maintains a list of connections
 */
export class TCPServer {
    private server: net.Server;
    constructor(
        private robotManager: RobotManager,
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
        console.log(`New client connection from ${socket.remoteAddress}:${socket.remotePort}`);
        socket.setNoDelay(true);

        // create a new bot tunnel for the connection
        const tunnel = new RealBotTunnel(
            socket,
            ((mac: string) => {
                // add the new robot to the array if it isn't in bots config
                console.log(`Adding robot with mac ${mac}, to arr`);
                if (!(mac in config["bots"])) {
                    console.error(`MAC address ${mac} not found in config, ignoring`);
                    return;
                }

                let robotId = this.robotManager.createRobot(mac);                
                tunnel.id = robotId;
                tunnel.address = mac;
                this.robotManager.getRobot(robotId).setTunnel(tunnel);
            }).bind(this),
        );

        // bind the sockets to the corresponding functions
        socket.on("data", tunnel.onData.bind(tunnel));
        socket.once("close", tunnel.onClose.bind(tunnel));
        socket.on("error", tunnel.onError.bind(tunnel));
    }
}

// export const tcpServer: TCPServer | null = USE_VIRTUAL_ROBOTS ? null : new TCPServer(robotManager);