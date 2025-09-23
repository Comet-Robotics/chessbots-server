/**
 * Save Manager
 *
 * Manages server side game saves
 * Saves and loads games from separate files on disk
 * Keeps track of clients via cookie ids
 * All methods are static in case the server crashes
 *
 * Created: 9/12/24
 * Modified: 9/20/24
 */

import { Side } from "../../common/game-types";
2;

// Save files contain a date in ms and pgn string
export interface iSave {
    host: string;
    date: number;
    hostWhite: boolean;
    aiDifficulty: number;
    game: string;
    pos: string;
    robotPos: Array<[string, string]>;
    oldPos: string;
    oldRobotPos: Array<[string, string]>;
}

export class SaveManager {
    /**
     * saveGame
     *
     * Finds or creates a save file
     * Save name is host id + client id
     * Saves include the game start time and save fen as json
     * Robots are saved as a map of indices to robots
     * Input: host id, client id, game fen, robots
     * Output: boolean competed
     */
    public static saveGame(
        hostId: string,
        clientID: string,
        hostSide: Side,
        aiDiff: number,
        pgn: string,
        fen: string,
        robots: Map<string, string>,
    ) {
        const day = new Date().getTime();
        const side = hostSide === Side.WHITE;
        console.log(JSON.stringify(robots));
        const saveContents = {
            host: hostId,
            date: day,
            hostWhite: side,
            aiDifficulty: aiDiff,
            game: pgn,
            pos: fen,
            robotPos: Array.from(robots),
            oldPos: "",
            oldRobotPos: Array<[string, string]>(),
        };
        const oldGame = SaveManager.loadGame(hostId + "+" + clientID);
        if (oldGame && oldGame.pos !== null) {
            saveContents.oldPos = oldGame.game;
            saveContents.oldRobotPos = oldGame.robotPos;
        }
        return FileManager.writeFile(hostId + "+" + clientID, saveContents);
    }

    /**
     * Find Game
     *
     * takes a single id and searches for the save file
     *
     * Input: id, game pgn
     * Ouput: string file name
     */
    public static findGame(id: string): string {
        const entryNames = FileManager.getFileNames();
        let entryFound;
        for (const e of entryNames) {
            if (e.indexOf(id) !== -1) {
                entryFound = e;
                break;
            }
        }
        return entryFound;
    }

    /**
     * loadGame
     *
     * Locates and returns save based on id
     *
     * Input: id
     * Output: iSave
     */
    public static loadGame(id: string): undefined | iSave {
        const entryNames = FileManager.getFileNames();
        let entryFound;
        for (const e of entryNames) {
            if (e.indexOf(id) !== -1) {
                entryFound = e;
                break;
            }
        }
        if (entryFound) {
            const save = FileManager.loadFile(entryFound);
            return save;
        }
        return;
    }

    /**
     * endGame
     *
     * removes game when finished
     * redundant? maybe
     *
     * Input: host id, client id
     * Output: boolean isSuccessful
     */
    public static endGame(hostId: string, clientId: string) {
        return FileManager.deleteFile(hostId + "+" + clientId);
    }

    /**
     * removeOld
     *
     * Searches through saves, removing ones older than 3 hours
     */

    // Save game and save file are separate for future-proofing in case we change to a database.
    public static removeOld() {
        const date = new Date().getTime();

        const file: string[] = FileManager.getFileNames();
        file.forEach((f) => {
            const save = FileManager.loadFile(f);
            if (save.date > date + 10800000) {
                // 3 hours in ms
                FileManager.deleteFile(f);
            }
        });
    }
}

/**
 * File Manager
 *
 * Manages files
 * Can write, load, and delete local files
 *
 */
export class FileManager {
    private static FilePath = "saves";
    private static fs = require("fs");

    /**
     * writeFile
     *
     * Writes save to file
     * save name as file name
     *
     * Input: save name, save contents
     * Creates: save file with save name
     * Output: boolean isSaved
     */
    public static writeFile(saveName: string, saveContents: iSave) {
        try {
            if (!this.fs.existsSync(this.FilePath)) {
                this.fs.mkdirSync(this.FilePath, { recursive: true });
            }
            this.fs.writeFileSync(
                this.FilePath + "/" + saveName,
                JSON.stringify(saveContents),
                { flag: "w" },
            );
            return true;
        } catch (e) {
            console.log(e);
            return false;
        }
    }
    "";
    /**
     * loadFile
     *
     * loads save data from file name
     *
     * Input: file name
     * Output: iSave
     */
    public static loadFile(fileName: string): iSave {
        if (!this.fs.existsSync(this.FilePath)) return {} as iSave;
        const a = this.fs.readFileSync(this.FilePath + "/" + fileName);
        if (a) return JSON.parse(a);
        return {} as iSave;
    }

    /**
     * getFileNames
     *
     * returns the names of all stored files
     *
     * Output: Array of file names
     */
    public static getFileNames(): string[] {
        if (!this.fs.existsSync(this.FilePath)) return [];
        const fileNames: string[] = [];
        const files = this.fs.readdirSync(this.FilePath);

        files.forEach((file) => {
            fileNames.push(file);
        });

        return fileNames;
    }

    /**
     * deleteFile
     *
     * deletes inputted filename
     *
     * Input: host id, client id
     */
    public static deleteFile(fileName: string) {
        if (!this.fs.existsSync(this.FilePath)) return [];
        this.fs.unlink(this.FilePath + "/" + fileName, (err) => {
            if (err) {
                console.error(err);
                return false;
            } else {
                return true;
            }
        });
    }
}
