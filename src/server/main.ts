import { ClientManager } from "./api/client-manager";
import { ComputerGameManager, GameManager, HumanGameManager, PuzzleGameManager } from "./game/game-manager";
import { SocketManager } from "./api/socket-manager";
import { WHITE } from "chess.js";
import { ChessEngine, Side } from "../common/chess";
import { Hono } from "hono";
import { WebSocketServer } from "ws";
import { getCookie, setCookie } from "hono/cookie";
import { robotManager } from "./robot/robot-manager";
import { puzzles } from "./game/puzzles";
import { RobotId } from "./api/config";
import { executor } from "./command/executor";
import { CenterCommand } from "./command/command";
import { serve, upgradeWebSocket } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { randomUUID, UUID } from "node:crypto";
import z from "zod";
import { MessageSchema, MessageType } from "../common/message";

export let socketManager = new SocketManager()
export let clientManager = new ClientManager(socketManager)
export let gameManager = new GameManager(new ChessEngine(), socketManager, WHITE, false)

function setGameManager(m: GameManager) {
    gameManager = m
}

// const wss = new WebSocketServer({ noServer: true })
const app = new Hono<{ Variables: { uuid: string } }>();

app.use((c, next) => {
    let id = z.safeParse(z.uuidv4(), getCookie(c, "uuid"));
    if (id.success) {
        c.set('uuid', id.data)
    } else {
        let uuid = randomUUID()
        clientManager.registerUser(uuid)
        setCookie(c, "uuid", uuid);
        c.set('uuid', uuid)
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
    let id = c.get("uuid");

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
app.get("/api/ws",
    upgradeWebSocket((c) => {
        const uuid: string = c.get('uuid')

        return {
            onMessage: async (event, ws) => {
                const parsedMessage = z.safeParse(MessageSchema, event.data);
                console.log("Received message: " + parsedMessage);

                if (!parsedMessage.success) {
                    return;
                }

                const message = parsedMessage.data;
                if (message.type === MessageType.REGISTER_WEBSOCKET) {
                    socketManager.registerSocket(c.get('uuid'), ws);
                } else if (
                    message.type === MessageType.GAME_INTERRUPTED ||
                    message.type === MessageType.MOVE ||
                    message.type === MessageType.SET_CHESS ||
                    message.type === MessageType.GAME_HELD ||
                    message.type === MessageType.GAME_FINISHED ||
                    message.type === MessageType.GAME_ENDED
                ) {
                    await gameManager?.handleMessage(message, uuid);
                }
            },
            onClose: () => {
                console.log(`We closed the connection of ${uuid}`);
                socketManager.handleSocketClosed(uuid);
            },
        }
    })
);

// This will only be reached in prod, with dev vite intercepts the request
app.use("*", serveStatic({ root: "../client/dist" }));

serve(app)
export default app;