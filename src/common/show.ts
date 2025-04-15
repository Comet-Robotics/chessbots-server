import {
    Number,
    String,
    Record as RuntypesRecord,
    Array,
    Literal,
    Union,
    type Static,
    Optional,
    Tuple,
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

const TimelineEventSchema = Union(GoToPointEventSchema, WaitEventSchema);
export type NonStartPointEvent = Static<typeof TimelineEventSchema>;
// TODO: refactor this to be an object consisting of 2 keys:
// startPoint and remainingEvents so that it is more self-documenting
const TimelineLayerSchema = Tuple(
    StartPointEventSchema,
    Array(TimelineEventSchema),
);
export type TimelineLayer = Static<typeof TimelineLayerSchema>;
export type TimelineEvents = NonStartPointEvent | StartPointEvent;

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
    $chessbots_show_schema_version: Literal(2),
    // The timeline is an array of timeline 'layers' - a layer consists of an array that includes all the events for one robot.
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
    const [startPoint, events] = layer;
    return {
        start: startPoint.target,
        points: events
            .filter((event) => event.type === TimelineEventTypes.GoToPointEvent)
            .map(
                (event) =>
                    (event as Static<typeof GoToPointEventSchema>).target,
            ),
    };
}

/**
 * Creates a new empty showfile.
 * @returns The new empty showfile.
 */
export function createNewShowfile(): Showfile {
    return {
        $chessbots_show_schema_version: 2,
        timeline: [
            [
                {
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
                [
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
            ],
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
