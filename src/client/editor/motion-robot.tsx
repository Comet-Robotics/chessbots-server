import { CSSProperties, forwardRef } from "react";
import { motion } from "framer-motion";
import { Tooltip } from "@blueprintjs/core";
import { robotSize } from "../debug/simulator"; // Reuse size
import { robotColor, innerRobotColor } from "../check-dark-mode";
import { Coords } from "../../common/spline";

// Simple representation for display, doesn't need full simulation data
interface MotionRobotProps {
    robotId: string;
    position?: Coords; // Optional for initial render
    style?: CSSProperties;
    onTopOfRobotsCount?: number; // Simplified collision indication
}

/**
 * A Framer Motion animated robot component for the editor grid.
 * Uses x, y, rotate for positioning and animation.
 */
export const MotionRobot = forwardRef<HTMLDivElement, MotionRobotProps>(
    function MotionRobot(
        { robotId, position, style, onTopOfRobotsCount = 0 },
        ref,
    ) {
        // Convert position (if provided) to initial styles, but expect
        // x, y, rotate to be controlled by useAnimate in the parent.
        const initialStyle =
            position ?
                {
                    // Framer motion uses different origin - center based? Check docs.
                    // Let's assume x/y map directly for now and adjust if needed.
                    // The original used left/bottom. Motion x/y work from top/left.
                    x: `${position.x}px`,
                    y: `${position.y}px`,
                    // We apply rotation via the rotate transform property.
                }
            :   {};

        return (
            <motion.div
                ref={ref}
                className=""
                style={{
                    position: "absolute",
                    // Set width/height for proper layout before transforms
                    width: robotSize,
                    height: robotSize,
                    // Apply initial position if given
                    ...initialStyle,
                    // Merge other styles
                    ...style,
                    // Ensure transform origin is center for rotation
                    transformOrigin: "center center",
                    // Prevent pointer events so grid clicks go through
                    pointerEvents: "none",
                }}
                // Tooltip might be tricky with transforms, test this
                // initial={{ opacity: 0 }} // Example initial animation state
                // animate={{ opacity: 1 }} // Example animate state
            >
                <Tooltip content={`${robotId}`}>
                    <div
                        className={robotColor(onTopOfRobotsCount)} // Use simplified collision color
                        style={{
                            // Rotation is handled by motion.div's rotate style property
                            // transform: `rotate(-${clampHeading(pos.headingRadians)}rad)`, <-- No longer here
                            borderRadius: "50%",
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            width: robotSize, // Fit parent motion.div
                            height: robotSize, // Fit parent motion.div
                            padding: "2px",
                            boxShadow: "0 0 3px black",
                        }}
                    >
                        <div
                            className={innerRobotColor()}
                            style={{
                                width: robotSize / 4,
                                height: robotSize / 4,
                                borderRadius: "50%",
                            }}
                        />
                    </div>
                </Tooltip>
            </motion.div>
        );
    },
);
