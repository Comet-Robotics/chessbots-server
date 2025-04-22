import { RobotGrid } from "../debug/simulator";
import { get, useEffectQuery } from "../api";
import { Spline, splineToSvgDrawAttribute } from "../../common/spline";
import { ShowFile } from "./saveShow";
import { buttonColor } from "../check-dark-mode";
import { Button } from "@blueprintjs/core";
import { useState } from "react";

export function Playback() {
    let showFile: ShowFile;
    const { isPending, data, isError } = useEffectQuery(
        "get-show",
        async () => {
            return get("/get-show").then((show) => {
                showFile = show.show;
                return show.show;
            });
        },
        false,
    );
    showFile = data;
    isPending;
    isError;
    let maxTime = 0;
    const svgs: JSX.Element[] = [];
    if (showFile) {
        for (let x = 0; x < showFile.pos.length; x++) {
            const times: number[] = [];
            let totalTime = 0;
            let keyTimes: string = "0;";
            const lengths: number[] = [];
            let totalLength = 0;
            let keyPoints: string = "0;";
            let com2: Spline | undefined;
            for (let y = 0; y < showFile.timelines[x].length; y++) {
                const comm = showFile.timelines[x][y].target as Spline;
                if (totalTime < showFile.timelines[x][y].startMs) {
                    times.push(showFile.timelines[x][y].startMs - totalTime);
                    totalTime += showFile.timelines[x][y].startMs - totalTime;
                    lengths.push(lengths[y - 1]);
                }
                totalTime += showFile.timelines[x][y].durationMs;
                times.push(showFile.timelines[x][y].durationMs);
                if (comm !== undefined) {
                    if (com2 === undefined) {
                        com2 = { ...comm };
                    } else {
                        com2.points = [...com2.points, ...comm.points];
                    }
                    let len: number | undefined = 0;
                    //<path d={splineToSvgDrawAttribute(comm)} stroke="purple" ref={(ref) => {len = ref?.getTotalLength(); console.log("inner "+ ref?.getTotalLength())}}/>
                    const path = document.createElementNS(
                        "http://www.w3.org/2000/svg",
                        "path",
                    );
                    path.setAttribute("d", splineToSvgDrawAttribute(comm));
                    len = path.getTotalLength();
                    totalLength += len;
                    lengths.push(totalLength);
                }
            }
            let currentFrac = 0.0;
            for (let y = 0; y < times.length; y++) {
                const distFrac = lengths[y] / totalLength;
                const timeFrac = times[y] / totalTime;

                keyTimes += currentFrac + timeFrac + ";";
                currentFrac += timeFrac;

                keyPoints += distFrac + ";";
            }
            totalTime = totalTime / 100;
            if (com2) {
                svgs.push(
                    <svg
                        className="svgAnimations"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                        }}
                    >
                        <circle r="3" fill="white" cx="5">
                            <animateMotion
                                dur={totalTime}
                                repeatCount="indefinite"
                                rotate="auto"
                                keyPoints={keyPoints}
                                keyTimes={keyTimes}
                                calcMode="linear"
                            >
                                <mpath href={"#motionpath" + x} />
                            </animateMotion>
                        </circle>

                        <path
                            id={"motionpath" + x}
                            d={splineToSvgDrawAttribute(com2)}
                            stroke="purple"
                            strokeWidth={3}
                            fill="none"
                        />

                        <circle
                            r="12"
                            fill="transparent"
                            stroke="white"
                            strokeWidth="3"
                        >
                            <animateMotion
                                dur={totalTime}
                                repeatCount="indefinite"
                                rotate="auto"
                                keyPoints={keyPoints}
                                keyTimes={keyTimes}
                                calcMode="linear"
                            >
                                <mpath href={"#motionpath" + x} />
                            </animateMotion>
                        </circle>
                    </svg>,
                );
            }
            if (totalTime > maxTime) {
                maxTime = totalTime;
            }
        }
    }
    //const timeline

    const pause = (
        <Button
            className={buttonColor()}
            text="Pause"
            icon="arrow-right"
            intent="primary"
            onClick={async () => {
                svgPause(true);
            }}
        />
    );
    const play = (
        <Button
            className={buttonColor()}
            text="Play"
            icon="arrow-right"
            intent="primary"
            onClick={async () => {
                svgPause(false);
            }}
        />
    );
    const [dragging, setDragging] = useState(false);
    const [time, setTime] = useState(0);
    const line = (
        <svg width={"720px"}>
            <g
                onMouseDown={(e) => {
                    // Record our starting point.
                    e;
                    setDragging(true);
                    svgPause(true);
                }}
                onMouseMove={(e) => {
                    if (dragging) {
                        // Set state for the change in coordinates.
                        setTime((e.clientX / 720) * maxTime);
                        svgSetTime(time);
                    }
                }}
                onMouseUp={() => {
                    setDragging(false);
                }}
            >
                <svg width={"720px"} height={"100px"}>
                    \
                    <path
                        id={"timelinePath"}
                        d={"M 0 50 H 720"}
                        strokeWidth={100}
                        stroke={"Grey"}
                    />
                    <line
                        x1="0"
                        y1="50"
                        x2="720"
                        y2="50"
                        strokeWidth={3}
                        stroke="purple"
                        width={"720px"}
                    />
                    <circle
                        r="12"
                        fill="transparent"
                        stroke="white"
                        strokeWidth="3"
                    >
                        <animateMotion
                            dur={maxTime}
                            repeatCount="indefinite"
                            rotate="auto"
                            calcMode="linear"
                        >
                            <mpath href={"#timelinePath"} />
                        </animateMotion>
                    </circle>
                    <circle r="3" fill="white" cx="5">
                        <animateMotion
                            dur={maxTime}
                            repeatCount="indefinite"
                            rotate="auto"
                            calcMode="linear"
                        >
                            <mpath href={"#timelinePath"} />
                        </animateMotion>
                    </circle>
                </svg>
            </g>
        </svg>
    );

    return (
        <div>
            <RobotGrid robotState={{}} />
            {svgs}
            {pause}
            {play}
            <br />
            {line}
        </div>
    );
}

function svgPause(pause: boolean) {
    const svgList = document.getElementsByTagNameNS(
        "http://www.w3.org/2000/svg",
        "*",
    );
    for (let x = 0; x < svgList.length; x++) {
        if (pause) {
            svgList[x].ownerSVGElement?.pauseAnimations();
        } else {
            svgList[x].ownerSVGElement?.unpauseAnimations();
        }
    }
}

function svgSetTime(seconds: number) {
    const svgList = document.getElementsByTagNameNS(
        "http://www.w3.org/2000/svg",
        "*",
    );
    for (let x = 0; x < svgList.length; x++) {
        svgList[x].ownerSVGElement?.setCurrentTime(seconds);
    }
}
