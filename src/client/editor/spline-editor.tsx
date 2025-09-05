import { useMemo, useCallback, Fragment } from "react";
import {
    type Coords,
    SplinePointType,
    splineToSvgDrawAttribute,
} from "../../common/spline";
import { SplinePoint, SplineControlPoint } from "./points";
import {
    type TimelineLayerType,
    timelineLayerToSpline,
    TimelineEventTypes,
} from "../../common/show";
import { GRID_CELL_PX } from "../../common/units";

interface SplineEditorProps {
    layer: TimelineLayerType;
    onStartPointMove: (newCoords: Coords) => void;
    onPointMove: (pointIndex: number, newCoords: Coords) => void;
    onControlPointMove: (pointIndex: number, newCoords: Coords) => void;
    onControlPoint2Move: (pointIndex: number, newCoords: Coords) => void;
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
    onControlPoint2Move,
    onDeleteStartPoint,
    onDeletePoint,
    onSwitchPointType,
}: SplineEditorProps) {
    const { remainingEvents } = layer;
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
                viewBox="0 0 12 12"
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: GRID_CELL_PX * 12,
                    height: GRID_CELL_PX * 12,
                    pointerEvents: "none",
                }}
            >
                <path d={path} stroke="purple" strokeWidth={0.03} fill="none" />
            </svg>
            <SplinePoint
                point={spline.start}
                onDelete={
                    spline.points.length > 0 ? onDeleteStartPoint : undefined
                }
                onMove={(x, y) => onStartPointMove({ x, y })}
                onJumpToPoint={() => {
                    // TODO: i don't like that we're touching elements by ids and mucking w dom outside of react - see if theres a way to refactor this in a more idiomatic react way
                    const el = document.getElementById(
                        `timeline-event-${layer.startPoint.id}`,
                    );
                    navigateAndIdentifyTimelineElement(el as HTMLElement);
                }}
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
                        onJumpToPoint={() => {
                            const originalIndex = getOriginalEventIndex(index);
                            const el = document.getElementById(
                                `timeline-event-${layer.remainingEvents[originalIndex].id}`,
                            );
                            if (!el) return;
                            navigateAndIdentifyTimelineElement(el);
                        }}
                    />
                    {/* TODO: add line between control point and end point */}
                    {point.type === SplinePointType.CubicBezier && (
                        <>
                            <SplineControlPoint
                                point={point.controlPoint}
                                onMove={(x, y) =>
                                    onControlPointMove(
                                        getOriginalEventIndex(index),
                                        { x, y },
                                    )
                                }
                            />
                            <SplineControlPoint
                                point={point.controlPoint2}
                                onMove={(x, y) =>
                                    onControlPoint2Move(
                                        getOriginalEventIndex(index),
                                        { x, y },
                                    )
                                }
                            />
                        </>
                    )}
                    {point.type === SplinePointType.QuadraticBezier && (
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

function navigateAndIdentifyTimelineElement(element: HTMLElement) {
    element.scrollIntoView({
        inline: "start",
        block: "end",
    });
    const originalBackgroundColor = element.style.backgroundColor;
    const flashColor = "black";
    element.style.backgroundColor = flashColor;
    setTimeout(() => {
        element.style.backgroundColor = originalBackgroundColor;
    }, 100);
    setTimeout(() => {
        element.style.backgroundColor = flashColor;
    }, 200);
    setTimeout(() => {
        element.style.backgroundColor = originalBackgroundColor;
    }, 300);
    setTimeout(() => {
        element.style.backgroundColor = flashColor;
    }, 400);
    setTimeout(() => {
        element.style.backgroundColor = originalBackgroundColor;
    }, 500);
}
