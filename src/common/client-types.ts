/**
 * Defines a type of session.
 */
export enum ClientType {
    HOST = "host",
    CLIENT = "client",
    SPECTATOR = "spectate",
}

/**
 * Difficulties available for AI.
 */
export enum Difficulty {
    BABY = 0,
    BEGINNER = 1,
    INTERMEDIATE = 2,
    ADVANCED = 3,
}

/**
 * Opponent options for the game.
 */
export enum GameType {
    COMPUTER = "computer",
    HUMAN = "human",
    HEXAPAWN = "hexapawn",
}
