//Checks if the user prefers light or dark mode from their window.
function inDarkMode(): Boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

function textColor() : "textDark" | "textLight" {
  return (inDarkMode() ? "textDark" : "textLight")
}

function bgColor():  "bgDark" | "bgLight" {
  return (inDarkMode() ? "bgDark" : "bgLight")
}

function buttonColor(): "buttonDark" | "buttonLight" {
  return (inDarkMode() ? "buttonDark" : "buttonLight")
}

function sliderColor(): "sliderDark" | "sliderLight" {
  return(inDarkMode() ? "sliderDark" : "sliderLight")
}


export {textColor, bgColor, buttonColor, sliderColor}