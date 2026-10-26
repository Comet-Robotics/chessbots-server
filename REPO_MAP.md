# Chess Bots Server - Repository Map

## Overview

Chess Bots is a full-stack TypeScript application (Node.js + React) that controls **physical robots** that play chess on a 12x12 grid. Each chess piece is an independent robot that moves on the board. The server manages game logic, robot communication, and serves the web frontend.

**Tech Stack:**
- **Backend:** Express + ViteExpress + WebSocket (ws) + TypeScript
- **Frontend:** React + Vite + BlueprintJS + react-chessboard + Framer Motion
- **Chess Logic:** chess.js + js-chess-engine (AI)
- **Communication:** WebSocket (game UI) + TCP (robot hardware) + JSON packets
- **Serialization:** CBOR-X (showfiles), Runtypes (validation)

---

## Directory Structure

```
src/
├── common/          # Shared between client & server
├── server/          # Backend: API, game logic, robot control
└── client/          # Frontend: React SPA
```

---

## 1. Common Module (`src/common/`)

Shared types, utilities, and message definitions used by both client and server.

### 1.1 Chess Engine (`chess-engine.ts`)
- **Purpose:** Thin wrapper around `chess.js` that adds robot-specific methods
- **Key Features:**
  - Board state management (PGN/FEN)
  - Move validation and execution
  - AI move calculation using `js-chess-engine`
  - Castling/en passant detection
  - Game end detection (checkmate, stalemate, etc.)
  - **Robot integration:** `getCapturedPieceId()` maps chess captures to robot IDs

**Technical Debt:**
- Only supports queen promotion (hardcoded in `calculateAiMove`)
- `getCapturedPieceId()` has a bug in en passant detection (uses wrong grid indices)

### 1.2 Message System (`src/common/message/`)
- **Purpose:** Type-safe WebSocket message passing between client and server
- **Structure:**
  - `message.ts` - Base `Message` class + `MessageType` enum
  - `parse-message.ts` - JSON → Message factory
  - `game-message.ts` - Game state messages (Move, GameStarted, GameEnd, etc.)
  - `robot-message.ts` - Robot control messages (DriveRobot, SetRobotVariable)
  - `simulator-message.ts` - Virtual robot state sync messages

**Message Types:** `REGISTER_WEBSOCKET`, `MOVE`, `GAME_STARTED`, `GAME_INTERRUPTED`, `GAME_FINISHED`, `GAME_ENDED`, `GAME_HELD`, `POSITION`, `SET_CHESS`, `DRIVE_ROBOT`, `SET_ROBOT_VARIABLE`, `SIMULATOR_UPDATE`, `JOIN_QUEUE`, `UPDATE_QUEUE`

**Technical Debt:**
- `parseMessage()` throws on unknown types rather than returning null/undefined
- Missing `GAME_HOLD` and `JOIN_QUEUE` in the api.ts message handler switch
- `StopRobotMessage` exists but is never used
- Message types are strings, not strongly validated at parse time

### 1.3 Game Types (`game-types.ts`, `client-types.ts`, `game-end-reasons.ts`)
- `PieceType` enum (p, b, n, r, q, k)
- `Side` enum (w, b, s)
- `Move` interface (from, to, promotion?)
- `ClientType` (host/client/spectator)
- `Difficulty` (baby/beginner/intermediate/advanced)
- `GameType` (computer/human)
- Game end reasons: `GameFinishedReason`, `GameInterruptedReason`, `GameHoldReason`

### 1.4 Spline Math (`spline.ts`)
- Bezier curve evaluation (quadratic + cubic)
- Derivative computation
- SVG path string generation
- Point reflection utilities
- Runtypes schemas for validation

### 1.5 Showfile Format (`show.ts`)
- **Purpose:** Data structure for choreographed robot "shows" (dance-like performances)
- **Structure:** Timeline of layers (one per robot), each containing events:
  - `StartPointEvent` - Initial position
  - `GoToPointEvent` - Move to a bezier curve point
  - `WaitEvent` - Pause for duration
  - `TurnEvent` - Rotate
- Stored as CBOR binary (supports inline audio)
- Runtypes schemas for validation

**Technical Debt:**
- Schema version is hardcoded as `Literal(4)` — no migration path
- `createNewShowfile()` creates synthetic data that may not match real robot configs
- `timelineLayerToSpline()` filters GoToPointEvent but ignores Wait/Turn events

### 1.6 Units & Utilities (`units.ts`, `getRobotStateAtTime.ts`, `show-interface-utils.ts`)
- Angle conversions (`DEGREE`, `RADIAN`, `FULL_ROTATION`)
- Heading clamping
- Grid-to-pixel conversion constants

### 1.7 Message Parsing Test (`message/test/parse-message.test.ts`)
- Tests for message serialization/deserialization

---

## 2. Server Module (`src/server/`)

### 2.1 Entry Point (`main.ts`)
- Express + ViteExpress application setup
- Cookie-based client identification
- WebSocket handler registration at `/ws`
- API router at `/api`
- Editor middleware (`launch-editor-middleware`)
- Client auto-registration via `clientManager.assignPlayer()`

**Technical Debt:**
- Cookie is `httpOnly: true` but also used by `req.cookies.id` in client-facing code — confusing boundary
- No rate limiting or authentication (beyond cookie presence)
- `/pause-game` and `/unpause-game` are publicly accessible with no auth

### 2.2 API Layer (`api/api.ts`)
The central WebSocket + REST endpoint handler. This is where the most action happens.

#### WebSocket Handler (`/ws`)
- Routes messages to appropriate handlers:
  - `RegisterWebsocketMessage` → `socketManager.registerSocket()`
  - Game messages → `gameManager.handleMessage()`
  - `DriveRobotMessage` → `doDriveRobot()`
  - `SetRobotVariableMessage` → `doSetRobotVariable()`
  - `JoinQueue` → queue management

#### REST Endpoints (`/api/*`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/get-queue` | GET | Current queue of players |
| `/get-name` | GET | Player name by cookie |
| `/client-information` | GET | Client role (host/client/spectator) + game active status + save loading |
| `/game-state` | GET | Current game state (position, side, pause, end reason) |
| `/start-computer-game` | POST | Start AI game |
| `/start-human-game` | POST | Start human vs human game |
| `/start-puzzle-game` | POST | Start puzzle game |
| `/get-ids` | GET | Connected robot IDs |
| `/do-smth` | GET | Debug: move random robot |
| `/do-parallel` | GET | Debug: run parallel spline commands |
| `/do-big` | POST | Execute a showfile on all robots |
| `/get-simulator-robot-state` | GET | Get virtual robot positions for simulator |
| `/get-puzzles` | GET | List available puzzles |
| `/pause-game` | GET | **Publicly exposed** pause button |
| `/unpause-game` | GET | **Publicly exposed** unpause button |

**Technical Debt (api.ts is a ~500 line god file):**
- Mixes WebSocket handler, REST API, business logic, and robot control
- `setupDefaultRobotPositions()` is duplicated between computer and human game start
- Queue reload logic on socket close is extremely complex (100+ lines of nested conditionals)
- `doDriveRobot()` and `doSetRobotVariable()` are nearly identical
- No input validation on POST endpoints (e.g., `/start-puzzle-game` parses `req.query.puzzle` without checking)
- Puzzle default positions setup uses `throw Error()` instead of returning proper HTTP error
- `do-parallel` endpoint creates hardcoded test commands — should be removed or parameterized
- `do-big` uses `JSON.parse()` without error handling on `req.query.show`

### 2.3 Manager Singletons (`api/managers.ts`)
- Exports global singleton instances: `socketManager`, `clientManager`, `gameManager` (nullable)
- `setGameManager()` is the only setter for gameManager
- `disconnectedBots` set for tracking bot disconnects

**Technical Debt:**
- Mutable `gameManager` global — makes testing hard
- No dependency injection or container pattern

### 2.4 Client Manager (`api/client-manager.ts`)
- Maps cookie IDs to client roles: host, client, spectators
- Tracks websocket connections per client
- `assignPlayer()` auto-assigns roles (first = host, second = client, rest = spectators)

**Technical Debt:**
- `getIds()` returns `[hostId, clientId]` or `undefined` — inconsistent with TypeScript returning `undefined` vs `null`
- `isPlayer()` has a debug `console.log` that should be removed
- `makeClientManager()` factory function exists but is never used
- No way to remove a spectator by index

### 2.5 Socket Manager (`api/socket-manager.ts`)
- Maps cookie IDs → `Set<WebSocket>` (supports multi-tab)
- `registerSocket()`, `sendToSocket()`, `sendToAll()`
- `handleSocketClosed()` — only removes socket, doesn't clean up empty sets

**Technical Debt:**
- Memory leak: never cleans up empty `Set<WebSocket>` entries
- `handleSocketClosed()` returns void but the `console.log` says "KILL IT!"
- No reconnection handling

### 2.6 Game Manager (`api/game-manager.ts`)
Abstract class + three implementations:

| Class | Purpose |
|-------|---------|
| `GameManager` (abstract) | Base: side tracking, game end detection, state queries |
| `HumanGameManager` | Human vs Human: bidirectional move relay |
| `ComputerGameManager` | Human vs AI: AI auto-responds after human moves |
| `PuzzleGameManager` | Puzzle solving: validates moves against expected sequence |

**Key Behaviors:**
- All game managers: `materializePath(move)` → `executor.execute(command)`
- On move: save game state (if `DO_SAVES`), notify all clients
- On pause: catch executor errors, undo move, send `GAME_PAUSED`
- AI games: `MINIMUM_DELAY` ensures robots finish before AI responds

**Technical Debt:**
- `HumanGameManager` and `ComputerGameManager` both call `materializePath()` + `executor.execute()` + error handling — **copy-pasted code**
- `PuzzleGameManager.isGameEnded()` override checks `moveNumber >= moves.length` — but `super.isGameEnded()` also checks `gameInterruptedReason`, making the logic fragile
- `PuzzleGameManager.handleMessage()` has a bug: `message instanceof (GameInterruptedMessage \|\| GameEndMessage)` always evaluates to true (operator precedence issue with instanceof)
- `ComputerGameManager.makeFirstMove()` has unused `this.aiFirstMove` logic complexity
- `GameHoldMessage` handling in `HumanGameManager` sends `DRAW_CONFIRMATION` to the player who initiated — counterintuitive

### 2.7 Pause Handler (`api/pauseHandler.ts`)
- `gamePaused` boolean + `pauser` string ("admin" or "server")
- `pauseGame()` / `unpauseGame()` — mutual exclusion based on who paused
- `setAllRobotsToDefaultPositions()` — sets robot positions directly
- `doRollBack()` — restores position from save before the last move

**Technical Debt:**
- `setAllRobotsToDefaultPositions()` is called from both `api.ts` and `pauseHandler.ts` — unclear ownership
- `doRollBack()` parses string-encoded GridIndices from save data — brittle format
- `gamePaused` is a module-level variable, not encapsulated
- No mechanism to handle multiple concurrent pauses

### 2.8 Save Manager (`api/save-manager.ts`)
- File-based save system (JSON files in `saves/` directory)
- `SaveManager`: static methods for save/load/end/cleanup
- `FileManager`: wrapper around `fs` for file operations

**Save Schema (`iSave`):**
```typescript
{ host, date, hostWhite, aiDifficulty, game: pgn, pos: fen, robotPos, oldPos, oldRobotPos }
```

**Technical Debt:**
- `FileManager.loadFile()` returns `{}` as `iSave` on missing file — silently broken
- `FileManager.deleteFile()` uses callback but return value is ignored (async fire-and-forget)
- `removeOld()` deletes saves where `date > time + 3hours` — **inverted comparison** (should be `<`)
- Save filename encoding: `hostId + "+" + clientId` — `+` is not URL-safe
- `loadGame()` and `findGame()` do substring search on filenames — can match wrong files
- `iSave.pos` and `iSave.oldPos` store FEN as strings — no validation
- `iSave.robotPos` is `Array<[string, string]>` — awkward tuple format
- `FileManager` uses `require("fs")` instead of ES import
- `saveGame()` has a stray `2;` on line after interface definition

### 2.9 Puzzle System (`api/puzzles.ts`)
- `PuzzleComponents` interface (fen, moves, rating, tooltip, robotDefaultPositions)
- `processFEINToDefaultPos()` — parses FEN to determine which robots should be at which squares
- `puzzles` object: 7 predefined puzzles with pre-computed robot positions

**Technical Debt:**
- `processFEINToDefaultPos()` has a comment "i actually hate typescript bro" — unprofessional
- Puzzle robot positions are computed at module load time using a `console.log` — side effects
- Puzzle data is hardcoded in the module — no external config or database
- Robot assignment from piece type uses array `.pop()` — order-dependent and fragile

### 3.0 Queue (`api/queue.ts`)
- Simple priority queue implementation (inverted priority: lower = higher priority)
- Used for human vs human matchmaking

**Technical Debt:**
- O(n) insertion and find operations
- `popInd()` has off-by-one potential: `slice(num + 1)` excludes correct element when num is last
- Unused `isEmpty()` method

---

## 3. Command System (`src/server/command/`)

### 3.1 Command Interface (`command.ts`)
- `Command` interface with: `requirements`, `height`, `execute()`, `then()`, `withTimePoint()`
- `Reversible<T>` interface
- `CommandBase` — abstract base with requirement tracking
- `RobotCommand` — command operating on a single robot
- `WaitCommand` — timeout-based wait
- `CommandGroup` — base for composite commands
- `ParallelCommandGroup` — executes all commands concurrently, height = max(heights)
- `SequentialCommandGroup` — executes sequentially, height = sum(heights)
- `timeoutRetry()` — retry logic with exponential backoff

**Technical Debt:**
- `height` is both used for timeout calculation AND parallel scheduling — dual purpose
- `timeoutRetry()` error messages use `\\` — typo
- `ParallelCommandGroup.execute()` uses `.catch()` without handling — swallows errors
- `Command.then()` returns `SequentialCommandGroup` — confusing API surface
- `withTimePoint()` creates a `ParallelCommandGroup` with a `WaitCommand` — clever but obscure

### 3.2 Move Commands (`move-command.ts`)
| Command | Description |
|---------|-------------|
| `RotateCommand` (abstract) | Base rotation command |
| `RelativeRotateCommand` | Relative rotation (reversible) |
| `AbsoluteRotateCommand` | Absolute heading |
| `ReversibleAbsoluteRotateCommand` | Reversible via heading supplier |
| `RotateToStartCommand` | Return to default heading |
| `DriveCommand` | Drive by tile distance (reversible) |
| `RelativeMoveCommand` | Relative position offset (reversible) |
| `AbsoluteMoveCommand` | Absolute position (via relativeMove) |
| `ReversibleAbsoluteMoveCommand` | Reversible via position supplier |
| `DriveTicksCommand` | Drive by encoder ticks (reversible) |
| `DriveQuadraticSplineCommand` | Quadratic bezier spline drive |
| `DriveCubicSplineCommand` | Cubic bezier spline drive |
| `SpinRadiansCommand` | Spin rotation with time |
| `StopCommand` | Stop robot |

**Technical Debt:**
- Every command duplicates the `timeoutRetry()` + `commandIsCompleted` pattern
- `DriveCommand` updates `robot.position` AND `robotManager.updateRobot()` — side effects in commands
- `AbsoluteMoveCommand` uses `relativeMove()` internally — but `relativeMove()` in Robot class has a `// NOTE: the implementation of this is wrong` comment
- `StopCommand` sends `drivePacket(0)` — should use `ESTOP` packet type

### 3.3 Move Piece (`move-piece.ts`)
- `MovePiece` class: wraps setup moves + main move + reverse setup
- Pattern: parallel setup → sequential main → parallel reverse setup

**Technical Debt:**
- Only 15 lines, but tightly coupled to the path materializer

### 3.4 Command Executor (`executor.ts`)
- `CommandExecutor` class — singleton `executor`
- Requirement checking: prevents concurrent commands sharing requirements
- `execute()` — adds to running list, executes, removes on completion
- `finishExecution()` — resumes paused commands
- `clearExecution()` — abort all running commands

**Technical Debt:**
- `checkRequirements()` logs every check at INFO level — noisy logging
- `oldCommands` array is populated but never read or cleared — memory leak
- `getRunningCommands()` returns `ReadonlyArray` but the underlying array is mutable

---

## 4. Robot Module (`src/server/robot/`)

### 4.1 Robot (`robot.ts`)
- Represents a physical/virtual robot
- Properties: `id`, `homeIndices`, `defaultIndices`, `startHeadingRadians`, `thePieceType`, `position`, `headingRadians`
- Communication: `BotTunnel` abstract class (implemented by `RealBotTunnel` or `VirtualBotTunnel`)
- Movement methods: `absoluteRotate()`, `relativeRotate()`, `relativeMove()`, `sendDrivePacket()`, `sendTurnPacket()`, `sendStopPacket()`
- Spline methods: `sendDriveQuadraticPacket()`, `sendDriveCubicPacket()`, `sendSpinPacket()`

**Technical Debt:**
- `relativeMove()` has a `// NOTE: the implementation of this is wrong` comment — dead code path
- `headingRadians` setter is public but `clampHeading()` is applied inconsistently
- `pieceType` getter/setter uses different name (`_pieceType` vs `thePieceType`)
- Constructor has `Number.isNaN()` check on `startHeadingRadians` but TypeScript should catch this
- `setTunnel()` is public — should be constructor-only

### 4.2 Robot Manager (`robot-manager.ts`)
- `RobotManager` — singleton managing all robots
- `idsToRobots: Map<string, Robot>`
- `getIndicesToIds()` — reverse lookup: position → robot ID
- `isRobotAtIndices()` / `getRobotAtIndices()` — position queries
- `createRobotFromId()` — creates robot from config
- `stopAllRobots()` — emergency stop

**Technical Debt:**
- `updateRobot()` deletes all entries for the robot before re-adding — O(n) operation
- `getRobotAtIndices()` logs all key IDs — debugging artifact
- Singleton is initialized with either virtual robots (32) or 2 hardcoded robots
- `virtualRobots` map is created at module load time with side effects

### 4.3 Grid Indices (`grid-indices.ts`)
- 12x12 grid (8x8 board + 2-cell border ring)
- `squareToGrid()` — chess notation to grid indices
- `fromPosition()` — continuous position to grid cell
- Extends `Pair<GridIndices>` for generic pair operations
- Bounds checking (0-11)

### 4.4 Position (`position.ts`)
- Continuous x,y coordinates
- `fromGridIndices()` — grid cell center (i+0.5, j+0.5)
- Extends `Pair<Position>`

### 4.5 Path Materializer (`path-materializer.ts`)
The **most complex file** (~700 lines). Converts chess moves to robot commands.

**Key Functions:**
| Function | Purpose |
|----------|---------|
| `materializePath(move)` | Entry point: creates Command from a chess Move |
| `moveMainPiece(move)` | Moves the primary piece, handling collisions |
| `returnToHome(from, id)` | Returns a captured piece to its home position |
| `moveAllRobotsHomeToDefaultOptimized()` | Setup: all robots from home to starting positions |
| `moveAllRobotsToDefaultPositions()` | Generic setup for puzzles/custom positions |
| `moveAllRobotsFromBoardToHome()` | End game: all robots return home |
| `detectCollisions(move, type)` | Finds robots blocking a move path |
| `findShimmyLocation(pieceId, move, type)` | Calculates where to move blocking pieces |
| `constructDriveCommand()` / `constructRotateCommand()` | Factory functions for commands |
| `constructFinalCommand()` | Assembles the complete MovePiece command |

**Move Types Handled:**
1. **Regular move** — direct path with collision avoidance
2. **Regular capture** — captured piece goes home, then main piece moves
3. **En passant** — same as capture
4. **Queen-side castling** — king moves 2 squares, rook hops over
5. **King-side castling** — same pattern
6. **Setup moves** — all robots from home positions to board
7. **Home moves** — all robots return home

**Technical Debt:**
- **700+ lines** — massive single responsibility violation
- `arrayOfCornersIndicies` and `arrayOfDeadzone` are magic arrays — should be computed
- `moveToDeadZone()` — confusing name, should be `findFastestDeadzoneEntry()`
- Deadzone traversal uses a hardcoded 36-element array — should be algorithmic
- `directionToEdge()` — unclear name, could be `findNearestEdgeDirection()`
- Castling implementation is extremely verbose — duplicates logic for white/black sides
- `constructFinalCommand()` has deeply nested conditionals (horizontal/vertical with >1 collision)
- `findShimmyLocation()` for diagonal/horse moves is mathematically complex and unmaintainable
- Many `console.log()` debug statements left in production code
- Comments like "WHERE THE HELL ARE YOU GOING" and "real" — unprofessional
- `moveAllRobotsHomeToDefaultOptimized()` has complex batching logic that's hard to verify
- No unit tests for any of these functions

---

## 5. Bot Tunnel Layer (`src/server/api/bot-tunnel.ts`)

### 5.1 BotTunnel (Abstract Base)
- `connected` boolean flag
- `dataBuffer: Buffer` — accumulates incoming TCP data
- `onData()` — buffers incoming data
- `handleData()` / `handleQueue()` — parses JSON packets terminated by `;`
- `processPacket()` — abstract, implemented by Real/Virtual variants
- `send()` — abstract, returns Promise<string> (packet ID)

**Technical Debt:**
- `handleData()` logs every incoming packet — should be DEBUG level
- Buffer overflow protection: `str.length > 200` resets buffer — fragile
- No TCP-level flow control or backpressure handling

### 5.2 RealBotTunnel (`tcp-interface.ts`)
- Wraps a `net.Socket` connection to a physical robot
- Handshake: `CLIENT_HELLO` → `SERVER_HELLO` (with config)
- Ping/pong keepalive (`runPings()` runs forever)
- `processPacket()` handles `CLIENT_HELLO`, `PING_RESPONSE`, `ACTION_SUCCESS`, `ACTION_FAIL`
- `send()` — writes to socket, waits for `actionComplete` event (unless excluded)

### 5.3 TCPServer (`tcp-interface.ts`)
- `net.createServer()` on port 3001
- `handleConnection()` — creates `RealBotTunnel` for each connection
- MAC address → robot ID mapping via config
- Disconnect detection: too many failed pings → pause game

**Technical Debt:**
- `config["bots"]` is mutated to add unknown robots — side effect in config
- `disconnectedBots` set is global state with no cleanup
- Auto-unpause when all bots reconnect — can cause unexpected game resumption
- No reconnection retry logic for failed connections
- `makeHello()` returns config with `console.error()` — wrong log level

### 5.4 Virtual Bot Tunnel (`simulator.ts`)
- Mock of `BotTunnel` for testing without physical robots
- `VirtualBotTunnel` — simulates robot movement based on packet type
- `VirtualRobot` — extends `Robot` with virtual tunnel
- `VirtualBotTunnel.messages` — static array of all messages (memory leak)
- Stack trace capture via `getStack()` for debugging

**Technical Debt:**
- `emitActionComplete()` hardcodes 750ms delay — must match frontend animation
- `VirtualBotTunnel.messages` is static and never cleared
- Stack trace parsing is regex-based and fragile
- `processPacket()` only handles a subset of packet types — unhandled types are logged as warnings

---

## 6. Simulator (`src/server/simulator.ts`)
- `VirtualBotTunnel` and `VirtualRobot` classes (defined here)
- `virtualRobots` — global Map of 32 virtual robots
- Creates virtual robots from `bot-server-config.json`

**Technical Debt:**
- The virtual robot classes are split between `simulator.ts` and `tcp-interface.ts` (BotTunnel classes)
- 32 virtual robots are created regardless of whether `USE_VIRTUAL_ROBOTS` is true — waste

---

## 7. Configuration (`api/bot-server-config.json`)
- **tcpServerPort**: 3001
- **bots**: MAC address → robot ID mapping (8 real robots configured)
- **robot-1 through robot-32**: Full config for all robots
  - `attributes.piece_type`: e.g., "w_pawn", "b_king"
  - `homeIndices`: Starting position (off-board)
  - `defaultIndices`: Board position at game start
  - `startHeadingRadians`: 1.57 (90°) for white, 4.71 (270°) for black
- **botConfigSchema**: GPIO pin configurations for ESP32 firmware

**Technical Debt:**
- Config file is 400+ lines with 32 robot entries — should be generated or externalized
- Robot IDs are hardcoded (`robot-1` to `robot-32`)
- Motor calibration (robot-15 has `MOTOR_A_DRIVE_MULTIPLIER: 1.3`) — config drift risk
- No schema validation for the config file

---

## 8. Client Module (`src/client/`)

### 8.1 Router (`router.tsx`)
React Router routes:
| Path | Component | Purpose |
|------|-----------|---------|
| `/home` | `Home` | Redirect to `/game` or `/lobby` based on game state |
| `/setup` | `Setup` | Game type selection (host only) |
| `/lobby` | `Lobby` | Waiting area (spectators/clients) |
| `/game` | `Game` | Active game view |
| `/debug` | `Debug` | Manual robot control |
| `/debug/simulator` | `Simulator` | Virtual robot visualization |
| `/debug2` | `Debug2` | Unknown/unused |
| `/editor` | `Editor` | Showfile choreography editor |

**Technical Debt:**
- `/debug2` route exists but the component source is unclear (could be unused)
- No protected routes — any authenticated user can access debug tools
- No error boundary or fallback route

### 8.2 API Layer (`api.ts`)
- `useSocket()` — React hook for WebSocket communication
- `useEffectQuery()` — wrapper around `@tanstack/react-query` for one-time fetches
- `get()` / `post()` — HTTP request helpers
- WebSocket URL: `ws(s)://host/ws?page=...`

**Technical Debt:**
- `useEffectQuery` sets `staleTime: Infinity` — never refetches
- Error handling is minimal — just `throw new Error("Invalid response")`
- WebSocket URL construction doesn't account for subpath deployments

### 8.3 Game Screen (`game/game.tsx`)
- `ChessEngine` state management
- `getMessageHandler()` — factory for WebSocket message routing
- Draw dialogs, pause dialogs, game end dialog
- Chessboard rendering via `ChessboardWrapper`

**Technical Debt:**
- Move animation uses hardcoded 500ms `setTimeout` — should be configurable
- `gamePaused` state is managed locally but could be stale
- No optimistic update for moves — waits for server confirmation

### 8.4 Chessboard (`chessboard/`)
| File | Purpose |
|------|---------|
| `chessboard-wrapper.tsx` | Main chessboard component, handles move input |
| `board-container.tsx` | Layout container with rotation support |
| `custom-square-renderer.tsx` | Highlighting (legal moves, selected square) |
| `custom-square-context.tsx` | React context for square rendering |
| `svg-components.tsx` | SVG icons for custom squares |
| `board-transform.ts` | Board orientation transforms |

**Technical Debt:**
- `ChessboardWrapper` is ~180 lines — could be split
- Promotion handling has both automatic and manual flows — confusing UX
- `customSquareRenderer` is called for every square on every render — performance concern
- `BoardContainer` handles rotation separately from the chessboard library

### 8.5 Setup (`setup/`)
| File | Purpose |
|------|---------|
| `setup.tsx` | Main setup screen (host): choose game type |
| `setup-base.tsx` | Shared layout wrapper |
| `setup-game.tsx` | Game type specific setup (human/computer) |
| `lobby.tsx` | Waiting screen for non-host players |
| `sidebar.tsx` | Side panel (possibly for spectator info) |

### 8.6 Debug Tools (`debug/`)
| File | Purpose |
|------|---------|
| `debug.tsx` | Manual robot control UI |
| `debug2.tsx` | Unknown functionality |
| `simulator.tsx` | Virtual robot grid with message log |
| `drive-robot.tsx` | Tank drive controls |
| `drive-slider.tsx` | Motor power sliders |
| `select-robot.tsx` | Robot selection dropdown |
| `set-robot-variable.tsx` | Robot configuration UI |
| `debug.scss` / `simulator.scss` | Styles |

**Technical Debt:**
- `select-robot.tsx` is a controlled component with a potentially large list
- `DriveRobot` uses tank controls but the underlying command is `DriveRobotMessage` with left/right power
- Debug tools are accessible without authentication

### 8.7 Show Editor (`editor/`)
| File | Purpose |
|------|---------|
| `editor.tsx` | Main showfile editor UI |
| `showfile-state.ts` | `useShowfile()` hook — all state + CRUD operations |
| `timeline.tsx` | Timeline track rendering |
| `spline-editor.tsx` | Spline point editing on the grid |
| `hooks.ts` | `usePlayHead`, `useStateWithTrackedHistory`, etc. |
| `motion-robot.tsx` | Animated robot visualization |
| `points.tsx` | Spline control point rendering |

**Technical Debt:**
- `useShowfile()` hook is ~500 lines — massive hook
- `editor.tsx` component is ~400 lines
- State management is all in one hook — should be split into multiple hooks or use Zustand/Redux
- Undo/redo uses `deep-object-diff` which is inefficient for large showfiles
- `AnimatedRobotRenderer` uses `useMotionValueEvent` — could be simplified
- Clipboard operations (copy/paste) are implemented but the UX is unclear
- "Coming soon: event editor" placeholder in the Inspect section

### 8.8 Puzzle Screen (`puzzle/`)
| File | Purpose |
|------|---------|
| `select-puzzle.tsx` | Puzzle selection list |
| `setup-puzzle.tsx` | Puzzle game setup |

### 8.9 Utility Components
| File | Purpose |
|------|---------|
| `PuzzleTipBox.tsx` | Tooltip display for puzzles |
| `begin-check-refresh.tsx` | Page refresh handling |
| `check-dark-mode.tsx` | Theme management |
| `colors.css` | CSS variables for theming |

---

## 9. Environment & Configuration

### 9.1 Environment Variables (`server/utils/env.ts`)
| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | Environment mode |
| `ENABLE_SAVES` | `false` | Enable game save/load |
| `VIRTUAL_ROBOTS` | `false` | Use virtual robots instead of TCP |
| `START_ROBOTS_AT_DEFAULT` | `false` | Skip setup movement |
| `MOVE_TIMEOUT` | `1000` | Seconds per move |
| `MAX_RETRIES` | `2` | Move retry count |
| `PING_INTERVAL` | `1000ms` | Robot keepalive interval |
| `PING_TIMEOUT` | `100ms` | Ping response window |
| `MAX_PING_FAIL` | `3` | Disconnect threshold |

### 9.2 Project Config
- `tsconfig.json` — monorepo config with client/server sub-configs
- `vite.config.ts` — Vite build configuration
- `.eslintrc.cjs` — Linting rules
- `.prettierrc` — Formatting
- `nodemon.json` — Dev server auto-restart

---

## Architectural Observations

### Data Flow
```
Client (React) ──WebSocket──> Server API ──TCP──> Robots (ESP32 firmware, not in repo)
     │                           │
     │                       REST endpoints
     │                           │
     │                           Save files (JSON)
     │
Showfile Editor ──POST /do-big──> Command Executor ──TCP──> Robots
```

### Key Dependencies Between Modules
```
api.ts ──┬──► game-manager.ts ──► path-materializer.ts ──► command/
         │                         │
         ├──► client-manager.ts
         ├──► socket-manager.ts
         ├──► save-manager.ts
         ├──► pauseHandler.ts
         ├──► puzzles.ts
         ├──► tcp-interface.ts
         └──► simulator.ts
         
command/ ──► robot/robot.ts ──► api/bot-tunnel.ts
```

---

## Priority Technical Debt Areas

### 🔴 Critical (Breaking/Unsafe)
1. **`api.ts` is a god file** (~500 lines) — WebSocket handler + REST API + business logic all in one file
2. **`path-materializer.ts` is enormous** (~700 lines) — too many responsibilities
3. **Public pause/unpause endpoints** — anyone can pause any game
4. **`PuzzleGameManager` instanceof bug** — `message instanceof (A || B)` always true
5. **Save manager `removeOld()` has inverted comparison** — deletes recent saves, keeps old ones

### 🟠 High (Should Fix Soon)
6. **Duplicate move execution** in `HumanGameManager` and `ComputerGameManager`
7. **No cleanup of empty socket sets** — memory leak
8. **`oldCommands` in executor never cleared** — memory leak
9. **`VirtualBotTunnel.messages` is static and never cleared** — memory leak
10. **Magic arrays in path-materializer** (`arrayOfCornersIndicies`, `arrayOfDeadzone`) — should be computed
11. **Config file is 400+ lines** — should be generated or externalized
12. **No input validation on POST endpoints**

### 🟡 Medium (Good to Fix)
13. **`useShowfile()` hook is ~500 lines** — should be split
14. **`editor.tsx` is ~400 lines** — should be split
15. **Many `console.log()` statements in production code**
16. **Inconsistent error handling** (throw vs return false vs return undefined)
17. **`FileManager` uses `require("fs")` instead of ES import**
18. **Queue has O(n) operations** — should use a proper binary heap
19. **No rate limiting** on any endpoint
20. **`StopCommand` uses wrong packet type** (DRIVE_TILES instead of ESTOP)

### 🟢 Low (Nice to Have)
21. **Debug `console.log` in `ClientManager.isPlayer()`** — should be removed
22. **`makeClientManager()` factory is unused**
23. **`/debug2` route may be unused**
24. **Comments like "WHERE THE HELL ARE YOU GOING"** — should be proper error messages
25. **Puzzle comments like "i actually hate typescript bro"** — unprofessional
26. **Hardcoded `GRID_CELL_PX = 60` and `750ms` animation delay** — should be constants
