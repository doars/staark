import {
  ROOM_CLOSED,
  ROOM_JOINED,
  USER_JOINED,
  USER_KICK,
  USER_LEFT,
  USER_VALIDATED,
} from './types.js'

import {
  createEvent,
} from '../utilities/event.js'
import {
  calculateTime,
  splitTime,
} from '../utilities/time.js'
import {
  ROOM_PREFIX,
  SERVER_PREFIX,
  SHARED_ENCRYPTION_PREFIX,
  USER_ENCRYPTION_PREFIX,
  USER_PAYLOAD,

  getPrefix,
  prefix,
  wrapPayload,
} from '../utilities/prefix.js'

const USER_ENCRYPTION_ALGORITHM = 'RSA-OAEP'
const SHARED_ENCRYPTION_ALGORITHM = 'AES-GCM'
const DEFAULT_HOST = 'http://localhost:3000'

const encrypt = crypto.subtle.encrypt
const decrypt = crypto.subtle.decrypt
const generateKey = window.crypto.subtle.generateKey

/**
 * @typedef {import('../utilities/event.js').Event} Event
 */

/**
 * @typedef {Object} ConnectorOptions
 *
 * @property {string} [createRoomEndpoint='/create-room'] - HTTP endpoint for creating a room.
 * @property {string} [joinRoomEndpoint='/join-room'] - WebSocket endpoint for joining a room.
 *
 * @property {string} [contentType='application/json'] - Content-Type for HTTP requests.
 * @property {Function} [deserializeMessage=JSON.parse] - Function to deserialize incoming messages.
 * @property {Function} [serializeMessage=JSON.stringify] - Function to serialize outgoing messages.
 *
 * @property {string} [httpUrl='http://localhost:3000'] - Base HTTP URL for API requests.
 * @property {string} [wsUrl='http://localhost:3000'] - Base WebSocket URL for room connections.
 */

/**
 * @typedef {Object} ConnectorAPI
 *
 * @property {Event} onError - Event for error handling.
 * @property {Event} onMessage - Event for receiving messages.
 * @property {Event} onRoomJoin - Event for room join notifications.
 * @property {Event} onRoomLeave - Event for room leave notifications.
 * @property {Event} onUserJoin - Event for user join notifications.
 * @property {Event} onUserLeave - Event for user leave notifications.
 * @property {Event} onUserValidated - Event for user validated notifications.
 *
 * @property {Function} createRoom - Creates a new room and joins it.
 * @property {Function} closeRoom - Closes the room for all. Only allowed by the creator.
 * @property {Function} joinRoom - Joins an existing room.
 * @property {Function} leaveRoom - Leaves the current room.
 * @property {Function} messageRoom - Sends a message to the current room.
 *
 * @property {Function} kickUser - Remove's a player's connection. Only allowed by the creator.
 */

/**
 * Creates a connector for managing room-based WebSocket communication.
 *
 * @param {ConnectorOptions} [options={}] - Configuration options for the connector.
 * @returns {ConnectorAPI} Connector API with event handlers and room management methods.
 */
export const createClientConnector = (
  options = {},
) => {
  const {
    contentType = 'application/json',
    deserializeMessage = JSON.parse,
    serializeMessage = JSON.stringify,

    createRoomEndpoint = '/create-room',
    joinRoomEndpoint = '/join-room',

    httpUrl = DEFAULT_HOST,
    wsUrl = DEFAULT_HOST,
  } = options

  let _creatorId,
    _sharedKey,
    _password,
    _socket,
    _userId,
    _userKeys = generateKey({
      name: USER_ENCRYPTION_ALGORITHM,
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    }, true, ['encrypt', 'decrypt'])
  /**
   * TODO:
   * 1. Make public key exportable. crypto.subtle.exportKey('jwt', _userKeys.privateKey)
   */

  const onError = createEvent()
  const onMessage = createEvent()
  const onRoomJoin = createEvent()
  const onRoomLeave = createEvent()
  const onUserJoin = createEvent()
  const onUserLeave = createEvent()
  const onUserValidated = createEvent()

  /**
   * Closes the current socket connection and resets the socket reference. This function should be called when leaving a room to ensure that the socket connection is properly closed and cleaned up.
   */
  const leaveRoom = (
  ) => {
    if (_socket) {
      _socket.close()
      _creatorId = _password = _socket = _userId = null
    }
  }

  /**
   * Joins a WebSocket room with the specified room code and optional credentials. Establishes a WebSocket connection to the server, appending the room code, password, and creator secret (if provided) as query parameters. Sets up event listeners for 'close', 'error', and 'message' events to handle room leave, errors, and incoming messages respectively.
   *
   * @param {string} roomCode - The code of the room to join.
   * @param {string|null} [password=null] - Optional password for the room.
   * @param {string|null} [creatorSecret=null] - Optional creator secret for verifying this user is the creator of the room.
   */
  const _joinRoom = (
    roomCode,
    password = null,
    creatorSecret = null,
  ) => {
    _password = password

    const url = new URL(
      wsUrl + joinRoomEndpoint,
    )
    url.searchParams.append(
      'code',
      roomCode,
    )
    if (creatorSecret) {
      url.searchParams.append(
        'creator',
        creatorSecret,
      )
    }

    _socket = new WebSocket(
      url.toString(),
    )

    _socket.addEventListener('close', (
      event,
    ) => {
      onRoomLeave.dispatch({
        event,
      })
    })

    _socket.addEventListener('error', (
      event,
    ) => {
      onError.dispatch({
        event,
      })
      leaveRoom()
    })

    _socket.addEventListener('message', async (
      event,
    ) => {
      let data = event.data,
        iv,
        prefix,
        serverTime

      [serverTime, data] = splitTime(data)

      // Check if an initialization vector is present.
      [iv, data] = splitInitializationVector(data)
      [prefix, data] = getPrefix(data)
      if (prefix === SHARED_ENCRYPTION_PREFIX) {
        if (!_sharedKey) {
          // Can't decrypt without the key.
          return
        }
        await _sharedKey

        data = await decrypt({
          name: SHARED_ENCRYPTION_ALGORITHM,
          iv: iv,
        }, _sharedKey, data)
        data = new TextDecoder().decode(data)
      } else if (prefix === USER_ENCRYPTION_PREFIX) {
        await _userKeys

        data = await decrypt({
          name: USER_ENCRYPTION_ALGORITHM,
          iv: iv,
        }, _userKeys.privateKey, data)
        data = new TextDecoder().decode(data)
      }

      try {
        data = deserializeMessage(data)
      } catch (error) {
        onError.dispatch({
          error: new Error('Failed to parse message: ' + event.data),
        })
        return
      }

      if (data.type === ROOM_JOINED) {
        _creatorId = data.creatorId

        onRoomJoin.dispatch({
          creatorId: data.creatorId,
          userId: data.userId,
          users: data.users,
        })
      } else if (data.type === USER_LEFT) {
        onUserLeave.dispatch({
          userId: data.userId,
        })
      } else if (data.type === USER_JOINED) {
        onUserJoin.dispatch({
          userId: data.userId,
        })

        if (creatorId === userId) {
          await _userKeys

          /**
           * TODO:
           * 1. Share public key with new user and received public key of new user.
           * 2. Validate password if required.
           * 3. Share shared encryption key.
           * 4. Inform server of user validation.
           */
        }
      } else if (data.type === USER_VALIDATED) {
        onUserValidated.dispatch({
          userId: data.userId,
        })

        /**
         * TODO:
         * 1. Exchange public key's for direct messages. This can't be done using the shared key as this could have been send by anyone in the room with the shared key.
         */
      } else {
        onMessage.dispatch({
          data,
          time: calculateTime(
            serverTime,
            data?.senderTime,
          ),
        })
      }
    })
  }

  const _message = async (
    data,
    options = {},
  ) => {
    if (
      !_socket
      || _socket.readyState !== WebSocket.OPEN
    ) {
      onError.dispatch({
        error: new Error('Socket is not open'),
      })
      return false
    }

    let message = serializeMessage({
      type: 'message',
      ...data,
      sender: _userId,
      senderTime: Date.now(),
    })
    if (options.receiver) {
      /**
       * TODO:
       * 1. Encrypt data using receivers public key.
       * 1.a. If this key is no known return out of this function with false and dispatch an error.
       * 1.b. Or hold onto this message and send it as soon as the public key of the receiver is known.
       */

      message = wrapPayload(
        options.receiver,
        USER_PAYLOAD,
      ) + message
    } else if (options.server) {
      message = prefix(
        message,
        SERVER_PREFIX,
      )
    } else {
      // Encrypt data using shared key.
      const iv = crypto.getRandomValues(new Uint8Array(12))
      message = await encrypt({
        name: SHARED_ENCRYPTION_ALGORITHM,
        iv: iv,
      }, key, new TextEncoder().encode(message))
      message = wrapPayload(
        iv
      ) + message

      message = prefix(
        message,
        ROOM_PREFIX,
      )
    }
    _socket.send(message)

    return true
  }
  const messageServer = (
    data,
  ) => (
    userId
    // Only allow creator to send messages to the server.
    && userId === creatorId
    && _message(data, {
      server: true,
    })
  )
  const messageUser = (
    data,
    userId,
  ) => (
    userId
    && _message(data, {
      receiver: userId,
    })
  )

  return {
    onError,
    onMessage,

    onRoomJoin,
    onRoomLeave,

    onUserJoin,
    onUserLeave,
    onUserValidated,

    messageRoom: (
      data,
    ) => _message(data),
    messageServer,
    messageUser,

    closeRoom: (
    ) => messageServer({
      type: ROOM_CLOSED,
    }),
    createRoom: async (
      password,
      options = {},
    ) => {
      _password = password

      _sharedKey = generateKey({
        name: SHARED_ENCRYPTION_ALGORITHM,
        length: 256,
      }, true, ['encrypt', 'decrypt'])

      const url = new URL(
        httpUrl + createRoomEndpoint,
      )
      if (options.limit) {
        url.searchParams.append(
          'limit',
          options.limit,
        )
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': contentType,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to create room')
      }

      let data = await response.text()
      data = deserializeMessage(data)

      _userId = data.userId

      _joinRoom(
        roomCode,
        password,
        data.creatorSecret,
      )

      return data
    },
    joinRoom: (
      roomCode,
      password = null,
    ) => _joinRoom(
      roomCode,
      password,
    ),
    leaveRoom,

    kickUser: (
      userId,
    ) => messageServer({
      type: USER_KICK,
      userId,
    }),
  }
}
