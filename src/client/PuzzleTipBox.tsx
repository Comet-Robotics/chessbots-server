import { Callout } from "@blueprintjs/core";
import { get, useEffectQuery } from "./api";

export function PuzzleTipBox() {
    const { isPending, data, isError } = useEffectQuery(
        "game-state",
        async () => {
            return get("/game-state");
        },
        false,
    );
    return (
        <div
            style={{
                position: "sticky",
                top: "16px",
                right: 0,
                marginRight: "2px",
                maxWidth: 400,
                overflowWrap: "break-word",
                zIndex: 1,
            }}
        >
            <Callout title="Puzzle Tip" icon="lightbulb" intent="primary">
                {!isPending && !isError && data ?
                    <div>{data.tooltip}</div>
                :   <div>No tip available</div>}
            </Callout>
        </div>
    );
}
