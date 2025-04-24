// TODO: how to add wait events?

import { useMemo } from "react";
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
} from "@blueprintjs/core";
import { RobotGrid, robotSize, Robot } from "../debug/simulator";
import {
    GridCursorMode,
    millisToPixels,
    NonStartPointEvent,
    RULER_TICK_GAP_PX,
    TimelineDurationUpdateMode,
    TimelineEvents,
    TimelineEventTypes,
} from "../../common/show";
import { SplineEditor } from "./spline-editor";
import {
    Ruler,
    TimelineLayer,
    TimelineEvent,
    ReorderableTimelineEvent,
} from "./timeline";
import { Midpoint, SplinePointType } from "../../common/spline";
import {
    motion,
    MotionValue,
    useTransform,
} from "motion/react";
import { useShowfile } from "./showfile-state";
import { Reorder } from "motion/react";

export function Editor() {
    const {
        show,
        unsavedChanges,
        loadAudioFromFile,
        handleStartPointMove,
        handlePointMove,
        handleControlPointMove,
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
    } = useShowfile();

    // TODO: fix viewport height / timeline height

    const seekBarWidth = useTransform(() =>
        millisToPixels(currentTimestamp.get()),
    );

    const hotkeys = useMemo<HotkeyConfig[]>(
        () => [
            {
                combo: "mod+s",
                group: "File",
                global: true,
                label: "Save",
                onKeyDown: (e) => {
                    e.preventDefault();
                    saveShowfile();
                },
            },
            {
                combo: "mod+o",
                group: "File",
                global: true,
                label: "Open...",
                onKeyDown: (e) => {
                    e.preventDefault();
                    openShowfile();
                },
            },
            {
                combo: "mod+z",
                group: "Edit",
                global: true,
                label: "Undo",
                onKeyDown: (e) => {
                    e.preventDefault();
                    undo();
                },
            },
            {
                combo: "mod+y",
                group: "Edit",
                global: true,
                label: "Redo",
                onKeyDown: (e) => {
                    e.preventDefault();
                    redo();
                },
            },
            {
                combo: "space",
                group: "Play/Pause",
                global: true,
                label: "Play/Pause",
                onKeyDown: (e) => {
                    e.preventDefault();
                    togglePlaying();
                },
            },
        ],
        [redo, undo, saveShowfile, openShowfile, togglePlaying],
    );

    const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

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
            <div style={{display: "flex", flexDirection: "row"}}>
            <Section
                title="Grid"
                compact
                >

                
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
                            const { x: mouseX, y: mouseY } = e.nativeEvent;
                            const { left: gridOriginX, top: gridOriginY } =
                                e.currentTarget.getBoundingClientRect();
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
                    <>
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
                                handleControlPointMove(index, pointIdx, coords)
                            }
                            onDeleteStartPoint={() =>
                                handleDeleteStartPoint(index)
                            }
                            onDeletePoint={(pointIdx) =>
                                handleDeletePoint(index, pointIdx)
                            }
                            onSwitchPointType={(pointIdx, newType) =>
                                handleSwitchPointType(index, pointIdx, newType)
                            }
                        />
                        <AnimatableRobot
                            robotId={`robot-${index}`}
                            timestamp={currentTimestamp}
                            layer={layer}
                        />
                    </>
                ))}
            </RobotGrid>
            </Section>
            <Section title="Debug" compact collapsible>
                <Pre style={{height: "60vh", overflow: "scroll"}}>{JSON.stringify({...show, audio: show.audio ? {data: "[binary data]", mimeType: show.audio.mimeType} : undefined}, null, 2)}</Pre>

            </Section>
            </div>
            <Section
                title="Timeline"
                compact
                style={{ height: "100%" }}
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
                        <motion.div
                            style={{
                                display: "flex",
                                backgroundColor: "red",
                                height: "1rem",
                                width: seekBarWidth,
                            }}
                        />
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
                                            {remainingEvents.map((event) => {
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
                                                    />
                                                );
                                            })}
                                        </Reorder.Group>
                                    </div>
                                    {/* TODO: add ability to add events */}
                                </TimelineLayer>
                            );
                        },
                    )}
                </div>
            </Section>
        </div>
    );
}


const addTimestampToTimelineEvents = (events: TimelineEvents[]) => {
    let endTimestamp = 0;

    const eventsWithTs = events.map((e) => {
        endTimestamp += e.durationMs;

        return {
            ...e,
            endTimestamp,
        };
    });

    return eventsWithTs;
};

const MotionRobot = motion.create(Robot);

function AnimatableRobot({
    robotId,
    layer: {startPoint, remainingEvents},
    timestamp,
}: {
    robotId: string;
    layer: TimelineLayer;
    timestamp: MotionValue<number>;
}) {
    const allEventsWithTimestamp = addTimestampToTimelineEvents([startPoint, ...remainingEvents].filter(e => e.type !== TimelineEventTypes.WaitEvent));
    const pairedEvents = arrayToNTuples(allEventsWithTimestamp, 2);

    // const offsetPath = useTransform(timestamp, pairedEvents.map(([e1]) => e1.endTimestamp));
    return (
        <MotionRobot
            pos={{
                position: {
                    x: 0,
                    y: 0,
                },
                headingRadians: 0,
            }}
            onTopOfRobots={[]}
            robotId={robotId}
        />
    );
}


/*
 * Splits an array into tuples of max length n.
 */
function arrayToNTuples<T>(array: T[], n: number): T[][] {
    return array.reduce((acc, item, index) => {
        if (index % n === 0) {
            acc.push([]);
        }
        acc[acc.length - 1].push(item);
        return acc;
    }, [] as T[][]);
}
