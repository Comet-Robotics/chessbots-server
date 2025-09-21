---
title: Packet Format
---

## Data types

-   `bool`: true/false
-   `uint4`: a single hex digit
-   `uint8`: 2 hex digits
-   `uint16`: 4 hex digits
-   `uint32`: 8 hex digits

## General packet format

-   SrcID: uint8 character robot discriminator, ff for multicast and fe for server
-   DestID: uint8 character robot discriminator, ff for multicast and fe for server
-   SeqID: uint16 packet sequence ID, rolls over
-   PacketType: uint8 character packet type identifier
-   Contents: Whatever goes in the packet, up to 87 bytes

`:PacketType[,CONTENTS];`

## Packet types

```
00 NOTHING
    No-op packet.
```

```
01 CLIENT_HELLO
    Client sends this on connection to server.

    String macAddress
```

```
02 SERVER_HELLO
    TBD
```

```
03 PING_SEND
    Server sends this to ping client.
```

```
04 PING_RESPONSE
    Client sends this to respond to server ping.
```

```
05 QUERY_VAR
    TBD
```

```
06 QUERY_RESPONSE
    TBD
```

```
07 INFORM_VAR
    TBD
```

```
08 SET_VAR
    TBD
```

```
09 TURN_BY_ANGLE
    Server sends this to client to turn the robot by a specified angle, in radians.

    double angle
```

```
0a DRIVE_TILES
    Server sends this to client to drive the robot forward/backward, in tile units.

    double tileDistance
```

```
0b ACTION_SUCCESS
    Client sends this to server to indicate the action completed successfully.
```

```
0c ACTION_FAIL
    Client sends this to server to indicate the action failed.

    String reason
```

```
0d DRIVE_TANK
    Server sends this to client to control the left and right motors individually.

    float left
    float right
```

```
0e ESTOP
    Server sends this to client to stop motors on the robot.
```
