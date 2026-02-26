import { FULL_ROTATION, RADIAN, clampHeading } from "../../common/units";
import { Position } from "./position";
import type { GridIndices } from "./grid-indices";
import { PacketType } from "../utils/tcp-packet";
import { type BotTunnel } from "../api/bot-tunnel";

/**
 * Represents a physical robot.
 * Includes information about the current location as well as tooling for communication.
 */
export class Robot {
    private _headingRadians: number;
    private _position: Position;
    protected tunnel: BotTunnel | null;
    protected _pieceType: string;

    constructor(
        public readonly id: string,
        /**
         * The location the robot lives in when its not in use.
         */
        public readonly homeIndices: GridIndices,
        /**
         * The location the robot should be in at the beginning of a regular chess.
         */
        public readonly defaultIndices: GridIndices,
        public readonly startHeadingRadians: number = 0,
        public readonly thePieceType: string,
        position?: Position,
    ) {
        if (
            startHeadingRadians === undefined ||
            Number.isNaN(startHeadingRadians)
        ) {
            throw new Error("startHeadingRadians must be a number");
        }
        this._headingRadians = startHeadingRadians;
        this._position = position ?? Position.fromGridIndices(homeIndices);
        this.tunnel = null;
        this._pieceType = thePieceType;
    }

    public get position(): Position {
        return this._position;
    }

    public set position(coords: Position) {
        this._position = coords;
    }

    public get headingRadians(): number {
        return this._headingRadians;
    }

    public set headingRadians(headingRadians: number) {
        this._headingRadians = headingRadians;
    }

    public get pieceType(): string {
        return this._pieceType;
    }

    public set pieceType(thePieceType: string) {
        this._pieceType = thePieceType;
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
        const distance = Math.hypot(deltaPosition.x, deltaPosition.y);
        const angle = clampHeading(
            Math.atan2(deltaPosition.y, deltaPosition.x) * RADIAN,
        );
        const promise = this.absoluteRotate(angle).then(() => {
            return this.sendDrivePacket(distance);
        });
        this.position = this.position.add(deltaPosition);
        console.log(this.position);
        return promise;
    }

    public setTunnel(tunnel: BotTunnel) {
        this.tunnel = tunnel;
    }

    /**
     * Send a packet to the robot indicating angle to turn. Returns a promise that finishes when the
     * robot finishes the action.
     *
     * @param deltaHeadingRadians - A relative heading to turn by, in radians. May be positive or negative.
     */
    public async sendTurnPacket(deltaHeadingRadians: number): Promise<void> {
        console.log(
            `Sending turn packet to robot ${this.id} with delta heading ${deltaHeadingRadians}`,
        );
        await this.tunnel!.send({
            type: PacketType.TURN_BY_ANGLE,
            deltaHeadingRadians: deltaHeadingRadians,
        });
    }

    /**
     * Send a packet to the robot indicating distance to drive. Returns a promise that finishes when the
     * robot finishes the action.
     *
     * @param tileDistance - The distance to drive forward or backwards by. 1 is defined as the length of a tile.
     */
    public async sendDrivePacket(tileDistance: number): Promise<void> {
        console.log(
            `Sending drive packet to robot ${this.id} with distance ${tileDistance}, where the piece type is ${this.pieceType}`,
        );
        await this.tunnel!.send({
            type: PacketType.DRIVE_TILES,
            tileDistance,
        });
    }

    /**
     * Send a packet to the robot indicating distance to drive, in ticks. Returns a promise that finishes when the
     * robot finishes the action.
     *
     * @param distanceTicks - The distance to drive forward or backwards by, in ticks.
     */
    public async sendDriveTicksPacket(distanceTicks: number): Promise<void> {
        await this.tunnel!.send({
            type: PacketType.DRIVE_TICKS,
            tickDistance: distanceTicks,
        });
    }

    public async sendDriveCubicPacket(
        startPosition: { x: number; y: number },
        endPosition: { x: number; y: number },
        controlPositionA: { x: number; y: number },
        controlPositionB: { x: number; y: number },
        timeDeltaMs: number,
    ): Promise<void> {
        await this.tunnel!.send({
            type: PacketType.DRIVE_CUBIC_SPLINE,
            startPosition: startPosition,
            endPosition: endPosition,
            controlPositionA: controlPositionA,
            controlPositionB: controlPositionB,
            timeDeltaMs: timeDeltaMs,
        });
    }

    public async sendDriveQuadraticPacket(
        startPosition: { x: number; y: number },
        endPosition: { x: number; y: number },
        controlPosition: { x: number; y: number },
        timeDeltaMs: number,
    ): Promise<void> {
        await this.tunnel!.send({
            type: PacketType.DRIVE_QUADRATIC_SPLINE,
            startPosition: startPosition,
            controlPosition: controlPosition,
            endPosition: endPosition,
            timeDeltaMs: timeDeltaMs,
        });
    }

    public async sendSpinPacket(
        radians: number,
        timeDeltaMs: number,
    ): Promise<void> {
        await this.tunnel!.send({
            type: PacketType.SPIN_RADIANS,
            radians: radians,
            timeDeltaMs: timeDeltaMs,
        });
    }

    public async sendStopPacket(): Promise<void> {
        console.log("Stopping the robot: " + this.id);
        if (this.tunnel !== null) {
            await this.tunnel!.send({
                type: PacketType.ESTOP,
            });
        }
    }
}
