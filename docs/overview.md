---
title: Overview
---

Welcome to the ChessBots wiki!

If you want to learn more about the project or get involved, this is the place to be!

## Server and Client

The server is what does most of the logic of how pieces should move, and sends the movement commands to the ChessBots. It also handles communication with the client. The server logic uses Typescript while the Front-End is created with React. The end goal is to have the server hosted on a Raspberry Pi.

Check out our [Server-Client Overview](server/index.md) to start developing the server side!

## ChessBots Embedded Software

ChessBots embedded software handles receiving movement commands from the server, and figuring out how to move the motors and read the sensors to comply with the command. The ChessBot uses an ESP32-S2 Mini as the microcontroller and transmitter/receiver. The onboard logic uses C++ for ESP-IDF.

Check out our [Embedded Overview](esp/index.md) to start developing the server side!

## ChessBots Hardware

A PCB is being made for the ChessBots that will allow them to work easily with an ESP32-S2 Mini microcontroller.

## Resource Library

In addition, we also have helpful information for concepts used in the project in our [Resource Library](resources.md).
