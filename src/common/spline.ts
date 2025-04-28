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
    controlPoint2: CoordsSchema,
    endPoint: CoordsSchema,
});
export type CubicBezier = Static<typeof CubicBezierSchema>;

export const QuadraticBezierSchema = Record({
    type: Literal(SplinePointType.QuadraticBezier),
    endPoint: CoordsSchema,
    controlPoint: CoordsSchema,
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
            return `C${point.controlPoint.x},${point.controlPoint.y} ${point.controlPoint2.x},${point.controlPoint2.y} ${point.endPoint.x},${point.endPoint.y}`;
        case SplinePointType.QuadraticBezier:
            return `Q${point.controlPoint.x},${point.controlPoint.y} ${point.endPoint.x},${point.endPoint.y}`;
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

export function evaluateQuadraticBezier(
    p0: Coords,
    p1: Coords,
    p2: Coords,
    t: number,
): Coords {
    const mt = 1 - t;
    const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
    const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
    return { x, y };
}

export function evaluateCubicBezier(
    p0: Coords,
    p1: Coords,
    p2: Coords,
    p3: Coords,
    t: number,
): Coords {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const t2 = t * t;
    const x =
        mt2 * mt * p0.x +
        3 * mt2 * t * p1.x +
        3 * mt * t2 * p2.x +
        t2 * t * p3.x;
    const y =
        mt2 * mt * p0.y +
        3 * mt2 * t * p1.y +
        3 * mt * t2 * p2.y +
        t2 * t * p3.y;
    return { x, y };
}

export function derivativeQuadraticBezier(
    p0: Coords,
    p1: Coords,
    p2: Coords,
    t: number,
): Coords {
    // Derivative: 2(1-t)(p1-p0) + 2t(p2-p1)
    const x = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
    const y = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
    return { x, y };
}

export function derivativeCubicBezier(
    p0: Coords,
    p1: Coords,
    p2: Coords,
    p3: Coords,
    t: number,
): Coords {
    // Derivative: 3(1-t)^2(p1-p0) + 6(1-t)t(p2-p1) + 3t^2(p3-p2)
    const mt = 1 - t;
    const x =
        3 * mt * mt * (p1.x - p0.x) +
        6 * mt * t * (p2.x - p1.x) +
        3 * t * t * (p3.x - p2.x);
    const y =
        3 * mt * mt * (p1.y - p0.y) +
        6 * mt * t * (p2.y - p1.y) +
        3 * t * t * (p3.y - p2.y);
    return { x, y };
}

/** Reflect point p over pivot */
export function reflectPoint(p: Coords, pivot: Coords): Coords {
    return {
        x: pivot.x + (pivot.x - p.x),
        y: pivot.y + (pivot.y - p.y),
    };
}
