---
title: Architecture
---

# Server Client Interface

The server and the client (e.g. browser tab) have two ways of communicating - a REST API and web sockets.

Web sockets provide fast, two-way communication.

The REST API provides a one way interface, where the client makes a request to the server and then receives a response.

We use the REST API for immediate communication between the server and the client, when the client expects a direct response to its request from the server. For example, `getIds` is implemented as an HTTP GET request since we want the server to provide the requested IDs immediately in response to the request.
