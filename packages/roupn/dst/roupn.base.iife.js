(() => {
  // ../../helpers/iife.js
  var iife = (path, data) => {
    let subject = window;
    const last = path.pop();
    for (const key of path) {
      subject = subject[key] && typeof subject[key] === "object" ? subject[key] : subject[key] = {};
    }
    subject[last] = data;
  };

  // src/utilities/code.js
  var IDENTIFIABLE_CHARACTERS = "ABCDEFGHKMNPQRSTUVWXYZ23456789";

  // src/utilities/encoding-client.js
  var base64ToBuffer = (base64) => Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)).buffer;
  var base64ToString = (base64) => new TextDecoder().decode(base64ToBuffer(base64));
  var bufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 65536) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 65536));
    }
    return btoa(binary);
  };
  var stringToBase64 = (string) => bufferToBase64(new TextEncoder().encode(string));

  // src/utilities/event.js
  var createEvent = () => {
    const listeners = /* @__PURE__ */ new Map();
    return {
      /**
       * Adds a listener callback for the event.
       * @param {EventListenerCallback} callback - The listener function to add.
       * @param {EventListenerOptions} [options] - Optional options for the listener (e.g., { once: true }).
       */
      addListener: (callback, options) => {
        if (!listeners.has(callback)) {
          listeners.set(callback, options);
        }
      },
      /**
       * Removes a listener callback from the event.
       * @param {EventListenerCallback} callback - The listener function to remove.
       */
      removeListener: (callback) => {
        listeners.delete(callback);
      },
      /**
       * Dispatches the event to all registered listeners.
       * @param {any} data - Data to pass to each listener callback.
       */
      dispatch: (data) => {
        for (const [listener, options] of listeners.entries()) {
          if (options?.once) {
            listeners.delete(listener);
          }
          try {
            listener(data);
          } catch (error) {
            console.error(error);
          }
        }
      }
    };
  };

  // src/library/payload-keys.js
  var SERVER_PAYLOAD = "S";
  var SERVER_TIME = "T";
  var CREATOR_AUTHENTICATION = "A";
  var AUTHENTICATED_SENDER = "R";
  var SHARED_ENCRYPTION_PAYLOAD = "E";
  var SHARED_ENCRYPTION_IV = "I";
  var USER = "U";
  var USER_DIRECT_PAYLOAD = "D";
  var USER_ENCRYPTION_IV = "V";
  var USER_ENCRYPTION_KEY = "K";
  var USER_ENCRYPTION_PAYLOAD = "P";
  var USER_ENCRYPTION_SIGNATURE = "G";

  // src/utilities/protocol.js
  var DELIMITER = "|";
  var INFIX = ":";
  var encode = (parts, stringToBase642) => {
    const segments = [];
    for (const key of Object.keys(parts)) {
      let value = parts[key];
      if (value !== null && value !== void 0) {
        value = String(value);
        if (key === SERVER_PAYLOAD || key === USER_DIRECT_PAYLOAD) {
          value = stringToBase642(value);
        } else if (value.includes(DELIMITER) || value.includes(INFIX)) {
          throw new TypeError("protocol_invalid_value");
        }
        segments.push(key + INFIX + value);
      }
    }
    return segments.join(DELIMITER);
  };
  var decode = (message, base64ToString2, options = {}) => {
    if (typeof message !== "string") {
      throw new TypeError("protocol_message_not_string");
    }
    const {
      allowedKeys,
      maxDecodedFieldBytes = Infinity,
      maxKeyBytes = Infinity,
      maxSegments = Infinity,
      maxTotalDecodedBytes = Infinity
    } = options;
    const parts = /* @__PURE__ */ Object.create(null);
    const segments = message.split(DELIMITER);
    if (segments.length > maxSegments) {
      throw new RangeError("protocol_too_many_segments");
    }
    let totalDecodedBytes = 0;
    for (const segment of segments) {
      const index = segment.indexOf(INFIX);
      if (index <= 0) {
        throw new TypeError("protocol_missing_separator");
      }
      const key = segment.substring(0, index);
      const value = segment.substring(index + 1);
      if (new TextEncoder().encode(key).byteLength > maxKeyBytes) {
        throw new RangeError("protocol_key_too_large");
      }
      if (allowedKeys && !allowedKeys.has(key)) {
        throw new TypeError("protocol_unknown_key");
      }
      if (Object.hasOwn(parts, key)) {
        throw new TypeError("protocol_duplicate_key");
      }
      const encoded = key === SERVER_PAYLOAD || key === USER_DIRECT_PAYLOAD;
      if (encoded && (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))) {
        throw new TypeError("protocol_invalid_base64");
      }
      if (value.length > (encoded ? Math.ceil(maxDecodedFieldBytes / 3) * 4 : maxDecodedFieldBytes)) {
        throw new RangeError("protocol_field_too_large");
      }
      const decodedValue = encoded ? base64ToString2(value) : value;
      const decodedBytes = new TextEncoder().encode(decodedValue).byteLength;
      if (decodedBytes > maxDecodedFieldBytes) {
        throw new RangeError("protocol_field_too_large");
      }
      totalDecodedBytes += decodedBytes;
      if (totalDecodedBytes > maxTotalDecodedBytes) {
        throw new RangeError("protocol_message_too_large");
      }
      parts[key] = decodedValue;
    }
    return parts;
  };

  // src/utilities/time.js
  var calculateTime = (serverTime, senderTime) => {
    const receiverTime = Date.now();
    if (!serverTime) {
      return {
        delay: 0,
        offset: 0,
        adjusted: receiverTime
      };
    }
    if (!senderTime) {
      const offset2 = serverTime - receiverTime;
      return {
        delay: 0,
        offset: offset2,
        adjusted: receiverTime + offset2
      };
    }
    const delay = receiverTime - senderTime;
    const offset = (serverTime - senderTime + (serverTime - receiverTime)) / 2;
    return {
      delay,
      offset,
      adjusted: receiverTime - delay + offset
    };
  };

  // src/library/message-types.js
  var CONNECTION_CONNECTED = "CONNECTED";
  var CONNECTION_CONNECTING = "CONNECTING";
  var CONNECTION_DISCONNECTED = "DISCONNECTED";
  var CONNECTION_DISCONNECTING = "DISCONNECTING";
  var CONNECTION_PENDING_VERIFICATION = "PENDING_VERIFICATION";
  var PROTOCOL_VERSION = 3;
  var EXCHANGE_0 = "_X0";
  var EXCHANGE_1 = "_X1";
  var EXCHANGE_2 = "_X2";
  var EXCHANGE_3 = "_X3";
  var EXCHANGE_4 = "_X4";
  var EXCHANGE_REVEAL = "_XR";
  var ROOM_CLOSED = "_RC";
  var ROOM_JOINED = "_RJ";
  var USER_JOINED = "_UJ";
  var USER_KICK = "_UK";
  var USER_LEFT = "_UL";
  var USER_VERIFIED = "_UV";

  // src/library/client-connector.js
  var DIFFIE_HELLMAN_ALGORITHM = "ECDH";
  var DIFFIE_HELLMAN_CURVE = "P-256";
  var DIFFIE_HELLMAN_EXPORT_FORMAT = "raw";
  var HASH_ALGORITHM = "SHA-256";
  var PUBLIC_KEY_EXPORT_FORMAT = "spki";
  var SHARED_ENCRYPTION_ALGORITHM = "AES-GCM";
  var SHARED_KEY_LENGTH = 256;
  var USER_ENCRYPTION_ALGORITHM = "RSA-OAEP";
  var USER_SIGNATURE_ALGORITHM = "RSASSA-PKCS1-v1_5";
  var createClientConnector = (options = {}) => {
    const {
      contentType = "application/json",
      deserializeMessage = JSON.parse,
      serializeMessage = JSON.stringify,
      createRoomEndpoint = "/create-room",
      joinRoomEndpoint = "/join-room",
      httpUrl = "http://localhost:3000",
      wsUrl = "http://localhost:3000",
      messageBufferMaxCount = 50,
      messageBufferMaxDuration = 60 * 1e3,
      allowInsecureNonLoopback = false,
      maxEncodedMessageBytes = 256 * 1024,
      maxProtocolSegments = 16,
      maxProtocolKeyBytes = 64,
      maxDecodedFieldBytes = 192 * 1024,
      maxTotalDecodedBytes = 256 * 1024
    } = options;
    for (const [name, value] of [
      ["maxEncodedMessageBytes", maxEncodedMessageBytes],
      ["maxProtocolSegments", maxProtocolSegments],
      ["maxProtocolKeyBytes", maxProtocolKeyBytes],
      ["maxDecodedFieldBytes", maxDecodedFieldBytes],
      ["maxTotalDecodedBytes", maxTotalDecodedBytes]
    ]) {
      if (!Number.isInteger(value) || value <= 0) {
        throw new TypeError(`${name} must be a positive integer`);
      }
    }
    const allowedProtocolKeys = /* @__PURE__ */ new Set([
      AUTHENTICATED_SENDER,
      SERVER_PAYLOAD,
      SERVER_TIME,
      SHARED_ENCRYPTION_IV,
      SHARED_ENCRYPTION_PAYLOAD,
      USER,
      USER_DIRECT_PAYLOAD,
      USER_ENCRYPTION_IV,
      USER_ENCRYPTION_KEY,
      USER_ENCRYPTION_PAYLOAD,
      USER_ENCRYPTION_SIGNATURE
    ]);
    const isLoopback = (hostname) => hostname === "localhost" || hostname === "::1" || hostname === "[::1]" || /^127(?:\.\d{1,3}){3}$/.test(hostname);
    for (const configuredUrl of [httpUrl, wsUrl]) {
      const url = new URL(configuredUrl);
      if ((url.protocol === "http:" || url.protocol === "ws:") && !isLoopback(url.hostname) && !allowInsecureNonLoopback) {
        throw new TypeError(
          "Insecure non-loopback URLs require allowInsecureNonLoopback"
        );
      }
    }
    let _connectionState = CONNECTION_DISCONNECTED, _creatorId, _keyGenerationPromise, _myEncryptKeys, _myExchangeKeys, _myId, _myNonce, _myPublicKeys, _mySignKeys, _privateData, _privateDataVerify, _publicData, _publicDataVerify, _roomCode, _sharedKey, _socket;
    const _sharedMessagesBuffer = [];
    const _users = /* @__PURE__ */ new Map();
    const _generateMyKeys = () => {
      if (!_keyGenerationPromise) {
        _keyGenerationPromise = Promise.all([
          crypto.subtle.generateKey(
            {
              hash: HASH_ALGORITHM,
              modulusLength: 4096,
              name: USER_ENCRYPTION_ALGORITHM,
              publicExponent: new Uint8Array([1, 0, 1])
            },
            false,
            ["encrypt", "decrypt"]
          ),
          crypto.subtle.generateKey(
            {
              hash: HASH_ALGORITHM,
              modulusLength: 4096,
              name: USER_SIGNATURE_ALGORITHM,
              publicExponent: new Uint8Array([1, 0, 1])
            },
            false,
            ["sign", "verify"]
          ),
          crypto.subtle.generateKey(
            {
              name: DIFFIE_HELLMAN_ALGORITHM,
              namedCurve: DIFFIE_HELLMAN_CURVE
            },
            false,
            ["deriveBits"]
          )
        ]).then(
          async ([encryptKeys, signKeys, exchangeKeys]) => {
            const [publicEncryptKey, publicSignKey, publicExchangeKey] = await Promise.all([
              crypto.subtle.exportKey(
                PUBLIC_KEY_EXPORT_FORMAT,
                encryptKeys.publicKey
              ),
              crypto.subtle.exportKey(
                PUBLIC_KEY_EXPORT_FORMAT,
                signKeys.publicKey
              ),
              crypto.subtle.exportKey(
                DIFFIE_HELLMAN_EXPORT_FORMAT,
                exchangeKeys.publicKey
              )
            ]);
            _myEncryptKeys = encryptKeys;
            _mySignKeys = signKeys;
            _myExchangeKeys = exchangeKeys;
            _myPublicKeys = {
              publicEncryptKey: bufferToBase64(publicEncryptKey),
              publicExchangeKey: bufferToBase64(publicExchangeKey),
              publicSignKey: bufferToBase64(publicSignKey)
            };
          },
          (error) => {
            _keyGenerationPromise = null;
            onError.dispatch({
              error
            });
          }
        );
      }
      return _keyGenerationPromise;
    };
    _generateMyKeys();
    const onError = createEvent();
    const onMessage = createEvent();
    const onRoomJoin = createEvent();
    const onRoomLeave = createEvent();
    const onUserJoin = createEvent();
    const onUserLeave = createEvent();
    const onUserVerified = createEvent();
    const onUserVerificationCode = createEvent();
    const onConnection = createEvent();
    const _setConnectionState = (state) => {
      if (_connectionState !== state) {
        _connectionState = state;
        onConnection.dispatch({
          state
        });
      }
    };
    const _deriveHandshake = async (userId, creatorKeys, joinerKeys) => {
      const user = _users.get(userId);
      const keys = _myId === _creatorId ? joinerKeys : creatorKeys;
      user.encryptKey = await crypto.subtle.importKey(
        PUBLIC_KEY_EXPORT_FORMAT,
        base64ToBuffer(keys.publicEncryptKey),
        {
          hash: HASH_ALGORITHM,
          name: USER_ENCRYPTION_ALGORITHM
        },
        false,
        ["encrypt"]
      );
      user.signKey = await crypto.subtle.importKey(
        PUBLIC_KEY_EXPORT_FORMAT,
        base64ToBuffer(keys.publicSignKey),
        {
          hash: HASH_ALGORITHM,
          name: USER_SIGNATURE_ALGORITHM
        },
        false,
        ["verify"]
      );
      const secret = await crypto.subtle.deriveBits(
        {
          name: DIFFIE_HELLMAN_ALGORITHM,
          public: await crypto.subtle.importKey(
            DIFFIE_HELLMAN_EXPORT_FORMAT,
            base64ToBuffer(keys.publicExchangeKey),
            {
              name: DIFFIE_HELLMAN_ALGORITHM,
              namedCurve: DIFFIE_HELLMAN_CURVE
            },
            false,
            []
          )
        },
        _myExchangeKeys.privateKey,
        SHARED_KEY_LENGTH
      );
      const transcript = [
        PROTOCOL_VERSION,
        _roomCode,
        _creatorId,
        _myId === _creatorId ? userId : _myId,
        creatorKeys.publicEncryptKey,
        creatorKeys.publicSignKey,
        creatorKeys.publicExchangeKey,
        joinerKeys.publicEncryptKey,
        joinerKeys.publicSignKey,
        joinerKeys.publicExchangeKey
      ].join("|");
      user.code = new Uint8Array(
        await crypto.subtle.digest(
          HASH_ALGORITHM,
          new TextEncoder().encode(`${transcript}|${bufferToBase64(secret)}`)
        )
      );
      user.handshakeKey = await crypto.subtle.deriveKey(
        {
          hash: HASH_ALGORITHM,
          info: await crypto.subtle.digest(
            HASH_ALGORITHM,
            new TextEncoder().encode(transcript)
          ),
          name: "HKDF",
          salt: new Uint8Array()
        },
        await crypto.subtle.importKey("raw", secret, "HKDF", false, [
          "deriveKey"
        ]),
        {
          length: SHARED_KEY_LENGTH,
          name: SHARED_ENCRYPTION_ALGORITHM
        },
        false,
        ["encrypt", "decrypt"]
      );
      onUserVerificationCode.dispatch({
        userId,
        code: getVerificationCode(userId)
      });
    };
    const leaveRoom = (event) => {
      if (_connectionState === CONNECTION_DISCONNECTED || _connectionState === CONNECTION_DISCONNECTING) {
        return;
      }
      onRoomLeave.dispatch({
        event
      });
      _setConnectionState(CONNECTION_DISCONNECTING);
      if (_socket) {
        _socket.close();
      }
      _creatorId = _keyGenerationPromise = _myId = _myEncryptKeys = _myExchangeKeys = _myNonce = _myPublicKeys = _mySignKeys = _privateData = _privateDataVerify = _publicData = _publicDataVerify = _sharedKey = _socket = null;
      _sharedMessagesBuffer.length = 0;
      _users.clear();
      _generateMyKeys();
      _setConnectionState(CONNECTION_DISCONNECTED);
    };
    const kickUser = (userId) => messageServer({
      type: USER_KICK,
      userId
    });
    const _joinRoom = (roomCode, creatorConnectionToken = null) => {
      _setConnectionState(CONNECTION_CONNECTING);
      _roomCode = roomCode;
      const url = new URL(wsUrl + joinRoomEndpoint);
      url.searchParams.append("code", _roomCode);
      if (creatorConnectionToken) {
        url.searchParams.append("creator", "1");
      }
      const socket = new WebSocket(url.toString());
      _socket = socket;
      if (creatorConnectionToken) {
        socket.addEventListener("open", () => {
          socket.send(
            encode(
              { [CREATOR_AUTHENTICATION]: creatorConnectionToken },
              stringToBase64
            )
          );
        });
      }
      socket.addEventListener("close", (event) => {
        if (socket === _socket) {
          leaveRoom(event);
        }
      });
      socket.addEventListener("error", (event) => {
        onError.dispatch({
          error: new Error("socket_error"),
          event
        });
      });
      let queue = Promise.resolve();
      socket.addEventListener("message", (event) => {
        queue = queue.then(async () => {
          if (socket !== _socket) {
            return;
          }
          let parts;
          try {
            if (typeof event.data !== "string" || new TextEncoder().encode(event.data).byteLength > maxEncodedMessageBytes) {
              throw new RangeError("message_too_large");
            }
            parts = decode(event.data, base64ToString, {
              allowedKeys: allowedProtocolKeys,
              maxDecodedFieldBytes,
              maxKeyBytes: maxProtocolKeyBytes,
              maxSegments: maxProtocolSegments,
              maxTotalDecodedBytes
            });
            await _processMessage(parts);
          } catch (error) {
            onError.dispatch({ error });
            if (!parts || error.message === "authenticated_sender_mismatch") {
              socket.close(4008, "invalid_protocol_message");
            }
          }
        });
      });
    };
    const _processMessage = async (parts) => {
      const {
        [AUTHENTICATED_SENDER]: authenticatedSender,
        [SERVER_PAYLOAD]: serverPayload,
        [SERVER_TIME]: serverTime,
        [SHARED_ENCRYPTION_IV]: sharedEncryptionIv,
        [SHARED_ENCRYPTION_PAYLOAD]: sharedEncryptionPayload,
        [USER_DIRECT_PAYLOAD]: userDirectPayload,
        [USER_ENCRYPTION_IV]: userEncryptionIv,
        [USER_ENCRYPTION_KEY]: userEncryptionKey,
        [USER_ENCRYPTION_PAYLOAD]: userEncryptionPayload,
        [USER_ENCRYPTION_SIGNATURE]: userEncryptionSignature
      } = parts;
      let data;
      if (!serverPayload && !authenticatedSender) {
        throw new TypeError("missing_authenticated_sender");
      }
      const isHandshake = userEncryptionPayload && !userEncryptionKey;
      if (sharedEncryptionPayload) {
        if (!_sharedKey) {
          _sharedMessagesBuffer.push({
            time: Date.now(),
            parts
          });
          if (_sharedMessagesBuffer.length > messageBufferMaxCount) {
            _sharedMessagesBuffer.shift();
          }
          return;
        }
        data = await crypto.subtle.decrypt(
          {
            iv: base64ToBuffer(sharedEncryptionIv),
            name: SHARED_ENCRYPTION_ALGORITHM
          },
          _sharedKey,
          base64ToBuffer(sharedEncryptionPayload)
        );
        data = new TextDecoder().decode(data);
      } else if (userEncryptionPayload) {
        const user = _users.get(authenticatedSender);
        if (!(isHandshake ? user?.handshakeKey : user?.signKey)) {
          onError.dispatch({
            error: new Error(
              `No keys to decrypt message from ${authenticatedSender}`
            )
          });
          return;
        }
        const encryptedPayload = base64ToBuffer(userEncryptionPayload);
        if (!isHandshake && !await crypto.subtle.verify(
          USER_SIGNATURE_ALGORITHM,
          user.signKey,
          base64ToBuffer(userEncryptionSignature),
          encryptedPayload
        )) {
          onError.dispatch({
            error: new Error(`Invalid signature from ${authenticatedSender}`)
          });
          return;
        }
        data = new TextDecoder().decode(
          await crypto.subtle.decrypt(
            {
              iv: base64ToBuffer(userEncryptionIv),
              name: SHARED_ENCRYPTION_ALGORITHM
            },
            isHandshake ? user.handshakeKey : await crypto.subtle.importKey(
              "raw",
              await crypto.subtle.decrypt(
                {
                  name: USER_ENCRYPTION_ALGORITHM
                },
                _myEncryptKeys.privateKey,
                base64ToBuffer(userEncryptionKey)
              ),
              {
                name: SHARED_ENCRYPTION_ALGORITHM
              },
              false,
              ["decrypt"]
            ),
            encryptedPayload
          )
        );
      } else {
        data = serverPayload || userDirectPayload;
      }
      try {
        data = deserializeMessage(data);
      } catch (_error) {
        onError.dispatch({
          error: new Error("Failed to parse message")
        });
        return;
      }
      if (!serverPayload && data?.sender !== authenticatedSender) {
        throw new TypeError("authenticated_sender_mismatch");
      }
      const sender = data?.sender;
      if (!serverPayload !== (data?.type !== ROOM_JOINED && data?.type !== USER_JOINED && data?.type !== USER_LEFT && data?.type !== USER_VERIFIED)) {
        onError.dispatch({
          error: new Error("Message on the wrong channel")
        });
        return;
      }
      switch (data?.type) {
        case ROOM_JOINED:
          if (data.protocolVersion !== PROTOCOL_VERSION) {
            onError.dispatch({
              error: new Error("unsupported_protocol_version")
            });
            leaveRoom();
            return;
          }
          _creatorId = data.creatorId;
          _myId = data.userId;
          onRoomJoin.dispatch({
            creatorId: data.creatorId,
            roomCode: _roomCode,
            userId: data.userId,
            users: data.users
          });
          if (_myId === _creatorId) {
            _setConnectionState(CONNECTION_CONNECTED);
          } else {
            _setConnectionState(CONNECTION_PENDING_VERIFICATION);
            await _generateMyKeys();
            _myNonce = bufferToBase64(crypto.getRandomValues(new Uint8Array(32)));
            await _message(
              {
                type: EXCHANGE_0,
                commitment: bufferToBase64(
                  await crypto.subtle.digest(
                    HASH_ALGORITHM,
                    new TextEncoder().encode(
                      [
                        _myPublicKeys.publicEncryptKey,
                        _myPublicKeys.publicSignKey,
                        _myPublicKeys.publicExchangeKey,
                        _myNonce
                      ].join("|")
                    )
                  )
                ),
                publicData: typeof _publicData === "function" ? _publicData() : _publicData
              },
              {
                receiver: _creatorId,
                unencrypted: true
              }
            );
          }
          break;
        case EXCHANGE_0:
          if (userDirectPayload && _myId === _creatorId && !_users.has(sender)) {
            if (_publicDataVerify && !_publicDataVerify({
              data: data.publicData,
              userId: sender
            })) {
              kickUser(sender);
              return;
            }
            _users.set(sender, {
              commitment: data.commitment
            });
            await _generateMyKeys();
            await _message(
              {
                type: EXCHANGE_1,
                ..._myPublicKeys,
                publicData: typeof _publicData === "function" ? _publicData() : _publicData
              },
              {
                receiver: sender,
                unencrypted: true
              }
            );
          }
          break;
        case EXCHANGE_1:
          if (userDirectPayload && sender === _creatorId && _myId !== _creatorId && !_users.has(sender)) {
            if (_publicDataVerify && !_publicDataVerify({
              data: data.publicData,
              userId: _creatorId
            })) {
              leaveRoom();
              return;
            }
            _users.set(sender, {});
            await _deriveHandshake(sender, data, _myPublicKeys);
            await _message(
              {
                type: EXCHANGE_REVEAL,
                ..._myPublicKeys,
                nonce: _myNonce
              },
              {
                receiver: sender,
                unencrypted: true
              }
            );
          }
          break;
        case EXCHANGE_REVEAL: {
          const user = _users.get(sender);
          if (userDirectPayload && _myId === _creatorId && user?.commitment) {
            const { commitment } = user;
            user.commitment = null;
            if (bufferToBase64(
              await crypto.subtle.digest(
                HASH_ALGORITHM,
                new TextEncoder().encode(
                  [
                    data.publicEncryptKey,
                    data.publicSignKey,
                    data.publicExchangeKey,
                    data.nonce
                  ].join("|")
                )
              )
            ) !== commitment) {
              onError.dispatch({
                error: new Error(`Keys do not match the commitment of ${sender}`)
              });
              kickUser(sender);
              return;
            }
            await _deriveHandshake(sender, _myPublicKeys, data);
          }
          break;
        }
        case EXCHANGE_2:
          if (isHandshake && sender === _creatorId && !_sharedKey) {
            if (_privateDataVerify && !_privateDataVerify({
              data: data.privateData,
              userId: _creatorId
            })) {
              leaveRoom();
              return;
            }
            await _message(
              {
                type: EXCHANGE_3,
                privateData: typeof _privateData === "function" ? _privateData() : _privateData
              },
              {
                handshake: true,
                receiver: _creatorId
              }
            );
          }
          break;
        case EXCHANGE_3:
          if (isHandshake && _myId === _creatorId) {
            if (!_users.get(sender)?.verified) {
              onError.dispatch({
                error: new Error("User not verified")
              });
              kickUser(sender);
              return;
            }
            if (_privateDataVerify && !_privateDataVerify({
              data: data.privateData,
              userId: sender
            })) {
              kickUser(sender);
              return;
            }
            await _message(
              {
                type: EXCHANGE_4,
                sharedKey: bufferToBase64(
                  await crypto.subtle.exportKey("raw", _sharedKey)
                )
              },
              {
                handshake: true,
                receiver: sender
              }
            );
            await messageServer({
              type: USER_VERIFIED,
              userId: sender
            });
            onUserVerified.dispatch({
              userId: sender
            });
          }
          break;
        case EXCHANGE_4:
          if (isHandshake && sender === _creatorId && !_sharedKey) {
            _sharedKey = await crypto.subtle.importKey(
              "raw",
              base64ToBuffer(data.sharedKey),
              {
                name: SHARED_ENCRYPTION_ALGORITHM
              },
              false,
              ["encrypt", "decrypt"]
            );
            onUserVerified.dispatch({
              userId: _myId
            });
            while (_sharedMessagesBuffer.length > 0) {
              const { parts: parts2, time } = _sharedMessagesBuffer.shift();
              if (Date.now() - time < messageBufferMaxDuration) {
                await _processMessage(parts2);
              }
            }
            _setConnectionState(CONNECTION_CONNECTED);
          }
          break;
        case USER_LEFT:
          onUserLeave.dispatch({
            userId: data.userId
          });
          _users.delete(data.userId);
          break;
        case USER_JOINED:
          onUserJoin.dispatch({
            userId: data.userId
          });
          break;
        case USER_VERIFIED:
          onUserVerified.dispatch({
            userId: data.userId
          });
          break;
        default:
          if (!sharedEncryptionPayload && !(userEncryptionKey && (_myId !== _creatorId || _users.get(sender)?.verified))) {
            onError.dispatch({
              error: new Error("Message was not encrypted")
            });
            return;
          }
          onMessage.dispatch({
            data,
            time: calculateTime(serverTime, data?.senderTime)
          });
          break;
      }
    };
    const _message = async (data, options2 = {}) => {
      if (!_socket || _socket.readyState !== WebSocket.OPEN) {
        onError.dispatch({
          error: new Error("No open socket")
        });
        return false;
      }
      const message = serializeMessage({
        ...data,
        sender: _myId,
        senderTime: Date.now()
      });
      const parts = {};
      const receiver = options2.receiver;
      if (receiver) {
        const user = _users.get(receiver);
        if (options2.unencrypted) {
          parts[USER_DIRECT_PAYLOAD] = message;
        } else if (options2.handshake ? user?.handshakeKey : user?.encryptKey) {
          const iv = crypto.getRandomValues(new Uint8Array(12));
          let key = user.handshakeKey;
          if (!options2.handshake) {
            key = await crypto.subtle.generateKey(
              {
                length: SHARED_KEY_LENGTH,
                name: SHARED_ENCRYPTION_ALGORITHM
              },
              true,
              ["encrypt"]
            );
            parts[USER_ENCRYPTION_KEY] = bufferToBase64(
              await crypto.subtle.encrypt(
                {
                  name: USER_ENCRYPTION_ALGORITHM
                },
                user.encryptKey,
                await crypto.subtle.exportKey("raw", key)
              )
            );
          }
          const encryptedPayload = await crypto.subtle.encrypt(
            {
              iv,
              name: SHARED_ENCRYPTION_ALGORITHM
            },
            key,
            new TextEncoder().encode(message)
          );
          parts[USER_ENCRYPTION_IV] = bufferToBase64(iv);
          parts[USER_ENCRYPTION_PAYLOAD] = bufferToBase64(encryptedPayload);
          if (!options2.handshake) {
            parts[USER_ENCRYPTION_SIGNATURE] = bufferToBase64(
              await crypto.subtle.sign(
                USER_SIGNATURE_ALGORITHM,
                _mySignKeys.privateKey,
                encryptedPayload
              )
            );
          }
        } else {
          onError.dispatch({
            error: new Error(`No public key for ${receiver}`)
          });
          return false;
        }
        parts[USER] = receiver;
      } else if (options2.server) {
        parts[SERVER_PAYLOAD] = message;
      } else if (_sharedKey) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        parts[SHARED_ENCRYPTION_IV] = bufferToBase64(iv);
        parts[SHARED_ENCRYPTION_PAYLOAD] = bufferToBase64(
          await crypto.subtle.encrypt(
            {
              iv,
              name: SHARED_ENCRYPTION_ALGORITHM
            },
            _sharedKey,
            new TextEncoder().encode(message)
          )
        );
      } else {
        onError.dispatch({
          error: new Error("Trying to send without valid destination")
        });
        return false;
      }
      _socket.send(encode(parts, stringToBase64));
      return true;
    };
    const messageServer = (data) => _myId && _myId === _creatorId && _message(data, {
      server: true
    });
    const messageUser = (data, userId) => userId && _message(data, {
      receiver: userId
    });
    const getVerificationCode = (userId) => {
      const hash = _users.get(userId)?.code;
      if (!hash) {
        return false;
      }
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += IDENTIFIABLE_CHARACTERS[hash[i] % IDENTIFIABLE_CHARACTERS.length];
      }
      return code;
    };
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
      messageRoom: (data) => _message(data),
      messageServer,
      messageUser,
      closeRoom: () => messageServer({
        type: ROOM_CLOSED
      }),
      /**
       * Creates a new room and joins it.
       *
       * @param {RoomOptions} [options={}] - Options for creating the room.
       * @returns {Object<string, any>|undefined} Room creation data or undefined if failed.
       */
      createRoom: async (options2 = {}) => {
        if (_connectionState !== CONNECTION_DISCONNECTED) {
          return;
        }
        _setConnectionState(CONNECTION_CONNECTING);
        ({
          privateData: _privateData,
          publicData: _publicData,
          verifyPrivateData: _privateDataVerify,
          verifyPublicData: _publicDataVerify
        } = options2);
        let data;
        try {
          _sharedKey = await crypto.subtle.generateKey(
            {
              length: SHARED_KEY_LENGTH,
              name: SHARED_ENCRYPTION_ALGORITHM
            },
            true,
            ["encrypt", "decrypt"]
          );
          const url = new URL(httpUrl + createRoomEndpoint);
          if (options2.limit) {
            url.searchParams.append("limit", options2.limit);
          }
          const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
              Accept: contentType
            }
          });
          if (!response.ok) {
            throw new Error(`room_creation_failed:${response.status}`);
          }
          data = deserializeMessage(await response.text());
        } catch (error) {
          _sharedKey = null;
          _setConnectionState(CONNECTION_DISCONNECTED);
          onError.dispatch({
            error
          });
          return;
        }
        if (_connectionState !== CONNECTION_CONNECTING) {
          return;
        }
        _myId = data.userId;
        _joinRoom(data.roomCode, data.creatorConnectionToken);
        return data;
      },
      /**
       * Joins an existing room.
       *
       * @param {string} roomCode - The code of the room to join.
       * @param {RoomOptions} [options={}] - Options for joining the room.
       */
      joinRoom: (roomCode, options2 = {}) => {
        if (_connectionState !== CONNECTION_DISCONNECTED) {
          return;
        }
        ({
          privateData: _privateData,
          publicData: _publicData,
          verifyPrivateData: _privateDataVerify,
          verifyPublicData: _publicDataVerify
        } = options2);
        _joinRoom(roomCode);
      },
      leaveRoom,
      kickUser,
      getVerificationCode,
      /**
       * Verifies a user with the provided verification code.
       *
       * @param {string} userId - The ID of the user to verify.
       * @param {string} code - The verification code.
       * @returns {boolean} True if the verification was successful, false otherwise.
       */
      verifyUser: async (userId, code) => {
        if (_myId !== _creatorId || typeof code !== "string" || code.trim().toUpperCase() !== getVerificationCode(userId)) {
          return false;
        }
        _users.get(userId).verified = true;
        await _message(
          {
            type: EXCHANGE_2,
            privateData: typeof _privateData === "function" ? _privateData() : _privateData
          },
          {
            handshake: true,
            receiver: userId
          }
        );
        return true;
      }
    };
  };

  // src/index.base.iife.js
  iife(["roupn"], {
    createClientConnector
  });
})();
//# sourceMappingURL=roupn.base.iife.js.map
