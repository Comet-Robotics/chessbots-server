---
title: Server Structure
---

## Backend

Found in `src/server`.

The server acts as the backend for the chess bot system, facilitating communication between the clients and the chess bots while managing the underlying chess engine.

File Structure:

- `main.ts`: launch point for the server. handles starting the individual services and initialization of various components.
- `api`: contains files that handle API requests for the client.
- `command`: contains the command system that performs actions on the internal board. manages piece movements at a level abstracted from the hardware side.
- `robot`: contains the structure of the backend. holds objects for robots, pieces, squares, and other objects in the chess board. each robot object handles its connection with its corresponding physical robot in robot-socket.
- `utils`: miscellaneous utility classes. currently has tools for unit conversions.

## Client

Found in `src/client`.

The client is user-side and handles sending input from the user to the client and updating the board in the browser.

File Structure:

- TODO
