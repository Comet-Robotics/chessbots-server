import type { WebsocketRequestHandler } from "express-ws";
import { Router } from "express";

import { parseMessage } from "../../common/message/parse-message";
import {
    GameFinishedMessage,
    GameEndMessage,
    GameHoldMessage,
    GameInterruptedMessage,
    MoveMessage,
    SetChessMessage,
} from "../../common/message/game-message";
import {
    DriveRobotMessage,
    SetRobotVariableMessage,
} from "../../common/message/robot-message";

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
import { USE_VIRTUAL_ROBOTS } from "../utils/env";
import { SaveManager } from "./save-manager";

import { VirtualBotTunnel } from "../simulator";
import { Position } from "../robot/position";
import { DEGREE } from "../../common/units";
import { PacketType } from "../utils/tcp-packet";
import { GridIndices } from "../robot/grid-indices";
import puzzles, { type PuzzleComponents } from "./puzzles";
import {
    moveAllRobotsToDefaultPositions,
    moveAllRobotsToConfigDefaultPositions,
} from "../robot/path-materializer";
import { robotManager } from "../robot/robot-manager";
import { tcpServer } from "./tcp-interface";
import { executor } from "../command/executor";

/**
 * Helper function to move all robots from their home positions to their default positions
 * for regular chess games
 */
async function setupDefaultRobotPositions(): Promise<void> {
    const robotsEntries = Array.from(robotManager.idsToRobots);

    for (const [robotId, robot] of robotsEntries) {
        const currentPosition = GridIndices.fromPosition(robot.position);
        const defaultPosition = robot.defaultIndices;

        if (!currentPosition.equals(defaultPosition)) {
            console.log(
                `Moving robot ${robotId} from home to default position`,
            );
            const command = moveAllRobotsToConfigDefaultPositions();
            await executor.execute(command);
            console.log(`Moved robot ${robotId} to default position`);
        } else {
            console.log(`Robot ${robotId} is already at default position`);
        }
    }
}

/**
 * An endpoint used to establish a websocket connection with the server.
 *
 * The websocket is used to stream moves to and from the client.
 */
export const websocketHandler: WebsocketRequestHandler = (ws, req) => {
    // on close, delete the cookie id
    ws.on("close", () => {
        socketManager.handleSocketClosed(req.cookies.id);
    });

    // if there is an actual message, forward it to appropriate handler
    ws.on("message", async (data) => {
        const message = parseMessage(data.toString());
        console.log("Received message: " + message.toJson());

        if (message instanceof RegisterWebsocketMessage) {
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
            await gameManager?.handleMessage(message, req.cookies.id);
        } else if (message instanceof DriveRobotMessage) {
            await doDriveRobot(message);
        } else if (message instanceof SetRobotVariableMessage) {
            await doSetRobotVariable(message);
        }
    });
};

export const apiRouter = Router();

/**
 * client information endpoint
 *
 * finds the client type and checks if the game is active
 * used when a client connects to the server
 */

apiRouter.get("/client-information", (req, res) => {
    const clientType = clientManager.getClientType(req.cookies.id);
    // loading saves from file if found
    const oldSave = SaveManager.loadGame(req.cookies.id);
    if (oldSave) {
        // if the game was an ai game, create a computer game manager with the ai difficulty
        if (oldSave.aiDifficulty !== -1) {
            setGameManager(
                new ComputerGameManager(
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
                ),
            );
            // create a new human game manger with appropriate clients
        } else {
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
    if (gameManager === null) {
        console.warn("Invalid attempt to fetch game state");
        return res.status(400).send({ message: "No game is currently active" });
    }
    const clientType = clientManager.getClientType(req.cookies.id);
    return res.send(gameManager.getGameState(clientType));
});

/**
 * start computer game endpoint
 *
 * creates a new computer game manager based on the requests's side and difficulty
 * returns a success message
 */
apiRouter.post("/start-computer-game", async (req, res) => {
    const side = req.query.side as Side;
    const difficulty = parseInt(req.query.difficulty as string) as Difficulty;

    // Position robots from home to default positions before starting the game
    try {
        await setupDefaultRobotPositions();
    } catch (error) {
        console.error("Error positioning robots for computer game:", error);
        return res.status(500).send({
            message: "Failed to position robots for game start",
        });
    }

    // create a new computer game manager
    setGameManager(
        new ComputerGameManager(
            new ChessEngine(),
            socketManager,
            side,
            difficulty,
            false,
        ),
    );
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
    const side = req.query.side as Side;

    // Position robots from home to default positions before starting the game
    try {
        await setupDefaultRobotPositions();
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
        console.log("before command is made");
        const command = moveAllRobotsToDefaultPositions(defaultPositionsMap);
        console.log("command is made");
        await executor.execute(command);
        console.log("All robots moved to their puzzle default positions");
    }
    setGameManager(
        new PuzzleGameManager(
            new ChessEngine(),
            socketManager,
            fen,
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
