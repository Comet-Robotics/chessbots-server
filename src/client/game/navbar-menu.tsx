import {
    Button,
    Navbar,
    NavbarDivider,
    NavbarGroup,
    NavbarHeading,
} from "@blueprintjs/core";
import { useNavigate } from "react-router-dom";
import {
    GameHoldMessage,
    GameInterruptedMessage,
} from "../../common/message/game-message";
import {
    GameHoldReason,
    GameInterruptedReason,
} from "../../common/game-end-reasons";
import { SendMessage } from "../../common/message/message";
import { Side } from "../../common/game-types";
import { Dispatch } from "react";

interface NavbarMenuProps {
    sendMessage: SendMessage;
    side: Side;
    difficulty?: string;
    AiDifficulty?: number;
    setRotation: Dispatch<React.SetStateAction<number>>; //set state type
}

/**
 * Creates a navbar with a title and the abort, resign, and debug buttons
 *
 * @param props - message handler for abort/resign
 * @returns the navbar element with all the buttons
 */
export function NavbarMenu(props: NavbarMenuProps): JSX.Element {
    // Store react router state for game
    const navigate = useNavigate();
    const difficultyButton =
        props.difficulty ?
            <Button minimal disabled text={"rating: " + props.difficulty} />
        :   null;

    const AiArray = ["Baby", "Beginner", "Intermediate", "Advances"];
    const AiDifficultyButton =
        props.AiDifficulty ?
            <Button
                minimal
                disabled
                text={"AI Difficulty: " + AiArray[props.AiDifficulty]}
            />
        :   null;

    /** create navbar rotate button */
    const rotateButton =
        props.side === Side.SPECTATOR ?
            <Button
                minimal
                text="Rotate"
                intent="primary"
                onClick={() => {
                    props.setRotation((oldRotation) => {
                        return oldRotation + 90;
                    });
                }}
            />
        :   undefined;

    const resignButton =
        props.side === Side.SPECTATOR ?
            undefined
        :   <Button
                icon="flag"
                minimal
                text="Resign"
                intent="danger"
                onClick={async () => {
                    props.sendMessage(
                        new GameInterruptedMessage(
                            props.side === Side.WHITE ?
                                GameInterruptedReason.WHITE_RESIGNED
                            :   GameInterruptedReason.BLACK_RESIGNED,
                        ),
                    );
                }}
            />;

    const drawButton =
        props.side === Side.SPECTATOR ?
            undefined
        :   <Button
                icon="pause"
                minimal
                text="Draw"
                intent="danger"
                onClick={async () => {
                    props.sendMessage(
                        new GameHoldMessage(GameHoldReason.DRAW_CONFIRMATION),
                    );
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
                {AiDifficultyButton}
                {rotateButton}
                <h3>{props.side}</h3>
                <Button icon="cog" minimal onClick={() => navigate("/debug")} />
            </NavbarGroup>
        </Navbar>
    );
}
