import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import { createServerConnector } from '../../src/library/server-connector.js'
import { createClientConnector } from '../../src/library/client-connector.js'
import {
  base64ToString,
  stringToBase64,
} from '../../src/utilities/encoding-server.js'
import { decode } from '../../src/utilities/protocol.js'
import {
  AUTHENTICATED_SENDER,
  SERVER_PAYLOAD,
  SERVER_TIME,
} from '../../src/library/payload-keys.js'

const createResponse = () => {
  const result = {
    body: '',
    headers: null,
    status: null,
  }
  return {
    end: (body = '') => {
      result.body = body
    },
    result,
    writeHead: (status, headers = {}) => {
      result.headers = headers
      result.status = status
    },
  }
}

const createConnection = () => {
  const listeners = new Map()
  return {
    CLOSED: 3,
    OPEN: 1,
    closeCount: 0,
    bufferedAmount: 0,
    listeners,
    readyState: 1,
    sent: [],
    addEventListener: (type, listener) => listeners.set(type, listener),
    close(code, reason) {
      this.closeCount++
      this.closeCode = code
      this.closeReason = reason
      this.readyState = this.CLOSED
    },
    send(message) {
      this.sent.push(message)
    },
		dispatch: (type, event) => listeners.get(type)?.(event),
  }
}

describe('Server room creation policy', () => {
  it('authorizes with the socket address and returns stable failures', () => {
    let authorizationInput
    const connector = createServerConnector({
      authorizeRoomCreation: (input) => {
        authorizationInput = input
        return false
      },
    })
    const response = createResponse()
    const request = {
      method: 'POST',
      socket: { remoteAddress: '192.0.2.1' },
      url: '/create-room',
    }

    assert.strictEqual(connector.handleHttpRequest(request, response), true)
    assert.strictEqual(response.result.status, 403)
    assert.deepStrictEqual(JSON.parse(response.result.body), {
      error: 'room_creation_forbidden',
    })
    assert.strictEqual(authorizationInput.remoteAddress, '192.0.2.1')
    assert.strictEqual(authorizationInput.request, request)
    assert.strictEqual(connector.getRoomCount(), 0)
  })

  it('rejects other methods before taking a token', () => {
    const connector = createServerConnector({
      roomCreationsGlobal: 1,
      roomCreationsPerAddress: 1,
    })
    const request = (method) => ({
      method,
      socket: { remoteAddress: '192.0.2.2' },
      url: '/create-room',
    })
    const statuses = []
    for (const method of ['GET', 'GET', 'POST', 'POST']) {
      const response = createResponse()
      connector.handleHttpRequest(request(method), response)
      statuses.push(response.result.status)
      if (response.result.status === 429) {
        assert.strictEqual(response.result.headers['Retry-After'], '60')
        assert.deepStrictEqual(JSON.parse(response.result.body), {
          error: 'room_creation_rate_limited',
        })
      }
    }

    assert.deepStrictEqual(statuses, [405, 405, 200, 429])
    for (const roomCode of connector.getRoomCodes()) {
      connector.removeRoom(roomCode)
    }
  })

  it('keeps one address from using up the global budget', () => {
    const connector = createServerConnector({
      authorizeRoomCreation: ({ remoteAddress }) => remoteAddress !== '192.0.2.5',
      roomCreationsGlobal: 2,
      roomCreationsPerAddress: 1,
    })
    const create = (remoteAddress) => {
      const response = createResponse()
      connector.handleHttpRequest({
        method: 'POST',
        socket: { remoteAddress },
        url: '/create-room',
      }, response)
      return response.result.status
    }
    const statuses = []
    for (let index = 0; index < 10; index++) {
      statuses.push(create('192.0.2.4'))
    }
    // Refused by the authorization.
    statuses.push(create('192.0.2.5'))

    assert.deepStrictEqual(statuses, [200, ...Array(9).fill(429), 403])
    assert.strictEqual(create('192.0.2.6'), 200)
    // Now the global budget is used up.
    assert.strictEqual(create('192.0.2.7'), 429)
    for (const roomCode of connector.getRoomCodes()) {
      connector.removeRoom(roomCode)
    }
  })

  it('returns a stable max-room error', () => {
    const connector = createServerConnector({ maxRooms: 1 })
    connector.createRoom()
    const response = createResponse()
    connector.handleHttpRequest({
      method: 'POST',
      socket: { remoteAddress: '192.0.2.3' },
      url: '/create-room',
    }, response)

    assert.strictEqual(response.result.status, 503)
    assert.deepStrictEqual(JSON.parse(response.result.body), {
      error: 'max_rooms',
    })
    connector.removeRoom(connector.getRoomCodes()[0])
  })
})

describe('Server message limits', () => {
  it('attaches the connection identity to relayed messages', () => {
    const connector = createServerConnector()
    const room = connector.createRoom()
    const creatorConnection = createConnection()
    connector.joinRoom(room.roomCode, creatorConnection, true)
    creatorConnection.dispatch('message', {
      data: `A:${room.creatorConnectionToken}`,
    })
    const peerConnection = createConnection()
    const [, peer] = connector.joinRoom(room.roomCode, peerConnection)

    connector.messageUser(
      room.roomCode,
      peer.userId,
      room.userId,
      `D:${stringToBase64('{}')}|U:${stringToBase64(room.userId)}`,
    )

    const parts = decode(
      creatorConnection.sent.at(-1),
      base64ToString,
      {
        allowedKeys: new Set([
          AUTHENTICATED_SENDER,
          SERVER_PAYLOAD,
          SERVER_TIME,
          'D',
          'U',
        ]),
      },
    )
    assert.strictEqual(parts[AUTHENTICATED_SENDER], peer.userId)
    connector.removeRoom(room.roomCode)
  })

  it('only lets unverified users and the creator use the channels of the handshake', () => {
    const connector = createServerConnector()
    const room = connector.createRoom()
    const creatorConnection = createConnection()
    connector.joinRoom(room.roomCode, creatorConnection, true)
    creatorConnection.dispatch('message', {
      data: `A:${room.creatorConnectionToken}`,
    })
    const joinUser = () => {
      const connection = createConnection()
      const [, { userId }] = connector.joinRoom(room.roomCode, connection)
      return { connection, userId }
    }
    const direct = (receiver, payload = '{}') => ({
      data: `D:${stringToBase64(payload)}|U:${receiver}`,
    })
    const verified = joinUser()
    connector.getRoom(room.roomCode).users.get(verified.userId).verified = true
    const pending = joinUser()
    const other = joinUser()

    // An unverified user can message the creator, but nobody else.
    pending.connection.dispatch('message', direct(room.userId))
    assert.strictEqual(pending.connection.closeCount, 0)
    assert.match(creatorConnection.sent.at(-1), /^T:\d+\|D:/)
    pending.connection.dispatch('message', direct(verified.userId))
    assert.strictEqual(pending.connection.closeReason, 'invalid_protocol_message')
    assert.strictEqual(verified.connection.sent.some((message) => message.includes('|D:')), false)

    // The creator can only send unencrypted messages to unverified users.
    creatorConnection.dispatch('message', direct(other.userId))
    assert.strictEqual(creatorConnection.closeCount, 0)
    assert.match(other.connection.sent.at(-1), /\|D:/)
    creatorConnection.dispatch('message', direct(verified.userId))
    assert.strictEqual(creatorConnection.closeReason, 'invalid_protocol_message')

    // Verified users have no use for the unencrypted channel.
    verified.connection.dispatch('message', direct(other.userId))
    assert.strictEqual(verified.connection.closeReason, 'invalid_protocol_message')
    connector.removeRoom(room.roomCode)
  })

  it('closes malformed and oversized senders without throwing', () => {
    const connector = createServerConnector({
      maxEncodedMessageBytes: 32,
    })
    const room = connector.createRoom()
    const creatorConnection = createConnection()
    connector.joinRoom(room.roomCode, creatorConnection, room.creatorSecret)

    assert.doesNotThrow(() => {
      creatorConnection.dispatch('message', { data: 'missing-separator' })
    })
    assert.strictEqual(creatorConnection.closeCode, 1008)
    assert.strictEqual(creatorConnection.closeReason, 'invalid_protocol_message')
    connector.removeRoom(room.roomCode)

    const secondRoom = connector.createRoom()
    const secondConnection = createConnection()
    connector.joinRoom(
      secondRoom.roomCode,
      secondConnection,
      secondRoom.creatorSecret,
    )
    secondConnection.dispatch('message', { data: `S:${'A'.repeat(40)}` })
    assert.strictEqual(secondConnection.closeReason, 'message_too_large')
    connector.removeRoom(secondRoom.roomCode)
  })

  it('closes rate-limited senders and slow consumers', () => {
    const connector = createServerConnector({
      connectionMessages: 1,
      maxSocketBufferedAmount: 1,
    })
    const room = connector.createRoom()
    const creatorConnection = createConnection()
    connector.joinRoom(room.roomCode, creatorConnection, true)
    creatorConnection.dispatch('message', {
      data: `A:${room.creatorConnectionToken}`,
    })
    const message = `S:${stringToBase64(JSON.stringify({ type: 'unknown' }))}`
    creatorConnection.dispatch('message', { data: message })
    assert.strictEqual(creatorConnection.closeReason, 'message_rate_limited')
    connector.removeRoom(room.roomCode)

    const slowRoom = connector.createRoom()
    const slowConnection = createConnection()
    slowConnection.bufferedAmount = 2
    connector.joinRoom(slowRoom.roomCode, slowConnection, true)
    connector.messageUser(slowRoom.roomCode, null, slowRoom.userId, 'payload')
    assert.strictEqual(slowConnection.closeReason, 'slow_consumer')
    connector.removeRoom(slowRoom.roomCode)
  })
})

describe('Creator authentication', () => {
  it('stores only a digest and redeems the token once as the first message', () => {
    let authenticated = 0
    const connector = createServerConnector()
    const room = connector.createRoom()
    const storedRoom = connector.getRoom(room.roomCode)
    assert.strictEqual(storedRoom.creatorConnectionToken, undefined)
    assert.strictEqual(storedRoom.creatorTokenDigest.length, 32)
    const connection = createConnection()
    const [success] = connector.joinRoom(
      room.roomCode,
      connection,
      true,
      () => authenticated++,
    )
    assert.strictEqual(success, true)
    assert.strictEqual(authenticated, 0)

    connection.dispatch('message', {
      data: `A:${room.creatorConnectionToken}`,
    })

    assert.strictEqual(authenticated, 1)
    assert.strictEqual(storedRoom.creatorTokenDigest, null)
    assert.strictEqual(storedRoom.users.get(room.userId).verified, true)
    connector.removeRoom(room.roomCode)
  })

  it('rejects a wrong token and any non-authentication first message', () => {
    const connector = createServerConnector()
    const room = connector.createRoom()
    const connection = createConnection()
    connector.joinRoom(room.roomCode, connection, true)
    connection.dispatch('message', { data: `A:${stringToBase64('wrong')}` })
    assert.strictEqual(connection.closeReason, 'creator_authentication_failed')
    connector.removeRoom(room.roomCode)

    const secondRoom = connector.createRoom()
    const secondConnection = createConnection()
    connector.joinRoom(secondRoom.roomCode, secondConnection, true)
    secondConnection.dispatch('message', {
      data: `S:${stringToBase64('{}')}`,
    })
    assert.strictEqual(
      secondConnection.closeReason,
      'creator_authentication_required',
    )
    connector.removeRoom(secondRoom.roomCode)
  })

  it('preserves the room after an unauthenticated creator disconnects', () => {
    const connector = createServerConnector()
    const room = connector.createRoom()
    const attackerConnection = createConnection()
    connector.joinRoom(room.roomCode, attackerConnection, true)
    attackerConnection.dispatch('message', {
      data: `A:${stringToBase64('wrong')}`,
    })
    attackerConnection.dispatch('close')
    attackerConnection.dispatch('error')

    const storedRoom = connector.getRoom(room.roomCode)
    assert.ok(storedRoom)
    assert.strictEqual(storedRoom.creatorTokenDigest.length, 32)
    assert.deepStrictEqual(storedRoom.users.get(room.userId), {
      connection: null,
      verified: false,
    })

    const creatorConnection = createConnection()
    const [success] = connector.joinRoom(
      room.roomCode,
      creatorConnection,
      true,
    )
    assert.strictEqual(success, true)
    creatorConnection.dispatch('message', {
      data: `A:${room.creatorConnectionToken}`,
    })
    assert.strictEqual(storedRoom.users.get(room.userId).verified, true)
    connector.removeRoom(room.roomCode)
  })
})

describe('Transport and origin policy', () => {
  it('rejects insecure non-loopback client URLs before starting work', () => {
    assert.throws(
      () => createClientConnector({
        httpUrl: 'http://example.test',
        wsUrl: 'ws://example.test',
      }),
      /allowInsecureNonLoopback/,
    )
  })

  it('requires an origin policy in production', () => {
    const environment = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      assert.throws(() => createServerConnector(), /serverOrigin or validateOrigin/)
      assert.doesNotThrow(() => createServerConnector({ serverOrigin: 'https://app.example' }))
      assert.doesNotThrow(() => createServerConnector({ validateOrigin: () => true }))
    } finally {
      if (environment === undefined) {
        delete process.env.NODE_ENV
      } else {
        process.env.NODE_ENV = environment
      }
    }
    assert.doesNotThrow(() => createServerConnector())
  })

  it('rejects missing and cross-origin upgrades', () => {
    const connector = createServerConnector()
    for (const headers of [{}, { origin: 'https://example.test' }]) {
      const writes = []
      let destroyed = false
      let upgraded = false
      const socket = {
        destroy: () => { destroyed = true },
        write: (value) => writes.push(value),
      }
      connector.handleSocketUpgrade(
        { headers, url: '/join-room?code=missing' },
        socket,
        Buffer.alloc(0),
        { handleUpgrade: () => { upgraded = true } },
      )
      assert.strictEqual(upgraded, false)
      assert.strictEqual(destroyed, true)
      assert.match(writes[0], /403 Forbidden/)
    }
  })

  it('supports explicit origin and subprotocol policies', () => {
    let upgraded = false
    const connector = createServerConnector({
      allowedWebSocketProtocols: ['roupn-v1'],
      validateOrigin: ({ origin }) => origin === 'https://app.example',
    })
    connector.handleSocketUpgrade(
      {
        headers: {
          origin: 'https://app.example',
          'sec-websocket-protocol': 'other, roupn-v1',
        },
        url: '/join-room?code=missing',
      },
      { destroy: () => {}, write: () => {} },
      Buffer.alloc(0),
      {
        handleUpgrade: (_request, _socket, _head, callback) => {
          upgraded = true
          callback(createConnection())
        },
      },
    )
    assert.strictEqual(upgraded, true)
  })
})

describe('Server room expiry', () => {
  it('expires an unclaimed creator reservation', async () => {
    const connector = createServerConnector({
      creatorJoinTimeout: 5,
      roomIdleTimeout: 0,
    })
    connector.createRoom()
    await new Promise((resolve) => setTimeout(resolve, 15))
    assert.strictEqual(connector.getRoomCount(), 0)
  })

  it('clears timers and closes every socket during removal', () => {
    const connector = createServerConnector()
    const room = connector.createRoom()
    const creatorConnection = createConnection()
    const peerConnection = createConnection()
    connector.joinRoom(room.roomCode, creatorConnection, room.creatorSecret)
    connector.joinRoom(room.roomCode, peerConnection)

    connector.removeRoom(room.roomCode)

    assert.strictEqual(connector.getRoomCount(), 0)
    assert.strictEqual(creatorConnection.closeCount, 1)
    assert.strictEqual(peerConnection.closeCount, 1)
  })

  it('expires an idle room after its creator joins', async () => {
    const connector = createServerConnector({
      creatorJoinTimeout: 100,
      roomIdleTimeout: 5,
    })
    const room = connector.createRoom()
    const creatorConnection = createConnection()
    connector.joinRoom(room.roomCode, creatorConnection, room.creatorSecret)

    await new Promise((resolve) => setTimeout(resolve, 15))

    assert.strictEqual(connector.getRoomCount(), 0)
    assert.strictEqual(creatorConnection.closeCount, 1)
  })
})

describe('Pending handshake limits', () => {
  it('counts the reserved creator against the pending-user limit', () => {
    const connector = createServerConnector({ maxPendingUsersPerRoom: 1 })
    const room = connector.createRoom()
    const [success, result] = connector.joinRoom(
      room.roomCode,
      createConnection(),
    )
    assert.strictEqual(success, false)
    assert.strictEqual(result.reason, 'too_many_pending_users')
    connector.removeRoom(room.roomCode)
  })

  it('removes an unverified peer after the handshake timeout', async () => {
    const connector = createServerConnector({
      creatorJoinTimeout: 100,
      handshakeTimeout: 5,
      roomIdleTimeout: 0,
    })
    const room = connector.createRoom()
    const peerConnection = createConnection()
    const [success, result] = connector.joinRoom(room.roomCode, peerConnection)
    assert.strictEqual(success, true)

    await new Promise((resolve) => setTimeout(resolve, 15))

    assert.strictEqual(connector.getRoom(room.roomCode).users.has(result.userId), false)
    assert.strictEqual(peerConnection.closeCount, 1)
    connector.removeRoom(room.roomCode)
  })
})
