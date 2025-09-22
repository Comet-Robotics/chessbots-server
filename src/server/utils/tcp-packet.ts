import type { Static } from "runtypes";
import {
    Number as NumberType,
    String,
    Object,
    Union,
    Literal,
    Record,
} from "runtypes";
import { Float, Int32, Uint32 } from "../../common/runtypes-typing.js";

export enum PacketType {
    CLIENT_HELLO = "CLIENT_HELLO",
    SERVER_HELLO = "SERVER_HELLO",
    PING_SEND = "PING_SEND",
    PING_RESPONSE = "PING_RESPONSE",
    QUERY_VAR = "QUERY_VAR",
    QUERY_RESPONSE = "QUERY_RESPONSE",
    SET_VAR = "SET_VAR",
    TURN_BY_ANGLE = "TURN_BY_ANGLE",
    DRIVE_TILES = "DRIVE_TILES",
    DRIVE_TICKS = "DRIVE_TICKS",
    ACTION_SUCCESS = "ACTION_SUCCESS",
    ACTION_FAIL = "ACTION_FAIL",
    DRIVE_TANK = "DRIVE_TANK",
    ESTOP = "ESTOP",
    DRIVE_CUBIC_SPLINE = "DRIVE_CUBIC_SPLINE",
    DRIVE_QUADRATIC_SPLINE = "DRIVE_QUADRATIC_SPLINE",
    SPIN_RADIANS = "SPIN_RADIANS",
}

const VarId = Uint32;
const MotorPower = Float.withConstraint((n) => -1 <= n && n <= 1).withBrand(
    "motorPower",
);

const Position = Object({ x: Float, y: Float }).withBrand("position");

// MUST be kept in sync with chessBotArduino/include/packet.h PacketType
export const SERVER_PROTOCOL_VERSION = 1;

/**
 * A hello message from the client
 */
export const CLIENT_HELLO_SCHEMA = Object({
    type: Literal(PacketType.CLIENT_HELLO),
    macAddress: String,
});

/**
 * A hello message from the server
 */
export const SERVER_HELLO_SCHEMA = Object({
    type: Literal(PacketType.SERVER_HELLO),
    protocol: Uint32,
    config: Record(String, NumberType),
});

/**
 * send a ping
 */
export const PING_SEND_SCHEMA = Object({ type: Literal(PacketType.PING_SEND) });

/**
 * respond to a ping
 */
export const PING_RESPONSE_SCHEMA = Object({
    type: Literal(PacketType.PING_RESPONSE),
});

/**
 * query a value
 *
 * could be float, unsigned, or int
 */
export const QUERY_VAR_SCHEMA = Object({
    type: Literal(PacketType.QUERY_VAR),
    var_id: VarId,
    var_type: Union(Literal("float"), Literal("uint32"), Literal("int32")),
});

/**
 * respond to a query
 */
export const QUERY_RESPONSE_SCHEMA = Object({
    type: Literal(PacketType.QUERY_RESPONSE),
    var_id: VarId,
    var_val: Union(Float, Uint32, Int32),
});

/**
 * send a message to set a variable by id
 */
export const SET_VAR_SCHEMA = Object({
    type: Literal(PacketType.SET_VAR),
    var_id: VarId,
}).and(
    Union(
        Object({ var_type: Literal("float"), var_val: Float }),
        Object({ var_type: Literal("uint32"), var_val: Uint32 }),
        Object({ var_type: Literal("int32"), var_val: Int32 }),
    ),
);

/**
 * send a turn command
 */
export const TURN_BY_ANGLE_SCHEMA = Object({
    type: Literal(PacketType.TURN_BY_ANGLE),
    deltaHeadingRadians: Float,
});

/**
 * send a drive command with tile distance
 */
export const DRIVE_TILES_SCHEMA = Object({
    type: Literal(PacketType.DRIVE_TILES),
    tileDistance: Float,
});

export const DRIVE_TICKS_SCHEMA = Object({
    type: Literal(PacketType.DRIVE_TICKS),
    tickDistance: Int32,
});

/** success message */
export const ACTION_SUCCESS_SCHEMA = Object({
    type: Literal(PacketType.ACTION_SUCCESS),
});

/** error message with reason */
export const ACTION_FAIL_SCHEMA = Object({
    type: Literal(PacketType.ACTION_FAIL),
    reason: String,
});

/**
 * start a tank drive with left and right motor powers
 */
export const DRIVE_TANK_SCHEMA = Object({
    type: Literal(PacketType.DRIVE_TANK),
    left: MotorPower,
    right: MotorPower,
});

export const DRIVE_CUBIC_SPLINE_SCHEMA = Object({
    type: Literal(PacketType.DRIVE_CUBIC_SPLINE),
    startPosition: Position,
    endPosition: Position,
    controlPositionA: Position,
    controlPositionB: Position,
    timeDeltaMs: Uint32,
});

export const DRIVE_QUADRATIC_SPLINE_SCHEMA = Object({
    type: Literal(PacketType.DRIVE_QUADRATIC_SPLINE),
    startPosition: Position,
    endPosition: Position,
    controlPosition: Position,
    timeDeltaMs: Uint32,
});

export const SPIN_RADIANS_SCHEMA = Object({
    type: Literal(PacketType.SPIN_RADIANS),
    radians: Float,
    timeDeltaMs: Uint32,
});

export const ESTOP_SCHEMA = Object({ type: Literal(PacketType.ESTOP) });

export const Packet = Union(
    CLIENT_HELLO_SCHEMA,
    SERVER_HELLO_SCHEMA,
    PING_SEND_SCHEMA,
    PING_RESPONSE_SCHEMA,
    QUERY_VAR_SCHEMA,
    QUERY_RESPONSE_SCHEMA,
    SET_VAR_SCHEMA,
    TURN_BY_ANGLE_SCHEMA,
    DRIVE_TILES_SCHEMA,
    DRIVE_TICKS_SCHEMA,
    ACTION_SUCCESS_SCHEMA,
    ACTION_FAIL_SCHEMA,
    DRIVE_TANK_SCHEMA,
    ESTOP_SCHEMA,
    DRIVE_CUBIC_SPLINE_SCHEMA,
    DRIVE_QUADRATIC_SPLINE_SCHEMA,
    SPIN_RADIANS_SCHEMA,
);
export type Packet = Static<typeof Packet>;

export type PacketWithId = Packet & { packetId: string };

/**
 * convert json to a packet to be sent over tcp
 * @param jsonStr - string to be converted
 * @returns - the object packet
 */
export function jsonToPacket(jsonStr: string): PacketWithId {
    const obj = JSON.parse(jsonStr);
    if (!Packet.guard(obj)) {
        throw new Error("Invalid packet: " + jsonStr);
    }
    return obj as PacketWithId;
}

/**
 * convert a packet to readable json
 * @param packet - packet to be converted
 * @returns - json string
 */
export function packetToJson(packet: Packet, packetId: string): string {
    if (!Packet.guard(packet)) {
        throw new Error("Invalid packet: " + JSON.stringify(packet));
    }
    return JSON.stringify({ ...packet, packetId });
}
