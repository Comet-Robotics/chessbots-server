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
    RotateToStartCommand,
} from "../command/move-command";
import type { ReversibleRobotCommand } from "../command/move-piece";
import { MovePiece } from "../command/move-piece";
import type { Robot } from "./robot";
//import { error } from "console"; replaced with Error
import { robotManager } from "./robot-manager";
// import { gameManager } from "../game/game-manager";
import {
    positionFromGridPosition,
    gridPositionFromPosition,
    gridPositionFromSquare,
    positionFromSquare,
} from "../../common/units";
import type { GridPosition } from "../../common/units";
import { RobotId } from "../api/config";
import { Move } from "../../common/chess";

type GridMove = {
    from: GridPosition;
    to: GridPosition;
    distance?: number;
}

enum CollisionType {
    HORIZONTAL = 0,
    VERTICAL = 1,
    DIAGONAL = 2,
    HORSE = 3,
}

const arrayOfCornersIndicies = [0, 9, 18, 27];

let alreadyHomePieces = new Set();

const arrayOfDeadzone: GridPosition[] = [
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 3 },
    { x: 1, y: 4 },
    { x: 1, y: 5 },
    { x: 1, y: 6 },
    { x: 1, y: 7 },
    { x: 1, y: 8 },
    { x: 1, y: 9 },
    { x: 1, y: 10 },
    { x: 2, y: 10 },
    { x: 3, y: 10 },
    { x: 4, y: 10 },
    { x: 5, y: 10 },
    { x: 6, y: 10 },
    { x: 7, y: 10 },
    { x: 8, y: 10 },
    { x: 9, y: 10 },
    { x: 10, y: 10 },
    { x: 10, y: 9 },
    { x: 10, y: 8 },
    { x: 10, y: 7 },
    { x: 10, y: 6 },
    { x: 10, y: 5 },
    { x: 10, y: 4 },
    { x: 10, y: 3 },
    { x: 10, y: 2 },
    { x: 10, y: 1 },
    { x: 9, y: 1 },
    { x: 8, y: 1 },
    { x: 7, y: 1 },
    { x: 6, y: 1 },
    { x: 5, y: 1 },
    { x: 4, y: 1 },
    { x: 3, y: 1 },
    { x: 2, y: 1 },
];

function moveToGridMove(move: Move): GridMove {
    return {
        from: gridPositionFromSquare(move.from),
        to: gridPositionFromSquare(move.to),
    };
}

function calcCollisionType(gridMove: GridMove): CollisionType {
    const from = gridMove.from;
    const to = gridMove.to;

    // Horizontal
    if (from.y === to.y) {
        return CollisionType.HORIZONTAL;
        // Vertical
    } else if (from.x === to.x) {
        return CollisionType.VERTICAL;
    } else {
        // Diagonal
        if (Math.abs(from.x - to.x) === Math.abs(from.y - to.y)) {
            return CollisionType.DIAGONAL;
            // Horse
        } else {
            return CollisionType.HORSE;
        }
    }
}

function addToCollisions(collisions: RobotId[], x: number, y: number) {
    const square: GridPosition = { x: x, y: y };
    if (robotManager.isRobotAtGridPos(square)) {
        const robotId = robotManager.getRobotAtGridPos(square)!.id;
        // if it's a piece that already returned and thus is harmless, don't do anything, otherwise push it
        if (alreadyHomePieces.has(robotId)) {
            console.log(`The id was ${robotId}, and it's already home!`);
            return;
        }

        collisions.push(robotId);
    }
}

function detectCollisions(
    gridMove: GridMove,
    collisionType: CollisionType,
): RobotId[] {
    const from = gridMove.from;
    const to = gridMove.to;
    const collisions: RobotId[] = [];
    const direction: [number, number] = directionToEdge(to);
    switch (collisionType) {
        // Horizontal
        case CollisionType.HORIZONTAL: {
            if (to.x < from.x) {
                for (let i = from.x - 1; i > to.x; i--) {
                    addToCollisions(collisions, i, from.y);
                }
                if (collisions.length > 0) {
                    addToCollisions(collisions, from.x, from.y + direction[1]);
                    for (let i = from.x - 1; i > to.x; i--) {
                        addToCollisions(collisions, i, from.y + direction[1]);
                    }
                }
            } else {
                for (let i = from.x + 1; i < to.x; i++) {
                    addToCollisions(collisions, i, from.y);
                }
                if (collisions.length > 0) {
                    addToCollisions(collisions, from.x, from.y + direction[1]);
                    for (let i = from.x + 1; i < to.x; i++) {
                        addToCollisions(collisions, i, from.y + direction[1]);
                    }
                }
            }
            break;
        }
        // Vertical
        case CollisionType.VERTICAL: {
            if (to.y < from.y) {
                for (let j = from.y - 1; j > to.y; j--) {
                    addToCollisions(collisions, from.x, j);
                }
                if (collisions.length > 0) {
                    addToCollisions(collisions, from.x + direction[0], from.y);
                    for (let j = from.y - 1; j > to.y; j--) {
                        addToCollisions(collisions, from.x + direction[0], j);
                    }
                }
            } else {
                for (let j = from.y + 1; j < to.y; j++) {
                    addToCollisions(collisions, from.x, j);
                }
                if (collisions.length > 0) {
                    addToCollisions(collisions, from.x + direction[0], from.y);
                    for (let j = from.y + 1; j < to.y; j++) {
                        addToCollisions(collisions, from.x + direction[0], j);
                    }
                }
            }
            break;
        }
        // Diagonal
        case CollisionType.DIAGONAL: {
            // Will be either positive or negative depending on direction
            const dx = to.x - from.x;
            const dy = to.y - from.y;
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
                const midx = from.x + off * nx;
                const midy = from.y + off * ny;

                // Above or below the tile, depends on direction
                const square1: GridPosition = { x: Math.round(midx), y: Math.round(midy + ny) };
                if (robotManager.isRobotAtGridPos(square1)) {
                    const id = robotManager.getRobotAtGridPos(square1)!.id;
                    collisions.push(id);
                }
                // Left or right of tile, depends on direction
                const square2: GridPosition = { x: Math.round(midx + nx), y: Math.round(midy) };
                if (robotManager.isRobotAtGridPos(square2)) {
                    const robot: RobotId =
                        robotManager.getRobotAtGridPos(square2)!.id;
                    collisions.push(robot);
                }
            }
            break;
        }
        // Horse
        case CollisionType.HORSE: {
            // Will be either positive or negative depending on direction
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            // Normalized to 1 or -1 (can also be directly used to get first piece)
            const nx = dx / Math.abs(dx);
            const ny = dy / Math.abs(dy);
            // Shifted to get second piece, shift direction based on sign
            const sx = dx - nx;
            const sy = dy - ny;

            // Same sign horse moves share this square. Will always be 1 diagonal
            // of moving piece
            const square1: GridPosition = { x: Math.round(from.x + nx), y: Math.round(from.y + ny) };
            if (robotManager.isRobotAtGridPos(square1)) {
                const piece: RobotId =
                    robotManager.getRobotAtGridPos(square1)!.id;
                collisions.push(piece);
            }
            // Same initial direction horse moves share this square. Will be directly
            // adjacent to moving piece.
            const square2: GridPosition = { x: Math.round(from.x + sx), y: Math.round(from.y + sy) };
            if (robotManager.isRobotAtGridPos(square2)) {
                const piece: RobotId =
                    robotManager.getRobotAtGridPos(square2)!.id;
                collisions.push(piece);
            }
            break;
        }
    }

    return collisions;
}

function findShimmyLocation(
    pieceId: RobotId,
    move: GridMove,
    collisionType: CollisionType,
): { x: number; y: number } {
    const shimmyPos: { x: number; y: number } = robotManager.getRobot(pieceId).position;
    const axisShimmyAmount: number = 1 / 2;
    switch (collisionType) {
        // Horizontal
        case CollisionType.HORIZONTAL: {
            const direction: [number, number] = directionToEdge(move.to);
            const gridY: number = Math.floor(shimmyPos.y);
            if (gridY === move.to.y) {
                const augmentY: number =
                    shimmyPos.y + direction[1] * -axisShimmyAmount;
                return { x: shimmyPos.x, y: augmentY };
            } else {
                const augmentY: number =
                    shimmyPos.y + direction[1] * axisShimmyAmount;
                return { x: shimmyPos.x, y: augmentY };
            }
        }
        // Vertical
        case CollisionType.VERTICAL: {
            const direction: [number, number] = directionToEdge(move.to);
            const gridX: number = Math.floor(shimmyPos.x);
            if (gridX === move.to.x) {
                const augmentX: number =
                    shimmyPos.x + direction[0] * -axisShimmyAmount;
                return { x: augmentX, y: shimmyPos.y };
            } else {
                const augmentX: number =
                    shimmyPos.x + direction[0] * axisShimmyAmount;
                return { x: augmentX, y: shimmyPos.y };
            }
        }
        case CollisionType.DIAGONAL:
        case CollisionType.HORSE: {
            const moveDistance: number = 0.5;
            const signedDistX: number = move.to.x - move.from.x;
            const signedDistY: number = move.to.y - move.from.y;
            const distHypot = Math.hypot(signedDistX, signedDistY);
            const normalX: number = signedDistX / distHypot;
            const normalY: number = signedDistY / distHypot;
            const orth1: { x: number; y: number } = { x: -normalY, y: normalX };
            const orth2: { x: number; y: number } = { x: normalY, y: -normalX };
            const orthPos1: { x: number; y: number } = {
                x: orth1.x + move.to.x,
                y: orth1.y + move.to.y,
            };
            const orthPos2: { x: number; y: number } = {
                x: orth2.x + move.to.x,
                y: orth2.y + move.to.y,
            };

            // distance calculations :)
            const val1: { x: number; y: number } = { x: shimmyPos.x - orthPos1.x, y: shimmyPos.y - orthPos1.y };
            const val2: { x: number; y: number } = { x: shimmyPos.x - orthPos2.x, y: shimmyPos.y - orthPos2.y };
            const dist1: number = Math.hypot(val1.x, val1.y);
            const dist2: number = Math.hypot(val2.x, val2.y);

            return dist1 < dist2 ?
                    { x: shimmyPos.x + orth1.x * moveDistance, y: shimmyPos.y + orth1.y * moveDistance }
                :   { x: shimmyPos.x + orth2.x * moveDistance, y: shimmyPos.y + orth2.y * moveDistance };
        }
    }
    return { x: 0, y: 0 };
}

function constructDriveCommand(
    pieceId: RobotId,
    endLocation: { x: number; y: number },
    startLocation: { x: number; y: number } | null,
): DriveCommand {
    const robot = robotManager.getRobot(pieceId);
    const offset = startLocation ? 
        { x: endLocation.x - startLocation.x, y: endLocation.y - startLocation.y } :
        endLocation;
    const distance = Math.hypot(offset.x, offset.y);
    return new DriveCommand(pieceId, distance);
}

function constructRotateCommand(
    pieceId: RobotId,
    location: { x: number; y: number },
    startLocation: { x: number; y: number } | null,
): ReversibleRobotCommand {
    const robot = robotManager.getRobot(pieceId);
    const offset = startLocation ?
        { x: location.x - startLocation.x, y: location.y - startLocation.y } :
        location;
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
    noReverse: boolean = false,
    movingRobotId?: RobotId,
): MovePiece {
    const from = move.from;
    const mainPiece = movingRobotId ?? robotManager.getRobotAtGridPos(from)!.id;
    const dirToEdge = directionToEdge(from);

    if (mainPiece !== undefined) {
        console.log("main piece");
        const to = move.to;
        if (collisionType === CollisionType.HORIZONTAL && numCollisions > 1) {
            const y = dirToEdge[1] * 0.5;
            const pos1: { x: number; y: number } = { x: from.x + 0.5, y: from.y + y + 0.5 };
            const pos2: { x: number; y: number } = { x: to.x + 0.5, y: from.y + y + 0.5 };
            const pos3: { x: number; y: number } = { x: to.x + 0.5, y: to.y + 0.5 };
            console.log("from, to ========", from, " ", to);
            const mainDrive1 = constructDriveCommand(mainPiece, pos1, null);
            const mainDrive2 = constructDriveCommand(mainPiece, pos2, pos1);
            const mainDrive3 = constructDriveCommand(mainPiece, pos3, pos2);
            const mainTurn1 = constructRotateCommand(mainPiece, pos1, null);
            const mainTurn2 = constructRotateCommand(mainPiece, pos2, pos1);
            const mainTurn3 = constructRotateCommand(mainPiece, pos3, pos2);
            const setupCommands: SequentialCommandGroup[] = [];

            for (let x = 0; x < rotateCommands.length; x++) {
                setupCommands.push(
                    new SequentialCommandGroup([
                        rotateCommands[x],
                        driveCommands[x],
                    ]),
                );
            }
            setupCommands.push(new SequentialCommandGroup([mainTurn1]));

            const mainDrive: SequentialCommandGroup =
                new SequentialCommandGroup([
                    mainDrive1,
                    mainTurn2,
                    mainDrive2,
                    mainTurn3,
                    mainDrive3,
                ]);
            return new MovePiece(setupCommands, mainDrive, noReverse);
        } else if (
            collisionType === CollisionType.VERTICAL &&
            numCollisions > 1
        ) {
            const x = dirToEdge[0] * 0.5;
            const pos1: { x: number; y: number } = { x: from.x + x + 0.5, y: from.y + 0.5 };
            const pos2: { x: number; y: number } = { x: from.x + x + 0.5, y: to.y + 0.5 };
            const pos3: { x: number; y: number } = { x: to.x + 0.5, y: to.y + 0.5 };
            console.log("from, to ========", from, " ", to);
            const mainDrive1 = constructDriveCommand(mainPiece, pos1, null);
            const mainDrive2 = constructDriveCommand(mainPiece, pos2, pos1);
            const mainDrive3 = constructDriveCommand(mainPiece, pos3, pos2);
            const mainTurn1 = constructRotateCommand(mainPiece, pos1, null);
            const mainTurn2 = constructRotateCommand(mainPiece, pos2, pos1);
            const mainTurn3 = constructRotateCommand(mainPiece, pos3, pos2);
            const setupCommands: SequentialCommandGroup[] = [];

            for (let x = 0; x < rotateCommands.length; x++) {
                setupCommands.push(
                    new SequentialCommandGroup([
                        rotateCommands[x],
                        driveCommands[x],
                    ]),
                );
            }
            setupCommands.push(new SequentialCommandGroup([mainTurn1]));

            const mainDrive: SequentialCommandGroup =
                new SequentialCommandGroup([
                    mainDrive1,
                    mainTurn2,
                    mainDrive2,
                    mainTurn3,
                    mainDrive3,
                ]);
            return new MovePiece(setupCommands, mainDrive, noReverse);
        } else {
            const pos: { x: number; y: number } = { x: to.x + 0.5, y: to.y + 0.5 };
            const startPos =
                movingRobotId ? { x: from.x + 0.5, y: from.y + 0.5 } : null;
            const mainDrive = constructDriveCommand(mainPiece, pos, startPos);
            const mainTurn = constructRotateCommand(mainPiece, pos, startPos);
            const setupCommands: SequentialCommandGroup[] = [];

            for (let x = 0; x < rotateCommands.length; x++) {
                setupCommands.push(
                    new SequentialCommandGroup([
                        rotateCommands[x],
                        driveCommands[x],
                    ]),
                );
            }
            setupCommands.push(new SequentialCommandGroup([mainTurn]));
            return new MovePiece(setupCommands, mainDrive, noReverse);
        }
    } else {
        console.log("no main piece");
        return new MovePiece(
            [new SequentialCommandGroup([])],
            new SequentialCommandGroup([]),
            noReverse,
        );
    }
}

// Takes in a move, and generates the commands required to get the main piece to it's destination
// If there are pieces in the way, it shimmy's them out, and move them back after main piece passes
function moveMainPiece(
    move: GridMove,
    noReverse: boolean = false,
    movingRobotId?: RobotId,
): MovePiece {
    const driveCommands: DriveCommand[] = [];
    const rotateCommands: ReversibleRobotCommand[] = [];
    const collisionType = calcCollisionType(move);
    console.log("Move is: ");
    console.log(move);
    console.log("Coll type is:");
    console.log(collisionType);
    const collisions: RobotId[] = detectCollisions(move, collisionType);
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
        noReverse,
        movingRobotId,
    );
}

/**
 * Te easiest move to get to the dead zone
 */
function moveToDeadZone(origin: GridPosition): GridMove {
    const aboveMove: GridMove = {
        from: origin,
        to: { x: origin.x, y: 10 },
        distance: Math.abs(10 - origin.y),
    };
    const belowMove: GridMove = {
        from: origin,
        to: { x: origin.x, y: 1 },
        distance: Math.abs(1 - origin.y),
    };
    const rightMove: GridMove = {
        from: origin,
        to: { x: 10, y: origin.y },
        distance: Math.abs(10 - origin.x),
    };
    const leftMove: GridMove = {
        from: origin,
        to: { x: 1, y: origin.y },
        distance: Math.abs(1 - origin.x),
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

    const collisionTuple: [GridMove, RobotId[]][] = [
        [aboveMove, aboveCollision],
        [belowMove, belowCollision],
        [rightMove, rightCollision],
        [leftMove, leftCollision],
    ];

    // added change so it sorts by distance first, then collision length.
    collisionTuple.sort((a, b) => {
        // first if there's a mismatch in number of collisions, always pick the one with the least
        // distance.
        const collisionDifference = a[1].length - b[1].length;
        if (collisionDifference !== 0) return collisionDifference;

        // if equal amount of collisions, do it by distance instaed
        return (a[0].distance ?? 0) - (b[0].distance ?? 0);
    });
    console.log("Collision ordering:");
    console.log(collisionTuple[0]);
    console.log(collisionTuple[1]);
    console.log(collisionTuple[2]);
    console.log(collisionTuple[3]);
    console.log("end collision ordering");

    return collisionTuple[0][0];
}

function directionToEdge(position: GridPosition): [number, number] {
    let x = 0;
    let y = 0;

    if (position.x >= 6) {
        x = -1;
    } else {
        x = 1;
    }
    if (position.y >= 6) {
        y = -1;
    } else {
        y = 1;
    }
    return [x, y];
}

function findGridPositionInArray(
    array: GridPosition[],
    obj: GridPosition,
): number {
    return array.findIndex((o) => o.x === obj.x && o.y === obj.y);
}

function returnToHomeHexapawn(
    from: GridPosition,
    id: RobotId,
): [SequentialCommandGroup, boolean] {
    const home: GridPosition = gridPositionFromSquare(robotManager.getRobot(id).config.hexapawn_home_pos);
    //  check if column aligned first
    // const goHome: SequentialCommandGroup = new SequentialCommandGroup([
    //     toDeadzone,
    //     ...moveCommands,
    // ]);

    console.log("home j is: " + home.y + "from j is: " + from.y);

    if (home.x === from.x) {
        console.log("Home is:");
        console.log(home);
        const columnHomeMove = {
            from: from,
            to: home, //(origin[0] + "8" as unknown as GridIndices),
        };
        const rightToHome = moveMainPiece(columnHomeMove);
        return [new SequentialCommandGroup([rightToHome]), true];
    } else {
        console.log("we can't just dig straight down!");
        console.log(home);
        const sidewaysDest: GridPosition = { x: home.x, y: from.y };
        const sidewaysMove = {
            from: from,
            to: sidewaysDest,
        };
        const sidewaysCollisions = detectCollisions(
            sidewaysMove,
            calcCollisionType(sidewaysMove),
        );

        if (sidewaysCollisions.length > 0) {
            const directMove = {
                from: from,
                to: home,
            };
            const directMovement = moveMainPiece(directMove);
            return [new SequentialCommandGroup([directMovement]), false];
        }

        const sidewaysMovement = moveMainPiece(sidewaysMove);

        const columnHomeMove = {
            from: sidewaysDest,
            to: home, //(origin[0] + "8" as unknown as GridIndices),
        };
        const rightToHome = moveMainPiece(columnHomeMove, true, id);
        return [
            new SequentialCommandGroup([sidewaysMovement, rightToHome]),
            true,
        ];
    }
}

function returnToHome(from: GridPosition, id: RobotId): SequentialCommandGroup {
    //const capturedPiece: GridPosition = squareToGrid(from);
    const home: GridPosition = gridPositionFromSquare(robotManager.getRobot(id).config.vanilla_home_pos);
    const fastestMoveToDeadzone = moveToDeadZone(from);
    const toDeadzone = moveMainPiece(fastestMoveToDeadzone);

    const startInDeadzone = fastestMoveToDeadzone.to;
    let finalDestination: GridPosition | undefined;

    const checkDirections: [number, number][] = [
        [0, 1],
        [1, 0],
        [-1, 0],
        [0, -1],
    ];

    for (const direction of checkDirections) {
        try {
            const adjacentToHome: GridPosition = { x: home.x + direction[0], y: home.y + direction[1] };
            if (arrayOfDeadzone.find((dz) => dz.x === adjacentToHome.x && dz.y === adjacentToHome.y)) {
                finalDestination = adjacentToHome;
                break;
            }
        } catch (e) {
            // adjacentToHome is out of bounds, skip check
            continue;
        }
    }
    if (!finalDestination) {
        throw new Error("WHERE THE HELL ARE YOU GOING"); // real
    }
    const startInArray = findGridPositionInArray(
        arrayOfDeadzone,
        startInDeadzone,
    );
    const endInArray = findGridPositionInArray(
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
                    { x: arrayOfDeadzone[i].x + 0.5, y: arrayOfDeadzone[i].y + 0.5 },
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
                { x: arrayOfDeadzone[endInArray].x + 0.5, y: arrayOfDeadzone[endInArray].y + 0.5 },
            ),
        );
    }

    moveCommands.push(
        new AbsoluteMoveCommand(id, { x: home.x + 0.5, y: home.y + 0.5 }),
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
    defaultPositions: Map<RobotId, GridPosition>,
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
        const aPos = gridPositionFromPosition(a.position);
        const bPos = gridPositionFromPosition(b.position);

        return aPos.y - bPos.y;
    });

    const allCommands: Command[] = [];

    for (const robot of sortedRobots) {
        const robotCommands = generateRobotPathToDefault(robot);
        allCommands.push(...robotCommands);
    }

    return new SequentialCommandGroup(allCommands);
}

export function moveAllRobotsToDefaultPositionsHexapawn(
    defaultPositions: Map<RobotId, GridPosition>,
): SequentialCommandGroup {
    // Get only the robots specified in the defaultPositions map
    const allCommands: Command[] = [];
    for (const robotId of defaultPositions.keys()) {
        try {
            const robot = robotManager.getRobot(robotId);
            allCommands.push(
                new AbsoluteMoveCommand(
                    robot.id,
                    positionFromGridPosition(defaultPositions.get(robotId)!),
                ),
            );
        } catch (error) {
            throw new Error(`Robot ${robotId} didn't work with robot manager`);
        }
    }

    return new ParallelCommandGroup(allCommands);
}

/**
 * Convenience function for regular games that uses the robot's default indices from config
 * @returns A SequentialCommandGroup containing all robot movements to their config default positions
 */
function moveAllRobotsToConfigDefaultPositions(): SequentialCommandGroup {
    const defaultPositions = new Map<RobotId, GridPosition>();

    // Build the map from robot config default positions
    for (const robot of robotManager.robots.values()) {
        defaultPositions.set(robot.id, gridPositionFromSquare(robot.config.vanilla_home_pos));
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
    const mainPieceTargets = new Map<RobotId, GridPosition>();
    const pawnTargets = new Map<RobotId, GridPosition>();

    for (const robot of robotManager.robots.values()) {
        const def = positionFromSquare(robot.config.vanilla_home_pos);
        if (def.x === 2 || def.y === 9) {
            mainPieceTargets.set(robot.id, def);
        } else if (def.y === 3 || def.y === 8) {
            pawnTargets.set(robot.id, def);
        }
    }

    // main pieces go straight to default in parallel
    const mainMoves: Command[] = [];
    for (const [robotId, target] of mainPieceTargets) {
        mainMoves.push(
            new AbsoluteMoveCommand(
                robotId,
                { x: target.x + 0.5, y: target.y + 0.5 },
            ),
        );
    }

    // pawns snake in batches of four: from each side (left/right),
    // move one white and one black simultaneously (total four per batch). For each pawn in a batch:
    // Home -> Deadzone entry on its side, Along deadzone to file aligned with its row,
    // Into its pawn row square. Repeat until all pawns are placed.
    type PawnInfo = { id: RobotId; def: GridPosition; start: GridPosition };
    const leftWhite: PawnInfo[] = [];
    const leftBlack: PawnInfo[] = [];
    const rightWhite: PawnInfo[] = [];
    const rightBlack: PawnInfo[] = [];

    for (const [robotId, def] of pawnTargets) {
        let robot = robotManager.getRobot(robotId);
        let home_pos = positionFromSquare(robot.config.vanilla_home_pos);
        const isWhite = def.y === 3;
        const sideIsLeft = home_pos.x === 0;
        const info: PawnInfo = { id: robotId, def, start: home_pos };
        if (sideIsLeft) {
            (isWhite ? leftWhite : leftBlack).push(info);
        } else {
            (isWhite ? rightWhite : rightBlack).push(info);
        }
    }

    // Sort each group center-out by file to funnel from middle outward
    const centerOutSort = (a: PawnInfo, b: PawnInfo) => {
        const center = 5.5;
        const da = Math.abs(a.def.x - center);
        const db = Math.abs(b.def.x - center);
        if (da !== db) return da - db;
        return a.def.x - b.def.x;
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
            const ringAlign: GridPosition = { x: dzStart.x, y: pawn.def.y };
            const seq: Command[] = [];
            // 1) Home -> Deadzone entry
            seq.push(
                new AbsoluteMoveCommand(
                    pawn.id,
                    { x: dzStart.x + 0.5, y: dzStart.y + 0.5 },
                ),
            );
            // 2) Travel along the same edge in the deadzone to align with target row (no corner traversal)
            if (dzStart.x === ringAlign.x && dzStart.y === ringAlign.y) {
                // dzStart equals ringAlign, skip
            } else {
                seq.push(
                    new AbsoluteMoveCommand(
                        pawn.id,
                        { x: ringAlign.x + 0.5, y: ringAlign.y + 0.5 },
                    ),
                );
            }
            // 3) Drop into default pawn square (funnel is handled by center-out selection order)
            seq.push(
                new AbsoluteMoveCommand(
                    pawn.id,
                    { x: pawn.def.x + 0.5, y: pawn.def.y + 0.5 },
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
    const finalRotations: Command[] = [];

    for (const [robotId, _def] of mainPieceTargets) {
        finalRotations.push(new RotateToStartCommand(robotId));
    }
    for (const [robotId, _def] of pawnTargets) {
        finalRotations.push(new RotateToStartCommand(robotId));
    }

    return new SequentialCommandGroup([
        new ParallelCommandGroup(mainMoves),
        ...pawnBatches,
        new ParallelCommandGroup(finalRotations),
    ]);
}

/**
 * Moves all robots from board to home row by row, starting with bottom row.
 * Each robot goes: current position → deadzone → clockwise around deadzone to home.
 * Processed one at a time to avoid collisions.
 */
export function moveAllRobotsFromBoardToHome(
    isHexapawn: boolean,
): SequentialCommandGroup {
    const commands: Command[] = [];

    // Get all robots on the board, grouped by row
    const robotsByRow = new Map<number, Robot[]>();

    for (const robot of robotManager.robots.values()) {
        const currentPos = gridPositionFromPosition(robot.position);
        // Skip if already at home
        let home_pos = positionFromSquare(robot.config.vanilla_home_pos);
        if (currentPos.x === home_pos.x  && currentPos.y === home_pos.y) {
            continue;
        }
        const row = currentPos.y;
        if (!robotsByRow.has(row)) {
            robotsByRow.set(row, []);
        }
        robotsByRow.get(row)!.push(robot);
    }

    // Sort rows from bottom to top (j=2, j=3, j=4, ..., j=9)
    const sortedRows = Array.from(robotsByRow.keys()).sort((a, b) => a - b);

    alreadyHomePieces = new Set();

    // Process each row, one robot at a time
    for (const row of sortedRows) {
        const robotsInRow = robotsByRow.get(row)!;

        // Sort robots within each row from right to left (i=9, i=8, i=7, ..., i=2)
        // i changed it from left to right
        robotsInRow.sort((a, b) => {
            const aPos = gridPositionFromPosition(a.position);
            const bPos = gridPositionFromPosition(b.position);
            return aPos.x - bPos.x;
        });

        // Move each robot in this row
        for (const robot of robotsInRow) {
            const currentPos = gridPositionFromPosition(robot.position);
            if (isHexapawn) {
                const allCommandsToHome = returnToHomeHexapawn(
                    currentPos,
                    robot.id,
                );
                commands.push(allCommandsToHome[0]);
            } else {
                const allCommandsToHome = returnToHome(currentPos, robot.id);
                commands.push(allCommandsToHome);
            }

            alreadyHomePieces.add(robot.id);
        }
    }

    return new SequentialCommandGroup(commands);
}

/**
 * Generates the path commands for a single robot to move from home to default position
 */
function generateRobotPathToDefault(
    robot: Robot,
): Command[] {
    const commands: Command[] = [];
    const currentPos = gridPositionFromPosition(robot.position);
    const defaultPos = robot.config.start_pos;

    if (!defaultPos) {
        throw new Error(`No default position specified for robot ${robot.id}`);
    }

    // Move from home to deadzone
    const deadzonePos = moveToDeadzoneFromHome(currentPos);
    commands.push(
        new AbsoluteMoveCommand(
            robot.id,
            positionFromGridPosition(deadzonePos),
        ),
    );

    // Travel clockwise along deadzone to top of the target column
    const topOfColumnPos: GridPosition = { x: defaultPos.x, y: 10 }; // Top of column in deadzone
    if (!(deadzonePos.x === topOfColumnPos.x && deadzonePos.y === topOfColumnPos.y)) {
        const deadzoneCommands = generateDeadzonePath(
            robot.id,
            deadzonePos,
            topOfColumnPos,
        );
        commands.push(...deadzoneCommands);
    }

    // Drop down to the correct position on the board
    commands.push(
        new AbsoluteMoveCommand(robot.id, positionFromGridPosition(defaultPos)),
    );

    return commands;
}

/**
 * Generates commands to move along the deadzone in a clockwise manner
 * Optimized to group consecutive straight moves into single commands
 */
function generateDeadzonePath(
    robotId: RobotId,
    startPos: GridPosition,
    endPos: GridPosition,
): Command[] {
    const commands: Command[] = [];

    // Find the indices in the deadzone array
    const startInArray = findGridPositionInArray(arrayOfDeadzone, startPos);
    const endInArray = findGridPositionInArray(arrayOfDeadzone, endPos);

    if (startInArray === -1 || endInArray === -1) {
        throw new Error(
            `Invalid deadzone positions: start=${startPos.x}, ${startPos.y}, end=${endPos.x}, ${endPos.y}`,
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
                { x: targetPos.x + 0.5, y: targetPos.y + 0.5 },
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
function moveToDeadzoneFromHome(homePos: GridPosition): GridPosition {
    // If on the left edge (i = 0), move to deadzone on the left (i = 1)
    if (homePos.x === 0) {
        return { x: 1, y: homePos.y };
    }

    // If on the right edge (i = 11), move to deadzone on the right (i = 10)
    if (homePos.x === 11) {
        return { x: 10, y: homePos.y };
    }

    // If on the bottom edge (j = 0), move to deadzone on the bottom (j = 1)
    if (homePos.y === 0) {
        return { x: homePos.x, y: 1 };
    }

    // If on the top edge (j = 11), move to deadzone on the top (j = 10)
    if (homePos.y === 11) {
        return { x: homePos.x, y: 10 };
    }

    // This shouldn't happen if called correctly, but fallback to a safe deadzone position
    return { x: 1, y: 1 };
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
        if (capturePiece != undefined) {
            const captureSquare = gridPositionFromPosition(
                robotManager.getRobot(capturePiece)!.position,
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
        if (moveToGridMove(move).from.y === 2) {
            rookPiece = robotManager.getRobotAtGridPos({ x: 2, y: 2 });
            kingMove = new AbsoluteMoveCommand(
                robotManager.getRobotAtGridPos(moveToGridMove(move).from)!.id,
                positionFromGridPosition({ x: 4, y: 2 }),
            );
            rookMove1 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 2, y: 1 }),
            );
            rookMove2 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 5, y: 1 }),
            );
            rookMove3 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 5, y: 2 }),
            );
        } else {
            rookPiece = robotManager.getRobotAtGridPos({ x: 2, y: 9 });
            kingMove = new AbsoluteMoveCommand(
                robotManager.getRobotAtGridPos(moveToGridMove(move).from)!.id,
                positionFromGridPosition({ x: 4, y: 9 }),
            );
            rookMove1 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 2, y: 10 }),
            );
            rookMove2 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 5, y: 10 }),
            );
            rookMove3 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 5, y: 9 }),
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
        if (moveToGridMove(move).from.y === 2) {
            rookPiece = robotManager.getRobotAtGridPos({ x: 9, y: 2 });
            kingMove = new AbsoluteMoveCommand(
                robotManager.getRobotAtGridPos(moveToGridMove(move).from)!.id,
                positionFromGridPosition({ x: 8, y: 2 }),
            );
            rookMove1 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 9, y: 1 }),
            );
            rookMove2 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 7, y: 1 }),
            );
            rookMove3 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 7, y: 2 }),
            );
        }
        // black side castling
        else {
            rookPiece = robotManager.getRobotAtGridPos({ x: 9, y: 9 });
            kingMove = new AbsoluteMoveCommand(
                robotManager.getRobotAtGridPos(moveToGridMove(move).from)!.id,
                positionFromGridPosition({ x: 8, y: 9 }),
            );
            rookMove1 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 9, y: 10 }),
            );
            rookMove2 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 7, y: 10 }),
            );
            rookMove3 = new AbsoluteMoveCommand(
                rookPiece.id,
                positionFromGridPosition({ x: 7, y: 9 }),
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

export function materializePathHexapawn(move: Move): Command {
    if (gameManager?.chess.isRegularCapture(move)) {
        const capturePiece = gameManager.chess.getCapturedPieceId(
            move,
            robotManager,
        );
        if (capturePiece !== undefined) {
            const captureSquare = gridPositionFromPosition(
                robotManager.getRobot(capturePiece).position,
            );

            const captureCommand = returnToHomeHexapawn(
                captureSquare,
                capturePiece,
            );
            if (captureCommand[1] === false) {
                throw Error("THIS SHOULDN'T HAVE HAPPEEND, WHAT!!");
            }
            const mainCommand = moveMainPiece(moveToGridMove(move));
            const command = new SequentialCommandGroup([
                captureCommand[0],
                mainCommand,
            ]);
            return command;
        }
        return new SequentialCommandGroup([]);
    } else {
        const gridMove = moveToGridMove(move);
        const command = moveMainPiece(gridMove);
        return command;
    }
}
