import { Dispatch, useEffect, useState } from "react";

import { GameInterruptedMessage , MoveMessage } from "../../common/message/game-message";
import {
    GameEndReason,
    GameInterruptedReason,
} from "../../common/game-end-reasons";

import { ChessboardWrapper } from "../chessboard/chessboard-wrapper";
import { NavbarMenu } from "../game/navbar-menu";
import { useSocket } from "../api";
import { MessageHandler } from "../../common/message/message";
//import { GameEndDialog } from "../game/game-end-dialog";
import { Outlet } from "react-router-dom";
import { ChessEngine } from "../../common/chess-engine";
import { Move, PieceType, Side } from "../../common/game-types";
//import { NonIdealState, Spinner } from "@blueprintjs/core";
import { GameEndDialog } from "../game/game-end-dialog";
// import { debugPath } from "../../server/robot/path-materializer";

function getMessageHandler(
    chess: ChessEngine,
    setChess: Dispatch<ChessEngine>,
    setGameInterruptedReason: Dispatch<GameInterruptedReason>,
): MessageHandler {
    return (message) => {
        if (message instanceof MoveMessage) {
            // Must be a new instance of ChessEngine to trigger UI redraw
            setChess(chess.copy(message.move));
        } else if (message instanceof GameInterruptedMessage) {
            setGameInterruptedReason(message.reason);
        }
    };
}

export function Debug2(): JSX.Element {
    const [chess, setChess] = useState(new ChessEngine());
    const [gameInterruptedReason, setGameInterruptedReason] =
        useState<GameInterruptedReason>();
    const [rotation, setRotation] = useState<number>(0);

    const sendMessage = useSocket(
        getMessageHandler(chess, setChess, setGameInterruptedReason),
    );

    useEffect(() => {
        const holder = new ChessEngine();
        holder.loadFen("7k/8/8/3Q4/8/8/8/K7 w - - 0 1");
        setChess(holder);
    }, []);

    const side = Side.WHITE;

    let gameEndReason: GameEndReason | undefined = undefined;
    const gameFinishedReason = chess.getGameFinishedReason();
    if (gameFinishedReason !== undefined) {
        gameEndReason = gameFinishedReason;
    } else if (gameInterruptedReason !== undefined) {
        gameEndReason = gameInterruptedReason;
    }

    const gameEndDialog =
        gameEndReason !== undefined ?
            <GameEndDialog reason={gameEndReason} side={side} />
        :   null;

    const handleMove = (move: Move): void => {
        setChess(chess.copy(move));
        sendMessage(new MoveMessage(move));

        if (chess.getPieceTypeFromMove(move) === PieceType.QUEEN) {
            // debugPath(move).execute();
        }
    };

    return (
        <>
            <NavbarMenu
                sendMessage={sendMessage}
                side={side}
                setRotation={setRotation}
            />
            <div id="body-container">
                <ChessboardWrapper
                    side={side}
                    chess={chess}
                    onMove={handleMove}
                    rotation={rotation ? rotation : 0}
                />
                {gameEndDialog}
                <Outlet />
            </div>
        </>
    );
}
