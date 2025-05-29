/**
 * This module creates global singleton instances of the various manager classes.
 */

import { RobotManager } from "../robot/robot-manager";
import { ClientManager } from "./client-manager";
import { SocketManager } from "./socket-manager";
import { virtualRobots } from "../simulator";
import { USE_VIRTUAL_ROBOTS } from "../utils/env";
import { Robot } from "../robot/robot";
import { GridIndices } from "../robot/grid-indices";
import { DEGREE } from "../../common/units";


/**
 * A class which lazily creates a singleton instance of a class, allowing us to hold off on creating the 
 * instance until it is first accessed, and then store that instance for future use.
 * 
 * By using a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 
 * and some magic, this works completely transparently to any downstream consumers of these singletons. 
 *
 * This is mainly used as a workaround to avoid issues with circular imports. 
 * 
 * Example: Previously, tests would fail because simulator code needs to import the singleton `socketManager` 
 * from this file to send messages to all clients, but this file also needs to import the list of virtual 
 * robots from the simulator code, creating a circular import.
 * 
 * The fact that it was necessary to write this class makes me think that there is a need to refactor some of the 
 * code to see if we can avoid the circular imports, and use a more modular approach that isn't so tightly coupled
 * to global singletons. 
 * The ClientManager uses a dependency injection pattern, so the socketManager gets passed into the ClientManager
 * instead of referring to the global singleton directly, which is possibly a good pattern to employ more often
 * in the future, but for now, I'll just apologize that you had to read this code :p
 */
class LazySingleton<T extends object> {
    private _instance: T | null = null;
    private readonly factory: () => T;

    constructor(factory: () => T) {
        this.factory = factory;
    }

    private get instance(): T {
        if (!this._instance) {
            this._instance = this.factory();
        }
        return this._instance;
    }

    get lazyInstance(): T {
        return new Proxy(this, {
            get(target, prop, receiver) {
                return Reflect.get(target.instance, prop, receiver);
            },
        }) as unknown as T;
    }
}

export const socketManager = new LazySingleton(() => new SocketManager({})).lazyInstance;
export const clientManager = new LazySingleton(() => new ClientManager(socketManager)).lazyInstance;
export const robotManager = new LazySingleton(() => new RobotManager(
    USE_VIRTUAL_ROBOTS ?
        Array.from(virtualRobots.values())
    :   [
            new Robot(
                "robot-12",
                new GridIndices(0, 5),
                new GridIndices(5, 3),
                90 * DEGREE,
            ),
            new Robot(
                "robot-4",
                new GridIndices(5, 0),
                new GridIndices(5, 2),
                90 * DEGREE,
            ),
        ],
)).lazyInstance;
