//Checks if the user prefers light or dark mode from their window.

import { BlueprintIcons_16Id } from "@blueprintjs/icons/lib/esm/generated/16px/blueprint-icons-16";

//corresponds to each index to make the code clearer
const allSettings: string[] = ["System", "Light", "Dark"];

function browserInDarkMode(): boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function setUserSetting(newSetting: number) {
    //don't want to modify the value while refreshing. Reason for this
    //is race condition tomfoolery
    if (localStorage.getItem("refreshing") !== "true") {
        //otherwise, set the item.
        localStorage.setItem("userSetting", newSetting + "");

        //now after setting it we plan to refresh, set it to true now to prevent race conditions where we may overwrite "userSetting" value
        localStorage.setItem("refreshing", "true");
        //refresh the page
        window.location.reload();
    }
}

function chooseDark(): boolean {
    const numericIndex: number = parseInt(
        localStorage.getItem("userSetting") || "0",
    );
    //if index == 0 and thus we want the "System", we call browserInDarkMode() for that to determine if its in dark mode.
    if (allSettings[numericIndex] === "System") {
        return browserInDarkMode();
    } else if (allSettings[numericIndex] === "Light") {
        return false;
    }
    return true;
}

function textColor(): "textDark" | "textLight" {
    return chooseDark() ? "textDark" : "textLight";
}

function bgColor(): "bgDark" | "bgLight" {
    return chooseDark() ? "bgDark" : "bgLight";
}

function buttonColor(): "buttonDark" | "buttonLight" {
    return chooseDark() ? "buttonDark" : "buttonLight";
}

function sliderColor(): "sliderDark" | "sliderLight" {
    return chooseDark() ? "sliderDark" : "sliderLight";
}

function joystickOutColor(): "#ff8d70" | "#000033" {
    return chooseDark() ? "#ff8d70" : "#000033";
}

function joystickInColor(): "#e34017" | "#3d59ab" {
    return chooseDark() ? "#e34017" : "#3d59ab";
}

function driveSliderColor(): "driveSliderDark" | "driveSliderLight" {
    return chooseDark() ? "driveSliderDark" : "driveSliderLight";
}

function textBoxColor(): "textBoxDark" | "textBoxLight" {
    return chooseDark() ? "textBoxDark" : "textBoxLight";
}

//first, we have separate colors for when a robot collides with another robot.
function robotColor(
    onTopOfRobots: number,
): "robotDark" | "robotLight" | "robotCollideDark" | "robotCollideLight" {
    //if robot has collided, set itaccordingly
    if (onTopOfRobots > 0) {
        return chooseDark() ? "robotCollideDark" : "robotCollideLight";
    }
    //otherwise, set light/dark as normal
    return chooseDark() ? "robotDark" : "robotLight";
}

function innerRobotColor(): "innerBotDark" | "innerBotLight" {
    return chooseDark() ? "innerBotDark" : "innerBotLight";
}

//gets the current user setting value
function getUserSetting(): number {
    const numericIndex: number = parseInt(
        localStorage.getItem("userSetting") || "0",
    );
    return numericIndex;
}

function simBorderColor(): "#c3c3c3" | "#1a1616" {
    return chooseDark() ? "#c3c3c3" : "#1a1616";
}

function simRingCellColor(): "#332e2e" | "#d3d3d3" {
    return chooseDark() ? "#332e2e" : "#d3d3d3";
}

function darkModeIcon(): BlueprintIcons_16Id {
    switch (getUserSetting()) {
        case 0:
            return "contrast";
        case 1:
            return "flash";
        case 2:
            return "moon";
        default:
            return "contrast";
    }
}

function toggleUserSetting(): void {
    setUserSetting((getUserSetting() + 1) % allSettings.length);
}

export {
    textColor,
    bgColor,
    buttonColor,
    sliderColor,
    joystickOutColor,
    joystickInColor,
    driveSliderColor,
    textBoxColor,
    robotColor,
    innerRobotColor,
    setUserSetting,
    getUserSetting,
    simBorderColor,
    simRingCellColor,
    chooseDark,
    darkModeIcon,
    toggleUserSetting,
};
