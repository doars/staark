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
 * @property {number} [messageBufferMaxCount=50] - The maximum number of messages to store in the buffer.
 * @property {number} [messageBufferMaxDuration=60000] - The maximum duration in milliseconds to store a message in the buffer.
 * @property {boolean} [allowInsecureNonLoopback=false] - Allows insecure HTTP and WebSocket URLs outside loopback for development.
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
 * @property {Object} publicState - Shared state object synchronized across users. Changes are only sent when `sendUpdate` is called.
 *
 * @property {Function} closeRoom - Closes the room for all. Only allowed by the creator.
 * @property {Function} createRoom - Creates a new room and joins it.
 * @property {Function} joinRoom - Joins an existing room.
 * @property {Function} leaveRoom - Leaves the current room.
 * @property {Function} messageRoom - Sends a message to the current room.
 *
 * @property {Function} kickUser - Remove's a player's connection. Only allowed by the creator.
 *
 * @property {Function} sendUpdate - Sends the changes made to the public state since the last call to the other users. Call it after changing the public state.
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
				change.path.length > maxDiffPathDepth ||
				change.path.some(
					(component) =>
						component === "__proto__" ||
						component === "constructor" ||
						component === "prototype",
				)
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
	/**
	 * The recent updates, newest first. They are ordered by their time, then by their identifier, so every user applies them in the same order.
	 *
	 * @type {Array<{ identifier: string, sender: string, stateDelta: Array, time: number }>}
	 */
	const _stateUpdates = [];
	let _synchronisationIntervalId,
		// The time of the newest update or synchronisation seen. A new update is always newer than it.
		_lastTime = 0,
		_stateUpdatesWindow = windowPerUser;

	/**
	 * Sends the state delta to other users in the room.
	 *
	 * @param {Array} stateDelta - The array of state changes to send.
	 */
	const _sendDelta = (stateDelta) => {
		const identifier = generateCode();
		_lastTime = Math.max(Date.now(), _lastTime + 1);

		// Store the update for reference later.
		_stateUpdates.unshift({
			identifier,
			sender: privateState.userId,
			stateDelta,
			time: _lastTime,
		});
		_stateUpdates.splice(_stateUpdatesWindow);
		messageRoom({
			identifier,
			stateDelta,
			time: _lastTime,
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
	 * Synchronizes the full current state with other users in the room. The time tells which updates the state includes.
	 */
	const _synchroniseState = () => {
		if (privateState.users.length > 1) {
			messageRoom({
				type: STATE_SYNCH,
				state: cloneRecursive(publicState),
				time: _lastTime,
			});
		}
	};

	/**
	 * Updates the previous state to match the current public state.
	 */
	const _updatePreviousState = () => {
		privateState.previousState = cloneRecursive(publicState);
	};

	connector.onMessage.addListener(({ data }) => {
		// Check if the message is not from yourself, or is not intended for the current user.
		if (
			data.sender === privateState.userId ||
			(data.receiver && data.receiver !== privateState.userId) ||
			(data.type !== STATE_UPDATE && data.type !== STATE_SYNCH)
		) {
			return;
		}

		try {
			if (data.type === STATE_UPDATE) {
				validateStateDelta(data.stateDelta);
				if (
					typeof data.identifier !== "string" ||
					!Number.isFinite(data.time)
				) {
					throw new TypeError("invalid_state_delta");
				}
			} else {
				// Only the creator may replace the state of everyone.
				if (data.sender !== privateState.creatorId) {
					throw new TypeError("synchronized_state_not_from_creator");
				}
				if (
					!data.state ||
					typeof data.state !== "object" ||
					Array.isArray(data.state) ||
					!Number.isFinite(data.time)
				) {
					throw new TypeError("invalid_synchronized_state");
				}
				if (serializedBytes(data.state) > maxSerializedStateBytes) {
					throw new TypeError("synchronized_state_too_large");
				}
			}

			// Send the local changes first, so they become an update instead of being mixed into the received state.
			sendUpdate();

			// Find where the message goes in the updates, which are newest first. Updates are ordered by their time and then their identifier, and a synchronised state includes every update up to its time.
			let index = 0;
			while (
				index < _stateUpdates.length &&
				(_stateUpdates[index].time > data.time ||
					(data.type === STATE_UPDATE &&
						_stateUpdates[index].time === data.time &&
						_stateUpdates[index].identifier > data.identifier))
			) {
				index++;
			}

			// Work on a copy, so a diff that fails leaves the state as it was. Start from the synchronised state, or undo the newer updates and apply the new one. Then redo the newer updates from the oldest to the newest.
			const state = cloneRecursive(
				data.type === STATE_UPDATE ? publicState : data.state,
			);
			if (data.type === STATE_UPDATE) {
				for (let undo = 0; undo < index; undo++) {
					revertDiff(state, _stateUpdates[undo].stateDelta, true);
				}
				applyDiff(state, data.stateDelta, true);
			}
			for (let redo = index - 1; redo >= 0; redo--) {
				applyDiff(state, _stateUpdates[redo].stateDelta, true);
			}
			// Only change the keys that differ, so the rest of the state keeps its objects.
			applyDiff(publicState, determineDiff(publicState, state), true);
			privateState.previousState = state;

			if (data.type === STATE_UPDATE) {
				_stateUpdates.splice(index, 0, {
					identifier: data.identifier,
					sender: data.sender,
					stateDelta: data.stateDelta,
					time: data.time,
				});
				_stateUpdates.splice(_stateUpdatesWindow);
			} else {
				// The synchronised state includes the older updates.
				_stateUpdates.splice(index);
			}
			_lastTime = Math.max(_lastTime, data.time);
		} catch (error) {
			connector.onError.dispatch({ error });
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
		privateState.verifiedUsers = [creatorId];
		privateState.previousState = cloneRecursive(publicState);

		if (userId === creatorId) {
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
		clearInterval(_synchronisationIntervalId);
		_stateUpdates.length = _lastTime = 0;
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
