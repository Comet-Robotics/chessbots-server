import {
    Number as NumberType,
    String,
    Record,
    Union,
    Static,
    Literal,
    Array,
    Tuple,
} from "runtypes";

const Float = NumberType.withConstraint((n) => Number.isFinite(n), {
    name: "float",
});
const Int32 = Float.withConstraint((n) => Number.isSafeInteger(n), {
    name: "int32",
});
const Uint32 = Int32.withConstraint((n) => n >= 0, { name: "uint32" });
const VarId = Uint32;
const MotorPower = Float.withConstraint((n) => -1 <= n && n <= 1, {
    name: "motor_power",
});

// MUST be kept in sync with chessBotArduino/include/packet.h PacketType
export const SERVER_PROTOCOL_VERSION = 1;

/**
 * A hello message from the client
 */
export const CLIENT_HELLO = Record({
    type: Literal("CLIENT_HELLO"),
    macAddress: String,
});

/**
 * A hello message from the server
 */
export const SERVER_HELLO = Record({
    type: Literal("SERVER_HELLO"),
    protocol: Uint32,
    config: Array(Tuple(String /*type*/, String /*value*/)),
});

/**
 * send a ping
 */
export const PING_SEND = Record({ type: Literal("PING_SEND") });

/**
 * respond to a ping
 */
export const PING_RESPONSE = Record({ type: Literal("PING_RESPONSE") });

/**
 * query a value
 *
 * could be float, unsigned, or int
 */
export const QUERY_VAR = Record({
    type: Literal("QUERY_VAR"),
    var_id: VarId,
    var_type: Union(Literal("float"), Literal("uint32"), Literal("int32")),
});

/**
 * respond to a query
 */
export const QUERY_RESPONSE = Record({
    type: Literal("QUERY_RESPONSE"),
    var_id: VarId,
    var_val: Union(Float, Uint32, Int32),
});

/**
 * send a message to set a variable by id
 */
export const SET_VAR = Record({
    type: Literal("SET_VAR"),
    var_id: VarId,
}).And(
    Union(
        Record({
            var_type: Literal("float"),
            var_val: Float,
        }),
        Record({
            var_type: Literal("uint32"),
            var_val: Uint32,
        }),
        Record({
            var_type: Literal("int32"),
            var_val: Int32,
        }),
    ),
);

/**
 * send a turn command
 */
export const TURN_BY_ANGLE = Record({
    type: Literal("TURN_BY_ANGLE"),
    deltaHeadingRadians: Float,
});

/**
 * send a drive command with tile distance
 */
export const DRIVE_TILES = Record({
    type: Literal("DRIVE_TILES"),
    tileDistance: Float,
});
/** success message */
export const ACTION_SUCCESS = Record({ type: Literal("ACTION_SUCCESS") });

/** error message with reason */
export const ACTION_FAIL = Record({
    type: Literal("ACTION_FAIL"),
    reason: String,
});

/**
 * start a tank drive with left and right motor powers
 */
export const DRIVE_TANK = Record({
    type: Literal("DRIVE_TANK"),
    left: MotorPower,
    right: MotorPower,
});
export const ESTOP = Record({ type: Literal("ESTOP") });

export const Packet = Union(
    CLIENT_HELLO,
    SERVER_HELLO,
    PING_SEND,
    PING_RESPONSE,
    QUERY_VAR,
    QUERY_RESPONSE,
    SET_VAR,
    TURN_BY_ANGLE,
    DRIVE_TILES,
    ACTION_SUCCESS,
    ACTION_FAIL,
    DRIVE_TANK,
    ESTOP,
);
export type Packet = Static<typeof Packet>;

type PacketWithId = Packet & { packetId: string };

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
