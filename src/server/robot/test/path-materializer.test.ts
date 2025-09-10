import { afterEach, expect, it, test, vi } from "vitest";
import { PieceType, type Move } from "../../../common/game-types";
import type { GridMove } from "../path-materializer";
import { pathmatTesting } from "../path-materializer";
import { GridIndices } from "../grid-indices";
const { moveToGridMove, calcCollisionType, CollisionType, addToCollisions } = pathmatTesting;
import { robotManager } from "../robot-manager";
import { Robot } from "../robot";


afterEach(()=>{
    vi.resetAllMocks();
});

/**
 * test moveToGridMove accuracy
 */
test.each([
    {from:"a2", to:"a4"} as Move,
    {from:"a7", to:"a8", promotion:PieceType.QUEEN} as Move,
    {from:"a1", to:"h8"} as Move,
    {from:"d1", to:"d8"} as Move,
])("Test move conversion",(move:Move)=>{
    const FILE_LOOKUP = "abcdefgh";
    const expected = {from:{},to:{}} as GridMove;
    let i = FILE_LOOKUP.indexOf(move.to.charAt(0)) + 2;
    let j = parseInt(move.to.charAt(1)) - 1 + 2;
    expected.to = new GridIndices(i,j);
    i = FILE_LOOKUP.indexOf(move.from.charAt(0)) + 2;
    j = parseInt(move.from.charAt(1)) - 1 + 2;
    expected.from = new GridIndices(i,j);
    expect(moveToGridMove(move)).toEqual(expected);
});

/**
 * Test collision type detection
 */
test.each([
    {from:{i:2,j:2},to:{i:2,j:3}} as GridMove,
    {from:{i:5,j:7},to:{i:6,j:7}} as GridMove,
    {from:{i:4,j:4},to:{i:3,j:3}} as GridMove,
    {from:{i:2,j:2},to:{i:4,j:3}} as GridMove,
])("Test colision detection", (move:GridMove)=>{
    let expected;
    if(move.from.j === move.to.j){
        expected = CollisionType.HORIZONTAL;
    } else if (move.from.i === move.to.i){
        expected = CollisionType.VERTICAL;
    } else if (Math.abs(move.from.i - move.to.i) === Math.abs(move.from.j - move.to.j)){
        expected = CollisionType.DIAGONAL;
    } else{
        expected = CollisionType.HORSE;
    }
    expect(calcCollisionType(move)).equals(expected);
});

const nullRobot = new Robot("null",{i:0,j:0} as GridIndices,{i:0,j:0} as GridIndices);

/**
 * Test adding a robot to the collision list
 */
it("Test collision adding",() =>{
    //true case mock
    const isSpy = vi.spyOn(robotManager, "isRobotAtIndices").mockReturnValue(true);
    const getSpy = vi.spyOn(robotManager, "getRobotAtIndices").mockImplementation((grid:GridIndices)=>{
        if(grid.i === 1 && grid.j === 1)
            return new Robot("asdf",{i:2,j:2} as GridIndices,{i:0,j:0} as GridIndices)
        return nullRobot;
    });
    const collisions = []
    addToCollisions(collisions,1,1)
    expect(isSpy).toHaveBeenCalledOnce();
    expect(getSpy).toHaveBeenCalledOnce();
    expect(collisions).contain("asdf");
    collisions.pop();

    //false case mock
    isSpy.mockReturnValue(false);
    addToCollisions(collisions,1,1)
    expect(isSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(collisions).toHaveLength(0);
});