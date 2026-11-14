import {
    Button,
    Navbar,
    NavbarDivider,
    NavbarGroup,
    NavbarHeading,
} from "@blueprintjs/core";
import { useNavigate } from "react-router-dom";

import { GameHoldReason, GameInterruptedReason, MessageType, type Message, type MessageSender } from "../../common/message";
import { Side, SPECTATOR, WHITE } from "../../common/chess";
import type { Dispatch } from "react";

interface NavbarMenuProps {
    sendMessage: MessageSender;
    side: Side;
    difficulty?: string;
    aiDifficulty?: number;
}

/**
 * Creates a navbar with a title and the abort, resign, and debug buttons
 *
 * @param props - message handler for abort/resign
 * @returns the navbar element with all the buttons
 */
export function NavbarMenu(props: NavbarMenuProps) {
    // Store react router state for game
    const navigate = useNavigate();
    const difficultyButton =
        props.difficulty ?
            <Button minimal disabled text={"rating: " + props.difficulty} />
        :   null;

    const aiArray = ["Baby", "Beginner", "Intermediate", "Advances"];
    const aiDifficultyButton =
        props.aiDifficulty ?
            <Button
                minimal
                disabled
                text={"AI Difficulty: " + aiArray[props.aiDifficulty]}
            />
        :   null;

    /** create navbar rotate button */
    /*
    const rotateButton =
        props.side === SPECTATOR ?
            <Button
                variant="minimal"
                text="Rotate"
                intent="primary"
                onClick={() => {
                    props.setRotation((oldRotation) => {
                        return oldRotation + 90;
                    });
                }}
            />
        :   undefined;

        */
    const resignButton =
        props.side === SPECTATOR ?
            undefined
        :   <Button
                icon="flag"
                variant="minimal"
                text="Resign"
                intent="danger"
                onClick={async () => {
                    props.sendMessage({
                        type: MessageType.GAME_INTERRUPTED,
                        reason: props.side === WHITE ? GameInterruptedReason.WHITE_RESIGNED : GameInterruptedReason.BLACK_RESIGNED
                    })
                }}
            />;

    const drawButton =
        props.side === SPECTATOR ?
            undefined
        :   <Button
                icon="pause"
                variant="minimal"
                text="Draw"
                intent="danger"
                onClick={async () => {
                    props.sendMessage({
                        type: MessageType.GAME_HELD,
                        reason: GameHoldReason.DRAW_CONFIRMATION
                    });
                }}
            />;

    return (
        <Navbar>
            <NavbarGroup>
                <NavbarHeading>ChessBot</NavbarHeading>
                <NavbarDivider />
                {resignButton}
                {drawButton}
            </NavbarGroup>
            <NavbarGroup align="right">
                {difficultyButton}
                {aiDifficultyButton}
                <Button icon="cog" minimal onClick={() => navigate("/debug")} />
            </NavbarGroup>
        </Navbar>
    );
}
