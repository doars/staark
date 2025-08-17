// src/library/message-types.js
var CONNECTION_CONNECTED = "CONNECTED";
var CONNECTION_CONNECTING = "CONNECTING";
var CONNECTION_DISCONNECTED = "DISCONNECTED";
var CONNECTION_DISCONNECTING = "DISCONNECTING";
var CONNECTION_PENDING_VERIFICATION = "PENDING_VERIFICATION";
var EXCHANGE_0 = "_X0";
var EXCHANGE_1 = "_X1";
var EXCHANGE_2 = "_X2";
var EXCHANGE_3 = "_X3";
var EXCHANGE_4 = "_X4";
var ROOM_CLOSED = "_RC";
var ROOM_JOINED = "_RJ";
var STATE_UPDATE = "_SU";
var STATE_SYNCH = "_SS";
var USER_JOINED = "_UJ";
var USER_KICK = "_UK";
var USER_LEFT = "_UL";
var USER_VERIFIED = "_UV";

// src/utilities/code.js
var ALPHANUMERIC_CHARACTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
var IDENTIFIABLE_CHARACTERS = "ABCDEFGHKMNPQRSTUVWXYZ23456789";
var generateCode = (length = 24, characters = ALPHANUMERIC_CHARACTERS) => {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += characters.charAt(
      Math.floor(
        Math.random() * characters.length
      )
    );
  }
  return code;
};

// src/utilities/encoding-client.js
var base64ToBuffer = (base64) => {
  const binary = atob(base64);
  return Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0)
  ).buffer;
};
var base64ToString = (base64) => {
  const binary = atob(base64);
  const bytes = Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0)
  );
  return new TextDecoder().decode(bytes);
};
var stringToBase64 = (string) => {
  const bytes = new TextEncoder().encode(string);
  if (bytes.length < 65536) {
    return btoa(
      String.fromCharCode(...bytes)
    );
  }
  let binary = "";
  const chunkSize = 65536;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};
var bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 65536) {
    return btoa(
      String.fromCharCode(...bytes)
    );
  }
  let binary = "";
  const chunkSize = 65536;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

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
        listener(data);
        if (options && options.once) {
          listeners.delete(listener);
        }
      }
    }
  };
};

// src/utilities/protocol.js
var DELIMITER = "|";
var INFIX = ":";
var encode = (parts, stringToBase642) => {
  const segments = [];
  for (const key in parts) {
    const value = parts[key];
    if (value !== null && value !== void 0) {
      segments.push(
        key + INFIX + stringToBase642(
          String(value)
        )
      );
    }
  }
  return segments.join(DELIMITER);
};
var decode = (message, base64ToString2) => {
  const parts = {};
  const segments = message.split(DELIMITER);
  for (const segment of segments) {
    const index = segment.indexOf(INFIX);
    if (index > 0) {
      const key = segment.substring(0, index);
      const value = segment.substring(index + 1);
      parts[key] = base64ToString2(value);
    }
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

// src/library/key-generator.js
var DIFFIE_HELLMAN_ALGORITHM = "ECDH";
var DIFFIE_HELLMAN_CURVE = "P-256";
var DIFFIE_HELLMAN_EXPORT_FORMAT = "raw";
var HASH_ALGORITHM = "SHA-256";
var PUBLIC_KEY_EXPORT_FORMAT = "spki";
var SHARED_ENCRYPTION_ALGORITHM = "AES-GCM";
var SHARED_KEY_LENGTH = 256;
var USER_ENCRYPTION_ALGORITHM = "RSA-OAEP";
var USER_SIGNATURE_ALGORITHM = "RSASSA-PKCS1-v1_5";
var USER_KEY_GENERATOR = "self.addEventListener('message'," + (() => {
  Promise.all([
    crypto.subtle.generateKey({
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: { name: "SHA-256" }
    }, true, ["encrypt", "decrypt"]),
    crypto.subtle.generateKey({
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: { name: "SHA-256" }
    }, true, ["sign", "verify"]),
    crypto.subtle.generateKey({
      name: "ECDH",
      namedCurve: "P-256"
    }, true, ["deriveKey"])
  ]).then(([
    myEncryptKeys,
    mySignKeys,
    myExchangeKeys
  ]) => {
    Promise.all([
      crypto.subtle.exportKey(
        "spki",
        myEncryptKeys.publicKey
      ),
      crypto.subtle.exportKey(
        "spki",
        mySignKeys.publicKey
      )
    ]).then(([
      myPublicEncryptKey,
      myPublicSignKey
    ]) => {
      self.postMessage({
        success: true,
        myEncryptKeys,
        mySignKeys,
        myExchangeKeys,
        myPublicEncryptKey,
        myPublicSignKey
      });
    }).catch((error) => {
      self.postMessage({
        success: false,
        error: error.message
      });
    });
  }).catch((error) => {
    self.postMessage({
      success: false,
      error: error.message
    });
  });
}).toString() + ")";
var SHARED_KEY_GENERATOR = "self.addEventListener('message'," + (() => {
  crypto.subtle.generateKey({
    length: 256,
    name: "AES-GCM"
  }, true, ["encrypt", "decrypt"]).then((sharedKey) => {
    self.postMessage({
      success: true,
      sharedKey
    });
  }).catch((error) => {
    self.postMessage({
      success: false,
      error: error.message
    });
  });
}).toString() + ")";

// src/library/payload-keys.js
var SERVER_PAYLOAD = "S";
var SERVER_TIME = "T";
var SHARED_ENCRYPTION_PAYLOAD = "E";
var SHARED_ENCRYPTION_IV = "I";
var USER = "U";
var USER_DIRECT_PAYLOAD = "D";
var USER_ENCRYPTION_IV = "V";
var USER_ENCRYPTION_KEY = "K";
var USER_ENCRYPTION_PAYLOAD = "P";
var USER_ENCRYPTION_SIGNATURE = "G";

// src/library/client-connector.js
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
    messageBufferMaxDuration = 60 * 1e3
  } = options;
  let _connectionState = CONNECTION_DISCONNECTED, _creatorId, _generatedKeys, _keyGenerationPromise, _myEncryptKeys, _myExchangeKeys, _myId, _myPublicEncryptKey, _myPublicSignKey, _mySignKeys, _privateData, _privateDataVerify, _publicData, _publicDataVerify, _roomCode, _sharedKey, _sharedMessagesBuffer = [], _socket, _userDerivedKeys = /* @__PURE__ */ new Map(), _userEncryptKeys = /* @__PURE__ */ new Map(), _userSignKeys = /* @__PURE__ */ new Map(), _userVerification = /* @__PURE__ */ new Map(), _userVerified = /* @__PURE__ */ new Map();
  const _generateMyKeys = () => {
    if (!_generatedKeys && !_keyGenerationPromise) {
      _keyGenerationPromise = new Promise((resolve, reject) => {
        const worker = new Worker(
          URL.createObjectURL(
            new Blob([USER_KEY_GENERATOR], {
              type: "text/javascript"
            })
          )
        );
        worker.addEventListener("message", (event) => {
          if (event.data.success) {
            _myEncryptKeys = event.data.myEncryptKeys;
            _mySignKeys = event.data.mySignKeys;
            _myExchangeKeys = event.data.myExchangeKeys;
            _myPublicEncryptKey = event.data.myPublicEncryptKey;
            _myPublicSignKey = event.data.myPublicSignKey;
            _generatedKeys = true;
            _keyGenerationPromise = null;
            resolve();
          } else {
            const error = new Error(event.data.error);
            onError.dispatch({
              error
            });
            reject(error);
          }
          worker.terminate();
        });
        worker.addEventListener("error", (error) => {
          onError.dispatch({
            error
          });
          reject(error);
          worker.terminate();
        });
        worker.postMessage({
          type: "USER_KEYS"
        });
      });
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
  const _generateVerificationCode = async (userId) => {
    const derivedKey = _userDerivedKeys.get(userId);
    if (!derivedKey) {
      return;
    }
    _userVerification.set(
      userId,
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            HASH_ALGORITHM,
            new TextEncoder().encode(
              _roomCode + bufferToBase64(
                await crypto.subtle.exportKey(
                  "raw",
                  derivedKey
                )
              )
            )
          )
        )
      )
    );
    onUserVerificationCode.dispatch({
      userId,
      code: getVerificationCode(userId)
    });
  };
  const leaveRoom = () => {
    if (_connectionState === CONNECTION_DISCONNECTED || _connectionState === CONNECTION_DISCONNECTING) {
      return;
    }
    _setConnectionState(CONNECTION_DISCONNECTING);
    if (_socket) {
      _socket.close();
    }
    _creatorId = _generatedKeys = _keyGenerationPromise = _myId = _myEncryptKeys = _myExchangeKeys = _myPublicEncryptKey = _myPublicSignKey = _mySignKeys = _privateData = _privateDataVerify = _publicData = _publicDataVerify = _sharedKey = _sharedMessagesBuffer = _socket = null;
    _userDerivedKeys.clear();
    _userEncryptKeys.clear();
    _userSignKeys.clear();
    _userVerification.clear();
    _userVerified.clear();
    _generateMyKeys();
    _setConnectionState(CONNECTION_DISCONNECTED);
  };
  const kickUser = (userId) => messageServer({
    type: USER_KICK,
    userId
  });
  const _joinRoom = (roomCode, creatorSecret = null) => {
    if (!creatorSecret && _connectionState && _connectionState !== CONNECTION_DISCONNECTED) {
      return;
    }
    _setConnectionState(CONNECTION_CONNECTING);
    _roomCode = roomCode;
    const url = new URL(
      wsUrl + joinRoomEndpoint
    );
    url.searchParams.append(
      "code",
      _roomCode
    );
    if (creatorSecret) {
      url.searchParams.append(
        "creator",
        creatorSecret
      );
    }
    _socket = new WebSocket(
      url.toString()
    );
    _socket.addEventListener("close", (event) => {
      onRoomLeave.dispatch({
        event
      });
      leaveRoom();
    });
    _socket.addEventListener("error", (event) => {
      onError.dispatch({
        event
      });
      leaveRoom();
    });
    _socket.addEventListener("message", async (event) => {
      _processMessage(
        decode(
          event.data,
          base64ToString
        ),
        event.data
      );
    });
  };
  const _processMessage = async (parts, raw, isBuffered = false) => {
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
      [USER]: userReceiver
    } = parts;
    let data, deserializedData, payload, wasEncrypted;
    if (serverPayload) {
      payload = serverPayload;
    } else if (userDirectPayload) {
      payload = userDirectPayload;
    } else {
      payload = raw;
    }
    if (sharedEncryptionPayload) {
      if (!_sharedKey || !isBuffered && _sharedMessagesBuffer.length > 0) {
        _sharedMessagesBuffer.push({
          time: Date.now(),
          parts,
          raw
        });
        if (_sharedMessagesBuffer.length > messageBufferMaxCount) {
          _sharedMessagesBuffer.shift();
        }
        return;
      }
      if (!sharedEncryptionIv) {
        onError.dispatch(
          new Error("Missing IV to decrypt message")
        );
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
      wasEncrypted = true;
    } else if (userEncryptionPayload) {
      if (!userEncryptionKey || !userEncryptionIv) {
        onError.dispatch({
          error: new Error("Missing signature or IV to decrypt message.")
        });
        return;
      }
      if (!_generatedKeys) {
        await _generateMyKeys();
      }
      const encryptedPayload = base64ToBuffer(userEncryptionPayload);
      const payloadData = deserializeMessage(
        new TextDecoder().decode(
          await crypto.subtle.decrypt(
            {
              iv: base64ToBuffer(userEncryptionIv),
              name: SHARED_ENCRYPTION_ALGORITHM
            },
            await crypto.subtle.importKey(
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
              true,
              ["encrypt", "decrypt"]
            ),
            encryptedPayload
          )
        )
      );
      wasEncrypted = true;
      if (payloadData.type === EXCHANGE_1) {
        deserializedData = payloadData;
      } else if (userEncryptionSignature) {
        const senderId = payloadData.sender;
        if (!senderId) {
          onError.dispatch({
            error: new Error("Message from unknown sender")
          });
          return;
        }
        const senderPublicKey = _userSignKeys.get(senderId);
        if (!senderPublicKey) {
          onError.dispatch({
            error: new Error("No public key for " + senderId)
          });
          return;
        }
        if (!await crypto.subtle.verify(
          USER_SIGNATURE_ALGORITHM,
          senderPublicKey,
          base64ToBuffer(userEncryptionSignature),
          encryptedPayload
        )) {
          onError.dispatch({
            error: new Error("Invalid signature from " + senderId)
          });
          return;
        }
        deserializedData = payloadData;
      } else {
        onError.dispatch({
          error: new Error("Missing encryption signature")
        });
        return;
      }
    } else {
      data = payload;
    }
    if (!deserializedData) {
      try {
        deserializedData = deserializeMessage(data);
      } catch (error) {
        onError.dispatch({
          error: new Error("Failed to parse message " + raw)
        });
        return;
      }
    }
    data = deserializedData;
    switch (data.type) {
      case ROOM_JOINED:
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
          if (!_generatedKeys) {
            await _generateMyKeys();
          }
          const myPublicExchangeKey = await crypto.subtle.exportKey(
            DIFFIE_HELLMAN_EXPORT_FORMAT,
            _myExchangeKeys.publicKey
          );
          _message({
            type: EXCHANGE_0,
            publicData: typeof _publicData === "function" ? _publicData() : _publicData,
            publicEncryptKey: bufferToBase64(_myPublicEncryptKey),
            publicExchangeKey: bufferToBase64(myPublicExchangeKey),
            publicSignKey: bufferToBase64(_myPublicSignKey)
          }, {
            allowUnencrypted: true,
            receiver: _creatorId
          });
        }
        break;
      case EXCHANGE_0:
        if (userReceiver === _creatorId && _myId === _creatorId) {
          const newUserId = data.sender;
          if (_publicDataVerify && !_publicDataVerify({
            data: data.publicData,
            userId: newUserId
          })) {
            kickUser(newUserId);
            return;
          }
          _userEncryptKeys.set(
            newUserId,
            await crypto.subtle.importKey(
              PUBLIC_KEY_EXPORT_FORMAT,
              base64ToBuffer(data.publicEncryptKey),
              {
                hash: HASH_ALGORITHM,
                name: USER_ENCRYPTION_ALGORITHM
              },
              true,
              ["encrypt"]
            )
          );
          const publicSignKey = await crypto.subtle.importKey(
            PUBLIC_KEY_EXPORT_FORMAT,
            base64ToBuffer(data.publicSignKey),
            {
              hash: HASH_ALGORITHM,
              name: USER_SIGNATURE_ALGORITHM
            },
            true,
            ["verify"]
          );
          const publicExchangeKeyData = base64ToBuffer(
            data.publicExchangeKey
          );
          if (!await crypto.subtle.verify(
            USER_SIGNATURE_ALGORITHM,
            publicSignKey,
            base64ToBuffer(data.signature),
            publicExchangeKeyData
          )) {
            onError.dispatch({
              error: new Error("Invalid signature for exchange from " + newUserId)
            });
            return;
          }
          _userSignKeys.set(newUserId, publicSignKey);
          if (!_generatedKeys) {
            await _generateMyKeys();
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
                    namedCurve: DIFFIE_HELLMAN_CURVE
                  },
                  true,
                  []
                )
              },
              _myExchangeKeys.privateKey,
              {
                length: SHARED_KEY_LENGTH,
                name: SHARED_ENCRYPTION_ALGORITHM
              },
              true,
              ["encrypt", "decrypt"]
            )
          );
          const myPublicExchangeKey = await crypto.subtle.exportKey(
            DIFFIE_HELLMAN_EXPORT_FORMAT,
            _myExchangeKeys.publicKey
          );
          _message({
            type: EXCHANGE_1,
            publicData: typeof _publicData === "function" ? _publicData() : _publicData,
            publicEncryptKey: bufferToBase64(_myPublicEncryptKey),
            publicExchangeKey: bufferToBase64(myPublicExchangeKey),
            publicSignKey: bufferToBase64(_myPublicSignKey)
          }, {
            receiver: newUserId
          });
          _generateVerificationCode(newUserId);
        }
        break;
      case EXCHANGE_1:
        if (userReceiver === _myId && data.sender === _creatorId) {
          if (_publicDataVerify && !_publicDataVerify({
            data: data.publicData,
            userId: _creatorId
          })) {
            leaveRoom();
            return;
          }
          const hostPublicSignKey = await crypto.subtle.importKey(
            PUBLIC_KEY_EXPORT_FORMAT,
            base64ToBuffer(data.publicSignKey),
            {
              hash: HASH_ALGORITHM,
              name: USER_SIGNATURE_ALGORITHM
            },
            true,
            ["verify"]
          );
          if (data.publicExchangeKey && data.signature) {
            if (!await crypto.subtle.verify(
              USER_SIGNATURE_ALGORITHM,
              hostPublicSignKey,
              base64ToBuffer(data.signature),
              base64ToBuffer(data.publicExchangeKey)
            )) {
              onError.dispatch({
                error: new Error("Invalid signature for exchange from " + _creatorId)
              });
              leaveRoom();
              return;
            }
          }
          _userSignKeys.set(
            _creatorId,
            hostPublicSignKey
          );
          _userEncryptKeys.set(
            _creatorId,
            await crypto.subtle.importKey(
              PUBLIC_KEY_EXPORT_FORMAT,
              base64ToBuffer(data.publicEncryptKey),
              {
                hash: HASH_ALGORITHM,
                name: USER_ENCRYPTION_ALGORITHM
              },
              true,
              ["encrypt"]
            )
          );
          if (!_generatedKeys) {
            await _generateMyKeys();
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
                    namedCurve: DIFFIE_HELLMAN_CURVE
                  },
                  true,
                  []
                )
              },
              _myExchangeKeys.privateKey,
              {
                length: SHARED_KEY_LENGTH,
                name: SHARED_ENCRYPTION_ALGORITHM
              },
              true,
              ["encrypt", "decrypt"]
            )
          );
          _generateVerificationCode(_creatorId);
        }
        break;
      case EXCHANGE_2:
        if (userReceiver === _myId && data.sender === _creatorId) {
          if (!wasEncrypted) {
            onError.dispatch({
              error: new Error("Message was not encrypted")
            });
            return;
          }
          if (_privateDataVerify && !_privateDataVerify({
            data: data.privateData,
            userId: _creatorId
          })) {
            leaveRoom();
            return;
          }
          _message({
            type: EXCHANGE_3,
            privateData: _privateData
          }, {
            receiver: _creatorId
          });
        }
        break;
      case EXCHANGE_3:
        if (userReceiver === _creatorId && _myId === _creatorId) {
          if (!wasEncrypted) {
            onError.dispatch({
              error: new Error("Message was not encrypted")
            });
            return;
          }
          const userId = data.sender;
          if (!_userVerified.get(userId)) {
            onError.dispatch({
              error: new Error("User not verified")
            });
            kickUser(userId);
            return;
          }
          if (_privateDataVerify && !_privateDataVerify({
            data: data.privateData,
            userId
          })) {
            kickUser(userId);
            return;
          }
          _message({
            type: EXCHANGE_4,
            sharedKey: bufferToBase64(
              await crypto.subtle.exportKey(
                "raw",
                _sharedKey
              )
            )
          }, {
            receiver: userId
          });
          onUserVerified.dispatch({
            userId
          });
          messageServer({
            type: USER_VERIFIED,
            userId
          });
        }
        break;
      case EXCHANGE_4:
        if (userReceiver === _myId && data.sender === _creatorId) {
          if (!wasEncrypted) {
            onError.dispatch({
              error: new Error("Message was not encrypted")
            });
            return;
          }
          _sharedKey = await crypto.subtle.importKey(
            "raw",
            base64ToBuffer(
              data.sharedKey
            ),
            {
              name: SHARED_ENCRYPTION_ALGORITHM
            },
            true,
            ["encrypt", "decrypt"]
          );
          onUserVerified.dispatch({
            userId: _myId
          });
          if (_sharedMessagesBuffer.length > 0) {
            const now = Date.now();
            _sharedMessagesBuffer = _sharedMessagesBuffer.filter((item) => now - item.time < messageBufferMaxDuration);
            while (_sharedMessagesBuffer.length > 0) {
              const {
                parts: parts2,
                raw: raw2
              } = _sharedMessagesBuffer.shift();
              _processMessage(
                parts2,
                raw2,
                true
              );
            }
          }
          _setConnectionState(CONNECTION_CONNECTED);
        }
        break;
      case USER_LEFT:
        onUserLeave.dispatch({
          userId: data.userId
        });
        _userDerivedKeys.delete(data.userId);
        _userEncryptKeys.delete(data.userId);
        _userSignKeys.delete(data.userId);
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
        if (!wasEncrypted) {
          onError.dispatch({
            error: new Error("Message was not encrypted")
          });
          return;
        }
        onMessage.dispatch({
          data,
          time: calculateTime(
            serverTime,
            data?.senderTime
          )
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
      const receiverPublicKey = _userEncryptKeys.get(receiver);
      if (receiverPublicKey) {
        const tempKey = await crypto.subtle.generateKey(
          {
            name: SHARED_ENCRYPTION_ALGORITHM,
            length: 256
          },
          true,
          ["encrypt", "decrypt"]
        );
        const iv = crypto.getRandomValues(
          new Uint8Array(12)
        );
        const encryptedPayload = await crypto.subtle.encrypt(
          {
            iv,
            name: SHARED_ENCRYPTION_ALGORITHM
          },
          tempKey,
          new TextEncoder().encode(message)
        );
        if (!_generatedKeys) {
          await _generateMyKeys();
        }
        parts[USER_ENCRYPTION_IV] = bufferToBase64(iv);
        parts[USER_ENCRYPTION_KEY] = bufferToBase64(
          await crypto.subtle.encrypt(
            {
              name: USER_ENCRYPTION_ALGORITHM
            },
            receiverPublicKey,
            await crypto.subtle.exportKey(
              "raw",
              tempKey
            )
          )
        );
        parts[USER_ENCRYPTION_PAYLOAD] = bufferToBase64(encryptedPayload);
        parts[USER_ENCRYPTION_SIGNATURE] = bufferToBase64(
          await crypto.subtle.sign(
            USER_SIGNATURE_ALGORITHM,
            _mySignKeys.privateKey,
            encryptedPayload
          )
        );
      } else if (!options2.allowUnencrypted) {
        onError.dispatch({
          error: new Error("No public key for " + receiver)
        });
        return false;
      } else {
        parts[USER_DIRECT_PAYLOAD] = message;
      }
      parts[USER] = receiver;
    } else if (options2.server) {
      parts[SERVER_PAYLOAD] = message;
    } else if (_sharedKey) {
      const iv = crypto.getRandomValues(
        new Uint8Array(12)
      );
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
      onError.dispatch(
        new Error("Trying to send without valid destination")
      );
      return false;
    }
    _socket.send(
      encode(
        parts,
        stringToBase64
      )
    );
    return true;
  };
  const messageServer = (data) => _myId && _myId === _creatorId && _message(data, {
    server: true
  });
  const messageUser = (data, userId) => userId && _message(data, {
    receiver: userId
  });
  const getVerificationCode = (userId, codeLength = 6) => {
    if (!_userVerification.has(userId)) {
      return false;
    }
    const hashArray = _userVerification.get(userId);
    let code = "";
    for (let i = 0; i < codeLength; i++) {
      const index = hashArray[i] % IDENTIFIABLE_CHARACTERS.length;
      code += IDENTIFIABLE_CHARACTERS[index];
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
    createRoom: async (options2 = {}) => {
      if (_connectionState && _connectionState !== CONNECTION_DISCONNECTED) {
        return;
      }
      _setConnectionState(CONNECTION_CONNECTING);
      if (options2.publicData) {
        _publicData = options2.publicData;
      }
      if (options2.verifyPublicData) {
        _publicDataVerify = options2.verifyPublicData;
      }
      try {
        await new Promise((resolve, reject) => {
          const worker = new Worker(
            URL.createObjectURL(
              new Blob([SHARED_KEY_GENERATOR], {
                type: "text/javascript"
              })
            )
          );
          worker.addEventListener("message", (event) => {
            if (event.data.success) {
              _sharedKey = event.data.sharedKey;
              resolve();
            } else {
              reject(
                new Error(event.data.error)
              );
            }
            worker.terminate();
          });
          worker.addEventListener("error", (error) => {
            reject(error);
            worker.terminate();
          });
          worker.postMessage({
            type: "SHARED_KEY"
          });
        });
      } catch (error) {
        _setConnectionState(CONNECTION_DISCONNECTED);
        onError.dispatch({
          error
        });
        return;
      }
      const url = new URL(
        httpUrl + createRoomEndpoint
      );
      if (options2.limit) {
        url.searchParams.append(
          "limit",
          options2.limit
        );
      }
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: contentType
        }
      });
      if (!response.ok) {
        throw new Error("Failed to create room");
      }
      let data = await response.text();
      data = deserializeMessage(data);
      _myId = data.userId;
      _joinRoom(
        data.roomCode,
        data.creatorSecret
      );
      return data;
    },
    joinRoom: (roomCode, options2 = {}) => {
      if (options2.publicData) {
        _publicData = options2.publicData;
      }
      if (options2.verifyPublicData) {
        _publicDataVerify = options2.verifyPublicData;
      }
      _joinRoom(
        roomCode
      );
    },
    leaveRoom,
    kickUser,
    getVerificationCode,
    verifyUser: async (userId, code) => {
      if (_myId !== _creatorId || !code) {
        return false;
      }
      const expectedCode = getVerificationCode(
        userId,
        code.length
      );
      if (!expectedCode || !code || expectedCode !== code) {
        return false;
      }
      _userVerified.set(userId, true);
      const derivedKey = _userDerivedKeys.get(userId);
      if (!derivedKey) {
        return false;
      }
      _message({
        type: EXCHANGE_2,
        privateData: _privateData
      }, {
        receiver: userId
      });
      return true;
    }
  };
};

// ../tiedliene/src/utilities/clone.js
var cloneRecursive = (value) => {
  if (typeof value === "object") {
    const clone = Array.isArray(value) ? [] : {};
    for (const key in value) {
      clone[key] = cloneRecursive(value[key]);
    }
    return clone;
  }
  return value;
};

// ../tiedliene/src/library/diff.js
var setValueAtPath = (record, path, value) => {
  let current = record;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  current[path[path.length - 1]] = cloneRecursive(value);
};
var deleteValueAtPath = (record, path) => {
  let current = record;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]];
    if (!current) {
      return;
    }
  }
  if (Array.isArray(current)) {
    current.splice(parseInt(path[path.length - 1]), 1);
  } else {
    delete current[path[path.length - 1]];
  }
};
var determineDiff = (before, after, path = []) => {
  const changes = [];
  for (const key in before) {
    const currentPath = [...path, key];
    if (!(key in after)) {
      changes.unshift({
        type: "delete",
        path: currentPath,
        old: cloneRecursive(before[key])
      });
    } else if (typeof before[key] === "object" && typeof after[key] === "object") {
      changes.unshift(
        ...determineDiff(before[key], after[key], currentPath)
      );
    } else if (before[key] !== after[key]) {
      changes.unshift({
        type: "set",
        path: currentPath,
        old: cloneRecursive(before[key]),
        new: cloneRecursive(after[key])
      });
    }
  }
  for (const key in after) {
    if (!(key in before)) {
      changes.unshift({
        type: "set",
        path: [...path, key],
        new: cloneRecursive(after[key])
      });
    }
  }
  return changes;
};
var applyDiff = (state, diff) => {
  for (const change of diff) {
    if (change.type === "set") {
      setValueAtPath(state, change.path, change.new);
    } else if (change.type === "delete") {
      deleteValueAtPath(state, change.path);
    }
  }
  return state;
};
var revertDiff = (state, diff) => {
  for (const change of diff) {
    if (change.type === "set") {
      if (change.old === void 0) {
        deleteValueAtPath(state, change.path);
      } else {
        setValueAtPath(state, change.path, change.old);
      }
    } else if (change.type === "delete") {
      setValueAtPath(state, change.path, change.old);
    }
  }
  return state;
};

// src/library/client-synchronizer.js
var createClientSynchronizer = (options = {}, privateState = {}, publicState = {}) => {
  const connector = createClientConnector(options);
  const {
    messageRoom
  } = connector;
  const {
    windowPerUser = 16,
    synchronisationInterval = 60 * 1e3
  } = options;
  const _stateUpdates = [];
  let _synchronisationIntervalId, _messageDelay = 0, _messageOffset = 0, _stateUpdatesWindow = windowPerUser;
  const _sendDelta = (stateDelta) => {
    const identifier = generateCode();
    const previous = stateDelta.length > 0 ? stateDelta[0].identifier : null;
    _stateUpdates.unshift({
      identifier,
      previous,
      sender: privateState.userId,
      stateDelta,
      time: {
        adjusted: Date.now() + _messageDelay - _messageOffset
      }
    });
    if (_stateUpdates.length > _stateUpdatesWindow) {
      _stateUpdates.splice(
        _stateUpdatesWindow
      );
    }
    messageRoom({
      identifier,
      previous,
      stateDelta,
      type: STATE_UPDATE
    });
    _updatePreviousState();
  };
  const sendUpdate = () => {
    if (privateState.previousState) {
      const stateDelta = determineDiff(
        privateState.previousState,
        publicState
      );
      if (stateDelta.length > 0) {
        _sendDelta(
          stateDelta
        );
      }
    }
  };
  const _synchroniseState = () => {
    if (privateState.users.length > 1) {
      messageRoom({
        type: STATE_SYNCH,
        state: cloneRecursive(
          publicState
        )
      });
    }
  };
  const _updatePreviousState = () => {
    privateState.previousState = cloneRecursive(
      publicState
    );
  };
  connector.onMessage.addListener(({
    data,
    time
  }) => {
    if (data.sender === privateState.userId || data.receiver && data.receiver !== privateState.userId) {
      return;
    }
    _messageDelay = (_messageDelay + time.delay) / 2;
    _messageOffset = (_messageOffset + time.offset) / 2;
    if (data.type === STATE_SYNCH) {
      let index = 0;
      for (; index < _stateUpdates.length; index++) {
        const previousUpdate = _stateUpdates[index];
        if (previousUpdate.time.adjusted >= time.adjusted) {
          break;
        }
      }
      _stateUpdates.splice(0, index);
      for (const key in publicState) {
        delete publicState[key];
      }
      for (const key in data.state) {
        publicState[key] = data.state[key];
      }
      for (let index2 = 0; index2 < _stateUpdates.length; index2++) {
        applyDiff(
          publicState,
          _stateUpdates[index2].stateDelta
        );
      }
      _updatePreviousState();
    } else if (data.type === STATE_UPDATE) {
      let failedToInsert = true;
      for (let index = 0; index < _stateUpdates.length; index++) {
        const previousUpdate = _stateUpdates[index];
        if (
          // If the update's identifier matches the data's previous, we can insert it here.
          previousUpdate.identifier === data.previous || // If the previous updates are the same. If the time of this update is newer than the previous one, we can insert it before the previous one.
          previousUpdate.previous === data.previous && previousUpdate.time.adjusted < time.adjusted
        ) {
          _stateUpdates.splice(index, 0, {
            ...data,
            time
          });
          failedToInsert = false;
          break;
        }
      }
      if (failedToInsert) {
        _stateUpdates.unshift({
          ...data,
          time
        });
      }
      for (let index = 0; index < _stateUpdates.length; index++) {
        const update = _stateUpdates[index];
        if (update.identifier === data.identifier) {
          break;
        }
        revertDiff(
          publicState,
          update.stateDelta
        );
      }
      for (let index = 0; index < _stateUpdates.length; index++) {
        const update = _stateUpdates[index];
        applyDiff(
          publicState,
          update.stateDelta
        );
        if (update.identifier === data.identifier) {
          break;
        }
      }
      _updatePreviousState();
    }
  });
  connector.onConnection.addListener(({
    state
  }) => {
    privateState.connectionState = state;
  });
  connector.onRoomJoin.addListener(({
    creatorId,
    roomCode,
    userId,
    users
  }) => {
    privateState.creatorId = creatorId;
    privateState.roomCode = roomCode;
    privateState.userId = userId;
    privateState.users = users;
    privateState.verifiedUsers = [];
    privateState.previousState = cloneRecursive(
      publicState
    );
    if (userId === creatorId) {
      privateState.verifiedUsers.push(userId);
      _synchronisationIntervalId = setInterval(
        _synchroniseState,
        synchronisationInterval
      );
    }
  });
  connector.onRoomLeave.addListener(() => {
    for (const key in privateState) {
      delete privateState[key];
    }
    if (_synchronisationIntervalId) {
      clearInterval(_synchronisationIntervalId);
    }
  });
  connector.onUserJoin.addListener(({
    userId
  }) => {
    privateState.users.push(
      userId
    );
    _stateUpdatesWindow = windowPerUser + windowPerUser * privateState.users.length;
  });
  connector.onUserVerificationCode.addListener((event) => {
    if (event.userId === privateState.creatorId) {
      privateState.verificationCode = event.code;
    }
  });
  connector.onUserVerified.addListener(({
    userId
  }) => {
    privateState.verifiedUsers.push(
      userId
    );
    _stateUpdatesWindow = windowPerUser + windowPerUser * privateState.users.length;
    if (privateState.userId === privateState.creatorId) {
      _synchroniseState();
    }
  });
  connector.onUserLeave.addListener(({
    userId
  }) => {
    for (let index = 0; index < privateState.users.length; index++) {
      if (privateState.users[index] === userId) {
        privateState.users.splice(index, 1);
        break;
      }
    }
    for (let index = 0; index < privateState.verifiedUsers.length; index++) {
      if (privateState.verifiedUsers[index] === userId) {
        privateState.verifiedUsers.splice(index, 1);
        break;
      }
    }
    _stateUpdatesWindow = windowPerUser + windowPerUser * privateState.users.length;
  });
  return Object.assign({
    privateState,
    publicState,
    sendUpdate
  }, connector);
};
export {
  createClientConnector,
  createClientSynchronizer
};
//# sourceMappingURL=roupn.js.map
