import {
    type TimelineLayerType,
    TimelineEventTypes,
    type GoToPointEvent,
    type StartPointEvent,
    type NonStartPointEvent,
} from "./show";
import {
    type Coords,
    type Midpoint,
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
    let previousPoint: Coords = layer.startPoint.target.point;
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
            const progress = currentEvent.durationMs > 0 ? timeIntoEvent / currentEvent.durationMs : 1; // Avoid division by zero

            if (currentEvent.type === TimelineEventTypes.StartPointEvent) {
                // Robot waits at the start point during its initial duration
                return { position: previousPoint, headingRadians: previousHeadingRad };
            }

            if (currentEvent.type === TimelineEventTypes.WaitEvent) {
                // Robot waits at the end of the previous movement
                return { position: previousPoint, headingRadians: previousHeadingRad };
            }

            if (currentEvent.type === TimelineEventTypes.GoToPointEvent) {
                const target = currentEvent.target;
                const startPos = previousPoint;
                const endPos = target.endPoint;
                let p1: Coords;
                let p2: Coords;
                let derivativeFunc: (t: number) => Coords;
                let evaluateFunc: (t: number) => Coords;

                let currentActualCP1: Coords | null = null;
                let currentActualCP2: Coords | null = null;

                if (target.type === SplinePointType.QuadraticBezier) {
                    if (previousMidpointType === SplinePointType.QuadraticBezier && previousActualCP1) {
                        p1 = reflectPoint(previousActualCP1, startPos);
                    } else if (previousMidpointType === SplinePointType.CubicBezier && previousActualCP2) {
                        p1 = reflectPoint(previousActualCP2, startPos);
                    } else {
                        p1 = startPos;
                    }
                    currentActualCP1 = p1;
                    evaluateFunc = (t) => evaluateQuadraticBezier(startPos, p1, endPos, t);
                    derivativeFunc = (t) => derivativeQuadraticBezier(startPos, p1, endPos, t);
                }
                else { // Cubic Bezier
                    const controlPoint2 = target.controlPoint;
                    if (previousMidpointType === SplinePointType.CubicBezier && previousActualCP2) {
                        p1 = reflectPoint(previousActualCP2, startPos);
                    } else {
                        p1 = startPos;
                    }
                    currentActualCP1 = p1;
                    currentActualCP2 = controlPoint2;
                    evaluateFunc = (t) => evaluateCubicBezier(startPos, p1, controlPoint2, endPos, t);
                    derivativeFunc = (t) => derivativeCubicBezier(startPos, p1, controlPoint2, endPos, t);
                }

                const currentPosition = evaluateFunc(progress);
                const derivative = derivativeFunc(progress);
                const currentHeading = Math.atan2(derivative.y, derivative.x);

                return { position: currentPosition, headingRadians: isNaN(currentHeading) ? previousHeadingRad : currentHeading };
            }
        }

        // Update state for the next iteration
        currentTimeMs = eventEndTimeMs;
        if (currentEvent.type === TimelineEventTypes.GoToPointEvent) {
            previousPoint = currentEvent.target.endPoint;
            previousMidpointType = currentEvent.target.type;

            let final_p1: Coords | null = null;
            let final_p2: Coords | null = null;
            let derivativeFunc_final: (t: number) => Coords;
            const target = currentEvent.target;
            const startPos = (previousMidpointType !== null) ? previousPoint : layer.startPoint.target.point;

            const _startPos_deriv = previousPoint;
            const endPos = target.endPoint;

            if (target.type === SplinePointType.QuadraticBezier) {
                if (previousMidpointType === SplinePointType.QuadraticBezier && previousActualCP1) {
                    final_p1 = reflectPoint(previousActualCP1, _startPos_deriv);
                } else if (previousMidpointType === SplinePointType.CubicBezier && previousActualCP2) {
                    final_p1 = reflectPoint(previousActualCP2, _startPos_deriv);
                } else {
                    final_p1 = _startPos_deriv;
                }
                previousActualCP1 = final_p1;
                previousActualCP2 = null;
                derivativeFunc_final = (t) => derivativeQuadraticBezier(_startPos_deriv, final_p1!, endPos, t);
            } else {
                const controlPoint2 = target.controlPoint;
                if (previousMidpointType === SplinePointType.CubicBezier && previousActualCP2) {
                    final_p1 = reflectPoint(previousActualCP2, _startPos_deriv);
                } else {
                    final_p1 = _startPos_deriv;
                }
                final_p2 = controlPoint2;
                previousActualCP1 = final_p1;
                previousActualCP2 = final_p2;
                derivativeFunc_final = (t) => derivativeCubicBezier(_startPos_deriv, final_p1!, final_p2!, endPos, t);
            }
            const finalDerivative = derivativeFunc_final(1);
            const finalHeading = Math.atan2(finalDerivative.y, finalDerivative.x);
            previousHeadingRad = isNaN(finalHeading) ? previousHeadingRad : finalHeading;

        } else {
            if (currentEvent.type === TimelineEventTypes.StartPointEvent) {
                previousPoint = currentEvent.target.point;
            }
            previousMidpointType = null;
            previousActualCP1 = null;
            previousActualCP2 = null;
        }
    }

    // If timestamp is beyond the last event, stay at the final position and heading
    return { position: previousPoint, headingRadians: previousHeadingRad };
} 