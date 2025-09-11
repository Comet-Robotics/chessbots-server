/**
 * Defines messages sent across web sockets between the server and the client (and/or the client and the server).
 *
 * To add a new message, first add a member to MessageType, then create a corresponding class which extends `Message` and implements the `type` method and the `toObj` method.
 * Finally, add a corresponding case to `parseMessage` in `./parse-message`.
 */
export enum MessageType {
    /**
     * A client-server message used to register a websocket with the server.
     */
    REGISTER_WEBSOCKET = "register-websocket",
    /**
     * A server-client message defining the current position of a game.
     * Used to allow clients to reconnect.
     */
    POSITION = "position",
    /**
     * A two-way message containing a single move.
     */
    MOVE = "move",
    /**
     * Sets the client chess engine
     */
    SET_CHESS = "set-chess",
    /**
     * A server-client message used to tell player two a game has started.
     */
    GAME_STARTED = "game-started",
    /**
     * A two-way message indicating a game has been interrupted.
     *
     * Note this does not include the game ending as a part of the normal flow of moves.
     */
    GAME_INTERRUPTED = "game-interrupted",
    /**
     * Indicates the game is waiting for a user to respond
     */
    GAME_HELD = "game-held",
    /**
     * Indicates the game is finished and should be restarted
     */
    GAME_FINISHED = "game-finished",
    /**
     * Indicates the game has ended
     */
    GAME_ENDED = "game-ended",
    /**
     * A client-server message containing instructions for manually driving a robot.
     */
    DRIVE_ROBOT = "drive-robot",
    /**
     * A client-server message used to update a variable (like rotations per square) on a robot.
     */
    SET_ROBOT_VARIABLE = "set-robot-variable",
    /**
     * A message sent from server to all clients for updating the robot simulator.
     */
    SIMULATOR_UPDATE = "simulator-update",
    /**
     * A message for a client to join the game queue
     */
    JOIN_QUEUE = "join-queue",
    /**
     * A message for the server to update queues
     */
    UPDATE_QUEUE = "update-queue",
}

/**
 * The base class for messages
 *
 * all messages have a type and can be converted to json
 */
export abstract class Message {
    /**
     * Serializes the message as json.
     */
    public toJson(): string {
        return JSON.stringify(this.toObj());
    }

    protected abstract type: MessageType;

    /**
     * Sends this class to an object which can be serialized as json.
     * The only usage of this method is by `toJson`.
     */
    protected toObj(): object {
        return { type: this.type };
    }
}

/**
 * A message to register the client with the server
 */
export class RegisterWebsocketMessage extends Message {
    protected type = MessageType.REGISTER_WEBSOCKET;
}

/**
 * A function which can be used to send a message somewhere.
 */
export type SendMessage = (message: Message) => void;

/**
 * A function which receives messages and should do stuff with them.
 */
export type MessageHandler = (message: Message) => void;
