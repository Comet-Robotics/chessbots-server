// @ts-expect-error: chessbots client is a CommonJS module, but this library is a ES Module, so we need to tell TypeScript that it's okay
import { decode as cborDecode } from "cbor-x";

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
import { Uint32 } from "../server/utils/tcp-packet";

export const TimelineEventTypes = {
    GoToPointEvent: "goto_point",
    WaitEvent: "wait",
    StartPointEvent: "start_point",
    TurnEvent: "turn",
} as const;

export const GoToPointEventSchema = RuntypesRecord({
    durationMs: Uint32,
    target: MidpointSchema,
    type: Literal(TimelineEventTypes.GoToPointEvent),
    id: String,
});
export type GoToPointEvent = Static<typeof GoToPointEventSchema>;

const WaitEventSchema = RuntypesRecord({
    durationMs: Uint32,
    type: Literal(TimelineEventTypes.WaitEvent),
    id: String,
});
export type WaitEvent = Static<typeof WaitEventSchema>;

const StartPointEventSchema = RuntypesRecord({
    type: Literal(TimelineEventTypes.StartPointEvent),
    target: StartPointSchema,
    durationMs: Uint32,
    id: String,
});
export type StartPointEvent = Static<typeof StartPointEventSchema>;

const TurnEventSchema = RuntypesRecord({
    type: Literal(TimelineEventTypes.TurnEvent),
    radians: Number,
    durationMs: Uint32,
    id: String,
});
export type TurnEvent = Static<typeof TurnEventSchema>;

export const NonStartPointEventSchema = Union(
    GoToPointEventSchema,
    WaitEventSchema,
    TurnEventSchema,
);
export type NonStartPointEvent = Static<typeof NonStartPointEventSchema>;

const TimelineLayerSchema = RuntypesRecord({
    startPoint: StartPointEventSchema,
    remainingEvents: Array(NonStartPointEventSchema),
});
export type TimelineLayerType = Static<typeof TimelineLayerSchema>;
export type TimelineEvents =
    | GoToPointEvent
    | WaitEvent
    | StartPointEvent
    | TurnEvent;

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
    $chessbots_show_schema_version: Literal(4),
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
export function timelineLayerToSpline(layer: TimelineLayerType): Spline {
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
        $chessbots_show_schema_version: 4,
        timeline: [
            {
                startPoint: {
                    type: TimelineEventTypes.StartPointEvent,
                    target: {
                        type: SplinePointType.StartPoint,
                        point: {
                            x: 2,
                            y: 2,
                        },
                    },
                    durationMs: 3000,
                    id: crypto.randomUUID(),
                },
                remainingEvents: [
                    {
                        type: TimelineEventTypes.GoToPointEvent,
                        durationMs: 1000,
                        target: {
                            type: SplinePointType.CubicBezier,
                            endPoint: { x: 3, y: 3 },
                            controlPoint: { x: 2.5, y: 1 },
                            controlPoint2: { x: 2.5, y: 3},
                        },
                        id: crypto.randomUUID(),
                    },
                ],
            },
        ],
        name: `Show ${new Date().toDateString()} ${new Date().toLocaleTimeString()}`,
    };
}

export const CHESSBOTS_SHOWFILE_MIME_TYPE = "application/chessbots-showfile";
export const CHESSBOTS_SHOWFILE_EXTENSION = ".cbor";

export const loadShowfileFromBinary = (binary: Buffer | Uint8Array) => {
    let decodedCborData: unknown | null = null;

    try {
        decodedCborData = cborDecode(binary);
    } catch (e) {
        return null;
    }

    const result = ShowfileSchema.validate(decodedCborData);

    if (result.success) {
        return result.value;
    }

    return null;
};
