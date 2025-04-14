import { RobotGrid, RobotState } from "../debug/simulator";
import { SimulatedRobotLocation } from "../../common/message/simulator-message";
import { get, useEffectQuery } from "../api";
import { MovementEvent } from "./saveShow";

export function Playback() {
    let showFile;
    const { isPending, data, isError } = useEffectQuery(
        "game-state",
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

    //console.log(showFile);
    let robotsStart: RobotState = {};
    const robotCommands: MovementEvent[] = [];

    if (showFile) {
        for (let x = 0; x < showFile.pos.length; x++) {
            const pos = showFile.pos[x];
            const location: SimulatedRobotLocation = {
                position: { x: pos.x + 2.5, y: pos.y + 2.5 },
                headingRadians: showFile.rot[x],
            };
            robotsStart = {
                ...robotsStart,
                [showFile.robots[x].toString()]:
                    location as SimulatedRobotLocation,
            };

            for (const movements in showFile.timeline[x]) {
                robotCommands.push(JSON.parse(movements));
            }
        }
    }

    return (
        <div>
            <RobotGrid robotState={robotsStart} />
            
        </div>
    );
}
