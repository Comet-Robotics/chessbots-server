// @ts-expect-error: chessbots client is a CommonJS module, but this library is a ES Module, so we need to tell TypeScript that it's okay
import { decode as cborDecode, encode as cborEncode } from "cbor-x";

// @ts-expect-error: chessbots client is a CommonJS module, but this library is a ES Module, so we need to tell TypeScript that it's okay
import { fileOpen, fileSave } from "browser-fs-access";

import { diff } from "deep-object-diff";
import { useState, useEffect, useCallback, useRef } from "react";
import {
    createNewShowfile,
    ShowfileSchema,
    StartPointEvent,
    TimelineEventTypes,
    GoToPointEvent,
    TimelineLayer,
    NonStartPointEvent,
} from "../../common/show";
import {
    SplinePointType,
    CubicBezier,
    QuadraticBezier,
    type Coords,
} from "../../common/spline";
import {
    usePlayHead,
    usePreventExitWithUnsavedChanges,
    useStateWithTrackedHistory,
} from "./hooks";

export function useShowfile() {
    const [initialShow, setInitialShow] = useState(createNewShowfile());

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
                    id: crypto.randomUUID(),
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
                console.warn("Tried to switch point type with invalid type");
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

    const editName = useCallback(
        (value: string) => setShow({ ...show, name: value }),
        [show, setShow],
    );

    const addRobot = useCallback(() => {
        const newLayer: TimelineLayer = [
            {
                id: crypto.randomUUID(),
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

    // TODO: figure out how to get this from the showfile
    const sequenceLengthMs = 10 * 1000;

    const { currentTimestamp, playing, togglePlaying } =
        usePlayHead(sequenceLengthMs);

    const { audio } = show;
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

    const deleteLayer = useCallback(
        (i: number) =>
            setShow({
                ...show,
                timeline: show.timeline.toSpliced(i, 1),
            }),
        [show, setShow],
    );

    const updateTimelineEventOrders = useCallback(
        (layerIndex: number, newList: NonStartPointEvent[]) => {
            const newTimeline = [...show.timeline];
            const layer = newTimeline[layerIndex];
            if (!layer) return;
            const [startPoint] = layer;
            newTimeline[layerIndex] = [startPoint, newList];
            setShow({ ...show, timeline: newTimeline });
        },
        [show, setShow],
    );

    return {
        updateTimelineEventOrders,
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
        editName,
        undo,
        redo,
        addRobot,
        currentTimestamp,
        playing,
        togglePlaying,
        deleteLayer,
        canRedo,
        canUndo,
        sequenceLengthMs,
    };
}
