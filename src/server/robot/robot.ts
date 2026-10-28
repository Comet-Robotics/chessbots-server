import { FULL_ROTATION, RADIAN, clampHeading, positionFromGridPosition } from "../../common/units";
import { type BotTunnel } from "../api/tunnel/bot-tunnel";
import type { GridPosition, Position } from "../../common/units";
import type { Piece } from "../../common/chess";
import { config, RobotConfig, RobotId } from "../api/config";

/**
 * Represents a physical robot.
 * Includes information about the current location as well as tooling for communication.
 */
export class Robot {
    readonly config: RobotConfig;

    protected tunnel: BotTunnel | null;

    private _heading: number;
    private _position: Position;

    constructor(
        public readonly mac: string,
    ) {
        this.config = config.bots[mac];

        this.tunnel = null;

        this._heading = this.config.start_rot;
        this._position = this.config.start_pos;
    }

    public get id(): RobotId {
        return this.config.id;
    }
    
    public get position(): Position {
        return this._position;
    }

    public set position(pos: Position) {
        this._position = pos;
    }

    public get heading(): number {
        return this._heading;
    }

    public set heading(heading: number) {
        this._heading = heading;
    }

    public get pieceType(): Piece {
        return this.config.piece.symbol;
    }

    public get getConfig() {
        return this.config;
    }

    /**
     * @param delta_heading - A relative heading to turn by, in radians.
     */
    public async relativeRotate(delta_heading: number): Promise<void> {
        this._heading = clampHeading(
            this._heading + delta_heading,
        );

        return this.tunnel?.sendTurnPacket(delta_heading);
    }

    public setTunnel(tunnel: BotTunnel) {
        this.tunnel = tunnel;
    }
}
