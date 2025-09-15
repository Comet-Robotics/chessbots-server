import { afterEach, describe, expect, it, test, vi } from "vitest";
import { PieceType, type Move } from "../../../common/game-types";
import type { GridMove } from "../path-materializer";
import { PathMaterializer, pathmatTexting } from "../path-materializer";
import { GridIndices } from "../grid-indices";
import { robotManager } from "../robot-manager";
import { Robot } from "../robot";
import { Position } from "../position";
const {CollisionType} = pathmatTexting;

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
    expect(PathMaterializer.moveToGridMove(move)).toEqual(expected);
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
    expect(PathMaterializer.calcCollisionType(move)).equals(expected);
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
    PathMaterializer.addToCollisions(collisions,1,1)
    expect(isSpy).toHaveBeenCalledOnce();
    expect(getSpy).toHaveBeenCalledOnce();
    expect(collisions).contain("asdf");
    collisions.pop();

    //false case mock
    isSpy.mockReturnValue(false);
    PathMaterializer.addToCollisions(collisions,1,1)
    expect(isSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(collisions).toHaveLength(0);
});

describe("Test collision detection",()=>{
    const getMock = (grid:GridIndices)=>{
        if(grid.i === 6 && grid.j === 5){
            return new Robot("right",{i:6,j:5} as GridIndices,{i:0,j:0} as GridIndices);
        } else if (grid.i === 4 && grid.j === 5){
            return new Robot("left",{i:4,j:5} as GridIndices,{i:0,j:0} as GridIndices);
        } else if(grid.i === 5 && grid.j === 6){
            return new Robot("up",{i:4,j:6} as GridIndices,{i:0,j:0} as GridIndices);
        } else if (grid.i === 5 && grid.j === 4){
            return new Robot("down",{i:5,j:4} as GridIndices,{i:0,j:0} as GridIndices);
        } else if (grid.i === 4 && grid.j === 6){
            return new Robot("topleft",{i:5,j:4} as GridIndices,{i:0,j:0} as GridIndices);
        } else if (grid.i === 6 && grid.j === 6){
            return new Robot("topright",{i:5,j:4} as GridIndices,{i:0,j:0} as GridIndices);
        } else if (grid.i === 4 && grid.j === 4){
            return new Robot("bottomleft",{i:5,j:4} as GridIndices,{i:0,j:0} as GridIndices);
        } else if (grid.i === 6 && grid.j === 4){
            return new Robot("bottomright",{i:5,j:4} as GridIndices,{i:0,j:0} as GridIndices);
        } else{
            return nullRobot;
        }
    }

    //assuming the robot starts at 5,5
    const addMock = (collisions, x, y)=>{
        if(x === 6 && y === 5){
            collisions.push("right");
        } else if (x === 4 && y === 5){
            collisions.push("left");
        } else if(x === 5 && y === 6){
            collisions.push("up");
        } else if (x === 5 && y === 4){
            collisions.push("down");
        } else {
            collisions.push("null");
        }
    }

    it("horizontal test",()=>{
        const addSpy = vi.spyOn(PathMaterializer,"addToCollisions").mockImplementation(addMock);

        let starting = {from:{i:5,j:5} as GridIndices, to:{i:7,j:5} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.HORIZONTAL)).toContain("right");

        starting = {from:{i:5,j:5} as GridIndices, to:{i:3,j:5} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.HORIZONTAL)).toContain("left");

        expect(addSpy).toHaveBeenCalled();
    });

    it("vertical test",()=>{
        const addSpy = vi.spyOn(PathMaterializer,"addToCollisions").mockImplementation(addMock);
        
        let starting = {from:{i:5,j:5} as GridIndices, to:{i:5,j:7} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.VERTICAL)).toContain("up");

        starting = {from:{i:5,j:5} as GridIndices, to:{i:5,j:3} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.VERTICAL)).toContain("down");

        expect(addSpy).toHaveBeenCalled();
    })

    it("diagonal tests",()=>{
        const isSpy = vi.spyOn(robotManager, "isRobotAtIndices").mockReturnValue(true);
        const getSpy = vi.spyOn(robotManager, "getRobotAtIndices").mockImplementation(getMock);

        //top left
        let starting = {from:{i:5,j:5} as GridIndices, to:{i:3,j:7} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.DIAGONAL)).containSubset(["up","left"]);
        //top right
        starting = {from:{i:5,j:5} as GridIndices, to:{i:7,j:7} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.DIAGONAL)).containSubset(["up","right"]);
        //bottom left
        starting = {from:{i:5,j:5} as GridIndices, to:{i:3,j:3} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.DIAGONAL)).containSubset(["down","left"]);
        //bottom right
        starting = {from:{i:5,j:5} as GridIndices, to:{i:7,j:3} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.DIAGONAL)).containSubset(["down","right"]);

        expect(isSpy).toHaveBeenCalled();
        expect(getSpy).toHaveBeenCalled();
    });

    it("horse tests",()=>{
        const isSpy = vi.spyOn(robotManager, "isRobotAtIndices").mockReturnValue(true);
        const getSpy = vi.spyOn(robotManager, "getRobotAtIndices").mockImplementation(getMock);
        
        //left up
        let starting = {from:{i:5,j:5} as GridIndices, to:{i:3,j:6} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.HORSE)).containSubset(["left","topleft"]);
        //left down
        starting = {from:{i:5,j:5} as GridIndices, to:{i:3,j:4} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.HORSE)).containSubset(["left","bottomleft"]);
        //right up
        starting = {from:{i:5,j:5} as GridIndices, to:{i:7,j:6} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.HORSE)).containSubset(["right","topright"]);
        //right down
        starting = {from:{i:5,j:5} as GridIndices, to:{i:7,j:4} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.HORSE)).containSubset(["right","bottomright"]);

        //up left
        starting = {from:{i:5,j:5} as GridIndices, to:{i:4,j:7} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.HORSE)).containSubset(["up","topleft"]);
        //up right
        starting = {from:{i:5,j:5} as GridIndices, to:{i:6,j:7} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.HORSE)).containSubset(["up","topright"]);
        //down left
        starting = {from:{i:5,j:5} as GridIndices, to:{i:4,j:3} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.HORSE)).containSubset(["down","bottomleft"]);
        //down right
        starting = {from:{i:5,j:5} as GridIndices, to:{i:6,j:3} as GridIndices} as GridMove;
        expect(PathMaterializer.detectCollisions(starting, CollisionType.HORSE)).containSubset(["down","bottomright"]);

        expect(isSpy).toHaveBeenCalled();
        expect(getSpy).toHaveBeenCalled();
    });
});

test.each([
    new GridIndices(6,6),
    new GridIndices(6,7), //no
    new GridIndices(7,6),
    new GridIndices(7,7),
])("Test direction to edge",(pos:GridIndices)=>{
    let x = 0;
    let y = 0;
    if (pos.i >= 6)
        x = -1
    else   
        x = 1
    if (pos.j >=6)
        y = -1
    else
        y = 1
    const output:[number,number] = [x,y];
    expect(PathMaterializer.directionToEdge(pos)).toEqual(expect.arrayContaining(output));
});


describe("Test shimmy location",()=>{
    //start the robot at 5,5
    const startingRobot = new Robot("asdf",{i:5,j:5} as GridIndices,{i:6,j:6} as GridIndices, 0, new Position(5,5));
    
    
    it("horizontal tests",()=>{
        vi.spyOn(robotManager, "getRobot").mockReturnValue(startingRobot);
        //shimmy down
        //right
        let starting = {from:{i:4,j:5} as GridIndices, to:{i:6,j:5} as GridIndices} as GridMove;
        let output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORIZONTAL)
        expect(output.x).toBeCloseTo(5);
        expect(output.y).toBeCloseTo(5-1/3);

        //left
        starting = {from:{i:6,j:5} as GridIndices, to:{i:4,j:5} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORIZONTAL)
        expect(output.x).toBeCloseTo(5);
        expect(output.y).toBeCloseTo(5-1/3);

        //shimmy up
        //right
        starting = {from:{i:4,j:4} as GridIndices, to:{i:6,j:4} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORIZONTAL)
        expect(output.x).toBeCloseTo(5);
        expect(output.y).toBeCloseTo(5+1/3);

        //left
        starting = {from:{i:6,j:4} as GridIndices, to:{i:4,j:4} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORIZONTAL)
        expect(output.x).toBeCloseTo(5);
        expect(output.y).toBeCloseTo(5+1/3);
    });

    it("vertical tests",()=>{
        vi.spyOn(robotManager, "getRobot").mockReturnValue(startingRobot);
        //shimmy left
        //up
        let starting = {from:{i:5,j:4} as GridIndices, to:{i:5,j:6} as GridIndices} as GridMove;
        let output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.VERTICAL)
        expect(output.x).toBeCloseTo(5-1/3);
        expect(output.y).toBeCloseTo(5);

        //down
        starting = {from:{i:5,j:6} as GridIndices, to:{i:5,j:4} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.VERTICAL)
        expect(output.x).toBeCloseTo(5-1/3);
        expect(output.y).toBeCloseTo(5);

        //shimmy right
        //up
        starting = {from:{i:4,j:4} as GridIndices, to:{i:4,j:6} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.VERTICAL)
        expect(output.x).toBeCloseTo(5+1/3);
        expect(output.y).toBeCloseTo(5);

        //down
        starting = {from:{i:4,j:6} as GridIndices, to:{i:4,j:4} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.VERTICAL)
        expect(output.x).toBeCloseTo(5+1/3);
        expect(output.y).toBeCloseTo(5);
    });

    it("horse tests",()=>{
        vi.spyOn(robotManager, "getRobot").mockReturnValue(startingRobot);

        //shimmy robot left then up
        let starting = {from:{i:5,j:4} as GridIndices, to:{i:6,j:6} as GridIndices} as GridMove;
        let output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORSE)
        expect(output.x).toBeCloseTo(5-0.5*(2/Math.hypot(2,1)));
        expect(output.y).toBeCloseTo(5+0.5*(1/Math.hypot(2,1)));

        //shimmy robot left then down
        starting = {from:{i:5,j:6} as GridIndices, to:{i:6,j:4} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORSE)
        expect(output.x).toBeCloseTo(5-0.5*(2/Math.hypot(2,1)));
        expect(output.y).toBeCloseTo(5-0.5*(1/Math.hypot(2,1)));

        //shimmy robot right then up
        starting = {from:{i:4,j:5} as GridIndices, to:{i:5,j:3} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORSE)
        expect(output.x).toBeCloseTo(5+0.5*(2/Math.hypot(2,1)));
        expect(output.y).toBeCloseTo(5+0.5*(1/Math.hypot(2,1)));

        //shimmy robot right then down
        starting = {from:{i:5,j:6} as GridIndices, to:{i:4,j:4} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORSE)
        expect(output.x).toBeCloseTo(5+0.5*(2/Math.hypot(2,1)));
        expect(output.y).toBeCloseTo(5-0.5*(1/Math.hypot(2,1)));


        //shimmy robot up then left
        starting = {from:{i:4,j:4} as GridIndices, to:{i:6,j:5} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORSE)
        expect(output.x).toBeCloseTo(5-0.5*(1/Math.hypot(2,1)));
        expect(output.y).toBeCloseTo(5+0.5*(2/Math.hypot(2,1)));

        //shimmy robot up then right
        starting = {from:{i:5,j:4} as GridIndices, to:{i:3,j:5} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORSE)
        expect(output.x).toBeCloseTo(5+0.5*(1/Math.hypot(2,1)));
        expect(output.y).toBeCloseTo(5+0.5*(2/Math.hypot(2,1)));

        //shimmy robot down then left
        starting = {from:{i:4,j:6} as GridIndices, to:{i:6,j:5} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORSE)
        expect(output.x).toBeCloseTo(5-0.5*(1/Math.hypot(2,1)));
        expect(output.y).toBeCloseTo(5-0.5*(2/Math.hypot(2,1)));

        //shimmy robot down then right
        starting = {from:{i:6,j:6} as GridIndices, to:{i:4,j:5} as GridIndices} as GridMove;
        output = PathMaterializer.findShimmyLocation("asdf",starting,CollisionType.HORSE)
        expect(output.x).toBeCloseTo(5+0.5*(1/Math.hypot(2,1)));
        expect(output.y).toBeCloseTo(5-0.5*(2/Math.hypot(2,1)));

    })
});
