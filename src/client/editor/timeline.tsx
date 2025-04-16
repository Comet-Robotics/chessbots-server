import { Card, SectionCard, Button, Text } from "@blueprintjs/core";
import interact from "interactjs";
import { useDragControls, Reorder } from "motion/react";
import { forwardRef, PropsWithChildren, useEffect, useRef } from "react";
import {
    TimelineEvents,
    EVENT_TYPE_TO_COLOR,
    millisToPixels,
    RULER_TICK_GAP_PX,
    RULER_TICK_INTERVAL_MS,
    RULER_EXTRA_TICK_COUNT,
    pixelsToMillis,
} from "../../common/show";

export function ReorderableTimelineEvent({
    event,
    onDurationChange,
}: PropsWithChildren<{
    event: TimelineEvents;
    onDurationChange: (ms: number) => void;
}>) {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={event}
            dragListener={false}
            dragControls={controls}
        >
            <TimelineEvent
                event={event}
                onPointerDownOnDragHandle={(e) => controls.start(e)}
                onDurationChange={onDurationChange}
            />
        </Reorder.Item>
    );
}

export function TimelineEvent(props: {
    event: TimelineEvents;
    onPointerDownOnDragHandle?: (
        event: React.PointerEvent<HTMLDivElement>,
    ) => void;
    onDurationChange?: (deltaMs: number) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const { event, onPointerDownOnDragHandle, onDurationChange } = props;
    useEffect(() => {
        if (!onDurationChange) return;
        if (!ref.current) return;
        const el = ref.current;

        interact(el).resizable({
            edges: {
                right: true,
            },
            listeners: {
                move: function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    onDurationChange(pixelsToMillis(event.deltaRect.width));
                },
            },
        });
    }, [event.type, onDurationChange]);

    // TODO: add context menu for deleting events and adding a new event before and after this one

    return (
        <Card
            ref={ref}
            style={{
                width: millisToPixels(event.durationMs),
                backgroundColor: EVENT_TYPE_TO_COLOR[event.type],
                color: "white",
                boxSizing: "border-box",
                display: "flex",
                justifyContent: "space-between",
                touchAction: "none",
                overflow: "hidden",
            }}
            compact
        >
            <span style={{ cursor: "default", userSelect: "none" }}>
                {event.type}
            </span>
            {onPointerDownOnDragHandle && (
                <span
                    style={{
                        width: "1rem",
                        height: "1rem",
                        backgroundColor: "red",
                        cursor: "grab",
                    }}
                    onPointerDown={onPointerDownOnDragHandle}
                ></span>
            )}
        </Card>
    );
}

export const TimelineLayer = forwardRef<
    HTMLDivElement,
    PropsWithChildren<{ title: string; onDelete?: () => void }>
>(function TimelineCard({ title, children, onDelete }, ref) {
    // TODO: add borders between columns. v low priority
    // https://codepen.io/Kevin-Geary/pen/BavwqYX
    // https://www.youtube.com/watch?v=EQYft7JPKto
    return (
        <SectionCard
            ref={ref}
            style={{
                display: "grid",
                gridTemplateColumns: "subgrid",
                gridColumn: "1 / span 2",
            }}
        >
            <span>
                <Text style={{ fontWeight: "bold" }}>{title}</Text>
                {onDelete && (
                    <Button
                        icon="trash"
                        variant="minimal"
                        onClick={onDelete}
                        style={{ gridColumn: "1 / span 2" }}
                    />
                )}
            </span>
            {children}
        </SectionCard>
    );
});

export function Ruler({ sequenceLengthMs }: { sequenceLengthMs: number }) {
    return (
        <TimelineLayer title="Ruler">
            <div
                style={{
                    display: "flex",
                    width: "max-content",
                    overflowX: "scroll",
                    justifyContent: "space-between",
                    alignItems: "start",
                    gap: RULER_TICK_GAP_PX,
                }}
            >
                {new Array(
                    Math.round(sequenceLengthMs / RULER_TICK_INTERVAL_MS) +
                        RULER_EXTRA_TICK_COUNT,
                )
                    .fill(1)
                    .map((_, i) => {
                        // 1000ms interval (every 4 ticks if RULER_TICK_INTERVAL_MS is 250)
                        const isMajorTick =
                            i % (1000 / RULER_TICK_INTERVAL_MS) === 0;

                        // 500ms interval
                        const isSecondaryTick =
                            i % (1000 / RULER_TICK_INTERVAL_MS) === 5;
                        return (
                            <div
                                key={`tick-${i}`}
                                style={{
                                    borderRight: "1px solid gray",
                                    height:
                                        isMajorTick ? "1rem"
                                        : isSecondaryTick ? "0.8rem"
                                        : "0.5rem",
                                }}
                            />
                        );
                    })}
            </div>
        </TimelineLayer>
    );
}
