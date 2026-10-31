import { z } from "zod";

export const SERVER_PROTOCOL_VERSION = 1;

export enum PacketType {
    CLIENT_HELLO = "CLIENT_HELLO",
    SERVER_HELLO = "SERVER_HELLO",
    CENTER_SEND = "CENTER_SEND",
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
    DRIVE_CUBIC_SPLINE = "DRIVE_CUBIC_SPLINE",
    DRIVE_QUADRATIC_SPLINE = "DRIVE_QUADRATIC_SPLINE",
    ESTOP = "ESTOP",
    SPIN_RADIANS = "SPIN_RADIANS",
}

export const ServerHelloSchema = z.object({
    type: z.literal(PacketType.SERVER_HELLO),
    protocol: z.int(),
});

export const PingSendSchema = z.object({
    type: z.literal(PacketType.PING_SEND),
});

export const CenterSendSchema = z.object({
    type: z.literal(PacketType.CENTER_SEND),
});

export const PingResponseSchema = z.object({
    type: z.literal(PacketType.PING_RESPONSE),
});

export const TurnByAngleSchema = z.object({
    type: z.literal(PacketType.TURN_BY_ANGLE),
    deltaHeadingRadians: z.number(),
});

export const DriveTilesSchema = z.object({
    type: z.literal(PacketType.DRIVE_TILES),
    tileDistance: z.number(),
});

export const ClientHelloSchema = z.object({
    type: z.literal(PacketType.CLIENT_HELLO),
    macAddress: z.mac()
});

export const ActionSuccessSchema = z.object({
    type: z.literal(PacketType.ACTION_SUCCESS),
    tileDistance: z.number(),
});

export const ActionFailSchema = z.object({
    type: z.literal(PacketType.ACTION_FAIL),
    reason: z.string()
});


export const EstopSchema = z.object({
    type: z.literal(PacketType.ESTOP),
});

export const PacketSchema = z.discriminatedUnion("type", [
    ClientHelloSchema,
    ServerHelloSchema,
    CenterSendSchema,
    PingSendSchema,
    PingResponseSchema,
    TurnByAngleSchema,
    DriveTilesSchema,
    ActionSuccessSchema,
    ActionFailSchema,
    EstopSchema,
])

// --- TypeScript types ---
export type ClientHello = z.infer<typeof ClientHelloSchema>;
export type ServerHello = z.infer<typeof ServerHelloSchema>;
export type PingSend = z.infer<typeof PingSendSchema>;
export type CenterSend = z.infer<typeof CenterSendSchema>;
export type PingResponse = z.infer<typeof PingResponseSchema>;
export type TurnByAngle = z.infer<typeof TurnByAngleSchema>;
export type DriveTiles = z.infer<typeof DriveTilesSchema>;
export type ActionSuccess = z.infer<typeof ActionSuccessSchema>;
export type ActionFail = z.infer<typeof ActionFailSchema>;
export type Estop = z.infer<typeof EstopSchema>;

export type Packet = z.infer<typeof PacketSchema>;
export type PacketWithId = Packet & { packetId: string };

export function deserializePacket(json: string): PacketWithId | undefined {
    const obj = JSON.parse(json);
    const result = PacketSchema.and(z.object({ packetId: z.string() })).safeParse(obj);
    if (!result.success) {
        return undefined;
    }

    return result.data;
}

export function serializePacket(packet: Packet, packetId: string): string {
    return JSON.stringify({ ...packet, packetId });
}