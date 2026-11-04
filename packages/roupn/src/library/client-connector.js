import { IDENTIFIABLE_CHARACTERS } from "../utilities/code.js";
import {
	base64ToBuffer,
	base64ToString,
	bufferToBase64,
	stringToBase64,
} from "../utilities/encoding-client.js";
import { createEvent } from "../utilities/event.js";
import { decode, encode } from "../utilities/protocol.js";
import { calculateTime } from "../utilities/time.js";
import { SHARED_KEY_GENERATOR, USER_KEY_GENERATOR } from "./key-generator.js";
import {
	CONNECTION_CONNECTED,
	CONNECTION_CONNECTING,
	CONNECTION_DISCONNECTED,
	CONNECTION_DISCONNECTING,
	CONNECTION_PENDING_VERIFICATION,
	EXCHANGE_0,
	EXCHANGE_1,
	EXCHANGE_2,
	EXCHANGE_3,
	EXCHANGE_4,
	EXCHANGE_REVEAL,
	PROTOCOL_VERSION,
	ROOM_CLOSED,
	ROOM_JOINED,
	USER_JOINED,
	USER_KICK,
	USER_LEFT,
	USER_VERIFIED,
} from "./message-types.js";
import {
	AUTHENTICATED_SENDER,
	CREATOR_AUTHENTICATION,
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
} from "./payload-keys.js";

const DIFFIE_HELLMAN_ALGORITHM = "ECDH";
const DIFFIE_HELLMAN_CURVE = "P-256";
const DIFFIE_HELLMAN_EXPORT_FORMAT = "raw";
const HASH_ALGORITHM = "SHA-256";
const PUBLIC_KEY_EXPORT_FORMAT = "spki";
const SHARED_ENCRYPTION_ALGORITHM = "AES-GCM";
const SHARED_KEY_LENGTH = 256;
const USER_ENCRYPTION_ALGORITHM = "RSA-OAEP";
const USER_SIGNATURE_ALGORITHM = "RSASSA-PKCS1-v1_5";

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
 * @property {boolean} [allowInsecureNonLoopback=false] - Allows insecure HTTP and WebSocket URLs outside loopback for development.
 * @property {number} [maxEncodedMessageBytes=262144] - Maximum size of a received message. A larger one closes the connection.
 * @property {number} [maxProtocolSegments=16] - Maximum number of segments in a received message.
 * @property {number} [maxProtocolKeyBytes=64] - Maximum size of a segment key.
 * @property {number} [maxDecodedFieldBytes=196608] - Maximum decoded size of a segment.
 * @property {number} [maxTotalDecodedBytes=262144] - Maximum decoded size of all segments together.
 */

/**
 * @typedef {Object} RoomOptions
 *
 * @property {any|Function} [publicData] - Data sent to the other side of the handshake before it is encrypted, or a function that returns it. The relay can read it, so it must not contain secrets.
 * @property {Function} [verifyPublicData] - Called with `{ data, userId }` for the public data of the other side. Returning false kicks the joiner, or leaves the room.
 * @property {any|Function} [privateData] - Data sent to the other side once the code is verified, encrypted with the handshake key, or a function that returns it.
 * @property {Function} [verifyPrivateData] - Called with `{ data, userId }` for the private data of the other side. Returning false kicks the joiner, or leaves the room.
 * @property {number} [limit] - The maximum number of users in the room. Only used when creating a room.
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
export const createClientConnector = (options = {}) => {
	const {
		contentType = "application/json",
		deserializeMessage = JSON.parse,
		serializeMessage = JSON.stringify,

		createRoomEndpoint = "/create-room",
		joinRoomEndpoint = "/join-room",

		httpUrl = "http://localhost:3000",
		wsUrl = "http://localhost:3000",

		messageBufferMaxCount = 50,
		messageBufferMaxDuration = 60 * 1000,
		allowInsecureNonLoopback = false,
		maxEncodedMessageBytes = 256 * 1024,
		maxProtocolSegments = 16,
		maxProtocolKeyBytes = 64,
		maxDecodedFieldBytes = 192 * 1024,
		maxTotalDecodedBytes = 256 * 1024,
	} = options;
	for (const [name, value] of [
		["maxEncodedMessageBytes", maxEncodedMessageBytes],
		["maxProtocolSegments", maxProtocolSegments],
		["maxProtocolKeyBytes", maxProtocolKeyBytes],
		["maxDecodedFieldBytes", maxDecodedFieldBytes],
		["maxTotalDecodedBytes", maxTotalDecodedBytes],
	]) {
		if (!Number.isInteger(value) || value <= 0) {
			throw new TypeError(`${name} must be a positive integer`);
		}
	}
	const allowedProtocolKeys = new Set([
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
		USER_ENCRYPTION_SIGNATURE,
	]);
	const isLoopback = (hostname) =>
		hostname === "localhost" ||
		hostname === "::1" ||
		hostname === "[::1]" ||
		/^127(?:\.\d{1,3}){3}$/.test(hostname);
	for (const configuredUrl of [httpUrl, wsUrl]) {
		const url = new URL(configuredUrl);
		if (
			(url.protocol === "http:" || url.protocol === "ws:") &&
			!isLoopback(url.hostname) &&
			!allowInsecureNonLoopback
		) {
			throw new TypeError(
				"Insecure non-loopback URLs require allowInsecureNonLoopback",
			);
		}
	}

	let _connectionState = CONNECTION_DISCONNECTED,
		_creatorId,
		_keyGenerationPromise,
		_myEncryptKeys,
		_myExchangeKeys,
		_myId,
		_myNonce,
		_myPublicKeys,
		_mySignKeys,
		_privateData,
		_privateDataVerify,
		_publicData,
		_publicDataVerify,
		_roomCode,
		_sharedKey,
		_socket;
	const _sharedMessagesBuffer = [];
	/**
	 * The handshake with, and the keys of, each user this user exchanged keys with: its commitment, its imported public keys, the handshake key, the hash the verification code is made from, and whether it was verified.
	 *
	 * @type {Map<string, Object<string, any>>}
	 */
	const _users = new Map();
	/**
	 * Generates the cryptographic keys of the user in a worker if they are not generated or being generated already, so generating them doesn't block rendering. The private keys can not be extracted.
	 *
	 * @returns {Promise<void>} A promise that resolves when the keys are generated.
	 */
	const _generateMyKeys = () => {
		if (!_keyGenerationPromise) {
			_keyGenerationPromise = new Promise((resolve, reject) => {
				const worker = new Worker(
					URL.createObjectURL(
						new Blob([USER_KEY_GENERATOR], {
							type: "text/javascript",
						}),
					),
				);
				worker.addEventListener("message", (event) => {
					worker.terminate();
					if (!event.data.success) {
						reject(new Error(event.data.error));
						return;
					}
					_myEncryptKeys = event.data.encryptKeys;
					_mySignKeys = event.data.signKeys;
					_myExchangeKeys = event.data.exchangeKeys;
					_myPublicKeys = {
						publicEncryptKey: bufferToBase64(event.data.publicEncryptKey),
						publicExchangeKey: bufferToBase64(event.data.publicExchangeKey),
						publicSignKey: bufferToBase64(event.data.publicSignKey),
					};
					resolve();
				});
				worker.addEventListener("error", (event) => {
					worker.terminate();
					reject(event.error || new Error("key_generation_failed"));
				});
				worker.postMessage(null);
			}).catch((error) => {
				// Allow the next call to try again.
				_keyGenerationPromise = null;
				onError.dispatch({
					error,
				});
			});
		}
		return _keyGenerationPromise;
	};
	// Start generating new keys.
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

	/**
	 * Sets the current connection state and dispatches a connection event if the state has changed.
	 *
	 * @param {number} state - The new connection state.
	 */
	const _setConnectionState = (state) => {
		if (_connectionState !== state) {
			_connectionState = state;
			onConnection.dispatch({
				state,
			});
		}
	};

	/**
	 * Imports the public keys of the other user, and derives the handshake key and the verification code from the ECDH secret and the transcript: the protocol version, the room code, both user IDs, and every public key either side received. If the relay replaced any of the keys, the two sides get different codes, and can not decrypt each other's handshake messages.
	 *
	 * @param {string} userId - The ID of the other user.
	 * @param {Object<string, string>} creatorKeys - The public keys of the creator, in base64.
	 * @param {Object<string, string>} joinerKeys - The public keys of the joiner, in base64.
	 */
	const _deriveHandshake = async (userId, creatorKeys, joinerKeys) => {
		const user = _users.get(userId);
		const keys = _myId === _creatorId ? joinerKeys : creatorKeys;
		user.encryptKey = await crypto.subtle.importKey(
			PUBLIC_KEY_EXPORT_FORMAT,
			base64ToBuffer(keys.publicEncryptKey),
			{
				hash: HASH_ALGORITHM,
				name: USER_ENCRYPTION_ALGORITHM,
			},
			false,
			["encrypt"],
		);
		user.signKey = await crypto.subtle.importKey(
			PUBLIC_KEY_EXPORT_FORMAT,
			base64ToBuffer(keys.publicSignKey),
			{
				hash: HASH_ALGORITHM,
				name: USER_SIGNATURE_ALGORITHM,
			},
			false,
			["verify"],
		);
		const secret = await crypto.subtle.deriveBits(
			{
				name: DIFFIE_HELLMAN_ALGORITHM,
				public: await crypto.subtle.importKey(
					DIFFIE_HELLMAN_EXPORT_FORMAT,
					base64ToBuffer(keys.publicExchangeKey),
					{
						name: DIFFIE_HELLMAN_ALGORITHM,
						namedCurve: DIFFIE_HELLMAN_CURVE,
					},
					false,
					[],
				),
			},
			_myExchangeKeys.privateKey,
			SHARED_KEY_LENGTH,
		);

		// Base64 never contains the separator, so the transcript is unambiguous.
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
			joinerKeys.publicExchangeKey,
		].join("|");
		user.code = new Uint8Array(
			await crypto.subtle.digest(
				HASH_ALGORITHM,
				new TextEncoder().encode(`${transcript}|${bufferToBase64(secret)}`),
			),
		);
		user.handshakeKey = await crypto.subtle.deriveKey(
			{
				hash: HASH_ALGORITHM,
				info: await crypto.subtle.digest(
					HASH_ALGORITHM,
					new TextEncoder().encode(transcript),
				),
				name: "HKDF",
				salt: new Uint8Array(),
			},
			await crypto.subtle.importKey("raw", secret, "HKDF", false, [
				"deriveKey",
			]),
			{
				length: SHARED_KEY_LENGTH,
				name: SHARED_ENCRYPTION_ALGORITHM,
			},
			false,
			["encrypt", "decrypt"],
		);

		onUserVerificationCode.dispatch({
			userId,
			code: getVerificationCode(userId),
		});
	};

	/**
	 * Closes the current socket connection and resets the state of the room. Dispatches the room leave event first.
	 *
	 * @param {CloseEvent} [event] - The close event, if the connection was closed by the other end.
	 */
	const leaveRoom = (event) => {
		if (
			_connectionState === CONNECTION_DISCONNECTED ||
			_connectionState === CONNECTION_DISCONNECTING
		) {
			return;
		}
		onRoomLeave.dispatch({
			event,
		});
		_setConnectionState(CONNECTION_DISCONNECTING);

		if (_socket) {
			_socket.close();
		}

		_creatorId =
			_keyGenerationPromise =
			_myId =
			_myEncryptKeys =
			_myExchangeKeys =
			_myNonce =
			_myPublicKeys =
			_mySignKeys =
			_privateData =
			_privateDataVerify =
			_publicData =
			_publicDataVerify =
			_sharedKey =
			_socket =
				null;
		_sharedMessagesBuffer.length = 0;
		_users.clear();

		// Setup new keys right away.
		_generateMyKeys();

		_setConnectionState(CONNECTION_DISCONNECTED);
	};
	/**
	 * Sends a message to kick the specified user from the room. Only allowed by the room creator.
	 *
	 * @param {string} userId - The ID of the user to kick.
	 * @returns {boolean} True if the message was sent successfully, false otherwise.
	 */
	const kickUser = (userId) =>
		messageServer({
			type: USER_KICK,
			userId,
		});

	/**
	 * Joins a WebSocket room with the specified room code. Establishes a WebSocket connection to the server, and sends the creator token as the first message if one is given. Sets up event listeners for 'close', 'error', and 'message' events to handle room leave, errors, and incoming messages.
	 *
	 * @param {string} roomCode - The code of the room to join.
	 * @param {string|null} [creatorConnectionToken=null] - Optional single-use token for authenticating the creator connection.
	 */
	const _joinRoom = (roomCode, creatorConnectionToken = null) => {
		_setConnectionState(CONNECTION_CONNECTING);

		_roomCode = roomCode;

		const url = new URL(wsUrl + joinRoomEndpoint);
		url.searchParams.append("code", _roomCode);
		if (creatorConnectionToken) {
			url.searchParams.append("creator", "1");
		}

		// Keep the socket of this connection, so its events don't affect a later one.
		const socket = new WebSocket(url.toString());
		_socket = socket;
		if (creatorConnectionToken) {
			socket.addEventListener("open", () => {
				socket.send(
					encode(
						{ [CREATOR_AUTHENTICATION]: creatorConnectionToken },
						stringToBase64,
					),
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
				event,
			});
		});

		// Handle the messages one at a time, in the order they arrived.
		let queue = Promise.resolve();
		socket.addEventListener("message", (event) => {
			queue = queue.then(async () => {
				if (socket !== _socket) {
					return;
				}
				let parts;
				try {
					if (
						typeof event.data !== "string" ||
						new TextEncoder().encode(event.data).byteLength >
							maxEncodedMessageBytes
					) {
						throw new RangeError("message_too_large");
					}
					parts = decode(event.data, base64ToString, {
						allowedKeys: allowedProtocolKeys,
						maxDecodedFieldBytes,
						maxKeyBytes: maxProtocolKeyBytes,
						maxSegments: maxProtocolSegments,
						maxTotalDecodedBytes,
					});
					await _processMessage(parts);
				} catch (error) {
					onError.dispatch({ error });
					// Only close the connection when the message is too large or fails to decode, or when its sender doesn't match the one the server relayed it from. Drop the message on any other error. Clients can't use 1008, so use the matching code in the range for applications.
					if (!parts || error.message === "authenticated_sender_mismatch") {
						socket.close(4008, "invalid_protocol_message");
					}
				}
			});
		});
	};

	/**
	 * Processes an incoming message, decrypts it if necessary, and handles the message based on its type. Each type is only accepted on the channel it belongs to: lifecycle messages from the server, the first handshake messages unencrypted, the later handshake messages encrypted with the handshake key, and application messages encrypted with the shared key or the keys of the sender.
	 *
	 * @param {Object<string, any>} parts - The parsed message parts.
	 */
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
			[USER_ENCRYPTION_SIGNATURE]: userEncryptionSignature,
		} = parts;

		let data;
		if (!serverPayload && !authenticatedSender) {
			throw new TypeError("missing_authenticated_sender");
		}
		// Messages encrypted with the handshake key carry no encrypted key.
		const isHandshake = userEncryptionPayload && !userEncryptionKey;
		if (sharedEncryptionPayload) {
			if (!_sharedKey) {
				// Can't decrypt without the key, store the messages for later.
				_sharedMessagesBuffer.push({
					time: Date.now(),
					parts,
				});

				// Remove oldest message if buffer is full.
				if (_sharedMessagesBuffer.length > messageBufferMaxCount) {
					_sharedMessagesBuffer.shift();
				}
				return;
			}
			data = await crypto.subtle.decrypt(
				{
					iv: base64ToBuffer(sharedEncryptionIv),
					name: SHARED_ENCRYPTION_ALGORITHM,
				},
				_sharedKey,
				base64ToBuffer(sharedEncryptionPayload),
			);
			data = new TextDecoder().decode(data);
		} else if (userEncryptionPayload) {
			const user = _users.get(authenticatedSender);
			if (!(isHandshake ? user?.handshakeKey : user?.signKey)) {
				onError.dispatch({
					error: new Error(
						`No keys to decrypt message from ${authenticatedSender}`,
					),
				});
				return;
			}

			const encryptedPayload = base64ToBuffer(userEncryptionPayload);
			if (
				!isHandshake &&
				!(await crypto.subtle.verify(
					USER_SIGNATURE_ALGORITHM,
					user.signKey,
					base64ToBuffer(userEncryptionSignature),
					encryptedPayload,
				))
			) {
				onError.dispatch({
					error: new Error(`Invalid signature from ${authenticatedSender}`),
				});
				return;
			}

			data = new TextDecoder().decode(
				await crypto.subtle.decrypt(
					{
						iv: base64ToBuffer(userEncryptionIv),
						name: SHARED_ENCRYPTION_ALGORITHM,
					},
					isHandshake
						? user.handshakeKey
						: await crypto.subtle.importKey(
								"raw",
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
								false,
								["decrypt"],
							),
					encryptedPayload,
				),
			);
		} else {
			data = serverPayload || userDirectPayload;
		}

		try {
			data = deserializeMessage(data);
		} catch (_error) {
			onError.dispatch({
				error: new Error("Failed to parse message"),
			});
			return;
		}
		if (!serverPayload && data?.sender !== authenticatedSender) {
			throw new TypeError("authenticated_sender_mismatch");
		}
		const sender = data?.sender;

		// Only the server sends lifecycle messages, and it only sends those.
		if (
			!serverPayload !==
			(data?.type !== ROOM_JOINED &&
				data?.type !== USER_JOINED &&
				data?.type !== USER_LEFT &&
				data?.type !== USER_VERIFIED)
		) {
			onError.dispatch({
				error: new Error("Message on the wrong channel"),
			});
			return;
		}

		switch (data?.type) {
			case ROOM_JOINED:
				if (data.protocolVersion !== PROTOCOL_VERSION) {
					onError.dispatch({
						error: new Error("unsupported_protocol_version"),
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
					users: data.users,
				});

				if (_myId === _creatorId) {
					_setConnectionState(CONNECTION_CONNECTED);
				} else {
					_setConnectionState(CONNECTION_PENDING_VERIFICATION);

					await _generateMyKeys();

					// Commit to the keys before seeing the keys of the creator, so a relay can not try key pairs until both codes match.
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
											_myNonce,
										].join("|"),
									),
								),
							),
							publicData:
								typeof _publicData === "function" ? _publicData() : _publicData,
						},
						{
							receiver: _creatorId,
							unencrypted: true,
						},
					);
				}
				break;

			case EXCHANGE_0:
				// The creator accepts one commitment from each joiner.
				if (userDirectPayload && _myId === _creatorId && !_users.has(sender)) {
					if (
						_publicDataVerify &&
						!_publicDataVerify({
							data: data.publicData,
							userId: sender,
						})
					) {
						kickUser(sender);
						return;
					}
					_users.set(sender, {
						commitment: data.commitment,
					});

					await _generateMyKeys();
					await _message(
						{
							type: EXCHANGE_1,
							..._myPublicKeys,
							publicData:
								typeof _publicData === "function" ? _publicData() : _publicData,
						},
						{
							receiver: sender,
							unencrypted: true,
						},
					);
				}
				break;

			case EXCHANGE_1:
				// The joiner accepts the keys of the creator once.
				if (
					userDirectPayload &&
					sender === _creatorId &&
					_myId !== _creatorId &&
					!_users.has(sender)
				) {
					if (
						_publicDataVerify &&
						!_publicDataVerify({
							data: data.publicData,
							userId: _creatorId,
						})
					) {
						leaveRoom();
						return;
					}
					_users.set(sender, {});

					await _deriveHandshake(sender, data, _myPublicKeys);
					await _message(
						{
							type: EXCHANGE_REVEAL,
							..._myPublicKeys,
							nonce: _myNonce,
						},
						{
							receiver: sender,
							unencrypted: true,
						},
					);
				}
				break;

			case EXCHANGE_REVEAL: {
				// The creator accepts the keys of a joiner once, if they match its commitment.
				const user = _users.get(sender);
				if (userDirectPayload && _myId === _creatorId && user?.commitment) {
					const { commitment } = user;
					user.commitment = null;
					if (
						bufferToBase64(
							await crypto.subtle.digest(
								HASH_ALGORITHM,
								new TextEncoder().encode(
									[
										data.publicEncryptKey,
										data.publicSignKey,
										data.publicExchangeKey,
										data.nonce,
									].join("|"),
								),
							),
						) !== commitment
					) {
						onError.dispatch({
							error: new Error(`Keys do not match the commitment of ${sender}`),
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
					if (
						_privateDataVerify &&
						!_privateDataVerify({
							data: data.privateData,
							userId: _creatorId,
						})
					) {
						leaveRoom();
						return;
					}

					await _message(
						{
							type: EXCHANGE_3,
							privateData:
								typeof _privateData === "function"
									? _privateData()
									: _privateData,
						},
						{
							handshake: true,
							receiver: _creatorId,
						},
					);
				}
				break;

			case EXCHANGE_3:
				if (isHandshake && _myId === _creatorId) {
					if (!_users.get(sender)?.verified) {
						onError.dispatch({
							error: new Error("User not verified"),
						});
						kickUser(sender);
						return;
					}

					if (
						_privateDataVerify &&
						!_privateDataVerify({
							data: data.privateData,
							userId: sender,
						})
					) {
						kickUser(sender);
						return;
					}

					// Hand over the room key before the server lets the user receive room messages, and let the listeners know once it does.
					await _message(
						{
							type: EXCHANGE_4,
							sharedKey: bufferToBase64(
								await crypto.subtle.exportKey("raw", _sharedKey),
							),
						},
						{
							handshake: true,
							receiver: sender,
						},
					);
					await messageServer({
						type: USER_VERIFIED,
						userId: sender,
					});
					onUserVerified.dispatch({
						userId: sender,
					});
				}
				break;

			case EXCHANGE_4:
				if (isHandshake && sender === _creatorId && !_sharedKey) {
					_sharedKey = await crypto.subtle.importKey(
						"raw",
						base64ToBuffer(data.sharedKey),
						{
							name: SHARED_ENCRYPTION_ALGORITHM,
						},
						false,
						["encrypt", "decrypt"],
					);

					onUserVerified.dispatch({
						userId: _myId,
					});

					// Replay the stored messages that aren't too old to catch up.
					while (_sharedMessagesBuffer.length > 0) {
						const { parts, time } = _sharedMessagesBuffer.shift();
						if (Date.now() - time < messageBufferMaxDuration) {
							await _processMessage(parts);
						}
					}

					_setConnectionState(CONNECTION_CONNECTED);
				}
				break;

			case USER_LEFT:
				onUserLeave.dispatch({
					userId: data.userId,
				});
				_users.delete(data.userId);
				break;

			case USER_JOINED:
				onUserJoin.dispatch({
					userId: data.userId,
				});
				break;

			case USER_VERIFIED:
				onUserVerified.dispatch({
					userId: data.userId,
				});
				break;

			default:
				// Application messages are encrypted with the shared key, or with the keys of a verified sender.
				if (
					!sharedEncryptionPayload &&
					!(
						userEncryptionKey &&
						(_myId !== _creatorId || _users.get(sender)?.verified)
					)
				) {
					onError.dispatch({
						error: new Error("Message was not encrypted"),
					});
					return;
				}

				onMessage.dispatch({
					data,
					time: calculateTime(serverTime, data?.senderTime),
				});
				break;
		}
	};

	/**
	 * Sends a message to the server, a specific user, or the room, encrypting the message if necessary.
	 *
	 * @param {Object<string, any>} data - The message data to send.
	 * @param {Object<string, any>} [options={}] - Options for the message: the receiver, and whether to send it to the server, unencrypted, or encrypted with the handshake key.
	 * @returns {Promise<boolean>} True if the message was sent successfully, false otherwise.
	 */
	const _message = async (data, options = {}) => {
		if (!_socket || _socket.readyState !== WebSocket.OPEN) {
			onError.dispatch({
				error: new Error("No open socket"),
			});
			return false;
		}

		const message = serializeMessage({
			...data,
			sender: _myId,
			senderTime: Date.now(),
		});
		const parts = {};

		const receiver = options.receiver;
		if (receiver) {
			const user = _users.get(receiver);
			if (options.unencrypted) {
				parts[USER_DIRECT_PAYLOAD] = message;
			} else if (options.handshake ? user?.handshakeKey : user?.encryptKey) {
				const iv = crypto.getRandomValues(new Uint8Array(12));
				let key = user.handshakeKey;
				if (!options.handshake) {
					// Create a temporary symmetric encryption key that is only used once since asymmetric encryption is slower.
					key = await crypto.subtle.generateKey(
						{
							length: SHARED_KEY_LENGTH,
							name: SHARED_ENCRYPTION_ALGORITHM,
						},
						true,
						["encrypt"],
					);
					parts[USER_ENCRYPTION_KEY] = bufferToBase64(
						await crypto.subtle.encrypt(
							{
								name: USER_ENCRYPTION_ALGORITHM,
							},
							user.encryptKey,
							await crypto.subtle.exportKey("raw", key),
						),
					);
				}
				const encryptedPayload = await crypto.subtle.encrypt(
					{
						iv,
						name: SHARED_ENCRYPTION_ALGORITHM,
					},
					key,
					new TextEncoder().encode(message),
				);

				parts[USER_ENCRYPTION_IV] = bufferToBase64(iv);
				parts[USER_ENCRYPTION_PAYLOAD] = bufferToBase64(encryptedPayload);
				if (!options.handshake) {
					parts[USER_ENCRYPTION_SIGNATURE] = bufferToBase64(
						await crypto.subtle.sign(
							USER_SIGNATURE_ALGORITHM,
							_mySignKeys.privateKey,
							encryptedPayload,
						),
					);
				}
			} else {
				onError.dispatch({
					error: new Error(`No public key for ${receiver}`),
				});
				return false;
			}

			parts[USER] = receiver;
		} else if (options.server) {
			parts[SERVER_PAYLOAD] = message;
		} else if (_sharedKey) {
			const iv = crypto.getRandomValues(new Uint8Array(12));

			parts[SHARED_ENCRYPTION_IV] = bufferToBase64(iv);
			parts[SHARED_ENCRYPTION_PAYLOAD] = bufferToBase64(
				await crypto.subtle.encrypt(
					{
						iv,
						name: SHARED_ENCRYPTION_ALGORITHM,
					},
					_sharedKey,
					new TextEncoder().encode(message),
				),
			);
		} else {
			onError.dispatch({
				error: new Error("Trying to send without valid destination"),
			});
			return false;
		}

		_socket.send(encode(parts, stringToBase64));
		return true;
	};

	/**
	 * Sends a message to the server if the current user is the room creator.
	 *
	 * @param {Object<string, any>} data - The message data to send.
	 * @returns {boolean} True if the message was sent successfully, false otherwise.
	 */
	const messageServer = (data) =>
		_myId &&
		_myId === _creatorId &&
		_message(data, {
			server: true,
		});
	/**
	 * Sends a message to a specific user.
	 *
	 * @param {Object<string, any>} data - The message data to send.
	 * @param {string} userId - The ID of the user to send the message to.
	 * @returns {boolean} True if the message was sent successfully, false otherwise.
	 */
	const messageUser = (data, userId) =>
		userId &&
		_message(data, {
			receiver: userId,
		});

	/**
	 * Generates the verification code of the specified user from the stored hash.
	 *
	 * @param {string} userId - The ID of the user.
	 * @returns {string|boolean} The verification code string or false if no hash is stored.
	 */
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

		closeRoom: () =>
			messageServer({
				type: ROOM_CLOSED,
			}),
		/**
		 * Creates a new room and joins it.
		 *
		 * @param {RoomOptions} [options={}] - Options for creating the room.
		 * @returns {Object<string, any>|undefined} Room creation data or undefined if failed.
		 */
		createRoom: async (options = {}) => {
			if (_connectionState !== CONNECTION_DISCONNECTED) {
				return;
			}
			_setConnectionState(CONNECTION_CONNECTING);

			({
				privateData: _privateData,
				publicData: _publicData,
				verifyPrivateData: _privateDataVerify,
				verifyPublicData: _publicDataVerify,
			} = options);

			let data;
			try {
				_sharedKey = await new Promise((resolve, reject) => {
					const worker = new Worker(
						URL.createObjectURL(
							new Blob([SHARED_KEY_GENERATOR], {
								type: "text/javascript",
							}),
						),
					);
					worker.addEventListener("message", (event) => {
						worker.terminate();
						if (event.data.success) {
							resolve(event.data.sharedKey);
						} else {
							reject(new Error(event.data.error));
						}
					});
					worker.addEventListener("error", (event) => {
						worker.terminate();
						reject(event.error || new Error("key_generation_failed"));
					});
					worker.postMessage(null);
				});

				const url = new URL(httpUrl + createRoomEndpoint);
				if (options.limit) {
					url.searchParams.append("limit", options.limit);
				}
				const response = await fetch(url.toString(), {
					method: "POST",
					headers: {
						Accept: contentType,
					},
				});
				if (!response.ok) {
					// Include the status, so rate limiting can be told apart from other failures.
					throw new Error(`room_creation_failed:${response.status}`);
				}
				data = deserializeMessage(await response.text());
			} catch (error) {
				_sharedKey = null;
				_setConnectionState(CONNECTION_DISCONNECTED);
				onError.dispatch({
					error,
				});
				return;
			}
			// Stop if the room was left while it was being created.
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
		joinRoom: (roomCode, options = {}) => {
			if (_connectionState !== CONNECTION_DISCONNECTED) {
				return;
			}
			({
				privateData: _privateData,
				publicData: _publicData,
				verifyPrivateData: _privateDataVerify,
				verifyPublicData: _publicDataVerify,
			} = options);
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
			// Compare the whole code, ignoring case and surrounding white space.
			if (
				_myId !== _creatorId ||
				typeof code !== "string" ||
				code.trim().toUpperCase() !== getVerificationCode(userId)
			) {
				return false;
			}
			_users.get(userId).verified = true;

			await _message(
				{
					type: EXCHANGE_2,
					privateData:
						typeof _privateData === "function" ? _privateData() : _privateData,
				},
				{
					handshake: true,
					receiver: userId,
				},
			);

			return true;
		},
	};
};
