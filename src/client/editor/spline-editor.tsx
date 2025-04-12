import { useReducer, useMemo } from "react";
import {
    type Spline,
    type Coords,
    SplinePointType,
    type QuadraticBezier,
    type CubicBezier,
    splineToSvgDrawAttribute,
} from "../../common/spline";
import { SplinePoint, SplineControlPoint } from "./points";

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
