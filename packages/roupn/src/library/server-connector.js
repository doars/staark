import {
  createHash,
  randomUUID,
} from 'crypto'

import {
  ERROR,
  ROOM_JOINED,
  ROOM_REMOVED,
  USER_JOINED,
  USER_LEFT,
  USER_KICK,
  USER_VERIFIED,
  ROOM_CLOSED,
} from './message-types.js'

import {
  IDENTIFIABLE_CHARACTERS,

  generateCode,
} from '../utilities/code.js'
import {
  base64ToString,
  stringToBase64,
} from '../utilities/encoding-server.js'
import {
  createEvent,
} from '../utilities/event.js'
import {
  decode,
  encode,
} from '../utilities/protocol.js'
import {
  SERVER_PAYLOAD,
  SERVER_TIME,
  SHARED_ENCRYPTION_PAYLOAD,
  USER,
} from './payload-keys.js'

/**
 * @typedef {import('../utilities/event.js').Event} Event
 */

/**
 * @typedef {Object} UserData
 * @property {WebSocket} connection - Websocket of user
 * @property {boolean} verified - Whether the host has verified the user.
 */

/**
 * @typedef {Object} RoomSyncOptions
 * @property {string} [contentType='application/json'] - Content type for messages.
 * @property {Function} [deserializeMessage=JSON.parse] - Function to deserialize messages.
 * @property {Function} [serializeMessage=JSON.stringify] - Function to serialize messages.
 *
 * @property {string} [createRoomEndpoint='/create-room'] - Endpoint for creating a room.
 * @property {string} [joinRoomEndpoint='/join-room'] - Endpoint for joining a room.
 *
 * @property {number} [maxUsersPerRoom=50] - Absolute maximum users allowed per room.
 *
 * @property {number} [rateLimitAttempts=5] - Maximum number of requests for creating or joining a room.
 * @property {number} [rateLimitDuration=60000] - Time frame for rate limit in milliseconds.
 */

/**
 * @typedef {Object} RoomSyncReturn
 * @property {Function} createRoom - Creates a new room.
 * @property {Function} joinRoom - Joins a user to a room.
 * @property {Function} removeRoom - Removes a room and disconnects all users.
 * @property {Function} leaveRoom - Removes a user from a room.
 * @property {Function} messageRoom - Broadcasts a message to all users in a room.
 * @property {Function} messageUser - Sends a direct message to a user in a room.
 *
 * @property {Event} onRoomMessage - Event dispatched when a message is sent to a room.
 * @property {Event} onRoomRemove - Event dispatched when a room is removed.
 * @property {Event} onUserLeave - Event dispatched when a user leaves a room.
 * @property {Event} onUserJoin - Event dispatched when a user joins a room.
 *
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
export const createServerConnector = (
  options = {},
) => {
  const {
    contentType = 'application/json',
    deserializeMessage = JSON.parse,
    serializeMessage = JSON.stringify,

    createRoomEndpoint = '/create-room',
    joinRoomEndpoint = '/join-room',
    serverOrigin = 'http://localhost:3000',

    maxUsersPerRoom = 16,

    rateLimitAttempts = 6,
    rateLimitDuration = 60 * 1e3,
  } = options

  const onRoomMessage = createEvent()
  const onRoomRemove = createEvent()
  const onUserJoin = createEvent()
  const onUserLeave = createEvent()

  /** @type {Map<string, number[]>} */
  const _rateLimits = new Map()

  /**
   * Checks if a user is rate-limited based on their fingerprint.
   *
   * @param {Object} request - The request to check whether it should be limited.
   * @returns {boolean} - True if the user is rate-limited, false otherwise.
   */
  const isRateLimited = (
    request,
  ) => {
    if (
      rateLimitAttempts <= 0
      || rateLimitDuration <= 0
    ) {
      return false
    }
    const fingerprint = createHash('sha256')
      .update([
        // Fingerprint consists of IP address, user agent and preferred language.
        request.socket.remoteAddress,
        request.headers['user-agent'] || '',
        request.headers['accept-language'] || ''
      ].join('|'),
      ).digest('hex')
    if (!fingerprint) {
      return false
    }

    const now = Date.now()
    const windowStart = now - rateLimitDuration
    const timestamps = (
      _rateLimits.get(fingerprint)
      || []
    ).filter(
      (timestamp) => timestamp > windowStart,
    )

    if (timestamps.length >= rateLimitAttempts) {
      _rateLimits.set(fingerprint, timestamps)
      return true
    }

    timestamps.push(now)
    _rateLimits.set(fingerprint, timestamps)
    return false
  }

  /** @type {Map<string, { creatorId: string, creatorSecret: string, userLimit: number, users: Map<string, UserData> }>} */
  const _rooms = new Map()

  /**
   * Creates a new room with a unique code and initializes its properties.
   *
   * @param {Object} [options={}] - Optional settings for the room.
   * @param {number} [options.limit] - Maximum number of users allowed in the room.
   * @returns {Object} An object containing the creatorSecret, roomCode, and userId.
   * @returns {string} return.creatorSecret - Secret key for the creator to manage the room.
   * @returns {string} return.roomCode - Unique code identifying the room.
   * @returns {string} return.userId - Unique identifier for the creator user.
   */
  const createRoom = (
    options = {},
  ) => {
    let roomCode = generateCode(
      6,
      IDENTIFIABLE_CHARACTERS,
    )
    while (_rooms.has(roomCode)) {
      roomCode = generateCode(
        6,
        IDENTIFIABLE_CHARACTERS,
      )
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
    users.set(userId, {
      connection: null,
      verified: false,
    })

    const creatorSecret = randomUUID()

    _rooms.set(roomCode, {
      creatorId: userId,
      creatorSecret,
      userLimit,
      users: users,
    })

    return {
      creatorSecret,
      roomCode,
      userId,
    }
  }

  /**
   * Attempts to join a user to a room.
   *
   * @param {string} roomCode - The unique code identifying the room to join.
   * @param {WebSocket} connection - The WebSocket connection for the user.
   * @param {string|null} [creatorSecret=null] - Optional secret to identify the creator joining their own room.
   * @returns {[boolean, Object]} An array where the first element is a boolean indicating success, and the second element is an object containing either error details or the userId.
   */
  const joinRoom = (
    roomCode,
    connection,
    creatorSecret = null,
  ) => {
    const _room = _rooms.get(roomCode)
    if (!_room) {
      return [false, {
        type: ERROR,
        reason: 'room_not_found',
      }]
    }

    if (_room.users.size >= _room.userLimit) {
      return [false, {
        type: ERROR,
        reason: 'room_full',
      }]
    }

    const _isCreator = (
      creatorSecret
      && creatorSecret === _room.creatorSecret
    )
    // Prevent re-use of the creator secret.
    if (
      _isCreator
      && _room.users.get(_room.creatorId).verified
    ) {
      return [false, {
        type: ERROR,
        reason: 'creator_already_joined',
      }]
    }

    let userId
    if (_isCreator) {
      // Host joins own room update user data to add connection.
      userId = _room.creatorId
    } else {
      userId = randomUUID()
      while (_room.users.has(userId)) {
        userId = randomUUID()
      }
    }

    const userData = {
      connection,
      verified: _isCreator,
    }
    _room.users.set(userId, userData)

    _broadcast(
      roomCode,
      userId,
      encode({
        [SERVER_PAYLOAD]: serializeMessage({
          type: USER_JOINED,
          userId,
        })
      }, stringToBase64),
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
      const room = _rooms.get(roomCode)
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

      const parts = decode(
        event.data,
        base64ToString,
      )
      const {
        [SHARED_ENCRYPTION_PAYLOAD]: sharedEncryptionPayload,
        [SERVER_PAYLOAD]: serverPayload,
        [USER]: userPayload,
      } = parts

      if (userPayload) {
        messageUser(
          roomCode,
          userId,
          userPayload,
          event.data,
        )
        return
      }

      if (sharedEncryptionPayload) {
        if (userData.verified) {
          messageRoom(
            roomCode,
            userId,
            event.data,
          )
        }
        return
      }

      if (serverPayload) {
        if (_isCreator) {
          let parsedData
          try {
            parsedData = deserializeMessage(serverPayload)
          } catch {
            return
          }

          switch (parsedData?.type) {
            case ROOM_CLOSED:
              removeRoom(roomCode)
              break

            case USER_KICK:
              if (
                parsedData.userId
                && parsedData.userId !== userId
              ) {
                leaveRoom(roomCode, parsedData.userId)
              }
              break

            case USER_VERIFIED:
              if (
                parsedData.userId
                && room.users.has(parsedData.userId)
              ) {
                _broadcast(
                  roomCode,
                  userId,
                  encode({
                    [SERVER_PAYLOAD]: serializeMessage({
                      type: USER_VERIFIED,
                      userId: parsedData.userId,
                    }),
                  }, stringToBase64)
                )
                room.users.get(parsedData.userId).verified = true
              }
              break
          }
        }
        return
      }
    })

    return [true, {
      creatorId: _room.creatorId,
      userId,
      users: Array.from(
        _room.users.keys(),
      ),
    }]
  }

  /**
   * Removes a user from a room and handles related cleanup.
   */
  const leaveRoom = function (
    roomCode,
    userId,
  ) {
    const _room = _rooms.get(roomCode)
    if (!_room) {
      return [false, {
        type: ERROR,
        reason: 'room_not_found',
      }]
    }

    if (!_room.users.has(userId)) {
      return [false, {
        type: ERROR,
        reason: 'user_not_found',
      }]
    }
    const { connection } = _room.users.get(userId)
    _room.users.delete(userId)
    _broadcast(
      roomCode,
      userId,
      encode({
        [SERVER_PAYLOAD]: serializeMessage({
          type: USER_LEFT,
          userId,
        })
      }, stringToBase64),
    )
    onUserLeave.dispatch({
      roomCode,
      userId,
    })
    connection.close()

    if (_room.creatorId === userId) {
      for (const [otherUserId, { connection: otherConnection }] of _room.users) {
        _room.users.delete(otherUserId)
        _broadcast(
          roomCode,
          otherUserId,
          encode({
            [SERVER_PAYLOAD]: serializeMessage({
              type: USER_LEFT,
              userId: otherUserId,
            }),
          }, stringToBase64),
        )
        onUserLeave.dispatch({
          roomCode,
          userId: otherUserId,
        })
        otherConnection.close()
      }
    }

    if (_room.users.size === 0) {
      _rooms.delete(roomCode)
      onRoomRemove.dispatch({ roomCode })
    }
  }

  const removeRoom = function (
    roomCode,
  ) {
    const room = _rooms.get(roomCode)
    if (!room) {
      return [false, {
        type: ERROR,
        reason: 'room_not_found',
      }]
    }

    for (const userId of room.users.keys()) {
      if (userId !== room.creatorId) {
        leaveRoom(roomCode, userId)
      }
    }
    leaveRoom(roomCode, room.creatorId)

    if (_rooms.get(roomCode)) {
      _rooms.delete(roomCode)
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
   */
  const _broadcast = (
    roomCode,
    sender,
    payload,
  ) => {
    const _room = _rooms.get(roomCode)
    if (!_room) {
      return [false, {
        type: ERROR,
        reason: 'room_not_found',
      }]
    }

    const message = SERVER_TIME + ':' + stringToBase64(String(Date.now())) + '|' + payload

    for (const [userId, { connection, verified }] of _room.users) {
      if (
        !verified
        || (
          sender
          && sender === userId
        )
      ) {
        continue
      }

      if (connection.readyState === connection.OPEN) {
        connection.send(message)
      }
    }
    return [true, {}]
  }

  /**
   * Sends a message to all clients in the specified room.
   */
  const messageRoom = (
    roomCode,
    sender,
    payload,
  ) => {
    const [_success, _result] = _broadcast(roomCode, sender, payload)
    if (_success) {
      onRoomMessage.dispatch({
        payload,
        roomCode,
        sender,
      })
    }
    return [_success, _result]
  }

  /**
   * Sends a direct message to a user.
   */
  const messageUser = (
    roomCode,
    sender,
    receiver,
    data,
  ) => {
    const room = _rooms.get(roomCode)
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
    const { connection } = room.users.get(receiver)

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
      SERVER_TIME + ':' + stringToBase64(String(Date.now())) + '|' + data,
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

    getRoom: (roomCode) => _rooms.get(roomCode),
    getRoomCodes: () => Array.from(_rooms.keys()),
    getRoomCount: () => _rooms.size,

    handleHttpRequest: (
      request,
      response,
    ) => {
      const {
        pathname = '',
        searchParams = {},
      } = new URL(request.url, serverOrigin)

      if (pathname === createRoomEndpoint) {
        if (isRateLimited(request)) {
          response.writeHead(429, {
            'Content-Type': contentType,
          })
          response.end(serializeMessage({
            type: ERROR,
            reason: 'too_many_requests',
          }))
          return true
        }

        const limit = parseInt(
          searchParams.get('limit'),
          10
        ) || undefined
        const {
          creatorSecret,
          roomCode,
          userId,
        } = createRoom({
          limit,
        })

        response.writeHead(200, {
          'Content-Type': contentType,
        })
        response.end(serializeMessage({
          creatorSecret,
          roomCode,
          userId,
        }))
        return true
      }

      return false
    },

    handleSocketUpgrade: (
      request,
      socket,
      head,
      socketServer,
    ) => {
      const {
        pathname = '',
        searchParams = {},
      } = new URL(request.url, serverOrigin)

      if (pathname === joinRoomEndpoint) {
        if (isRateLimited(request)) {
          const message = serializeMessage({
            type: ERROR,
            reason: 'too_many_requests',
          })
          socket.write(
            'HTTP/' + request.httpVersion + ' 429 Too many requests',
            + '\r\nConnection: close'
            + '\r\nContent-Type: ' + contentType
            + '\r\nContent-Length: ' + Buffer.byteLength(message),
            + '\r\n\r\n' + message
          )
          socket.destroy()
          return true
        }

        socketServer.handleUpgrade(request, socket, head, (
          connection,
        ) => {
          const roomCode = searchParams.get('code')
          if (!roomCode) {
            connection.close(1008, 'missing_room_code')
            return
          }

          const [_success, _data] = joinRoom(
            roomCode,
            connection,
            searchParams.get('creator') || null,
          )
          if (!_success) {
            connection.close(1008, _data.reason)
            return
          }

          connection.send(
            encode({
              [SERVER_PAYLOAD]: serializeMessage({
                type: ROOM_JOINED,
                creatorId: _data.creatorId,
                userId: _data.userId,
                users: _data.users,
              })
            }, stringToBase64)
          )
        })

        return true
      }

      return false
    },
  }
}
