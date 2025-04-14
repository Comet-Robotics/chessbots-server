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

// JSON file would use the Showfile type.

const AudioSchema = RuntypesRecord({
    data: InstanceOf<Uint8Array<ArrayBufferLike>>(Uint8Array),
    mimeType: String,
});

export const TimelineEventTypes = {
    GoToPointEvent: "goto_point",
    WaitEvent: "wait",
    StartPointEvent: "start_point",
} as const;

const GoToPointEventSchema = RuntypesRecord({
    durationMs: Number,
    target: MidpointSchema,
    type: Literal(TimelineEventTypes.GoToPointEvent),
});

const WaitEventSchema = RuntypesRecord({
    durationMs: Number,
    type: Literal(TimelineEventTypes.WaitEvent),
});

const StartPointEventSchema = RuntypesRecord({
    type: Literal(TimelineEventTypes.StartPointEvent),
    target: StartPointSchema,
    durationMs: Number,
});

const TimelineEventSchema = Union(GoToPointEventSchema, WaitEventSchema);
const TimelineLayerSchema = Tuple(
    StartPointEventSchema,
    Array(TimelineEventSchema),
);

export type TimelineEvents =
    | Static<typeof TimelineEventSchema>
    | Static<typeof StartPointEventSchema>;

export const ShowfileSchema = RuntypesRecord({
    $chessbots_show_schema_version: Literal(1),
    timeline: Array(TimelineLayerSchema),
    audio: Optional(AudioSchema),
    name: String,
});

export type Audio = Static<typeof AudioSchema>;
export type TimelineLayer = Static<typeof TimelineLayerSchema>;
export type Showfile = Static<typeof ShowfileSchema>;

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

// TODO: empty showfile
export function createNewShowfile(): Showfile {
    return {
        $chessbots_show_schema_version: 1,
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
                },
                [
                    {
                        type: TimelineEventTypes.GoToPointEvent,
                        durationMs: 1000,
                        target: {
                            type: SplinePointType.QuadraticBezier,
                            endPoint: { x: 100, y: 100 },
                        },
                    },
                    {
                        type: TimelineEventTypes.WaitEvent,
                        durationMs: 5000,
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
                    },
                    {
                        type: TimelineEventTypes.GoToPointEvent,
                        durationMs: 1000,
                        target: {
                            type: SplinePointType.QuadraticBezier,
                            endPoint: { x: 70, y: 70 },
                        },
                    },
                ],
            ],
        ],
        name: `Show ${new Date().toDateString()} ${new Date().toLocaleTimeString()}`,
    };
}

import { Colors } from "@blueprintjs/core";

export const EVENT_TYPE_TO_COLOR: Record<
    (typeof TimelineEventTypes)[keyof typeof TimelineEventTypes],
    (typeof Colors)[keyof typeof Colors]
> = {
    [TimelineEventTypes.GoToPointEvent]: Colors.BLUE2,
    [TimelineEventTypes.WaitEvent]: Colors.GRAY2,
    [TimelineEventTypes.StartPointEvent]: Colors.GREEN2,
};
