import { createBrowserRouter, redirect } from "react-router-dom";
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
import { AuthProvider } from "./auth/auth";
import { Admin } from "./admin/admin";

export default createBrowserRouter([
    {
        path: "/home",
        element: <Home />,
    },
    {
        path: "/debug/simulator",
        element: <Simulator />,
    },
    {
        path: "/debug",
        element: <Debug />,
    },
    {
        path: "/debug2",
        element: <Debug2 />,
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
        path: "/admin",
        element: <ProtectedRoute />,
        children: [
            {
                path: "",
                element: <Admin />,
            },
        ],
    },
    // {
    //     path: "/editor",
    //     element: <Editor />,
    // },
    {
        path:"*",
        loader: async () => redirect('/lobby'),

    }
]);
