import { z } from "zod";
import type { Move } from "./game-types";
import {
    GameInterruptedReason,
    GameHoldReason,
    GameFinishedReason,
    GameEndReason,
} from "./game-end-reasons";
import type { PacketWithId } from "../server/api/tunnel/tcp-packet";

/** Robot location in the simulator. */
export type SimulatedRobotLocation = {
    position: { x: number; y: number };
    headingRadians: number;
};

/** A single stack frame from the robot's traceback. */
export type StackFrame = {
    fileName: string;
    functionName?: string;
    lineNumber?: number;
    columnNumber?: number;
};

/**
 * Message type identifiers.
 */
export enum MessageType {
    REGISTER_WEBSOCKET = "register-websocket",
    POSITION = "position",
    MOVE = "move",
    SET_CHESS = "set-chess",
    GAME_STARTED = "game-started",
    GAME_INTERRUPTED = "game-interrupted",
    GAME_HELD = "game-held",
    GAME_FINISHED = "game-finished",
    GAME_ENDED = "game-ended",
    DRIVE_ROBOT = "drive-robot",
    SET_ROBOT_VARIABLE = "set-robot-variable",
    SIMULATOR_UPDATE = "simulator-update",
    JOIN_QUEUE = "join-queue",
    UPDATE_QUEUE = "update-queue",
}

// --- Zod Schemas ---

const GameFinishedReasonSchema = z.nativeEnum(GameFinishedReason);
const GameInterruptedReasonSchema = z.nativeEnum(GameInterruptedReason);
const GameHoldReasonSchema = z.nativeEnum(GameHoldReason);

export const RegisterWebsocketMessageSchema = z.object({
    type: z.literal(MessageType.REGISTER_WEBSOCKET),
});

export const PositionMessageSchema = z.object({
    type: z.literal(MessageType.POSITION),
    pgn: z.string(),
});

export const MoveMessageSchema = z.object({
    type: z.literal(MessageType.MOVE),
    move: z.object({
        from: z.string(),
        to: z.string(),
        promotion: z.string().optional(),
    }),
});

export const SetChessMessageSchema = z.object({
    type: z.literal(MessageType.SET_CHESS),
    chess: z.string(),
});

export const GameStartedMessageSchema = z.object({
    type: z.literal(MessageType.GAME_STARTED),
});

export const GameInterruptedMessageSchema = z.object({
    type: z.literal(MessageType.GAME_INTERRUPTED),
    reason: GameInterruptedReasonSchema,
});

export const GameFinishedMessageSchema = z.object({
    type: z.literal(MessageType.GAME_FINISHED),
    reason: GameFinishedReasonSchema,
});

export const GameHoldMessageSchema = z.object({
    type: z.literal(MessageType.GAME_HELD),
    reason: GameHoldReasonSchema,
});

export const GameEndMessageSchema = z.object({
    type: z.literal(MessageType.GAME_ENDED),
    reason: z.union([GameFinishedReasonSchema, GameInterruptedReasonSchema]),
});

export const JoinQueueSchema = z.object({
    type: z.literal(MessageType.JOIN_QUEUE),
    playerName: z.string(),
});

export const UpdateQueueSchema = z.object({
    type: z.literal(MessageType.UPDATE_QUEUE),
    updatedPlayerList: z.array(z.string()),
});

export const DriveRobotMessageSchema = z.object({
    type: z.literal(MessageType.DRIVE_ROBOT),
    id: z.string(),
    leftPower: z.number(),
    rightPower: z.number(),
});

export const SetRobotVariableMessageSchema = z.object({
    type: z.literal(MessageType.SET_ROBOT_VARIABLE),
    id: z.string(),
    variableName: z.string(),
    variableValue: z.number(),
});

export const SimulatorUpdateMessageSchema = z.object({
    type: z.literal(MessageType.SIMULATOR_UPDATE),
    robotId: z.string(),
    location: z.object({
        position: z.object({ x: z.number(), y: z.number() }),
        headingRadians: z.number(),
    }),
    packet: z.object({}).passthrough(),
    stackTrace: z
        .array(
            z.object({
                fileName: z.string(),
                functionName: z.string().optional(),
                lineNumber: z.number().optional(),
                columnNumber: z.number().optional(),
            }),
        )
        .optional(),
});

/**
 * Discriminated union of all message types.
 * Use this as the primary `Message` type throughout the codebase.
 */
export const MessageSchema = z.discriminatedUnion("type", [
    RegisterWebsocketMessageSchema,
    PositionMessageSchema,
    MoveMessageSchema,
    SetChessMessageSchema,
    GameStartedMessageSchema,
    GameInterruptedMessageSchema,
    GameFinishedMessageSchema,
    GameHoldMessageSchema,
    GameEndMessageSchema,
    JoinQueueSchema,
    UpdateQueueSchema,
    DriveRobotMessageSchema,
    SetRobotVariableMessageSchema,
    SimulatorUpdateMessageSchema,
]);

/**
 * Inferred TypeScript types from schemas.
 */
export type RegisterWebsocketMessage = z.infer<typeof RegisterWebsocketMessageSchema>;
export type PositionMessage = z.infer<typeof PositionMessageSchema>;
export type MoveMessage = z.infer<typeof MoveMessageSchema>;
export type SetChessMessage = z.infer<typeof SetChessMessageSchema>;
export type GameStartedMessage = z.infer<typeof GameStartedMessageSchema>;
export type GameInterruptedMessage = z.infer<typeof GameInterruptedMessageSchema>;
export type GameFinishedMessage = z.infer<typeof GameFinishedMessageSchema>;
export type GameHoldMessage = z.infer<typeof GameHoldMessageSchema>;
export type GameEndMessage = z.infer<typeof GameEndMessageSchema>;
export type JoinQueue = z.infer<typeof JoinQueueSchema>;
export type UpdateQueue = z.infer<typeof UpdateQueueSchema>;
export type DriveRobotMessage = z.infer<typeof DriveRobotMessageSchema>;
export type SetRobotVariableMessage = z.infer<typeof SetRobotVariableMessageSchema>;
export type SimulatorUpdateMessage = z.infer<typeof SimulatorUpdateMessageSchema>;
export type Message = z.infer<typeof MessageSchema>;

/**
 * Helper: build a message object.
 */
function msg(type: MessageType, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return { type, ...extra };
}

// --- Convenience constructors ---

export function createRegisterWebsocketMessage(): RegisterWebsocketMessage {
    return msg(MessageType.REGISTER_WEBSOCKET) as RegisterWebsocketMessage;
}

export function createPositionMessage(pgn: string): PositionMessage {
    return msg(MessageType.POSITION, { pgn }) as PositionMessage;
}

export function createMoveMessage(move: Move): MoveMessage {
    return msg(MessageType.MOVE, { move }) as MoveMessage;
}

export function createSetChessMessage(chess: string): SetChessMessage {
    return msg(MessageType.SET_CHESS, { chess }) as SetChessMessage;
}

export function createGameStartedMessage(): GameStartedMessage {
    return msg(MessageType.GAME_STARTED) as GameStartedMessage;
}

export function createGameInterruptedMessage(reason: GameInterruptedReason): GameInterruptedMessage {
    return msg(MessageType.GAME_INTERRUPTED, { reason }) as GameInterruptedMessage;
}

export function createGameFinishedMessage(reason: GameFinishedReason): GameFinishedMessage {
    return msg(MessageType.GAME_FINISHED, { reason }) as GameFinishedMessage;
}

export function createGameHoldMessage(reason: GameHoldReason): GameHoldMessage {
    return msg(MessageType.GAME_HELD, { reason }) as GameHoldMessage;
}

export function createGameEndMessage(reason: GameEndReason): GameEndMessage {
    return msg(MessageType.GAME_ENDED, { reason }) as GameEndMessage;
}

export function createJoinQueue(playerName: string): JoinQueue {
    return msg(MessageType.JOIN_QUEUE, { playerName }) as JoinQueue;
}

export function createUpdateQueue(updatedPlayerList: string[]): UpdateQueue {
    return msg(MessageType.UPDATE_QUEUE, { updatedPlayerList }) as UpdateQueue;
}

export function createDriveRobotMessage(
    id: string,
    leftPower: number,
    rightPower: number,
): DriveRobotMessage {
    return msg(MessageType.DRIVE_ROBOT, { id, leftPower, rightPower }) as DriveRobotMessage;
}

export function createSetRobotVariableMessage(
    id: string,
    variableName: string,
    variableValue: number,
): SetRobotVariableMessage {
    return msg(MessageType.SET_ROBOT_VARIABLE, { id, variableName, variableValue }) as SetRobotVariableMessage;
}

export function createSimulatorUpdateMessage(
    robotId: string,
    location: SimulatedRobotLocation,
    packet: PacketWithId,
    stackTrace?: StackFrame[],
): SimulatorUpdateMessage {
    return msg(MessageType.SIMULATOR_UPDATE, {
        robotId,
        location: {
            position: { x: location.position.x, y: location.position.y },
            headingRadians: location.headingRadians,
        },
        packet,
        stackTrace,
    }) as SimulatorUpdateMessage;
}

// --- Serialization / Deserialization ---

/**
 * Serialize any message to a JSON string.
 */
export function toJson(message: Message): string {
    return JSON.stringify(message);
}

/**
 * Parse a raw JSON string into a validated Message object.
 * @throws {z.ZodError} if the message doesn't match any known schema.
 */
export function parseMessage(text: string): Message {
    const obj = JSON.parse(text);
    const result = MessageSchema.safeParse(obj);
    if (result.success) {
        return result.data;
    }
    throw new Error(`Failed to parse message: ${result.error.message}`);
}

// --- Type aliases for the public API ---

/** A function which can be used to send a message somewhere. */
export type SendMessage = (message: Message) => void;

/** A function which receives messages and should do stuff with them. */
export type MessageHandler = (message: Message) => void;
