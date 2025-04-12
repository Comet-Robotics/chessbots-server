import { decode as cborDecode, encode as cborEncode } from "cbor-x";
import {
    forwardRef,
    PropsWithChildren,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from "react";
import {
    ContextMenu,
    Menu,
    MenuItem,
    MenuDivider,
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
    HotkeyConfig,
} from "@blueprintjs/core";
import {
    Coords,
    CubicBezier,
    Point,
    QuadraticBezier,
    Spline,
    SplinePointType,
    splineToSvgDrawAttribute,
} from "../../common/spline";
import { RobotGrid, robotSize } from "../debug/simulator";

import { fileOpen, fileSave } from "browser-fs-access";
import {
    createNewShowfile,
    ShowfileSchema,
    timelineLayerToSpline,
} from "../../common/show";

export function Editor() {
    const [initialShow, setInitialShow] = useState(createNewShowfile());
    const {
        value: show,
        canUndo,
        canRedo,
        undo,
        redo,
    } = useStateWithTrackedHistory(initialShow);

    // TODO: fix viewport height / timeline height
    const [unsavedChanges, setUnsavedChanges] =
        usePreventExitWithUnsavedChanges();
    const [fsHandle, setFsHandle] = useState<FileSystemFileHandle | null>(null);

    const openShowfile = useCallback(async () => {
        const blob = await fileOpen({
            mimeTypes: ["application/chessbots-showfile"],
            extensions: ["cbor"],
        });

        let data: unknown | null = null;
        try {
            data = cborDecode(await blob.bytes());
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
        if (blob.handle) setFsHandle(blob.handle);

        setUnsavedChanges(false);
    }, []);

    function saveShowfileAs() {
        // TODO: implement
        setUnsavedChanges(false);
    }

    async function saveShowfile() {

        const blob = new Blob([cborEncode(initialShow)], {
            type: "application/chessbots-showfile",
        });
        await fileSave(
            blob,
            {
                mimeTypes: ["application/chessbots-showfile"],
                extensions: ["cbor"],
                fileName: show.name + ".cbor",
            },
            fsHandle,
        );

        setUnsavedChanges(false);
    }

    const hotkeys = useMemo<HotkeyConfig[]>(
        () => [
            {
                combo: "mod+s",
                group: "Debug",
                global: true,
                label: "Save",
                onKeyDown: (e) => {
                    e.preventDefault();
                    saveShowfile();
                },
            },
            {
                combo: "mod+z",
                group: "Debug",
                global: true,
                label: "Undo",
                onKeyDown: undo,
            },
            {
                combo: "mod+y",
                group: "Debug",
                global: true,
                label: "Redo",
                onKeyDown: redo,
            },
            {
                combo: "mod+shift+s",
                group: "Debug",
                global: true,
                label: "Save As...",
                onKeyDown: (e) => {
                    e.preventDefault();
                    saveShowfileAs();
                },
            },
            {
                combo: "mod+o",
                group: "Debug",
                global: true,
                label: "Open...",
                onKeyDown: (e) => {
                    e.preventDefault();
                    openShowfile();
                },
            },
        ],
        [redo, undo, saveShowfile, saveShowfileAs, openShowfile],
    );

    const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

    return (
        <div
            style={{ height: "100vh" }}
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
                            value="New Show"
                        />
                    </H2>
                    {unsavedChanges && <Tag intent="warning" minimal style={{ gridColumn: "1/1" }}>
                        Unsaved changes
                    </Tag>}
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
                        text="Save As..."
                        onClick={saveShowfileAs}
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
                </ButtonGroup>
            </Card>
            <RobotGrid robotState={{}}>
                {/* TODO: think more about how state changes will make it up from the editor to this component */}
                {show.timeline
                    .map((layer) => timelineLayerToSpline(layer))
                    .map((spline) => (
                        <SplineEditor initialSpline={spline} />
                    ))}
            </RobotGrid>
            <Section
                title="Timeline"
                compact
                style={{ height: "100%" }}
                rightElement={<Button icon="add" text="Add Robot" />}
            >
                <div
                    style={{
                        overflowY: "scroll",
                        maxHeight: "100%",
                        display: "grid",
                        gridTemplateColumns: "max-content 1fr",
                        gap: "0rem 0.5rem",
                    }}
                >
                    {/* TODO: figure out timeline UI */}
                    <TimelineRow title="Audio"> Stuff here</TimelineRow>
                    {show.timeline.map((_, i) => (
                        <TimelineRow title={`Robot ${i + 1}`}>
                            Stuff here
                        </TimelineRow>
                    ))}
                </div>
            </Section>
        </div>
    );
}

const TimelineRow = forwardRef<
    HTMLDivElement,
    PropsWithChildren<{ title: string }>
>(function TimelineCard(props, ref) {
    const { title, children } = props;
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
            <Text style={{ fontWeight: "bold" }}>{title}</Text>
            {children}
        </SectionCard>
    );
});

function SplineEditor({ initialSpline }: { initialSpline: Spline }) {
    type SplineEditorAction =
        | { type: "DELETE_POINT"; index: number }
        | { type: "DELETE_START_POINT" }
        | { type: "MOVE_POINT_ENDPOINT"; coords: Coords; index: number }
        | { type: "MOVE_START_POINT"; coords: Coords }
        | { type: "MOVE_CONTROL_POINT"; coords: Coords; index: number }
        | { type: "SWITCH_TO_QUADRATIC"; index: number }
        | { type: "SWITCH_TO_CUBIC"; index: number };

    const [spline, dispatch] = useReducer(
        (state: Spline, action: SplineEditorAction): Spline => {
            switch (action.type) {
                case "DELETE_POINT": {
                    return {
                        ...state,
                        points: state.points.toSpliced(action.index, 1),
                    };
                }
                case "DELETE_START_POINT": {
                    if (state.points.length === 0) return state;
                    return {
                        ...state,
                        start: {
                            type: SplinePointType.StartPoint,
                            point: state.points[0].endPoint,
                        },
                        points: state.points.slice(1),
                    };
                }
                case "MOVE_POINT_ENDPOINT": {
                    const newPoints = [...state.points];
                    newPoints[action.index].endPoint = action.coords;
                    return { ...state, points: newPoints };
                }
                case "MOVE_START_POINT": {
                    return {
                        ...state,
                        start: {
                            type: SplinePointType.StartPoint,
                            point: action.coords,
                        },
                    };
                }
                case "MOVE_CONTROL_POINT": {
                    const point = state.points[action.index];
                    if (point.type !== SplinePointType.CubicBezier) {
                        return state;
                    }

                    point.controlPoint = action.coords;

                    const newPoints = [...state.points];
                    newPoints[action.index] = point;

                    return { ...state, points: newPoints };
                }
                case "SWITCH_TO_QUADRATIC": {
                    const point = state.points[action.index];
                    if (point.type !== SplinePointType.CubicBezier) {
                        return state;
                    }

                    const newPoint: QuadraticBezier = {
                        type: SplinePointType.QuadraticBezier,
                        endPoint: point.endPoint,
                    };

                    const newPoints = [...state.points];
                    newPoints[action.index] = newPoint;

                    return { ...state, points: newPoints };
                }
                case "SWITCH_TO_CUBIC": {
                    const point = state.points[action.index];
                    if (point.type !== SplinePointType.QuadraticBezier) {
                        return state;
                    }

                    const newPoint: CubicBezier = {
                        type: SplinePointType.CubicBezier,
                        controlPoint: {
                            x: point.endPoint.x / 2,
                            y: point.endPoint.y / 2,
                        },
                        endPoint: point.endPoint,
                    };

                    const newPoints = [...state.points];
                    newPoints[action.index] = newPoint;

                    return { ...state, points: newPoints };
                }
            }

            return state;
        },
        initialSpline,
    );
    const path = useMemo(() => splineToSvgDrawAttribute(spline), [spline]);
    return (
        <>
            <svg
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                }}
            >
                <path d={path} stroke="purple" strokeWidth={3} fill="none" />
            </svg>
            <SplinePoint
                point={spline.start}
                deleteFn={
                    spline.points.length > 0 ?
                        () => dispatch({ type: "DELETE_START_POINT" })
                    :   undefined
                }
                moveFn={(x, y) =>
                    dispatch({ type: "MOVE_START_POINT", coords: { x, y } })
                }
            />
            {spline.points.map((point, index) => (
                <>
                    <SplinePoint
                        point={point}
                        deleteFn={() =>
                            dispatch({ type: "DELETE_POINT", index })
                        }
                        moveFn={(x, y) =>
                            dispatch({
                                type: "MOVE_POINT_ENDPOINT",
                                coords: { x, y },
                                index,
                            })
                        }
                        switchToQuadraticFn={() =>
                            dispatch({ type: "SWITCH_TO_QUADRATIC", index })
                        }
                        switchToCubicFn={() =>
                            dispatch({ type: "SWITCH_TO_CUBIC", index })
                        }
                    />
                    {/* TODO: add line between control point and end point */}
                    {point.type === SplinePointType.CubicBezier && (
                        <SplineControlPoint
                            point={point.controlPoint}
                            moveControlFn={(x, y) =>
                                dispatch({
                                    type: "MOVE_CONTROL_POINT",
                                    coords: { x, y },
                                    index,
                                })
                            }
                        />
                    )}
                </>
            ))}
        </>
    );
}

function SplinePoint({
    point,
    moveFn,
    switchToQuadraticFn = undefined,
    switchToCubicFn = undefined,
    deleteFn = undefined,
}: {
    point: Point;
    moveFn: (x: number, y: number) => void;
    deleteFn?: () => void;
    switchToQuadraticFn?: () => void;
    switchToCubicFn?: () => void;
}) {
    // TODO: fix context menu positioning

    const mainPointRef = useRef<HTMLElement>(null);
    useDraggable(mainPointRef, (screenX, screenY) =>
        moveFn(screenX + robotSize / 4, screenY + robotSize / 4),
    );

    const mainPointColor =
        point.type === SplinePointType.StartPoint ? "blue" : "black";
    const mainCoords =
        point.type === SplinePointType.StartPoint ?
            point.point
        :   point.endPoint;

    return (
        <ContextMenu
            content={
                <Menu>
                    {point.type === SplinePointType.CubicBezier && (
                        <MenuItem
                            text="Switch to Quadratic"
                            onClick={switchToQuadraticFn}
                        />
                    )}
                    {point.type === SplinePointType.QuadraticBezier && (
                        <MenuItem
                            text="Switch to Cubic"
                            onClick={switchToCubicFn}
                        />
                    )}
                    <MenuItem
                        text="Delete..."
                        intent="danger"
                        onClick={deleteFn}
                        disabled={!deleteFn}
                    />
                    <MenuDivider />
                    <MenuItem disabled={true} text={`Type: ${point.type}`} />
                </Menu>
            }
        >
            <span
                ref={mainPointRef}
                style={{
                    width: robotSize / 2,
                    height: robotSize / 2,
                    backgroundColor: mainPointColor,
                    borderRadius: "50%",
                    position: "absolute",
                    left: mainCoords.x - robotSize / 4,
                    top: mainCoords.y - robotSize / 4,
                    cursor: "grab",
                }}
            />
        </ContextMenu>
    );
}

function SplineControlPoint({
    point,
    moveControlFn,
}: {
    point: Coords;
    moveControlFn: (x: number, y: number) => void;
}) {
    const controlPointRef = useRef<HTMLElement>(null);
    useDraggable(controlPointRef, (screenX, screenY) =>
        moveControlFn(screenX + robotSize / 4, screenY + robotSize / 4),
    );

    return (
        <span
            ref={controlPointRef}
            style={{
                width: robotSize / 2,
                height: robotSize / 2,
                backgroundColor: "red",
                borderRadius: "50%",
                position: "absolute",
                left: point.x - robotSize / 4,
                top: point.y - robotSize / 4,
                cursor: "grab",
            }}
        />
    );
}

function useDraggable(
    elRef: RefObject<HTMLElement>,
    updatePosition: (screenX: number, screenY: number) => void,
) {
    useEffect(() => {
        const el = elRef.current;
        if (!el) return;

        let pos1 = 0,
            pos2 = 0,
            pos3 = 0,
            pos4 = 0;

        const onMouseDown = (e) => {
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // call a fn whenever the cursor moves:
            document.onmousemove = elementDrag;
        };

        const elementDrag = (e) => {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            const x = el.offsetLeft - pos1;
            const y = el.offsetTop - pos2;
            updatePosition(x, y);
        };

        const closeDragElement = () => {
            document.onmouseup = null;
            document.onmousemove = null;
        };

        el.addEventListener("mousedown", onMouseDown);

        return () => {
            el.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mousemove", elementDrag);
            document.removeEventListener("mouseup", closeDragElement);
        };
    }, [elRef, updatePosition]);
}

function usePreventExitWithUnsavedChanges() {
    const [unsavedChanges, setUnsavedChanges] = useState(true);

    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (unsavedChanges) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", onBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", onBeforeUnload);
        };
    }, [unsavedChanges]);

    return [unsavedChanges, setUnsavedChanges] as const;
}

function useStateWithTrackedHistory<T>(initialValue: T) {
    type Action =
        | { type: "set"; value: T }
        | { type: "undo" }
        | { type: "redo" }
        | { type: "replace"; value: T };
    type State = {
        value: T;
        history: T[];
        index: number;
    };
    const [state, dispatch] = useReducer(
        (state: State, action: Action) => {
            switch (action.type) {
                case "set":
                    return {
                        ...state,
                        value: action.value,
                        history: [...state.history, state.value],
                        index: state.history.length,
                    };
                case "undo":
                    if (state.index === 0) return state;
                    return {
                        ...state,
                        value: state.history[state.index - 1],
                        index: state.index - 1,
                    };
                case "redo":
                    if (state.index === state.history.length) return state;
                    return {
                        ...state,
                        value: state.history[state.index + 1],
                        index: state.index + 1,
                    };
                case "replace":
                    return {
                        ...state,
                        value: action.value,
                        history: [],
                        index: 0,
                    };
            }
        },
        {
            value: initialValue,
            history: [],
            index: 0,
        },
    );

    const undo = useCallback(() => dispatch({ type: "undo" }), []);
    const redo = useCallback(() => dispatch({ type: "redo" }), []);
    const canUndo = state.index > 0;
    const canRedo = state.index < state.history.length - 1;

    const setValue = useCallback((value: T) => {
        dispatch({ type: "set", value });
    }, []);

    const { value } = state;

    return { value, setValue, canUndo, canRedo, undo, redo };
}
