import { useMemo, useCallback, Fragment } from "react";
import {
    type Coords,
    SplinePointType,
    splineToSvgDrawAttribute,
} from "../../common/spline";
import { SplinePoint, SplineControlPoint } from "./points";
import {
    type TimelineLayer,
    timelineLayerToSpline,
    TimelineEventTypes,
} from "../../common/show";

interface SplineEditorProps {
    layer: TimelineLayer;
    onStartPointMove: (newCoords: Coords) => void;
    onPointMove: (pointIndex: number, newCoords: Coords) => void;
    onControlPointMove: (pointIndex: number, newCoords: Coords) => void;
    onDeleteStartPoint: () => void;
    onDeletePoint: (pointIndex: number) => void;
    onSwitchPointType: (
        pointIndex: number,
        newType: SplinePointType.QuadraticBezier | SplinePointType.CubicBezier,
    ) => void;
}

export function SplineEditor({
    layer,
    onStartPointMove,
    onPointMove,
    onControlPointMove,
    onDeleteStartPoint,
    onDeletePoint,
    onSwitchPointType,
}: SplineEditorProps) {
    const [, remainingEvents] = layer;
    const spline = useMemo(() => timelineLayerToSpline(layer), [layer]);

    const path = useMemo(() => splineToSvgDrawAttribute(spline), [spline]);

    const getOriginalEventIndex = useCallback(
        (goToPointIndex: number): number => {
            let count = 0;
            for (let i = 0; i < remainingEvents.length; i++) {
                if (
                    remainingEvents[i].type ===
                    TimelineEventTypes.GoToPointEvent
                ) {
                    if (count === goToPointIndex) {
                        return i;
                    }
                    count++;
                }
            }
            return -1;
        },
        [remainingEvents],
    );

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
                onDelete={
                    spline.points.length > 0 ? onDeleteStartPoint : undefined
                }
                onMove={(x, y) => onStartPointMove({ x, y })}
            />
            {spline.points.map((point, index) => (
                <Fragment key={`point-group-${index}`}>
                    <SplinePoint
                        point={point}
                        onDelete={() =>
                            onDeletePoint(getOriginalEventIndex(index))
                        }
                        onMove={(x, y) =>
                            onPointMove(getOriginalEventIndex(index), { x, y })
                        }
                        onSwitchToQuadratic={() =>
                            onSwitchPointType(
                                getOriginalEventIndex(index),
                                SplinePointType.QuadraticBezier,
                            )
                        }
                        onSwitchToCubic={() =>
                            onSwitchPointType(
                                getOriginalEventIndex(index),
                                SplinePointType.CubicBezier,
                            )
                        }
                    />
                    {/* TODO: add line between control point and end point */}
                    {point.type === SplinePointType.CubicBezier && (
                        <SplineControlPoint
                            point={point.controlPoint}
                            onMove={(x, y) =>
                                onControlPointMove(
                                    getOriginalEventIndex(index),
                                    { x, y },
                                )
                            }
                        />
                    )}
                </Fragment>
            ))}
        </>
    );
}
