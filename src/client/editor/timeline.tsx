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
                        cursor: "grab",
                    }}
                    onPointerDown={onPointerDownOnDragHandle}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 39 39"
                        width="16"
                        height="16"
                        fill="#BBB"
                    >
                        <path d="M 5 0 C 7.761 0 10 2.239 10 5 C 10 7.761 7.761 10 5 10 C 2.239 10 0 7.761 0 5 C 0 2.239 2.239 0 5 0 Z"></path>
                        <path d="M 19 0 C 21.761 0 24 2.239 24 5 C 24 7.761 21.761 10 19 10 C 16.239 10 14 7.761 14 5 C 14 2.239 16.239 0 19 0 Z"></path>
                        <path d="M 33 0 C 35.761 0 38 2.239 38 5 C 38 7.761 35.761 10 33 10 C 30.239 10 28 7.761 28 5 C 28 2.239 30.239 0 33 0 Z"></path>
                        <path d="M 33 14 C 35.761 14 38 16.239 38 19 C 38 21.761 35.761 24 33 24 C 30.239 24 28 21.761 28 19 C 28 16.239 30.239 14 33 14 Z"></path>
                        <path d="M 19 14 C 21.761 14 24 16.239 24 19 C 24 21.761 21.761 24 19 24 C 16.239 24 14 21.761 14 19 C 14 16.239 16.239 14 19 14 Z"></path>
                        <path d="M 5 14 C 7.761 14 10 16.239 10 19 C 10 21.761 7.761 24 5 24 C 2.239 24 0 21.761 0 19 C 0 16.239 2.239 14 5 14 Z"></path>
                        <path d="M 5 28 C 7.761 28 10 30.239 10 33 C 10 35.761 7.761 38 5 38 C 2.239 38 0 35.761 0 33 C 0 30.239 2.239 28 5 28 Z"></path>
                        <path d="M 19 28 C 21.761 28 24 30.239 24 33 C 24 35.761 21.761 38 19 38 C 16.239 38 14 35.761 14 33 C 14 30.239 16.239 28 19 28 Z"></path>
                        <path d="M 33 28 C 35.761 28 38 30.239 38 33 C 38 35.761 35.761 38 33 38 C 30.239 38 28 35.761 28 33 C 28 30.239 30.239 28 33 28 Z"></path>
                    </svg>
                </span>
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
