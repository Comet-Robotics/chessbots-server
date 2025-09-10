import { GameInterruptedReason } from "../../game-end-reasons";
import { PieceType } from "../../game-types";
import {
    DriveRobotMessage,
    SetRobotVariableMessage,
    StopRobotMessage,
} from "../robot-message";
import {
    MoveMessage,
    PositionMessage,
    GameInterruptedMessage,
    GameStartedMessage,
} from "../game-message";
import type { Message } from "../message";
import { parseMessage } from "../parse-message";
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
