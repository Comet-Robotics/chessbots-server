import { Router } from "express";
import { BLACK, ChessEngine, Difficulty, Side, Square, WHITE } from "../../common/chess";
import { GridPosition, gridPositionFromSquare, gridPositionFromString } from "../../common/units";
import { robotManager } from "../robot/robot-manager";
import { ComputerGameManager, HumanGameManager, PuzzleGameManager } from "../game/game-manager";
import { Hono } from "hono";
import { CenterCommand, DriveCommand, RelativeRotateCommand } from "../command/move-command";
import { setAllRobotsToDefaultPositions } from "../game/pauseHandler";

export const apiRouter = Hono();

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
                new ChessEngine(false, oldSave.game),
                socketManager,
                oldSave.host === req.cookies.id ?
                    oldSave.hostWhite ?
                        WHITE
                        : BLACK
                    : oldSave.hostWhite ? BLACK
                        : WHITE,
                oldSave.aiDifficulty,
                oldSave.host !== req.cookies.id,
            );
            setGameManager(cgm);
            await cgm.makeFirstMove();
        } else {
            // create a new human game manger with appropriate clients
            setGameManager(
                new HumanGameManager(
                    new ChessEngine(false, oldSave.game),
                    socketManager,
                    oldSave.hostWhite ? WHITE : BLACK,
                    clientManager,
                    oldSave.host !== req.cookies.id,
                ),
            );
        }
        const robotPos = new Map<string, GridPosition>(
            oldSave!.robotPos?.map<[string, GridPosition]>((obj) => [
                obj[1],
                gridPositionFromString(obj[0]),
            ]) || [],
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
    console.log("start comp game");
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

/**
 * start hexapawn game endpoint
 *
 * creates a new human game engine based on the request's side
 *
 * returns a success message
 */
apiRouter.post("/start-hexapawn-game", async (req, res) => {
    const side = req.query.side as Side;
    const robot = robotManager.getRobot(robotId);

    robot.config.hexapawn_home_pos
    // create a new human game manager
    setGameManager(
        new HexapawnGameManager(
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
        // Convert puzzle.robotDefaultPositions from Record<string, string> to Map<string, GridPosition>
        const defaultPositionsMap = new Map<string, GridPosition>();
        for (const [robotId, startSquare] of Object.entries(
            puzzle.robotDefaultPositions,
        )) {
            const robot = robotManager.getRobot(robotId);
            if (robot) {
                // Convert square string to GridPosition using squareToGrid
                const gridPos = gridPositionFromSquare(startSquare as Square);
                defaultPositionsMap.set(robotId, gridPos);
                console.log(
                    `Robot ${robotId} will move to square ${startSquare} (${gridPos.i}, ${gridPos.j})`,
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
            new ChessEngine(true),
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
    robotManager.connectedRobots
});

/**
 * move a random robot forward and turn 45 degrees
 */
// apiRouter.get("/do-smth", async (_, res) => {
//     const robotsEntries = Array.from(robotManager.idsToRobots);
//     const randomRobotIndex = Math.floor(Math.random() * robotsEntries.length);
//     const [, robot] = robotsEntries[randomRobotIndex];
//     await robot.sendDrivePacket(1);
//     await robot.sendTurnPacket(45 * DEGREE);

//     res.send({ message: "success" });
// });

// apiRouter.get("/do-parallel", async (_, res) => {
//     console.log("Starting parallel command group");
//     const robotsEntries = Array.from(robotManager.idsToRobots.entries());
//     console.log(robotsEntries);
//     const commands: Command[] = [];
//     for (const [, robot] of robotsEntries) {
//         console.log("Moving robot " + robot.id);
//         // await robot.sendDrivePacket(1);
//         commands.push(
//             new SequentialCommandGroup([
//                 new DriveQuadraticSplineCommand(
//                     robot.id,
//                     { x: 0, y: 0 },
//                     { x: 3, y: 3 },
//                     { x: 0, y: 3 },
//                     4000,
//                 ),
//                 new DriveQuadraticSplineCommand(
//                     robot.id,
//                     { x: 0, y: 0 },
//                     { x: 0, y: 0 },
//                     { x: 0, y: 0 },
//                     30,
//                 ),
//             ]),
//         );
//     }
//     const start = Date.now();
//     console.log("Starting command group");
//     await new ParallelCommandGroup(commands).execute();
//     const time = Date.now() - start;
//     console.log("Finished command group in " + time + "ms");

//     res.send({ message: "success", timeMs: time });
// });

// apiRouter.post("/do-big", async (req, res) => {
//     console.log("Parsing show");

//     const validateResult = ShowfileSchema.validate(
//         JSON.parse(req.query.show as string),
//     );

//     if (!validateResult.success) {
//         res.status(400).json({ error: "Showfile is invalid" });
//         console.log("Show parsing failed");
//         return;
//     }

//     const show = validateResult.value;

//     const connectedRobotIds = Array.from(robotManager.idsToRobots.keys());

//     if (connectedRobotIds.length < show.timeline.length) {
//         const r = {
//             error: `Not enough robots connected. Got ${connectedRobotIds.length}, expected ${show.timeline.length}`,
//         };
//         res.status(400).json(r);
//         console.log(r);
//         return;
//     }

//     const commandGroupsForAllRobots: Command[] = [];
//     for (
//         let timelineLayerIndex = 0;
//         timelineLayerIndex < show.timeline.length;
//         timelineLayerIndex++
//     ) {
//         // TODO: make a way to map robot ids to timeline layers, so we can choose which physical robot to use for each timeline layer
//         const robotId = connectedRobotIds[timelineLayerIndex];
//         const layer = show.timeline[timelineLayerIndex];
//         let start = layer.startPoint.target.point;
//         const sequentialCommandsForCurrentRobot: Command[] = [];
//         for (
//             let eventIndex = 0;
//             eventIndex < layer.remainingEvents.length;
//             eventIndex++
//         ) {
//             const event = layer.remainingEvents[eventIndex];
//             if (event.type === TimelineEventTypes.GoToPointEvent) {
//                 if (event.target.type === SplinePointType.QuadraticBezier) {
//                     sequentialCommandsForCurrentRobot.push(
//                         new DriveQuadraticSplineCommand(
//                             robotId,
//                             start,
//                             event.target.endPoint,
//                             event.target.controlPoint,
//                             event.durationMs,
//                         ),
//                     );
//                 } else if (event.target.type === SplinePointType.CubicBezier) {
//                     sequentialCommandsForCurrentRobot.push(
//                         new DriveCubicSplineCommand(
//                             robotId,
//                             start,
//                             event.target.endPoint,
//                             event.target.controlPoint,
//                             event.target.controlPoint2,
//                             event.durationMs,
//                         ),
//                     );
//                 }
//                 start = event.target.endPoint;
//             } else if (event.type === TimelineEventTypes.WaitEvent) {
//                 sequentialCommandsForCurrentRobot.push(
//                     new DriveQuadraticSplineCommand(
//                         robotId,
//                         start,
//                         start,
//                         start,
//                         event.durationMs,
//                     ),
//                 );
//             } else if (event.type === TimelineEventTypes.TurnEvent) {
//                 sequentialCommandsForCurrentRobot.push(
//                     new SpinRadiansCommand(
//                         robotId,
//                         event.radians,
//                         event.durationMs,
//                     ),
//                 );
//             }
//         }
//         if (sequentialCommandsForCurrentRobot.length === 0) {
//             console.warn("No commands found for robot " + robotId);
//             continue;
//         }

//         // adding this command which tells the robot to start and stop moving at the same place as a scuffed stop command.
//         // otherwise the robot will keep moving at the speed of the last command it was given.
//         sequentialCommandsForCurrentRobot.push(
//             new DriveQuadraticSplineCommand(
//                 connectedRobotIds[timelineLayerIndex],
//                 start,
//                 start,
//                 start,
//                 30,
//             ),
//         );
//         commandGroupsForAllRobots.push(
//             new SequentialCommandGroup(sequentialCommandsForCurrentRobot),
//         );
//     }
//     const start = Date.now();
//     console.log("Executing commands");
//     await new ParallelCommandGroup(commandGroupsForAllRobots).execute();
//     const timeMs = Date.now() - start;
//     console.log("Command execution completed", { timeMs });
//     res.send({ message: "success", timeMs });
// });

/**
 * get the current state of the virtual robots for the simulator
 */
// apiRouter.get("/get-simulator-robot-state", (_, res) => {
//     /*
//     if (!USE_VIRTUAL_ROBOTS) {
//         return res.status(400).send({ message: "Simulator is not enabled." });
//     }
//         */
//     const robotsEntries = Array.from(robotManager.idsToRobots);

//     // get all of the robots and their positions
//     const robotState = Object.fromEntries(
//         robotsEntries.map(([id, robot]) => {
//             const headingRadians = robot.headingRadians;
//             const position = { x: robot.position.x, y: robot.position.y };

//             return [id, { position, headingRadians: headingRadians }];
//         }),
//     );

//     //send the robots and any tunnel messages
//     return res.send({
//         robotState,
//         messages: Array.from(VirtualBotTunnel.messages),
//     });
// });

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

apiRouter.post("/force-move", async (req, res) => {
    const command = new DriveCommand(
        req.query.robotId,
        Number(req.query.dist as string),
    );
    return executor.execute(command).then(() => {
        return res.send({ message: "success" });
    });
});

apiRouter.post("/force-turn", async (req, res) => {
    console.log(req.query);
    const command = new RelativeRotateCommand(
        req.query.robotId,
        Number(req.query.rad as string),
    );

    return executor.execute(command).then(() => {
        return res.send({ message: "success" });
    });
});

apiRouter.post("/force-center", async (req, res) => {
    console.log(req.query);
    const command = new CenterCommand(req.query.robotId);
    executor.execute(command);
    return res.send({ message: "success" });
});