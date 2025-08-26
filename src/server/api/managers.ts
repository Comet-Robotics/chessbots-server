/**
 * This module creates global singleton instances of the various manager classes.
 */

import { ClientManager } from "./client-manager";
import { SocketManager } from "./socket-manager";

export const socketManager = new SocketManager({});
export const clientManager = new ClientManager(socketManager);
