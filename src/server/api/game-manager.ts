import type { Message, SendMessage } from "../../common/message/message";
import type { ChessEngine } from "../../common/chess-engine";
import {
    MoveMessage,
    GameInterruptedMessage,
    GameStartedMessage,
    GameHoldMessage,
    GameFinishedMessage,
    GameEndMessage,
    SetChessMessage,
} from "../../common/message/game-message";
import type { SocketManager } from "./socket-manager";
import type { ClientManager } from "./client-manager";
import { ClientType } from "../../common/client-types";
import type { Move } from "../../common/game-types";
import { Side, oppositeSide } from "../../common/game-types";
import type {
    GameEndReason,
    GameEndReason as GameInterruptedReason,
} from "../../common/game-end-reasons";
import {
    GameFinishedReason,
    GameHoldReason,
} from "../../common/game-end-reasons";
import { SaveManager } from "./save-manager";
import { materializePath } from "../robot/path-materializer";
import { DO_SAVES } from "../utils/env";
import { executor } from "../command/executor";
import { robotManager } from "../robot/robot-manager";
import { gamePaused } from "./pauseHandler";

type GameState = {
    type?: "puzzle" | "human" | "computer";
    side: Side;
    position: string;
    gameEndReason: GameEndReason | undefined;
    pause: boolean;
    tooltip?: string;
    aiDifficulty?: number;
    difficulty?: number;
};

/**
 * The manager for game communication
 */
export abstract class GameManager {
    protected gameInterruptedReason: GameInterruptedReason | undefined =
        undefined;

    constructor(
        public chess: ChessEngine,
        protected socketManager: SocketManager,
        /**
         * The side the host is playing.
         */
        protected hostSide: Side,
        // true if host and client get reversed
        protected reverse: boolean,
        protected tooltip?: string,
    ) {
        socketManager.sendToAll(new GameStartedMessage());
    }

    /** check if game ended */
    public isGameEnded(): boolean {
        return (
            this.gameInterruptedReason !== undefined ||
            this.chess.isGameFinished()
        );
    }

    /** get game end reason */
    public getGameEndReason(): GameEndReason | undefined {
        return this.gameInterruptedReason ?? this.chess.getGameFinishedReason();
    }

    /**
     * A method which is invoked whenever a game first connects.
     * Should respond with the game's side, position, and whether the game is finished.
     */
    public getGameState(clientType: ClientType): GameState {
        let side: Side;
        if (clientType === ClientType.HOST) {
            side = this.reverse ? oppositeSide(this.hostSide) : this.hostSide;
        } else if (clientType === ClientType.CLIENT) {
            side = this.reverse ? this.hostSide : oppositeSide(this.hostSide);
        } else {
            side = Side.SPECTATOR;
        }
        return {
            side,
            position: this.chess.pgn,
            gameEndReason: this.getGameEndReason(),
            tooltip: this.tooltip,
            pause: gamePaused,
        };
    }

    public abstract handleMessage(message: Message, id: string): Promise<void>;
}

/**
 * game manager for handling human communications
 */
export class HumanGameManager extends GameManager {
    constructor(
        chess: ChessEngine,
        socketManager: SocketManager,
        hostSide: Side,
        protected clientManager: ClientManager,
        protected reverse: boolean,
    ) {
        super(chess, socketManager, hostSide, reverse, undefined);
    }

    /**
     * handles messages between players
     * @param message - the message to be sent
     * @param id - id of the sender
     */
    public async handleMessage(message: Message, id: string): Promise<void> {
        // check which type the id is
        const clientType = this.clientManager.getClientType(id);
        let sendToPlayer: SendMessage;
        let sendToOpponent: SendMessage;

        // decide whether the host is the player or the opponent
        if (clientType === ClientType.HOST) {
            sendToPlayer = this.clientManager.sendToHost.bind(
                this.clientManager,
            );
            sendToOpponent = this.clientManager.sendToClient.bind(
                this.clientManager,
            );
        } else {
            sendToPlayer = this.clientManager.sendToClient.bind(
                this.clientManager,
            );
            sendToOpponent = this.clientManager.sendToHost.bind(
                this.clientManager,
            );
        }

        //bind all spectators
        const sendToSpectators = this.clientManager.sendToSpectators.bind(
            this.clientManager,
        );
        const ids = this.clientManager.getIds();
        const currentSave = SaveManager.loadGame(id);
        // update the internal chess object if it is a move massage and game not paused
        if (message instanceof MoveMessage && !gamePaused) {
            // Call path materializer and send to bots
            const command = materializePath(message.move);

            this.chess.makeMove(message.move);

            console.log("running executor");
            console.dir(command, { depth: null });
            await executor.execute(command);
            console.log("executor done");

            if (ids && DO_SAVES) {
                if (currentSave?.host === ids[0]) {
                    SaveManager.saveGame(
                        ids[0],
                        ids[1],
                        this.hostSide,
                        -1,
                        this.chess.pgn,
                        this.chess.fen,
                        robotManager.getIndicesToIds(),
                    );
                } else {
                    SaveManager.saveGame(
                        ids[1],
                        ids[0],
                        oppositeSide(this.hostSide),
                        -1,
                        this.chess.pgn,
                        this.chess.fen,
                        robotManager.getIndicesToIds(),
                    );
                }
            }
            sendToOpponent(message);
            sendToSpectators(message);

            // end the game if it is interrupted
        } else if (message instanceof GameInterruptedMessage) {
            this.gameInterruptedReason = message.reason;
            // propagate back to both sockets
            sendToPlayer(message);
            sendToOpponent(message);
            sendToSpectators(message);

            //end the game in save manager
            if (ids) {
                if (currentSave?.host === ids[0])
                    SaveManager.endGame(ids[0], ids[1]);
                else SaveManager.endGame(ids[1], ids[0]);
            }
        } else if (message instanceof GameFinishedMessage) {
            // propagate back to both sockets
            if (ids) {
                if (currentSave?.host === ids[0])
                    SaveManager.endGame(ids[0], ids[1]);
                else SaveManager.endGame(ids[1], ids[0]);
            }
        } else if (message instanceof GameHoldMessage) {
            if (message.reason === GameHoldReason.DRAW_CONFIRMATION)
                sendToPlayer(message);
            else if (message.reason === GameHoldReason.DRAW_OFFERED) {
                sendToOpponent(message);
            } else {
                sendToPlayer(message);
                sendToOpponent(message);
                sendToSpectators(message);
            }
        } else if (this.isGameEnded()) {
            if (ids) {
                if (currentSave?.host === ids[0])
                    SaveManager.endGame(ids[0], ids[1]);
                else SaveManager.endGame(ids[1], ids[0]);
            }
        }
    }
}

/**
 * game manager for making and sending ai moves
 */
export class ComputerGameManager extends GameManager {
    // The minimum amount of time to wait responding with a move.
    MINIMUM_DELAY = 600;
    aiFirstMove = false;

    // Create the game manager
    // if the player is black have the computer make the first move
    constructor(
        chess: ChessEngine,
        socketManager: SocketManager,
        hostSide: Side,
        protected difficulty: number,
        protected reverse: boolean,
    ) {
        super(chess, socketManager, hostSide, reverse, undefined);
        this.aiFirstMove =
            (chess.pgn === "" && this.hostSide === Side.BLACK) ||
            (chess.pgn !== "" && this.hostSide === chess.getLastMove()?.color);
    }

    public async makeFirstMove() {
        if (this.aiFirstMove) {
            const move = this.chess.calculateAiMove(this.difficulty);
            this.socketManager.sendToAll(new MoveMessage(move));
            await this.executeRobotMovement(move);
        }
    }

    /**
     * Helper method to execute robot movement for a given move
     */
    private async executeRobotMovement(move: Move): Promise<void> {
        const command = materializePath(move);
        this.chess.makeMove(move);
        await executor.execute(command);
    }

    /**
     * handle messages between the server and the player
     * @param message - the message to send
     * @param id - id of the sender
     * @returns when the game ends
     */
    public async handleMessage(message: Message, id: string): Promise<void> {
        if (message instanceof MoveMessage && !gamePaused) {
            // Call path materializer and send to bots for human move
            const command = materializePath(message.move);

            this.socketManager.sendToAll(new MoveMessage(message.move));
            this.chess.makeMove(message.move);

            await executor.execute(command);

            if (DO_SAVES) {
                SaveManager.saveGame(
                    id,
                    "ai",
                    this.hostSide,
                    this.difficulty,
                    this.chess.pgn,
                    this.chess.fen,
                    robotManager.getIndicesToIds(),
                );
            }

            if (this.chess.isGameFinished()) {
                SaveManager.endGame(id, "ai");
                return;
            }

            // Ensure MINIMUM_DELAY before responding
            // previous code didn't wait for robots and caused issues where you could move and make robots collide
            const move = this.chess.calculateAiMove(this.difficulty);
            await this.executeRobotMovement(move); // wait for robots to finish moving
            this.socketManager.sendToAll(new MoveMessage(move)); // send move to clients after robots finish moving
            if (this.isGameEnded()) {
                SaveManager.endGame(id, "ai");
            }
        } else if (message instanceof GameInterruptedMessage) {
            this.gameInterruptedReason = message.reason;
            SaveManager.endGame(id, "ai");
            // Reflect end game reason back to client
            this.socketManager.sendToAll(message);
        }
    }

    public getGameState(clientType: ClientType): GameState {
        return {
            type: "computer",
            ...super.getGameState(clientType),
            aiDifficulty: this.difficulty,
        };
    }
}

export class PuzzleGameManager extends GameManager {
    private moveNumber: number = 0;
    MINIMUM_DELAY = 600;

    constructor(
        chess: ChessEngine,
        socketManager: SocketManager,
        fen: string,
        protected tooltip: string,
        private moves: Move[],
        protected difficulty: number,
    ) {
        super(
            chess,
            socketManager,
            fen.split(" ")[1] === "w" ? Side.WHITE : Side.BLACK,
            false,
            tooltip,
        );
        chess.loadFen(fen);
    }
    public getTooltip(): string {
        return this.tooltip;
    }

    public getDifficulty(): number {
        return this.difficulty;
    }

    public async handleMessage(message: Message, id: string): Promise<void> {
        id;
        if (message instanceof MoveMessage) {
            //if the move is correct
            if (
                this.moves[this.moveNumber].from === message.move.from &&
                this.moves[this.moveNumber].to === message.move.to &&
                !gamePaused
            ) {
                const command = materializePath(message.move);

                this.socketManager.sendToAll(new MoveMessage(message.move));
                this.chess.makeMove(message.move);
                this.moveNumber++;

                console.log("running executor");
                console.dir(command, { depth: null });
                await executor.execute(command);
                console.log("executor done");

                //if there is another move, make it
                if (this.moves[this.moveNumber]) {
                    const command = materializePath(
                        this.moves[this.moveNumber],
                    );

                    this.chess.makeMove(this.moves[this.moveNumber]);

                    console.log("running executor");
                    console.dir(command, { depth: null });
                    await executor.execute(command);
                    console.log("executor done");
                    setTimeout(() => {
                        this.socketManager.sendToAll(
                            new MoveMessage(this.moves[this.moveNumber]),
                        );
                        this.moveNumber++;
                    }, this.MINIMUM_DELAY);
                } else {
                    this.moveNumber++;
                }
            }

            //send an undo message
            else {
                this.socketManager.sendToAll(
                    new SetChessMessage(this.chess.fen),
                );
            }

            //send a finished message
            if (this.isGameEnded()) {
                const gameEnd = this.getGameEndReason();
                if (gameEnd) {
                    this.socketManager.sendToAll(new GameEndMessage(gameEnd));
                }
            }
        } else if (
            message instanceof (GameInterruptedMessage || GameEndMessage)
        ) {
            this.gameInterruptedReason = message.reason;
            // Reflect end game reason back to client
            this.socketManager.sendToAll(message);
        }
    }

    public isGameEnded(): boolean {
        return this.moveNumber >= this.moves.length || super.isGameEnded();
    }

    public getGameEndReason(): GameEndReason | undefined {
        if (this.moveNumber >= this.moves.length) {
            return GameFinishedReason.PUZZLE_SOLVED;
        }
        return super.getGameEndReason();
    }

    public getGameState(clientType: ClientType): GameState {
        return {
            type: "puzzle",
            ...super.getGameState(clientType),
            difficulty: this.difficulty,
        };
    }
}
