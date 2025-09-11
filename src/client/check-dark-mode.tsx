//Checks if the user prefers light or dark mode from their window.

import type { BlueprintIcons_16Id } from "@blueprintjs/icons/lib/esm/generated/16px/blueprint-icons-16";

// Dark mode settings. Format for each entry is [mode-name, icon-name]
const allSettings: [string, BlueprintIcons_16Id][] = [
    ["System", "contrast"],
    ["Light", "flash"],
    ["Dark", "moon"],
];

function browserInDarkMode(): boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function setUserSetting(newSetting: number) {
    //don't want to modify the value while refreshing. Reason for this
    //is race condition tomfoolery
    if (localStorage.getItem("refreshing") !== "true") {
        //otherwise, set the item.
        localStorage.setItem("userSetting", JSON.stringify(newSetting));

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
    if (allSettings[numericIndex][0] === "System") {
        return browserInDarkMode();
    } else if (allSettings[numericIndex][0] === "Light") {
        return false;
    }
    return true;
}

function textColor(): string {
    return chooseDark() ? "textDark" : "textLight";
}

function bgColor(): string {
    return chooseDark() ? "bgDark" : "bgLight";
}

function buttonColor(): string {
    return chooseDark() ? "buttonDark" : "buttonLight";
}

function sliderColor(): string {
    return chooseDark() ? "sliderDark" : "sliderLight";
}

function joystickOutColor(): string {
    return chooseDark() ? "#ff8d70" : "#000033";
}

function joystickInColor(): string {
    return chooseDark() ? "#e34017" : "#3d59ab";
}

function driveSliderColor(): string {
    return chooseDark() ? "driveSliderDark" : "driveSliderLight";
}

function textBoxColor(): string {
    return chooseDark() ? "textBoxDark" : "textBoxLight";
}

//first, we have separate colors for when a robot collides with another robot.
function robotColor(onTopOfRobots: number): string {
    //if robot has collided, set itaccordingly
    if (onTopOfRobots > 0) {
        return chooseDark() ? "robotCollideDark" : "robotCollideLight";
    }
    //otherwise, set light/dark as normal
    return chooseDark() ? "robotDark" : "robotLight";
}

function innerRobotColor(): string {
    return chooseDark() ? "innerBotDark" : "innerBotLight";
}

//gets the current user setting value
function getUserSetting(): number {
    const numericIndex: number = parseInt(
        localStorage.getItem("userSetting") || "0",
    );
    return numericIndex;
}

function simBorderColor(): string {
    return chooseDark() ? "#c3c3c3" : "#1a1616";
}

function simRingCellColor(): string {
    return chooseDark() ? "#332e2e" : "#d3d3d3";
}

function darkModeIcon(): BlueprintIcons_16Id {
    return allSettings[getUserSetting()][1];
}

function toggleUserSetting(): void {
    setUserSetting((getUserSetting() + 1) % allSettings.length);
}

export {
    allSettings,
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
