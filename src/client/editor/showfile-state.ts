import { encode as cborEncode } from "cbor-x";

import { fileOpen, fileSave } from "browser-fs-access";

import { diff } from "deep-object-diff";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type {
    StartPointEvent,
    GoToPointEvent,
    TimelineLayerType,
    NonStartPointEvent,
    WaitEvent,
    TurnEvent,
} from "../../common/show.js";
import {
    createNewShowfile,
    loadShowfileFromBinary,
    TimelineEventTypes,
    CHESSBOTS_SHOWFILE_MIME_TYPE,
    CHESSBOTS_SHOWFILE_EXTENSION,
} from "../../common/show.js";
import {
    TimelineDurationUpdateMode,
    GridCursorMode,
} from "../../common/show-interface-utils.js";
import { SplinePointType } from "../../common/spline.js";
import type {
    CubicBezier,
    QuadraticBezier,
    Coords,
    Midpoint,
} from "../../common/spline.js";
import {
    usePlayHead,
    usePreventExitWithUnsavedChanges,
    useStateWithTrackedHistory,
} from "./hooks.js";
import { GRID_CELL_PX } from "../../common/units.js";
import { Uint32 } from "../../common/runtypes-typing.js";

export function useShowfile() {
    // used to store the initial showfile state before any changes were made in the editor, so we have something to compare against to see if there are unsaved changes
    const [initialShow, setInitialShow] = useState(createNewShowfile());

    // See comment on TimelineDurationUpdateMode declaration in src/common/show.ts for context
    const [timelineDurationUpdateMode, setTimelineDurationUpdateMode] =
        useState<
            (typeof TimelineDurationUpdateMode)[keyof typeof TimelineDurationUpdateMode]
        >(TimelineDurationUpdateMode.Ripple);

    const [gridCursorMode, setGridCursorMode] = useState<
        (typeof GridCursorMode)[keyof typeof GridCursorMode]
    >(GridCursorMode.Pen);

    const [defaultPointType, setDefaultPointType] = useState<Midpoint["type"]>(
        SplinePointType.QuadraticBezier,
    );

    const [defaultEventDurationMs, setDefaultEventDurationMs] =
        useState<Uint32>(Uint32.check(3750));

    const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
    const [selectedTimelineEventIndex, setSelectedTimelineEventIndex] =
        useState<{ layerIndex: number; eventId: string } | null>(null);

    // used to store the handle to the file system file that the showfile is currently loaded from,
    // so we can save to the same file we've already opened. not all the browsers' file system API
    // implementations support this - Chrome does, Safari doesn't, not sure about Firefox.
    const [fsHandle, setFsHandle] = useState<FileSystemFileHandle | null>(null);

    const [unsavedChanges, setUnsavedChanges] =
        usePreventExitWithUnsavedChanges();

    const {
        value: show,
        setValue: setShow,
        canUndo,
        canRedo,
        undo,
        redo,
    } = useStateWithTrackedHistory(initialShow);

    // update the unsaved changes state whenever the showfile changes
    useEffect(() => {
        const result = diff(initialShow, show);
        const differenceBetweenSavedShowAndCurrentShow =
            Object.keys(result).length === 0;
        if (differenceBetweenSavedShowAndCurrentShow) {
            setUnsavedChanges(false);
        } else {
            setUnsavedChanges(true);
        }
    }, [initialShow, show, setUnsavedChanges]);

    // handles opening a showfile from the file system, parsing it, and loading it into the editor
    const openShowfile = useCallback(async () => {
        const blob = await fileOpen({
            mimeTypes: [CHESSBOTS_SHOWFILE_MIME_TYPE],
            extensions: [CHESSBOTS_SHOWFILE_EXTENSION],
            description: "Chess Bots Showfile",
        });

        const show = loadShowfileFromBinary(
            new Uint8Array(await blob.arrayBuffer()),
        );
        if (!show) return;

        setInitialShow(show);
        setShow(show);
        if (blob.handle) setFsHandle(blob.handle);
    }, [setShow]);

    // handles encoding the showfile as a CBOR and saving it to the file system
    const saveShowfile = useCallback(async () => {
        const blob = new Blob([cborEncode(show) as BlobPart], {
            type: CHESSBOTS_SHOWFILE_MIME_TYPE,
        });
        await fileSave(
            blob,
            {
                mimeTypes: [CHESSBOTS_SHOWFILE_MIME_TYPE],
                extensions: [CHESSBOTS_SHOWFILE_EXTENSION],
                fileName: show.name + CHESSBOTS_SHOWFILE_EXTENSION,
            },
            fsHandle,
        );

        setInitialShow(show);
    }, [fsHandle, show]);

    // handles loading an audio file from the file system, and adding it to the showfile
    const loadAudioFromFile = useCallback(async () => {
        const blob = await fileOpen({
            mimeTypes: ["audio/mpeg", "audio/wav"],
            extensions: [".mp3", ".wav"],
        });
        const audio = new Uint8Array(await blob.arrayBuffer());
        setShow({ ...show, audio: { data: audio, mimeType: blob.type } });
    }, [setShow, show]);

    const handleStartPointMove = useCallback(
        (layerIndex: number, newCoords: Coords) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (layer) {
                const { startPoint, remainingEvents } = layer;
                const newStartPointEvent: StartPointEvent = {
                    ...startPoint,
                    target: {
                        ...startPoint.target,
                        point: {
                            x: newCoords.x / GRID_CELL_PX,
                            y: newCoords.y / GRID_CELL_PX,
                        },
                    },
                };
                newTimeline[layerIndex] = {
                    startPoint: newStartPointEvent,
                    remainingEvents,
                };
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
            const { startPoint, remainingEvents } = layer;
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
                        endPoint: {
                            x: newCoords.x / GRID_CELL_PX,
                            y: newCoords.y / GRID_CELL_PX,
                        },
                    },
                };
                newTimeline[layerIndex] = {
                    startPoint,
                    remainingEvents: events,
                };
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
            const { startPoint, remainingEvents } = layer;
            const events = [...remainingEvents];
            const eventToUpdate = events[pointIndex];

            if (eventToUpdate?.type === TimelineEventTypes.GoToPointEvent) {
                events[pointIndex] = {
                    ...eventToUpdate,
                    target: {
                        ...eventToUpdate.target,
                        controlPoint: {
                            x: newCoords.x / GRID_CELL_PX,
                            y: newCoords.y / GRID_CELL_PX,
                        },
                    },
                };
                newTimeline[layerIndex] = {
                    startPoint,
                    remainingEvents: events,
                };
                setShow({ ...show, timeline: newTimeline });
            }
        },
        [show, setShow],
    );
    const handleControlPoint2Move = useCallback(
        (layerIndex: number, pointIndex: number, newCoords: Coords) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) return;
            const { startPoint, remainingEvents } = layer;
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
                        controlPoint2: {
                            x: newCoords.x / GRID_CELL_PX,
                            y: newCoords.y / GRID_CELL_PX,
                        },
                    },
                };
                newTimeline[layerIndex] = {
                    startPoint,
                    remainingEvents: events,
                };
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

            const { remainingEvents } = layer;

            // Promote the first GoToPoint event (if any) to be the new start point
            const firstGoToPointIndex = remainingEvents.findIndex(
                (e) => e.type === TimelineEventTypes.GoToPointEvent,
            );

            if (firstGoToPointIndex !== -1) {
                const firstGoToPointEvent = remainingEvents[
                    firstGoToPointIndex
                ] as GoToPointEvent;
                const newStartPointEvent: StartPointEvent = {
                    id: crypto.randomUUID(),
                    type: TimelineEventTypes.StartPointEvent,
                    durationMs: firstGoToPointEvent.durationMs,
                    target: {
                        type: SplinePointType.StartPoint,
                        point: firstGoToPointEvent.target.endPoint,
                    },
                };
                const newRemainingEvents = [
                    ...remainingEvents.slice(0, firstGoToPointIndex),
                    ...remainingEvents.slice(firstGoToPointIndex + 1),
                ];
                newTimeline[layerIndex] = {
                    startPoint: newStartPointEvent,
                    remainingEvents: newRemainingEvents,
                };
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
            const { startPoint, remainingEvents } = layer;
            const events = [
                ...remainingEvents.slice(0, pointIndex),
                ...remainingEvents.slice(pointIndex + 1),
            ]; // Remove the event
            newTimeline[layerIndex] = { startPoint, remainingEvents: events };
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

            const { startPoint, remainingEvents } = layer;
            const events = [...remainingEvents];

            const eventToUpdate = events[pointIndex];

            if (eventToUpdate?.type !== TimelineEventTypes.GoToPointEvent) {
                console.warn(
                    "Tried to switch point type on non-GoToPointEvent",
                );
                return;
            }
            let newTarget: CubicBezier | QuadraticBezier;
            if (
                newType === SplinePointType.CubicBezier &&
                eventToUpdate.target.type === SplinePointType.QuadraticBezier
            ) {
                newTarget = {
                    type: SplinePointType.CubicBezier,
                    controlPoint: {
                        x:
                            (eventToUpdate.target.endPoint.x - 20) /
                            GRID_CELL_PX,
                        y:
                            (eventToUpdate.target.endPoint.y - 20) /
                            GRID_CELL_PX,
                    },
                    controlPoint2: {
                        x:
                            (eventToUpdate.target.endPoint.x + 20) /
                            GRID_CELL_PX,
                        y:
                            (eventToUpdate.target.endPoint.y + 20) /
                            GRID_CELL_PX,
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
                    controlPoint: {
                        x:
                            (eventToUpdate.target.endPoint.x + 20) /
                            GRID_CELL_PX,
                        y:
                            (eventToUpdate.target.endPoint.y + 20) /
                            GRID_CELL_PX,
                    },
                };
            } else {
                console.warn("Tried to switch point type with invalid type");
                return;
            }

            events[pointIndex] = { ...eventToUpdate, target: newTarget };
            newTimeline[layerIndex] = { startPoint, remainingEvents: events };
            setShow({ ...show, timeline: newTimeline });
        },
        [show, setShow],
    );

    const editName = useCallback(
        (value: string) => setShow({ ...show, name: value }),
        [show, setShow],
    );

    const addRobot = useCallback(() => {
        const newLayer: TimelineLayerType = {
            startPoint: {
                id: crypto.randomUUID(),
                type: TimelineEventTypes.StartPointEvent,
                target: {
                    type: SplinePointType.StartPoint,
                    point: { x: 0, y: 10 },
                },
                durationMs: defaultEventDurationMs,
            },
            remainingEvents: [],
        };
        const layers = [...show.timeline, newLayer];
        setShow({ ...show, timeline: layers });

        setSelectedLayerIndex(layers.length - 1);
    }, [show, setShow, defaultEventDurationMs]);

    // Calculate sequenceLengthMs dynamically
    const sequenceLengthMs = useMemo(() => {
        let maxDuration = 0;
        show.timeline.forEach((layer) => {
            let currentLayerDuration = 0;
            // Add start point duration first if it exists
            if (layer.startPoint) {
                currentLayerDuration += layer.startPoint.durationMs;
            }
            // Add remaining events durations
            layer.remainingEvents.forEach((event) => {
                currentLayerDuration += event.durationMs;
            });
            maxDuration = Math.max(maxDuration, currentLayerDuration);
        });
        // Use the max duration across all layers.
        // Provide a default minimum duration if there are no events.
        return maxDuration > 0 ? maxDuration : 10000; // Default to 10s
    }, [show.timeline]);

    // TODO: continue adding comments to code below this line
    const { currentTimestamp, playing, togglePlaying, setTimestamp } =
        usePlayHead(sequenceLengthMs);

    const startShow = useEffect(() => {});

    const { audio } = show;
    const audioRef = useRef(new Audio());
    useEffect(() => {
        if (!audio) return;

        audioRef.current.src = URL.createObjectURL(
            new Blob([audio.data as BlobPart], { type: audio.mimeType }),
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

    const deleteLayer = useCallback(
        (i: number) =>
            setShow({
                ...show,
                timeline: [
                    ...show.timeline.slice(0, i),
                    ...show.timeline.slice(i + 1),
                ],
            }),
        [show, setShow],
    );

    const updateTimelineEventOrders = useCallback(
        (layerIndex: number, newList: NonStartPointEvent[]) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) return;
            const { startPoint } = layer;
            newTimeline[layerIndex] = { startPoint, remainingEvents: newList };
            setShow({ ...show, timeline: newTimeline });
        },
        [show, setShow],
    );

    const updateTimelineEventDurations = useCallback(
        (layerIndex: number, eventId: string, deltaMs: number) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) {
                console.log("Layer not found");
                return;
            }

            const { startPoint, remainingEvents } = layer;

            const updatedEventList = [startPoint, ...remainingEvents];
            const eventToUpdateIndex = updatedEventList.findIndex(
                (event) => event.id === eventId,
            );
            if (eventToUpdateIndex === -1) {
                console.log("Event not found", updatedEventList, layer);
                return;
            }

            const shouldUpdateSubsequentEventDuration =
                timelineDurationUpdateMode ===
                    TimelineDurationUpdateMode.Rolling &&
                eventToUpdateIndex < updatedEventList.length - 1;

            const eventToUpdate = updatedEventList[eventToUpdateIndex];
            const newDurationMs = eventToUpdate.durationMs + deltaMs;
            eventToUpdate.durationMs = Uint32.check(newDurationMs);
            updatedEventList[eventToUpdateIndex] = eventToUpdate;

            if (shouldUpdateSubsequentEventDuration) {
                const subsequentEventIndex = eventToUpdateIndex + 1;
                const subsequentEvent = updatedEventList[subsequentEventIndex];
                const newSubsequentEventDurationMs =
                    subsequentEvent.durationMs - deltaMs;
                subsequentEvent.durationMs = Uint32.check(
                    newSubsequentEventDurationMs,
                );
                updatedEventList[subsequentEventIndex] = subsequentEvent;
            }

            newTimeline[layerIndex] = {
                startPoint: updatedEventList[0] as StartPointEvent,
                remainingEvents: updatedEventList.slice(
                    1,
                ) as NonStartPointEvent[],
            };
            setShow({ ...show, timeline: newTimeline });
        },
        [show, setShow, timelineDurationUpdateMode],
    );

    const addPointToSelectedLayer = useCallback(
        (x: number, y: number) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[selectedLayerIndex];
            if (!layer) return;
            const { startPoint, remainingEvents } = layer;
            const newEvents = [...remainingEvents];
            switch (defaultPointType) {
                case SplinePointType.QuadraticBezier:
                    newEvents.push({
                        type: TimelineEventTypes.GoToPointEvent,
                        durationMs: defaultEventDurationMs,
                        target: {
                            type: SplinePointType.QuadraticBezier,
                            controlPoint: {
                                x: (x - 10) / GRID_CELL_PX,
                                y: (y - 10) / GRID_CELL_PX,
                            },
                            endPoint: {
                                x: x / GRID_CELL_PX,
                                y: y / GRID_CELL_PX,
                            },
                        },
                        id: crypto.randomUUID(),
                    });
                    break;
                case SplinePointType.CubicBezier:
                    newEvents.push({
                        type: TimelineEventTypes.GoToPointEvent,
                        durationMs: defaultEventDurationMs,
                        target: {
                            type: SplinePointType.CubicBezier,
                            endPoint: {
                                x: x / GRID_CELL_PX,
                                y: y / GRID_CELL_PX,
                            },
                            controlPoint: {
                                x: (x + 10) / GRID_CELL_PX,
                                y: (y + 10) / GRID_CELL_PX,
                            },
                            controlPoint2: {
                                x: (x - 10) / GRID_CELL_PX,
                                y: (y - 10) / GRID_CELL_PX,
                            },
                        },
                        id: crypto.randomUUID(),
                    });
                    break;
                default:
                    console.warn("Tried to add point with invalid point type");
                    return;
            }

            newTimeline[selectedLayerIndex] = {
                startPoint,
                remainingEvents: newEvents,
            };
            setShow({ ...show, timeline: newTimeline });
        },
        [
            show,
            setShow,
            selectedLayerIndex,
            defaultPointType,
            defaultEventDurationMs,
        ],
    );

    const removeAudio = useCallback(() => {
        setShow({ ...show, audio: undefined });
    }, [show, setShow]);

    const deleteTimelineEvent = useCallback(
        (layerIndex: number, eventId: string) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) {
                return;
            }
            const { startPoint, remainingEvents } = layer;
            const eventIndex = remainingEvents.findIndex(
                (event) => event.id === eventId,
            );
            const events = [
                ...remainingEvents.slice(0, eventIndex),
                ...remainingEvents.slice(eventIndex + 1),
            ]; // Remove the event
            newTimeline[layerIndex] = { startPoint, remainingEvents: events };
            setShow({ ...show, timeline: newTimeline });
        },
        [show, setShow],
    );

    const addWaitEventAtIndex = useCallback(
        (layerIndex: number, eventIndex: number) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) return;
            const { startPoint, remainingEvents } = layer;
            const events = [...remainingEvents];
            const eventToAdd: WaitEvent = {
                id: crypto.randomUUID(),
                type: TimelineEventTypes.WaitEvent,
                durationMs: defaultEventDurationMs,
            };
            events.splice(eventIndex, 0, eventToAdd);
            newTimeline[layerIndex] = { startPoint, remainingEvents: events };
            setShow({ ...show, timeline: newTimeline });
        },
        [show, defaultEventDurationMs, setShow],
    );

    const addTurnEventAtIndex = useCallback(
        (layerIndex: number, eventIndex: number) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) return;
            const { startPoint, remainingEvents } = layer;
            const events = [...remainingEvents];
            const eventToAdd: TurnEvent = {
                id: crypto.randomUUID(),
                type: TimelineEventTypes.TurnEvent,
                durationMs: defaultEventDurationMs,
                radians: 2 * Math.PI,
            };
            events.splice(eventIndex, 0, eventToAdd);
            newTimeline[layerIndex] = { startPoint, remainingEvents: events };
            setShow({ ...show, timeline: newTimeline });
        },
        [show, defaultEventDurationMs, setShow],
    );

    const getLayerIndexFromEventId = useCallback(
        (eventId: string) => {
            const layerIndex = show.timeline.findIndex((layer) =>
                layer.remainingEvents.find((event) => event.id === eventId),
            );
            return layerIndex;
        },
        [show],
    );

    const addBulkEventsToSelectedLayer = useCallback(
        (events: NonStartPointEvent[]) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[selectedLayerIndex];
            if (!layer) return;
            const { startPoint } = layer;
            newTimeline[selectedLayerIndex] = {
                startPoint,
                remainingEvents: [...layer.remainingEvents, ...events],
            };
            setShow({ ...show, timeline: newTimeline });
        },
        [show, selectedLayerIndex, setShow],
    );

    const showfileApi = useMemo(
        () => ({
            updateTimelineEventOrders,
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
            editName,
            undo,
            redo,
            addRobot,
            currentTimestamp,
            playing,
            togglePlaying,
            startShow,
            deleteLayer,
            canRedo,
            canUndo,
            sequenceLengthMs,
            timelineDurationUpdateMode,
            setTimelineDurationUpdateMode,
            updateTimelineEventDurations,
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
        }),
        [
            updateTimelineEventOrders,
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
            editName,
            undo,
            redo,
            addRobot,
            currentTimestamp,
            playing,
            togglePlaying,
            startShow,
            deleteLayer,
            canRedo,
            canUndo,
            sequenceLengthMs,
            timelineDurationUpdateMode,
            setTimelineDurationUpdateMode,
            updateTimelineEventDurations,
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
        ],
    );

    return showfileApi;
}
