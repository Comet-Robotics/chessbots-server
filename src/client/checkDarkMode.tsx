//Checks if the user prefers light or dark mode from their window.
function inDarkMode(): Boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

export {inDarkMode}