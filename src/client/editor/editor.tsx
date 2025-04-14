// @ts-expect-error: chessbots client is a CommonJS module, but this library is a ES Module, so we need to tell TypeScript that it's okay
import { decode as cborDecode, encode as cborEncode } from "cbor-x";
import {
    forwardRef,
    type PropsWithChildren,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
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

// @ts-expect-error: chessbots client is a CommonJS module, but this library is a ES Module, so we need to tell TypeScript that it's okay
import { fileOpen, fileSave } from "browser-fs-access";
import {
    type TimelineEvents,
    createNewShowfile,
    ShowfileSchema,
    EVENT_TYPE_TO_COLOR,
    type TimelineLayer,
    TimelineEventTypes,
    type GoToPointEvent,
    StartPointEvent,
} from "../../common/show";
import { diff } from "deep-object-diff";
import {
    usePreventExitWithUnsavedChanges,
    useStateWithTrackedHistory,
} from "./hooks";
import { SplineEditor } from "./spline-editor";
import {
    motion,
    useMotionValue,
    useMotionValueEvent,
    useTime,
    useTransform,
} from "motion/react";
import {
    SplinePointType,
    type Coords,
    type CubicBezier,
    type QuadraticBezier,
} from "../../common/spline";

const RULER_TICK_INTERVAL_MS = 100;
const RULER_EXTRA_TICK_COUNT = 20;
// TODO: make ruler tick size configurable so we can zoom. relatively low priority. would be nice if gestures could be supported too
const RULER_TICK_GAP = "0.5rem";

function millisToXPosition(millis: number): string {
    return `calc(${millis} / ${RULER_TICK_INTERVAL_MS} * ${RULER_TICK_GAP})`;
}

// TODO: reading blob.bytes works in safari but not chrome. why?
// TODO: ui for adding/removing audio - remove current hotkey as this was mainly for testing

export function Editor() {
    const [initialShow, setInitialShow] = useState(createNewShowfile());
    const [fsHandle, setFsHandle] = useState<FileSystemFileHandle | null>(null);
    const {
        value: show,
        setValue: setShow,
        canUndo,
        canRedo,
        undo,
        redo,
    } = useStateWithTrackedHistory(initialShow);

    const { audio } = show;

    // TODO: fix viewport height / timeline height
    const [unsavedChanges, setUnsavedChanges] =
        usePreventExitWithUnsavedChanges();

    useEffect(() => {
        const result = diff(initialShow, show);
        if (Object.keys(result).length === 0) {
            setUnsavedChanges(false);
        } else {
            setUnsavedChanges(true);
        }
    }, [initialShow, show, setUnsavedChanges]);

    const openShowfile = useCallback(async () => {
        const blob = await fileOpen({
            mimeTypes: ["application/chessbots-showfile"],
            extensions: [".cbor"],
            description: "Chess Bots Showfile",
        });

        let data: unknown | null = null;
        try {
            data = cborDecode(new Uint8Array(await blob.arrayBuffer()));
        } catch (e) {
            // TODO: toast or alert
            console.warn("Failed to decode showfile as CBOR", e);
            return;
        }

        const show = ShowfileSchema.check(data);

        if (!show) {
            // TODO: toast or alert
            console.warn("File was CBOR but not a valid showfile", data);
            return;
        }

        setInitialShow(show);
        setShow(show);
        if (blob.handle) setFsHandle(blob.handle);
    }, [setShow]);

    const saveShowfile = useCallback(async () => {
        const blob = new Blob([cborEncode(show)], {
            type: "application/chessbots-showfile",
        });
        await fileSave(
            blob,
            {
                mimeTypes: ["application/chessbots-showfile"],
                extensions: [".cbor"],
                fileName: show.name + ".cbor",
            },
            fsHandle,
        );

        setInitialShow(show);
    }, [fsHandle, show]);

    const loadAudioFromFile = useCallback(async () => {
        const blob = await fileOpen({
            mimeTypes: ["audio/mpeg", "audio/wav"],
            extensions: [".mp3", ".wav"],
        });
        const audio = new Uint8Array(await blob.arrayBuffer());
        setShow({
            ...show,
            audio: {
                data: audio,
                mimeType: blob.type,
            },
        });
    }, [setShow, show]);

    // TODO: figure out how to get this from the showfile
    const SEQUENCE_LENGTH_MS = 10 * 1000;

    const { currentTimestamp, playing, togglePlaying } =
        usePlayHead(SEQUENCE_LENGTH_MS);
    const seekBarWidth = useTransform(() =>
        millisToXPosition(currentTimestamp.get()),
    );

    const handleStartPointMove = useCallback(
        (layerIndex: number, newCoords: Coords) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (layer) {
                const [startPoint, remainingEvents] = layer;
                const newStartPointEvent: StartPointEvent = {
                    ...startPoint,
                    target: { ...startPoint.target, point: newCoords },
                };
                newTimeline[layerIndex] = [newStartPointEvent, remainingEvents];
                setShow({ ...show, timeline: newTimeline });
            }
        },
        [show, setShow],
    );

    const handlePointMove = useCallback(
        (layerIndex: number, pointIndex: number, newCoords: Coords) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) return;
            const [startPoint, remainingEvents] = layer;
            const events = [...remainingEvents];
            const eventToUpdate = events[pointIndex];

            if (
                eventToUpdate &&
                eventToUpdate.type === TimelineEventTypes.GoToPointEvent
            ) {
                events[pointIndex] = {
                    ...eventToUpdate,
                    target: {
                        ...eventToUpdate.target,
                        endPoint: newCoords,
                    },
                };
                newTimeline[layerIndex] = [startPoint, events];
                setShow({ ...show, timeline: newTimeline });
            }
        },
        [show, setShow],
    );

    const handleControlPointMove = useCallback(
        (layerIndex: number, pointIndex: number, newCoords: Coords) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) return;
            const [startPoint, remainingEvents] = layer;
            const events = [...remainingEvents];
            const eventToUpdate = events[pointIndex];

            if (
                eventToUpdate?.type === TimelineEventTypes.GoToPointEvent &&
                eventToUpdate.target.type === SplinePointType.CubicBezier
            ) {
                events[pointIndex] = {
                    ...eventToUpdate,
                    target: {
                        ...eventToUpdate.target,
                        controlPoint: newCoords,
                    },
                };
                newTimeline[layerIndex] = [startPoint, events];
                setShow({ ...show, timeline: newTimeline });
            }
        },
        [show, setShow],
    );

    const handleDeleteStartPoint = useCallback(
        (layerIndex: number) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) return;

            const [, remainingEvents] = layer;

            // Promote the first GoToPoint event (if any) to be the new start point
            const firstGoToPointIndex = remainingEvents.findIndex(
                (e) => e.type === TimelineEventTypes.GoToPointEvent,
            );

            if (firstGoToPointIndex !== -1) {
                const firstGoToPointEvent = remainingEvents[
                    firstGoToPointIndex
                ] as GoToPointEvent;
                const newStartPointEvent: StartPointEvent = {
                    type: TimelineEventTypes.StartPointEvent,
                    durationMs: firstGoToPointEvent.durationMs, // Or use firstGoToPointEvent.durationMs?
                    target: {
                        type: SplinePointType.StartPoint, // Convert midpoint to start point
                        point: firstGoToPointEvent.target.endPoint, // Use the endpoint as the new start
                    },
                };
                const newRemainingEvents = remainingEvents.toSpliced(
                    firstGoToPointIndex,
                    1,
                );
                newTimeline[layerIndex] = [
                    newStartPointEvent,
                    newRemainingEvents,
                ];
                setShow({ ...show, timeline: newTimeline });
            } else {
                console.warn(
                    "Tried to delete a start point with no subsequent GoTo points. Consider deleting layer instead.",
                );
            }
        },
        [show, setShow],
    );

    const handleDeletePoint = useCallback(
        (layerIndex: number, pointIndex: number) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) {
                return;
            }
            const [startPoint, remainingEvents] = layer;
            const events = remainingEvents.toSpliced(pointIndex, 1); // Remove the event
            newTimeline[layerIndex] = [startPoint, events];
            setShow({ ...show, timeline: newTimeline });
        },
        [show, setShow],
    );

    const handleSwitchPointType = useCallback(
        (
            layerIndex: number,
            pointIndex: number,
            newType:
                | SplinePointType.QuadraticBezier
                | SplinePointType.CubicBezier,
        ) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) return;

            const [startPoint, remainingEvents] = layer;
            const events = [...remainingEvents];

            const eventToUpdate = events[pointIndex];

            if (eventToUpdate?.type !== TimelineEventTypes.GoToPointEvent) {
                console.warn("Tried to switch point type on non-GoToPointEvent")
                return
            }
            let newTarget: CubicBezier | QuadraticBezier;
            if (
                newType === SplinePointType.CubicBezier &&
                eventToUpdate.target.type ===
                    SplinePointType.QuadraticBezier
            ) {
                newTarget = {
                    type: SplinePointType.CubicBezier,
                    controlPoint: {
                        x: eventToUpdate.target.endPoint.x - 20,
                        y: eventToUpdate.target.endPoint.y - 20,
                    },
                    endPoint: eventToUpdate.target.endPoint,
                };
            } else if (
                newType === SplinePointType.QuadraticBezier &&
                eventToUpdate.target.type === SplinePointType.CubicBezier
            ) {
                newTarget = {
                    type: SplinePointType.QuadraticBezier,
                    endPoint: eventToUpdate.target.endPoint,
                };
            } else {
                console.warn("Tried to switch point type with invalid type")
                return;
            }

            events[pointIndex] = {
                ...eventToUpdate,
                target: newTarget,
            };
            newTimeline[layerIndex] = [startPoint, events];
            setShow({ ...show, timeline: newTimeline });
        },
        [show, setShow],
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

    const editName = useCallback(
        (value: string) => setShow({ ...show, name: value }),
        [show, setShow],
    );
    const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

    const audioRef = useRef(new Audio());

    useEffect(() => {
        if (!audio) return;

        audioRef.current.src = URL.createObjectURL(
            new Blob([audio.data], {
                type: audio.mimeType,
            }),
        );
        audioRef.current.load();
    }, [audio]);

    useEffect(() => {
        if (!audioRef.current) return;


        if (audioRef.current.readyState !== 4) {
            return;
        }

        if (playing && audioRef.current.paused) {
            audioRef.current.currentTime = Math.min(
                currentTimestamp.get() / 1000,
                audioRef.current.duration,
            );
            audioRef.current.play();
        }

        if (!playing && !audioRef.current.paused) {
            audioRef.current.pause();
        }
    }, [playing, currentTimestamp]);

    const addRobot = useCallback(() => {
        const newLayer: TimelineLayer = [
            {
                type: TimelineEventTypes.StartPointEvent,
                target: {
                    type: SplinePointType.StartPoint,
                    point: {
                        x: 0,
                        y: 70,
                    },
                },
                durationMs: 7500,
            },
            [],
        ];
        setShow({
            ...show,
            timeline: [...show.timeline, newLayer],
        });
    }, [show, setShow]);

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
                {/* TODO: think more about how state changes will make it up from the editor to this component */}
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
                    <Ruler sequenceLengthMs={SEQUENCE_LENGTH_MS} />
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
                                onDelete={() =>
                                    setShow({
                                        ...show,
                                        timeline: show.timeline.toSpliced(i, 1),
                                    })
                                }
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
                    visibility: event.type === TimelineEventTypes.WaitEvent ? "hidden" : "inherit",
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
                        // Check if this tick marks a 1000ms interval (every 4 ticks if RULER_TICK_INTERVAL_MS is 250)
                        const isMajorTick =
                            i % (1000 / RULER_TICK_INTERVAL_MS) === 0;

                        const isSecondaryTick =
                            i % (1000 / RULER_TICK_INTERVAL_MS) === 5;
                        return (
                            <div
                                key={`tick-${i}`}
                                style={{
                                    borderRight: "1px solid gray",
                                    height: isMajorTick ? "1rem" : isSecondaryTick ? "0.8rem" : "0.5rem",
                                }}
                            />
                        );
                    })}
            </div>
        </TimelineLayer>
    );
}

function usePlayHead(endDurationMs: number, startMs = 0) {
    const [playing, setPlaying] = useState(false);
    const currentTimestamp = useMotionValue(startMs);
    const time = useTime();
    const lastAccessedTime = useMotionValue(0);

    const setTimestamp = (timestamp: number) => {
        currentTimestamp.set(timestamp);
    };

    const togglePlaying = useCallback(() => {
        setPlaying((p) => {
            const newPlaying = !p;
            if (newPlaying) {
                // When starting playback, initialize the lastAccessedTime
                lastAccessedTime.set(time.get());
            }
            return newPlaying;
        });
    }, [setPlaying, time, lastAccessedTime]);

    useMotionValueEvent(time, "change", (currentTime) => {
        if (!playing) {
            return;
        }

        const prevTime = lastAccessedTime.get();
        const elapsedMs = currentTime - prevTime;

        const newTimestamp = currentTimestamp.get() + elapsedMs;

        if (newTimestamp >= endDurationMs) {
            setPlaying(false);
            currentTimestamp.set(0);
        } else {
            currentTimestamp.set(newTimestamp);
        }

        lastAccessedTime.set(currentTime);
    });

    return { currentTimestamp, playing, togglePlaying, setTimestamp };
}
