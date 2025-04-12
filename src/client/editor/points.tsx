import { ContextMenu, Menu, MenuItem, MenuDivider } from "@blueprintjs/core";
import { useRef } from "react";
import { type Point, SplinePointType, type Coords } from "../../common/spline";
import { robotSize } from "../debug/simulator";
import { useDraggable } from "./hooks";

export function SplinePoint({
    point,
    moveFn,
    switchToQuadraticFn = undefined,
    switchToCubicFn = undefined,
    deleteFn = undefined,
}: {
    point: Point;
    moveFn: (x: number, y: number) => void;
    deleteFn?: () => void;
    switchToQuadraticFn?: () => void;
    switchToCubicFn?: () => void;
}) {
    // TODO: fix context menu positioning
    const mainPointRef = useRef<HTMLElement>(null);
    useDraggable(mainPointRef, (screenX, screenY) =>
        moveFn(screenX + robotSize / 4, screenY + robotSize / 4),
    );

    const mainPointColor =
        point.type === SplinePointType.StartPoint ? "blue" : "black";
    const mainCoords =
        point.type === SplinePointType.StartPoint ?
            point.point
        :   point.endPoint;

    return (
        <ContextMenu
            content={
                <Menu>
                    {point.type === SplinePointType.CubicBezier && (
                        <MenuItem
                            text="Switch to Quadratic"
                            onClick={switchToQuadraticFn}
                        />
                    )}
                    {point.type === SplinePointType.QuadraticBezier && (
                        <MenuItem
                            text="Switch to Cubic"
                            onClick={switchToCubicFn}
                        />
                    )}
                    <MenuItem
                        text="Delete..."
                        intent="danger"
                        onClick={deleteFn}
                        disabled={!deleteFn}
                    />
                    <MenuDivider />
                    <MenuItem disabled={true} text={`Type: ${point.type}`} />
                </Menu>
            }
        >
            <span
                ref={mainPointRef}
                style={{
                    width: robotSize / 2,
                    height: robotSize / 2,
                    backgroundColor: mainPointColor,
                    borderRadius: "50%",
                    position: "absolute",
                    left: mainCoords.x - robotSize / 4,
                    top: mainCoords.y - robotSize / 4,
                    cursor: "grab",
                }}
            />
        </ContextMenu>
    );
}
export function SplineControlPoint({
    point,
    moveControlFn,
}: {
    point: Coords;
    moveControlFn: (x: number, y: number) => void;
}) {
    const controlPointRef = useRef<HTMLElement>(null);
    useDraggable(controlPointRef, (screenX, screenY) =>
        moveControlFn(screenX + robotSize / 4, screenY + robotSize / 4),
    );

    return (
        <span
            ref={controlPointRef}
            style={{
                width: robotSize / 2,
                height: robotSize / 2,
                backgroundColor: "red",
                borderRadius: "50%",
                position: "absolute",
                left: point.x - robotSize / 4,
                top: point.y - robotSize / 4,
                cursor: "grab",
            }}
        />
    );
}
