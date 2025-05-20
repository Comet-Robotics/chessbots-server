import { vi, test, expect, afterEach } from "vitest";
import {
    type Packet,
    jsonToPacket,
    packetToJson,
    PacketType,
} from "../tcp-packet";
import { randomUUID } from "node:crypto";
import { VirtualBotTunnel } from "../../simulator";
import WebSocket from "ws";
import { socketManager } from "../../api/managers";

const mockSocket = vi.mocked(WebSocket.prototype);
const TEST_ROBOT_ID = "robot-1";
socketManager.registerSocket(TEST_ROBOT_ID, mockSocket);

const mockBotTunnel = new VirtualBotTunnel(TEST_ROBOT_ID);

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
    await mockBotTunnel.send(packet);
});
