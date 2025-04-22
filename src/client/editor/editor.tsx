import { RefObject, useEffect, useMemo, useReducer, useRef } from "react";
import { ContextMenu, Menu, MenuItem, MenuDivider } from "@blueprintjs/core";
import {
    Coords,
    CubicBezier,
    Point,
    QuadraticBezier,
    Spline,
    SplinePointType,
    splineToSvgDrawAttribute,
} from "../../common/spline";
import { RobotGrid, robotSize } from "../debug/simulator";
export function Editor() {
    return (
        <div>
            <RobotGrid robotState={{}} />
            <SplineEditor
                initialSpline={{
                    start: {
                        type: SplinePointType.StartPoint,
                        point: {
                            x: 0,
                            y: 70,
                        },
                    },
                    points: [
                        {
                            type: SplinePointType.QuadraticBezier,
                            endPoint: { x: 100, y: 100 },
                        },
                        {
                            type: SplinePointType.CubicBezier,
                            endPoint: { x: 315, y: 50 },
                            controlPoint: {
                                x: 300,
                                y: 40,
                            },
                        },
                        {
                            type: SplinePointType.QuadraticBezier,
                            endPoint: { x: 70, y: 70 },
                        },
                    ],
                }}
            />
        </div>
    );
}

export function SplineEditor({ initialSpline }: { initialSpline: Spline }) {
    type SplineEditorAction =
        | { type: "DELETE_POINT"; index: number }
        | { type: "DELETE_START_POINT" }
        | { type: "MOVE_POINT_ENDPOINT"; coords: Coords; index: number }
        | { type: "MOVE_START_POINT"; coords: Coords }
        | { type: "MOVE_CONTROL_POINT"; coords: Coords; index: number }
        | { type: "SWITCH_TO_QUADRATIC"; index: number }
        | { type: "SWITCH_TO_CUBIC"; index: number };

    const [spline, dispatch] = useReducer(
        (state: Spline, action: SplineEditorAction): Spline => {
            switch (action.type) {
                case "DELETE_POINT": {
                    return {
                        ...state,
                        points: state.points.toSpliced(action.index, 1),
                    };
                }
                case "DELETE_START_POINT": {
                    if (state.points.length === 0) return state;
                    return {
                        ...state,
                        start: {
                            type: SplinePointType.StartPoint,
                            point: state.points[0].endPoint,
                        },
                        points: state.points.slice(1),
                    };
                }
                case "MOVE_POINT_ENDPOINT": {
                    const newPoints = [...state.points];
                    newPoints[action.index].endPoint = action.coords;
                    return { ...state, points: newPoints };
                }
                case "MOVE_START_POINT": {
                    return {
                        ...state,
                        start: {
                            type: SplinePointType.StartPoint,
                            point: action.coords,
                        },
                    };
                }
                case "MOVE_CONTROL_POINT": {
                    const point = state.points[action.index];
                    if (point.type !== SplinePointType.CubicBezier) {
                        return state;
                    }

                    point.controlPoint = action.coords;

                    const newPoints = [...state.points];
                    newPoints[action.index] = point;

                    return { ...state, points: newPoints };
                }
                case "SWITCH_TO_QUADRATIC": {
                    const point = state.points[action.index];
                    if (point.type !== SplinePointType.CubicBezier) {
                        return state;
                    }

                    const newPoint: QuadraticBezier = {
                        type: SplinePointType.QuadraticBezier,
                        endPoint: point.endPoint,
                    };

                    const newPoints = [...state.points];
                    newPoints[action.index] = newPoint;

                    return { ...state, points: newPoints };
                }
                case "SWITCH_TO_CUBIC": {
                    const point = state.points[action.index];
                    if (point.type !== SplinePointType.QuadraticBezier) {
                        return state;
                    }

                    const newPoint: CubicBezier = {
                        type: SplinePointType.CubicBezier,
                        controlPoint: {
                            x: point.endPoint.x / 2,
                            y: point.endPoint.y / 2,
                        },
                        endPoint: point.endPoint,
                    };

                    const newPoints = [...state.points];
                    newPoints[action.index] = newPoint;

                    return { ...state, points: newPoints };
                }
            }

            return state;
        },
        initialSpline,
    );
    const path = useMemo(() => splineToSvgDrawAttribute(spline), [spline]);
    return (
        <>
            <svg
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                }}
            >
                <path d={path} stroke="purple" strokeWidth={3} fill="none" />
            </svg>
            <SplinePoint
                point={spline.start}
                deleteFn={
                    spline.points.length > 0 ?
                        () => dispatch({ type: "DELETE_START_POINT" })
                    :   undefined
                }
                moveFn={(x, y) =>
                    dispatch({ type: "MOVE_START_POINT", coords: { x, y } })
                }
            />
            {spline.points.map((point, index) => (
                <>
                    <SplinePoint
                        point={point}
                        deleteFn={() =>
                            dispatch({ type: "DELETE_POINT", index })
                        }
                        moveFn={(x, y) =>
                            dispatch({
                                type: "MOVE_POINT_ENDPOINT",
                                coords: { x, y },
                                index,
                            })
                        }
                        switchToQuadraticFn={() =>
                            dispatch({ type: "SWITCH_TO_QUADRATIC", index })
                        }
                        switchToCubicFn={() =>
                            dispatch({ type: "SWITCH_TO_CUBIC", index })
                        }
                    />
                    {/* TODO: add line between control point and end point */}
                    {point.type === SplinePointType.CubicBezier && (
                        <SplineControlPoint
                            point={point.controlPoint}
                            moveControlFn={(x, y) =>
                                dispatch({
                                    type: "MOVE_CONTROL_POINT",
                                    coords: { x, y },
                                    index,
                                })
                            }
                        />
                    )}
                </>
            ))}
        </>
    );
}

function SplinePoint({
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

function SplineControlPoint({
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

function useDraggable(
    elRef: RefObject<HTMLElement>,
    updatePosition: (screenX: number, screenY: number) => void,
) {
    useEffect(() => {
        const el = elRef.current;
        if (!el) return;

        let pos1 = 0,
            pos2 = 0,
            pos3 = 0,
            pos4 = 0;

        const onMouseDown = (e) => {
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // call a fn whenever the cursor moves:
            document.onmousemove = elementDrag;
        };

        const elementDrag = (e) => {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            const x = el.offsetLeft - pos1;
            const y = el.offsetTop - pos2;
            updatePosition(x, y);
        };

        const closeDragElement = () => {
            document.onmouseup = null;
            document.onmousemove = null;
        };

        el.addEventListener("mousedown", onMouseDown);

        return () => {
            el.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mousemove", elementDrag);
            document.removeEventListener("mouseup", closeDragElement);
        };
    }, [elRef, updatePosition]);
}
