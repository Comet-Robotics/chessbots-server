import { FULL_ROTATION, RADIAN, clampHeading } from "../utils/units";
import { Position, ZERO_POSITION } from "./position";
import { GridIndices } from "./grid-indices";
import { tcpServer } from "../api/api";
import type { BotTunnel } from "../api/tcp-interface";
import { PacketType } from "../utils/tcp-packet";

/**
 * Represents a robot.
 * Includes information about the current location as well as tooling for communication.
 */
export class Robot {
    private _headingRadians: number;

    constructor(
        public readonly id: string,
        /**
         * The location the robot lives in when its not in use.
         */
        public readonly homeIndices: GridIndices,
        public readonly defaultIndices: GridIndices,
        public readonly startHeadingRadians: number = 0,
        private _position: Position = ZERO_POSITION,
    ) {
        this._headingRadians = startHeadingRadians;
    }

    public get position(): Position {
        return this._position;
    }

    private set position(coords: Position) {
        this._position = coords;
    }

    public get headingRadians(): number {
        return this._headingRadians;
    }

    private set headingRadians(headingRadians: number) {
        this._headingRadians = headingRadians;
    }

    /**
     * @param headingRadians - An absolute heading to turn to, in radians. 0 is up (from white to black). CW is positive.
     */
    public async absoluteRotate(headingRadians: number): Promise<void> {
        const delta1: number = headingRadians - this.headingRadians;
        let delta2: number;
        if (this.headingRadians < headingRadians) {
            delta2 = headingRadians - (this.headingRadians + FULL_ROTATION);
        } else {
            delta2 = headingRadians + FULL_ROTATION - this.headingRadians;
        }
        const turnAmount =
            Math.abs(delta1) < Math.abs(delta2) ? delta1 : delta2;
        this.headingRadians = headingRadians;
        return this.sendTurnPacket(turnAmount);
    }

    /**
     * @param deltaHeadingRadians - A relative heading to turn by, in radians.
     */
    public async relativeRotate(deltaHeadingRadians: number): Promise<void> {
        this.headingRadians = clampHeading(
            this.headingRadians + deltaHeadingRadians,
        );
        return this.sendTurnPacket(deltaHeadingRadians);
    }

    /**
     * Turns and drives the robot to `this.position + deltaPosition`.
     * @param deltaPosition - The amount to offset the current position by.
     */
    public async relativeMove(deltaPosition: Position): Promise<void> {
        // NOTE: the implementation of this is wrong. it doesn't work properly but it is not needed for now so just ignoring. if someone wants to use this in the future, we can fix it but we probably won't need it in the future anyway (or at least that is what Dylan says)
        const offset = deltaPosition.sub(this.position);
        const distance = Math.hypot(offset.x, offset.y);
        const angle = clampHeading(Math.atan2(-offset.x, offset.y) * RADIAN);
        const promise = this.absoluteRotate(angle).then(() => {
            return this.sendDrivePacket(distance);
        });
        this.position = this.position.add(deltaPosition);
        return promise;
    }

    protected getTunnel(): BotTunnel {
        return tcpServer!.getTunnelFromId(this.id);
    }

    /**
     * Send a packet to the robot indicating angle to turn. Returns a promise that finishes when the
     * robot finishes the action.
     *
     * @param deltaHeadingRadians - A relative heading to turn by, in radians. May be positive or negative.
     */
    public async sendTurnPacket(deltaHeadingRadians: number): Promise<void> {
        const tunnel = this.getTunnel();
        const promise = tunnel.waitForActionResponse();
        tunnel.send({
            type: PacketType.TURN_BY_ANGLE,
            deltaHeadingRadians: deltaHeadingRadians,
        });
        return promise;
    }

    /**
     * Send a packet to the robot indicating distance to drive. Returns a promise that finishes when the
     * robot finishes the action.
     *
     * @param tileDistance - The distance to drive forward or backwards by. 1 is defined as the length of a tile.
     */
    public async sendDrivePacket(tileDistance: number): Promise<void> {
        const tunnel = this.getTunnel();
        const promise = tunnel.waitForActionResponse();
        tunnel.send({ type: PacketType.DRIVE_TILES, tileDistance });
        return promise;
    }
}
