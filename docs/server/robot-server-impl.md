---
title: Robot Manager
---

# Robot Server Implementation

We choose to define the total area as a 12x12 grid, with an 8x8 chessboard in the middle.
This should leave adequate room on the outside to store pieces. The inner lane should be open at all times (except in the case where a robot is in transit through it).

We create a RobotManager which maps the indices of where the robot is assigned on the grid to the actual robot. Each robot also
stores its current x, y position, where x and y are in grid coordinates and represents the position the robot is physically at.
A robot's x, y position is allowed to deviate from its index position e.g. during the execution of maneuvers, but should be otherwise consistent.
