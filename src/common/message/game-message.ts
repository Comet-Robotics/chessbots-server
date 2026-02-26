import { Message, MessageType } from "./message";
import type { Move } from "../game-types";
import type {
    GameInterruptedReason,
    GameHoldReason,
    GameFinishedReason,
    GameEndReason,
} from "../game-end-reasons";

/**
 * A message that includes a position and pgn
 */
export class PositionMessage extends Message {
    constructor(public readonly pgn: string) {
        super();
    }

    protected type = MessageType.POSITION;

    protected toObj(): object {
        return { ...super.toObj(), pgn: this.pgn };
    }
}

/**
 * A message that includes a move
 */
export class MoveMessage extends Message {
    constructor(public readonly move: Move) {
        super();
    }

    protected type = MessageType.MOVE;

    protected toObj(): object {
        return {
            ...super.toObj(),
            move: this.move,
        };
    }
}

/**
 * A message used to broadcast the state of the virtual chessboard
 * to other connected clients. `chess` is a Forsyth-Edwards
 * Notation (FEN) string used to represent the state of the chessboard.
 */
export class SetChessMessage extends Message {
    constructor(public readonly chess: string) {
        super();
    }

    protected type = MessageType.SET_CHESS;

    protected toObj(): object {
        return {
            ...super.toObj(),
            chess: this.chess,
        };
    }
}

/**
 * A message for starting games
 */
export class GameStartedMessage extends Message {
    constructor() {
        super();
    }

    protected type = MessageType.GAME_STARTED;
}

/**
 * A message that contains why the game was interrupted
 */
export class GameInterruptedMessage extends Message {
    constructor(public readonly reason: GameInterruptedReason) {
        super();
    }

    protected type = MessageType.GAME_INTERRUPTED;

    protected toObj(): object {
        return {
            ...super.toObj(),
            reason: this.reason,
        };
    }
}

/**
 * A message that contains why the game has finished
 */
export class GameFinishedMessage extends Message {
    constructor(public readonly reason: GameFinishedReason) {
        super();
    }

    protected type = MessageType.GAME_FINISHED;

    protected toObj(): object {
        return {
            ...super.toObj(),
            reason: this.reason,
        };
    }
}

/**
 * A message that contains why the game was temporarily held
 */
export class GameHoldMessage extends Message {
    constructor(public readonly reason: GameHoldReason) {
        super();
    }

    protected type = MessageType.GAME_HELD;

    protected toObj(): object {
        return {
            ...super.toObj(),
            reason: this.reason,
        };
    }
}

export class GameEndMessage extends Message {
    constructor(public readonly reason: GameEndReason) {
        super();
    }

    protected type = MessageType.GAME_ENDED;

    protected toObj(): object {
        return {
            ...super.toObj(),
            reason: this.reason,
        };
    }
}

export class JoinQueue extends Message {
    constructor(public readonly playerName: string) {
        super();
    }

    protected type = MessageType.JOIN_QUEUE;

    protected toObj(): object {
        return {
            ...super.toObj(),
            playerName: this.playerName,
        };
    }
}

export class UpdateQueue extends Message {
    constructor(public readonly updatedPlayerList: string[]) {
        super();
    }

    protected type = MessageType.UPDATE_QUEUE;

    protected toObj(): object {
        return {
            ...super.toObj(),
            updatedPlayerList: this.updatedPlayerList,
        };
    }
}
