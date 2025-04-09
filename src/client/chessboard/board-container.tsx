import { ResizeEntry, ResizeSensor } from "@blueprintjs/core";
import { PropsWithChildren, useState } from "react";
import { Transform, computeChessboardTransform } from "./board-transform";
import { Side } from "../../common/game-types";
import { bgColor } from "../check-dark-mode";

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
