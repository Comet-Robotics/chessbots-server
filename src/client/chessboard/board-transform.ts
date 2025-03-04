export interface Transform {
    height: number;
    width: number;
    top: number;
    left: number;
}

/**
 * Computes a transform which can be used to center the chessboard on the screen.
 */
export function computeChessboardTransform(
    canvasHeight: number,
    canvasWidth: number,
    scale: number,
): Transform {
    // Alternative: subtract off at least 8 to prevent scrollbar
    const width = Math.min(canvasHeight, canvasWidth) * scale;
    const height = width;

    // shifts the x and y
    const xShift = (canvasWidth - width) / 2;
    const yShift = (canvasHeight - height) / 2;

    // return the shift
    return { left: xShift, top: yShift, height, width };
}
