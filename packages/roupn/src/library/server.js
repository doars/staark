import {
  randomUUID,
} from 'crypto'
import {
  parse,
} from 'url'

import {
  generateCode,
} from '../utilities/code.js'
import {
  createEvent,
} from '../utilities/event.js'
import {
  ERROR,
  ROOM_JOINED,
  ROOM_REMOVED,
  SERVER_MESSAGE,
  USER_JOINED,
  USER_LEFT,
} from './types.js'

/**
 * @typedef {import('../utilities/event.js').Event} Event
 */

/**
 * @typedef {Object} RoomSyncOptions
 * @property {number} [maxUsersPerRoom=50] - Absolute maximum users allowed per room.
 * @property {Function} [serializeMessage=JSON.stringify] - Function to serialize messages.
 * @property {string} [contentType='application/json'] - Content type for messages.
 * @property {string} [createRoomEndpoint='/create-room'] - Endpoint for creating a room.
 * @property {string} [joinRoomEndpoint='/join-room'] - Endpoint for joining a room.
 */

/**
 * @typedef {Object} RoomSyncReturn
 * @property {Function} createRoom - Creates a new room.
 * @property {Function} joinRoom - Joins a user to a room.
 * @property {Function} removeRoom - Removes a room and disconnects all users.
 * @property {Function} leaveRoom - Removes a user from a room.
 * @property {Function} messageRoom - Broadcasts a message to all users in a room.
 * @property {Function} messageUser - Sends a direct message to a user in a room.
 * @property {Event} onRoomMessage - Event dispatched when a message is sent to a room.
 * @property {Event} onRoomRemove - Event dispatched when a room is removed.
 * @property {Event} onUserLeave - Event dispatched when a user leaves a room.
 * @property {Event} onUserJoin - Event dispatched when a user joins a room.
 * @property {Function} getRoom - Retrieves room details by code.
 * @property {Function} getRoomCodes - Returns an array of all room codes.
 * @property {Function} getRoomCount - Returns the number of active rooms.
 * @property {Function} handleHttpRequest - Handles HTTP requests for room creation.
 * @property {Function} handleSocketUpgrade - Handles WebSocket upgrade requests for joining rooms.
 */

/**
 * Creates a RoomSync instance.
 * @param {RoomSyncOptions} options
 * @returns {RoomSyncReturn} API to interact with RoomSync
 */
export const createSynchronizer = (
  options = {},
) => {
  const {
    maxUsersPerRoom = 16,
    serializeMessage = JSON.stringify,
    contentType = 'application/json',

    createRoomEndpoint = '/create-room',
    joinRoomEndpoint = '/join-room',
  } = options

  const onRoomMessage = createEvent()
  const onRoomRemove = createEvent()
  const onUserJoin = createEvent()
  const onUserLeave = createEvent()

  /** @type {Map<string, { hostId: string, hostSecret: string, password: string|null, userLimit: number, users: Map<string, WebSocket> }>} */
  const rooms = new Map()

  /**
   * Creates a new room with a unique code and initializes its properties.
   *
   * @param {Object} [options={}] - Optional settings for the room.
   * @param {number} [options.limit] - Maximum number of users allowed in the room.
   * @param {string} [options.password] - Optional password for the room.
   * @returns {Object} An object containing the hostSecret, roomCode, and userId.
   * @returns {string} return.hostSecret - Secret key for the host to manage the room.
   * @returns {string} return.roomCode - Unique code identifying the room.
   * @returns {string} return.userId - Unique identifier for the host user.
   */
  const createRoom = (
    options = {},
  ) => {
    let roomCode = generateCode(6)
    while (rooms.has(roomCode)) {
      roomCode = generateCode(6)
    }

    let userLimit = options?.limit
    if (
      userLimit > 0
      && userLimit > maxUsersPerRoom
    ) {
      userLimit = maxUsersPerRoom
    }

    const users = new Map()

    const userId = randomUUID()
    users.set(userId, null)

    const hostSecret = randomUUID()

    rooms.set(roomCode, {
      hostId: userId,
      hostSecret,
      password: options?.password || null,
      userLimit,
      users: users,
    })

    return {
      hostSecret,
      roomCode,
      userId,
    }
  }

  /**
   * Attempts to join a user to a room.
   *
   * @param {string} roomCode - The unique code identifying the room to join.
   * @param {WebSocket} connection - The WebSocket connection for the user.
   * @param {string|null} [password=null] - Optional password required to join the room.
   * @param {string|null} [hostSecret=null] - Optional secret to identify the host joining their own room.
   * @returns {[boolean, Object]} An array where the first element is a boolean indicating success, and the second element is an object containing either error details or the userId.
   */
  const joinRoom = (
    roomCode,
    connection,
    password = null,
    hostSecret = null,
  ) => {
    const room = rooms.get(roomCode)
    if (!room) {
      return [false, {
        type: ERROR,
        reason: 'room_not_found',
      }]
    }

    if (
      room.password
      && room.password !== password
    ) {
      return [false, {
        type: ERROR,
        reason: 'wrong_password',
      }]
    }

    if (room.users.size >= room.userLimit) {
      return [false, {
        type: ERROR,
        reason: 'room_full',
      }]
    }

    let userId = null
    if (
      hostSecret
      && hostSecret === room.hostSecret
    ) {
      // Host joins own room update user data to add connection.
      userId = room.hostId
    } else {
      userId = randomUUID()
      while (room.users.has(userId)) {
        userId = randomUUID()
      }
    }
    room.users.set(userId, {
      connection,
    })

    _broadcast(
      roomCode,
      userId,
      serializeMessage({
        type: USER_JOINED,
        sender: userId,
      }),
    )
    onUserJoin.dispatch({
      roomCode,
      userId,
    })

    connection.addEventListener('close', () => {
      leaveRoom(roomCode, userId)
    })
    connection.addEventListener('error', () => {
      leaveRoom(roomCode, userId)
    })

    connection.addEventListener('message', (
      event,
    ) => {
      const room = rooms.get(roomCode)
      if (!room) {
        connection.close(1008, 'room_not_found')
        return
      }
      if (!room.users.has(userId)) {
        connection.close(1008, 'user_not_found')
        return
      }
      if (connection.readyState !== connection.OPEN) {
        connection.close(1008, 'user_no_active_connection')
        return
      }

      messageRoom(
        roomCode,
        userId,
        event.data,
      )
    })

    return [true, {
      hostId: room.hostId,
      userId,
      users: Array.from(
        room.users.keys(),
      ),
    }]
  }

  /**
   * Removes a user from a room and handles related cleanup.
   * - If the room does not exist, returns a 'room_not_found' error.
   * - If the user is not found in the room, returns an 'user_not_found' error.
   * - Broadcasts a 'user_left' event and dispatches onUserLeave.
   * - Closes the user's connection.
   * - If the user is the host, removes all users from the room, broadcasts their departure, and closes their connections.
   * - If the room becomes empty, deletes the room and dispatches onRoomRemove.
   *
   * @param {string} roomCode - The unique code identifying the room.
   * @param {string} userId - The unique identifier of the user to remove.
   * @returns {[boolean, Object]} An array where the first element is a boolean indicating success, and the second is an object with error details if unsuccessful. Possible error reasons: 'room_not_found', 'user_not_found.
   */
  const leaveRoom = function (
    roomCode,
    userId,
  ) {
    const room = rooms.get(roomCode)
    if (!room) {
      return [false, {
        type: ERROR,
        reason: 'room_not_found',
      }]
    }

    if (!room.users.has(userId)) {
      return [false, {
        type: ERROR,
        reason: 'user_not_found',
      }]
    }
    const {
      connection,
    } = room.users.get(userId)
    room.users.delete(userId)
    _broadcast(
      roomCode,
      userId,
      serializeMessage({
        type: USER_LEFT,
        userId,
      }),
    )
    onUserLeave.dispatch({
      roomCode,
      userId,
    })
    connection.close()

    // If the host leaves, we need to remove the entire room.
    if (room.hostId === userId) {
      for (const [userId, { connection }] of room.users) {
        room.users.delete(userId)
        _broadcast(
          roomCode,
          userId,
          serializeMessage({
            type: USER_LEFT,
            userId,
          }),
        )
        onUserLeave.dispatch({
          roomCode,
          userId,
        })
        connection.close()
      }
    }

    if (room.users.size === 0) {
      rooms.delete(roomCode)
      onRoomRemove.dispatch({
        roomCode,
      })
    }
  }

  const removeRoom = function (
    roomCode,
  ) {
    const room = rooms.get(roomCode)
    if (!room) {
      return [false, {
        type: ERROR,
        reason: 'room_not_found',
      }]
    }

    for (const userId of room.users.keys()) {
      if (userId !== room.hostId) {
        leaveRoom(roomCode, userId)
      }
    }
    // Remove host last.
    leaveRoom(roomCode, room.hostId)

    if (rooms.get(roomCode)) {
      // If the room still exists, remove it.
      rooms.delete(roomCode)
      onRoomRemove.dispatch({
        roomCode,
      })
    }

    return [true, {
      type: ROOM_REMOVED,
      code: roomCode,
    }]
  }

  /**
   * Broadcasts a message to all users in a specified room, except the sender.
   *
   * @param {string} roomCode - The unique code identifying the room.
   * @param {Object} message - The message object to broadcast. Should contain a `sender` property to identify the sender.
   * @returns {[boolean, Object]} - Returns a tuple where the first element indicates success, and the second is an object with error details if unsuccessful.
   */
  const _broadcast = (
    roomCode,
    sender,
    payload,
  ) => {
    const room = rooms.get(roomCode)
    if (!room) {
      return [false, {
        type: ERROR,
        reason: 'room_not_found',
      }]
    }

    payload = Date.now() + payload
    for (const [userId, { connection }] of room.users) {
      // Don't send the payload to the sender.
      if (
        sender
        && sender === userId
      ) {
        continue
      }

      if (connection.readyState === connection.OPEN) {
        connection.send(payload)
      }
    }
    return [true, {}]
  }

  /**
   * Sends a message to all clients in the specified room and dispatches a room message event if successful.
   *
   * @param {string} roomCode - The unique identifier for the room to which the message will be sent.
   * @param {string} sender - The identifier of the sender of the message.
   * @param {string} payload - The serialized message content to be broadcasted to the room.
   * @returns {[boolean, Object]} An array where the first element indicates success, and the second contains the result or error.
   */
  const messageRoom = (
    roomCode,
    sender,
    payload,
  ) => {
    const [success, result] = _broadcast(
      roomCode,
      sender,
      payload,
    )
    if (success) {
      onRoomMessage.dispatch({
        payload,
        roomCode,
        sender,
      })
    }
    return [success, result]
  }

  /**
   * Sends a direct message from a sender to a receiver within a specified room.
   *
   * @param {string} roomCode - The unique code identifying the room.
   * @param {string} sender - The identifier of the user sending the message.
   * @param {string} receiver - The identifier of the user receiving the message.
   * @param {any} data - The message content to be sent.
   * @returns {[boolean, Object]} Returns a tuple [success, data] if an error occurs or on success, or an error object if the receiver's connection is not active. Possible error reasons: 'room_not_found', 'user_not_found', 'user_no_connection', 'user_no_active_connection'.
   */
  const messageUser = (
    roomCode,
    sender,
    receiver,
    data,
  ) => {
    const room = rooms.get(roomCode)
    if (!room) {
      return [false, {
        type: ERROR,
        reason: 'room_not_found',
      }]
    }

    if (!room.users.has(receiver)) {
      return [false, {
        type: ERROR,
        reason: 'user_not_found',
      }]
    }
    const {
      connection,
    } = room.users.get(receiver)

    if (!connection) {
      return [false, {
        type: ERROR,
        reason: 'user_no_connection',
      }]
    }
    if (connection.readyState !== connection.OPEN) {
      return [false, {
        type: ERROR,
        reason: 'user_no_active_connection',
      }]
    }

    connection.send(
      Date.now() + serializeMessage({
        type: SERVER_MESSAGE,
        ...data,
        receiver,
        sender,
      })
    )
    return [true, {}]
  }

  return {
    createRoom,
    joinRoom,
    removeRoom,
    leaveRoom,
    messageRoom,
    messageUser,

    onRoomMessage,
    onRoomRemove,
    onUserLeave,
    onUserJoin,

    /**
     * Get room data by room code.
     *
     * @param {string} roomCode - The unique code identifying the room.
     * @returns {Object|null} The room object if found, or null if not found.
     */
    getRoom: (
      roomCode,
    ) => {
      return rooms.get(roomCode)
    },
    /**
     * Returns an array of all room codes currently active in the synchronizer.
     *
     * @returns {string[]} An array of all room codes.
     */
    getRoomCodes: (
    ) => {
      return Array.from(
        rooms.keys(),
      )
    },
    /**
     * Returns the number of active rooms in the synchronizer.
     *
     * @returns {number} The count of active rooms.
     */
    getRoomCount: (
    ) => {
      return rooms.size
    },

    /**
     * Handles HTTP requests for room creation.
     *
     * @param {Object} request - The HTTP request object.
     * @param {Object} response - The HTTP response object.
     * @returns {boolean} Returns true if the request was handled, false otherwise.
     */
    handleHttpRequest: (
      request,
      response,
    ) => {
      const parsed = parse(request.url, true)
      const {
        pathname,
        query,
      } = parsed

      if (pathname === createRoomEndpoint) {
        const limit = parseInt(query.limit, 10) || undefined
        const password = query.password || undefined
        const {
          hostSecret,
          roomCode,
          userId,
        } = createRoom({
          limit,
          password,
        })

        response.writeHead(200, {
          'Content-Type': contentType,
        })
        response.end(
          serializeMessage({
            hostSecret,
            roomCode,
            userId,
          })
        )
        return true
      }

      return false
    },
    /**
     * Handles WebSocket upgrade requests for joining rooms.
     *
     * @param {Object} request - The HTTP request object.
     * @param {Object} socket - The WebSocket connection object.
     * @param {Buffer} head - The head of the WebSocket request.
     * @param {Object} socketServer - The WebSocket server instance.
     * @returns {boolean} Returns true if the request was handled, false otherwise.
     */
    handleSocketUpgrade: (
      request,
      socket,
      head,
      socketServer,
    ) => {
      const parsed = parse(request.url, true)
      const {
        pathname,
        query,
      } = parsed

      if (pathname === joinRoomEndpoint) {
        socketServer.handleUpgrade(
          request,
          socket,
          head,
          (connection) => {
            const {
              code: roomCode,
              host: hostSecret,
              password,
            } = query
            if (!roomCode) {
              connection.close(1008, 'missing_room_code')
              return
            }

            const [success, data] = joinRoom(
              roomCode,
              connection,
              password || null,
              hostSecret || null,
            )
            if (!success) {
              connection.close(1008, data.reason)
              return
            }

            connection.send(
              Date.now() + serializeMessage({
                type: ROOM_JOINED,
                hostId: data.hostId,
                userId: data.userId,
                users: data.users,
              })
            )
          },
        )

        return true
      }

      return false
    },
  }
}
