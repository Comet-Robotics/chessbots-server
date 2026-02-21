import type { RequestHandler, Express } from "express";
import express from "express";
// eslint-disable-next-line import/default
import ViteExpress from "vite-express";
import cookieParser from "cookie-parser";
import { apiRouter, websocketHandler } from "./api/api";
import expressWebSocket from "express-ws";
import { clientManager } from "./api/managers";
import launchEditorMiddleware from "launch-editor-middleware";
import { randomUUID } from "node:crypto";

const app = expressWebSocket(express()).app;

app.use(express.json());
app.use(cookieParser());

/**
 * Attaches a unique clientId to req if it does not already exist.
 * The cookie is automatically sent back to the client, stored in the browser, and included by the client in all future requests.
 */
const checkAuthentication: RequestHandler = (req, res, next) => {
    if (!req.cookies.id) {
        res.cookie("id", randomUUID(), {
            // Expires after 1 day
            maxAge: 86400000,
            // Cookie isn't available to client
            httpOnly: true,
        });
    }
    return next();
};

/**
 * Ensure all requests have a clientId cookie.
 */
app.use(checkAuthentication);

/**
 * Registers all players with the client manager.
 */
app.use((req, _, next) => {
    clientManager.assignPlayer(req.cookies.id);
    return next();
});

app.get("/", (_, res) => {
    return res.redirect("/home");
});

app.ws("/ws", websocketHandler);

app.use("/__open-in-editor", launchEditorMiddleware());

app.use("/api", apiRouter);

ViteExpress.listen(app as unknown as Express, 3000, () => {
    console.log("Server is listening on port 3000.");
});

app.addListener("beforeunload", () => {});
