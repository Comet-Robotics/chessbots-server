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
import { Dispatch, useEffect, useState } from "react";
import { bgColor, setUserSetting, chooseDark, textColor} from "../checkDarkMode";
import "../colors.css";

interface NavbarMenuProps {
    sendMessage: SendMessage;
    side: Side;
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

    //we have this because until its declared false, we know our program is still rendering.
        //So, we wait for the useEFfect to then know what we're done refreshing
        const [rendering] = useState("true");
    
        // This effect will run after every render
        useEffect(() => {
            //now that we're done refreshing, we set the status of refreshing to false
            localStorage.setItem("refreshing", "false");
        }, [rendering]);

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
        :   "";

    return (
        <Navbar className={bgColor()}>
            <NavbarGroup>
                <NavbarHeading className={textColor()}>ChessBot</NavbarHeading>
                <NavbarDivider />
                <Button
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
                />
                <Button
                    icon="pause"
                    minimal
                    text="Draw"
                    intent="danger"
                    onClick={async () => {
                        props.sendMessage(
                            new GameHoldMessage(
                                GameHoldReason.DRAW_CONFIRMATION,
                            ),
                        );
                    }}
                />
            </NavbarGroup>
            <NavbarGroup align="right">
                {rotateButton}
                <h3 className={textColor()}>{props.side}</h3>
                <Button icon="cog" minimal onClick={() => navigate("/debug")} />
                <Button 
                    minimal
                    onClick={() => {
                        //if chooseDark is true, now we want to set it to light, so pass 1.
                        //if chooseDark is false, that means its light currently, so want to
                        //set it to dark, so pass index 2.
                        chooseDark() ? setUserSetting(1) : setUserSetting(2);
                        //begin the refresh
                    }}>
                    <img 
                        //if it's dark, display a moon. Otherwise, display a sun.
                        src= {chooseDark() ? "/public/moon.png" : "/public/sun.png"}
                        alt="light" 
                        style={{ width: '30px', height: '30px' }}/>
                </Button>
            </NavbarGroup>
        </Navbar>
    );
}
