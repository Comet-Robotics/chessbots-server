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

export function useStateWithTrackedHistory<T>(initialValue: T) {
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
    const canUndo = useMemo(() => state.index > 0, [state.index]);
    const canRedo = useMemo(() => state.index < state.history.length - 1, [state.index, state.history.length]);

    const setValue = useCallback((value: T) => {
        dispatch({ type: "set", value });
    }, []);

    const { value } = state;

    return { value, setValue, canUndo, canRedo, undo, redo };
}
