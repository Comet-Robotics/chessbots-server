import { type EventEmitter } from "@posva/event-emitter";
import { jsonToPacket, type Packet, type PacketWithId } from "../utils/tcp-packet";

export abstract class BotTunnel {
    connected: boolean = false;
    dataBuffer: Buffer | undefined;

    abstract isActive(): boolean;
    abstract getIdentifier(): string;

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
            this.processPacket(packet);
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

    abstract processPacket(packet: PacketWithId);
    /**
     * send packets to robot. promise resolves when the robot acknowledges that the action is complete
     * @param packet - packet to send
     * @returns - the packet id
     */
    abstract send(packet: Packet): Promise<string>;
}

export type RobotEventEmitter = EventEmitter<{
    actionComplete: {
        success: boolean;
        packetId: string;
        reason?: string;
    };
}>;
