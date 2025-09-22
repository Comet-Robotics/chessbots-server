import ReactDOM from "react-dom/client";

import "./index.scss";

import { FocusStyleManager, BlueprintProvider } from "@blueprintjs/core";
import { RouterProvider } from "react-router-dom";
import { router } from "./router.js";
import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { bgColor } from "./check-dark-mode.js";
import { BeginCheckRefresh } from "./begin-check-refresh.js";
export const queryClient = new QueryClient();

FocusStyleManager.onlyShowFocusOnTabs();

//creates the root of the page and forwards control to the page router
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <>
        <StrictMode>
            {/* Call the refresh function */}
            <BeginCheckRefresh />
            <div id="app-container" className={bgColor()}>
                <BlueprintProvider>
                    <QueryClientProvider client={queryClient}>
                        <RouterProvider router={router} />
                    </QueryClientProvider>
                </BlueprintProvider>
            </div>
        </StrictMode>
        ,
    </>,
);
