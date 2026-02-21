import type { WebsocketRequestHandler } from "express-ws";
import { Router } from "express";

import { parseMessage } from "../../common/message/parse-message";
import {
    GameFinishedMessage,
    GameEndMessage,
    GameHoldMessage,
    GameInterruptedMessage,
    GameStartedMessage,
    JoinQueue,
    MoveMessage,
    UpdateQueue,
    SetChessMessage,
} from "../../common/message/game-message";
import {
    DriveRobotMessage,
    SetRobotVariableMessage,
} from "../../common/message/robot-message";

import { ClientType } from "../../common/client-types";
import type { Difficulty } from "../../common/client-types";
import { RegisterWebsocketMessage } from "../../common/message/message";
import {
    clientManager,
    gameManager,
    setGameManager,
    socketManager,
} from "./managers";
import {
    ComputerGameManager,
    HumanGameManager,
    PuzzleGameManager,
} from "./game-manager";
import { ChessEngine } from "../../common/chess-engine";
import { Side } from "../../common/game-types";
import {
    USE_VIRTUAL_ROBOTS,
    START_ROBOTS_AT_DEFAULT,
    DO_SAVES,
} from "../utils/env";
import { SaveManager } from "./save-manager";

import { VirtualBotTunnel } from "../simulator";
import { Position } from "../robot/position";
import { DEGREE } from "../../common/units";
import { PacketType } from "../utils/tcp-packet";
import { PriorityQueue } from "./queue";
import { GameInterruptedReason } from "../../common/game-end-reasons";
import { ShowfileSchema, TimelineEventTypes } from "../../common/show";
import { SplinePointType } from "../../common/spline";
import type { Command } from "../command/command";
import {
    SequentialCommandGroup,
    ParallelCommandGroup,
} from "../command/command";
import {
    DriveQuadraticSplineCommand,
    DriveCubicSplineCommand,
    SpinRadiansCommand,
} from "../command/move-command";
import { GridIndices } from "../robot/grid-indices";
import {
    moveAllRobotsHomeToDefaultOptimized,
    moveAllRobotsToDefaultPositions,
} from "../robot/path-materializer";
import type { PuzzleComponents } from "./puzzles";
import { puzzles } from "./puzzles";
import { tcpServer } from "./tcp-interface";
import { robotManager } from "../robot/robot-manager";
import { executor } from "../command/executor";
import {
    gamePaused,
    pauseGame,
    setAllRobotsToDefaultPositions,
    unpauseGame,
} from "./pauseHandler";

/**
 * Helper function to move all robots from their home positions to their default positions
 * for regular chess games. IsMoving basically controls whether or not to actually move the robots to the right position.
 */
async function setupDefaultRobotPositions(
    isMoving: boolean = true,
    defaultPositionsMap?: Map<string, GridIndices>,
): Promise<void> {
    if (defaultPositionsMap) {
        if (isMoving) {
            const command =
                moveAllRobotsToDefaultPositions(defaultPositionsMap);
            await executor.execute(command);
        } else {
            setAllRobotsToDefaultPositions(defaultPositionsMap);
        }
    } else {
        if (isMoving) {
            const command = moveAllRobotsHomeToDefaultOptimized();
            await executor.execute(command);
        } else {
            setAllRobotsToDefaultPositions();
        }
    }
}

const queue = new PriorityQueue<string>();
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

    // if there is an actual message, forward it to appropriate handler
    ws.on("message", async (data) => {
        const message = parseMessage(data.toString());
        console.log("Received message: " + message.toJson());

        //find in the url where we specify the page
        const cutoffIndex = req.url.indexOf("page=") + 5;
        // take out that page value, add a delimeter
        const pageString = req.url.substring(cutoffIndex);
        // // add current page to the cookie id
        // const finalSocketId = pageValue.concat(req.cookies.id);

        if (message instanceof RegisterWebsocketMessage) {
            console.log(`Register a new socket with request ${req.cookies.id}`);

            socketManager.registerSocket(req.cookies.id, ws);
        } else if (
            message instanceof GameInterruptedMessage ||
            message instanceof MoveMessage ||
            message instanceof SetChessMessage ||
            message instanceof GameHoldMessage ||
            message instanceof GameFinishedMessage ||
            message instanceof GameEndMessage
        ) {
            // TODO: Handle game manager not existing
            if (gameManager === null || gameManager === undefined) {
                console.log("BRUHHH");
            }
            await gameManager?.handleMessage(message, req.cookies.id);
        } else if (message instanceof DriveRobotMessage) {
            await doDriveRobot(message);
        } else if (message instanceof SetRobotVariableMessage) {
            await doSetRobotVariable(message);
        } else if (message instanceof JoinQueue) {
            console.log("So we got the join message");
            // this was initially !isPlayer, shouldn't it be isPlayer?
            if (
                pageString.indexOf("debug") === -1 &&
                !clientManager.isPlayer(req.cookies.id)
            ) {
                if (queue.find(req.cookies.id) === undefined) {
                    queue.insert(req.cookies.id, 0);
                }
                names.set(req.cookies.id, message.playerName);
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

/**
 * client information endpoint
 *
 * finds the client type and checks if the game is active
 * used when a client connects to the server
 */

apiRouter.get("/client-information", async (req, res) => {
    const clientType = clientManager.getClientType(req.cookies.id);
    // loading saves from file if found
    const oldSave = SaveManager.loadGame(req.cookies.id);
    if (oldSave && DO_SAVES) {
        console.log("ADACHI!!");
        // if the game was an ai game, create a computer game manager with the ai difficulty
        if (oldSave.aiDifficulty !== -1) {
            const cgm = new ComputerGameManager(
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
            setGameManager(cgm);
            await cgm.makeFirstMove();
        } else {
            // create a new human game manger with appropriate clients
            setGameManager(
                new HumanGameManager(
                    new ChessEngine(oldSave.game),
                    socketManager,
                    oldSave.hostWhite ? Side.WHITE : Side.BLACK,
                    clientManager,
                    oldSave.host !== req.cookies.id,
                ),
            );
        }
        const robotPos = new Map(
            oldSave!.robotPos?.map<[string, GridIndices]>((obj) => [
                obj[1],
                new GridIndices(
                    parseInt(obj[0].split(", ")[0]),
                    parseInt(obj[0].split(", ")[1]),
                ),
            ]),
        );
        console.log(robotPos);
        setAllRobotsToDefaultPositions(robotPos);
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

/**
 * game state endpoint
 *
 * gets the game state from the game manager
 * returns an object with the side, game pgn, and the game end reason
 */
apiRouter.get("/game-state", (req, res) => {
    if (gameManager === null || gameManager === undefined) {
        console.warn("Invalid attempt to fetch game state");
        return res.status(400).send({ message: "No game is currently active" });
    }
    const clientType = clientManager.getClientType(req.cookies.id);
    return res.send({
        state: gameManager.getGameState(clientType),
        pause: gamePaused,
    });
});

/**
 * start computer game endpoint
 *
 * creates a new computer game manager based on the requests's side and difficulty
 * returns a success message
 */
apiRouter.post("/start-computer-game", async (req, res) => {
    console.log("start comp game");
    canReloadQueue = true;
    const side = req.query.side as Side;
    const difficulty = parseInt(req.query.difficulty as string) as Difficulty;

    // Position robots from home to default positions before starting the game
    try {
        await setupDefaultRobotPositions(!START_ROBOTS_AT_DEFAULT);
    } catch (error) {
        console.error("Error positioning robots for computer game:", error);
        return res.status(500).send({
            message: "Failed to position robots for game start",
        });
    }

    // create a new computer game manager
    const cgm = new ComputerGameManager(
        new ChessEngine(),
        socketManager,
        side,
        difficulty,
        false,
    );
    setGameManager(cgm);
    await cgm.makeFirstMove();
    return res.send({ message: "success" });
});

/**
 * start human game endpoint
 *
 * creates a new human game engine based on the request's side
 *
 * returns a success message
 */
apiRouter.post("/start-human-game", async (req, res) => {
    canReloadQueue = true;
    const side = req.query.side as Side;

    // Position robots from home to default positions before starting the game
    try {
        await setupDefaultRobotPositions(!START_ROBOTS_AT_DEFAULT);
    } catch (error) {
        console.error("Error positioning robots for human game:", error);
        return res.status(500).send({
            message: "Failed to position robots for game start",
        });
    }

    // create a new human game manager
    setGameManager(
        new HumanGameManager(
            new ChessEngine(),
            socketManager,
            side,
            clientManager,
            false,
        ),
    );
    return res.send({ message: "success" });
});

apiRouter.post("/start-puzzle-game", async (req, res) => {
    //get puzzle components
    const puzzle = JSON.parse(req.query.puzzle as string) as PuzzleComponents;
    const fen = puzzle.fen;
    const moves = puzzle.moves;
    const difficulty = puzzle.rating;

    console.log(
        `Fein is ${fen}, moves are ${moves}, difficulty is ${difficulty}`,
    );

    if (puzzle.robotDefaultPositions) {
        // Convert puzzle.robotDefaultPositions from Record<string, string> to Map<string, GridIndices>
        const defaultPositionsMap = new Map<string, GridIndices>();
        for (const [robotId, startSquare] of Object.entries(
            puzzle.robotDefaultPositions,
        )) {
            const robot = robotManager.getRobot(robotId);
            if (robot) {
                // Convert square string to GridIndices using squareToGrid
                const gridIndices = GridIndices.squareToGrid(startSquare);
                defaultPositionsMap.set(robotId, gridIndices);
                console.log(
                    `Robot ${robotId} will move to square ${startSquare} (${gridIndices.toString()})`,
                );
            } else {
                return res.status(400).send({
                    message:
                        "Missing robot " +
                        robotId +
                        " which is required to start the puzzle, because it is included in the puzzle's robotDefaultPositions map.",
                });
            }
        }

        // Execute the movement command with the converted positions
        await setupDefaultRobotPositions(
            !START_ROBOTS_AT_DEFAULT,
            defaultPositionsMap,
        );
    } else {
        throw Error(
            "Should have the default positions set up, but the config is missing.",
        );
    }
    setGameManager(
        new PuzzleGameManager(
            new ChessEngine(),
            socketManager,
            fen,
            "",
            moves,
            difficulty,
        ),
    );

    return res.send({ message: "success" });
});

/**
 * Returns all registered robot ids
 */
apiRouter.get("/get-ids", (_, res) => {
    let ids: string[];
    if (!tcpServer) {
        // Virtual robots
        ids = Array.from(robotManager.idsToRobots.keys());
    } else {
        // Real server
        ids = tcpServer.getConnectedIds();
    }
    return res.send({ ids });
});

/**
 * move a random robot forward and turn 45 degrees
 */
apiRouter.get("/do-smth", async (_, res) => {
    const robotsEntries = Array.from(robotManager.idsToRobots);
    const randomRobotIndex = Math.floor(Math.random() * robotsEntries.length);
    const [, robot] = robotsEntries[randomRobotIndex];
    await robot.sendDrivePacket(1);
    await robot.sendTurnPacket(45 * DEGREE);

    res.send({ message: "success" });
});

apiRouter.get("/do-parallel", async (_, res) => {
    console.log("Starting parallel command group");
    const robotsEntries = Array.from(robotManager.idsToRobots.entries());
    console.log(robotsEntries);
    const commands: Command[] = [];
    for (const [, robot] of robotsEntries) {
        console.log("Moving robot " + robot.id);
        // await robot.sendDrivePacket(1);
        commands.push(
            new SequentialCommandGroup([
                new DriveQuadraticSplineCommand(
                    robot.id,
                    { x: 0, y: 0 },
                    { x: 3, y: 3 },
                    { x: 0, y: 3 },
                    4000,
                ),
                new DriveQuadraticSplineCommand(
                    robot.id,
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    { x: 0, y: 0 },
                    30,
                ),
            ]),
        );
    }
    const start = Date.now();
    console.log("Starting command group");
    await new ParallelCommandGroup(commands).execute();
    const time = Date.now() - start;
    console.log("Finished command group in " + time + "ms");

    res.send({ message: "success", timeMs: time });
});

apiRouter.post("/do-big", async (req, res) => {
    console.log("Parsing show");

    const validateResult = ShowfileSchema.validate(
        JSON.parse(req.query.show as string),
    );

    if (!validateResult.success) {
        res.status(400).json({ error: "Showfile is invalid" });
        console.log("Show parsing failed");
        return;
    }

    const show = validateResult.value;

    const connectedRobotIds = Array.from(robotManager.idsToRobots.keys());

    if (connectedRobotIds.length < show.timeline.length) {
        const r = {
            error: `Not enough robots connected. Got ${connectedRobotIds.length}, expected ${show.timeline.length}`,
        };
        res.status(400).json(r);
        console.log(r);
        return;
    }

    const commandGroupsForAllRobots: Command[] = [];
    for (
        let timelineLayerIndex = 0;
        timelineLayerIndex < show.timeline.length;
        timelineLayerIndex++
    ) {
        // TODO: make a way to map robot ids to timeline layers, so we can choose which physical robot to use for each timeline layer
        const robotId = connectedRobotIds[timelineLayerIndex];
        const layer = show.timeline[timelineLayerIndex];
        let start = layer.startPoint.target.point;
        const sequentialCommandsForCurrentRobot: Command[] = [];
        for (
            let eventIndex = 0;
            eventIndex < layer.remainingEvents.length;
            eventIndex++
        ) {
            const event = layer.remainingEvents[eventIndex];
            if (event.type === TimelineEventTypes.GoToPointEvent) {
                if (event.target.type === SplinePointType.QuadraticBezier) {
                    sequentialCommandsForCurrentRobot.push(
                        new DriveQuadraticSplineCommand(
                            robotId,
                            start,
                            event.target.endPoint,
                            event.target.controlPoint,
                            event.durationMs,
                        ),
                    );
                } else if (event.target.type === SplinePointType.CubicBezier) {
                    sequentialCommandsForCurrentRobot.push(
                        new DriveCubicSplineCommand(
                            robotId,
                            start,
                            event.target.endPoint,
                            event.target.controlPoint,
                            event.target.controlPoint2,
                            event.durationMs,
                        ),
                    );
                }
                start = event.target.endPoint;
            } else if (event.type === TimelineEventTypes.WaitEvent) {
                sequentialCommandsForCurrentRobot.push(
                    new DriveQuadraticSplineCommand(
                        robotId,
                        start,
                        start,
                        start,
                        event.durationMs,
                    ),
                );
            } else if (event.type === TimelineEventTypes.TurnEvent) {
                sequentialCommandsForCurrentRobot.push(
                    new SpinRadiansCommand(
                        robotId,
                        event.radians,
                        event.durationMs,
                    ),
                );
            }
        }
        if (sequentialCommandsForCurrentRobot.length === 0) {
            console.warn("No commands found for robot " + robotId);
            continue;
        }

        // adding this command which tells the robot to start and stop moving at the same place as a scuffed stop command.
        // otherwise the robot will keep moving at the speed of the last command it was given.
        sequentialCommandsForCurrentRobot.push(
            new DriveQuadraticSplineCommand(
                connectedRobotIds[timelineLayerIndex],
                start,
                start,
                start,
                30,
            ),
        );
        commandGroupsForAllRobots.push(
            new SequentialCommandGroup(sequentialCommandsForCurrentRobot),
        );
    }
    const start = Date.now();
    console.log("Executing commands");
    await new ParallelCommandGroup(commandGroupsForAllRobots).execute();
    const timeMs = Date.now() - start;
    console.log("Command execution completed", { timeMs });
    res.send({ message: "success", timeMs });
});

/**
 * get the current state of the virtual robots for the simulator
 */
apiRouter.get("/get-simulator-robot-state", (_, res) => {
    if (!USE_VIRTUAL_ROBOTS) {
        return res.status(400).send({ message: "Simulator is not enabled." });
    }
    const robotsEntries = Array.from(robotManager.idsToRobots);

    // get all of the robots and their positions
    const robotState = Object.fromEntries(
        robotsEntries.map(([id, robot]) => {
            const headingRadians = robot.headingRadians;
            const position = new Position(robot.position.x, robot.position.y);

            // const tunnel = robot.getTunnel();
            // if (tunnel instanceof VirtualBotTunnel) {
            //     position = tunnel.position;
            //     headingRadians = tunnel.headingRadians;
            // }
            return [id, { position, headingRadians: headingRadians }];
        }),
    );

    //send the robots and any tunnel messages
    return res.send({
        robotState,
        messages: Array.from(VirtualBotTunnel.messages),
    });
});

/**
 * Returns a list of available puzzles.
 */
apiRouter.get("/get-puzzles", (_, res) => {
    const out: string = JSON.stringify(puzzles);
    return res.send(out);
});

/**
 * Pause the game
 * Todo: add authentication instead of an exposed pause call
 */
apiRouter.get("/pause-game", (_, res) => {
    return res.send(pauseGame(true));
});

/**
 * Unpause the game
 * Todo: add authentication instead of an exposed unpause call
 */

apiRouter.get("/unpause-game", async (_, res) => {
    const unpausePacket = unpauseGame(true);

    return res.send(unpausePacket);
});

/**
 * sends a drive message through the tcp connection
 *
 * @param message - the robot id and left/right motor powers
 * @returns boolean if successful
 */
async function doDriveRobot(message: DriveRobotMessage): Promise<boolean> {
    // check if robot is registered
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

        // check if robot is connected
        if (!tunnel.connected) {
            console.warn(
                "attempted manual move for disconnected robot ID " + message.id,
            );
            return false;

            // send the robot message
        } else {
            await tunnel.send({
                type: PacketType.DRIVE_TANK,
                left: message.leftPower,
                right: message.rightPower,
            });
        }
    }
    return true;
}

/**
 * set a variable on the robot
 * @param message - the robot id and variable information to change
 * @returns boolean completed successfully
 */
async function doSetRobotVariable(
    message: SetRobotVariableMessage,
): Promise<boolean> {
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
            await tunnel.send({
                type: PacketType.SET_VAR,
                var_id: parseInt(message.variableName),
                var_type: "float",
                var_val: message.variableValue,
            });
        }
    }
    return true;
}
