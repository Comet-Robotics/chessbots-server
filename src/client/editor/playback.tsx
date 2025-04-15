import { RobotGrid } from "../debug/simulator";
import { get, useEffectQuery } from "../api";
import { Spline, splineToSvgDrawAttribute } from "../../common/spline";
import { ShowFile } from "./saveShow";

export function Playback() {
    let showFile:ShowFile;
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

    const svgs: JSX.Element[] = [];
    if (showFile) {
        for (let x = 0; x < showFile.pos.length; x++) {
            const times:number[] = [];
            let totalTime = 0
            let keyTimes: string = "0;";
            const lengths: number[] = [];
            let totalLength = 0;
            let keyPoints: string = "0;"
            let com2: Spline|undefined;
            for (let y = 0; y < showFile.timelines[x].length; y++) {
                const comm = showFile.timelines[x][y].target as Spline;
                if(totalTime < showFile.timelines[x][y].startMs){
                    times.push(showFile.timelines[x][y].startMs-totalTime);
                    totalTime += showFile.timelines[x][y].startMs-totalTime;
                    lengths.push(lengths[y-1]+0.00001);
                }
                totalTime += showFile.timelines[x][y].durationMs;
                times.push(showFile.timelines[x][y].durationMs);
                if (comm !== undefined) {
                    if (com2 === undefined){
                        com2 = {...comm};
                    }
                    else{
                        com2.points = [...com2.points, ...comm.points];
                    }   
                    let len:number|undefined = 0;
                    //<path d={splineToSvgDrawAttribute(comm)} stroke="purple" ref={(ref) => {len = ref?.getTotalLength(); console.log("inner "+ ref?.getTotalLength())}}/> 
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute("d",splineToSvgDrawAttribute(comm));
                    len = path.getTotalLength();
                    totalLength += len;
                    lengths.push(totalLength);
                }
            }
            let currentFrac = 0.0;
            for (let y = 0; y < times.length; y++) {
                const distFrac = lengths[y] / totalLength;
                const timeFrac = times[y] / totalTime;
                
                keyTimes += (currentFrac+timeFrac) + ";";
                currentFrac += timeFrac;

                keyPoints += (distFrac) + ";";
            }
            console.log(keyTimes);
            console.log(keyPoints);
            svgs.push(
                <svg
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
                            dur={10}
                            repeatCount="indefinite"
                            rotate="auto"
                            keyPoints={keyPoints}
                            keyTimes={keyTimes}
                            calcMode="linear">
                                <mpath href={"#motionpath"+x}/>
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
                            dur={10}
                            repeatCount="indefinite"
                            rotate="auto"
                            keyPoints={keyPoints}
                            keyTimes={keyTimes}
                            calcMode="linear">
                                <mpath href={"#motionpath"+x}/>
                        </animateMotion>

                        
                    </circle>
                </svg>,
            );
        }
    }
    return (
        <div>
            <RobotGrid robotState={[]} />
            {svgs}
        </div>
    );
}
