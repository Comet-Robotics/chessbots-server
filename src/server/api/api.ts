import type { WebsocketRequestHandler } from "express-ws";
import { Router } from "express";

import {
    ComputerGameManager,
    HexapawnGameManager,
    HumanGameManager,
    PuzzleGameManager,
} from "../game/game-manager";
import type { ChessEngine, Square } from "../../common/chess";
import { START_ROBOTS_AT_DEFAULT, DO_SAVES } from "../env";
import { DEGREE } from "../../common/units";
import { GameInterruptedReason } from "../../common/game-end-reasons";
import type { Command } from "../command/command";
import {
    SequentialCommandGroup,
    ParallelCommandGroup,
} from "../command/command";
import {
    DriveQuadraticSplineCommand,
    DriveCubicSplineCommand,
    SpinRadiansCommand,
    DriveCommand,
    CenterCommand,
    RelativeRotateCommand,
} from "../command/move-command";
import {
    moveAllRobotsHomeToDefaultOptimized,
    moveAllRobotsToDefaultPositions,
    moveAllRobotsToDefaultPositionsHexapawn,
} from "../robot/path-materializer";
import type { PuzzleComponents } from "../game/puzzles";
import { puzzles } from "../game/puzzles";
import { tcpServer } from "./tunnel/tcpserver";
import { executor } from "../command/executor";
import {
    setAllRobotsToDefaultPositions,
} from "../game/pauseHandler";
import type { GridPosition } from "../../common/units";

//hashmap mapping cookie ids to user names
const names = new Map<string, string>();

//let the queue be moved once per game
let canReloadQueue = true;

/**
 * An endpoint used to establish a websocket connection with the server.
 *
 * The websocket is used to stream moves to and from the client.
 */
export const websocketHandler: WebsocketRequestHandler = (ws, req) => {
    // on close, delete the cookie id
    ws.on("close", () => {
        console.log(`We closed the connection of ${req.cookies.id}`);
        socketManager.handleSocketClosed(req.cookies.id, ws);

        //if you reload and the game is over
        if (gameManager?.isGameEnded() && canReloadQueue) {
            //make the reassignment occur once per game instead of once per reload
            canReloadQueue = false;

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
            if (socketManager.getSockets(req.cookies.id) === undefined) {
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

                    setGameManager(null);

                    //remove the old host/client
                    clientType === ClientType.HOST ?
                        clientManager.removeHost()
                        : clientManager.removeClient();

                    //if there exists someone to take their place
                    const newPlayer = queue.pop();
                    if (newPlayer) {
                        //transfer them from spectator to the newly-opened spot and remove them from queue
                        clientManager.removeSpectator(newPlayer);
                        clientManager.assignPlayer(newPlayer);
                        names.delete(newPlayer);
                        socketManager.sendToAll(
                            createGameInterruptedMessage(GameInterruptedReason.ABORTED),
                        );
                    }
                    //else they were a spectator and don't need game notifications anymore
                } else {
                    clientManager.removeSpectator(req.cookies.id);
                }

                //update the queue and reload all the pages
                socketManager.sendToAll(createUpdateQueue([...names.values()]));
                socketManager.sendToAll(createGameStartedMessage());
            }
        }, 5000);
    });

    // if there is an actual message, forward it to appropriate handler
    ws.on("message", async (data) => {
        const message = parseMessage(data.toString());
        console.log("Received message: " + JSON.stringify(message));

        // take out that page value, add a delimeter
        // // add current page to the cookie id
        // const finalSocketId = pageValue.concat(req.cookies.id);

        if (message.type === MessageType.REGISTER_WEBSOCKET) {
            console.log(`Register a new socket with request ${req.cookies.id}`);

            socketManager.registerSocket(req.cookies.id, ws);
        } else if (
            message.type === MessageType.GAME_INTERRUPTED ||
            message.type === MessageType.MOVE ||
            message.type === MessageType.SET_CHESS ||
            message.type === MessageType.GAME_HELD ||
            message.type === MessageType.GAME_FINISHED ||
            message.type === MessageType.GAME_ENDED
        ) {
            await gameManager?.handleMessage(message, req.cookies.id);
        } else if (message.type === MessageType.DRIVE_ROBOT) {
            await doDriveRobot(message as DriveRobotMessage);
        } else if (message.type === MessageType.SET_ROBOT_VARIABLE) {
            await doSetRobotVariable(message as SetRobotVariableMessage);
        } else if (message.type === MessageType.JOIN_QUEUE) {
            console.log("So we got the join message");
            // this was initially !isPlayer, shouldn't it be isPlayer?
            if (!clientManager.isPlayer(req.cookies.id)) {
                if (queue.find(req.cookies.id) === undefined) {
                    queue.insert(req.cookies.id, 0);
                }
                names.set(req.cookies.id, message.playerName);
                socketManager.sendToAll(createUpdateQueue([...names.values()]));
            }
        }
    });
};