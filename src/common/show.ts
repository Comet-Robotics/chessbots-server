import {
    Number,
    String,
    Record,
    Array,
    Literal,
    Union,
    type Static,
    Null,
    Optional,
    Tuple,
} from "runtypes";
import {
    CoordsSchema,
    MidpointSchema,
    PointSchema,
    StartPointSchema,
} from "./spline";

// JSON file would use the Showfile type.

const AudioSchema = Record({
    startMs: Number,
    // maybe we use something like capnproto, msgpack, or protobuf so we could
    // include an audio file in the showfile. if we really wanted to use JSON we'd
    // probably have to base64 encode the file 💀. would work, just feels a little scuffed.
    // plus I've always wanted an excuse to use msgpack or capnproto lol
    data: String,
    tempoBpm: Union(Number, Null),
});

enum TimelineEventTypes {
    GoToPointEvent = "goto_point",
    WaitEvent = "wait",
    StartPointEvent = "start_point",
}

const GoToPointEventSchema = Record({
    durationMs: Number,
    target: MidpointSchema,
    type: Literal(TimelineEventTypes.GoToPointEvent),
});

const WaitEventSchema = Record({
    durationMs: Number,
    type: Literal(TimelineEventTypes.WaitEvent),
});

const StartPointEventSchema = Record({
    type: Literal(TimelineEventTypes.StartPointEvent),
    target: StartPointSchema,
});

const TimelineEventSchema = Union(GoToPointEventSchema, WaitEventSchema);
const TimelineLayerSchema = Tuple(
    StartPointEventSchema,
    Array(TimelineEventSchema),
);

const ShowfileSchema = Record({
    $chessbots_show_schema_version: Literal(1),
    timeline: Array(TimelineLayerSchema),
    audio: Optional(AudioSchema),
    name: String,
});

export type Audio = Static<typeof AudioSchema>;
export type MovementEvent = Static<typeof GoToPointEventSchema>;
export type TimelineLayer = Static<typeof TimelineLayerSchema>;
export type Showfile = Static<typeof ShowfileSchema>;
