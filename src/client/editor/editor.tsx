import { forwardRef, type PropsWithChildren, useMemo } from "react";
import {
    Section,
    Text,
    EditableText,
    Button,
    H2,
    SectionCard,
    Card,
    ButtonGroup,
    Tag,
    useHotkeys,
    type HotkeyConfig,
    Elevation,
} from "@blueprintjs/core";
import { RobotGrid } from "../debug/simulator";
import {
    type TimelineEvents,
    EVENT_TYPE_TO_COLOR,
    type TimelineLayer,
    TimelineEventTypes,
} from "../../common/show";
import { SplineEditor } from "./spline-editor";
import { motion, useTransform } from "motion/react";
import { useShowfile } from "./showfile-state";

const RULER_TICK_INTERVAL_MS = 100;
const RULER_EXTRA_TICK_COUNT = 20;
// TODO: make ruler tick size configurable so we can zoom. relatively low priority. would be nice if gestures could be supported too
const RULER_TICK_GAP = "0.5rem";

function millisToXPosition(millis: number): string {
    return `calc(${millis} / ${RULER_TICK_INTERVAL_MS} * ${RULER_TICK_GAP})`;
}

// TODO: ui for adding/removing audio - remove current hotkey as this was mainly for testing

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
    } = useShowfile();

    // TODO: fix viewport height / timeline height

    const seekBarWidth = useTransform(() =>
        millisToXPosition(currentTimestamp.get()),
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
                onKeyDown: undo,
            },
            {
                combo: "mod+y",
                group: "Edit",
                global: true,
                label: "Redo",
                onKeyDown: redo,
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
            {
                combo: "mod+shift+f",
                group: "Edit",
                global: true,
                label: "Load Audio",
                onKeyDown: (e) => {
                    e.preventDefault();
                    loadAudioFromFile();
                },
            },
        ],
        [
            redo,
            undo,
            saveShowfile,
            openShowfile,
            togglePlaying,
            loadAudioFromFile,
        ],
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
                        text="Load New Audio"
                        onClick={loadAudioFromFile}
                    />
                </ButtonGroup>
            </Card>
            {/* TODO: render robots */}
            <RobotGrid robotState={{}}>
                {show.timeline.map((layer, index) => (
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
                        onDeleteStartPoint={() => handleDeleteStartPoint(index)}
                        onDeletePoint={(pointIdx) =>
                            handleDeletePoint(index, pointIdx)
                        }
                        onSwitchPointType={(pointIdx, newType) =>
                            handleSwitchPointType(index, pointIdx, newType)
                        }
                    />
                ))}
            </RobotGrid>
            <Section
                title="Timeline"
                compact
                style={{ height: "100%" }}
                rightElement={
                    <Button icon="add" text="Add Robot" onClick={addRobot} />
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
                        gap: `0rem ${RULER_TICK_GAP}`,
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
                    <TimelineLayer title="Audio"> Stuff here</TimelineLayer>
                    {show.timeline.map(([startPoint, remainingEvents], i) => {
                        return (
                            <TimelineLayer
                                key={`timeline-layer-${i}`}
                                title={`Robot ${i + 1}`}
                                onDelete={() => deleteLayer(i)}
                            >
                                <div style={{ display: "flex" }}>
                                    <TimelineEvent event={startPoint} />
                                    {remainingEvents.map((event) => {
                                        return <TimelineEvent event={event} />;
                                    })}
                                </div>
                                {/* TODO: add ability to add events */}
                            </TimelineLayer>
                        );
                    })}
                </div>
            </Section>
        </div>
    );
}

const TimelineEvent = forwardRef<HTMLDivElement, { event: TimelineEvents }>(
    function TimelineEvent(props, ref) {
        const { event } = props;
        // TODO: add context menu for deleting events and adding a new event before and after this one

        // TODO: add handles to the edges of the event to edit durations. add a switch for ripple vs rolling edits

        // ripple edits mean that editing the duration of an event has a ripple effect on ALL the other events in the same layer, shifting all the subsequent event start times by the same amount (so only one event's duration is actually changing)
        // rolling edits mean that editing the duration of an event also affects the duration of the event that immediately follows it in the same layer, such that adjusting the duration of this event doesn't shift the start timestamp of the subsequent events in the same layer

        return (
            <Card
                ref={ref}
                style={{
                    width: millisToXPosition(event.durationMs),
                    backgroundColor: EVENT_TYPE_TO_COLOR[event.type],
                    color: "white",
                    visibility:
                        event.type === TimelineEventTypes.WaitEvent ?
                            "hidden"
                        :   "inherit",
                }}
                compact
                elevation={Elevation.TWO}
            >
                {event.type}
            </Card>
        );
    },
);

const TimelineLayer = forwardRef<
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

function Ruler({ sequenceLengthMs }: { sequenceLengthMs: number }) {
    return (
        <TimelineLayer title="Ruler">
            <div
                style={{
                    display: "flex",
                    width: "max-content",
                    overflowX: "scroll",
                    justifyContent: "space-between",
                    alignItems: "start",
                    gap: RULER_TICK_GAP,
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
