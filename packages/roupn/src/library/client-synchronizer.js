import {
	applyDiff,
	cloneRecursive,
	determineDiff,
	revertDiff,
} from "@doars/tiedliene";
import { generateCode } from "../utilities/code.js";
import { createClientConnector } from "./client-connector.js";
import { STATE_SYNCH, STATE_UPDATE } from "./message-types.js";

/**
 * @typedef {import('../utilities/event.js').Event} Event
 */

/**
 * Options for creating a synchronizer.
 * @typedef {Object} createClientSynchronizerOptions
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
 * @property {any} [publicData={}] - Public data to be shared with other clients in the room.
 * @property {Function} [verifyPublicData] - Callback for verifying the public data of other users.
 * @property {any} [privateData={}] - Private data to be shared with other clients in the room.
 * @property {Function} [verifyPrivateData] - Callback for verifying the private data of other users.
 *
 * @property {number} [messageBufferMaxCount=50] - The maximum number of messages to store in the buffer.
 * @property {number} [messageBufferMaxDuration=60000] - The maximum duration in milliseconds to store a message in the buffer.
 *
 * @property {number} [windowPerUser=16] - Number of state updates to keep per joined user. Used in case of rollbacks.
 * @property {number} [synchronisationInterval=60000] - Interval in milliseconds for a full state synchronisation.
 * @property {number} [maxDiffChanges=1000] - Maximum changes accepted in one state update.
 * @property {number} [maxDiffPathDepth=32] - Maximum path depth accepted in a state update.
 * @property {number} [maxDiffValueBytes=196608] - Maximum serialized value size in a change.
 * @property {number} [maxSerializedStateBytes=1048576] - Maximum serialized synchronized state size.
 */

/**
 * The object returned by createClientSynchronizer.
 * @typedef {Object} Synchronizer
 *
 * @property {Event} onConnection - Event for connection state change notifications.
 * @property {Event} onError - Event for error handling.
 * @property {Event} onMessage - Event for receiving messages.
 * @property {Event} onRoomJoin - Event for room join notifications.
 * @property {Event} onRoomLeave - Event for room leave notifications.
 * @property {Event} onUserJoin - Event for user join notifications.
 * @property {Event} onUserLeave - Event for user leave notifications.
 * @property {Event} onUserVerified - Event for user verified notifications.
 * @property {Event} onUserVerificationCode - Event for verification code ready notifications.
 *
 * @property {Object} privateState - Internal state, including user and room information.
 * @property {Object} publicState - Shared state object synchronized across users.
 *
 * @property {Function} getConnectionState - Get the current connection state.
 *
 * @property {Function} closeRoom - Closes the room for all. Only allowed by the creator.
 * @property {Function} createRoom - Creates a new room and joins it.
 * @property {Function} joinRoom - Joins an existing room.
 * @property {Function} leaveRoom - Leaves the current room.
 * @property {Function} messageRoom - Sends a message to the current room.
 *
 * @property {Function} kickUser - Remove's a player's connection. Only allowed by the creator.
 *
 * @property {Function} sendUpdate - Sends the current state delta to other users.
 */

/**
 * Creates a synchronizer for collaborative state management across users in a room.
 *
 * @param {createClientSynchronizerOptions} [options={}] - Configuration options for the synchronizer.
 * @param {Object} [privateState={}] - Internal state object for private data.
 * @param {Object} [publicState={}] - Shared state object to be synchronized.
 * @returns {Synchronizer} The synchronizer instance with state and synchronization methods.
 */
export const createClientSynchronizer = (
	options = {},
	privateState = {},
	publicState = {},
) => {
	const connector = createClientConnector(options);
	const { messageRoom } = connector;

	const {
		windowPerUser = 16,
		synchronisationInterval = 60 * 1e3,
		maxDiffChanges = 1000,
		maxDiffPathDepth = 32,
		maxDiffValueBytes = 192 * 1024,
		maxSerializedStateBytes = 1024 * 1024,
	} = options;
	for (const [name, value] of [
		["maxDiffChanges", maxDiffChanges],
		["maxDiffPathDepth", maxDiffPathDepth],
		["maxDiffValueBytes", maxDiffValueBytes],
		["maxSerializedStateBytes", maxSerializedStateBytes],
	]) {
		if (!Number.isInteger(value) || value <= 0) {
			throw new TypeError(`${name} must be a positive integer`);
		}
	}
	const serializedBytes = (value) => {
		const serialized = JSON.stringify(value);
		if (serialized === undefined) {
			throw new TypeError("invalid_serialized_value");
		}
		return new TextEncoder().encode(serialized).byteLength;
	};
	const validateStateDelta = (stateDelta) => {
		if (!Array.isArray(stateDelta) || stateDelta.length > maxDiffChanges) {
			throw new TypeError("invalid_state_delta");
		}
		for (const change of stateDelta) {
			if (
				!change ||
				typeof change !== "object" ||
				(change.type !== "set" && change.type !== "delete") ||
				!Array.isArray(change.path) ||
				change.path.length === 0 ||
				change.path.length > maxDiffPathDepth
			) {
				throw new TypeError("invalid_state_delta");
			}
			if (
				(Object.hasOwn(change, "new") &&
					serializedBytes(change.new) > maxDiffValueBytes) ||
				(Object.hasOwn(change, "old") &&
					serializedBytes(change.old) > maxDiffValueBytes)
			) {
				throw new TypeError("state_delta_value_too_large");
			}
		}
	};
	const _stateUpdates = [];
	let _synchronisationIntervalId,
		_messageDelay = 0,
		_messageOffset = 0,
		_stateUpdatesWindow = windowPerUser;

	/**
	 * Sends the state delta to other users in the room.
	 *
	 * @param {Array} stateDelta - The array of state changes to send.
	 */
	const _sendDelta = (stateDelta) => {
		const identifier = generateCode();
		const previous = stateDelta.length > 0 ? stateDelta[0].identifier : null;

		// Store the update for reference later.
		_stateUpdates.unshift({
			identifier,
			previous,
			sender: privateState.userId,
			stateDelta,
			time: {
				adjusted: Date.now() + _messageDelay - _messageOffset,
			},
		});
		if (_stateUpdates.length > _stateUpdatesWindow) {
			_stateUpdates.splice(_stateUpdatesWindow);
		}
		messageRoom({
			identifier,
			previous,
			stateDelta,
			type: STATE_UPDATE,
		});

		_updatePreviousState();
	};
	/**
	 * Sends the current state delta to other users if the state has changed.
	 */
	const sendUpdate = () => {
		if (privateState.previousState) {
			const stateDelta = determineDiff(privateState.previousState, publicState);
			if (stateDelta.length > 0) {
				_sendDelta(stateDelta);
			}
		}
	};

	/**
	 * Synchronizes the full current state with other users in the room.
	 */
	const _synchroniseState = () => {
		if (privateState.users.length > 1) {
			messageRoom({
				type: STATE_SYNCH,
				state: cloneRecursive(publicState),
			});
		}
	};

	/**
	 * Updates the previous state to match the current public state.
	 */
	const _updatePreviousState = () => {
		privateState.previousState = cloneRecursive(publicState);
	};

	connector.onMessage.addListener(({ data, time }) => {
		// Check if the message is not from yourself, or is not intended for the current user.
		if (
			data.sender === privateState.userId ||
			(data.receiver && data.receiver !== privateState.userId)
		) {
			return;
		}
		try {
			if (data.type === STATE_UPDATE) {
				validateStateDelta(data.stateDelta);
			} else if (
				data.type === STATE_SYNCH &&
				serializedBytes(data.state) > maxSerializedStateBytes
			) {
				throw new TypeError("synchronized_state_too_large");
			}
		} catch (error) {
			connector.onError.dispatch({ error });
			return;
		}

		// Update the estimated message delay and offset.
		_messageDelay = (_messageDelay + time.delay) / 2;
		_messageOffset = (_messageOffset + time.offset) / 2;

		if (data.type === STATE_SYNCH) {
			// Remove any state updates older than the given synch data.
			let index = 0;
			for (; index < _stateUpdates.length; index++) {
				const previousUpdate = _stateUpdates[index];
				if (previousUpdate.time.adjusted >= time.adjusted) {
					break;
				}
			}
			_stateUpdates.splice(0, index);

			// Replace the existing state with the given state.
			for (const key in publicState) {
				delete publicState[key];
			}
			for (const key in data.state) {
				publicState[key] = data.state[key];
			}

			// Apply any newer state updates.
			for (let index = 0; index < _stateUpdates.length; index++) {
				applyDiff(publicState, _stateUpdates[index].stateDelta);
			}

			_updatePreviousState();
		} else if (data.type === STATE_UPDATE) {
			let failedToInsert = true;
			for (let index = 0; index < _stateUpdates.length; index++) {
				const previousUpdate = _stateUpdates[index];
				if (
					// If the update's identifier matches the data's previous, we can insert it here.
					previousUpdate.identifier === data.previous ||
					// If the previous updates are the same. If the time of this update is newer than the previous one, we can insert it before the previous one.
					(previousUpdate.previous === data.previous &&
						previousUpdate.time.adjusted < time.adjusted)
				) {
					_stateUpdates.splice(index, 0, {
						...data,
						time,
					});
					failedToInsert = false;
					break;
				}
			}
			if (failedToInsert) {
				// If the update was not inserted just assume it will make sense later.
				_stateUpdates.unshift({
					...data,
					time,
				});
			}

			// Undo the state until the new given diff is reached the apply the diff's in order.
			for (let index = 0; index < _stateUpdates.length; index++) {
				const update = _stateUpdates[index];
				if (update.identifier === data.identifier) {
					// We found the update, we can stop searching.
					break;
				}
				revertDiff(publicState, update.stateDelta);
			}

			// Redo the state including the new given diff.
			for (let index = 0; index < _stateUpdates.length; index++) {
				const update = _stateUpdates[index];
				// Revert the previous state to the current state.
				applyDiff(publicState, update.stateDelta);
				if (update.identifier === data.identifier) {
					// We found the update, we can stop searching.
					break;
				}
			}

			_updatePreviousState();
		}
	});

	connector.onConnection.addListener(({ state }) => {
		privateState.connectionState = state;
	});

	connector.onRoomJoin.addListener(({ creatorId, roomCode, userId, users }) => {
		// Set new room data.
		privateState.creatorId = creatorId;
		privateState.roomCode = roomCode;
		privateState.userId = userId;
		privateState.users = users;
		privateState.verifiedUsers = [];
		privateState.previousState = cloneRecursive(publicState);

		if (userId === creatorId) {
			privateState.verifiedUsers.push(userId);

			// Let the creator send resynchronisation messages every once in a well to get all users in sync.
			_synchronisationIntervalId = setInterval(
				_synchroniseState,
				synchronisationInterval,
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

	connector.onUserJoin.addListener(({ userId }) => {
		privateState.users.push(userId);

		// Update the amount state updates to store.
		_stateUpdatesWindow =
			windowPerUser + windowPerUser * privateState.users.length;
	});
	connector.onUserVerificationCode.addListener((event) => {
		if (event.userId === privateState.creatorId) {
			privateState.verificationCode = event.code;
		}
	});
	connector.onUserVerified.addListener(({ userId }) => {
		privateState.verifiedUsers.push(userId);

		// Update the amount state updates to store.
		_stateUpdatesWindow =
			windowPerUser + windowPerUser * privateState.users.length;

		// Synchronise the state when a new user joins, if the user is the creator.
		if (privateState.userId === privateState.creatorId) {
			_synchroniseState();
		}
	});
	connector.onUserLeave.addListener(({ userId }) => {
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

		// Update the amount state updates to store.
		_stateUpdatesWindow =
			windowPerUser + windowPerUser * privateState.users.length;
	});

	return Object.assign(
		{
			privateState,
			publicState,
			sendUpdate,
		},
		connector,
	);
};
