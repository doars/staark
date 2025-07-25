import {
  CONNECTION_CONNECTED,
  CONNECTION_CONNECTING,
  CONNECTION_DISCONNECTED,
  CONNECTION_DISCONNECTING,
  CONNECTION_PENDING_VERIFICATION,

  KEY_EXCHANGE_ACCEPT,
  KEY_EXCHANGE_OFFER,
  ROOM_CLOSED,
  ROOM_JOINED,
  USER_JOINED,
  USER_KICK,
  USER_LEFT,
  USER_VERIFIED,
} from './message-types.js'

import {
  base64ToBuffer,
  base64ToString,
  stringToBase64,
  bufferToBase64,
} from '../utilities/encoding-client.js'
import {
  createEvent,
} from '../utilities/event.js'
import {
  decode,
  encode,
} from '../utilities/protocol.js'
import {
  calculateTime,
} from '../utilities/time.js'
import {
  IDENTIFIABLE_CHARACTERS,
} from '../utilities/code.js'
import {
  DIFFIE_HELLMAN_ALGORITHM,
  DIFFIE_HELLMAN_CURVE,
  DIFFIE_HELLMAN_EXPORT_FORMAT,
  HASH_ALGORITHM,
  PUBLIC_KEY_EXPORT_FORMAT,
  SHARED_ENCRYPTION_ALGORITHM,
  SHARED_KEY_LENGTH,
  USER_ENCRYPTION_ALGORITHM,
  USER_SIGNATURE_ALGORITHM,

  SHARED_KEY_GENERATOR,
  USER_KEY_GENERATOR,
} from './key-generator.js'
import {
  SERVER_PAYLOAD,
  SERVER_TIME,

  SHARED_ENCRYPTION_IV,
  SHARED_ENCRYPTION_PAYLOAD,

  USER,
  USER_DIRECT_PAYLOAD,

  USER_ENCRYPTION_IV,
  USER_ENCRYPTION_KEY,
  USER_ENCRYPTION_PAYLOAD,
  USER_ENCRYPTION_SIGNATURE,
} from './payload-keys.js'

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
 *
 * @property {number} [messageBufferMaxCount=50] - The maximum number of messages to store in the buffer.
 * @property {number} [messageBufferMaxDuration=60000] - The maximum duration in milliseconds to store a message in the buffer.
 *
 * @property {string} verificationCodeLength
 */

/**
 * @typedef {Object} ConnectorAPI
 *
 * @property {Event} onConnection - Event for connection state change notifications.
 * @property {Event} onError - Event for error handling.
 * @property {Event} onMessage - Event for receiving messages.
 * @property {Event} onRoomJoin - Event for room join notifications.
 * @property {Event} onRoomLeave - Event for room leave notifications.
 * @property {Event} onUserJoin - Event for user join notifications.
 * @property {Event} onUserLeave - Event for user leave notifications.
 * @property {Event} onUserVerified - Event for user verified notifications.
 *
 * @property {Function} createRoom - Creates a new room and joins it.
 * @property {Function} closeRoom - Closes the room for all. Only allowed by the creator.
 * @property {Function} joinRoom - Joins an existing room.
 * @property {Function} leaveRoom - Leaves the current room.
 * @property {Function} messageRoom - Sends a message to the current room.
 *
 * @property {Function} kickUser - Removes a player's connection. Only allowed by the creator.
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

    messageBufferMaxCount = 50,
    messageBufferMaxDuration = 60 * 1000,
  } = options

  let _creatorId,
    _generatedKeys,
    _keyGenerationPromise,
    _myId,
    _myEncryptKeys,
    _myExchangeKeys,
    _myPublicEncryptKey,
    _myPublicSignKey,
    _mySignKeys,
    _sharedKey,
    _sharedMessagesBuffer = [],
    _socket,
    _roomCode,
    _userDerivedKeys = new Map(),
    _userEncryptKeys = new Map(),
    _userSignKeys = new Map(),
    _userVerification = new Map(),
    _connectionState = CONNECTION_DISCONNECTED
  const _generateMyKeys = (
  ) => {
    if (
      !_generatedKeys
      && !_keyGenerationPromise
    ) {
      _keyGenerationPromise = new Promise((
        resolve,
        reject,
      ) => {
        const worker = new Worker(
          URL.createObjectURL(
            new Blob([USER_KEY_GENERATOR,], {
              type: 'text/javascript',
            }),
          ),
        )

        worker.addEventListener('message', (
          event,
        ) => {
          if (event.data.success) {
            _myEncryptKeys = event.data.myEncryptKeys
            _mySignKeys = event.data.mySignKeys
            _myExchangeKeys = event.data.myExchangeKeys
            _myPublicEncryptKey = event.data.myPublicEncryptKey
            _myPublicSignKey = event.data.myPublicSignKey

            _generatedKeys = true
            _keyGenerationPromise = null
            resolve()
          } else {
            const error = new Error(event.data.error)
            onError.dispatch({
              error,
            })
            reject(error)
          }
          worker.terminate()
        })

        worker.addEventListener('error', (
          error,
        ) => {
          onError.dispatch({
            error,
          })
          reject(error)
          worker.terminate()
        })

        worker.postMessage({
          type: 'USER_KEYS',
        })
      })
    }
    return _keyGenerationPromise
  }
  // Start generating new keys.
  _generateMyKeys()

  const onError = createEvent()
  const onMessage = createEvent()
  const onRoomJoin = createEvent()
  const onRoomLeave = createEvent()
  const onUserJoin = createEvent()
  const onUserLeave = createEvent()
  const onUserVerified = createEvent()
  const onUserVerificationCode = createEvent()
  const onConnection = createEvent()

  const _setConnectionState = (
    state,
  ) => {
    if (_connectionState !== state) {
      _connectionState = state
      onConnection.dispatch({
        state,
      })
    }
  }

  const _generateVerificationCode = async (
    userId,
  ) => {
    const derivedKey = _userDerivedKeys.get(userId)
    if (!derivedKey) {
      return
    }

    _userVerification.set(
      userId,
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            HASH_ALGORITHM,
            new TextEncoder().encode(
              _roomCode
              + bufferToBase64(
                await crypto.subtle.exportKey(
                  'raw',
                  derivedKey,
                ),
              ),
            ),
          ),
        ),
      ),
    )

    onUserVerificationCode.dispatch({
      userId,
      code: getVerificationCode(userId),
    })
  }

  /**
   * Closes the current socket connection and resets the socket reference. This function should be called when leaving a room to ensure that the socket connection is properly closed and the state is cleaned up.
   */
  const leaveRoom = (
  ) => {
    if (
      _connectionState === CONNECTION_DISCONNECTED
      || _connectionState === CONNECTION_DISCONNECTING
    ) {
      return
    }
    _setConnectionState(CONNECTION_DISCONNECTING)

    if (_socket) {
      _socket.close()
    }

    _creatorId = _generatedKeys = _keyGenerationPromise = _myId = _myEncryptKeys = _myExchangeKeys = _myPublicEncryptKey = _myPublicSignKey = _mySignKeys = _sharedKey = _sharedMessagesBuffer = _socket = null
    _userDerivedKeys.clear()
    _userEncryptKeys.clear()
    _userSignKeys.clear()
    _userVerification.clear()

    // Setup new keys right away.
    _generateMyKeys()

    _setConnectionState(CONNECTION_DISCONNECTED)
  }

  /**
   * Joins a WebSocket room with the specified room code and optional credentials. Establishes a WebSocket connection to the server, appending the room code, password, and creator secret (if provided) as query parameters. Sets up event listeners for 'close', 'error', and 'message' events to handle room leave, errors, and incoming messages.
   *
   * @param {string} roomCode - The code of the room to join.
   * @param {string|null} [password=null] - Optional password for the room.
   * @param {string|null} [creatorSecret=null] - Optional creator secret for verifying this user is the creator of the room.
   */
  const _joinRoom = (
    roomCode,
    creatorSecret = null,
  ) => {
    if (
      !creatorSecret
      && _connectionState
      && _connectionState !== CONNECTION_DISCONNECTED
    ) {
      return
    }
    _setConnectionState(CONNECTION_CONNECTING)

    _roomCode = roomCode

    const url = new URL(
      wsUrl + joinRoomEndpoint,
    )
    url.searchParams.append(
      'code',
      _roomCode,
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

      leaveRoom()
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
      _processMessage(
        decode(
          event.data,
          base64ToString,
        ),
        event.data,
      )
    })
  }

  const _processMessage = async (
    parts,
    raw,
    isBuffered = false,
  ) => {
    const {
      [SERVER_PAYLOAD]: serverPayload,
      [SERVER_TIME]: serverTime,

      [SHARED_ENCRYPTION_IV]: sharedEncryptionIv,
      [SHARED_ENCRYPTION_PAYLOAD]: sharedEncryptionPayload,

      [USER_DIRECT_PAYLOAD]: userDirectPayload,
      [USER_ENCRYPTION_IV]: userEncryptionIv,
      [USER_ENCRYPTION_KEY]: userEncryptionKey,
      [USER_ENCRYPTION_PAYLOAD]: userEncryptionPayload,
      [USER_ENCRYPTION_SIGNATURE]: userEncryptionSignature,
      [USER]: userReceiver,
    } = parts

    let data, deserializedData, payload

    if (serverPayload) {
      payload = serverPayload
    } else if (userDirectPayload) {
      payload = userDirectPayload
    } else {
      payload = raw
    }

    if (sharedEncryptionPayload) {
      if (
        !_sharedKey
        || (
          !isBuffered
          && _sharedMessagesBuffer.length > 0
        )
      ) {
        // Can't decrypt without the key, store the messages for later.
        _sharedMessagesBuffer.push({
          time: Date.now(),
          parts,
          raw,
        })

        // Remove oldest message if buffer is full.
        if (_sharedMessagesBuffer.length > messageBufferMaxCount) {
          _sharedMessagesBuffer.shift()
        }
        return
      }
      if (!sharedEncryptionIv) {
        onError.dispatch(
          new Error('Missing IV to decrypt message')
        )
        return
      }

      data = await crypto.subtle.decrypt(
        {
          iv: base64ToBuffer(sharedEncryptionIv),
          name: SHARED_ENCRYPTION_ALGORITHM,
        },
        _sharedKey,
        base64ToBuffer(sharedEncryptionPayload),
      )
      data = new TextDecoder().decode(data)
    } else if (userEncryptionPayload) {
      if (
        !userEncryptionSignature
        || !userEncryptionKey
        || !userEncryptionIv
      ) {
        // Assume the message is not encrypted just send as a user specific message.
        return
      }
      if (!_generatedKeys) {
        await _generateMyKeys()
      }

      const payloadData = deserializeMessage(
        new TextDecoder()
          .decode(
            await crypto.subtle.decrypt(
              {
                iv: base64ToBuffer(userEncryptionIv),
                name: SHARED_ENCRYPTION_ALGORITHM,
              },
              await crypto.subtle.importKey(
                'raw',
                await crypto.subtle.decrypt(
                  {
                    name: USER_ENCRYPTION_ALGORITHM,
                  },
                  _myEncryptKeys.privateKey,
                  base64ToBuffer(userEncryptionKey),
                ),
                {
                  name: SHARED_ENCRYPTION_ALGORITHM,
                },
                true,
                ['encrypt', 'decrypt',],
              ),
              base64ToBuffer(userEncryptionPayload),
            ),
          ),
      )

      if (payloadData.type === KEY_EXCHANGE_ACCEPT) {
        deserializedData = payloadData
      } else {
        const senderId = payloadData.sender

        if (!senderId) {
          onError.dispatch({
            error: new Error('Message from unknown sender'),
          })
          return
        }

        const senderPublicKey = _userSignKeys.get(senderId)
        if (!senderPublicKey) {
          onError.dispatch({
            error: new Error('No public key for ' + senderId),
          })
          return
        }

        if (!(await crypto.subtle.verify(
          USER_SIGNATURE_ALGORITHM,
          senderPublicKey,
          base64ToBuffer(userEncryptionSignature),
          dataBuffer,
        ))) {
          onError.dispatch({
            error: new Error('Invalid signature from ' + senderId),
          })
          return
        }

        deserializedData = payloadData
      }
    } else {
      data = payload
    }

    if (!deserializedData) {
      try {
        deserializedData = deserializeMessage(data)
      } catch (error) {
        onError.dispatch({
          error: new Error('Failed to parse message ' + raw),
        })
        return
      }
    }
    data = deserializedData

    switch (data.type) {
      case KEY_EXCHANGE_OFFER:
        if (_myId === _creatorId) {
          const newUserId = data.sender

          _userEncryptKeys.set(
            newUserId,
            await crypto.subtle.importKey(
              PUBLIC_KEY_EXPORT_FORMAT,
              base64ToBuffer(data.publicEncryptKey),
              { hash: HASH_ALGORITHM, name: USER_ENCRYPTION_ALGORITHM, },
              true,
              ['encrypt',],
            ),
          )

          const publicSignKey = await crypto.subtle.importKey(
            PUBLIC_KEY_EXPORT_FORMAT,
            base64ToBuffer(data.publicSignKey),
            { hash: HASH_ALGORITHM, name: USER_SIGNATURE_ALGORITHM, },
            true,
            ['verify',],
          )

          const publicExchangeKeyData = base64ToBuffer(data.publicExchangeKey)
          if (!(await crypto.subtle.verify(
            USER_SIGNATURE_ALGORITHM,
            publicSignKey,
            base64ToBuffer(data.signature),
            publicExchangeKeyData,
          ))) {
            onError.dispatch({
              error: new Error('Invalid signature for exchange from ' + newUserId),
            })
            return
          }

          _userSignKeys.set(newUserId, publicSignKey)

          if (!_generatedKeys) {
            await _generateMyKeys()
          }

          _userDerivedKeys.set(
            newUserId,
            await crypto.subtle.deriveKey(
              {
                name: DIFFIE_HELLMAN_ALGORITHM,
                public: await crypto.subtle.importKey(
                  DIFFIE_HELLMAN_EXPORT_FORMAT,
                  publicExchangeKeyData,
                  {
                    name: DIFFIE_HELLMAN_ALGORITHM,
                    namedCurve: DIFFIE_HELLMAN_CURVE,
                  },
                  true,
                  [],
                ),
              },
              _myExchangeKeys.privateKey,
              {
                length: SHARED_KEY_LENGTH,
                name: SHARED_ENCRYPTION_ALGORITHM,
              },
              true,
              ['encrypt', 'decrypt',],
            ),
          )

          const myPublicExchangeKey = await crypto.subtle.exportKey(
            DIFFIE_HELLMAN_EXPORT_FORMAT,
            _myExchangeKeys.publicKey,
          )
          _message({
            type: KEY_EXCHANGE_ACCEPT,

            publicEncryptKey: bufferToBase64(_myPublicEncryptKey),
            publicExchangeKey: bufferToBase64(myPublicExchangeKey),
            publicSignKey: bufferToBase64(_myPublicSignKey),
            signature: bufferToBase64(
              await crypto.subtle.sign(
                USER_SIGNATURE_ALGORITHM,
                _mySignKeys.privateKey,
                myPublicExchangeKey,
              ),
            ),
          }, {
            receiver: newUserId,
          })
          _generateVerificationCode(newUserId)
        }
        break

      case KEY_EXCHANGE_ACCEPT:
        if (
          userReceiver === _myId
          && data.sender === _creatorId
        ) {
          if (data.publicSignKey) {
            const hostPublicSignKey = await crypto.subtle.importKey(
              PUBLIC_KEY_EXPORT_FORMAT,
              base64ToBuffer(data.publicSignKey),
              {
                hash: HASH_ALGORITHM,
                name: USER_SIGNATURE_ALGORITHM,
              },
              true,
              ['verify',],
            )

            if (
              data.publicExchangeKey
              && data.signature
            ) {
              if (!(await crypto.subtle.verify(
                USER_SIGNATURE_ALGORITHM,
                hostPublicSignKey,
                base64ToBuffer(data.signature),
                base64ToBuffer(data.publicExchangeKey),
              ))) {
                onError.dispatch({
                  error: new Error('Invalid signature for exchange from ' + _creatorId),
                })
                leaveRoom()
                return
              }
            }
            _userSignKeys.set(
              _creatorId,
              hostPublicSignKey,
            )
          }

          if (data.publicEncryptKey) {
            _userEncryptKeys.set(
              _creatorId,
              await crypto.subtle.importKey(
                PUBLIC_KEY_EXPORT_FORMAT,
                base64ToBuffer(data.publicEncryptKey),
                {
                  hash: HASH_ALGORITHM,
                  name: USER_ENCRYPTION_ALGORITHM,
                },
                true,
                ['encrypt',],
              ),
            )
          }

          if (data.publicExchangeKey) {
            if (!_generatedKeys) {
              await _generateMyKeys()
            }

            _userDerivedKeys.set(
              _creatorId,
              await crypto.subtle.deriveKey(
                {
                  name: DIFFIE_HELLMAN_ALGORITHM,
                  public: await crypto.subtle.importKey(
                    DIFFIE_HELLMAN_EXPORT_FORMAT,
                    base64ToBuffer(data.publicExchangeKey),
                    {
                      name: DIFFIE_HELLMAN_ALGORITHM,
                      namedCurve: DIFFIE_HELLMAN_CURVE,
                    },
                    true,
                    [],
                  ),
                },
                _myExchangeKeys.privateKey,
                {
                  length: SHARED_KEY_LENGTH,
                  name: SHARED_ENCRYPTION_ALGORITHM,
                },
                true,
                ['encrypt', 'decrypt',],
              )
            )
          }

          if (
            data.sharedKey
            && data.sharedKeyIv
          ) {
            const derivedKey = _userDerivedKeys.get(_creatorId)
            if (!derivedKey) {
              onError.dispatch({
                error: new Error('No derived key for host ' + _creatorId),
              })
              return
            }

            _sharedKey = await crypto.subtle.importKey(
              'raw',
              await crypto.subtle.decrypt(
                {
                  iv: base64ToBuffer(data.sharedKeyIv),
                  name: SHARED_ENCRYPTION_ALGORITHM,
                },
                derivedKey,
                base64ToBuffer(data.sharedKey),
              ),
              {
                name: SHARED_ENCRYPTION_ALGORITHM,
              },
              true,
              ['encrypt', 'decrypt',],
            )

            onUserVerified.dispatch({
              userId: _myId,
            })

            if (_sharedMessagesBuffer.length > 0) {
              const now = Date.now()
              _sharedMessagesBuffer = _sharedMessagesBuffer.filter((item) => (
                now - item.time < messageBufferMaxDuration
              ))

              while (_sharedMessagesBuffer.length > 0) {
                const {
                  parts,
                  raw,
                } = _sharedMessagesBuffer.shift()
                _processMessage(
                  parts,
                  raw,
                  true,
                )
              }
            }

            _setConnectionState(CONNECTION_CONNECTED)
          } else {
            _generateVerificationCode(_creatorId)
          }
        }
        break

      case ROOM_JOINED:
        _creatorId = data.creatorId
        _myId = data.userId

        onRoomJoin.dispatch({
          creatorId: data.creatorId,
          roomCode: _roomCode,
          userId: data.userId,
          users: data.users,
        })

        if (_myId !== _creatorId) {
          _setConnectionState(CONNECTION_PENDING_VERIFICATION)

          if (!_generatedKeys) {
            await _generateMyKeys()
          }

          const myPublicExchangeKey = await crypto.subtle.exportKey(
            DIFFIE_HELLMAN_EXPORT_FORMAT,
            _myExchangeKeys.publicKey,
          )

          _message({
            type: KEY_EXCHANGE_OFFER,
            publicEncryptKey: bufferToBase64(_myPublicEncryptKey),
            publicExchangeKey: bufferToBase64(myPublicExchangeKey),
            publicSignKey: bufferToBase64(_myPublicSignKey),
            signature: bufferToBase64(
              await crypto.subtle.sign(
                USER_SIGNATURE_ALGORITHM,
                _mySignKeys.privateKey,
                myPublicExchangeKey,
              ),
            ),
          }, {
            allowUnencrypted: true,
            receiver: _creatorId,
          })
        } else {
          _setConnectionState(CONNECTION_CONNECTED)
        }
        break

      case USER_LEFT:
        onUserLeave.dispatch({
          userId: data.userId,
        })
        _userDerivedKeys.delete(data.userId)
        _userEncryptKeys.delete(data.userId)
        _userSignKeys.delete(data.userId)
        break

      case USER_JOINED:
        onUserJoin.dispatch({
          userId: data.userId,
        })
        break

      case USER_VERIFIED:
        onUserVerified.dispatch({
          userId: data.userId,
        })
        break

      default:
        onMessage.dispatch({
          data,
          time: calculateTime(
            serverTime,
            data?.senderTime,
          ),
        })
        break
    }
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
        error: new Error('No open socket'),
      })
      return false
    }

    const message = serializeMessage({
      ...data,
      sender: _myId,
      senderTime: Date.now(),
    })
    const parts = {}

    if (options.receiver) {
      const receiverPublicKey = _userEncryptKeys.get(options.receiver)
      if (receiverPublicKey) {
        const tempKey = await crypto.subtle.generateKey(
          {
            name: SHARED_ENCRYPTION_ALGORITHM,
            length: 256,
          },
          true,
          ['encrypt', 'decrypt',],
        )
        const iv = crypto.getRandomValues(
          new Uint8Array(12),
        )
        const encryptedPayload = await crypto.subtle.encrypt(
          {
            iv,
            name: SHARED_ENCRYPTION_ALGORITHM,
          },
          tempKey,
          new TextEncoder().encode(message),
        )

        if (!_generatedKeys) {
          await _generateMyKeys()
        }

        parts[USER_ENCRYPTION_SIGNATURE] = bufferToBase64(
          await crypto.subtle.sign(
            USER_SIGNATURE_ALGORITHM,
            _mySignKeys.privateKey,
            encryptedPayload,
          ),
        )
        parts[USER_ENCRYPTION_KEY] = bufferToBase64(
          await crypto.subtle.encrypt(
            {
              name: USER_ENCRYPTION_ALGORITHM,
            },
            receiverPublicKey,
            await crypto.subtle.exportKey(
              'raw',
              tempKey,
            ),
          ),
        )
        parts[USER_ENCRYPTION_PAYLOAD] = bufferToBase64(encryptedPayload)
        parts[USER_ENCRYPTION_IV] = bufferToBase64(iv)
      } else if (!options.allowUnencrypted) {
        onError.dispatch({
          error: new Error('No public key for ' + options.receiver),
        })
        return false
      } else {
        parts[USER_DIRECT_PAYLOAD] = message
      }

      parts[USER] = options.receiver
    } else if (options.server) {
      parts[SERVER_PAYLOAD] = message
    } else if (_sharedKey) {
      const iv = crypto.getRandomValues(
        new Uint8Array(12),
      )

      parts[SHARED_ENCRYPTION_IV] = bufferToBase64(iv)
      parts[SHARED_ENCRYPTION_PAYLOAD] = bufferToBase64(
        await crypto.subtle.encrypt(
          {
            iv,
            name: SHARED_ENCRYPTION_ALGORITHM,
          },
          _sharedKey,
          new TextEncoder().encode(message),
        ),
      )
    } else {
      onError.dispatch(
        new Error('Trying to send without valid destination')
      )
      return false
    }

    _socket.send(
      encode(
        parts,
        stringToBase64,
      ),
    )
    return true
  }

  const messageServer = (
    data,
  ) => (
    _myId
    && _myId === _creatorId
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

  const getVerificationCode = (
    userId,
    codeLength = 6,
  ) => {
    if (!_userVerification.has(userId)) {
      return false
    }
    const hashArray = _userVerification.get(userId)
    let code = ''
    for (let i = 0; i < codeLength; i++) {
      const index = hashArray[i] % IDENTIFIABLE_CHARACTERS.length
      code += IDENTIFIABLE_CHARACTERS[index]
    }
    return code
  }

  return {
    onConnection,
    onError,
    onMessage,

    onRoomJoin,
    onRoomLeave,

    onUserJoin,
    onUserLeave,
    onUserVerified,
    onUserVerificationCode,

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
      options = {},
    ) => {
      if (
        _connectionState
        && _connectionState !== CONNECTION_DISCONNECTED
      ) {
        return
      }
      _setConnectionState(CONNECTION_CONNECTING)

      try {
        await new Promise((
          resolve,
          reject,
        ) => {
          const worker = new Worker(
            URL.createObjectURL(
              new Blob([SHARED_KEY_GENERATOR,], {
                type: 'text/javascript',
              }),
            ),
          )

          worker.addEventListener('message', (
            event,
          ) => {
            if (event.data.success) {
              _sharedKey = event.data.sharedKey
              resolve()
            } else {
              reject(
                new Error(event.data.error)
              )
            }
            worker.terminate()
          })

          worker.addEventListener('error', (
            error,
          ) => {
            reject(error)
            worker.terminate()
          })

          worker.postMessage({
            type: 'SHARED_KEY',
          })
        })
      } catch (error) {
        _setConnectionState(CONNECTION_DISCONNECTED)
        onError.dispatch({
          error,
        })
        return
      }

      const url = new URL(
        httpUrl
        + createRoomEndpoint
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
          Accept: contentType,
        },
      })
      if (!response.ok) {
        throw new Error('Failed to create room')
      }

      let data = await response.text()
      data = deserializeMessage(data)

      _myId = data.userId

      _joinRoom(
        data.roomCode,
        data.creatorSecret,
      )

      return data
    },
    joinRoom: (
      roomCode,
    ) => _joinRoom(
      roomCode,
    ),
    leaveRoom,

    kickUser: (
      userId,
    ) => messageServer({
      type: USER_KICK,
      userId,
    }),

    getVerificationCode,
    verifyUser: async (
      userId,
      code,
    ) => {
      if (
        _myId !== _creatorId
        || !code
      ) {
        return false
      }

      const expectedCode = getVerificationCode(
        userId,
        code.length,
      )
      if (
        !expectedCode
        || !code
        || expectedCode !== code
      ) {
        return false
      }

      const derivedKey = _userDerivedKeys.get(userId)
      if (!derivedKey) {
        return false
      }

      const iv = crypto.getRandomValues(
        new Uint8Array(12),
      )
      _message({
        type: KEY_EXCHANGE_ACCEPT,
        sharedKey: bufferToBase64(
          await crypto.subtle.encrypt(
            {
              iv,
              name: SHARED_ENCRYPTION_ALGORITHM,
            },
            derivedKey,
            await crypto.subtle.exportKey(
              'raw',
              _sharedKey,
            ),
          ),
        ),
        sharedKeyIv: bufferToBase64(iv),
      }, {
        receiver: userId,
      })

      onUserVerified.dispatch({
        userId,
      })
      messageServer({
        type: USER_VERIFIED,
        userId,
      })

      return true
    },
  }
}
