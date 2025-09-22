import type { ResizeEntry } from "@blueprintjs/core";
import { ResizeSensor } from "@blueprintjs/core";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import type { Transform } from "./board-transform.js";
import { computeChessboardTransform } from "./board-transform.js";
import { Side } from "../../common/game-types.js";
import { bgColor } from "../check-dark-mode.js";

interface BoardContainerProps extends PropsWithChildren {
    side: Side;
    onWidthChange: (width: number) => void;
    rotation: number;
}

/**
 * A container to deal with chessboard resizing
 * @param props - side, width handler, rotation, and inner elements
 * @returns a resizable container with a chessboard inside
 */
export function BoardContainer(props: BoardContainerProps) {
    const [transform, setTransform] = useState<Transform | undefined>();

    /** compute hight/width on change and set the board transform */
    const handleResize = (entries: ResizeEntry[]) => {
        const { height, width } = entries[0].contentRect;
        const transform = computeChessboardTransform(height, width, 0.85);
        props.onWidthChange(transform.width);
        setTransform(transform);
    };

    // returns the resizable container
    return (
        <ResizeSensor onResize={handleResize}>
            <div id="chess-container" className={bgColor()}>
                <div
                    id="chessboard"
                    style={{
                        ...transform,
                        transform:
                            props.side === Side.SPECTATOR ?
                                "rotate(" + (props.rotation % 180) + "deg)"
                            :   "",
                    }}
                >
                    {props.children}
                </div>
            </div>
        </ResizeSensor>
    );
}
