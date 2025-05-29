/**
 * This module creates global singleton instances of the various manager classes.
 */

import { RobotManager } from "../robot/robot-manager";
import { ClientManager } from "./client-manager";
import { SocketManager } from "./socket-manager";
//import { virtualRobots } from "../simulator";
//import { USE_VIRTUAL_ROBOTS } from "../utils/env";
import { Robot } from "../robot/robot";
import { GridIndices } from "../robot/grid-indices";

export const socketManager = new SocketManager({});
export const clientManager = new ClientManager(socketManager);
export const robotManager = new RobotManager(
    [
        new Robot("robot-12", new GridIndices(0, 5), new GridIndices(5, 3)),
        new Robot("robot-4", new GridIndices(5, 0), new GridIndices(5, 2)),
    ],
    //USE_VIRTUAL_ROBOTS ? Array.from(virtualRobots.values()) : [],
);
