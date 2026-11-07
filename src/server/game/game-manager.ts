import type { GameEndReason, GameInterruptedReason, Message } from "../../common/message";
import { BLACK, WHITE, type ChessEngine } from "../../common/chess";
import {
    type MoveMessage,
    type GameHoldMessage,
    // type GameEndMessage,
    // type SetChessMessage,
    type GameInterruptedMessage,
    // type GameFinishedMessage,
    MessageType,
    GameHoldReason,
    GameCompletedReason,
    // GameStartedMessageSchema,
} from "../../common/message";
import type { ClientManager } from "../api/client-manager";
import type { Move, Side } from "../../common/chess";
import {
    materializePath,
    materializePathHexapawn,
    moveAllRobotsFromBoardToHome,
} from "../robot/path-materializer";
// import { DO_SAVES } from "../env";
import { executor } from "../command/executor";
// import { robotManager } from "../robot/robot-manager";

type GameState = {
    type?: "puzzle" | "human" | "computer";
    position: string;
    gameEndReason: GameEndReason | undefined;
    paused: boolean;
    tooltip?: string;
    aiDifficulty?: number;
    difficulty?: number;
};

/**
 * The manager for game communication
 */
export class GameManager {
    protected gameInterruptedReason: GameInterruptedReason | GameCompletedReason | undefined =
        undefined;

    paused: boolean = false;

    constructor(
        public chess: ChessEngine,
        protected clientManager: ClientManager,
        /**
         * The side the host is playing.
         */
        protected hostSide: Side,
        // true if host and client get reversed
        protected reverse: boolean,
        protected tooltip?: string,
    ) {
        clientManager.sendToAll({
            type: MessageType.GAME_STARTED,
        });
    }

    public pause() {
        this.paused = true;
    }
    
    public unpause() {
        this.paused = false;
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
    public getGameState(): GameState {
        return {
            position: this.chess.pgn,
            gameEndReason: this.getGameEndReason(),
            tooltip: this.tooltip,
            paused: this.paused,
        };
    }

    public handleMessage(message: Message, id: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {})
    };

    public async cleanupGame(isHexapawn: boolean): Promise<void> {
        const command = moveAllRobotsFromBoardToHome(isHexapawn);
        await executor.execute(command);
    }
}

/**
 * game manager for handling human communications
 */
export class HumanGameManager extends GameManager {
    constructor(
        chess: ChessEngine,
        clientManager: ClientManager,
        hostSide: Side,
        protected reverse: boolean,
    ) {
        super(chess, clientManager, hostSide, reverse, undefined);
    }

    /**
     * handles messages between players
     * @param message - the message to be sent
     * @param id - id of the sender
     */
    public async handleMessage(message: Message, id: string): Promise<void> {
        // check which type the id is
        const clientType = this.clientManager.getClientType(id);

        const ids = this.clientManager.getIds();
        // const currentSave = SaveManager.loadGame(id);
        // update the internal chess object if it is a move massage and game not paused
        console.log("up to here");
        if (message.type === MessageType.MOVE && !this.paused && "move" in message) {
            const moveMsg = message as MoveMessage;
            // Call path materializer and send to bots
            const command = materializePath(moveMsg.move);

            this.chess.makeMove(moveMsg.move);

            // console.dir(command, { depth: null });
            await executor.execute(command).catch((reason) => {
                this.paused = true;
                console.log(reason);
                this.chess.undo();
                this.clientManager.sendToAll({
                    type: MessageType.GAME_HELD,
                    reason: GameHoldReason.GAME_PAUSED,
                });
                return;
            });

            // if (ids && DO_SAVES) {
            //     if (currentSave?.host === ids[0]) {
            //         SaveManager.saveGame(
            //             ids[0],
            //             ids[1],
            //             this.hostSide,
            //             -1,
            //             this.chess.pgn,
            //             this.chess.fen,
            //             robotManager.getIndicesToIds(),
            //         );
            //     } else {
            //         SaveManager.saveGame(
            //             ids[1],
            //             ids[0],
            //             oppositeSide(this.hostSide),
            //             -1,
            //             this.chess.pgn,
            //             this.chess.fen,
            //             robotManager.getIndicesToIds(),
            //         );
            //     }
            // }
            this.clientManager.sendToAll({
                type: MessageType.GAME_HELD,
                reason: GameHoldReason.GAME_UNPAUSED,
            });

            // end the game if it is interrupted
        } else if (message.type === MessageType.GAME_INTERRUPTED) {
            const reason = (message as GameInterruptedMessage).reason;
            this.gameInterruptedReason = reason;
            await this.cleanupGame(false);
            // propagate back to both sockets
            this.clientManager.sendToAll(message)

            //end the game in save manager
            // if (ids) {
            //     if (currentSave?.host === ids[0])
            //         SaveManager.endGame(ids[0], ids[1]);
            //     else SaveManager.endGame(ids[1], ids[0]);
            // }
        } else if (message.type === MessageType.GAME_FINISHED) {
            // propagate back to both sockets
            // if (ids) {
            //     if (currentSave?.host === ids[0])
            //         SaveManager.endGame(ids[0], ids[1]);
            //     else SaveManager.endGame(ids[1], ids[0]);
            // }
        } else if (message.type === MessageType.GAME_HELD) {
            const holdMsg = message as GameHoldMessage;
            if (holdMsg.reason === GameHoldReason.DRAW_CONFIRMATION) {
                this.clientManager.sendToClient(message);
            } else if (holdMsg.reason === GameHoldReason.DRAW_OFFERED) {
                this.clientManager.sendToClient(message);
            } else {
                this.clientManager.sendToAll(message)
            }
        } else if (this.isGameEnded()) {
            // if (ids) {
            //     if (currentSave?.host === ids[0])
            //         SaveManager.endGame(ids[0], ids[1]);
            //     else SaveManager.endGame(ids[1], ids[0]);
            // }
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
        clientManager: ClientManager,
        hostSide: Side,
        protected difficulty: number,
        protected reverse: boolean,
    ) {
        super(chess, clientManager, hostSide, reverse, undefined);
        this.aiFirstMove =
            (chess.pgn === "" && this.hostSide === BLACK) 
            // ||
            // (chess.pgn !== "" && this.hostSide === chess.getLastMove()?.);
    }

    public async makeFirstMove() {
        if (this.aiFirstMove) {
            const move = this.chess.calculateAiMove(this.difficulty);
            this.clientManager.sendToAll({
                type: MessageType.MOVE,
                move: move
            });

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
        if (message.type === MessageType.GAME_INTERRUPTED) {
            await this.cleanupGame(false);
            this.clientManager.sendToAll(message);
            return;
        }

        if (message.type != MessageType.MOVE || this.paused) {
            return;
        }

        const moveMsg = message as MoveMessage;

        // Call path materializer and send to bots for human move
        const command = materializePath(moveMsg.move);

        this.clientManager.sendToAll(message);
        this.chess.makeMove(moveMsg.move);

        // await executor.execute(command).catch((reason) => {
        //     this.paused = true;
        //     console.log(reason);
        //     this.chess.undo();
        //     this.clientManager.sendToAll({
        //         type: MessageType.GAME_HELD,
        //         reason: GameHoldReason.GAME_PAUSED
        //     });
        //     return;
        // });

        const move = this.chess.calculateAiMove(this.difficulty);
        
        // await this.executeRobotMovement(move); // wait for robots to finish moving
        // this.clientManager.sendToAll({
        //     type: MessageType.MOVE,
        //     move: move
        // });
    }

    public getGameState(): GameState {
        return {
            type: "computer",
            ...super.getGameState(),
            aiDifficulty: this.difficulty,
        };
    }
}

export class PuzzleGameManager extends GameManager {
    private moveNumber: number = 0;
    MINIMUM_DELAY = 600;

    constructor(
        chess: ChessEngine,
        clientManager: ClientManager,
        fen: string,
        protected tooltip: string,
        private moves: Move[],
        protected difficulty: number,
    ) {
        super(
            chess,
            clientManager,
            fen.split(" ")[1] === "w" ? WHITE : BLACK,
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
        if (message.type === MessageType.MOVE && "move" in message) {
            const moveMsg = message as MoveMessage;
            //if the move is correct
            if (
                this.moves[this.moveNumber].from === moveMsg.move.from &&
                this.moves[this.moveNumber].to === moveMsg.move.to &&
                !this.paused
            ) {
                const command = materializePath(moveMsg.move);

                this.clientManager.sendToAll({
                    type: MessageType.MOVE,
                    move: moveMsg.move
                });

                this.chess.makeMove(moveMsg.move);
                this.moveNumber++;

                console.log("running executor");
                console.dir(command, { depth: null });
                await executor.execute(command).catch((reason) => {
                    this.paused = true;
                    console.log(reason);
                    this.chess.undo();
                    this.clientManager.sendToAll({
                        type: MessageType.GAME_HELD,
                        reason: GameHoldReason.GAME_PAUSED
                    });

                    return;
                });

                console.log("executor done");

                //if there is another move, make it
                if (this.moves[this.moveNumber]) {
                    const command = materializePath(
                        this.moves[this.moveNumber],
                    );

                    this.chess.makeMove(this.moves[this.moveNumber]);

                    console.log("running executor");
                    console.dir(command, { depth: null });
                    await executor.execute(command).catch((reason) => {
                        this.paused = true;
                        console.log(reason);
                        this.chess.undo();
                        this.clientManager.sendToAll({
                            type: MessageType.GAME_HELD,
                            reason: GameHoldReason.GAME_PAUSED
                        });
                        return;
                    });
                    console.log("executor done");
                    setTimeout(() => {
                        this.clientManager.sendToAll({
                            type: MessageType.MOVE,
                            move: this.moves[this.moveNumber],
                        });

                        this.moveNumber++;
                    }, this.MINIMUM_DELAY);
                } else {
                    this.moveNumber++;
                }
            }

            else {
                this.clientManager.sendToAll({
                    type: MessageType.SET_CHESS,
                    chess: this.chess.fen
                });
            }

            if (this.isGameEnded()) {
                const gameEnd = this.getGameEndReason();
                await this.cleanupGame(false);
                if (gameEnd) {
                    this.clientManager.sendToAll({
                        type: MessageType.GAME_ENDED,
                        reason: gameEnd
                    });
                }
            }
        } else if (
            message.type === MessageType.GAME_INTERRUPTED ||
            message.type === MessageType.GAME_ENDED
        ) {
            this.gameInterruptedReason = message.reason;
            // Reflect end game reason back to client
            await this.cleanupGame(false);
            this.clientManager.sendToAll(message);
        }
    }

    public isGameEnded(): boolean {
        return this.moveNumber >= this.moves.length || super.isGameEnded();
    }

    public getGameEndReason(): GameEndReason | undefined {
        if (this.moveNumber >= this.moves.length) {
            return GameCompletedReason.PUZZLE_SOLVED;
        }
        return super.getGameEndReason();
    }

    public getGameState(): GameState {
        return {
            type: "puzzle",
            ...super.getGameState(),
            difficulty: this.difficulty,
        };
    }
}

export class HexapawnGameManager extends GameManager {
    MINIMUM_DELAY = 600;

    constructor(
        chess: ChessEngine,
        hostSide: Side,
        protected clientManager: ClientManager,
        protected reverse: boolean,
    ) {
        super(chess, clientManager, hostSide, reverse, undefined);
        try {
            chess.loadFen("K6k/8/8/8/ppp5/8/PPP5/8 w - - 0 1");
        } catch (e) {
            console.log(e);
        }
    }

    public async handleMessage(message: Message, id: string): Promise<void> {
        const ids = this.clientManager.getIds();
        // const currentSave = SaveManager.loadGame(id);
        // update the internal chess object if it is a move massage and game not paused
        if (message.type === MessageType.MOVE && !this.paused && "move" in message) {
            const moveMsg = message as MoveMessage;
            // Call path materializer and send to bots
            const command = materializePathHexapawn(moveMsg.move);

            this.chess.makeMove(moveMsg.move);

            console.log("running executor");
            // console.dir(command, { depth: null });
            await executor.execute(command).catch((reason) => {
                this.paused = true;
                console.log(reason);
                this.chess.undo();
                this.clientManager.sendToAll({
                    type: MessageType.GAME_HELD,
                    reason: GameHoldReason.GAME_PAUSED
                });
                return;
            });
            console.log("executor done");

            // if (ids && DO_SAVES) {
            //     if (currentSave?.host === ids[0]) {
            //         SaveManager.saveGame(
            //             ids[0],
            //             ids[1],
            //             this.hostSide,
            //             -1,
            //             this.chess.pgn,
            //             this.chess.fen,
            //             robotManager.getIndicesToIds(),
            //         );
            //     } else {
            //         SaveManager.saveGame(
            //             ids[1],
            //             ids[0],
            //             oppositeSide(this.hostSide),
            //             -1,
            //             this.chess.pgn,
            //             this.chess.fen,
            //             robotManager.getIndicesToIds(),
            //         );
            //     }
            // }
            this.clientManager.sendToClient(message);
            this.clientManager.sendToSpectators(message);
        } else if (message.type === MessageType.GAME_INTERRUPTED) {
            const reason = (message as GameInterruptedMessage).reason;
            this.gameInterruptedReason = reason;
            // propagate back to both sockets
            this.clientManager.sendToAll(message);

            //end the game in save manager
            // if (ids) {
            //     if (currentSave?.host === ids[0])
            //         SaveManager.endGame(ids[0], ids[1]);
            //     else SaveManager.endGame(ids[1], ids[0]);
            // }
        } else if (message.type === MessageType.GAME_FINISHED) {
            // propagate back to both sockets
            // if (ids) {
            //     if (currentSave?.host === ids[0])
            //         SaveManager.endGame(ids[0], ids[1]);
            //     else SaveManager.endGame(ids[1], ids[0]);
            // }
        } else if (message.type === MessageType.GAME_HELD) {
            const holdMsg = message as GameHoldMessage;
            if (holdMsg.reason === GameHoldReason.DRAW_CONFIRMATION)
                this.clientManager.sendToHost(message);
            else if (holdMsg.reason === GameHoldReason.DRAW_OFFERED) {
                this.clientManager.sendToClient(message);
            } else {
                this.clientManager.sendToAll(message);
            }
        }

        if (this.isGameEnded()) {
            // if (ids) {
            //     if (currentSave?.host === ids[0])
            //         SaveManager.endGame(ids[0], ids[1]);
            //     else SaveManager.endGame(ids[1], ids[0]);
            // }

            //send a finished message
            const gameEnd = this.getGameEndReason();
            console.log("Game ended! time to raise hell!");
            await this.cleanupGame(true);
            if (gameEnd) {
                this.clientManager.sendToAll({
                    type: MessageType.GAME_ENDED,
                    reason: gameEnd
                });
            }
        }
    }

    public isGameEnded(): boolean {
        //if one side gives up
        if (this.gameInterruptedReason !== undefined) return true;
        //if a pawn makes it to the other side
        if (
            this.chess.fen.split("/")[4].includes("P") ||
            this.chess.fen.split("/")[6].includes("p")
        ) {
            return true;
        }
        //stalemate calculations. efficient? probably not. easy to understand? probably
        else {
            const fenPawns = this.chess.fen.split("/").slice(4, 7);
            const pawns: string[][] = [];
            //normalize the fen
            for (let x = 0; x < 3; x++) {
                const temp = [...fenPawns[x]];
                const row: string[] = [];
                for (const y of temp) {
                    if (y === "p" || y === "P") {
                        row.push(y);
                    } else if (y === "1" || y === "6") {
                        row.push("1");
                    } else if (y === "2" || y === "7") {
                        row.push("1");
                        row.push("1");
                    } else if (y === "8") {
                        row.push("1");
                        row.push("1");
                        row.push("1");
                    }
                }
                pawns.push(row);
            }
            for (let x = 0; x < 3; x++) {
                for (let y = 0; y < 3; y++) {
                    if (pawns[x][y] === "p") {
                        if (pawns[x + 1][y] === "1") {
                            return false;
                        }
                        if (
                            (y === 0 && pawns[x + 1][1] === "P") ||
                            (y === 2 && pawns[x + 1][1] === "P") ||
                            (y === 1 &&
                                (pawns[x + 1][0] === "P" ||
                                    pawns[x + 1][2] === "P"))
                        ) {
                            return false;
                        }
                    } else if (pawns[x][y] === "P") {
                        if (pawns[x - 1][y] === "1") {
                            return false;
                        }
                        if (
                            (y === 0 && pawns[x - 1][1] === "p") ||
                            (y === 2 && pawns[x - 1][1] === "p") ||
                            (y === 1 &&
                                (pawns[x - 1][0] === "p" ||
                                    pawns[x + 1][2] === "p"))
                        ) {
                            return false;
                        }
                    }
                }
            }
            return true;
        }
    }

    public getGameEndReason(): GameEndReason | undefined {
        if (this.isGameEnded()) {
            if (this.chess.fen.split("/")[4].includes("P")) {
                return GameCompletedReason.BLACK_CHECKMATED;
            } else if (this.chess.fen.split("/")[6].includes("p")) {
                return GameCompletedReason.WHITE_CHECKMATED;
            } else if (super.getGameEndReason()) {
                return super.getGameEndReason();
            }
            return this.chess.fen.split(" ")[2] === "w" ?
                    GameCompletedReason.WHITE_CHECKMATED
                :   GameCompletedReason.BLACK_CHECKMATED;
        }
    }

    public getGameState(): GameState {
        return {
            type: "puzzle",
            ...super.getGameState(),
        };
    }
}
