import { useMotionValue, useTime, useMotionValueEvent } from "motion/react";
import {
    type RefObject,
    useEffect,
    useState,
    useReducer,
    useCallback,
    useMemo,
} from "react";

export function useDraggable(
    elRef: RefObject<HTMLElement>,
    updatePosition: (screenX: number, screenY: number) => void,
) {
    useEffect(() => {
        const el = elRef.current;
        if (!el) return;

        // TODO: better name for these?
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

/*
 * A hook that prevents the user from exiting the page with unsaved changes.
 *
 * The hook provides a boolean indicating if there are unsaved changes, and a function to set the unsaved changes state.
 */
export function usePreventExitWithUnsavedChanges() {
    const [unsavedChanges, setUnsavedChanges] = useState(false);

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

/*
 * A hook that provides a state with a history of changes, and undo/redo functionality.
 *
 * The state is a simple object with a value and a history of values, and an index into the history.
 * The value is the current state of the state, and the history is an array of all the previous states.
 * The index is the index into the history of the current state.
 *
 * The hook also provides functions to set the value, undo, redo, and check if the state can be undone or redone.
 *
 * The hook also provides a callback to replace the current value with a new value, which is useful for the first time you load data since that shouldn't count as a tracked action.
 */
export function useStateWithTrackedHistory<T>(initialValue: T) {
    type Action =
        | { type: "set"; value: T }
        | { type: "undo" }
        | { type: "redo" }
        | { type: "replace"; value: T };
    type State = {
        history: T[];
        index: number;
    };
    const [state, dispatch] = useReducer(
        (state: State, action: Action): State => {
            switch (action.type) {
                case "set": {
                    // Truncate history after the current index if we've undone previously
                    const newHistory = state.history.slice(0, state.index + 1);
                    newHistory.push(action.value);
                    return {
                        history: newHistory,
                        index: newHistory.length - 1,
                    };
                }
                case "undo": {
                    if (state.index === 0) return state; // Cannot undo past the initial state
                    return {
                        ...state,
                        index: state.index - 1,
                    };
                }
                case "redo": {
                    // Cannot redo if already at the latest state
                    if (state.index === state.history.length - 1) return state;
                    return {
                        ...state,
                        index: state.index + 1,
                    };
                }
                case "replace": {
                    // Reset history with the new value
                    return {
                        history: [action.value],
                        index: 0,
                    };
                }
            }
        },
        // Initial state: history contains only the initial value at index 0
        {
            history: [initialValue],
            index: 0,
        },
    );

    const value = useMemo(
        () => state.history[state.index],
        [state.history, state.index],
    );
    const setValue = useCallback(
        (newValue: T) => {
            // Avoid adding identical consecutive states to history
            if (newValue !== value) {
                dispatch({ type: "set", value: newValue });
            }
        },
        [value],
    ); // Add value dependency to check against current value

    const undo = useCallback(() => dispatch({ type: "undo" }), []);
    const redo = useCallback(() => dispatch({ type: "redo" }), []);
    const canUndo = useMemo(() => state.index > 0, [state.index]);
    const canRedo = useMemo(
        () => state.index < state.history.length - 1,
        [state.index, state.history.length],
    );
    // Add a function to replace the state without affecting history tracking logic like 'set' does
    const replaceState = useCallback((newValue: T) => {
        dispatch({ type: "replace", value: newValue });
    }, []);

    return { value, setValue, canUndo, canRedo, undo, redo, replaceState }; // Expose replaceState if needed
}

export function usePlayHead(endDurationMs: number, startMs = 0) {
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
