import { createBrowserRouter } from "react-router-dom";
import { Setup } from "./setup/setup";
import { Debug } from "./debug/debug";
import { Game } from "./game/game";
import { Lobby } from "./setup/lobby";
import { Home } from "./home";
import { Debug2 } from "./debug/debug2";
import { Simulator } from "./debug/simulator";
import { Editor } from "./editor/editor";
import { ProtectedRoute } from "./auth/protectedRoute";
import Login from "./auth/login";
import AuthProvider from "./auth/auth";
import { Admin } from "./admin/admin";

export const router = createBrowserRouter([
    {
        element: <AuthProvider />,
        children: [
            {
                path: "/home",
                element: <Home />,
            },
            {
                path: "/setup",
                element: <Setup />,
            },
            {
                path: "/lobby",
                element: <Lobby />,
            },
            {
                path: "/game",
                element: <Game />,
            },
            {
                path: "/editor",
                element: <Editor />,
            },
            {
                path: "/login",
                element: <Login />,
            },
            {
                path: "/debug",
                element: <ProtectedRoute />,
                children: [
                    {
                        path: "",
                        element: <Debug />,
                    },
                    {
                        path: "2",
                        element: <Debug2 />,
                    },
                    {
                        path: "simulator",
                        element: <Simulator />,
                    },
                ],
            },
            {
                path: "/admin",
                element: <ProtectedRoute />,
                children: [
                    {
                        path: "",
                        element: <Admin />,
                    },
                ],
            },
        ],
    },
]);
