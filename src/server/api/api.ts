import { WebsocketRequestHandler } from "express-ws";
import { Router } from "express";

import { parseMessage } from "../../common/message/parse-message";
import {
    GameFinishedMessage,
    GameHoldMessage,
    GameInterruptedMessage,
    GameStartedMessage,
    JoinQueue,
    MoveMessage,
    UpdateQueue,
} from "../../common/message/game-message";
import {
    DriveRobotMessage,
    SetRobotVariableMessage,
} from "../../common/message/robot-message";

import { TCPServer } from "./tcp-interface";
import { ClientType, Difficulty } from "../../common/client-types";
import { RegisterWebsocketMessage } from "../../common/message/message";
import { clientManager, robotManager, socketManager } from "./managers";
import {
    ComputerGameManager,
    GameManager,
    HumanGameManager,
} from "./game-manager";
import { ChessEngine } from "../../common/chess-engine";
import { Side } from "../../common/game-types";
import { USE_VIRTUAL_ROBOTS } from "../utils/env";
import { SaveManager } from "./save-manager";
import { VirtualBotTunnel, virtualRobots } from "../simulator";
import { Position } from "../robot/position";
import { DEGREE } from "../utils/units";
import { PriorityQueue } from "./queue";
import { GameInterruptedReason } from "../../common/game-end-reasons";

export const tcpServer: TCPServer | null =
    USE_VIRTUAL_ROBOTS ? null : new TCPServer();

export let gameManager: GameManager | null = null;

const queue = new PriorityQueue<string>();
const names = new Map<string, string>();

//let the queue be moved once per game
let onlyOnce = true;

/**
 * An endpoint used to establish a websocket connection with the server.
 *
 * The websocket is used to stream moves to and from the client.
 */
export const websocketHandler: WebsocketRequestHandler = (ws, req) => {
    ws.on("close", () => {
        socketManager.handleSocketClosed(req.cookies.id);

        //if you reload and the game is over
        if (gameManager?.isGameEnded() && onlyOnce) {
            //make the reassignment occur once per game instead of once per reload
            onlyOnce = false;

            //remove the old players and store them for future reference
            const oldPlayers = clientManager.getIds();
            clientManager.removeHost();
            clientManager.removeClient();

            if (oldPlayers !== undefined) {
                //in most cases, the second player becomes the host
                clientManager.assignPlayer(oldPlayers[1]);

                //if no one else wants to play, the host just swaps
                if (queue.size() === 0) {
                    clientManager.assignPlayer(oldPlayers[0]);
                }

                //if there is one person who wants to play, host moves to the second player
                if (queue.size() === 1) {
                    const newPlayer = queue.pop();
                    if (newPlayer) {
                        clientManager.removeSpectator(newPlayer);
                        clientManager.assignPlayer(newPlayer);
                        names.delete(newPlayer);
                    }
                }

                //are enough people to start a game, forget the old people
                if (queue.size() >= 2) {
                    const newPlayer = queue.pop();
                    const newSecondPlayer = queue.pop();
                    if (newPlayer && newSecondPlayer) {
                        //reset the clients
                        clientManager.removeHost();
                        clientManager.removeClient();

                        //assign new players
                        clientManager.removeSpectator(newPlayer);
                        clientManager.assignPlayer(newPlayer);
                        names.delete(newPlayer);
                        clientManager.removeSpectator(newSecondPlayer);
                        clientManager.assignPlayer(newSecondPlayer);
                        names.delete(newSecondPlayer);
                    }
                }
            }
        }

        //wait in case the client is just reloading or disconnected instead of leaving
        setTimeout(() => {
            if (socketManager.getSocket(req.cookies.id) === undefined) {
                //remove the person from the queue to free up space
                queue.popInd(queue.find(req.cookies.id));
                names.delete(req.cookies.id);
                const clientType = clientManager.getClientType(req.cookies.id);

                //if the person was a host / client, a new one needs to be reassigned
                if (clientManager.isPlayer(req.cookies.id)) {
                    //clear the existing game
                    const ids = clientManager.getIds();
                    if (ids) {
                        if (
                            SaveManager.loadGame(req.cookies.id)?.host ===
                            ids[0]
                        )
                            SaveManager.endGame(ids[0], ids[1]);
                        else SaveManager.endGame(ids[1], ids[0]);
                    }

                    gameManager = null;

                    //remove the old host/client
                    clientType === ClientType.HOST ?
                        clientManager.removeHost()
                    :   clientManager.removeClient();

                    //if there exists someone to take their place
                    const newPlayer = queue.pop();
                    if (newPlayer) {
                        //transfer them from spectator to the newly-opened spot and remove them from queue
                        clientManager.removeSpectator(newPlayer);
                        clientManager.assignPlayer(newPlayer);
                        names.delete(newPlayer);
                        socketManager.sendToAll(
                            new GameInterruptedMessage(
                                GameInterruptedReason.ABORTED,
                            ),
                        );
                    }
                    //else they were a spectator and don't need game notifications anymore
                } else {
                    clientManager.removeSpectator(req.cookies.id);
                }

                //update the queue and reload all the pages
                socketManager.sendToAll(new UpdateQueue([...names.values()]));
                socketManager.sendToAll(new GameStartedMessage());
            }
        }, 5000);
    });

    ws.on("message", (data) => {
        const message = parseMessage(data.toString());
        console.log("Received message: " + message.toJson());

        if (message instanceof RegisterWebsocketMessage) {
            socketManager.registerSocket(req.cookies.id, ws);
        } else if (
            message instanceof GameInterruptedMessage ||
            message instanceof MoveMessage ||
            message instanceof GameHoldMessage ||
            message instanceof GameFinishedMessage
        ) {
            // TODO: Handle game manager not existing
            gameManager?.handleMessage(message, req.cookies.id);
        } else if (message instanceof DriveRobotMessage) {
            doDriveRobot(message);
        } else if (message instanceof SetRobotVariableMessage) {
            doSetRobotVariable(message);
        } else if (message instanceof JoinQueue) {
            if (!clientManager.isPlayer(req.cookies.id)) {
                if (queue.find(req.cookies.id) === undefined) {
                    queue.insert(req.cookies.id, 0);
                }
                names.set(req.cookies.id, message.queue);
                socketManager.sendToAll(new UpdateQueue([...names.values()]));
            }
        }
    });
};

export const apiRouter = Router();

/**
 * gets the current stored queue
 */
apiRouter.get("/get-queue", (_, res) => {
    if (names) return res.send([...names.values()]);
    else return res.send([]);
});

/**
 * gets the name associated with the request cookie
 */
apiRouter.get("/get-name", (req, res) => {
    if (names) return res.send({ message: names.get(req.cookies.id) });
    else return res.send("");
});

apiRouter.get("/client-information", (req, res) => {
    const clientType = clientManager.getClientType(req.cookies.id);
    //loading saves from file if found
    const oldSave = SaveManager.loadGame(req.cookies.id);
    if (oldSave) {
        if (oldSave.aiDifficulty !== -1) {
            gameManager = new ComputerGameManager(
                new ChessEngine(oldSave.game),
                socketManager,
                oldSave.host === req.cookies.id ?
                    oldSave.hostWhite ?
                        Side.WHITE
                    :   Side.BLACK
                : oldSave.hostWhite ? Side.BLACK
                : Side.WHITE,
                oldSave.aiDifficulty,
                oldSave.host !== req.cookies.id,
            );
        } else {
            gameManager = new HumanGameManager(
                new ChessEngine(oldSave.game),
                socketManager,
                oldSave.hostWhite ? Side.WHITE : Side.BLACK,
                clientManager,
                oldSave.host !== req.cookies.id,
            );
        }
    }
    /**
     * Note the client currently redirects to home from the game over screen
     * So removing the isGameEnded check here results in an infinite loop
     */
    const isGameActive = gameManager !== null && !gameManager.isGameEnded();
    return res.send({
        clientType,
        isGameActive,
    });
});

apiRouter.get("/game-state", (req, res) => {
    if (gameManager === null) {
        console.warn("Invalid attempt to fetch game state");
        return res.status(400).send({ message: "No game is currently active" });
    }
    const clientType = clientManager.getClientType(req.cookies.id);
    return res.send(gameManager.getGameState(clientType));
});

apiRouter.post("/start-computer-game", (req, res) => {
    onlyOnce = true;
    const side = req.query.side as Side;
    const difficulty = parseInt(req.query.difficulty as string) as Difficulty;
    gameManager = new ComputerGameManager(
        new ChessEngine(),
        socketManager,
        side,
        difficulty,
        false,
    );
    return res.send({ message: "success" });
});

apiRouter.post("/start-human-game", (req, res) => {
    onlyOnce = true;
    const side = req.query.side as Side;
    gameManager = new HumanGameManager(
        new ChessEngine(),
        socketManager,
        side,
        clientManager,
        false,
    );
    return res.send({ message: "success" });
});

apiRouter.get("/get-ids", (_, res) => {
    const ids = Array.from(robotManager.idsToRobots.keys());
    return res.send({ ids });
});

apiRouter.get("/do-smth", async (_, res) => {
    const robotsEntries = Array.from(virtualRobots.entries());
    const [, robot] =
        robotsEntries[Math.floor(Math.random() * robotsEntries.length)];
    await robot.sendDrivePacket(1);
    await robot.sendTurnPacket(45 * DEGREE);

    res.send({ message: "success" });
});

apiRouter.get("/get-simulator-robot-state", (_, res) => {
    if (!USE_VIRTUAL_ROBOTS) {
        return res.status(400).send({ message: "Simulator is not enabled." });
    }
    const robotsEntries = Array.from(virtualRobots.entries());

    const robotState = Object.fromEntries(
        robotsEntries.map(([id, robot]) => {
            let headingRadians = robot.headingRadians;
            let position = new Position(robot.position.x, robot.position.y);

            const tunnel = robot.getTunnel();
            if (tunnel instanceof VirtualBotTunnel) {
                position = tunnel.position;
                headingRadians = tunnel.headingRadians;
            }
            return [id, { position, headingRadians: headingRadians }];
        }),
    );
    return res.send({
        robotState,
        messages: Array.from(VirtualBotTunnel.messages),
    });
});

/**
 * Returns a list of available puzzles to play.
 */
apiRouter.get("/get-puzzles", (_, res) => {
    return res.send({
        puzzles: [
            {
                name: "Puzzle 1",
                id: "puzzleId1",
                rating: "1200",
            },
            {
                name: "Puzzle 2",
                id: "puzzleId2",
                rating: "1400",
            },
        ],
    });
});

function doDriveRobot(message: DriveRobotMessage): boolean {
    if (!tcpServer) {
        console.warn("Attempted to drive robot without TCP server.");
        return false;
    }
    if (!tcpServer.getConnectedIds().includes(message.id)) {
        console.warn(
            "attempted manual move for non-existent robot ID " + message.id,
        );
        return false;
    } else {
        const tunnel = tcpServer.getTunnelFromId(message.id);
        if (!tunnel.connected) {
            console.warn(
                "attempted manual move for disconnected robot ID " + message.id,
            );
            return false;
        } else {
            tunnel.send({
                type: "DRIVE_TANK",
                left: message.leftPower,
                right: message.rightPower,
            });
        }
    }
    return true;
}

function doSetRobotVariable(message: SetRobotVariableMessage): boolean {
    if (!tcpServer) {
        console.warn("Attempted to set robot variable without TCP server.");
        return false;
    }
    if (!tcpServer.getConnectedIds().includes(message.id)) {
        console.warn(
            "Attempted set variable for non-existent robot ID " + message.id,
        );
        return false;
    } else {
        const tunnel = tcpServer.getTunnelFromId(message.id);
        if (!tunnel.connected) {
            console.warn(
                "Attempted set robot variable for disconnected robot ID " +
                    message.id,
            );
            return false;
        } else {
            tunnel.send({
                type: "SET_VAR",
                var_id: parseInt(message.variableName),
                var_type: "float",
                var_val: message.variableValue,
            });
        }
    }
    return true;
}
