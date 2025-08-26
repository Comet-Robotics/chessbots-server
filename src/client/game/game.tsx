import type { Dispatch} from "react";
import { useState } from "react";

import {
    GameEndMessage,
    GameFinishedMessage,
    GameHoldMessage,
    GameInterruptedMessage,
    SetChessMessage,
    MoveMessage,
} from "../../common/message/game-message";
import type {
    GameEndReason,
    GameInterruptedReason} from "../../common/game-end-reasons";
import {
    GameHoldReason
} from "../../common/game-end-reasons";

import { ChessboardWrapper } from "../chessboard/chessboard-wrapper";
import { NavbarMenu } from "./navbar-menu";
import { get, useEffectQuery, useSocket } from "../api";
import type { MessageHandler } from "../../common/message/message";
import { GameEndDialog } from "./game-end-dialog";
import { Navigate, Outlet } from "react-router-dom";
import { ChessEngine } from "../../common/chess-engine";
import type { Move } from "../../common/game-types";
import { NonIdealState, Spinner } from "@blueprintjs/core";
import { AcceptDrawDialog, OfferDrawDialog } from "./draw-dialog";
import { bgColor } from "../check-dark-mode";
import "../colors.css";

/**
 * Creates a MessageHandler function to handle move messages and game interruptions.
 * @param chess - the current chess object to apply moves to
 * @param setX - react set state functions to update the UI on change
 * @returns a message handler that updates the client state based on the message
 */
function getMessageHandler(
    chess: ChessEngine,
    setChess: Dispatch<ChessEngine>,
    setGameInterruptedReason: Dispatch<GameInterruptedReason>,
    setGameEndedReason: Dispatch<GameEndReason>,
    setGameHoldReason: Dispatch<GameHoldReason>,
): MessageHandler {
    return (message) => {
        if (message instanceof MoveMessage) {
            // Must be a new instance of ChessEngine to trigger UI redraw
            // short wait so the pieces don't teleport into place
            setTimeout(() => {
                setChess(chess.copy(message.move));
            }, 500);
        } else if (message instanceof SetChessMessage) {
            const fen = message.chess;
            if (fen) {
                setTimeout(() => {
                    chess.loadFen(fen);
                    setChess(chess.copy());
                }, 500);
            }
        } else if (message instanceof GameInterruptedMessage) {
            setGameInterruptedReason(message.reason);
        } else if (message instanceof GameEndMessage) {
            setGameEndedReason(message.reason);
        } else if (message instanceof GameHoldMessage) {
            setGameHoldReason(message.reason);
        }
    };
}
/**
 * Creates required message, game, and move handling functions before inserting them into a chessboard wrapper
 *
 * @returns chessboard wrapper with current side and message handler
 */
export function Game(): JSX.Element {
    const [chess, setChess] = useState(new ChessEngine());
    const [gameInterruptedReason, setGameInterruptedReason] =
        useState<GameInterruptedReason>();
    const [gameEndedReason, setGameEndedReason] = useState<GameEndReason>();
    const [gameHoldReason, setGameHoldReason] = useState<GameHoldReason>();
    const [rotation, setRotation] = useState<number>(0);

    /** send any messages using our defined message handler inside a message socket for handling */
    const sendMessage = useSocket(
        getMessageHandler(
            chess,
            setChess,
            setGameInterruptedReason,
            setGameEndedReason,
            setGameHoldReason,
        ),
    );

    // checks if a game is currently active
    const { isPending, data, isError } = useEffectQuery(
        "game-state",
        async () => {
            return get("/game-state").then((gameState) => {
                setChess(new ChessEngine(gameState.position));
                if (gameState.gameEndReason !== undefined) {
                    setGameInterruptedReason(gameState.gameEndReason);
                }
                return gameState;
            });
        },
        false,
    );

    // if a game is pending, show a loading screen while waiting
    if (isPending) {
        return (
            <NonIdealState
                icon={<Spinner intent="primary" />}
                title="Loading..."
            />
        );
        // go to /home if error
    } else if (isError) {
        return <Navigate to="/home" />;
    }

    const side = data.side;

    // check if the game has ended or been interrupted
    let gameEndReason: GameEndReason | undefined = undefined;
    const gameFinishedReason = chess.getGameFinishedReason();
    if (gameEndedReason !== undefined) {
        gameEndReason = gameEndedReason;
    } else if (gameFinishedReason !== undefined) {
        sendMessage(new GameFinishedMessage(gameFinishedReason));
        gameEndReason = gameFinishedReason;
    } else if (gameInterruptedReason !== undefined) {
        gameEndReason = gameInterruptedReason;
    }

    /** create a game end dialog with the game end reason, if defined */
    const gameEndDialog =
        gameEndReason !== undefined ?
            <GameEndDialog reason={gameEndReason} side={side} />
        :   null;
    const gameOfferDialog =
        gameHoldReason !== undefined ?
            gameHoldReason === GameHoldReason.DRAW_CONFIRMATION ?
                <OfferDrawDialog sendMessage={sendMessage} />
            :   null
        :   null;

    const gameAcceptDialog =
        gameHoldReason !== undefined ?
            gameHoldReason === GameHoldReason.DRAW_OFFERED ?
                <AcceptDrawDialog sendMessage={sendMessage} />
            :   null
        :   null;

    /** make moves by making a copy of the chessboard and sending the move message */
    const handleMove = (move: Move): void => {
        setChess(chess.copy(move));
        sendMessage(new MoveMessage(move));
    };

    // return the chessboard wrapper, navbar, and potential end dialog
    return (
        <>
            <NavbarMenu
                sendMessage={sendMessage}
                side={side}
                difficulty={data.difficulty}
                aiDifficulty={data.aiDifficulty}
                setRotation={setRotation}
            />
            <div id="body-container" className={bgColor()}>
                <ChessboardWrapper
                    side={side}
                    chess={chess}
                    onMove={handleMove}
                    rotation={rotation ? rotation : 0}
                />
                {gameEndDialog}
                {gameOfferDialog}
                {gameAcceptDialog}
                <Outlet />
            </div>
        </>
    );
}
