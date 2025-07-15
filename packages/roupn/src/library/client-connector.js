import {
  ROOM_CLOSED,
  ROOM_JOINED,
  USER_JOINED,
  USER_KICK,
  USER_LEFT,
  USER_VALIDATED,
} from './types.js'

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
import { SERVER_PAYLOAD, SERVER_TIME, SHARED_ENCRYPTION_IV, SHARED_ENCRYPTION_PAYLOAD, USER_DIRECT_PAYLOAD, USER_ENCRYPTION_IV, USER_ENCRYPTION_KEY, USER_ENCRYPTION_PAYLOAD, USER_ENCRYPTION_SIGNATURE, USER } from './keys.js'

const DIFFIE_HELLMAN_ALGORITHM = 'ECDH'
const DIFFIE_HELLMAN_CURVE = 'P-256'
const DIFFIE_HELLMAN_PUBLIC_KEY_EXPORT_FORMAT = 'raw'
const HASH_ALGORITHM = 'SHA-256'
const PUBLIC_KEY_EXPORT_FORMAT = 'spki'
const SHARED_ENCRYPTION_ALGORITHM = 'AES-GCM'
const SHARED_KEY_LENGTH = 256
const USER_ENCRYPTION_ALGORITHM = 'RSA-OAEP'
const USER_SIGNATURE_ALGORITHM = 'RSASSA-PKCS1-v1_5'

const KEY_EXCHANGE_ACCEPT = 'key_exchange-accept'
const KEY_EXCHANGE_OFFER = 'key_exchange-offer'
const PASSWORD_VALIDATION = 'password-validation'

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
    _password,
    _sharedKey,
    _socket,
    _userDerivedKeys = new Map(),
    _userEncryptKeys = new Map(),
    _userSignKeys = new Map()
  const _generateMyKeys = () => {
    if (!_generatedKeys) {
      if (!_keyGenerationPromise) {
        _keyGenerationPromise = Promise.all([
          window.crypto.subtle.generateKey({
            name: USER_ENCRYPTION_ALGORITHM,
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: { name: HASH_ALGORITHM, },
          }, true, ['encrypt', 'decrypt',])
            .then(keys => {
              _myEncryptKeys = keys
            }),
          window.crypto.subtle.generateKey({
            name: USER_SIGNATURE_ALGORITHM,
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: { name: HASH_ALGORITHM, },
          }, true, ['sign', 'verify',])
            .then(keys => {
              _mySignKeys = keys
            }),
          window.crypto.subtle.generateKey({
            name: DIFFIE_HELLMAN_ALGORITHM,
            namedCurve: DIFFIE_HELLMAN_CURVE,
          }, true, ['deriveKey',])
            .then(keys => {
              _myExchangeKeys = keys
            }),
        ])
          .then(() => Promise.all([
            window.crypto.subtle.exportKey(
              PUBLIC_KEY_EXPORT_FORMAT,
              _myEncryptKeys.publicKey,
            ).then(key => {
              _myPublicEncryptKey = key
            }),
            window.crypto.subtle.exportKey(
              PUBLIC_KEY_EXPORT_FORMAT,
              _mySignKeys.publicKey,
            ).then(key => {
              _myPublicSignKey = key
            }),
          ])
            .then(() => {
              _generatedKeys = true;
              _keyGenerationPromise = null
            })
          )
      }
      return _keyGenerationPromise
    }
  }
  // Start generating new keys.
  _generateMyKeys()

  const onError = createEvent()
  const onMessage = createEvent()
  const onRoomJoin = createEvent()
  const onRoomLeave = createEvent()
  const onUserJoin = createEvent()
  const onUserLeave = createEvent()
  const onUserValidated = createEvent()

  /**
   * Closes the current socket connection and resets the socket reference. This function should be called when leaving a room to ensure that the socket connection is properly closed and the state is cleaned up.
   */
  const leaveRoom = (
  ) => {
    if (_socket) {
      _socket.close()
      _creatorId = _generatedKeys = _keyGenerationPromise = _myId = _myEncryptKeys = _myExchangeKeys = _myPublicEncryptKey = _myPublicSignKey = _mySignKeys = _password = _sharedKey = _socket = null
      _userDerivedKeys.clear()
      _userEncryptKeys.clear()
      _userSignKeys.clear()

      // Setup new keys right away.
      _generateMyKeys()
    }
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
      const parts = decode(
        event.data,
        base64ToString,
      )
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

      console.log('message received', parts) // FIXME:

      let data, deserializedData, payload

      if (roomPayload) {
        payload = roomPayload
      } else if (serverPayload) {
        payload = serverPayload
      } else if (userDirectPayload) {
        payload = userDirectPayload
      } else {
        payload = event.data
      }

      if (sharedEncryptionPayload) {
        if (!_sharedKey) {
          // Can't decrypt without the key. Fail silently since it might not have been shared with.
          // TODO: Store messages and process when _sharedKey is available.
          return
        }
        if (!sharedEncryptionIv) {
          onError.dispatch(
            new Error('Missing IV to decrypt message')
          )
          return
        }

        const dataBuffer = base64ToBuffer(sharedEncryptionPayload)
        const iv = base64ToBuffer(sharedEncryptionIv)

        data = await window.crypto.subtle.decrypt({
          iv,
          name: SHARED_ENCRYPTION_ALGORITHM,
        }, _sharedKey, dataBuffer)
        data = new TextDecoder().decode(data)
      } else if (userEncryptionPayload) {
        if (
          !userEncryptionSignature
          || !userEncryptionKey
          || !userEncryptionIv
        ) {
          // Assume the message is not encrypted just send as a user specific message.
          console.log(
            'message is not encrypted, fall through.',
            userEncryptionSignature,
            userEncryptionKey,
            userEncryptionIv,
          )
          return
        }
        const dataBuffer = base64ToBuffer(userEncryptionPayload)

        if (!_generatedKeys) {
          await _generateMyKeys()
        }

        const decryptedTempKey = await window.crypto.subtle.decrypt({
          name: USER_ENCRYPTION_ALGORITHM,
        }, _myEncryptKeys.privateKey, base64ToBuffer(userEncryptionKey))

        const tempKey = await window.crypto.subtle.importKey('raw', decryptedTempKey, {
          name: SHARED_ENCRYPTION_ALGORITHM,
        }, true, ['encrypt', 'decrypt'])

        const iv = base64ToBuffer(userEncryptionIv)
        const decryptedPayload = await window.crypto.subtle.decrypt({
          iv,
          name: SHARED_ENCRYPTION_ALGORITHM,
        }, tempKey, dataBuffer)

        const jsonPayload = new TextDecoder().decode(decryptedPayload)
        const payloadData = deserializeMessage(jsonPayload)

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

          const signatureBuf = base64ToBuffer(userEncryptionSignature)
          const isValid = await window.crypto.subtle.verify(
            USER_SIGNATURE_ALGORITHM,
            senderPublicKey,
            signatureBuf,
            dataBuffer,
          )

          if (!isValid) {
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
            error: new Error('Failed to parse message ' + event.data),
          })
          return
        }
      }
      data = deserializedData

      console.log('message processing', data) // FIXME:
      switch (data.type) {
        case KEY_EXCHANGE_OFFER:
          if (_myId === _creatorId) {
            const newUserId = data.sender

            const publicEncryptKeyData = base64ToBuffer(data.publicEncryptKey)
            const publicEncryptKey = await window.crypto.subtle.importKey(
              PUBLIC_KEY_EXPORT_FORMAT,
              publicEncryptKeyData,
              { hash: HASH_ALGORITHM, name: USER_ENCRYPTION_ALGORITHM, },
              true,
              ['encrypt',],
            )
            _userEncryptKeys.set(newUserId, publicEncryptKey)

            const publicSignKeyData = base64ToBuffer(data.publicSignKey)
            const publicSignKey = await window.crypto.subtle.importKey(
              PUBLIC_KEY_EXPORT_FORMAT,
              publicSignKeyData,
              { hash: HASH_ALGORITHM, name: USER_SIGNATURE_ALGORITHM, },
              true,
              ['verify',],
            )

            const publicExchangeKeyData = base64ToBuffer(data.publicExchangeKey)
            const signatureData = base64ToBuffer(data.signature)
            const isVerified = await window.crypto.subtle.verify(
              USER_SIGNATURE_ALGORITHM,
              publicSignKey,
              signatureData,
              publicExchangeKeyData,
            )
            if (!isVerified) {
              onError.dispatch({
                error: new Error('Invalid signature for exchange from ' + newUserId),
              })
              return
            }

            _userSignKeys.set(newUserId, publicSignKey)

            const publicExchangeKey = await window.crypto.subtle.importKey(
              DIFFIE_HELLMAN_PUBLIC_KEY_EXPORT_FORMAT,
              publicExchangeKeyData,
              { name: DIFFIE_HELLMAN_ALGORITHM, namedCurve: DIFFIE_HELLMAN_CURVE, },
              true,
              [],
            )

            if (!_generatedKeys) {
              await _generateMyKeys()
            }

            const derivedKey = await window.crypto.subtle.deriveKey({
              name: DIFFIE_HELLMAN_ALGORITHM,
              public: publicExchangeKey,
            }, _myExchangeKeys.privateKey, {
              length: SHARED_KEY_LENGTH,
              name: SHARED_ENCRYPTION_ALGORITHM,
            }, true, ['encrypt', 'decrypt',])
            _userDerivedKeys.set(newUserId, derivedKey)

            const myPublicExchangeKey = await window.crypto.subtle.exportKey(
              DIFFIE_HELLMAN_PUBLIC_KEY_EXPORT_FORMAT,
              _myExchangeKeys.publicKey,
            )
            const mySignature = await window.crypto.subtle.sign(
              USER_SIGNATURE_ALGORITHM,
              _mySignKeys.privateKey,
              myPublicExchangeKey,
            )

            if (_password) {
              console.log('accept key, ask password') // FIXME:
              _message({
                type: KEY_EXCHANGE_ACCEPT,
                password: true,

                publicEncryptKey: bufferToBase64(_myPublicEncryptKey),
                publicExchangeKey: bufferToBase64(myPublicExchangeKey),
                publicSignKey: bufferToBase64(_myPublicSignKey),
                signature: bufferToBase64(mySignature),
              }, { receiver: newUserId })
            } else {
              const exportedSharedKey = await window.crypto.subtle.exportKey(
                'raw',
                _sharedKey,
              )

              const iv = window.crypto.getRandomValues(
                new Uint8Array(12),
              )
              const encryptedSharedKey = await window.crypto.subtle.encrypt({
                iv,
                name: SHARED_ENCRYPTION_ALGORITHM,
              }, derivedKey, exportedSharedKey)

              _message({
                type: KEY_EXCHANGE_ACCEPT,
                password: false,

                publicExchangeKey: bufferToBase64(myPublicExchangeKey),
                publicSignKey: bufferToBase64(_myPublicSignKey),
                signature: bufferToBase64(mySignature),

                sharedKey: bufferToBase64(encryptedSharedKey),
                sharedKeyIv: bufferToBase64(iv),
              }, {
                receiver: newUserId,
              })

              onUserValidated.dispatch({
                userId: newUserId,
              })
              messageServer({
                type: USER_VALIDATED,
                userId: newUserId,
              })
            }
          }
          break

        case KEY_EXCHANGE_ACCEPT:
          if (
            userReceiver === _myId
            && data.sender === _creatorId
          ) {
            if (data.publicSignKey) {
              const hostPublicSignKeyData = base64ToBuffer(data.publicSignKey)
              const hostPublicSignKey = await window.crypto.subtle.importKey(
                PUBLIC_KEY_EXPORT_FORMAT,
                hostPublicSignKeyData,
                { hash: HASH_ALGORITHM, name: USER_SIGNATURE_ALGORITHM, },
                true,
                ['verify',],
              )

              if (
                data.publicExchangeKey
                && data.signature
              ) {
                const publicExchangeKeyData = base64ToBuffer(data.publicExchangeKey)
                const signatureData = base64ToBuffer(data.signature)
                const isVerified = await window.crypto.subtle.verify(
                  USER_SIGNATURE_ALGORITHM,
                  hostPublicSignKey,
                  signatureData,
                  publicExchangeKeyData,
                )
                if (!isVerified) {
                  onError.dispatch({
                    error: new Error('Invalid signature for exchange from ' + _creatorId),
                  })
                  leaveRoom()
                  return
                }
              }
              _userSignKeys.set(_creatorId, hostPublicSignKey)
            }

            if (data.publicEncryptKey) {
              const hostPublicEncryptKeyData = base64ToBuffer(data.publicEncryptKey)
              const hostPublicEncryptKey = await window.crypto.subtle.importKey(
                PUBLIC_KEY_EXPORT_FORMAT,
                hostPublicEncryptKeyData,
                { hash: HASH_ALGORITHM, name: USER_ENCRYPTION_ALGORITHM, },
                true,
                ['encrypt',],
              )
              _userEncryptKeys.set(_creatorId, hostPublicEncryptKey)
            }

            if (data.publicExchangeKey) {
              const hostPublicExchangeKeyData = base64ToBuffer(data.publicExchangeKey)
              const hostPublicExchangeKey = await window.crypto.subtle.importKey(DIFFIE_HELLMAN_PUBLIC_KEY_EXPORT_FORMAT, hostPublicExchangeKeyData, {
                name: DIFFIE_HELLMAN_ALGORITHM,
                namedCurve: DIFFIE_HELLMAN_CURVE,
              }, true, [])

              if (!_generatedKeys) {
                await _generateMyKeys()
              }

              const derivedKey = await window.crypto.subtle.deriveKey({
                name: DIFFIE_HELLMAN_ALGORITHM,
                public: hostPublicExchangeKey,
              }, _myExchangeKeys.privateKey, {
                length: SHARED_KEY_LENGTH,
                name: SHARED_ENCRYPTION_ALGORITHM,
              }, true, ['encrypt', 'decrypt',])
              _userDerivedKeys.set(_creatorId, derivedKey)
            }

            if (data.password) {
              console.log('Provide password to user.', data) // FIXME:

              if (!_password) {
                onError.dispatch({
                  error: new Error('Room requires a password, none provided'),
                })
                leaveRoom()
                return
              }
              messageUser({
                type: PASSWORD_VALIDATION,
                password: _password,
              }, _creatorId)
            } else if (
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

              const encryptedSharedKey = base64ToBuffer(data.sharedKey)
              const iv = base64ToBuffer(data.sharedKeyIv)
              const decryptedSharedKeyData = await window.crypto.subtle.decrypt({
                iv,
                name: SHARED_ENCRYPTION_ALGORITHM,
              }, derivedKey, encryptedSharedKey)
              _sharedKey = await window.crypto.subtle.importKey(
                'raw',
                decryptedSharedKeyData,
                { name: SHARED_ENCRYPTION_ALGORITHM, },
                true,
                ['encrypt', 'decrypt',],
              )
            }
          }
          break

        case PASSWORD_VALIDATION:
          if (_myId === _creatorId) {
            const newUserId = data.sender

            if (data.password !== _password) {
              messageServer({
                type: USER_KICK,
                userId: newUserId,
              })
              return
            }

            const derivedKey = _userDerivedKeys.get(newUserId)
            if (!derivedKey) {
              messageServer({
                type: USER_KICK,
                userId: newUserId,
              })
              return
            }

            const exportedSharedKey = await window.crypto.subtle.exportKey(
              'raw',
              _sharedKey,
            )

            const iv = window.crypto.getRandomValues(
              new Uint8Array(12),
            )
            const encryptedSharedKey = await window.crypto.subtle.encrypt({
              iv,
              name: SHARED_ENCRYPTION_ALGORITHM,
            }, derivedKey, exportedSharedKey)

            _message({
              type: KEY_EXCHANGE_ACCEPT,
              sharedKey: bufferToBase64(encryptedSharedKey),
              sharedKeyIv: bufferToBase64(iv),
            }, {
              receiver: newUserId,
            })

            onUserValidated.dispatch({
              userId: newUserId,
            })
            messageServer({
              type: USER_VALIDATED,
              userId: newUserId,
            })
          }
          break

        case ROOM_JOINED:
          _creatorId = data.creatorId
          _myId = data.userId

          onRoomJoin.dispatch({
            creatorId: data.creatorId,
            roomCode,
            userId: data.userId,
            users: data.users,
          })

          if (_myId !== _creatorId) {
            if (!_generatedKeys) {
              await _generateMyKeys()
            }

            const myPublicExchangeKey = await window.crypto.subtle.exportKey(
              DIFFIE_HELLMAN_PUBLIC_KEY_EXPORT_FORMAT,
              _myExchangeKeys.publicKey,
            )
            const signature = await window.crypto.subtle.sign(
              USER_SIGNATURE_ALGORITHM,
              _mySignKeys.privateKey,
              myPublicExchangeKey,
            )

            _message({
              type: KEY_EXCHANGE_OFFER,
              publicEncryptKey: bufferToBase64(_myPublicEncryptKey),
              publicExchangeKey: bufferToBase64(myPublicExchangeKey),
              publicSignKey: bufferToBase64(_myPublicSignKey),
              signature: bufferToBase64(signature),
            }, {
              allowUnencrypted: true,
              receiver: _creatorId,
            })
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

        case USER_VALIDATED:
          onUserValidated.dispatch({
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
        const encodedMessage = new TextEncoder().encode(message)

        // Use hybrid encryption for large messages
        const tempKey = await window.crypto.subtle.generateKey({
          name: SHARED_ENCRYPTION_ALGORITHM,
          length: 256,
        }, true, ['encrypt', 'decrypt'])
        const iv = window.crypto.getRandomValues(new Uint8Array(12))
        const encryptedPayload = await window.crypto.subtle.encrypt({
          iv,
          name: SHARED_ENCRYPTION_ALGORITHM,
        }, tempKey, encodedMessage)

        const exportedTempKey = await window.crypto.subtle.exportKey('raw', tempKey)
        const encryptedTempKey = await window.crypto.subtle.encrypt({
          name: USER_ENCRYPTION_ALGORITHM,
        }, receiverPublicKey, exportedTempKey)

        if (!_generatedKeys) {
          await _generateMyKeys()
        }
        const signature = await window.crypto.subtle.sign(
          USER_SIGNATURE_ALGORITHM,
          _mySignKeys.privateKey,
          encryptedPayload,
        )

        parts[USER_ENCRYPTION_SIGNATURE] = bufferToBase64(signature)
        parts[USER_ENCRYPTION_KEY] = bufferToBase64(encryptedTempKey)
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
      const ivBuffer = crypto.getRandomValues(
        new Uint8Array(12),
      )
      const encrypted = await window.crypto.subtle.encrypt({
        iv: ivBuffer,
        name: SHARED_ENCRYPTION_ALGORITHM,
      }, _sharedKey, new TextEncoder().encode(message))

      parts[SHARED_ENCRYPTION_IV] = bufferToBase64(ivBuffer)
      parts[SHARED_ENCRYPTION_PAYLOAD] = bufferToBase64(encrypted)
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
      options = {},
    ) => {
      _password = options.password

      _sharedKey = await window.crypto.subtle.generateKey({
        length: SHARED_KEY_LENGTH,
        name: SHARED_ENCRYPTION_ALGORITHM,
      }, true, ['encrypt', 'decrypt'])

      const url = new URL(
        httpUrl
        + createRoomEndpoint
      )
      if (options.limit) {
        url.searchParams.append('limit', options.limit)
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
        _password,
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
