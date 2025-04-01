import {
    Number as NumberType,
    Record,
    Union,
    Array,
    Literal,
    Static,
} from "runtypes";

export enum SplinePointType {
    StartPoint = "start",
    CubicBezier = "cubic",
    QuadraticBezier = "quadratic",
}

export const CoordsSchema = Record({
    x: NumberType,
    y: NumberType,
});
export type Coords = Static<typeof CoordsSchema>;

export const StartPointSchema = Record({
    type: Literal(SplinePointType.StartPoint),
    point: CoordsSchema,
});
export type StartPointSchema = Static<typeof StartPointSchema>;

export const CubicBezierSchema = Record({
    type: Literal(SplinePointType.CubicBezier),
    controlPoint: CoordsSchema,
    endPoint: CoordsSchema,
});
export type CubicBezier = Static<typeof CubicBezierSchema>;

export const QuadraticBezierSchema = Record({
    type: Literal(SplinePointType.QuadraticBezier),
    endPoint: CoordsSchema,
});
export type QuadraticBezier = Static<typeof QuadraticBezierSchema>;

const Midpoint = Union(CubicBezierSchema, QuadraticBezierSchema);
export type Midpoint = Static<typeof Midpoint>;

export const Spline = Record({
    start: StartPointSchema,
    points: Array(Midpoint),
});
export type Spline = Static<typeof Spline>;

export const PointSchema = Union(
    StartPointSchema,
    CubicBezierSchema,
    QuadraticBezierSchema,
);
export type Point = Static<typeof PointSchema>;

function pointToSvgPathCommand(point: Point): string {
    switch (point.type) {
        case SplinePointType.StartPoint:
            return `M${point.point.x},${point.point.y}`;
        case SplinePointType.CubicBezier:
            return `S${point.controlPoint.x},${point.controlPoint.y} ${point.endPoint.x},${point.endPoint.y}`;
        case SplinePointType.QuadraticBezier:
            return `T${point.endPoint.x},${point.endPoint.y}`;
    }
}

export function splineToSvgDrawAttribute(spline: Spline): string {
    let path = pointToSvgPathCommand(spline.start);
    for (const point of spline.points) {
        path += ` ${pointToSvgPathCommand(point)}`;
    }
    return path;
}
