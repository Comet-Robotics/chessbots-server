//Checks if the user prefers light or dark mode from their window.

const allSettings: string[] = ["System", "Light", "Dark"];

function browserInDarkMode(): boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function changeUserSetting(newSetting: number) {
    if (localStorage.getItem("refreshing") !== "true") {
        localStorage.setItem("userSetting", newSetting - 1 + "");
        localStorage.setItem("refreshing", "true");
    } else {
        console.log("wait for refresh!");
    }
}

function chooseDark(): boolean {
    const numericIndex: number = parseInt(
        localStorage.getItem("userSetting") || "0",
    );
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

function robotColor(
    onTopOfRobots: number,
): "robotDark" | "robotLight" | "robotCollideDark" | "robotCollideLight" {
    if (onTopOfRobots > 0) {
        return chooseDark() ? "robotCollideDark" : "robotCollideLight";
    }
    return chooseDark() ? "robotDark" : "robotLight";
}

function innerRobotColor(): "innerBotDark" | "innerBotLight" {
    return chooseDark() ? "innerBotDark" : "innerBotLight";
}

function getUserSetting(): number {
    console.log("storage item: " + localStorage.getItem("userSetting"));
    const numericIndex: number = parseInt(
        localStorage.getItem("userSetting") || "0",
    );
    return numericIndex + 1;
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
