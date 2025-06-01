import {
  ROOM_CLOSE,
  ROOM_JOINED,
  USER_JOINED,
  USER_KICK,
  USER_LEFT,
} from './types.js'

import {
  createEvent,
} from '../utilities/event.js'
import {
  calculateTime,
  splitTime,
} from '../utilities/time.js'
import {
  SERVER_PREFIX,
  wrap,
} from '../utilities/wrap.js'

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

    httpUrl = 'http://localhost:3000',
    wsUrl = 'http://localhost:3000',
  } = options

  let _creatorId,
    _password,
    _socket,
    _userId

  const onError = createEvent()
  const onMessage = createEvent()
  const onRoomJoin = createEvent()
  const onRoomLeave = createEvent()
  const onUserJoin = createEvent()
  const onUserLeave = createEvent()

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
   *
   * @fires onRoomLeave - Dispatched when the socket connection is closed.
   * @fires onError - Dispatched when an error occurs with the socket.
   * @fires onRoomJoin - Dispatched when the room is successfully joined.
   * @fires onUserLeave - Dispatched when a user leaves the room.
   * @fires onUserJoin - Dispatched when a user joins the room.
   * @fires onMessage - Dispatched for all other incoming messages.
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
    url.searchParams.append('code', roomCode)
    if (creatorSecret) {
      url.searchParams.append('creator', creatorSecret)
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

    _socket.addEventListener('message', (
      event,
    ) => {
      let data,
        [dataString, serverTime] = splitTime(event.data)
      try {
        // TODO: Decrypt?
        data = deserializeMessage(
          dataString
        )
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
        if (
          password
          && creatorId === userId
        ) {
          // TODO: Share encryption key if password is required.
        } else {
          onUserJoin.dispatch({
            userId: data.userId,
          })
        }
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

  const _message = (
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
    if (options.message) {
      message = wrap(
        message,
        SERVER_PREFIX,
      )
    }
    _socket.send(message)

    return true
  }
  const messageServer = (
    data,
  ) => (
    userId
    && userId === creatorId
    && _message(data, {
      server: true,
    })
  )

  return {
    onError,
    onMessage,
    onRoomJoin,
    onRoomLeave,
    onUserJoin,
    onUserLeave,

    closeRoom: (
    ) => messageServer({
      type: ROOM_CLOSE,
    }),
    createRoom: async (
      password,
      options = {},
    ) => {
      _password = password

      const url = new URL(
        httpUrl + createRoomEndpoint,
      )
      if (options.limit) {
        url.searchParams.append('limit', options.limit)
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
    messageRoom: (
      data,
    ) => _message(data),
    messageServer,

    kickUser: (
      userId,
    ) => messageServer({
      type: USER_KICK,
      userId,
    }),
  }
}
