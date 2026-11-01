export type HotkeyCallbacks = {
    saveShowfile: () => void,
    openShowfile: () => void,
    undo: () => void,
    redo: () => void,
    togglePlaying: () => void,
    getLayerIndexFromEventId: (string) => void,
    addBulkEventsToSelectedLayer: (any) => void
}

export let hotkeys = (callbacks: HotkeyCallbacks) => {
    return [
        {
            combo: "mod+s",
            group: "File",
            global: true,
            label: "Save",
            onKeyDown: (e) => {
                e.preventDefault();
                callbacks.saveShowfile();
            },
        },
        {
            combo: "mod+o",
            group: "File",
            global: true,
            label: "Open...",
            onKeyDown: (e) => {
                e.preventDefault();
                callbacks.openShowfile();
            },
        },
        {
            combo: "mod+z",
            group: "Edit",
            global: true,
            label: "Undo",
            onKeyDown: (e) => {
                e.preventDefault();
                callbacks.undo();
            },
        },
        {
            combo: "mod+y",
            group: "Edit",
            global: true,
            label: "Redo",
            onKeyDown: (e) => {
                e.preventDefault();
                callbacks.redo();
            },
        },
        {
            combo: "space",
            group: "Play/Pause",
            global: true,
            label: "Play/Pause",
            onKeyDown: (e) => {
                e.preventDefault();
                callbacks.togglePlaying();
            },
        },
        {
            combo: "mod+c",
            group: "Editor",
            global: true,
            label: "Copy",
            onKeyDown: async (e) => {
                const selection = window.getSelection();
                if (!selection) return;

                const startEl =
                    selection?.anchorNode?.parentElement?.parentElement;
                const endEl =
                    selection?.focusNode?.parentElement?.parentElement;
                if (!startEl || !endEl) return;
                console.log(startEl, endEl);

                if (
                    startEl.parentNode?.parentNode?.parentNode !==
                    endEl.parentNode?.parentNode?.parentNode
                ) {
                    console.warn(
                        "Selection is not within the same layer",
                        startEl.parentNode?.parentNode?.parentNode,
                        endEl.parentNode?.parentNode?.parentNode,
                    );
                    return;
                }

                const timelineEventIdRegex = /^timeline-event-(.+)$/;
                const startElId = startEl.id;
                const endElId = endEl.id;
                const startEventId =
                    startElId.match(timelineEventIdRegex)?.[1];
                const endEventId = endElId.match(timelineEventIdRegex)?.[1];
                console.log(startEventId, endEventId);

                if (!startEventId || !endEventId) return;

                e.preventDefault();
                e.stopPropagation();

                console.log("WOO");

                const layerIndex = callbacks.getLayerIndexFromEventId(startEventId);
                if (layerIndex === -1) {
                    console.warn("Layer not found");
                    return;
                }

                const layer = show.timeline[layerIndex];

                const startIdx = layer.remainingEvents.findIndex(
                    (event) => event.id === startEventId,
                );
                const endIdx = layer.remainingEvents.findIndex(
                    (event) => event.id === endEventId,
                );

                if (startIdx === -1 || endIdx === -1) return;

                const selectedEvents = layer.remainingEvents.slice(
                    startIdx,
                    endIdx + 1,
                );
                // console.log(selectedEvents);

                await navigator.clipboard.writeText(
                    JSON.stringify(selectedEvents),
                );
            },
        },
        {
            combo: "mod+v",
            group: "Editor",
            global: true,
            label: "Paste",
            onKeyDown: async (e) => {
                const pasteResult = await navigator.clipboard.readText();
                if (!pasteResult) return;

                let pastedEvents: unknown;
                try {
                    pastedEvents = JSON.parse(pasteResult);
                } catch (e) {
                    console.warn("Failed to parse pasted events", e);
                    return;
                }

                if (!Array.isArray(pastedEvents)) {
                    console.warn("Pasted events are not an array");
                    return;
                }

                const checkResult = RArray(
                    NonStartPointEventSchema,
                ).validate(pastedEvents);
                if (!checkResult.success) {
                    console.warn(
                        "Pasted events are not valid",
                        checkResult,
                    );
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                for (const event of checkResult.value) {
                    event.id = crypto.randomUUID();
                }

                callbacks.addBulkEventsToSelectedLayer(checkResult.value);
            },
        },
    ]
}