//Checks if the user prefers light or dark mode from their window.
function inDarkMode(): boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function textColor(): "textDark" | "textLight" {
    return inDarkMode() ? "textDark" : "textLight";
}

function bgColor(): "bgDark" | "bgLight" {
    return inDarkMode() ? "bgDark" : "bgLight";
}

function buttonColor(): "buttonDark" | "buttonLight" {
    return inDarkMode() ? "buttonDark" : "buttonLight";
}

function sliderColor(): "sliderDark" | "sliderLight" {
    return inDarkMode() ? "sliderDark" : "sliderLight";
}

function joystickOutColor(): "#ff8d70" | "#000033" {
    return inDarkMode() ? "#ff8d70" : "#000033";
}

function joystickInColor(): "#e34017" | "#3d59ab" {
    return inDarkMode() ? "#e34017" : "#3d59ab";
}

function driveSliderColor(): "driveSliderDark" | "driveSliderLight" {
    return inDarkMode() ? "driveSliderDark" : "driveSliderLight";
}

function textBoxColor(): "textBoxDark" | "textBoxLight" {
    return inDarkMode() ? "textBoxDark" : "textBoxLight";
}

function robotColor(onTopOfRobots: number): "robotDark" | "robotLight" {
    if(onto)
    return inDarkMode() ? "robotDark" : "robotLight";
}

function innerRobotColor(): "innerBotDark" | "innerBotLight" {
    return inDarkMode() ? "innerBotDark" : "innerBotLight";
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
    innerRobotColor
};
