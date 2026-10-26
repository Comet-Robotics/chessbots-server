import { z } from "zod";

// ─── Enums ───────────────────────────────────────────────────────────────────

const gameFinishedReason = z.enum([
    "white-checkmated",
    "black-checkmated",
    "stalemate",
    "threefold-repetition",
    "insufficient-material",
    "fifty-moves",
    "puzzle-solved",
]);
export type GameFinishedReason = z.infer<typeof gameFinishedReason>;

const gameInterruptedReason = z.enum([
    "white-resigned",
    "black-resigned",
    "draw-accepted",
    "aborted",
]);
export type GameInterruptedReason = z.infer<typeof gameInterruptedReason>;

const gameHoldReason = z.enum([
    "draw-offered",
    "draw-confirmation",
    "draw-denied",
    "game-paused",
    "game-unpaused",
]);
export type GameHoldReason = z.infer<typeof gameHoldReason>;

const gameEndReason = z.union([gameFinishedReason, gameInterruptedReason]);
export type GameEndReason = z.infer<typeof gameEndReason>;

const pieceType = z.enum(["p", "b", "n", "r", "q", "k"]);
export type PieceType = z.infer<typeof pieceType>;

const side = z.enum(["w", "b", "s"]);
export type Side = z.infer<typeof side>;

// ─── Shared ──────────────────────────────────────────────────────────────────

const square = z.string().length(2).regex(/^[a-h][2-9]|^[a-h]10$/);
export type Square = z.infer<typeof square>;

const moveSchema = z.object({
    from: square,
    to: square,
    promotion: pieceType.optional(),
});
export type Move = z.infer<typeof moveSchema>;

const simulatedRobotLocation = z.object({
    position: z.object({ x: z.number(), y: z.number() }),
    headingRadians: z.number(),
});
export type SimulatedRobotLocation = z.infer<typeof simulatedRobotLocation>;

const stackFrame = z.object({
    fileName: z.string(),
    functionName: z.string().optional(),
    lineNumber: z.number().int().optional(),
    columnNumber: z.number().int().optional(),
});
export type StackFrame = z.infer<typeof stackFrame>;

const packetWithId = z.object({
    type: z.string(),
    packetId: z.string(),
});
export type PacketWithId = z.infer<typeof packetWithId>;

// ─── Individual Message Payloads ─────────────────────────────────────────────

const registerWebsocketPayload = z.object({ type: z.literal("register-websocket") });
const gameStartedPayload = z.object({ type: z.literal("game-started") });

const positionPayload = z.object({
    type: z.literal("position"),
    pgn: z.string(),
});

const movePayload = z.object({
    type: z.literal("move"),
    move: moveSchema,
});

const setChessPayload = z.object({
    type: z.literal("set-chess"),
    chess: z.string(),
});

const gameInterruptedPayload = z.object({
    type: z.literal("game-interrupted"),
    reason: gameInterruptedReason,
});

const gameFinishedPayload = z.object({
    type: z.literal("game-finished"),
    reason: gameFinishedReason,
});

const gameHeldPayload = z.object({
    type: z.literal("game-held"),
    reason: gameHoldReason,
});

const gameEndedPayload = z.object({
    type: z.literal("game-ended"),
    reason: gameEndReason,
});

const driveRobotPayload = z.object({
    type: z.literal("drive-robot"),
    id: z.string(),
    leftPower: z.number(),
    rightPower: z.number(),
});

const setRobotVariablePayload = z.object({
    type: z.literal("set-robot-variable"),
    id: z.string(),
    variableName: z.string(),
    variableValue: z.number(),
});

const simulatorUpdatePayload = z.object({
    type: z.literal("simulator-update"),
    robotId: z.string(),
    location: simulatedRobotLocation,
    packet: packetWithId,
    stackTrace: z.array(stackFrame).optional(),
});

const joinQueuePayload = z.object({
    type: z.literal("join-queue"),
    playerName: z.string(),
});

const updateQueuePayload = z.object({
    type: z.literal("update-queue"),
    updatedPlayerList: z.array(z.string()),
});

// ─── Discriminated Union ────────────────────────────────────────────────────

export const messageSchema = z.discriminatedUnion("type", [
    registerWebsocketPayload,
    gameStartedPayload,
    positionPayload,
    movePayload,
    setChessPayload,
    gameInterruptedPayload,
    gameFinishedPayload,
    gameHeldPayload,
    gameEndedPayload,
    driveRobotPayload,
    setRobotVariablePayload,
    simulatorUpdatePayload,
    joinQueuePayload,
    updateQueuePayload,
]);
