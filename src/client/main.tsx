import ReactDOM from "react-dom/client";

import "./index.scss";

import { FocusStyleManager, BlueprintProvider } from "@blueprintjs/core";
import { RouterProvider } from "react-router-dom";
import routes from "./router";
import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
export const queryClient = new QueryClient();

FocusStyleManager.onlyShowFocusOnTabs();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <>
        <StrictMode>
            <div id="app-container">
                <BlueprintProvider>
                    <QueryClientProvider client={queryClient}>
                        <RouterProvider router={routes} />
                    </QueryClientProvider>
                </BlueprintProvider>
            </div>
        </StrictMode>
        ,
    </>,
);
