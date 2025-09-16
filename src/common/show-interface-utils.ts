import { Colors } from "@blueprintjs/colors";
import { TimelineEventTypes } from "./show";

export const EVENT_TYPE_TO_COLOR: Record<
    (typeof TimelineEventTypes)[keyof typeof TimelineEventTypes],
    (typeof Colors)[keyof typeof Colors]
> = {
    [TimelineEventTypes.GoToPointEvent]: Colors.BLUE2,
    [TimelineEventTypes.WaitEvent]: Colors.GRAY2,
    [TimelineEventTypes.StartPointEvent]: Colors.GREEN2,
    [TimelineEventTypes.TurnEvent]: Colors.ORANGE2,
};
/*
 * The timeline duration update mode determines how the duration of timeline events
 * is updated when the user edits a timeline event's duration.
 *
 * Being in ripple edit mode means that editing the duration of an event has a
 * ripple effect on ALL the other events in the same layer, shifting
 * all the subsequent event start times by the same amount (so only
 * one event's duration is actually changing).
 *
 * Being in rolling edit mode mean that editing the duration of an event also affects the
 * duration of the event that immediately follows it in the same layer, such
 * that adjusting the duration of this event doesn't shift the start timestamp
 * of the subsequent events in the same layer.
 */

export const TimelineDurationUpdateMode = {
    Rolling: "rolling",
    Ripple: "ripple",
} as const;
/*
 * The grid cursor mode determines the behavior of the cursor when on the grid.
 *
 * Being in cursor mode means that the cursor is a normal cursor, and the user
 * can click and drag points that already exist on the grid. The user is not able
 * to add new points to the grid.
 *
 * Being in pen mode means that the user is able to add new points to the grid
 * by clicking on the locations where they want to add points. The user is still
 * able to drag existing points on the grid as in cursor mode.
 */

export const GridCursorMode = {
    Cursor: "cursor",
    Pen: "pen",
} as const;

export const RULER_TICK_INTERVAL_MS = 100;
// TODO: make ruler tick size configurable so we can zoom. relatively low priority. would be nice if gestures could be supported too
export const RULER_TICK_GAP_PX = 12;

export const RULER_EXTRA_TICK_COUNT = Math.round(
    window.innerWidth / 4 / RULER_TICK_GAP_PX,
);

export function millisToPixels(millis: number): number {
    return (millis / RULER_TICK_INTERVAL_MS) * RULER_TICK_GAP_PX;
}

export function pixelsToMillis(pixels: number): number {
    return (pixels / RULER_TICK_GAP_PX) * RULER_TICK_INTERVAL_MS;
}
