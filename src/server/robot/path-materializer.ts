import { robotManager } from "../api/managers";
import { Move } from "../../common/game-types";
import { gameManager } from "../api/api";
import { Command, SequentialCommandGroup } from "../command/command";
import {
    AbsoluteMoveCommand,
    DriveCommand,
    MoveCommand,
    RelativeRotateCommand,
} from "../command/move-command";
import { MovePiece, ReversibleRobotCommand } from "../command/move-piece";
import { Position } from "./position";
import { GridIndices } from "./grid-indices";
import { error } from "console";

export interface GridMove {
    from: GridIndices;
    to: GridIndices;
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

function calcCollisionType(gridMove: GridMove): number {
    const from = gridMove.from;
    const to = gridMove.to;

    // Horizontal
    if (from.i === to.i) {
        return 0;
        // Vertical
    } else if (from.j === to.j) {
        return 1;
    } else {
        // Diagonal
        if (Math.abs(from.i - to.i) === Math.abs(from.j - to.j)) {
            return 2;
            // Horse
        } else {
            return 3;
        }
    }
}

function detectCollisions(gridMove: GridMove, collisionType: number): string[] {
    const from = gridMove.from;
    const to = gridMove.to;
    const collisions: string[] = [];
    switch (collisionType) {
        // Horizontal
        case 0: {
            if (to.i < from.i) {
                for (let i = from.i; i > to.i; i--) {
                    const square = new GridIndices(i, from.j);
                    const piece = robotManager.getRobotAtIndices(square).id;
                    if (piece !== undefined) {
                        collisions.push(piece);
                    }
                }
            } else {
                for (let i = from.i; i < to.i; i++) {
                    const square = new GridIndices(i, from.j);
                    const piece = robotManager.getRobotAtIndices(square).id;
                    if (piece !== undefined) {
                        collisions.push(piece);
                    }
                }
            }
            break;
        }
        // Vertical
        case 1: {
            if (to.j < from.j) {
                for (let j = from.j; j > to.j; j--) {
                    const square = new GridIndices(from.i, j);
                    const piece = robotManager.getRobotAtIndices(square).id;
                    if (piece !== undefined) {
                        collisions.push(piece);
                    }
                }
            } else {
                for (let j = from.j; j < to.j; j++) {
                    const square = new GridIndices(from.i, j);
                    const piece = robotManager.getRobotAtIndices(square).id;
                    if (piece !== undefined) {
                        collisions.push(piece);
                    }
                }
            }
            break;
        }
        // Diagonal
        case 2: {
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
            for (let off = 1; off < distance; off++) {
                // Finds the current coords of the diagonal tile that the loop is on
                const midx = from.i + off * nx;
                const midy = from.j + off * ny;

                // Above or below the tile, depends on direction
                const square1 = new GridIndices(midx, midy + ny);
                const piece1 = robotManager.getRobotAtIndices(square1).id;
                if (piece1 !== undefined) {
                    collisions.push(piece1);
                }
                // Left or right of tile, depends on direction
                const square2 = new GridIndices(midx + nx, midy);
                const piece2 = robotManager.getRobotAtIndices(square2).id;
                if (piece2 !== undefined) {
                    collisions.push(piece2);
                }
            }
            break;
        }
        // Horse
        case 3: {
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
            const piece1 = robotManager.getRobotAtIndices(square1).id;
            if (piece1 !== undefined) {
                collisions.push(piece1);
            }
            // Same initial direction horse moves share this square. Will be directly
            // adjacent to moving piece.
            const square2 = new GridIndices(from.i + sx, from.j + sy);
            const piece2 = robotManager.getRobotAtIndices(square2).id;
            if (piece2 !== undefined) {
                collisions.push(piece2);
            }
            break;
        }
    }
    return collisions;
}

function findShimmyLocation(
    pieceId: string,
    move: GridMove,
    collisionType: number,
): Position {
    const shimmyPos: Position = robotManager.getRobot(pieceId).position;
    const axisShimmyAmount: number = 1 / 3;
    switch (collisionType) {
        // Horizontal
        case 0: {
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
        case 1: {
            const direction: [number, number] = directionToEdge(move.to);
            const gridX: number = move.from.i + direction[0];
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
        case 2:
        case 3: {
            const moveDistance: number = 0.5;
            const signedDistX: number = move.to.i - move.from.i;
            const signedDistY: number = move.to.j - move.from.j;
            const normalX: number = signedDistX / Math.abs(signedDistX);
            const normalY: number = signedDistY / Math.abs(signedDistY);
            const orth1: number[] = [-normalX, normalY];
            const orth2: number[] = [normalX, -normalY];
            const orthPos1: number[] = [
                move.to.i + orth1[0],
                move.to.j + orth1[1],
            ];
            const orthPos2: number[] = [
                move.to.i + orth2[0],
                move.to.j + orth2[1],
            ];

            // distance calculations :)
            const val1: number[] = [
                shimmyPos.x - orthPos1[0],
                shimmyPos.y - orthPos1[1],
            ];
            const val2: number[] = [
                shimmyPos.x - orthPos2[0],
                shimmyPos.y - orthPos2[1],
            ];
            const dist1: number = Math.sqrt(
                val1[0] * val1[0] - val1[1] * val1[1],
            );
            const dist2: number = Math.sqrt(
                val2[0] * val2[0] - val2[1] * val2[1],
            );

            return dist1 < dist2 ?
                    new Position(
                        shimmyPos.x + val1[0] * moveDistance,
                        shimmyPos.y + val1[1] * moveDistance,
                    )
                :   new Position(
                        shimmyPos.x + val2[0] * moveDistance,
                        shimmyPos.y + val2[1] * moveDistance,
                    );
        }
    }
    return new Position(0, 0);
}

function constructDriveCommand(
    pieceId: string,
    location: Position,
): DriveCommand {
    const robot = robotManager.getRobot(pieceId);
    const offset = location.sub(robot.position);
    const distance = Math.hypot(offset.x, offset.y);
    return new DriveCommand(pieceId, distance);
}

function constructRotateCommand(
    pieceId: string,
    location: Position,
): RelativeRotateCommand {
    const robot = robotManager.getRobot(pieceId);
    const offset = location.sub(robot.position);
    const angle = Math.atan2(-offset.x, offset.y);
    return new RelativeRotateCommand(pieceId, angle);
}

function constructFinalCommand(
    move: GridMove,
    driveCommands: DriveCommand[],
    rotateCommands: RelativeRotateCommand[],
): MovePiece {
    const from = move.from;
    console.log(from, robotManager.indicesToIds);

    let mainPiece: string | undefined;

    for (const [key, value] of robotManager.indicesToIds) {
        if (JSON.parse(key).i === from.i && JSON.parse(key).j === from.j) {
            mainPiece = value;
            break;
        }
    }

    if (mainPiece !== undefined) {
        console.log("main piece");
        const to = move.to;
        const pos = new Position(to.i + 0.5, to.j + 0.5);
        const mainDrive = constructDriveCommand(mainPiece, pos);
        const mainTurn = constructRotateCommand(mainPiece, pos);
        const setupCommands: ReversibleRobotCommand[] = [];
        setupCommands.push(...rotateCommands, mainTurn, ...driveCommands);
        return new MovePiece(setupCommands, mainDrive);
    } else {
        console.log("no main piece");
        return new MovePiece(rotateCommands, new SequentialCommandGroup([]));
    }
}

// Takes in a move, and generates the commands required to get the main piece to it's destination
// If there are pieces in the way, it shimmy's them out, and move them back after main piece passes
function moveMainPiece(move: GridMove): MovePiece {
    const driveCommands: DriveCommand[] = [];
    const rotateCommands: RelativeRotateCommand[] = [];
    const collisionType = calcCollisionType(move);
    const collisions: string[] = detectCollisions(move, collisionType);
    for (let i = 0; i < collisions.length; i++) {
        const pieceId = collisions[i];
        const location = findShimmyLocation(pieceId, move, collisionType);
        driveCommands.push(constructDriveCommand(pieceId, location));
        rotateCommands.push(constructRotateCommand(pieceId, location));
    }
    return constructFinalCommand(move, driveCommands, rotateCommands);
}

/**
 * Te easiest move to get to the dead zone
 */
//TODO: Change the move to Grid that way we can move off the board.
function moveToDeadZone(origin: GridIndices): GridMove {
    const aboveMove = {
        from: origin,
        to: new GridIndices(origin[0], 9), //(origin[0] + "8" as unknown as GridIndices),
    };
    const belowMove = {
        from: origin,
        to: new GridIndices(origin[0], 1), //(origin[0] + "1") as Square,
    };
    const rightMove = {
        from: origin,
        to: new GridIndices(9, origin[1]), //("h" + origin[1]) as Square,
    };
    const leftMove = {
        from: origin,
        to: new GridIndices(1, origin[1]), //("a" + origin[1]) as Square,
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
        if (arrayOfDeadzone.find((dz) => dz.equals(home.addTuple(direction)))) {
            finalDestination = home.addTuple(direction);
        }
    }
    if (!finalDestination) {
        throw new error("WHERE THE HELL ARE YOU GOING");
    }
    const startInArray = arrayOfDeadzone.indexOf(startInDeadzone);
    const endInArray = arrayOfDeadzone.indexOf(finalDestination);
    let differenceOfIndex = endInArray - startInArray;

    if (differenceOfIndex < 0) {
        differenceOfIndex += 36;
    }

    const botDirectionToHome = differenceOfIndex < 18 ? 1 : -1;

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
export function materializePath(move: Move): Command {
    if (
        gameManager?.chess.isRegularCapture(move) ||
        gameManager?.chess.isEnPassant(move)
    ) {
        const capturePiece = gameManager.chess.getCapturedPieceId(
            move,
            robotManager,
        );
        console.log("capture " + capturePiece);
        if (capturePiece !== undefined) {
            const captureSquareX = Math.floor(
                robotManager.getRobot(capturePiece).position.x,
            );
            const captureSquareY = Math.floor(
                robotManager.getRobot(capturePiece).position.y,
            );
            const captureSquare = new GridIndices(
                captureSquareX,
                captureSquareY,
            );

            const captureCommand = returnToHome(captureSquare, capturePiece);
            const mainCommand = moveMainPiece(moveToGridMove(move));
            const command = new SequentialCommandGroup([
                captureCommand,
                mainCommand,
            ]);
            const mainPiece = robotManager.getRobotAtIndices(
                GridIndices.squareToGrid(move.from),
            );

            console.log(
                "robot indices are: ",
                GridIndices.squareToGrid(move.to),
            );
            robotManager.updateRobot(
                mainPiece.id,
                GridIndices.squareToGrid(move.to),
            );

            console.log(
                "captured robot indices are: ",
                Math.floor(robotManager.getRobot(capturePiece).position.x),
            ),
                " ,",
                Math.floor(robotManager.getRobot(capturePiece).position.x);
            robotManager.updateRobot(
                capturePiece,
                robotManager.getRobot(capturePiece).homeIndices,
            );
            return command;
        }
        return new SequentialCommandGroup([]);
    } else if (gameManager?.chess.isQueenSideCastling(move)) {
        return new SequentialCommandGroup([]);
    } else if (gameManager?.chess.isKingSideCastling(move)) {
        return new SequentialCommandGroup([]);
    } else {
        const mainPiece = robotManager.getRobotAtIndices(
            GridIndices.squareToGrid(move.from),
        );

        console.log("robot indices are: ", GridIndices.squareToGrid(move.to));
        robotManager.updateRobot(
            mainPiece.id,
            GridIndices.squareToGrid(move.to),
        );
        return moveMainPiece(moveToGridMove(move));
    }
}

export function debugPath(move: Move) {
    return moveMainPiece(moveToGridMove(move));
}
