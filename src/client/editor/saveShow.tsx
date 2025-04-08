import { Point } from "../../common/spline";
import { Position } from "../../server/robot/position";

export type ShowFile = {
    version: number;
    robots: string[];
    pos: Position[];
    rot: number[];
    audio: {
        startMs: number;
        data: string;
    };
    timelines: RobotTimeline[];
};

export type RobotTimeline = MovementEvent[];

export type MovementEvent = {
    startMs:number,
    durationMs:number,
    target:Point;
}
