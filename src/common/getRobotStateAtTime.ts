import { type TimelineLayerType, TimelineEventTypes } from "./show";
import { GRID_CELL_PX } from "./units";
import {
    type Coords,
    SplinePointType,
    evaluateQuadraticBezier,
    evaluateCubicBezier,
    derivativeQuadraticBezier,
    derivativeCubicBezier,
    reflectPoint,
} from "./spline";

export interface RobotState {
    position: Coords;
    headingRadians: number;
}

/**
 * Calculates the robot's position and heading at a specific timestamp within its timeline layer.
 *
 * @param layer - The timeline layer for the robot.
 * @param timestampMs - The timestamp in milliseconds.
 * @returns The robot's state (position and heading) at the given time.
 */
export function getRobotStateAtTime(
    layer: TimelineLayerType,
    timestampMs: number,
): RobotState {
    let currentTimeMs = 0;
    let previousPoint: Coords = {
        x: layer.startPoint.target.point.x * GRID_CELL_PX,
        y: layer.startPoint.target.point.y * GRID_CELL_PX,
    };
    let previousHeadingRad = 0; // Default initial heading
    let previousMidpointType: SplinePointType | null = null; // Track type of previous segment
    let previousActualCP1: Coords | null = null;
    let previousActualCP2: Coords | null = null; // Only relevant if previous was Cubic

    const allEvents = [layer.startPoint, ...layer.remainingEvents]; // Combine for easier iteration

    for (let i = 0; i < allEvents.length; i++) {
        const currentEvent = allEvents[i];
        const eventStartTimeMs = currentTimeMs;
        const eventEndTimeMs = currentTimeMs + currentEvent.durationMs;

        if (timestampMs >= eventStartTimeMs && timestampMs < eventEndTimeMs) {
            // Timestamp falls within this event
            const timeIntoEvent = timestampMs - eventStartTimeMs;
            const progress =
                currentEvent.durationMs > 0 ?
                    timeIntoEvent / currentEvent.durationMs
                :   1; // Avoid division by zero

            if (currentEvent.type === TimelineEventTypes.StartPointEvent) {
                // Robot waits at the start point during its initial duration
                return {
                    position: previousPoint,
                    headingRadians: previousHeadingRad,
                };
            }

            if (currentEvent.type === TimelineEventTypes.WaitEvent) {
                // Robot waits at the end of the previous movement
                return {
                    position: previousPoint,
                    headingRadians: previousHeadingRad,
                };
            }

            if (currentEvent.type === TimelineEventTypes.GoToPointEvent) {
                const target = currentEvent.target;
                const startPos = previousPoint;
                const endPos = {
                    x: target.endPoint.x * GRID_CELL_PX,
                    y: target.endPoint.y * GRID_CELL_PX,
                };
                let p1: Coords;
                let derivativeFunc: (t: number) => Coords;
                let evaluateFunc: (t: number) => Coords;

                if (target.type === SplinePointType.QuadraticBezier) {
                    if (
                        previousMidpointType ===
                            SplinePointType.QuadraticBezier &&
                        previousActualCP1
                    ) {
                        p1 = reflectPoint(previousActualCP1, startPos);
                    } else if (
                        previousMidpointType === SplinePointType.CubicBezier &&
                        previousActualCP2
                    ) {
                        p1 = reflectPoint(previousActualCP2, startPos);
                    } else {
                        p1 = startPos;
                    }
                    evaluateFunc = (t) =>
                        evaluateQuadraticBezier(startPos, p1, endPos, t);
                    derivativeFunc = (t) =>
                        derivativeQuadraticBezier(startPos, p1, endPos, t);
                } else {
                    // Cubic Bezier
                    const controlPoint2 = {
                        x: target.controlPoint.x * GRID_CELL_PX,
                        y: target.controlPoint.y * GRID_CELL_PX,
                    };
                    if (
                        previousMidpointType === SplinePointType.CubicBezier &&
                        previousActualCP2
                    ) {
                        p1 = reflectPoint(previousActualCP2, startPos);
                    } else {
                        p1 = startPos;
                    }
                    evaluateFunc = (t) =>
                        evaluateCubicBezier(
                            startPos,
                            p1,
                            controlPoint2,
                            endPos,
                            t,
                        );
                    derivativeFunc = (t) =>
                        derivativeCubicBezier(
                            startPos,
                            p1,
                            controlPoint2,
                            endPos,
                            t,
                        );
                }

                const currentPosition = evaluateFunc(progress);
                const derivative = derivativeFunc(progress);
                const currentHeading = Math.atan2(derivative.y, derivative.x);

                return {
                    position: currentPosition,
                    headingRadians:
                        isNaN(currentHeading) ? previousHeadingRad : (
                            currentHeading
                        ),
                };
            }

            if (currentEvent.type === TimelineEventTypes.TurnEvent) {
                const radians = currentEvent.radians;
                const currentHeading = previousHeadingRad + radians * progress;

                return {
                    position: previousPoint,
                    headingRadians: currentHeading,
                };
            }
        }

        // Update state for the next iteration
        currentTimeMs = eventEndTimeMs;
        if (currentEvent.type === TimelineEventTypes.GoToPointEvent) {
            previousPoint = {
                x: currentEvent.target.endPoint.x * GRID_CELL_PX,
                y: currentEvent.target.endPoint.y * GRID_CELL_PX,
            };
            previousMidpointType = currentEvent.target.type;

            let final_p1: Coords | null = null;
            let final_p2: Coords | null = null;
            let derivativeFunc_final: (t: number) => Coords;
            const target = currentEvent.target;

            const _startPos_deriv = previousPoint;
            const endPos = {
                x: target.endPoint.x * GRID_CELL_PX,
                y: target.endPoint.y * GRID_CELL_PX,
            };

            if (target.type === SplinePointType.QuadraticBezier) {
                if (
                    previousMidpointType === SplinePointType.QuadraticBezier &&
                    previousActualCP1
                ) {
                    final_p1 = reflectPoint(previousActualCP1, _startPos_deriv);
                } else if (
                    previousMidpointType === SplinePointType.CubicBezier &&
                    previousActualCP2
                ) {
                    final_p1 = reflectPoint(previousActualCP2, _startPos_deriv);
                } else {
                    final_p1 = _startPos_deriv;
                }
                previousActualCP1 = final_p1;
                previousActualCP2 = null;
                derivativeFunc_final = (t) =>
                    derivativeQuadraticBezier(
                        _startPos_deriv,
                        final_p1!,
                        endPos,
                        t,
                    );
            } else {
                const controlPoint2 = {
                    x: target.controlPoint.x * GRID_CELL_PX,
                    y: target.controlPoint.y * GRID_CELL_PX,
                };
                if (
                    previousMidpointType === SplinePointType.CubicBezier &&
                    previousActualCP2
                ) {
                    final_p1 = reflectPoint(previousActualCP2, _startPos_deriv);
                } else {
                    final_p1 = _startPos_deriv;
                }
                final_p2 = controlPoint2;
                previousActualCP1 = final_p1;
                previousActualCP2 = final_p2;
                derivativeFunc_final = (t) =>
                    derivativeCubicBezier(
                        _startPos_deriv,
                        final_p1!,
                        final_p2!,
                        endPos,
                        t,
                    );
            }
            const finalDerivative = derivativeFunc_final(1);
            const finalHeading = Math.atan2(
                finalDerivative.y,
                finalDerivative.x,
            );
            previousHeadingRad =
                isNaN(finalHeading) ? previousHeadingRad : finalHeading;
        } else {
            if (currentEvent.type === TimelineEventTypes.StartPointEvent) {
                previousPoint = {
                    x: currentEvent.target.point.x,
                    y: currentEvent.target.point.y,
                };
            }
            previousMidpointType = null;
            previousActualCP1 = null;
            previousActualCP2 = null;
        }
    }

    // If timestamp is beyond the last event, stay at the final position and heading
    return { position: previousPoint, headingRadians: previousHeadingRad };
}
