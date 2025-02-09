import {
    Number as NumberType,
    String,
    Record,
    Union,
    Static,
    Literal,
    Dictionary,
} from "runtypes";

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
    ACTION_SUCCESS = "ACTION_SUCCESS",
    ACTION_FAIL = "ACTION_FAIL",
    DRIVE_TANK = "DRIVE_TANK",
    ESTOP = "ESTOP",
}

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

export const CLIENT_HELLO_SCHEMA = Record({
    type: Literal(PacketType.CLIENT_HELLO),
    macAddress: String,
});
export const SERVER_HELLO_SCHEMA = Record({
    type: Literal(PacketType.SERVER_HELLO),
    protocol: Uint32,
    config: Dictionary(NumberType, String),
});
export const PING_SEND_SCHEMA = Record({ type: Literal(PacketType.PING_SEND) });
export const PING_RESPONSE_SCHEMA = Record({
    type: Literal(PacketType.PING_RESPONSE),
});

export const QUERY_VAR_SCHEMA = Record({
    type: Literal(PacketType.QUERY_VAR),
    var_id: VarId,
    var_type: Union(Literal("float"), Literal("uint32"), Literal("int32")),
});
export const QUERY_RESPONSE_SCHEMA = Record({
    type: Literal(PacketType.QUERY_RESPONSE),
    var_id: VarId,
    var_val: Union(Float, Uint32, Int32),
});
export const SET_VAR_SCHEMA = Record({
    type: Literal(PacketType.SET_VAR),
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

export const TURN_BY_ANGLE_SCHEMA = Record({
    type: Literal(PacketType.TURN_BY_ANGLE),
    deltaHeadingRadians: Float,
});
export const DRIVE_TILES_SCHEMA = Record({
    type: Literal(PacketType.DRIVE_TILES),
    tileDistance: Float,
});

export const ACTION_SUCCESS_SCHEMA = Record({
    type: Literal(PacketType.ACTION_SUCCESS),
});
export const ACTION_FAIL_SCHEMA = Record({
    type: Literal(PacketType.ACTION_FAIL),
    reason: String,
});

export const DRIVE_TANK_SCHEMA = Record({
    type: Literal(PacketType.DRIVE_TANK),
    left: MotorPower,
    right: MotorPower,
});
export const ESTOP_SCHEMA = Record({ type: Literal(PacketType.ESTOP) });

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
    ACTION_SUCCESS_SCHEMA,
    ACTION_FAIL_SCHEMA,
    DRIVE_TANK_SCHEMA,
    ESTOP_SCHEMA,
);
export type Packet = Static<typeof Packet>;

export function jsonToPacket(jsonStr: string): Packet {
    const obj = JSON.parse(jsonStr);
    if (!Packet.guard(obj)) {
        throw new Error("Invalid packet: " + jsonStr);
    }
    return obj as Packet;
}

export function packetToJson(packet: Packet): string {
    if (!Packet.guard(packet)) {
        throw new Error("Invalid packet: " + JSON.stringify(packet));
    }
    return JSON.stringify(packet);
}
