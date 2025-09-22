import { createBrowserRouter } from "react-router-dom";
import { Setup } from "./setup/setup.js";
import { Debug } from "./debug/debug.js";
import { Game } from "./game/game.js";
import { Lobby } from "./setup/lobby.js";
import { Home } from "./home.js";
import { Debug2 } from "./debug/debug2.js";
import { Simulator } from "./debug/simulator.js";
import { Editor } from "./editor/editor.js";

export const router = createBrowserRouter([
    { path: "/home", element: <Home /> },
    { path: "/debug/simulator", element: <Simulator /> },
    { path: "/debug", element: <Debug /> },
    { path: "/debug2", element: <Debug2 /> },
    { path: "/setup", element: <Setup /> },
    { path: "/lobby", element: <Lobby /> },
    { path: "/game", element: <Game /> },
    { path: "/editor", element: <Editor /> },
]);
