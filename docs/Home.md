Welcome to the ChessBots wiki!

If you want to learn more about the project or get involved, this is the place to be!

## Server and Client

The server is what does most of the logic of how pieces should move, and sends the movement commands to the ChessBots. It also handles communication with the client. The server logic uses Typescript while the Front-End is created with React. The end goal is to have the server hosted on a raspberry pi.

Please have a look at the [Server Structure](Server-Structure) if you want a high level overview of its various aspects.  
If you want to want to start developing the server side, first check out our [Server Setup Guide](Server-Setup).  
You can then read through the [Server Development Guide](Server-Development).

## ChessBots Software

ChessBots software handles receiving movement commands from the server, and figuring out how to move the motors and read the sensors to comply with the command. The ChessBot uses an ESP32-S2 Mini as the microcontroller and transmitter/receiver. The onboard logic uses C++ for ESP-IDF.

Please have a look at the [ESP Structure](ESP-Structure) if you want a high level overview of its various aspects.  
If you want to want to start developing the bot side, first check out our [ESP Setup Guide](ESP-Setup).  
You can then read through the [ESP Development Guide](ESP-Development).

## ChessBots Hardware

A PCB is being made for the ChessBots that will allow them to work easily with an ESP32-S2 Mini microcontroller.

## Resource Library

In addition, we also have helpful information for concepts used in the project in our [Resource Library](Resource-Library).
