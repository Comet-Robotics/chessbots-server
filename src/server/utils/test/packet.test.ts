import { Socket } from "node:net";
import { BotTunnel } from "../../api/tcp-interface";
import { vi, test, expect, afterEach } from "vitest";
import {
    type Packet,
    jsonToPacket,
    packetToJson,
    PacketType,
} from "../tcp-packet";
import { randomUUID } from "node:crypto";

vi.mock("node:net");

const mockSocket = vi.mocked(Socket.prototype);

const mockBotTunnel = new BotTunnel(mockSocket, () => {});
vi.spyOn(mockBotTunnel, "isActive").mockReturnValue(true);
const mockWrite = vi.spyOn(mockSocket, "write");

afterEach(() => {
    vi.clearAllMocks();
});

const validMessages: Packet[] = [
    { type: PacketType.CLIENT_HELLO, macAddress: "HELLO3" },
    { type: PacketType.DRIVE_TANK, left: 0.3, right: -0.4 },
    { type: PacketType.SET_VAR, var_id: 3, var_type: "uint32", var_val: 10 },
];

const invalidMessages = [
    {}, // missing type
    { type: "INVALID_TYPE" }, // invalid type
    { type: PacketType.DRIVE_TANK, left: 0.3 }, // missing property
    { type: PacketType.DRIVE_TANK, left: 100, right: -0.9 }, // property outside constraint bounds
    { type: PacketType.SET_VAR, var_id: 0, var_type: "int32", var_val: -3.14 }, // property with invalid type
];

test.each(validMessages)("Test packet serialization", async (packet) => {
    const packetId = randomUUID();
    expect(jsonToPacket(packetToJson(packet, packetId))).toStrictEqual({
        ...packet,
        packetId,
    });
});

test.each(invalidMessages)("Test packet serialization", async (packet) => {
    expect(() => {
        const packetId = randomUUID();
        packetToJson(packet as Packet, packetId);
    }).toThrowError();
    expect(() => jsonToPacket(JSON.stringify(packet))).toThrowError();
});

test.each(validMessages)("Test message sending", async (packet) => {
    const packetId = await mockBotTunnel.send(packet);
    expect(mockWrite).toBeCalledTimes(1);
    expect(mockWrite.mock.calls[0][0]).toStrictEqual(
        `${packetToJson(packet, packetId)};`,
    );
});
