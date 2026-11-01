import { useCallback, useEffect, useMemo, useRef } from "react";
import {
    Section,
    EditableText,
    Button,
    H2,
    Card,
    ButtonGroup,
    Tag,
    useHotkeys,
    type HotkeyConfig,
    SegmentedControl,
    Divider,
    NumericInput,
    Pre,
    NonIdealState,
    SectionCard,
} from "@blueprintjs/core";
import { RobotGrid, robotSize } from "../debug/simulator";
import {
    Ruler,
    TimelineLayer,
    TimelineEvent,
    ReorderableTimelineEvent,
} from "./timeline";
import type { MotionValue } from "motion/react";
import {
    motion,
    useTransform,
    useAnimate,
    useMotionValueEvent,
    Reorder,
} from "motion/react";
import { useShowfile } from "./showfile-state";
import { MotionRobot } from "./motion-robot";
import interact from "interactjs";
import { Array as RArray } from "runtypes";
import { post } from "../api";

// Helper component to manage animation for a single robot
function AnimatedRobotRenderer({
    timestamp,
    robotId,
}: {
    timestamp: MotionValue<number>;
    robotId: string;
}) {
    const [scope, animate] = useAnimate();

    // Get initial state to avoid undefined on first render
    const initialState = getRobotStateAtTime(layer, timestamp.get());

    useMotionValueEvent(timestamp, "change", (latestTimestamp) => {
        const { position, headingRadians } = getRobotStateAtTime(
            layer,
            latestTimestamp,
        );
        const targetX = position.x - robotSize / 2;
        const targetY = position.y - robotSize / 2;
        const targetRotate = headingRadians * (180 / Math.PI);

        // Animate using transform
        if (scope.current) {
            animate(
                scope.current,
                {
                    transform: `translateX(${targetX}px) translateY(${targetY}px) rotate(${targetRotate}deg)`,
                },
                { duration: 0, ease: "linear" },
            );
        }
    });

    // Calculate initial transform string
    const initialX = initialState.position.x - robotSize / 2;
    const initialY = initialState.position.y - robotSize / 2;
    const initialRotate = initialState.headingRadians * (180 / Math.PI);
    const initialTransform = `translateX(${initialX}px) translateY(${initialY}px) rotate(${initialRotate}deg)`;

    return (
        <MotionRobot
            ref={scope}
            robotId={robotId}
            // Set initial position via style prop using transform
            style={{
                transform: initialTransform,
            }}
        />
    );
}

export function Editor() {
    const {
        show,
        unsavedChanges,
        loadAudioFromFile,
        handleStartPointMove,
        handlePointMove,
        handleControlPointMove,
        handleControlPoint2Move,
        handleDeleteStartPoint,
        handleDeletePoint,
        handleSwitchPointType,
        saveShowfile,
        openShowfile,
        undo,
        redo,
        editName,
        addRobot,
        currentTimestamp,
        playing,
        togglePlaying,
        canUndo,
        canRedo,
        deleteLayer,
        sequenceLengthMs,
        updateTimelineEventOrders,
        updateTimelineEventDurations,
        setTimelineDurationUpdateMode,
        timelineDurationUpdateMode,
        gridCursorMode,
        setGridCursorMode,
        defaultPointType,
        setDefaultPointType,
        setDefaultEventDurationMs,
        defaultEventDurationMs,
        addPointToSelectedLayer,
        setSelectedLayerIndex,
        selectedLayerIndex,
        removeAudio,
        deleteTimelineEvent,
        setTimestamp,
        addWaitEventAtIndex,
        addTurnEventAtIndex,
        getLayerIndexFromEventId,
        addBulkEventsToSelectedLayer,
        selectedTimelineEventIndex,
        setSelectedTimelineEventIndex,
    } = useShowfile();

    // TODO: fix viewport height / timeline height

    const seekBarWidth = useTransform(() =>
        millisToPixels(currentTimestamp.get()),
    );

    const hotkeys = useMemo<HotkeyConfig[]>(
       
    );

    const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

    const seekBarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!seekBarRef.current) return;
        const el = seekBarRef.current;
        interact(el).resizable({
            edges: {
                right: true,
            },
            listeners: {
                move: function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    const newTimestamp = pixelsToMillis(event.rect.width);
                    setTimestamp(newTimestamp);
                },
            },
        });
    }, [setTimestamp]);

    const handleSeekBarClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            const { x: mouseX } = e.nativeEvent;
            const seekBar = seekBarRef.current;
            if (!seekBar) return;
            const { x: seekBarStartX } = seekBar.getBoundingClientRect();
            const newTimestamp = pixelsToMillis(mouseX - seekBarStartX);
            setTimestamp(newTimestamp);
        },
        [setTimestamp],
    );
    return (
        <div
            style={{ maxHeight: "100vh" }}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
        >
            <Card compact>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gridTemplateColumns: "max-content 1fr",
                    }}
                >
                    <H2>
                        <EditableText
                            placeholder="Click to edit..."
                            value={show.name}
                            onChange={editName}
                        />
                    </H2>
                    {unsavedChanges && (
                        <Tag
                            intent="warning"
                            minimal
                            style={{ gridColumn: "1/1" }}
                        >
                            Unsaved changes
                        </Tag>
                    )}
                </div>

                <ButtonGroup size="medium">
                    <Button
                        className="bp5-minimal"
                        text="Save"
                        onClick={saveShowfile}
                    />
                    <Button
                        className="bp5-minimal"
                        text="Open..."
                        onClick={openShowfile}
                    />
                    <Button
                        className="bp5-minimal"
                        text="Undo"
                        disabled={!canUndo}
                        onClick={undo}
                    />
                    <Button
                        className="bp5-minimal"
                        text="Redo"
                        disabled={!canRedo}
                        onClick={redo}
                    />
                    <Button
                        className="bp5-minimal"
                        text="Load New Audio..."
                        onClick={loadAudioFromFile}
                    />
                    {show.audio && (
                        <Button
                            className="bp5-minimal"
                            text="Remove Audio"
                            onClick={removeAudio}
                        />
                    )}
                </ButtonGroup>
            </Card>
            <div style={{ display: "flex", flexDirection: "row" }}>
                <Section title="Grid" compact>
                    <RobotGrid robotState={{}}>
                        {gridCursorMode === GridCursorMode.Pen && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    width: "100%",
                                    height: "100%",
                                    cursor: "crosshair",
                                }}
                                onClick={(e) => {
                                    const { x: mouseX, y: mouseY } =
                                        e.nativeEvent;
                                    const {
                                        left: gridOriginX,
                                        top: gridOriginY,
                                    } = e.currentTarget.getBoundingClientRect();
                                    const x = mouseX - gridOriginX;
                                    const y = mouseY - gridOriginY;
                                    addPointToSelectedLayer(
                                        x + robotSize / 4,
                                        y + robotSize / 4,
                                    );
                                }}
                            ></div>
                        )}
                        {show.timeline.map((layer, index) => (
                            <div
                                style={{
                                    opacity:
                                        selectedLayerIndex === index ? 1 : 0.35,
                                }}
                            >
                                <SplineEditor
                                    key={`spline-editor-${index}`}
                                    layer={layer}
                                    onStartPointMove={(coords) =>
                                        handleStartPointMove(index, coords)
                                    }
                                    onPointMove={(pointIdx, coords) =>
                                        handlePointMove(index, pointIdx, coords)
                                    }
                                    onControlPointMove={(pointIdx, coords) =>
                                        handleControlPointMove(
                                            index,
                                            pointIdx,
                                            coords,
                                        )
                                    }
                                    onControlPoint2Move={(pointIdx, coords) =>
                                        handleControlPoint2Move(
                                            index,
                                            pointIdx,
                                            coords,
                                        )
                                    }
                                    onDeleteStartPoint={() =>
                                        handleDeleteStartPoint(index)
                                    }
                                    onDeletePoint={(pointIdx) =>
                                        handleDeletePoint(index, pointIdx)
                                    }
                                    onSwitchPointType={(pointIdx, newType) =>
                                        handleSwitchPointType(
                                            index,
                                            pointIdx,
                                            newType,
                                        )
                                    }
                                />
                            </div>
                        ))}
                        {show.timeline.map((layer, index) => (
                            <AnimatedRobotRenderer
                                key={`animated-robot-${index}`}
                                layer={layer}
                                timestamp={currentTimestamp}
                                robotId={`Robot ${index + 1}`}
                            />
                        ))}
                    </RobotGrid>
                </Section>
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <Section title="Debug" compact collapsible>
                        <SectionCard padded={false}>
                            <Pre
                                style={{ height: "52.5vh", overflow: "scroll" }}
                            >
                                {JSON.stringify(
                                    {
                                        ...show,
                                        audio:
                                            show.audio ?
                                                {
                                                    data: "[binary data]",
                                                    mimeType:
                                                        show.audio.mimeType,
                                                }
                                            :   undefined,
                                    },
                                    null,
                                    2,
                                )}
                            </Pre>
                        </SectionCard>
                    </Section>
                    <Section title="Inspect" compact collapsible>
                        <SectionCard>
                            {selectedTimelineEventIndex !== null ?
                                <p>Coming soon: event editor.</p>
                            :   <NonIdealState
                                    icon="asterisk"
                                    title="No event selected"
                                    description="Select an event on the timeline to manually edit its properties."
                                />
                            }
                        </SectionCard>
                    </Section>
                </div>
            </div>
            <Section
                title="Timeline"
                compact
                style={{ height: "28vh", overflow: "scroll" }}
                rightElement={
                    <>
                        <SegmentedControl
                            options={[
                                {
                                    label: "Ripple",
                                    value: TimelineDurationUpdateMode.Ripple,
                                },
                                {
                                    label: "Rolling",
                                    value: TimelineDurationUpdateMode.Rolling,
                                },
                            ]}
                            onValueChange={(value) =>
                                setTimelineDurationUpdateMode(
                                    value as (typeof TimelineDurationUpdateMode)[keyof typeof TimelineDurationUpdateMode],
                                )
                            }
                            value={timelineDurationUpdateMode}
                        />
                        <Divider />
                        {gridCursorMode === GridCursorMode.Pen && (
                            <>
                                <SegmentedControl
                                    options={[
                                        {
                                            label: "Quadratic",
                                            value: SplinePointType.QuadraticBezier,
                                        },
                                        {
                                            label: "Cubic",
                                            value: SplinePointType.CubicBezier,
                                        },
                                    ]}
                                    onValueChange={(value) =>
                                        setDefaultPointType(
                                            value as Midpoint["type"],
                                        )
                                    }
                                    value={defaultPointType}
                                />
                                <NumericInput
                                    value={defaultEventDurationMs}
                                    style={{ width: "5rem" }}
                                    onValueChange={(value) =>
                                        setDefaultEventDurationMs(value)
                                    }
                                />
                            </>
                        )}
                        <SegmentedControl
                            options={[
                                {
                                    label: "Cursor",
                                    value: GridCursorMode.Cursor,
                                },
                                {
                                    label: "Pen",
                                    value: GridCursorMode.Pen,
                                },
                            ]}
                            onValueChange={(value) =>
                                setGridCursorMode(
                                    value as (typeof GridCursorMode)[keyof typeof GridCursorMode],
                                )
                            }
                            value={gridCursorMode}
                        />
                        <Divider />
                        <Button
                            icon="add"
                            text="Add Robot"
                            onClick={addRobot}
                        />
                    </>
                }
            >
                <ButtonGroup>
                    <Button
                        icon={playing ? "pause" : "play"}
                        text={playing ? "Pause" : "Play"}
                        onClick={togglePlaying}
                        variant="outlined"
                    />
                </ButtonGroup>
                <Button
                    onClick={async () => {
                        post("/do-big", { show: JSON.stringify(show) });
                    }}
                />

                <div
                    style={{
                        overflowY: "scroll",
                        maxHeight: "100%",
                        display: "grid",
                        gridTemplateColumns: "max-content 1fr",
                        gap: `0rem ${RULER_TICK_GAP_PX}`,
                    }}
                >
                    <Ruler sequenceLengthMs={sequenceLengthMs} />
                    <TimelineLayer title="Seek">
                        <div
                            style={{ width: "100%" }}
                            onClick={handleSeekBarClick}
                        >
                            <motion.div
                                ref={seekBarRef}
                                style={{
                                    display: "flex",
                                    backgroundColor: "red",
                                    height: "1rem",
                                    width: seekBarWidth,
                                }}
                                onClick={handleSeekBarClick}
                            />
                        </div>
                    </TimelineLayer>
                    {show.timeline.map(
                        ({ startPoint, remainingEvents }, layerIndex) => {
                            return (
                                <TimelineLayer
                                    key={`timeline-layer-${layerIndex}`}
                                    title={`Robot ${layerIndex + 1}`}
                                    onDelete={() => deleteLayer(layerIndex)}
                                    onActive={() =>
                                        setSelectedLayerIndex(layerIndex)
                                    }
                                    active={selectedLayerIndex === layerIndex}
                                >
                                    <div style={{ display: "flex" }}>
                                        <TimelineEvent
                                            event={startPoint}
                                            onDurationChange={(ms) =>
                                                updateTimelineEventDurations(
                                                    layerIndex,
                                                    startPoint.id,
                                                    ms,
                                                )
                                            }
                                            onAddWaitEvent={() => {
                                                addWaitEventAtIndex(
                                                    layerIndex,
                                                    0,
                                                );
                                            }}
                                            onAddTurnEvent={() => {
                                                addTurnEventAtIndex(
                                                    layerIndex,
                                                    0,
                                                );
                                            }}
                                            selected={
                                                selectedTimelineEventIndex?.layerIndex ===
                                                    layerIndex &&
                                                selectedTimelineEventIndex?.eventId ===
                                                    startPoint.id
                                            }
                                            onSelect={() => {
                                                setSelectedTimelineEventIndex({
                                                    layerIndex,
                                                    eventId: startPoint.id,
                                                });
                                            }}
                                        />
                                        <Reorder.Group
                                            as="div"
                                            axis="x"
                                            style={{ display: "contents" }}
                                            values={[
                                                startPoint,
                                                ...remainingEvents,
                                            ]}
                                            onReorder={(newIndices) => {
                                                updateTimelineEventOrders(
                                                    layerIndex,
                                                    newIndices as NonStartPointEvent[],
                                                );
                                            }}
                                        >
                                            {remainingEvents.map(
                                                (event, eventIndex) => {
                                                    return (
                                                        <ReorderableTimelineEvent
                                                            event={event}
                                                            key={event.id}
                                                            onDurationChange={(
                                                                ms,
                                                            ) =>
                                                                updateTimelineEventDurations(
                                                                    layerIndex,
                                                                    event.id,
                                                                    ms,
                                                                )
                                                            }
                                                            onDelete={() =>
                                                                deleteTimelineEvent(
                                                                    layerIndex,
                                                                    event.id,
                                                                )
                                                            }
                                                            onAddWaitEvent={(
                                                                position,
                                                            ) =>
                                                                (
                                                                    position ===
                                                                    "before"
                                                                ) ?
                                                                    addWaitEventAtIndex(
                                                                        layerIndex,
                                                                        eventIndex,
                                                                    )
                                                                :   addWaitEventAtIndex(
                                                                        layerIndex,
                                                                        eventIndex +
                                                                            1,
                                                                    )
                                                            }
                                                            onAddTurnEvent={(
                                                                position,
                                                            ) =>
                                                                (
                                                                    position ===
                                                                    "before"
                                                                ) ?
                                                                    addTurnEventAtIndex(
                                                                        layerIndex,
                                                                        eventIndex,
                                                                    )
                                                                :   addTurnEventAtIndex(
                                                                        layerIndex,
                                                                        eventIndex +
                                                                            1,
                                                                    )
                                                            }
                                                            selected={
                                                                selectedTimelineEventIndex?.layerIndex ===
                                                                    layerIndex &&
                                                                selectedTimelineEventIndex?.eventId ===
                                                                    event.id
                                                            }
                                                            onSelect={() => {
                                                                setSelectedTimelineEventIndex(
                                                                    {
                                                                        layerIndex,
                                                                        eventId:
                                                                            event.id,
                                                                    },
                                                                );
                                                            }}
                                                        />
                                                    );
                                                },
                                            )}
                                        </Reorder.Group>
                                    </div>
                                </TimelineLayer>
                            );
                        },
                    )}
                </div>
            </Section>
        </div>
    );
}
