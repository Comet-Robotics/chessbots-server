import { type Move } from "../../common/game-types";
import {
    type Command,
    ParallelCommandGroup,
    SequentialCommandGroup,
} from "../command/command";
import type { MoveCommand } from "../command/move-command";
import {
    AbsoluteMoveCommand,
    DriveCommand,
    ReversibleAbsoluteRotateCommand,
} from "../command/move-command";
import type { ReversibleRobotCommand } from "../command/move-piece";
import { MovePiece } from "../command/move-piece";
import { Position } from "./position";
import { GridIndices } from "./grid-indices";
import type { Robot } from "./robot";
import { error } from "console";
import { robotManager } from "./robot-manager";
import { gameManager } from "../api/managers";

export interface GridMove {
    from: GridIndices;
    to: GridIndices;
}

enum CollisionType {
    HORIZONTAL = 0,
    VERTICAL = 1,
    DIAGONAL = 2,
    HORSE = 3,
}

const arrayOfCornersIndicies = [0, 9, 18, 27];

const arrayOfDeadzone = [
    new GridIndices(1, 1),
    new GridIndices(1, 2),
    new GridIndices(1, 3),
    new GridIndices(1, 4),
    new GridIndices(1, 5),
    new GridIndices(1, 6),
    new GridIndices(1, 7),
    new GridIndices(1, 8),
    new GridIndices(1, 9),
    new GridIndices(1, 10),
    new GridIndices(2, 10),
    new GridIndices(3, 10),
    new GridIndices(4, 10),
    new GridIndices(5, 10),
    new GridIndices(6, 10),
    new GridIndices(7, 10),
    new GridIndices(8, 10),
    new GridIndices(9, 10),
    new GridIndices(10, 10),
    new GridIndices(10, 9),
    new GridIndices(10, 8),
    new GridIndices(10, 7),
    new GridIndices(10, 6),
    new GridIndices(10, 5),
    new GridIndices(10, 4),
    new GridIndices(10, 3),
    new GridIndices(10, 2),
    new GridIndices(10, 1),
    new GridIndices(9, 1),
    new GridIndices(8, 1),
    new GridIndices(7, 1),
    new GridIndices(6, 1),
    new GridIndices(5, 1),
    new GridIndices(4, 1),
    new GridIndices(3, 1),
    new GridIndices(2, 1),
];

function moveToGridMove(move: Move): GridMove {
    return {
        from: GridIndices.squareToGrid(move.from),
        to: GridIndices.squareToGrid(move.to),
    };
}

function calcCollisionType(gridMove: GridMove): CollisionType {
    const from = gridMove.from;
    const to = gridMove.to;

    // Horizontal
    if (from.j === to.j) {
        return CollisionType.HORIZONTAL;
        // Vertical
    } else if (from.i === to.i) {
        return CollisionType.VERTICAL;
    } else {
        // Diagonal
        if (Math.abs(from.i - to.i) === Math.abs(from.j - to.j)) {
            return CollisionType.DIAGONAL;
            // Horse
        } else {
            return CollisionType.HORSE;
        }
    }
}

function addToCollisions(collisions: string[], x: number, y: number) {
    const square = new GridIndices(x, y);
    if (robotManager.isRobotAtIndices(square)) {
        collisions.push(robotManager.getRobotAtIndices(square).id);
    }
}

function detectCollisions(
    gridMove: GridMove,
    collisionType: CollisionType,
): string[] {
    const from = gridMove.from;
    const to = gridMove.to;
    const collisions: string[] = [];
    const direction: [number, number] = directionToEdge(to);
    switch (collisionType) {
        // Horizontal
        case CollisionType.HORIZONTAL: {
            if (to.i < from.i) {
                for (let i = from.i - 1; i > to.i; i--) {
                    addToCollisions(collisions, i, from.j);
                }
                if (collisions.length > 0) {
                    addToCollisions(collisions, from.i, from.j + direction[1]);
                    for (let i = from.i - 1; i > to.i; i--) {
                        addToCollisions(collisions, i, from.j + direction[1]);
                    }
                }
            } else {
                for (let i = from.i + 1; i < to.i; i++) {
                    addToCollisions(collisions, i, from.j);
                }
                if (collisions.length > 0) {
                    addToCollisions(collisions, from.i, from.j + direction[1]);
                    for (let i = from.i + 1; i < to.i; i++) {
                        addToCollisions(collisions, i, from.j + direction[1]);
                    }
                }
            }
            break;
        }
        // Vertical
        case CollisionType.VERTICAL: {
            if (to.j < from.j) {
                for (let j = from.j - 1; j > to.j; j--) {
                    addToCollisions(collisions, from.i, j);
                }
                if (collisions.length > 0) {
                    addToCollisions(collisions, from.i + direction[0], from.j);
                    for (let j = from.j - 1; j > to.j; j--) {
                        addToCollisions(collisions, from.i + direction[0], j);
                    }
                }
            } else {
                for (let j = from.j + 1; j < to.j; j++) {
                    addToCollisions(collisions, from.i, j);
                }
                if (collisions.length > 0) {
                    addToCollisions(collisions, from.i + direction[0], from.j);
                    for (let j = from.j + 1; j < to.j; j++) {
                        addToCollisions(collisions, from.i + direction[0], j);
                    }
                }
            }
            break;
        }
        // Diagonal
        case CollisionType.DIAGONAL: {
            // Will be either positive or negative depending on direction
            const dx = to.i - from.i;
            const dy = to.j - from.j;
            // For diagonal, x and y offset by the same amount (not including signs)
            // thus, absolute value of either will be the same
            const distance = Math.abs(dx);
            // Normalized to 1 or -1 to get direction (dividing by absolute value of self)
            const nx = dx / distance;
            const ny = dy / distance;

            // Loop through the tiles along the diagonal excluding beginning and end
            // (Beginning is the moving piece, and end is capture piece. Capture handled separately)
            for (let off = 0; off < distance; off++) {
                // Finds the current coords of the diagonal tile that the loop is on
                const midx = from.i + off * nx;
                const midy = from.j + off * ny;

                // Above or below the tile, depends on direction
                const square1 = new GridIndices(midx, midy + ny);
                if (robotManager.isRobotAtIndices(square1)) {
                    const piece: string =
                        robotManager.getRobotAtIndices(square1).id;
                    collisions.push(piece);
                }
                // Left or right of tile, depends on direction
                const square2 = new GridIndices(midx + nx, midy);
                if (robotManager.isRobotAtIndices(square2)) {
                    const piece: string =
                        robotManager.getRobotAtIndices(square2).id;
                    collisions.push(piece);
                }
            }
            break;
        }
        // Horse
        case CollisionType.HORSE: {
            // Will be either positive or negative depending on direction
            const dx = to.i - from.i;
            const dy = to.j - from.j;
            // Normalized to 1 or -1 (can also be directly used to get first piece)
            const nx = dx / Math.abs(dx);
            const ny = dy / Math.abs(dy);
            // Shifted to get second piece, shift direction based on sign
            const sx = dx - nx;
            const sy = dy - ny;

            // Same sign horse moves share this square. Will always be 1 diagonal
            // of moving piece
            const square1 = new GridIndices(from.i + nx, from.j + ny);
            if (robotManager.isRobotAtIndices(square1)) {
                const piece: string =
                    robotManager.getRobotAtIndices(square1).id;
                collisions.push(piece);
            }
            // Same initial direction horse moves share this square. Will be directly
            // adjacent to moving piece.
            const square2 = new GridIndices(from.i + sx, from.j + sy);
            if (robotManager.isRobotAtIndices(square2)) {
                const piece: string =
                    robotManager.getRobotAtIndices(square2).id;
                collisions.push(piece);
            }
            break;
        }
    }
    return collisions;
}

function findShimmyLocation(
    pieceId: string,
    move: GridMove,
    collisionType: CollisionType,
): Position {
    const shimmyPos: Position = robotManager.getRobot(pieceId).position;
    const axisShimmyAmount: number = 1 / 3;
    switch (collisionType) {
        // Horizontal
        case CollisionType.HORIZONTAL: {
            const direction: [number, number] = directionToEdge(move.to);
            const gridY: number = Math.floor(shimmyPos.y);
            if (gridY === move.to.j) {
                const augmentY: number =
                    shimmyPos.y + direction[1] * -axisShimmyAmount;
                return new Position(shimmyPos.x, augmentY);
            } else {
                const augmentY: number =
                    shimmyPos.y + direction[1] * axisShimmyAmount;
                return new Position(shimmyPos.x, augmentY);
            }
        }
        // Vertical
        case CollisionType.VERTICAL: {
            const direction: [number, number] = directionToEdge(move.to);
            const gridX: number = Math.floor(shimmyPos.y);
            if (gridX === move.to.i) {
                const augmentX: number =
                    shimmyPos.x + direction[0] * -axisShimmyAmount;
                return new Position(augmentX, shimmyPos.y);
            } else {
                const augmentX: number =
                    shimmyPos.x + direction[0] * axisShimmyAmount;
                return new Position(augmentX, shimmyPos.y);
            }
        }
        case CollisionType.DIAGONAL:
        case CollisionType.HORSE: {
            const moveDistance: number = 0.5;
            const signedDistX: number = move.to.i - move.from.i;
            const signedDistY: number = move.to.j - move.from.j;
            const distHypot = Math.hypot(signedDistX, signedDistY);
            const normalX: number = signedDistX / distHypot;
            const normalY: number = signedDistY / distHypot;
            const orth1: Position = new Position(-normalY, normalX);
            const orth2: Position = new Position(normalY, -normalX);
            const orthPos1: Position = orth1.add(
                Position.fromGridIndices(move.to),
            );
            const orthPos2: Position = orth2.add(
                Position.fromGridIndices(move.to),
            );

            // distance calculations :)
            const val1: Position = shimmyPos.sub(orthPos1);
            const val2: Position = shimmyPos.sub(orthPos2);
            const dist1: number = Math.hypot(val1.x, val1.y);
            const dist2: number = Math.hypot(val2.x, val2.y);

            return dist1 < dist2 ?
                    new Position(
                        shimmyPos.x + orth1.x * moveDistance,
                        shimmyPos.y + orth1.y * moveDistance,
                    )
                :   new Position(
                        shimmyPos.x + orth2.x * moveDistance,
                        shimmyPos.y + orth2.y * moveDistance,
                    );
        }
    }
    return new Position(0, 0);
}

function constructDriveCommand(
    pieceId: string,
    endLocation: Position,
    startLocation: Position | null,
): DriveCommand {
    const robot = robotManager.getRobot(pieceId);
    const offset = endLocation.sub(startLocation ?? robot.position);
    const distance = Math.hypot(offset.x, offset.y);
    return new DriveCommand(pieceId, distance);
}

function constructRotateCommand(
    pieceId: string,
    location: Position,
    startLocation: Position | null,
): ReversibleRobotCommand {
    const robot = robotManager.getRobot(pieceId);
    const offset = location.sub(startLocation ?? robot.position);
    const angle = Math.atan2(offset.y, offset.x);
    console.log("rotate cmd construct", robot.position, offset, angle);
    return new ReversibleAbsoluteRotateCommand(pieceId, () => angle);
}

function constructFinalCommand(
    move: GridMove,
    driveCommands: DriveCommand[],
    rotateCommands: ReversibleRobotCommand[],
    collisionType: CollisionType,
    numCollisions: number,
): MovePiece {
    const from = move.from;
    const robotAtFrom = robotManager.getRobotAtIndices(from);
    const mainPiece = robotAtFrom.id;
    const dirToEdge = directionToEdge(from);

    if (mainPiece !== undefined) {
        console.log("main piece");
        const to = move.to;
        if (collisionType === CollisionType.HORIZONTAL && numCollisions > 1) {
            const y = dirToEdge[1] * 0.5;
            const pos1 = new Position(from.i + 0.5, from.j + y + 0.5);
            const pos2 = new Position(to.i + 0.5, from.j + y + 0.5);
            const pos3 = new Position(to.i + 0.5, to.j + 0.5);
            console.log("from, to ========", from, " ", to);
            const mainDrive1 = constructDriveCommand(mainPiece, pos1, null);
            const mainDrive2 = constructDriveCommand(mainPiece, pos2, pos1);
            const mainDrive3 = constructDriveCommand(mainPiece, pos3, pos2);
            const mainTurn1 = constructRotateCommand(mainPiece, pos1, null);
            const mainTurn2 = constructRotateCommand(mainPiece, pos2, pos1);
            const mainTurn3 = constructRotateCommand(mainPiece, pos3, pos2);
            const setupCommands: ReversibleRobotCommand[] = [];

            const mainDrive: SequentialCommandGroup =
                new SequentialCommandGroup([
                    mainDrive1,
                    mainTurn2,
                    mainDrive2,
                    mainTurn3,
                    mainDrive3,
                ]);
            setupCommands.push(...rotateCommands, mainTurn1, ...driveCommands);
            return new MovePiece(setupCommands, mainDrive);
        } else if (
            collisionType === CollisionType.VERTICAL &&
            numCollisions > 1
        ) {
            const x = dirToEdge[0] * 0.5;
            const pos1 = new Position(from.i + x + 0.5, from.j + 0.5);
            const pos2 = new Position(from.i + x + 0.5, to.j + 0.5);
            const pos3 = new Position(to.i + 0.5, to.j + 0.5);
            console.log("from, to ========", from, " ", to);
            const mainDrive1 = constructDriveCommand(mainPiece, pos1, null);
            const mainDrive2 = constructDriveCommand(mainPiece, pos2, pos1);
            const mainDrive3 = constructDriveCommand(mainPiece, pos3, pos2);
            const mainTurn1 = constructRotateCommand(mainPiece, pos1, null);
            const mainTurn2 = constructRotateCommand(mainPiece, pos2, pos1);
            const mainTurn3 = constructRotateCommand(mainPiece, pos3, pos2);
            const setupCommands: ReversibleRobotCommand[] = [];

            const mainDrive: SequentialCommandGroup =
                new SequentialCommandGroup([
                    mainDrive1,
                    mainTurn2,
                    mainDrive2,
                    mainTurn3,
                    mainDrive3,
                ]);
            setupCommands.push(...rotateCommands, mainTurn1, ...driveCommands);
            return new MovePiece(setupCommands, mainDrive);
        } else {
            const pos = new Position(to.i + 0.5, to.j + 0.5);
            const mainDrive = constructDriveCommand(mainPiece, pos, null);
            const mainTurn = constructRotateCommand(mainPiece, pos, null);
            const setupCommands: ReversibleRobotCommand[] = [];
            setupCommands.push(...rotateCommands, mainTurn, ...driveCommands);
            return new MovePiece(setupCommands, mainDrive);
        }
    } else {
        console.log("no main piece");
        return new MovePiece(rotateCommands, new SequentialCommandGroup([]));
    }
}

// Takes in a move, and generates the commands required to get the main piece to it's destination
// If there are pieces in the way, it shimmy's them out, and move them back after main piece passes
export function moveMainPiece(move: GridMove): MovePiece {
    const driveCommands: DriveCommand[] = [];
    const rotateCommands: ReversibleRobotCommand[] = [];
    const collisionType = calcCollisionType(move);
    const collisions: string[] = detectCollisions(move, collisionType);
    for (let i = 0; i < collisions.length; i++) {
        const pieceId = collisions[i];
        const location = findShimmyLocation(pieceId, move, collisionType);
        driveCommands.push(constructDriveCommand(pieceId, location, null));
        rotateCommands.push(constructRotateCommand(pieceId, location, null));
    }
    return constructFinalCommand(
        move,
        driveCommands,
        rotateCommands,
        collisionType,
        collisions.length,
    );
}

/**
 * Te easiest move to get to the dead zone
 */
function moveToDeadZone(origin: GridIndices): GridMove {
    const aboveMove = {
        from: origin,
        to: new GridIndices(origin.i, 10), //(origin[0] + "8" as unknown as GridIndices),
    };
    const belowMove = {
        from: origin,
        to: new GridIndices(origin.i, 1), //(origin[0] + "1") as Square,
    };
    const rightMove = {
        from: origin,
        to: new GridIndices(10, origin.j), //("h" + origin[1]) as Square,
    };
    const leftMove = {
        from: origin,
        to: new GridIndices(1, origin.j), //("a" + origin[1]) as Square,
    };

    const aboveCollision = detectCollisions(
        aboveMove,
        calcCollisionType(aboveMove),
    );
    const belowCollision = detectCollisions(
        belowMove,
        calcCollisionType(belowMove),
    );
    const leftCollision = detectCollisions(
        leftMove,
        calcCollisionType(leftMove),
    );
    const rightCollision = detectCollisions(
        rightMove,
        calcCollisionType(rightMove),
    );

    const collisionTuple: [GridMove, string[]][] = [
        [aboveMove, aboveCollision],
        [belowMove, belowCollision],
        [rightMove, rightCollision],
        [leftMove, leftCollision],
    ];

    collisionTuple.sort((a, b) => a[1].length - b[1].length);
    return collisionTuple[0][0];
}

function directionToEdge(position: GridIndices) {
    let x = 0;
    let y = 0;

    if (position.i >= 6) {
        x = -1;
    } else {
        x = 1;
    }
    if (position.j >= 6) {
        y = -1;
    } else {
        y = 1;
    }
    const DirectionTuple: [number, number] = [x, y];
    return DirectionTuple;
}

function findGridIndicesInArray(
    array: GridIndices[],
    obj: GridIndices,
): number {
    return array.findIndex((o) => o.i === obj.i && o.j === obj.j);
}

function returnToHome(from: GridIndices, id: string): SequentialCommandGroup {
    //const capturedPiece: GridIndices = GridIndices.squareToGrid(from);
    const home: GridIndices = robotManager.getRobot(id).homeIndices;
    const fastestMoveToDeadzone = moveToDeadZone(from);
    const toDeadzone = moveMainPiece(fastestMoveToDeadzone);

    const startInDeadzone = fastestMoveToDeadzone.to;
    let finalDestination: GridIndices | undefined;

    const checkDirections: [number, number][] = [
        [0, 1],
        [1, 0],
        [-1, 0],
        [0, -1],
    ];

    for (const direction of checkDirections) {
        try {
            const adjacentToHome = home.addTuple(direction);
            if (arrayOfDeadzone.find((dz) => dz.equals(adjacentToHome))) {
                finalDestination = adjacentToHome;
                break;
            }
        } catch (e) {
            // adjacentToHome is out of bounds, skip check
            continue;
        }
    }
    if (!finalDestination) {
        throw new error("WHERE THE HELL ARE YOU GOING");
    }
    const startInArray = findGridIndicesInArray(
        arrayOfDeadzone,
        startInDeadzone,
    );
    const endInArray = findGridIndicesInArray(
        arrayOfDeadzone,
        finalDestination,
    );
    let differenceOfIndex = endInArray - startInArray;

    if (differenceOfIndex < 0) {
        differenceOfIndex += 36;
    }

    const botDirectionToHome = differenceOfIndex < 18 ? 1 : -1;
    console.log(
        "deadzone array checker",
        startInArray,
        endInArray,
        botDirectionToHome,
    );

    let i = startInArray;
    const moveCommands: MoveCommand[] = [];
    while (i !== endInArray) {
        if (arrayOfCornersIndicies.includes(i)) {
            moveCommands.push(
                new AbsoluteMoveCommand(
                    id,
                    new Position(
                        arrayOfDeadzone[i].i + 0.5,
                        arrayOfDeadzone[i].j + 0.5,
                    ),
                ),
            );
        }
        i += botDirectionToHome;
        if (i < 0) i += 36;
        if (i >= 36) i -= 36;
    }
    if (arrayOfDeadzone[endInArray]) {
        moveCommands.push(
            new AbsoluteMoveCommand(
                id,
                new Position(
                    arrayOfDeadzone[endInArray].i + 0.5,
                    arrayOfDeadzone[endInArray].j + 0.5,
                ),
            ),
        );
    }

    moveCommands.push(
        new AbsoluteMoveCommand(id, new Position(home.i + 0.5, home.j + 0.5)),
    );

    const goHome: SequentialCommandGroup = new SequentialCommandGroup([
        toDeadzone,
        ...moveCommands,
    ]);

    return goHome;
}

// Command structure
// No Capture: Sequential[ Parallel[Turn[all]], MovePiece[shimmys, main], Parallel[TurnToStart[all]] ]

// Home with shimmy: Sequential[ No_Capture[capture piece], Turn[capture piece], Move[capture piece], ... ]
// Home without shimmy: Sequential[ Turn[capture piece], Move[capture piece], ... ]
// Capture: Sequential[ Home with/without shimmy[capture piece], No_Capture[main piece] ]
/**
 * Moves all robots from their home positions to their specified default positions using a collision-free algorithm.
 * Robots are sorted by column (leftmost first) and row (downmost first), then move sequentially:
 * 1. From home to deadzone
 * 2. Travel along deadzone to top of their column
 * 3. Drop down to their correct position on the board
 *
 * @param defaultPositions - Map of robot IDs to their target default positions
 * @returns A SequentialCommandGroup containing all robot movements
 */
export function moveAllRobotsToDefaultPositions(
    defaultPositions: Map<string, GridIndices>,
): SequentialCommandGroup {
    // Get only the robots specified in the defaultPositions map
    const robotsToMove: Robot[] = [];
    for (const robotId of defaultPositions.keys()) {
        try {
            const robot = robotManager.getRobot(robotId);
            robotsToMove.push(robot);
        } catch (error) {
            throw new Error(`Robot ${robotId} not found in robot manager`);
        }
    }

    // Sort robots: column by column (left to right, no skipping), then bottom to top within each column
    // This prevents collisions by ensuring robots in the same column don't interfere with each other
    const sortedRobots = robotsToMove.sort((a, b) => {
        const aPos = GridIndices.fromPosition(a.position);
        const bPos = GridIndices.fromPosition(b.position);

        return aPos.j - bPos.j;
    });

    const allCommands: Command[] = [];

    for (const robot of sortedRobots) {
        const robotCommands = generateRobotPathToDefault(
            robot,
            defaultPositions,
        );
        allCommands.push(...robotCommands);
    }

    return new SequentialCommandGroup(allCommands);
}

/**
 * Convenience function for regular games that uses the robot's default indices from config
 * @returns A SequentialCommandGroup containing all robot movements to their config default positions
 */
export function moveAllRobotsToConfigDefaultPositions(): SequentialCommandGroup {
    const defaultPositions = new Map<string, GridIndices>();

    // Build the map from robot config default positions
    for (const robot of robotManager.idsToRobots.values()) {
        defaultPositions.set(robot.id, robot.defaultIndices);
    }

    return moveAllRobotsToDefaultPositions(defaultPositions);
}

/**
 * Optimized setup to move all robots from home to their default board positions.
 *
 * Behavior:
 * - Main pieces (default rows j = 2 for white, j = 9 for black) move straight onto the board in parallel.
 * - Pawns (default rows j = 3 for white, j = 8 for black) first move into the deadzone in parallel,
 *   then travel along the deadzone to align with their file, and finally move onto the board to
 *   their default squares in parallel.
 */
export function moveAllRobotsHomeToDefaultOptimized(): SequentialCommandGroup {
    const mainPieceTargets = new Map<string, GridIndices>();
    const pawnTargets = new Map<string, GridIndices>();

    for (const robot of robotManager.idsToRobots.values()) {
        const def = robot.defaultIndices;
        if (def.j === 2 || def.j === 9) {
            mainPieceTargets.set(robot.id, def);
        } else if (def.j === 3 || def.j === 8) {
            pawnTargets.set(robot.id, def);
        }
    }

    // main pieces go straight to default in parallel
    const mainMoves: Command[] = [];
    for (const [robotId, target] of mainPieceTargets) {
        mainMoves.push(
            new AbsoluteMoveCommand(
                robotId,
                new Position(target.i + 0.5, target.j + 0.5),
            ),
        );
    }

    // pawns snake in batches of four: from each side (left/right),
    // move one white and one black simultaneously (total four per batch). For each pawn in a batch:
    // Home -> Deadzone entry on its side, Along deadzone to file aligned with its row,
    // Into its pawn row square. Repeat until all pawns are placed.
    type PawnInfo = { id: string; def: GridIndices; start: GridIndices };
    const leftWhite: PawnInfo[] = [];
    const leftBlack: PawnInfo[] = [];
    const rightWhite: PawnInfo[] = [];
    const rightBlack: PawnInfo[] = [];

    for (const [robotId, def] of pawnTargets) {
        const start = robotManager.getRobot(robotId).homeIndices;
        const isWhite = def.j === 3;
        const sideIsLeft = start.i === 0;
        const info: PawnInfo = { id: robotId, def, start };
        if (sideIsLeft) {
            (isWhite ? leftWhite : leftBlack).push(info);
        } else {
            (isWhite ? rightWhite : rightBlack).push(info);
        }
    }

    // Sort each group center-out by file to funnel from middle outward
    const centerOutSort = (a: PawnInfo, b: PawnInfo) => {
        const center = 5.5;
        const da = Math.abs(a.def.i - center);
        const db = Math.abs(b.def.i - center);
        if (da !== db) return da - db;
        return a.def.i - b.def.i;
    };
    leftWhite.sort(centerOutSort);
    leftBlack.sort(centerOutSort);
    rightWhite.sort(centerOutSort);
    rightBlack.sort(centerOutSort);

    const pawnBatches: ParallelCommandGroup[] = [];
    while (
        leftWhite.length > 0 ||
        leftBlack.length > 0 ||
        rightWhite.length > 0 ||
        rightBlack.length > 0
    ) {
        const batchSeqs: SequentialCommandGroup[] = [];
        const pick = (arr: PawnInfo[] | undefined) => {
            if (!arr || arr.length === 0) return;
            const pawn = arr.shift()!;
            const dzStart = moveToDeadzoneFromHome(pawn.start);
            // Align on the same edge of the deadzone we entered (row-side), using the pawn's row
            const ringAlign = new GridIndices(dzStart.i, pawn.def.j);
            const seq: Command[] = [];
            // 1) Home -> Deadzone entry
            seq.push(
                new AbsoluteMoveCommand(
                    pawn.id,
                    new Position(dzStart.i + 0.5, dzStart.j + 0.5),
                ),
            );
            // 2) Travel along the same edge in the deadzone to align with target row (no corner traversal)
            if (!dzStart.equals(ringAlign)) {
                seq.push(
                    new AbsoluteMoveCommand(
                        pawn.id,
                        new Position(ringAlign.i + 0.5, ringAlign.j + 0.5),
                    ),
                );
            }
            // 3) Drop into default pawn square (funnel is handled by center-out selection order)
            seq.push(
                new AbsoluteMoveCommand(
                    pawn.id,
                    new Position(pawn.def.i + 0.5, pawn.def.j + 0.5),
                ),
            );
            batchSeqs.push(new SequentialCommandGroup(seq));
        };

        pick(leftWhite);
        pick(leftBlack);
        pick(rightWhite);
        pick(rightBlack);

        if (batchSeqs.length > 0) {
            pawnBatches.push(new ParallelCommandGroup(batchSeqs));
        } else {
            break;
        }
    }

    //rotate all robots on default squares to face the center of the board
    const finalRotations: ReversibleRobotCommand[] = [];
    const addFacingCenterRotation = (id: string, def: GridIndices) => {
        const angle = def.j <= 5 ? Math.PI / 2 : -Math.PI / 2;
        finalRotations.push(
            new ReversibleAbsoluteRotateCommand(id, () => angle),
        );
    };

    for (const [robotId, def] of mainPieceTargets) {
        addFacingCenterRotation(robotId, def);
    }
    for (const [robotId, def] of pawnTargets) {
        addFacingCenterRotation(robotId, def);
    }

    return new SequentialCommandGroup([
        new ParallelCommandGroup(mainMoves),
        ...pawnBatches,
        new ParallelCommandGroup(finalRotations),
    ]);
}

/**
 * Generates the path commands for a single robot to move from home to default position
 */
function generateRobotPathToDefault(
    robot: Robot,
    defaultPositions: Map<string, GridIndices>,
): Command[] {
    const commands: Command[] = [];
    const currentPos = GridIndices.fromPosition(robot.position);
    const defaultPos = defaultPositions.get(robot.id);

    if (!defaultPos) {
        throw new Error(`No default position specified for robot ${robot.id}`);
    }

    // Move from home to deadzone
    const deadzonePos = moveToDeadzoneFromHome(currentPos);
    commands.push(
        new AbsoluteMoveCommand(
            robot.id,
            Position.fromGridIndices(deadzonePos),
        ),
    );

    // Travel clockwise along deadzone to top of the target column
    const topOfColumnPos = new GridIndices(defaultPos.i, 10); // Top of column in deadzone
    if (!deadzonePos.equals(topOfColumnPos)) {
        const deadzoneCommands = generateDeadzonePath(
            robot.id,
            deadzonePos,
            topOfColumnPos,
        );
        commands.push(...deadzoneCommands);
    }

    // Drop down to the correct position on the board
    commands.push(
        new AbsoluteMoveCommand(robot.id, Position.fromGridIndices(defaultPos)),
    );

    return commands;
}

/**
 * Generates commands to move along the deadzone in a clockwise manner
 * Optimized to group consecutive straight moves into single commands
 */
function generateDeadzonePath(
    robotId: string,
    startPos: GridIndices,
    endPos: GridIndices,
): Command[] {
    const commands: Command[] = [];

    // Find the indices in the deadzone array
    const startInArray = findGridIndicesInArray(arrayOfDeadzone, startPos);
    const endInArray = findGridIndicesInArray(arrayOfDeadzone, endPos);

    if (startInArray === -1 || endInArray === -1) {
        throw new Error(
            `Invalid deadzone positions: start=${startPos}, end=${endPos}`,
        );
    }

    // Always go clockwise
    const direction = 1;
    let i = startInArray;

    while (i !== endInArray) {
        // Find the next corner or the end position
        const nextCorner = findNextCornerOrEnd(i, endInArray, direction);

        // Move directly to the corner/end position
        const targetPos = arrayOfDeadzone[nextCorner];
        commands.push(
            new AbsoluteMoveCommand(
                robotId,
                new Position(targetPos.i + 0.5, targetPos.j + 0.5),
            ),
        );

        i = nextCorner;
    }

    return commands;
}

/**
 * Finds the next corner position or the end position in the deadzone
 */
function findNextCornerOrEnd(
    currentIndex: number,
    endIndex: number,
    direction: number,
): number {
    // Corner indices in the deadzone array
    const corners = [0, 9, 18, 27]; // Bottom-left, top-left, top-right, bottom-right

    let i = currentIndex;
    while (i !== endIndex) {
        i += direction;
        if (i >= 36) i -= 36; // Wrap around

        // If we hit a corner or the end, return it
        if (corners.includes(i) || i === endIndex) {
            return i;
        }
    }

    return endIndex;
}

/**
 * Determines the deadzone position to move to from a home position
 */
function moveToDeadzoneFromHome(homePos: GridIndices): GridIndices {
    // If on the left edge (i = 0), move to deadzone on the left (i = 1)
    if (homePos.i === 0) {
        return new GridIndices(1, homePos.j);
    }

    // If on the right edge (i = 11), move to deadzone on the right (i = 10)
    if (homePos.i === 11) {
        return new GridIndices(10, homePos.j);
    }

    // If on the bottom edge (j = 0), move to deadzone on the bottom (j = 1)
    if (homePos.j === 0) {
        return new GridIndices(homePos.i, 1);
    }

    // If on the top edge (j = 11), move to deadzone on the top (j = 10)
    if (homePos.j === 11) {
        return new GridIndices(homePos.i, 10);
    }

    // This shouldn't happen if called correctly, but fallback to a safe deadzone position
    return new GridIndices(1, 1);
}

export function materializePath(move: Move): Command {
    if (
        gameManager?.chess.isRegularCapture(move) ||
        gameManager?.chess.isEnPassant(move)
    ) {
        const capturePiece = gameManager.chess.getCapturedPieceId(
            move,
            robotManager,
        );
        if (capturePiece !== undefined) {
            const captureSquare = GridIndices.fromPosition(
                robotManager.getRobot(capturePiece).position,
            );

            const captureCommand = returnToHome(captureSquare, capturePiece);
            const mainCommand = moveMainPiece(moveToGridMove(move));
            const command = new SequentialCommandGroup([
                captureCommand,
                mainCommand,
            ]);
            return command;
        }
        return new SequentialCommandGroup([]);
    } else if (gameManager?.chess.isQueenSideCastling(move)) {
        let kingMove;
        let rookMove1;
        let rookMove2;
        let rookMove3;
        let rookPiece;
        if (moveToGridMove(move).from.j === 2) {
            rookPiece = robotManager.getRobotAtIndices(new GridIndices(2, 2));
            kingMove = new AbsoluteMoveCommand(
                robotManager.getRobotAtIndices(moveToGridMove(move).from).id,
                Position.fromGridIndices(new GridIndices(4, 2)),
            );
            rookMove1 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(2, 1)),
            );
            rookMove2 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(5, 1)),
            );
            rookMove3 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(5, 2)),
            );
        } else {
            rookPiece = robotManager.getRobotAtIndices(new GridIndices(2, 9));
            kingMove = new AbsoluteMoveCommand(
                robotManager.getRobotAtIndices(moveToGridMove(move).from).id,
                Position.fromGridIndices(new GridIndices(4, 9)),
            );
            rookMove1 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(2, 10)),
            );
            rookMove2 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(5, 10)),
            );
            rookMove3 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(5, 9)),
            );
        }
        return new SequentialCommandGroup([
            rookMove1,
            new ParallelCommandGroup([rookMove2, kingMove]),
            rookMove3,
        ]);
    } else if (gameManager?.chess.isKingSideCastling(move)) {
        let kingMove;
        let rookMove1;
        let rookMove2;
        let rookMove3;
        let rookPiece;
        if (moveToGridMove(move).from.j === 2) {
            rookPiece = robotManager.getRobotAtIndices(new GridIndices(9, 2));
            kingMove = new AbsoluteMoveCommand(
                robotManager.getRobotAtIndices(moveToGridMove(move).from).id,
                Position.fromGridIndices(new GridIndices(8, 2)),
            );
            rookMove1 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(9, 1)),
            );
            rookMove2 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(7, 1)),
            );
            rookMove3 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(7, 2)),
            );
        } else {
            rookPiece = robotManager.getRobotAtIndices(new GridIndices(9, 9));
            kingMove = new AbsoluteMoveCommand(
                robotManager.getRobotAtIndices(moveToGridMove(move).from).id,
                Position.fromGridIndices(new GridIndices(9, 8)),
            );
            rookMove1 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(9, 10)),
            );
            rookMove2 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(7, 10)),
            );
            rookMove3 = new AbsoluteMoveCommand(
                rookPiece.id,
                Position.fromGridIndices(new GridIndices(7, 9)),
            );
        }
        return new SequentialCommandGroup([
            rookMove1,
            new ParallelCommandGroup([rookMove2, kingMove]),
            rookMove3,
        ]);
    } else {
        const gridMove = moveToGridMove(move);
        const command = moveMainPiece(gridMove);
        return command;
    }
}
