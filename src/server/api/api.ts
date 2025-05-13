import { WebsocketRequestHandler } from "express-ws";
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

import { TCPServer } from "./tcp-interface";
import { Difficulty } from "../../common/client-types";
import { RegisterWebsocketMessage } from "../../common/message/message";
import { clientManager, robotManager, socketManager } from "./managers";
import {
    ComputerGameManager,
    GameManager,
    HumanGameManager,
    PuzzleGameManager,
} from "./game-manager";
import { ChessEngine } from "../../common/chess-engine";
import { Move, Side } from "../../common/game-types";
import { USE_VIRTUAL_ROBOTS } from "../utils/env";
import { SaveManager } from "./save-manager";
import { readFileSync } from "fs";

import { CommandExecutor } from "../command/executor";
import { VirtualBotTunnel, virtualRobots } from "../simulator";
import { Position } from "../robot/position";
import { DEGREE } from "../../common/units";
import { PacketType } from "../utils/tcp-packet";

export const tcpServer: TCPServer | null =
    USE_VIRTUAL_ROBOTS ? null : new TCPServer();
export const executor = new CommandExecutor();

export let gameManager: GameManager | null = null;

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
            // create a new human game manger with appropriate clients
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
apiRouter.post("/start-computer-game", (req, res) => {
    const side = req.query.side as Side;
    const difficulty = parseInt(req.query.difficulty as string) as Difficulty;
    // create a new computer game manager
    gameManager = new ComputerGameManager(
        new ChessEngine(),
        socketManager,
        side,
        difficulty,
        false,
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
apiRouter.post("/start-human-game", (req, res) => {
    const side = req.query.side as Side;
    // create a new human game manager
    gameManager = new HumanGameManager(
        new ChessEngine(),
        socketManager,
        side,
        clientManager,
        false,
    );
    return res.send({ message: "success" });
});

apiRouter.post("/start-puzzle-game", (req, res) => {
    //get puzzle components
    const puzzle = JSON.parse(req.query.puzzle as string) as PuzzleComponents;
    const fen = puzzle.fen;
    const moves = puzzle.moves;
    const difficulty = puzzle.rating;
    //create game manager
    gameManager = new PuzzleGameManager(
        new ChessEngine(),
        socketManager,
        fen,
        moves,
        difficulty,
    );

    // TODO: this is very bad and not good practice. MAKE ME REFACTOR THIS BEFORE I MERGE
    // @ts-ignore
    const piecesInPuzzle = (gameManager.chess.chess.board() as {color: 'w' | 'b', square: string, type: string}[][]).flatMap((p) => {
        return p
    }).filter(p => p)

    /* DICTATED BRAINDUMP SINCE I AM BEING FORCED OUT OF MAKERSPACE AGAINST MY WILL --


    Okay, so, so far I've written code to get all the pieces, all the piece types and locations and colors that are in a puzzle, and so far all we do is check that we have enough robots connected to the server to start the game. And if there's not, we throw an error. From here there's a couple things that need to happen. We know there's enough robots to get this puzzle going. 
    
    Challenge one: we need to figure out how exactly we're going to figure out what the piece type and color on the physical robots. Because right now there's no direct association of a piece type + color to a robot, at least on the server where i need this information. So we might have to infer that from the state of the chessboard on the client, which is going to be interesting, especially on the initial start of the application, because on the server side of things we don't have a game manager to pull the state of the board from. So that's, that's challenge one. 
    
    Challenge two: use some heuristics to specifically map a puzzle piece to a physical robot. We'll do this by:
    * creating a map of grid indices to the needed piece type and color
    * iterating through the piecesInPuzzle list to build a map of grid indices to the physical robot which should be moved to that location
        * for each puzzle chess piece, we select a robot which has the correct color and type. for the purposes of an MVP, we can just use the first piece we find which match the color and type conditions. to make movement more efficient, we should prioritize minimizing movement by selecting the physical robot which is closest to the final destination.
    
    Once we do that, we just need to execute those moves so the needed robots are the correct start position for the puzzle, and get all the other robots out of the way to their home positions, and then we can allow the player to play the puzzle. So this should probably all take place in the start puzzle game endpoint, so that players can't take actions in the puzzle until all the pieces have moved into the correct positions to allow the game to be played.

    And I think that's everything that needs to happen. It's just some kind of annoying stuff. Yeah, cool.

    */

    if (robotManager.idsToRobots.size < piecesInPuzzle.length) {
        return res.status(400).send({ message: "Not enough robots to start game" });
    }


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
    const robotsEntries = Array.from(virtualRobots.entries());
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
    const robotsEntries = Array.from(virtualRobots.entries());

    // get all of the robots and their positions
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

    //send the robots and any tunnel messages
    return res.send({
        robotState,
        messages: Array.from(VirtualBotTunnel.messages),
    });
});

export interface PuzzleComponents {
    fen: string;
    moves: Move[];
    rating: number;
}

/**
 * Returns a list of available puzzles to play from puzzles.json.
 */
apiRouter.get("/get-puzzles", (_, res) => {
    const puzzles: Record<string, PuzzleComponents> = JSON.parse(
        readFileSync("./src/server/api/puzzles.json", "utf-8"),
    );
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
