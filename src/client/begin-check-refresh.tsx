//we have to put this in a separate file because in order for fast refresh to work, all react functions that are exported
//must be exported in a different file from regular functions. Hence we can't put it with check-dark-mode.tsx.

import { useEffect } from "react";

//we can check the refreshing and set it to false.
export function BeginCheckRefresh() {
    useEffect(() => {
        localStorage.setItem("refreshing", "false");
    }, []);

    return null; // No UI needed
}
