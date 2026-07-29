import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { generateCode, IDENTIFIABLE_CHARACTERS } from "../utilities/code.js";
import {
	base64ToString,
	stringToBase64,
} from "../utilities/encoding-server.js";
import { createEvent } from "../utilities/event.js";
import { decode, encode } from "../utilities/protocol.js";
import {
	ERROR,
	PROTOCOL_VERSION,
	ROOM_CLOSED,
	ROOM_JOINED,
	ROOM_REMOVED,
	USER_JOINED,
	USER_KICK,
	USER_LEFT,
	USER_VERIFIED,
} from "./message-types.js";
import {
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
 * @property {number} [maxRooms=1000] - Maximum number of active rooms.
 * @property {number} [creatorJoinTimeout=30000] - Time before an unclaimed room expires. Zero disables it.
 * @property {number} [roomIdleTimeout=1800000] - Time before an inactive room expires. Zero disables it.
 * @property {number} [roomCreationsPerAddress=10] - Room creation attempts allowed per address each minute.
 * @property {number} [roomCreationsGlobal=100] - Room creation attempts allowed globally each minute.
 * @property {Function} [getRemoteAddress] - Resolves a request's remote address without trusting forwarding headers.
 * @property {Function} [authorizeRoomCreation] - Synchronously authorizes room creation.
 * @property {Function} [validateOrigin] - Validates WebSocket request origins. Defaults to the configured server origin.
 * @property {string[]} [allowedWebSocketProtocols] - Allowed WebSocket subprotocols.
 * @property {number} [maxPendingUsersPerRoom=8] - Maximum reserved and unverified users per room.
 * @property {number} [handshakeTimeout=30000] - Time before an unverified user is removed. Zero disables it.
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
export const createServerConnector = (options = {}) => {
	const {
		contentType = "application/json",
		deserializeMessage = JSON.parse,
		serializeMessage = JSON.stringify,

		createRoomEndpoint = "/create-room",
		joinRoomEndpoint = "/join-room",
		serverOrigin = "http://localhost:3000",

		maxUsersPerRoom = 16,
		maxRooms = 1000,
		creatorJoinTimeout = 30 * 1000,
		roomIdleTimeout = 30 * 60 * 1000,
		roomCreationsPerAddress = 10,
		roomCreationsGlobal = 100,
		maxEncodedMessageBytes = 256 * 1024,
		maxProtocolSegments = 16,
		maxProtocolKeyBytes = 64,
		maxDecodedFieldBytes = 192 * 1024,
		maxTotalDecodedBytes = 256 * 1024,
		maxSocketBufferedAmount = 1024 * 1024,
		connectionMessages = 60,
		directMessages = 60,
		broadcastMessages = 60,
		serverMessages = 60,
		connectionMessageBytes = 1024 * 1024,
		connectionRateWindow = 10 * 1000,
		handshakeMessages = 10,
		getRemoteAddress = (request) => request.socket?.remoteAddress || "unknown",
		authorizeRoomCreation = () => true,
		validateOrigin = ({ origin }) => origin === new URL(serverOrigin).origin,
		allowedWebSocketProtocols = [],
		maxPendingUsersPerRoom = 8,
		handshakeTimeout = 30 * 1000,
	} = options;
	if (!Number.isInteger(maxUsersPerRoom) || maxUsersPerRoom <= 0) {
		throw new TypeError("maxUsersPerRoom must be a positive integer");
	}
	if (!Number.isInteger(maxRooms) || maxRooms <= 0) {
		throw new TypeError("maxRooms must be a positive integer");
	}
	for (const [name, value] of [
		["creatorJoinTimeout", creatorJoinTimeout],
		["roomIdleTimeout", roomIdleTimeout],
		["handshakeTimeout", handshakeTimeout],
	]) {
		if (!Number.isInteger(value) || value < 0) {
			throw new TypeError(`${name} must be a non-negative integer`);
		}
	}
	for (const [name, value] of [
		["roomCreationsPerAddress", roomCreationsPerAddress],
		["roomCreationsGlobal", roomCreationsGlobal],
		["maxEncodedMessageBytes", maxEncodedMessageBytes],
		["maxProtocolSegments", maxProtocolSegments],
		["maxProtocolKeyBytes", maxProtocolKeyBytes],
		["maxDecodedFieldBytes", maxDecodedFieldBytes],
		["maxTotalDecodedBytes", maxTotalDecodedBytes],
		["maxSocketBufferedAmount", maxSocketBufferedAmount],
		["connectionMessages", connectionMessages],
		["directMessages", directMessages],
		["broadcastMessages", broadcastMessages],
		["serverMessages", serverMessages],
		["connectionMessageBytes", connectionMessageBytes],
		["connectionRateWindow", connectionRateWindow],
		["handshakeMessages", handshakeMessages],
		["maxPendingUsersPerRoom", maxPendingUsersPerRoom],
	]) {
		if (!Number.isInteger(value) || value <= 0) {
			throw new TypeError(`${name} must be a positive integer`);
		}
	}
	if (typeof getRemoteAddress !== "function") {
		throw new TypeError("getRemoteAddress must be a function");
	}
	if (typeof authorizeRoomCreation !== "function") {
		throw new TypeError("authorizeRoomCreation must be a function");
	}
	if (typeof validateOrigin !== "function") {
		throw new TypeError("validateOrigin must be a function");
	}
	if (
		!Array.isArray(allowedWebSocketProtocols) ||
		allowedWebSocketProtocols.some((protocol) => typeof protocol !== "string")
	) {
		throw new TypeError(
			"allowedWebSocketProtocols must be an array of strings",
		);
	}

	const onRoomMessage = createEvent();
	const onRoomRemove = createEvent();
	const onUserJoin = createEvent();
	const onUserLeave = createEvent();

	/** @type {Map<string, { creatorId: string, creatorTokenDigest: Buffer | null, userLimit: number, users: Map<string, UserData> }>} */
	const _rooms = new Map();
	const allowedProtocolKeys = new Set([
		CREATOR_AUTHENTICATION,
		SERVER_PAYLOAD,
		SERVER_TIME,
		SHARED_ENCRYPTION_PAYLOAD,
		SHARED_ENCRYPTION_IV,
		USER,
		USER_DIRECT_PAYLOAD,
		USER_ENCRYPTION_IV,
		USER_ENCRYPTION_KEY,
		USER_ENCRYPTION_PAYLOAD,
		USER_ENCRYPTION_SIGNATURE,
	]);
	const getMonotonicTime = () => globalThis.performance?.now?.() ?? Date.now();
	const createBucket = (capacity, window) => ({
		capacity,
		lastRefill: getMonotonicTime(),
		tokens: capacity,
		window,
	});
	const consumeConnectionToken = (bucket, cost = 1) => {
		const now = getMonotonicTime();
		bucket.tokens = Math.min(
			bucket.capacity,
			bucket.tokens +
				((now - bucket.lastRefill) * bucket.capacity) / bucket.window,
		);
		bucket.lastRefill = now;
		if (bucket.tokens < cost) {
			return false;
		}
		bucket.tokens -= cost;
		return true;
	};
	const closeConnection = (connection, reason) => {
		try {
			connection.close(1008, reason);
		} catch {}
	};
	const sendConnection = (connection, message) => {
		if (
			connection.readyState !== connection.OPEN ||
			connection.bufferedAmount > maxSocketBufferedAmount
		) {
			closeConnection(connection, "slow_consumer");
			return false;
		}
		try {
			connection.send(message);
			return true;
		} catch {
			closeConnection(connection, "send_failed");
			return false;
		}
	};
	const digestToken = (token) => createHash("sha256").update(token).digest();
	const hasExactKeys = (record, keys) => {
		const recordKeys = Object.keys(record);
		return (
			recordKeys.length === keys.length &&
			keys.every((key) => Object.hasOwn(record, key))
		);
	};
	const validateServerPayload = (payload) => {
		const parsedData = deserializeMessage(payload);
		if (
			!parsedData ||
			typeof parsedData !== "object" ||
			typeof parsedData.sender !== "string" ||
			typeof parsedData.senderTime !== "number" ||
			!Number.isFinite(parsedData.senderTime)
		) {
			throw new TypeError("invalid_server_payload");
		}
		if (
			parsedData.type === ROOM_CLOSED &&
			hasExactKeys(parsedData, ["sender", "senderTime", "type"])
		) {
			return parsedData;
		}
		if (
			(parsedData.type === USER_KICK || parsedData.type === USER_VERIFIED) &&
			hasExactKeys(parsedData, ["sender", "senderTime", "type", "userId"]) &&
			typeof parsedData.userId === "string"
		) {
			return parsedData;
		}
		throw new TypeError("invalid_server_payload");
	};
	const _creationBuckets = new Map();
	const _globalCreationBucket = {
		lastRefill: Date.now(),
		tokens: roomCreationsGlobal,
	};
	const consumeToken = (bucket, capacity) => {
		const now = Date.now();
		bucket.tokens = Math.min(
			capacity,
			bucket.tokens + ((now - bucket.lastRefill) * capacity) / 60000,
		);
		bucket.lastRefill = now;
		if (bucket.tokens < 1) {
			return false;
		}
		bucket.tokens--;
		return true;
	};
	const consumeCreationTokens = (remoteAddress) => {
		let addressBucket = _creationBuckets.get(remoteAddress);
		if (!addressBucket) {
			addressBucket = {
				lastRefill: Date.now(),
				tokens: roomCreationsPerAddress,
			};
			_creationBuckets.set(remoteAddress, addressBucket);
		}
		if (addressBucket.cleanupTimer) {
			clearTimeout(addressBucket.cleanupTimer);
		}
		addressBucket.cleanupTimer = setTimeout(() => {
			if (_creationBuckets.get(remoteAddress) === addressBucket) {
				_creationBuckets.delete(remoteAddress);
			}
		}, 60000);
		addressBucket.cleanupTimer.unref?.();
		const addressAllowed = consumeToken(addressBucket, roomCreationsPerAddress);
		const globalAllowed = consumeToken(
			_globalCreationBucket,
			roomCreationsGlobal,
		);
		return addressAllowed && globalAllowed;
	};
	const clearRoomTimers = (room) => {
		if (room.creatorJoinTimer) {
			clearTimeout(room.creatorJoinTimer);
		}
		if (room.idleTimer) {
			clearTimeout(room.idleTimer);
		}
		room.creatorJoinTimer = null;
		room.idleTimer = null;
	};
	const clearUserTimer = (userData) => {
		if (userData?.handshakeTimer) {
			clearTimeout(userData.handshakeTimer);
			userData.handshakeTimer = null;
		}
	};
	const refreshRoomIdleTimer = (roomCode) => {
		const room = _rooms.get(roomCode);
		if (!room || roomIdleTimeout === 0) {
			return;
		}
		if (room.idleTimer) {
			clearTimeout(room.idleTimer);
		}
		room.idleTimer = setTimeout(() => removeRoom(roomCode), roomIdleTimeout);
	};

	/**
	 * Creates a new room with a unique code and initializes its properties.
	 *
	 * @param {Object} [options={}] - Optional settings for the room.
	 * @param {number} [options.limit] - Maximum number of users allowed in the room.
	 * @returns {Object} An object containing the creatorConnectionToken, roomCode, and userId.
	 * @returns {string} return.creatorConnectionToken - Single-use token for authenticating the creator connection.
	 * @returns {string} return.roomCode - Unique code identifying the room.
	 * @returns {string} return.userId - Unique identifier for the creator user.
	 */
	const createRoom = (options = {}) => {
		if (_rooms.size >= maxRooms) {
			throw new Error("Maximum room count reached");
		}
		let userLimit = maxUsersPerRoom;
		if (options.limit !== undefined) {
			if (!Number.isInteger(options.limit) || options.limit <= 0) {
				throw new TypeError("Room limit must be a positive integer");
			}
			userLimit = Math.min(options.limit, maxUsersPerRoom);
		}

		let roomCode = generateCode(6, IDENTIFIABLE_CHARACTERS);
		while (_rooms.has(roomCode)) {
			roomCode = generateCode(6, IDENTIFIABLE_CHARACTERS);
		}

		const users = new Map();

		const userId = randomUUID();
		users.set(userId, {
			connection: null,
			verified: false,
		});

		const creatorConnectionToken = randomUUID();

		const room = {
			creatorId: userId,
			creatorTokenDigest: digestToken(creatorConnectionToken),
			creatorJoinTimer: null,
			idleTimer: null,
			userLimit,
			users: users,
		};
		_rooms.set(roomCode, room);
		if (creatorJoinTimeout > 0) {
			room.creatorJoinTimer = setTimeout(
				() => removeRoom(roomCode),
				creatorJoinTimeout,
			);
		}
		refreshRoomIdleTimer(roomCode);

		return {
			creatorConnectionToken,
			roomCode,
			userId,
		};
	};

	/**
	 * Attempts to join a user to a room.
	 *
	 * @param {string} roomCode - The unique code identifying the room to join.
	 * @param {WebSocket} connection - The WebSocket connection for the user.
	 * @param {boolean} [creatorConnection=false] - Whether this is the reserved creator connection.
	 * @param {Function|null} [onAuthenticated=null] - Called after creator authentication or an ordinary join.
	 * @returns {[boolean, Object]} An array where the first element is a boolean indicating success, and the second element is an object containing either error details or the userId.
	 */
	const joinRoom = (
		roomCode,
		connection,
		creatorConnection = false,
		onAuthenticated = null,
	) => {
		const _room = _rooms.get(roomCode);
		if (!_room) {
			return [
				false,
				{
					type: ERROR,
					reason: "room_not_found",
				},
			];
		}

		const _isCreator = creatorConnection;
		let pendingUsers = 0;
		for (const userData of _room.users.values()) {
			if (!userData.verified) {
				pendingUsers++;
			}
		}
		if (!_isCreator && pendingUsers >= maxPendingUsersPerRoom) {
			return [
				false,
				{
					type: ERROR,
					reason: "too_many_pending_users",
				},
			];
		}
		if (!_isCreator && _room.users.size >= _room.userLimit) {
			return [
				false,
				{
					type: ERROR,
					reason: "room_full",
				},
			];
		}

		// Prevent re-use of the creator secret.
		if (
			_isCreator &&
			(_room.users.get(_room.creatorId).connection ||
				_room.users.get(_room.creatorId).verified ||
				!_room.creatorTokenDigest)
		) {
			return [
				false,
				{
					type: ERROR,
					reason: "creator_already_joined",
				},
			];
		}

		let userId;
		if (_isCreator) {
			// Host joins own room update user data to add connection.
			userId = _room.creatorId;
		} else {
			userId = randomUUID();
			while (_room.users.has(userId)) {
				userId = randomUUID();
			}
		}

		const userData = {
			connection,
			byteBucket: createBucket(connectionMessageBytes, connectionRateWindow),
			broadcastBucket: createBucket(broadcastMessages, connectionRateWindow),
			directBucket: createBucket(directMessages, connectionRateWindow),
			handshakeBucket: createBucket(handshakeMessages, 60 * 1000),
			messageBucket: createBucket(connectionMessages, connectionRateWindow),
			serverBucket: createBucket(serverMessages, connectionRateWindow),
			handshakeTimer: null,
			phase: _isCreator ? "creator_authentication" : "pending",
			creator: _isCreator,
			onAuthenticated,
			verified: false,
		};
		_room.users.set(userId, userData);
		if (!_isCreator && handshakeTimeout > 0) {
			userData.handshakeTimer = setTimeout(
				() => leaveRoom(roomCode, userId),
				handshakeTimeout,
			);
		}
		if (!_isCreator) {
			refreshRoomIdleTimer(roomCode);
		}

		if (!_isCreator) {
			_broadcast(
				roomCode,
				userId,
				encode(
					{
						[SERVER_PAYLOAD]: serializeMessage({
							type: USER_JOINED,
							userId,
						}),
					},
					stringToBase64,
				),
			);
			onUserJoin.dispatch({
				roomCode,
				userId,
			});
			onAuthenticated?.();
		}

		connection.addEventListener("close", () => {
			leaveRoom(roomCode, userId);
		});
		connection.addEventListener("error", () => {
			leaveRoom(roomCode, userId);
		});

		connection.addEventListener("message", (event) => {
			try {
				const room = _rooms.get(roomCode);
				if (!room) {
					connection.close(1008, "room_not_found");
					return;
				}
				if (!room.users.has(userId)) {
					connection.close(1008, "user_not_found");
					return;
				}
				if (connection.readyState !== connection.OPEN) {
					connection.close(1008, "user_no_active_connection");
					return;
				}

				const encodedMessage =
					typeof event.data === "string" ? event.data : event.data.toString();
				const encodedBytes = Buffer.byteLength(encodedMessage, "utf8");
				if (encodedBytes > maxEncodedMessageBytes) {
					closeConnection(connection, "message_too_large");
					return;
				}
				if (
					!consumeConnectionToken(userData.messageBucket) ||
					!consumeConnectionToken(userData.byteBucket, encodedBytes)
				) {
					closeConnection(connection, "message_rate_limited");
					return;
				}
				if (
					!userData.verified &&
					!consumeConnectionToken(userData.handshakeBucket)
				) {
					closeConnection(connection, "handshake_rate_limited");
					return;
				}
				const parts = decode(encodedMessage, base64ToString, {
					allowedKeys: allowedProtocolKeys,
					maxDecodedFieldBytes,
					maxKeyBytes: maxProtocolKeyBytes,
					maxSegments: maxProtocolSegments,
					maxTotalDecodedBytes,
				});
				if (_isCreator && !userData.verified) {
					const token = parts[CREATOR_AUTHENTICATION];
					if (!token || Object.keys(parts).length !== 1) {
						closeConnection(connection, "creator_authentication_required");
						return;
					}
					const tokenDigest = digestToken(token);
					if (
						!room.creatorTokenDigest ||
						!timingSafeEqual(tokenDigest, room.creatorTokenDigest)
					) {
						closeConnection(connection, "creator_authentication_failed");
						return;
					}
					room.creatorTokenDigest = null;
					userData.verified = true;
					userData.phase = "verified";
					clearUserTimer(userData);
					if (room.creatorJoinTimer) {
						clearTimeout(room.creatorJoinTimer);
						room.creatorJoinTimer = null;
					}
					refreshRoomIdleTimer(roomCode);
					_broadcast(
						roomCode,
						userId,
						encode(
							{
								[SERVER_PAYLOAD]: serializeMessage({
									type: USER_JOINED,
									userId,
								}),
							},
							stringToBase64,
						),
					);
					onUserJoin.dispatch({ roomCode, userId });
					userData.onAuthenticated?.();
					return;
				}
				const {
					[SHARED_ENCRYPTION_IV]: sharedEncryptionIv,
					[SHARED_ENCRYPTION_PAYLOAD]: sharedEncryptionPayload,
					[SERVER_PAYLOAD]: serverPayload,
					[USER_DIRECT_PAYLOAD]: userDirectPayload,
					[USER_ENCRYPTION_IV]: userEncryptionIv,
					[USER_ENCRYPTION_KEY]: userEncryptionKey,
					[USER_ENCRYPTION_PAYLOAD]: userEncryptionPayload,
					[USER_ENCRYPTION_SIGNATURE]: userEncryptionSignature,
					[USER]: userPayload,
				} = parts;

				if (userPayload) {
					if (!consumeConnectionToken(userData.directBucket)) {
						closeConnection(connection, "direct_message_rate_limited");
						return;
					}
					const directKeys = [USER, USER_DIRECT_PAYLOAD];
					const encryptedKeys = [
						USER,
						USER_ENCRYPTION_IV,
						USER_ENCRYPTION_KEY,
						USER_ENCRYPTION_PAYLOAD,
						USER_ENCRYPTION_SIGNATURE,
					];
					if (
						typeof userPayload !== "string" ||
						(!userDirectPayload &&
							(!userEncryptionIv ||
								!userEncryptionKey ||
								!userEncryptionPayload ||
								!userEncryptionSignature)) ||
						(!hasExactKeys(parts, directKeys) &&
							!hasExactKeys(parts, encryptedKeys))
					) {
						throw new TypeError("invalid_direct_message");
					}
					refreshRoomIdleTimer(roomCode);
					messageUser(roomCode, userId, userPayload, encodedMessage);
					return;
				}

				if (sharedEncryptionPayload) {
					if (!consumeConnectionToken(userData.broadcastBucket)) {
						closeConnection(connection, "broadcast_message_rate_limited");
						return;
					}
					if (
						!userData.verified ||
						!sharedEncryptionIv ||
						!hasExactKeys(parts, [
							SHARED_ENCRYPTION_IV,
							SHARED_ENCRYPTION_PAYLOAD,
						])
					) {
						throw new TypeError("invalid_broadcast_message");
					}
					refreshRoomIdleTimer(roomCode);
					messageRoom(roomCode, userId, encodedMessage);
					return;
				}

				if (serverPayload) {
					if (!consumeConnectionToken(userData.serverBucket)) {
						closeConnection(connection, "server_message_rate_limited");
						return;
					}
					if (
						!_isCreator ||
						!userData.verified ||
						!hasExactKeys(parts, [SERVER_PAYLOAD])
					) {
						throw new TypeError("invalid_server_message");
					}
					const parsedData = validateServerPayload(serverPayload);

					switch (parsedData?.type) {
						case ROOM_CLOSED:
							refreshRoomIdleTimer(roomCode);
							removeRoom(roomCode);
							break;

						case USER_KICK:
							if (parsedData.userId && parsedData.userId !== userId) {
								refreshRoomIdleTimer(roomCode);
								leaveRoom(roomCode, parsedData.userId);
							}
							break;

						case USER_VERIFIED:
							if (parsedData.userId && room.users.has(parsedData.userId)) {
								refreshRoomIdleTimer(roomCode);
								_broadcast(
									roomCode,
									userId,
									encode(
										{
											[SERVER_PAYLOAD]: serializeMessage({
												type: USER_VERIFIED,
												userId: parsedData.userId,
											}),
										},
										stringToBase64,
									),
								);
								room.users.get(parsedData.userId).verified = true;
								room.users.get(parsedData.userId).phase = "verified";
								clearUserTimer(room.users.get(parsedData.userId));
							}
							break;
					}
					return;
				}
				throw new TypeError("unknown_protocol_message");
			} catch {
				closeConnection(connection, "invalid_protocol_message");
			}
		});

		return [
			true,
			{
				creatorId: _room.creatorId,
				userId,
				users: Array.from(_room.users.keys()),
			},
		];
	};

	/**
	 * Removes a user from a room and handles related cleanup.
	 */
	const leaveRoom = (roomCode, userId) => {
		const _room = _rooms.get(roomCode);
		if (!_room) {
			return [
				false,
				{
					type: ERROR,
					reason: "room_not_found",
				},
			];
		}

		if (!_room.users.has(userId)) {
			return [
				false,
				{
					type: ERROR,
					reason: "user_not_found",
				},
			];
		}
		if (_room.creatorId === userId) {
			return removeRoom(roomCode);
		}
		const { connection } = _room.users.get(userId);
		clearUserTimer(_room.users.get(userId));
		_room.users.delete(userId);
		_broadcast(
			roomCode,
			userId,
			encode(
				{
					[SERVER_PAYLOAD]: serializeMessage({
						type: USER_LEFT,
						userId,
					}),
				},
				stringToBase64,
			),
		);
		onUserLeave.dispatch({
			roomCode,
			userId,
		});
		connection?.close();

		if (_room.users.size === 0) {
			clearRoomTimers(_room);
			_rooms.delete(roomCode);
			onRoomRemove.dispatch({ roomCode });
		}
	};

	/**
	 * Removes a room and disconnects all users.
	 *
	 * @param {string} roomCode - The code of the room to remove.
	 * @returns {[boolean, Object]} Success status and result object.
	 */
	const removeRoom = (roomCode) => {
		const room = _rooms.get(roomCode);
		if (!room) {
			return [
				false,
				{
					type: ERROR,
					reason: "room_not_found",
				},
			];
		}

		clearRoomTimers(room);
		_rooms.delete(roomCode);
		for (const [userId, { connection }] of room.users) {
			clearUserTimer(room.users.get(userId));
			onUserLeave.dispatch({
				roomCode,
				userId,
			});
			if (connection && connection.readyState !== connection.CLOSED) {
				connection.close();
			}
		}
		room.users.clear();
		onRoomRemove.dispatch({ roomCode });

		return [
			true,
			{
				type: ROOM_REMOVED,
				code: roomCode,
			},
		];
	};

	/**
	 * Broadcasts a message to all users in a specified room, except the sender.
	 */
	const _broadcast = (roomCode, sender, payload) => {
		const _room = _rooms.get(roomCode);
		if (!_room) {
			return [
				false,
				{
					type: ERROR,
					reason: "room_not_found",
				},
			];
		}

		const message = `${SERVER_TIME}:${stringToBase64(String(Date.now()))}|${payload}`;

		for (const [userId, { connection, verified }] of _room.users) {
			if (!verified || (sender && sender === userId)) {
				continue;
			}

			sendConnection(connection, message);
		}
		return [true, {}];
	};

	/**
	 * Sends a message to all clients in the specified room.
	 */
	const messageRoom = (roomCode, sender, payload) => {
		const [_success, _result] = _broadcast(roomCode, sender, payload);
		if (_success) {
			onRoomMessage.dispatch({
				payload,
				roomCode,
				sender,
			});
		}
		return [_success, _result];
	};

	/**
	 * Sends a direct message to a user.
	 */
	const messageUser = (roomCode, _sender, receiver, data) => {
		const room = _rooms.get(roomCode);
		if (!room) {
			return [
				false,
				{
					type: ERROR,
					reason: "room_not_found",
				},
			];
		}

		if (!room.users.has(receiver)) {
			return [
				false,
				{
					type: ERROR,
					reason: "user_not_found",
				},
			];
		}
		const { connection } = room.users.get(receiver);

		if (!connection) {
			return [
				false,
				{
					type: ERROR,
					reason: "user_no_connection",
				},
			];
		}
		if (connection.readyState !== connection.OPEN) {
			return [
				false,
				{
					type: ERROR,
					reason: "user_no_active_connection",
				},
			];
		}

		sendConnection(
			connection,
			`${SERVER_TIME}:${stringToBase64(String(Date.now()))}|${data}`,
		);
		return [true, {}];
	};

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

		/**
		 * Handles HTTP requests for room creation.
		 *
		 * @param {Object} request - The HTTP request object.
		 * @param {Object} response - The HTTP response object.
		 * @returns {boolean} True if the request was handled.
		 */
		handleHttpRequest: (request, response) => {
			const { pathname = "", searchParams = {} } = new URL(
				request.url,
				serverOrigin,
			);

			if (pathname === createRoomEndpoint) {
				let remoteAddress;
				try {
					remoteAddress = String(getRemoteAddress(request));
				} catch {
					response.writeHead(500, { "Content-Type": contentType });
					response.end(
						serializeMessage({ error: "address_resolution_failed" }),
					);
					return true;
				}
				if (!consumeCreationTokens(remoteAddress)) {
					response.writeHead(429, {
						"Content-Type": contentType,
						"Retry-After": "60",
					});
					response.end(
						serializeMessage({ error: "room_creation_rate_limited" }),
					);
					return true;
				}
				try {
					if (!authorizeRoomCreation({ request, remoteAddress })) {
						response.writeHead(403, { "Content-Type": contentType });
						response.end(
							serializeMessage({ error: "room_creation_forbidden" }),
						);
						return true;
					}
				} catch {
					response.writeHead(500, { "Content-Type": contentType });
					response.end(
						serializeMessage({ error: "room_creation_authorization_failed" }),
					);
					return true;
				}
				if (request.method !== "POST") {
					response.writeHead(405, { Allow: "POST" });
					response.end();
					return true;
				}
				const limitValue = searchParams.get("limit");
				const limit = limitValue === null ? undefined : Number(limitValue);
				let room;
				try {
					room = createRoom({ limit });
				} catch (error) {
					response.writeHead(error instanceof TypeError ? 400 : 503, {
						"Content-Type": contentType,
					});
					response.end(
						serializeMessage({
							error:
								error instanceof TypeError ? "invalid_room_limit" : "max_rooms",
						}),
					);
					return true;
				}
				const { creatorConnectionToken, roomCode, userId } = room;

				response.writeHead(200, {
					"Content-Type": contentType,
				});
				response.end(
					serializeMessage({
						creatorConnectionToken,
						roomCode,
						userId,
					}),
				);
				return true;
			}

			return false;
		},

		/**
		 * Handles WebSocket upgrade requests for joining rooms.
		 *
		 * @param {Object} request - The upgrade request object.
		 * @param {Object} socket - The socket object.
		 * @param {Buffer} head - The head buffer.
		 * @param {Object} socketServer - The WebSocket server instance.
		 */
		handleSocketUpgrade: (request, socket, head, socketServer) => {
			const { pathname = "", searchParams = {} } = new URL(
				request.url,
				serverOrigin,
			);

			if (pathname === joinRoomEndpoint) {
				const rejectUpgrade = (reason) => {
					try {
						socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
					} finally {
						socket.destroy();
					}
					return { reason };
				};
				const origin = request.headers?.origin;
				try {
					if (!origin || !validateOrigin({ origin, request })) {
						rejectUpgrade("origin_rejected");
						return true;
					}
				} catch {
					rejectUpgrade("origin_validation_failed");
					return true;
				}
				if (allowedWebSocketProtocols.length > 0) {
					const requestedProtocols = String(
						request.headers?.["sec-websocket-protocol"] || "",
					)
						.split(",")
						.map((protocol) => protocol.trim())
						.filter(Boolean);
					const negotiatedProtocol = requestedProtocols.find((protocol) =>
						allowedWebSocketProtocols.includes(protocol),
					);
					if (!negotiatedProtocol) {
						rejectUpgrade("subprotocol_rejected");
						return true;
					}
					request.headers["sec-websocket-protocol"] = negotiatedProtocol;
				}
				socketServer.handleUpgrade(request, socket, head, (connection) => {
					const roomCode = searchParams.get("code");
					if (!roomCode) {
						connection.close(1008, "missing_room_code");
						return;
					}

					let data;
					const sendRoomJoined = () => {
						sendConnection(
							connection,
							encode(
								{
									[SERVER_PAYLOAD]: serializeMessage({
										type: ROOM_JOINED,
										protocolVersion: PROTOCOL_VERSION,
										creatorId: data.creatorId,
										userId: data.userId,
										users: data.users,
									}),
								},
								stringToBase64,
							),
						);
					};
					const [_success, joinedData] = joinRoom(
						roomCode,
						connection,
						searchParams.get("creator") === "1",
						searchParams.get("creator") === "1" ? sendRoomJoined : null,
					);
					data = joinedData;
					if (!_success) {
						connection.close(1008, data.reason);
						return;
					}
					if (searchParams.get("creator") !== "1") {
						sendRoomJoined();
					}
				});

				return true;
			}

			return false;
		},
	};
};
