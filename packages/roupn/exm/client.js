import {
  conditional as c,
  match as m,
  mount,
  node as n,
} from '@doars/staark'

import {
  createClientSynchronizer,
} from '../src/index.js'

(function () {
  let synchronizer = null

  const rootElement = document.createElement('div')
  rootElement.setAttribute('id', 'app')
  document.body.appendChild(rootElement)
  const [
    _update,
    _unmount,
    state,
  ] = mount(
    rootElement,
    (state) => {
      synchronizer?.sendUpdate()

      return [
        n('h1', 'roupn example'),
        ...c(
          state.privateState.roomCode,
          () => [

            n('p', [
              'You are user ',
              n('code', state.privateState.userId),
              ' in room ',
              n('code', state.privateState.roomCode),
              '.',
            ]),
            n('hr'),

            n('p', 'Users in the room:'),
            n('ul',
              state.privateState.users.map((userId) => (
                n('li', n('code', userId))
              )),
            ),

            n('hr'),

            ...c(state.publicState.messages.length,
              () => [
                n('p', 'Messages in the room:'),
                n('ul',
                  state.publicState.messages.map((message) => (
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
                  )),
                ),
              ],
              () => n('p', 'No messages have been send yet.'),
            ),

            n('label', {
              for: 'message-input',
            }, 'Message:'),
            n('textarea', {
              id: 'message-input',
              type: 'text',
              required: true,
              input: (
                event,
              ) => {
                state.message = event.target.value
              },
            }, state.message),
            n('button', {
              click: (
              ) => {
                state.publicState.messages.push({
                  message: state.message,
                  timestamp: Date.now(),
                  userId: state.privateState.userId,
                })
                state.message = ''
              },
            }, 'Send message'),

            n('hr'),

            n('p', 'You can leave the room.'),
            n('button', {
              click: (
              ) => {
                synchronizer.leaveRoom()
              },
            }, 'Leave room'),
          ],
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
            n('label', {
              for: 'room-create-password-input',
            }, 'Room password (optional):'),
            n('input', {
              id: 'room-create-password-input',
              type: 'password',
              required: true,
              input: (
                event,
              ) => {
                state.roomCreatePassword = event.target.value
              },
              value: state.roomCreatePassword,
            }),
            n('button', {
              click: (
              ) => {
                synchronizer.createRoom({
                  password: state.roomCreatePassword,
                })
              },
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
              input: (
                event,
              ) => {
                state.roomCode = event.target.value
              },
              value: state.roomCode,
            }),
            n('label', {
              for: 'room-join-password-input',
            }, 'Room password:'),
            n('input', {
              id: 'room-join-password-input',
              type: 'password',
              required: true,
              input: (
                event,
              ) => {
                state.roomJoinPassword = event.target.value
              },
              value: state.roomJoinPassword,
            }),
            n('button', {
              click: (
              ) => {
                synchronizer.joinRoom(
                  state.roomCode,
                  state.roomJoinPassword,
                )
              },
            }, 'Join room'),
          ])
      ]
    },
    {
      message: '',
      roomCode: '',

      privateState: {},
      publicState: {
        messages: [],
      },
    }
  )
  synchronizer = createClientSynchronizer(
    {},
    state.privateState,
    state.publicState,
  )

  // Log events to the console.
  synchronizer.onError.addListener((
    event
  ) => {
    console.warn('Error:', event)
  })
  synchronizer.onMessage.addListener((
    event
  ) => {
    console.log('Message received:', event)
  })
  synchronizer.onRoomJoin.addListener((
    event
  ) => {
    console.log('Room joined:', event)
  })
  synchronizer.onRoomLeave.addListener((
    event
  ) => {
    console.log('Room left:', event)
  })
  synchronizer.onUserJoin.addListener((
    event
  ) => {
    console.log('User joined:', event)
  })
  synchronizer.onUserValidated.addListener((
    event
  ) => {
    console.log('User validated:', event)
  })
  synchronizer.onUserLeave.addListener((
    event
  ) => {
    console.log('User left:', event)
  })
}())
