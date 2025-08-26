import type {
    Static} from "runtypes";
import {
    Number as NumberType,
    Record,
    Union,
    Array,
    Literal
} from "runtypes";

export enum SplinePointType {
    StartPoint = "start",
    QuadraticBezier = "quadratic",
    CubicBezier = "cubic",
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

export const MidpointSchema = Union(CubicBezierSchema, QuadraticBezierSchema);
export type Midpoint = Static<typeof MidpointSchema>;

export const SplineSchema = Record({
    start: StartPointSchema,
    points: Array(MidpointSchema),
});
export type Spline = Static<typeof SplineSchema>;

export const PointSchema = Union(
    StartPointSchema,
    CubicBezierSchema,
    QuadraticBezierSchema,
);
export type Point = Static<typeof PointSchema>;

/**
 * Converts a point to an SVG path command. This is used in combination with the {@link splineToSvgDrawAttribute} function to convert a spline to a string that can be used as the `d` attribute of an SVG path.
 *
 * @remarks
 * For more context on the implementation/syntax, check out this MDN article about SVG paths: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Paths
 * @param point - the point to convert.
 * @returns the SVG path command for the point.
 */
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

/**
 * Converts a spline to a string that can be used as the `d` attribute of an SVG path, for a visual display of the spline.
 * @example
 * ```jsx
 * <svg>
 *   <path d={splineToSvgDrawAttribute(spline)} stroke="purple" fill="none" />
 * </svg>
 * ```
 * @param spline - the spline to convert.
 * @returns the SVG path for the spline.
 */
export function splineToSvgDrawAttribute(spline: Spline): string {
    let path = pointToSvgPathCommand(spline.start);
    for (const point of spline.points) {
        path += ` ${pointToSvgPathCommand(point)}`;
    }
    return path;
}
