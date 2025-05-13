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
import {
    bgColor,
    textColor,
    darkModeIcon,
    toggleUserSetting,
} from "../check-dark-mode";
import "../colors.css";

interface NavbarMenuProps {
    sendMessage: SendMessage;
    side: Side;
    difficulty?: string;
    aiDifficulty?: number;
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
    const rotateButton =
        props.side === Side.SPECTATOR ?
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

    const resignButton =
        props.side === Side.SPECTATOR ?
            undefined
        :   <Button
                icon="flag"
                variant="minimal"
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
                variant="minimal"
                text="Draw"
                intent="danger"
                onClick={async () => {
                    props.sendMessage(
                        new GameHoldMessage(GameHoldReason.DRAW_CONFIRMATION),
                    );
                }}
            />;

    return (
        <Navbar className={bgColor()}>
            <NavbarGroup>
                <NavbarHeading className={textColor()}>ChessBot</NavbarHeading>
                <NavbarDivider />
                {resignButton}
                {drawButton}
            </NavbarGroup>
            <NavbarGroup align="right">
                {difficultyButton}
                {aiDifficultyButton}
                {rotateButton}
                <Button
                    icon={darkModeIcon()}
                    variant="minimal"
                    onClick={toggleUserSetting}
                />
                <Button icon="cog" minimal onClick={() => navigate("/debug")} />
            </NavbarGroup>
        </Navbar>
    );
}
