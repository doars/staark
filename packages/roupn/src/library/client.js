import {
  applyDiff,
  cloneRecursive,
  determineDiff,
  revertDiff,
} from '@doars/tiedliene'

import {
  ALPHANUMERIC_CHARACTERS,
  generateCode,
} from '../utilities/code.js'
import {
  createEvent
} from '../utilities/event.js'
import {
  calculateTime,
} from '../utilities/time.js'
import {
  ROOM_JOINED,
  STATE_SYNCH,
  STATE_UPDATE,
  USER_JOINED,
  USER_LEFT,
} from './types.js'

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
 * @property {Object} onError - Event for error handling.
 * @property {Object} onMessage - Event for receiving messages.
 * @property {Object} onRoomJoin - Event for room join notifications.
 * @property {Object} onRoomLeave - Event for room leave notifications.
 * @property {Object} onUserJoin - Event for user join notifications.
 * @property {Object} onUserLeave - Event for user leave notifications.
 *
 * @property {Function} createRoom - Creates a new room and joins it.
 * @property {Function} joinRoom - Joins an existing room.
 * @property {Function} leaveRoom - Leaves the current room.
 * @property {Function} messageRoom - Sends a message to the current room.
 */

/**
 * Creates a connector for managing room-based WebSocket communication.
 *
 * @param {ConnectorOptions} [options={}] - Configuration options for the connector.
 * @returns {ConnectorAPI} Connector API with event handlers and room management methods.
 */
export const createConnector = (
  options = {},
) => {
  const {
    createRoomEndpoint = '/create-room',
    joinRoomEndpoint = '/join-room',

    contentType = 'application/json',
    deserializeMessage = JSON.parse,
    serializeMessage = JSON.stringify,
    httpUrl = 'http://localhost:3000',
    wsUrl = 'http://localhost:3000',
  } = options

  let roomCode,
    socket,
    userId

  const onError = createEvent()
  const onMessage = createEvent()
  const onRoomJoin = createEvent()
  const onRoomLeave = createEvent()
  const onUserJoin = createEvent()
  const onUserLeave = createEvent()

  /**
   * Joins a WebSocket room with the specified room code and optional credentials. Establishes a WebSocket connection to the server, appending the room code, password, and host secret (if provided) as query parameters. Sets up event listeners for 'close', 'error', and 'message' events to handle room leave, errors, and incoming messages respectively.
   *
   * @param {string} roomCode - The code of the room to join.
   * @param {string|null} [password=null] - Optional password for the room.
   * @param {string|null} [hostSecret=null] - Optional host secret for privileged access.
   *
   * @fires onRoomLeave - Dispatched when the socket connection is closed.
   * @fires onError - Dispatched when an error occurs with the socket.
   * @fires onRoomJoin - Dispatched when the room is successfully joined.
   * @fires onUserLeave - Dispatched when a user leaves the room.
   * @fires onUserJoin - Dispatched when a user joins the room.
   * @fires onMessage - Dispatched for all other incoming messages.
   */
  const joinRoom = (
    roomCode,
    password = null,
    hostSecret = null,
  ) => {
    const url = new URL(
      wsUrl + joinRoomEndpoint,
    )
    url.searchParams.append('code', roomCode)
    if (password) {
      url.searchParams.append('password', password)
    }
    if (hostSecret) {
      url.searchParams.append('host', hostSecret)
    }

    socket = new WebSocket(
      url.toString(),
    )

    socket.addEventListener('close', (
      event,
    ) => {
      onRoomLeave.dispatch({
        event,
        roomCode,
        userId,
      })
    })
    socket.addEventListener('error', (
      event,
    ) => {
      onError.dispatch({
        event,
        roomCode,
        userId,
      })
    })

    socket.addEventListener('message', (
      event,
    ) => {
      let data,
        serverTime
      try {
        let index = 0
        for (; index < event.data.length; index++) {
          const character = event.data[index]
          if (isNaN(character)) {
            break
          }
        }

        data = deserializeMessage(
          event.data.substring(index),
        )
        serverTime = parseInt(
          event.data.substring(0, index),
        )
      } catch (error) {
        onError.dispatch({
          error: new Error('Failed to parse message: ' + event.data),
        })
        return
      }

      if (data.type === ROOM_JOINED) {
        onRoomJoin.dispatch({
          hostId: data.hostId,
          roomCode,
          userId: data.userId,
          users: data.users,
        })
      } else if (data.type === USER_LEFT) {
        onUserLeave.dispatch({
          userId: data.userId,
        })
      } else if (data.type === USER_JOINED) {
        onUserJoin.dispatch({
          userId: data.sender,
        })
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

  return {
    onError,
    onMessage,
    onRoomJoin,
    onRoomLeave,
    onUserJoin,
    onUserLeave,

    /**
     *
     * @param {*} options
     * @returns
     */
    createRoom: async (
      options = {},
    ) => {
      const url = new URL(
        httpUrl + createRoomEndpoint,
      )
      if (options.limit) {
        url.searchParams.append('limit', options.limit)
      }
      if (options.password) {
        url.searchParams.append('password', options.password)
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

      hostId = data.userId
      roomCode = data.roomCode
      userId = data.userId

      joinRoom(
        roomCode,
        options.password,
        data.hostSecret,
      )

      return data
    },
    joinRoom,
    leaveRoom: (
    ) => {
      if (socket) {
        socket.close()
        socket = null
      }
    },
    messageRoom: (
      message
    ) => {
      if (
        !socket
        || socket.readyState !== WebSocket.OPEN
      ) {
        onError.dispatch({
          error: new Error('Socket is not open'),
        })
        return
      }
      socket.send(
        serializeMessage({
          type: 'message',
          ...message,
          sender: userId,
          senderTime: Date.now(),
        }),
      )
    },
  }
}

/**
 * Options for creating a synchronizer.
 * @typedef {Object} CreateSynchronizerOptions
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
 *
 * @property {number} [windowPerUser=16] - Number of state updates to keep per joined user.
 * @property {number} [synchronisationInterval=60000] - Interval in milliseconds for state synchronisation.
 */

/**
 * The object returned by createSynchronizer.
 * @typedef {Object} Synchronizer
 *
 * @property {Object} onError - Event for error handling.
 * @property {Object} onMessage - Event for receiving messages.
 * @property {Object} onRoomJoin - Event for room join notifications.
 * @property {Object} onRoomLeave - Event for room leave notifications.
 * @property {Object} onUserJoin - Event for user join notifications.
 * @property {Object} onUserLeave - Event for user leave notifications.
 *
 * @property {Object} privateState - Internal state, including user and room information.
 * @property {Object} publicState - Shared state object synchronized across users.
 *
 * @property {Function} sendUpdate - Sends the current state delta to other users.
 * @property {Function} createRoom - Creates a new room and joins it.
 * @property {Function} joinRoom - Joins an existing room.
 * @property {Function} leaveRoom - Leaves the current room.
 * @property {Function} messageRoom - Sends a message to the current room.
 */

/**
 * Creates a synchronizer for collaborative state management across users in a room.
 *
 * @param {CreateSynchronizerOptions} [options={}] - Configuration options for the synchronizer.
 * @param {Object} [privateState={}] - Internal state object for private data.
 * @param {Object} [publicState={}] - Shared state object to be synchronized.
 * @returns {Synchronizer} The synchronizer instance with state and synchronization methods.
 */
export const createSynchronizer = (
  options = {},
  privateState = {},
  publicState = {},
) => {
  const roomSync = createConnector(options)
  const {
    messageRoom,
  } = roomSync

  const {
    windowPerUser = 16,
    synchronisationInterval = 60 * 1e3,
  } = options
  const stateUpdates = []
  let synchronisationIntervalId,
    messageDelay = 0,
    messageOffset = 0,
    stateUpdatesWindow = windowPerUser

  const sendDelta = (
    stateDelta,
  ) => {
    const identifier = generateCode(
      24,
      ALPHANUMERIC_CHARACTERS,
    )
    const previous = (
      stateDelta.length > 0
        ? stateDelta[0].identifier
        : null
    )

    // Store the update for reference later.
    stateUpdates.unshift({
      identifier,
      previous,
      sender: privateState.userId,
      stateDelta,
      time: {
        adjusted: (
          Date.now()
          + messageDelay
          - messageOffset
        ),
      },
    })
    if (stateUpdates.length > stateUpdatesWindow) {
      stateUpdates.splice(
        stateUpdatesWindow,
      )
    }
    messageRoom({
      identifier,
      previous,
      stateDelta,
      type: STATE_UPDATE,
    })

    updatePreviousState()
  }
  const sendUpdate = (
  ) => {
    if (privateState.previousState) {
      const stateDelta = determineDiff(
        privateState.previousState,
        publicState,
      )
      if (stateDelta.length > 0) {
        sendDelta(
          stateDelta,
        )
      }
    }
  }

  const synchroniseState = (
  ) => {
    messageRoom({
      type: STATE_SYNCH,
      state: cloneRecursive(
        publicState,
      ),
    })
  }

  const updatePreviousState = (
  ) => {
    privateState.previousState = cloneRecursive(
      publicState,
    )
  }

  roomSync.onMessage.addListener(({
    data,
    time,
  }) => {
    // Check if the message is not from yourself, or is not intended for the current user.
    if (
      data.sender === privateState.userId
      || (
        data.receiver
        && data.receiver !== privateState.userId
      )
    ) {
      return
    }

    // Update the estimated message delay and offset.
    messageDelay = (
      messageDelay
      + time.delay
    ) / 2
    messageOffset = (
      messageOffset
      + time.offset
    ) / 2

    if (data.type === STATE_SYNCH) {
      // Remove any state updates older than the given synch data.
      let index = 0
      for (; index < stateUpdates.length; index++) {
        const previousUpdate = stateUpdates[index]
        if (previousUpdate.time.adjusted >= time.adjusted) {
          break
        }
      }
      stateUpdates.splice(0, index)

      // Replace the existing state with the given state.
      for (const key in publicState) {
        delete publicState[key]
      }
      for (const key in delta.state) {
        publicState[key] = delta.state[key]
      }

      // Apply any newer state updates.
      for (let index = 0; index < stateUpdates.length; index++) {
        applyDiff(
          publicState,
          stateUpdates[index].stateDelta,
        )
      }

      updatePreviousState()
    } else if (data.type === STATE_UPDATE) {
      let failedToInsert = true
      for (let index = 0; index < stateUpdates.length; index++) {
        const previousUpdate = stateUpdates[index]
        if (
          // If the update's identifier matches the data's previous, we can insert it here.
          previousUpdate.identifier === data.previous
          || (
            // If the previous updates are the same. If the time of this update is newer than the previous one, we can insert it before the previous one.
            previousUpdate.previous === data.previous
            && previousUpdate.time.adjusted < time.adjusted
          )
        ) {
          stateUpdates.splice(index, 0, {
            ...data,
            time,
          })
          failedToInsert = false
          break
        }
      }
      if (failedToInsert) {
        // If the update was not inserted just assume it will make sense later.
        stateUpdates.unshift({
          ...data,
          time,
        })
      }

      // Undo the state until the new given diff is reached the apply the diff's in order.
      for (let index = 0; index < stateUpdates.length; index++) {
        const update = stateUpdates[index]
        if (update.identifier === data.identifier) {
          // We found the update, we can stop searching.
          break
        }
        revertDiff(
          publicState,
          update.stateDelta,
        )
      }

      // Redo the state including the new given diff.
      for (let index = 0; index < stateUpdates.length; index++) {
        const update = stateUpdates[index]
        // Revert the previous state to the current state.
        applyDiff(
          publicState,
          update.stateDelta,
        )
        if (update.identifier === data.identifier) {
          // We found the update, we can stop searching.
          break
        }
      }

      updatePreviousState()
    }
  })
  roomSync.onUserJoin.addListener(({
    userId,
  }) => {
    privateState.users.push(
      userId,
    )

    // Update the amount state updates to store.
    stateUpdatesWindow = windowPerUser + (
      windowPerUser * privateState.users.length
    )

    // Synchronise the state when a new user joins.
    if (userId === privateState.hostId) {
      synchroniseState()
    }
  })
  roomSync.onUserLeave.addListener(({
    userId,
  }) => {
    for (let index = 0; index < privateState.users.length; index++) {
      if (privateState.users[index] === userId) {
        privateState.users.splice(index, 1)
        break
      }
    }

    // Update the amount state updates to store.
    stateUpdatesWindow = windowPerUser + (
      windowPerUser * privateState.users.length
    )
  })
  roomSync.onRoomJoin.addListener(({
    hostId,
    roomCode,
    userId,
    users,
  }) => {
    // Set new room data.
    privateState.hostId = hostId
    privateState.roomCode = roomCode
    privateState.userId = userId
    privateState.users = users
    privateState.previousState = cloneRecursive(
      publicState,
    )

    if (userId === hostId) {
      // Let the host send resynchronisation messages every once in a well to get all users in sync.
      synchronisationIntervalId = setInterval(
        synchroniseState,
        synchronisationInterval,
      )
    }
  })
  roomSync.onRoomLeave.addListener((
  ) => {
    for (const key in privateState) {
      delete privateState[key]
    }
    if (synchronisationIntervalId) {
      clearInterval(synchronisationIntervalId)
    }
  })

  return Object.assign({
    privateState,
    publicState,
    sendUpdate,
  }, roomSync)
}
