import {
    Number,
    String,
    Record as RuntypesRecord,
    Array,
    Literal,
    Union,
    type Static,
    Optional,
    InstanceOf,
} from "runtypes";
import {
    MidpointSchema,
    type Spline,
    SplinePointType,
    StartPointSchema,
} from "./spline";
import { Colors } from "@blueprintjs/core";

export const TimelineEventTypes = {
    GoToPointEvent: "goto_point",
    WaitEvent: "wait",
    StartPointEvent: "start_point",
} as const;

export const GoToPointEventSchema = RuntypesRecord({
    durationMs: Number,
    target: MidpointSchema,
    type: Literal(TimelineEventTypes.GoToPointEvent),
    id: String,
});
export type GoToPointEvent = Static<typeof GoToPointEventSchema>;

const WaitEventSchema = RuntypesRecord({
    durationMs: Number,
    type: Literal(TimelineEventTypes.WaitEvent),
    id: String,
});
export type WaitEvent = Static<typeof WaitEventSchema>;

const StartPointEventSchema = RuntypesRecord({
    type: Literal(TimelineEventTypes.StartPointEvent),
    target: StartPointSchema,
    durationMs: Number,
    id: String,
});
export type StartPointEvent = Static<typeof StartPointEventSchema>;

const NonStartPointEventSchema = Union(GoToPointEventSchema, WaitEventSchema);
export type NonStartPointEvent = Static<typeof NonStartPointEventSchema>;

const TimelineLayerSchema = RuntypesRecord({
    startPoint: StartPointEventSchema,
    remainingEvents: Array(NonStartPointEventSchema),
});
export type TimelineLayer = Static<typeof TimelineLayerSchema>;
export type TimelineEvents = GoToPointEvent | WaitEvent | StartPointEvent;

/**
 * The showfile schema.
 *
 * @remarks
 * At runtime this is a regular JS object. When saved as a file, it is stored as binary in the Concise Binary Object Representation (CBOR) format.
 * The main reason for using a binary format is to allow the audio file to be included inline with the file. Alternatives include base64 encoding the audio file so
 * it could be stored as a string in a JSON file, or storing the audio file separately, perhaps using a ZIP file.
 */
export const ShowfileSchema = RuntypesRecord({
    // Be sure to increment the schema version number when making breaking changes to the showfile schema.
    $chessbots_show_schema_version: Literal(3),
    // The timeline is an array of timeline 'layers'. A layer consists of an array that includes all the events for one robot.
    timeline: Array(TimelineLayerSchema),
    audio: Optional(
        RuntypesRecord({
            data: InstanceOf<Uint8Array>(Uint8Array),
            mimeType: String,
        }),
    ),
    name: String,
});
export type Showfile = Static<typeof ShowfileSchema>;

/**
 * Converts a timeline layer to a spline.
 * @param layer - the timeline layer to convert.
 * @returns - the spline representation of the timeline layer.
 */
export function timelineLayerToSpline(layer: TimelineLayer): Spline {
    const { startPoint, remainingEvents } = layer;
    return {
        start: startPoint.target,
        points: remainingEvents
            .filter((event) => event.type === TimelineEventTypes.GoToPointEvent)
            .map(
                (event) =>
                    (event as Static<typeof GoToPointEventSchema>).target,
            ),
    };
}

/**
 * Creates a new example showfile.
 * @returns The new example showfile.
 */
export function createNewShowfile(): Showfile {
    return {
        $chessbots_show_schema_version: 3,
        timeline: [
            {
                startPoint: {
                    type: TimelineEventTypes.StartPointEvent,
                    target: {
                        type: SplinePointType.StartPoint,
                        point: {
                            x: 0,
                            y: 70,
                        },
                    },
                    durationMs: 7500,
                    id: "4f21401d-07cf-434f-a73c-6482ab82f210",
                },
                remainingEvents: [
                    {
                        type: TimelineEventTypes.GoToPointEvent,
                        durationMs: 1000,
                        target: {
                            type: SplinePointType.QuadraticBezier,
                            endPoint: { x: 100, y: 100 },
                        },
                        id: "4f21401d-07cf-434f-a73c-6482ab82f211",
                    },
                    {
                        type: TimelineEventTypes.WaitEvent,
                        durationMs: 5000,
                        id: "4f21401d-07cf-434f-a73c-6482ab82f212",
                    },
                    {
                        type: TimelineEventTypes.GoToPointEvent,
                        durationMs: 1000,
                        target: {
                            type: SplinePointType.CubicBezier,
                            endPoint: { x: 315, y: 50 },
                            controlPoint: {
                                x: 300,
                                y: 40,
                            },
                        },
                        id: "4f21401d-07cf-434f-a73c-6482ab82f213",
                    },
                    {
                        type: TimelineEventTypes.GoToPointEvent,
                        durationMs: 1000,
                        target: {
                            type: SplinePointType.QuadraticBezier,
                            endPoint: { x: 70, y: 70 },
                        },
                        id: "4f21401d-07cf-434f-a73c-6482ab82f214",
                    },
                ],
            },
        ],
        name: `Show ${new Date().toDateString()} ${new Date().toLocaleTimeString()}`,
    };
}

export const EVENT_TYPE_TO_COLOR: Record<
    (typeof TimelineEventTypes)[keyof typeof TimelineEventTypes],
    (typeof Colors)[keyof typeof Colors]
> = {
    [TimelineEventTypes.GoToPointEvent]: Colors.BLUE2,
    [TimelineEventTypes.WaitEvent]: Colors.GRAY2,
    [TimelineEventTypes.StartPointEvent]: Colors.GREEN2,
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


export const CHESSBOTS_SHOWFILE_MIME_TYPE = 'application/chessbots-showfile';
export const CHESSBOTS_SHOWFILE_EXTENSION = '.cbor';