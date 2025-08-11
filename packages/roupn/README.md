# roupn

Synchronise application state between users in real-time via end-to-end encrypted messages.

- Minimal footprint with no unnecessary dependencies.
- Communication is encrypted from one client to another, ensuring privacy.
- The server only relays messages and cannot decrypt the content send.
- A built-in verification flow helps prevent man-in-the-middle attacks.
- Automatically synchronizes a shared state object between clients using an efficient diffing mechanism.
- Provides straightforward functions for setting up both the server and client.

`roupn` operates with a central server that acts as a message relay. Clients connect to this server to create or join rooms. The room's creator is responsible for verifying new users to ensure they are who they claim to be, establishing a secure room for the group. All data exchanged between clients is end-to-end encrypted and is verified during the joining process.

Because the messages are always end-to-end encrypted the server used by the users does not have to be trusted by the users. Instead it can be any server that simply has the protocol accessible on it. The server will not be able to see into the data being transmitted, just when and which user sends a message. This metadata is of course still private data and therefore a trusted server should still be used if available.

## From the user's perspective

A user can be given the option to create or join a room. When creating a room this user is given their assigned room code from the server, for example `AB3D5F`. They provide this to the other users they want to join. The users join and each are show a different code on their screen, for example `U2W4YZ`. This code must then be provided back to the room's creator over a secure and trusted channel. The room's creator then enters this code in to verify the joining user. The verification code is there to verify that the public keys received by both users have not been altered, ensuring encrypted messages can not been decrypted by any other party.

## Usage

### Setting up the server

The server is responsible for creating rooms and relaying messages between users. You can set up a server using `createServerConnector`. It handles HTTP requests for creating rooms and WebSocket connections for real-time communication.

#### `createServerConnector(options)`

- `contentType` (`string`): Content type for messages. Default: `'application/json'`.
- `deserializeMessage` (`Function`): Function to deserialize messages. Default: `JSON.parse`.
- `serializeMessage` (`Function`): Function to serialize messages. Default: `JSON.stringify`.
- `createRoomEndpoint` (`string`): Endpoint for creating a room. Default: `'/create-room'`.
- `joinRoomEndpoint` (`string`): Endpoint for joining a room. Default: `'/join-room'`.
- `maxUsersPerRoom` (`number`): Absolute maximum users allowed per room. Default: `50`.
- `rateLimitAttempts` (`number`): Maximum number of requests for creating or joining a room. Default: `5`.
- `rateLimitDuration` (`number`): Time frame for rate limit in milliseconds. Default: `60000`.

> For a complete example see the [server.js in the example directory](./exm/server.js).

### Setting up the client

On the client-side, you can use the `createClientConnector` to handle the connection and encryption. Or use you can use the `createClientSynchronizer` to handle the connection, encryption and state management.

The synchronizer works with two state objects. A private state, this object holds connection status, user IDs, and other internal data. It should be treated as read-only. And a public state, this object is the shared state that gets synchronized across all users in the room. Any changes made to it will be automatically broadcast to other users.

#### `createClientConnector(options)`

- `createRoomEndpoint` (`string`): HTTP endpoint for creating a room. Default: `'/create-room'`.
- `joinRoomEndpoint` (`string`): WebSocket endpoint for joining a room. Default: `'/join-room'`.
- `contentType` (`string`): Content-Type for HTTP requests. Default: `'application/json'`.
- `deserializeMessage` (`Function`): Function to deserialize incoming messages. Default: `JSON.parse`.
- `serializeMessage` (`Function`): Function to serialize outgoing messages. Default: `JSON.stringify`.
- `httpUrl` (`string`): Base HTTP URL for API requests. Default: `'http://localhost:3000'`.
- `wsUrl` (`string`): Base WebSocket URL for room connections. Default: `'http://localhost:3000'`.
- `messageBufferMaxCount` (`number`): The maximum number of messages to store in the buffer. Default: `50`.
- `messageBufferMaxDuration` (`number`): The maximum duration in milliseconds to store a message in the buffer. Default: `60000`.

When creating or joining a room, you can provide the following options:

- `publicData` (`any`): Data that is shared publicly with other users before the connection is fully established. This can be used to verify that the applications are compatible, it is recommended to obfuscated this information to prevent the server from knowing which apps are used. This can be done by hashing the app name and verion number to gether with a nonce.
- `verifyPublicData` (`Function`): A function that verifies the public data from other users.

> TODO: add privateData exchange after end-to-end encryption has been verified, but before the joining user is given the room's shared key.

#### `createClientSynchronizer(options)`

- All createClientConnector options.
- `windowPerUser` (`number`): Number of state updates to keep per joined user. Used in case of rollbacks. Default: `16`.
- `synchronisationInterval` (`number`): Interval in milliseconds for a full state synchronisation. Default: `60000`.

> For a complete example see the [client.js in the example directory](./exm/client.js).

## Installation

Via NPM

```sh
npm install @doars/roupn
```

## Server

```javascript
import { createServerConnector } from '@doars/roupn'
```

## Client

IIFE build via a CDN

```html
<!-- Base bundle (connector only) -->
<script src="https://cdn.jsdelivr.net/npm/@doars/roupn@1/dst/roupn.base.iife.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@doars/roupn@1/dst/roupn.base.iife.min.js"></script>
<!-- Full bundle (connector and synchronizer) -->
<script src="https://cdn.jsdelivr.net/npm/@doars/roupn@1/dst/roupn.iife.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@doars/roupn@1/dst/roupn.iife.min.js"></script>
```

ESM build via a CDN

```javascript
// Base bundle (connector only).
import { createClientConnector } from 'https://cdn.jsdelivr.net/npm/@doars/roupn@1/dst/roupn.base.js'
// Full bundle (connector and synchronizer).
import { createClientConnector, createClientSynchronizer } from 'https://cdn.jsdelivr.net/npm/@doars/roupn@1/dst/roupn.js'
```
