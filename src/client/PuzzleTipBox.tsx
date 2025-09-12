import { Callout } from "@blueprintjs/core";
// import { puzzles } from "../server/api/puzzles";
import { get } from "./api";

let puzzleTooltip = null 

get("/game-state").then((puzzles) => {
  puzzleTooltip = puzzles["Puzzle 1"].tooltip;
});

export function PuzzleTipBox() {
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        top: 16,
        zIndex: 1000,
        maxWidth: 360,
      }}
    >
      <Callout title="Puzzle Tip" icon="lightbulb" intent="primary">
        {puzzleTooltip}
      </Callout>
    </div>
  );
}
