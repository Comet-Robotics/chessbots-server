---
title: Server Setup
---

# Setting up your ChessBots Environment

By following this guide, you should be able to have all of the necessary software required for working on chessBots!

> [!NOTE]  
> There may be differences in the setup process for PC vs. Mac.
> Overall, both processes will be very similar.

## Software Required

- Git
- Text Editor (vsCode)
- NodeJS
- Python

## Software Installation

### Git

Git is the software that allows users to collaborate with their code! Having this allows you to pull the latest version of the ChessBot Repository onto your computer. If you already have Git installed, you can bypass this step. If you aren't sure, follow along. The simplest way to ensure Git is set up properly is to use a client like GitHub Desktop. This is how we will install moving forward.

1. Create an account at Github.com
    > [!TIP]
    > If you already have an account, you can use your existing one
2. Download [GitHub Desktop](https://desktop.github.com/) for your system
3. Open the installer and proceed with the install process.
4. When prompted, log in with your GitHub account.
5. Choose to allow GitHub to configure Git. Do not configure manually.
6. If you are on MacOS, when prompted, allow GitHub Desktop to be moved to the Application folder.
7. Done!

### VSCode

VSCode is simply a text editor with a lot of great features for software development, such as powerful extensions, syntax hinting, and Git integration. This is what we recommend for all chessBot development for its ease of use. If you want to use another text editor, you may have a more difficult time moving forward since some of our extensions may not be compatible.

1. Download [VSCode](https://code.visualstudio.com/download)
2. Proceed with install process
    > [!NOTE]
    > If you are using MacOS, make sure to move to the application folder! It is not automatic for VSCode!
3. Done!

### NodeJS

Node is the software package that the chessBot web engine is built upon. Installing it is crucial for the install NPM packages and compiling the software.

1. Download [NodeJS](https://nodejs.org/en/download)
    > [!IMPORTANT]  
    > Select the LTS version, not current version
2. Proceed with installer setup.
3. If prompted, allow it to be added to the PATH
4. Done!

### Python

Python is required for PlatformIO, the software that allows us to upload code to the chessBot MicroControllers.

1. Download [Python Installer](https://www.python.org/downloads/)
2. Proceed with install process
3. Done!

## Environment Setup

Now that all the software is installed, we can setup our environment for chessBots! The way I describe is my personal preference, so you can make some changes along the way if preferred. For simplicity, feel free to follow my steps exactly.

### Making a dev folder

Having a dev folder is important. This is a location where git can pull your projects to, and a central location for all of your development work. It is important to avoid syncing your code in a cloud location, such as OneDrive, iCloud, Google Drive, Box, or Dropbox. This can cause issues when working with git, and should be avoided! Instead, backup your files the old fashioned way with an external drive, or make sure your work is pushed to Git.

#### Windows

1. Open Explorer
2. In the Explorer Address Bar, navigate to `C:/Users`
3. Choose your user folder
4. Create a new folder called "dev" in your user folder.
    > [!WARNING]
    > Saving your dev folder to Desktop or Documents is risky. These locations may be synced by Onedrive on your system, which can cause damage!

#### MacOS

Setting up a dev folder on MacOS is simple!

1. Open Finder
2. Click "Go" at the top of the screen
3. Click "Home"
4. This will open your home folder, you should see things like "Downloads" and "Pictures" in here
5. Create a new folder called "dev" in the home folder.
    > [!WARNING]
    > Saving your dev folder to Desktop or Documents is risky. These locations may be synced by iCloud on your system, which can cause damage!

### Pulling chessBot

Now, we need to pull the latest version of the chessbots-server project to our computer. For this, we will use Github Desktop. If you prefer to use the command line, feel free, we will not be explaining that in this guide.

1. Open GitHub Desktop
2. In your web browser, navigate to the [ChessBots Repo](https://github.com/Comet-Robotics/chessbots-server)
3. Click the green "Code" button
4. Click "Open with GitHub Desktop" and accept the prompt.
5. GitHub Desktop will open with the project.
6. Type in the correct folder, for macOS, that looks like this:
    > [!IMPORTANT]
    > Make sure to include the `/chessbots-server` at the end. This will create a chessBot folder for the project.
    > <img width="1072" alt="Screenshot 2024-01-26 at 11 55 45 AM" src="https://github.com/Comet-Robotics/chessbots-server/assets/13490766/cf8eb1de-5731-4348-8e7e-5f6f0ad54221">
7. Done! You now have the chessBot Source Code on your system!

### Setting up VSCode

Our last step is to setup VSCode for the project.

1. Open VSCode
2. Select "Open Folder" and choose the chessBot folder located in "dev"
3. VSCode will prompt you to install the recommended extensions, click yes.
4. VSCode is ready to use!

### Installing required dependencies

ChessBots rely on a variety of external software in order for our code to run. To do this, we use yarn to manage the packages needed.

1. Open Terminal
2. Type in `npm install --global yarn`
    > [!NOTE]
    > You may need to provide elevated access. Use sudo on MacOS and Administrator on Windows
3. Type in your user password
4. This will install yarn to your system using NPM
5. Open VSCode
6. Open the chessBot project
7. Open a new Terminal in VSCode (Ctrl + Shift + `)
8. Run `yarn install`
9. Run `yarn dev`
10. In your in browser, open `localhost:3000`
11. Done!

### Windows Permissions Issues

In some situations, Windows will claim you do not have permission to run commands. Follow these steps to fix:

1. First, Open PowerShell with Run as Administrator.
2. Then, run this command in PowerShell
   `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned`
3. Close and Re-Open VSCode

## Running ChessBots

1. Open the project in VSCode
2. Open a Terminal in VSCode
3. Type in "yarn dev"
