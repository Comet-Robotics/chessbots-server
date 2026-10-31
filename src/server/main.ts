import { ClientManager } from "./api/client-manager";
import { ComputerGameManager, GameManager, HumanGameManager, PuzzleGameManager } from "./game/game-manager";
import { SocketManager } from "./api/socket-manager";
import { WHITE } from "chess.js";
import { ChessEngine, Side } from "../common/chess";
import { Hono } from "hono";
import { WebSocketServer } from "ws";
import { getCookie } from "hono/cookie";
import { robotManager } from "./robot/robot-manager";
import { puzzles } from "./game/puzzles";
import { RobotId } from "./api/config";
import { executor } from "./command/executor";
import { CenterCommand } from "./command/command";

export const socketManager = new SocketManager({})
export const clientManager = new ClientManager(socketManager)
export const gameManager = new GameManager(new ChessEngine(), socketManager, WHITE, false)

// const wss = new WebSocketServer({ noServer: true })
const app = new Hono();

app.use((c, next) => {
    let id = getCookie(c, "id");
    if (id) {
        clientManager.assignPlayer(id);
    }

    return next();
});

app.get("/", (c) => {
    return c.redirect("/home");
});

app.get("/api/get-queue", (c) => {
    // if (names) return res.send([...names.values()]);
    return c.json([]);
});

/**
 * gets the name associated with the request cookie
 */
app.get("/api/get-name", (c) => {
    return c.text("");
});

/**
 * client information endpoint
 *
 * finds the client type and checks if the game is active
 * used when a client connects to the server
 */

app.get("/api/client-information", async (c) => {
    let id = getCookie(c, "id");
    if (!id) {
        return c.status(400)
    }

    const clientType = clientManager.getClientType(id);
    
    /**
     * Note the client currently redirects to home from the game over screen
     * So removing the isGameEnded check here results in an infinite loop
     */
    const isGameActive = gameManager !== null && !gameManager.isGameEnded();
    return c.json({
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
app.get("/api/game-state", (c) => {
    return c.json(gameManager.getGameState());
});

app.post("/api/start-computer-game", async (c) => {
    const { side, difficulty } = c.req.query()

    // create a new computer game manager
    const cgm = new ComputerGameManager(
        new ChessEngine(),
        socketManager,
        side as Side,
        Number(difficulty),
        false,
    );

    setGameManager(cgm);
    await cgm.makeFirstMove();
    return c.json({ message: "success" });
});

app.post("/api/start-human-game", async (c) => {
    const side = c.req.query("side") as Side;

    // Position robots from home to default positions before starting the game
    try {
        // await setupDefaultRobotPositions(!START_ROBOTS_AT_DEFAULT);
    } catch (error) {
        console.error("Error positioning robots for human game:", error);
        c.status(500)
        return c.json({
            message: "Failed to position robots for game start",
        })
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
    return c.status(200);
});

app.post("/api/start-puzzle-game", async (c) => {
    const puzzle = puzzles[Number(c.req.query("puzzle"))];

    const fen = puzzle.fen;
    const moves = puzzle.moves;
    const difficulty = puzzle.rating;

    console.log(
        `Fein is ${fen}, moves are ${moves}, difficulty is ${difficulty}`,
    );

    // TODO default positions

    setGameManager(
        new PuzzleGameManager(
            new ChessEngine(true),
            socketManager,
            fen,
            "",
            moves,
            difficulty,
        ),
    );

    return c.json({ message: "success" });
});

/**
 * Returns all registered robot ids
 */
app.get("/api/get-ids", (c) => {
    return c.json(robotManager.connectedRobots())
});

/**
 * Returns a list of available puzzles.
 */
app.get("/api/get-puzzles", (c) => {
    return c.json(puzzles);
});

/**
 * Pause the game
 * Todo: add authentication instead of an exposed pause call
 */
app.get("/api/pause-game", (c) => {
    gameManager.pause()
    return c.body(null, 200);
});

/**
 * Unpause the game
 * Todo: add authentication instead of an exposed unpause call
 */

app.get("/api/pause-game", (c) => {
    gameManager.unpause()
    return c.body(null, 200);
});

// app.post("/api/force-move", async (c) => {
//   const { robotId, dist } = c.req.query()

//     const command = new DriveCommand(
//         Number(robotId) as RobotId,
//         Number(dist as string),
//     );
    
//     return executor.execute(command).then(() => {
//         return c.json({ message: "success" });
//     });
// });

// app.post("/api/force-turn", async (c) => {
//     const { robotId, rad } = c.req.query();
//     const command = new RelativeRotateCommand(
//         Number(robotId) as RobotId,
//         Number(rad),
//     );

//     return executor.execute(command).then(() => {
//         return c.json({ message: "success" });
//     });
// });

app.post("/api/force-center", async (c) => {
    const { robotId } = c.req.query();
    const command = new CenterCommand(Number(robotId) as RobotId);
    executor.execute(command);
    return c.json({ message: "success" });
});



// ================== WebSocket ====================

// app.get("/api/ws", 
//   upgradeWebSocket((c) => {
//     return {
//       onMessage: (event, ws) => {
//         const message = parseMessage(data.toString());
//         console.log("Received message: " + JSON.stringify(message));

//         // take out that page value, add a delimeter
//         // // add current page to the cookie id
//         // const finalSocketId = pageValue.concat(req.cookies.id);

//         if (message.type === MessageType.REGISTER_WEBSOCKET) {
//             let id = getCookie(c, "id");
//             if (id) {
//                 socketManager.registerSocket(id, ws);
//             }
//         } else if (
//             message.type === MessageType.GAME_INTERRUPTED ||
//             message.type === MessageType.MOVE ||
//             message.type === MessageType.SET_CHESS ||
//             message.type === MessageType.GAME_HELD ||
//             message.type === MessageType.GAME_FINISHED ||
//             message.type === MessageType.GAME_ENDED
//         ) {
//             await gameManager?.handleMessage(message, req.cookies.id);
//         } else if (message.type === MessageType.DRIVE_ROBOT) {
//             await doDriveRobot(message as DriveRobotMessage);
//         } else if (message.type === MessageType.SET_ROBOT_VARIABLE) {
//             await doSetRobotVariable(message as SetRobotVariableMessage);
//         } else if (message.type === MessageType.JOIN_QUEUE) {
//             console.log("So we got the join message");
//             // this was initially !isPlayer, shouldn't it be isPlayer?
//             if (!clientManager.isPlayer(req.cookies.id)) {
//                 if (queue.find(req.cookies.id) === undefined) {
//                     queue.insert(req.cookies.id, 0);
//                 }
//                 names.set(req.cookies.id, message.playerName);
//                 socketManager.sendToAll(createUpdateQueue([...names.values()]));
//             }
//         }
//       },
//       onClose: () => {
//             console.log(`We closed the connection of ${req.cookies.id}`);
//         socketManager.handleSocketClosed(req.cookies.id, ws);

//         //if you reload and the game is over
//         if (gameManager?.isGameEnded() && canReloadQueue) {
//             //make the reassignment occur once per game instead of once per reload
//             canReloadQueue = false;

//             //remove the old players and store them for future reference
//             const oldPlayers = clientManager.getIds();
//             clientManager.removeHost();
//             clientManager.removeClient();

//             if (oldPlayers !== undefined) {
//                 //in most cases, the second player becomes the host
//                 clientManager.assignPlayer(oldPlayers[1]);

//                 //if no one else wants to play, the host just swaps
//                 if (queue.size() === 0) {
//                     clientManager.assignPlayer(oldPlayers[0]);
//                 }

//                 //if there is one person who wants to play, host moves to the second player
//                 if (queue.size() === 1) {
//                     const newPlayer = queue.pop();
//                     if (newPlayer) {
//                         clientManager.removeSpectator(newPlayer);
//                         clientManager.assignPlayer(newPlayer);
//                         names.delete(newPlayer);
//                     }
//                 }

//                 //are enough people to start a game, forget the old people
//                 if (queue.size() >= 2) {
//                     const newPlayer = queue.pop();
//                     const newSecondPlayer = queue.pop();
//                     if (newPlayer && newSecondPlayer) {
//                         //reset the clients
//                         clientManager.removeHost();
//                         clientManager.removeClient();

//                         //assign new players
//                         clientManager.removeSpectator(newPlayer);
//                         clientManager.assignPlayer(newPlayer);
//                         names.delete(newPlayer);
//                         clientManager.removeSpectator(newSecondPlayer);
//                         clientManager.assignPlayer(newSecondPlayer);
//                         names.delete(newSecondPlayer);
//                     }
//                 }
//             }
//         }

//         //wait in case the client is just reloading or disconnected instead of leaving
//         setTimeout(() => {
//             if (socketManager.getSockets(req.cookies.id) === undefined) {
//                 //remove the person from the queue to free up space
//                 queue.popInd(queue.find(req.cookies.id));
//                 names.delete(req.cookies.id);
//                 const clientType = clientManager.getClientType(req.cookies.id);

//                 //if the person was a host / client, a new one needs to be reassigned
//                 if (clientManager.isPlayer(req.cookies.id)) {
//                     //clear the existing game
//                     const ids = clientManager.getIds();

//                     setGameManager(null);

//                     //remove the old host/client
//                     clientType === ClientType.HOST ?
//                         clientManager.removeHost()
//                         : clientManager.removeClient();

//                     //if there exists someone to take their place
//                     const newPlayer = queue.pop();
//                     if (newPlayer) {
//                         //transfer them from spectator to the newly-opened spot and remove them from queue
//                         clientManager.removeSpectator(newPlayer);
//                         clientManager.assignPlayer(newPlayer);
//                         names.delete(newPlayer);
//                         socketManager.sendToAll(
//                             createGameInterruptedMessage(GameInterruptedReason.ABORTED),
//                         );
//                     }
//                     //else they were a spectator and don't need game notifications anymore
//                 } else {
//                     clientManager.removeSpectator(req.cookies.id);
//                 }

//                 //update the queue and reload all the pages
//                 socketManager.sendToAll(createUpdateQueue([...names.values()]));
//                 socketManager.sendToAll(createGameStartedMessage());
//             }
//         }, 5000);
//       },
//     }
//   })
// );