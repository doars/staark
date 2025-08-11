/**
 * Example script demonstrating the usage of the `@doars/roupn` library with `@doars/staark` for real-time room-based synchronization and rendering. The UI is rendered using a declarative approach, with state-driven updates and event handlers for user interactions. This script mounts a UI to the provided `rootElement` and manages the state of a chat room, including:
 * - Creating and joining rooms
 * - Displaying users and their validation status
 * - Validating users as the room creator
 * - Sending and displaying messages in real-time
 * - Handling connection states (connected, connecting, disconnecting, pending verification)
 * - Leaving the room.
 *
 * @see {@link https://github.com/doars/roupn} for more information about `@doars/roupn`.
 * @see {@link https://github.com/doars/staark} for more information about `@doars/staark`.
 */

import {
    conditional as c,
    match as m,
    mount,
    node as n,
} from '@doars/staark'

import {
    createClientSynchronizer,
} from '../src/index.js'

import {
    CONNECTION_CONNECTED,
    CONNECTION_CONNECTING,
    CONNECTION_DISCONNECTING,
    CONNECTION_PENDING_VERIFICATION,
} from '../src/library/message-types.js'

(function () {
  let synchronizer = null

  // Updates the verification code for a user as the creator types it in the input field.
  const handleVerificationInput = (
    event,
    state,
  ) => {
    const userId = event.target.closest('li').getAttribute('data-user-id')
    state.verificationCodes[userId] = event.target.value
  }

  // Submits the verification code for a user, triggering validation via the synchronizer.
  const handleVerificationSubmit = (
    event,
    state,
  ) => {
    const userId = event.target.closest('li').getAttribute('data-user-id')
    synchronizer.verifyUser(
      userId,
      state.verificationCodes[userId],
    )
  }

  // Updates the current chat message as the user types in the textarea.
  const handleMessageInput = (
    event,
    state,
  ) => {
    state.message = event.target.value
  }

  // Sends the current chat message to the room and clears the input field.
  const handleMessageSubmit = (
    _event,
    state,
  ) => {
    state.publicState.messages.push({
      message: state.message,
      timestamp: Date.now(),
      userId: state.privateState.userId,
    })
    state.message = null
  }

  // Requests the synchronizer to create a new room for the user.
  const handleRoomCreate = (
    _event,
    _state,
  ) => {
    synchronizer.createRoom({
      publicData: {
        appName: 'example',
      },
      verifyPublicData: ({
        userId,
        data,
      }) => {
        console.log('Verify public user data:', userId, data)
        return data.appName === 'example'
      },
    })
  }

  // Requests the synchronizer to leave the current room.
  const handleRoomLeave = (
    _event,
    _state,
  ) => {
    synchronizer.leaveRoom()
  }

  // Updates the room code as the user types it in the join room input field.
  const handleRoomCodeInput = (
    event,
    state,
  ) => {
    state.roomCode = event.target.value
  }

  // Attempts to join a room using the entered room code, then clears the input.
  const handleRoomCodeSubmit = (
    _event,
    state,
  ) => {
    synchronizer.joinRoom(
      state.roomCode,
      {
        publicData: {
          appName: 'example',
        },
        verifyPublicData: ({ data, userId }) => {
          console.log('Verify public user data:', userId, data)
          return data.appName === 'example'
        },
      },
    )
    state.roomCode = ''
  }

  // Creates the root element for the application and appends it to the document body.
  const rootElement = document.createElement('div')
  rootElement.setAttribute('id', 'app')
  document.body.appendChild(rootElement)

  // Mounts the UI using staark, providing the state and a render function that describes the UI tree.
  const [
    _update,
    _unmount,
    state,
  ] = mount(
    rootElement,
    (state) => {
      // Notifies the synchronizer of state changes after each render.
      synchronizer?.sendUpdate()

      // Renders the UI based on the current connection state.
      return [
        n('h1', 'roupn example'),
        ...m(state.privateState.connectionState,
          {
            [CONNECTION_CONNECTED]: () => [
              // Shows the user's ID and the room code when connected.
              n('p', [
                'You are user ',
                n('code', state.privateState.userId),
                ' in room ',
                n('code', state.privateState.roomCode),
                '.',
              ]),
              n('hr'),

              // Displays a list of users in the room, indicating their validation status.
              n('p', 'Users in the room:'),
              n('ul',
                state.privateState.users.map((userId) => (
                  n('li', [
                    n('code', userId),
                    ...c(
                      state.privateState.verifiedUsers.includes(userId),
                      () => n('span', ' (verified)'),
                      () => n('span', ' (unverified)'),
                    ),
                  ])
                )),
              ),

              // If the current user is the room creator, show UI to verify joining users.
              ...c(
                state.privateState.userId === state.privateState.creatorId,
                () => {
                  const unverifiedUsers = state.privateState.users.filter((userId) => !state.privateState.verifiedUsers.includes(userId))
                  return c(
                    unverifiedUsers.length > 0,
                    () => [
                      n('hr'),
                      n('p', 'The following users need to be verified:'),
                      n('ul',
                        unverifiedUsers.map((userId) => (
                          n('li', {
                            'data-user-id': userId,
                          }, [
                            n('code', userId),
                            n('label', {
                              for: 'user-verification-code-input-' + userId,
                            }, 'Verification code:'),
                            n('input', {
                              id: 'user-verification-code-input-' + userId,
                              type: 'text',
                              required: true,
                              input: handleVerificationInput,
                              value: state.verificationCodes[userId],
                            }),
                            n('button', {
                              click: handleVerificationSubmit,
                            }, 'Validate'),
                          ])
                        )),
                      ),
                    ]
                  )
                }
              ),

              n('hr'),

              // Shows chat messages if present, otherwise displays a placeholder message.
              ...c(state.publicState.messages.length,
                () => [
                  n('p', 'Messages in the room:'),
                  n('ul',
                    state.publicState.messages.map(
                      (message) => (
                        n('li', [
                          ' (',
                          n('time', {
                            datetime: new Date(message.timestamp).toISOString(),
                          }, new Date(message.timestamp).toLocaleString()),
                          ') ',
                          n('code', message.userId),
                          ': ',
                          n('span', message.message),
                        ])
                      ),
                    ),
                  ),
                ],
                () => n('p', 'No messages have been send yet.'),
              ),

              // Provides a textarea for composing messages and a button to send them.
              n('label', {
                for: 'message-input',
              }, 'Message:'),
              n('textarea', {
                id: 'message-input',
                type: 'text',
                required: true,
                input: handleMessageInput,
              }, state.message),
              n('button', {
                click: handleMessageSubmit,
              }, 'Send message'),

              n('hr'),

              // Allows the user to leave the room.
              n('p', 'You can leave the room.'),
              n('button', {
                click: handleRoomLeave,
              }, 'Leave room'),
            ],
            [CONNECTION_CONNECTING]: () => [
              // Indicates that the client is connecting to a room.
              n('p', 'Connecting to room...'),
            ],
            [CONNECTION_DISCONNECTING]: () => [
              // Indicates that the client is disconnecting from a room.
              n('p', 'Disconnecting from room...'),
            ],
            [CONNECTION_PENDING_VERIFICATION]: () => [
              // Shows the verification code for the user to provide to the room creator.
              n('p', [
                'You are not yet verified, please provide the following code to the room creator: ',
                n('code', state.privateState.verificationCode || 'Generating...'),
              ]),
            ],
          },
          // Default UI shown when not connected: options to create or join a room.
          () => [
            n('p', [
              'This is a simple example of using ',
              n('code', '@doars/roupn'),
              '\'s auto synchronizer in conjunction with ',
              n('code', '@doars/staark'),
              ' for rendering.',
            ]),

            n('hr'),

            n('p', 'You can create a new room.'),
            n('button', {
              click: handleRoomCreate,
            }, 'Create room'),

            n('hr'),

            n('p', 'Or join an existing room.'),
            n('label', {
              for: 'room-code-input',
            }, 'Room code:'),
            n('input', {
              id: 'room-code-input',
              type: 'text',
              required: true,
              input: handleRoomCodeInput,
              value: state.roomCode,
            }),
            n('button', {
              click: handleRoomCodeSubmit,
            }, 'Join room'),
          ],
        ),
      ]
    },
    {
      // Initial state for the application, including message input, room code, and verification codes.
      message: '',
      roomCode: '',
      verificationCodes: {},

      privateState: {},
      publicState: {
        messages: [],
      },
    },
  )

  // Instantiates the synchronizer to manage real-time state synchronization between clients.
  synchronizer = createClientSynchronizer(
    {},
    state.privateState,
    state.publicState,
  )

  // Logs information from the synchronizer for debugging purposes.
  synchronizer.onError.addListener((event) => {
    console.warn('Error:', event)
  })
  // Logs all messages received from the synchronizer.
  synchronizer.onMessage.addListener((event) => {
    console.log('Message received:', event)
  })
  // Logs connection state changes.
  synchronizer.onConnection.addListener((event) => {
    console.log('Connection state received:', event)
  })
  // Logs when the client joins a room.
  synchronizer.onRoomJoin.addListener((event) => {
    console.log('Room joined:', event)
  })
  // Logs when the client leaves a room.
  synchronizer.onRoomLeave.addListener((event) => {
    console.log('Room left:', event)
  })
  // Logs when a new user joins the room.
  synchronizer.onUserJoin.addListener((event) => {
    console.log('User joined:', event)
  })
  // Logs when a user is verified by the creator.
  synchronizer.onUserVerified.addListener((event) => {
    console.log('User verified:', event)
  })
  // Logs when a user leaves the room.
  synchronizer.onUserLeave.addListener((event) => {
    console.log('User left:', event)
  })
}())
