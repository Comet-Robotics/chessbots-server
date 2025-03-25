//Checks if the user prefers light or dark mode from their window.

//corresponds to each index to make the code clearer
const allSettings: string[] = ["System", "Light", "Dark"];

function browserInDarkMode(): boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function changeUserSetting(newSetting: number) {
    //don't want to modify the value while refreshing. Reason for this
    //is race condition tomfoolery
    if (localStorage.getItem("refreshing") !== "true") {
        //otherwise, set the item.
        localStorage.setItem("userSetting", newSetting + "");
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
    changeUserSetting,
    getUserSetting,
    simBorderColor,
    simRingCellColor,
};
