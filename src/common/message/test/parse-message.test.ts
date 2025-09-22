import { GameInterruptedReason } from "../../game-end-reasons.js";
import { PieceType } from "../../game-types.js";
import {
    DriveRobotMessage,
    SetRobotVariableMessage,
    StopRobotMessage,
} from "../robot-message.js";
import {
    MoveMessage,
    PositionMessage,
    GameInterruptedMessage,
    GameStartedMessage,
} from "../game-message.js";
import type { Message } from "../message.js";
import { parseMessage } from "../parse-message.js";
import { expect, test } from "vitest";

test.each([
    new GameStartedMessage(),
    new GameInterruptedMessage(GameInterruptedReason.ABORTED),
    new PositionMessage("aaaaaaaaa"),
    new MoveMessage({ from: "a1", to: "a2" }),
    new MoveMessage({ from: "a1", to: "a3", promotion: PieceType.BISHOP }),
    new MoveMessage({ from: "a1", to: "a4", promotion: PieceType.PAWN }),
    new DriveRobotMessage("robot1", 0.5, 0.5),
    new StopRobotMessage("robot2"),
    new SetRobotVariableMessage("robot1", "rotationsPerTile", 3.2),
])("Message should serialize correctly", (message: Message) => {
    const copy = Object.assign({}, message);
    expect(parseMessage(message.toJson())).toEqual(copy);
});
