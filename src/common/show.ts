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

const AudioSchema = RuntypesRecord({
    data: InstanceOf<Uint8Array>(Uint8Array),
    mimeType: String,
});
export type Audio = Static<typeof AudioSchema>;

export const TimelineEventTypes = {
    GoToPointEvent: "goto_point",
    WaitEvent: "wait",
    StartPointEvent: "start_point",
} as const;

export const GoToPointEventSchema = RuntypesRecord({
    durationMs: Number,
    target: MidpointSchema,
    type: Literal(TimelineEventTypes.GoToPointEvent),
});
export type GoToPointEvent = Static<typeof GoToPointEventSchema>;

const WaitEventSchema = RuntypesRecord({
    durationMs: Number,
    type: Literal(TimelineEventTypes.WaitEvent),
});
export type WaitEvent = Static<typeof WaitEventSchema>;

const StartPointEventSchema = RuntypesRecord({
    type: Literal(TimelineEventTypes.StartPointEvent),
    target: StartPointSchema,
    durationMs: Number,
});
export type StartPointEvent = Static<typeof StartPointEventSchema>;

const TimelineEventSchema = Union(GoToPointEventSchema, WaitEventSchema);
const TimelineLayerSchema = Tuple(
    StartPointEventSchema,
    Array(TimelineEventSchema),
);
export type TimelineLayer = Static<typeof TimelineLayerSchema>;

export type TimelineEvents =
    | Static<typeof TimelineEventSchema>
    | StartPointEvent;

export const ShowfileSchema = RuntypesRecord({
    $chessbots_show_schema_version: Literal(1),
    timeline: Array(TimelineLayerSchema),
    audio: Optional(AudioSchema),
    name: String,
});
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

export const EVENT_TYPE_TO_COLOR: Record<
    (typeof TimelineEventTypes)[keyof typeof TimelineEventTypes],
    (typeof Colors)[keyof typeof Colors]
> = {
    [TimelineEventTypes.GoToPointEvent]: Colors.BLUE2,
    [TimelineEventTypes.WaitEvent]: Colors.GRAY2,
    [TimelineEventTypes.StartPointEvent]: Colors.GREEN2,
};
