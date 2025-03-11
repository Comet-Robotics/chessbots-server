import { useMemo, useState } from "react";
import { RobotGrid, type RobotState } from "../debug/simulator";
import { getProject, types } from "@theatre/core";

const robottype = {bezierpoint: types.compound({
  x: types.number(0, {range: [0, 60 * 12]}),
  y: types.number(0, {range: [0, 60 * 12]}),
  headingRadians: types.number(0, {range: [-Math.PI, Math.PI]}),
})}

const demoSheet = getProject('Chess Bots').sheet('Routine')
export function Editor() {
    const [robotCount, setRobotCount] = useState(0);
    
    const robotState = () => {
        const output: RobotState = {};
        for (let robotIndex = 0; robotIndex < robotCount; robotIndex++) {
            const robotId = `robot-${robotIndex}`;
            const obj = demoSheet.__experimental_getExistingObject<typeof robottype>(robotId);
            if (!obj) {
                console.warn(`Could not find robot ${robotId}`);
                continue;
            }
            
            const bp = obj.value.bezierpoint;
            output[robotId] = {
                position: {
                    x: bp.x,
                    y: bp.y,
                },
                headingRadians: bp.headingRadians,
            }
            
        }
        return output;
    }

    const [rs, setRs] = useState<RobotState>(robotState());
    
    return (
        <div>
        <RobotGrid robotState={rs} />
        <button onClick={()=>{
            demoSheet.object('robot-' + robotCount, robottype)
            setRobotCount(rc => rc + 1);
        }}>Add Robot</button>
    </div>
    );
}