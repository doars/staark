import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import {
  after,
  describe,
  it,
} from 'node:test'

import { WebSocketServer } from 'ws'

import './worker.js'

import { createClientConnector } from '../../src/library/client-connector.js'
import { createClientSynchronizer } from '../../src/library/client-synchronizer.js'
import {
  CONNECTION_CONNECTED,
  CONNECTION_DISCONNECTED,
} from '../../src/library/message-types.js'
import { createServerConnector } from '../../src/library/server-connector.js'
import {
  base64ToString,
  stringToBase64,
} from '../../src/utilities/encoding-server.js'
import {
  decode,
  encode,
} from '../../src/utilities/protocol.js'

const servers = new Set()
const clients = new Set()
after(async () => {
  for (const client of clients) {
    client.leaveRoom?.()
    client.close?.()
  }
  for (const server of servers) {
    await server.close()
  }
})

/**
 * Starts a real HTTP and WebSocket server on a free port. The `hooks.connection` callback, when set, receives each new server-side connection before the connector does.
 */
const startServer = async (options = {}) => {
  const hooks = {}
  let connector
  const socketServer = new WebSocketServer({
    maxPayload: 256 * 1024,
    noServer: true,
  })
  const httpServer = createServer((request, response) => {
    if (!connector.handleHttpRequest(request, response)) {
      response.writeHead(404).end()
    }
  })
  httpServer.on('upgrade', (request, socket, head) => {
    // Node's WebSocket client sends no origin, so act like a browser on the server's own page.
    request.headers.origin ??= httpUrl
    const handled = connector.handleSocketUpgrade(request, socket, head, {
      handleUpgrade: (request, socket, head, callback) => {
        socketServer.handleUpgrade(request, socket, head, (connection) => {
          hooks.connection?.(connection, request)
          callback(connection)
        })
      },
    })
    if (!handled) {
      socket.destroy()
    }
  })
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
  const httpUrl = `http://127.0.0.1:${httpServer.address().port}`
  connector = createServerConnector({
    serverOrigin: httpUrl,
    ...options,
  })
  const server = {
    connector,
    hooks,
    httpUrl,
    wsUrl: httpUrl.replace('http:', 'ws:'),
    close: async () => {
      servers.delete(server)
      for (const roomCode of connector.getRoomCodes()) {
        connector.removeRoom(roomCode)
      }
      for (const connection of socketServer.clients) {
        connection.terminate()
      }
      httpServer.closeAllConnections()
      await new Promise((resolve) => httpServer.close(resolve))
    },
  }
  servers.add(server)
  return server
}

/**
 * Resolves with the next event data that matches the predicate.
 */
const next = (event, predicate = () => true) => new Promise((resolve) => {
  const listener = (data) => {
    if (predicate(data)) {
      event.removeListener(listener)
      resolve(data)
    }
  }
  event.addListener(listener)
})

const createClient = (server, options = {}, create = createClientConnector) => {
  const client = create({
    httpUrl: server.httpUrl,
    wsUrl: server.wsUrl,
    ...options,
  })
  clients.add(client)
  return client
}

const isConnected = ({ state }) => state === CONNECTION_CONNECTED

/**
 * Creates a room with the creator and resolves once its connection is set up.
 */
const createRoom = async (creator, options) => {
  const connected = next(creator.onConnection, isConnected)
  const room = await creator.createRoom(options)
  await connected
  return room
}

/**
 * Lets the joiner join the room and waits for the verification codes on both sides.
 */
const joinRoom = async (creator, joiner, roomCode, options) => {
  const creatorCode = next(creator.onUserVerificationCode)
  const joinerCode = next(joiner.onUserVerificationCode)
  joiner.joinRoom(roomCode, options)
  const [{ code, userId }, joinerSide] = await Promise.all([creatorCode, joinerCode])
  return {
    code: joinerSide.code,
    creatorCode: code,
    userId,
  }
}

/**
 * Joins and verifies the joiner, and resolves with the joiner's user ID.
 */
const joinAndVerify = async (creator, joiner, roomCode, options) => {
  const { code, userId } = await joinRoom(creator, joiner, roomCode, options)
  const connected = next(joiner.onConnection, isConnected)
  assert.strictEqual(await creator.verifyUser(userId, code), true)
  await connected
  return userId
}

/**
 * Opens a raw WebSocket to a room, for sending messages a connector never would. Resolves once the server says the room was joined.
 */
const openRawClient = async (server, roomCode) => {
  const socket = new WebSocket(`${server.wsUrl}/join-room?code=${roomCode}`)
  clients.add(socket)
  const received = []
  const waiting = new Set()
  const closed = new Promise((resolve) => socket.addEventListener('close', resolve))
  socket.addEventListener('message', (event) => {
    const parts = decode(event.data, base64ToString)
    const message = {
      data: JSON.parse(parts.S ?? parts.D ?? 'null'),
      parts,
    }
    received.push(message)
    for (const waiter of waiting) {
      waiter(message)
    }
  })
  const client = {
    closed,
    received,
    socket,
    next: (predicate) => new Promise((resolve) => {
      const waiter = (message) => {
        if (predicate(message)) {
          waiting.delete(waiter)
          resolve(message)
        }
      }
      waiting.add(waiter)
      received.forEach(waiter)
    }),
    send: (parts) => socket.send(encode(parts, stringToBase64)),
  }
  client.joined = (await client.next(({ data }) => data?.type === '_RJ')).data
  return client
}

/**
 * Rewrites the direct messages the server sends over a connection, after decoding their parts and payload.
 */
const rewriteDirectMessages = (connection, rewrite) => {
  const send = connection.send.bind(connection)
  connection.send = (message, ...rest) => {
    const parts = decode(message, base64ToString)
    if (parts.D) {
      const data = JSON.parse(parts.D)
      rewrite(data)
      parts.D = JSON.stringify(data)
      message = encode(parts, stringToBase64)
    }
    send(message, ...rest)
  }
}

const exportPublicKey = async (algorithm, format, usages) => {
  const keys = await crypto.subtle.generateKey(algorithm, true, usages)
  return Buffer.from(await crypto.subtle.exportKey(format, keys.publicKey)).toString('base64')
}

describe('End-to-end rooms', { timeout: 20000 }, () => {
  it('verifies a joiner and exchanges room messages', async () => {
    const server = await startServer()
    const creator = createClient(server)
    const joiner = createClient(server)
    const { roomCode } = await createRoom(creator)
    await joinAndVerify(creator, joiner, roomCode)

    const received = next(creator.onMessage)
    await joiner.messageRoom({ text: 'hello' })
    assert.strictEqual((await received).data.text, 'hello')

    const left = next(creator.onConnection, ({ state }) => state === CONNECTION_DISCONNECTED)
    creator.leaveRoom()
    await left
    await server.close()
  })
})

describe('Handshake security', { timeout: 20000 }, () => {
  for (const [name, field, key] of [
    [
      'encrypt',
      'publicEncryptKey',
      () => exportPublicKey(
        { hash: 'SHA-256', modulusLength: 2048, name: 'RSA-OAEP', publicExponent: new Uint8Array([1, 0, 1]) },
        'spki',
        ['encrypt', 'decrypt'],
      ),
    ],
    [
      'sign',
      'publicSignKey',
      () => exportPublicKey(
        { hash: 'SHA-256', modulusLength: 2048, name: 'RSASSA-PKCS1-v1_5', publicExponent: new Uint8Array([1, 0, 1]) },
        'spki',
        ['sign', 'verify'],
      ),
    ],
    [
      'exchange',
      'publicExchangeKey',
      () => exportPublicKey({ name: 'ECDH', namedCurve: 'P-256' }, 'raw', ['deriveBits']),
    ],
  ]) {
    it(`gives different codes when the relay swaps the creator's ${name} key`, async () => {
      const server = await startServer()
      const replacement = await key()
      server.hooks.connection = (connection, request) => {
        if (!request.url.includes('creator=1')) {
          rewriteDirectMessages(connection, (data) => {
            if (data.type === '_X1') {
              data[field] = replacement
            }
          })
        }
      }
      const creator = createClient(server)
      const joiner = createClient(server)
      const { roomCode } = await createRoom(creator)
      const { code, creatorCode, userId } = await joinRoom(creator, joiner, roomCode)

      assert.notStrictEqual(code, creatorCode)
      assert.strictEqual(await creator.verifyUser(userId, code), false)
      await server.close()
    })
  }

  it('never sends the room key in a form the relay can open', async () => {
    const server = await startServer()
    const relayed = []
    server.hooks.connection = (connection, request) => {
      if (!request.url.includes('creator=1')) {
        const send = connection.send.bind(connection)
        connection.send = (message, ...rest) => {
          relayed.push(decode(message, base64ToString))
          send(message, ...rest)
        }
      }
    }
    const creator = createClient(server)
    const joiner = createClient(server)
    const { roomCode } = await createRoom(creator)
    await joinAndVerify(creator, joiner, roomCode)

    const direct = relayed.filter((parts) => parts.U)
    assert.deepStrictEqual(
      direct.filter((parts) => parts.D).map((parts) => JSON.parse(parts.D).type),
      ['_X1'],
    )
    // _X2 and _X4 are encrypted with the handshake key, without an RSA-encrypted key.
    assert.strictEqual(direct.filter((parts) => parts.P && !parts.K).length, 2)
    await server.close()
  })

  it('kicks a joiner whose keys do not match its commitment', async () => {
    const server = await startServer()
    const replacement = await exportPublicKey({ name: 'ECDH', namedCurve: 'P-256' }, 'raw', ['deriveBits'])
    server.hooks.connection = (connection, request) => {
      if (request.url.includes('creator=1')) {
        rewriteDirectMessages(connection, (data) => {
          if (data.type === '_XR') {
            data.publicExchangeKey = replacement
          }
        })
      }
    }
    const creator = createClient(server)
    const joiner = createClient(server)
    const { roomCode } = await createRoom(creator)
    const error = next(creator.onError)
    const left = next(joiner.onRoomLeave)
    joiner.joinRoom(roomCode)

    assert.match((await error).error.message, /commitment/)
    await left
    await server.close()
  })

  it('only verifies the whole code', async () => {
    const server = await startServer()
    const creator = createClient(server)
    const joiner = createClient(server)
    const { roomCode } = await createRoom(creator)
    const { code, userId } = await joinRoom(creator, joiner, roomCode)

    assert.strictEqual(code.length, 6)
    for (const attempt of [code[0], code.slice(0, 5), `${code}A`, '', undefined]) {
      assert.strictEqual(await creator.verifyUser(userId, attempt), false)
    }
    const connected = next(joiner.onConnection, isConnected)
    assert.strictEqual(await creator.verifyUser(userId, ` ${code.toLowerCase()} `), true)
    await connected
    await server.close()
  })

  it('ignores lifecycle messages that a peer forges', async () => {
    const server = await startServer()
    const creator = createClient(server)
    const joiner = createClient(server)
    const { roomCode, userId: creatorId } = await createRoom(creator)
    const joinerId = await joinAndVerify(creator, joiner, roomCode)
    const attacker = await openRawClient(server, roomCode)
    const attackerId = attacker.joined.userId

    const effects = []
    for (const event of ['onRoomJoin', 'onUserLeave', 'onUserVerified']) {
      creator[event].addListener(() => effects.push(event))
    }
    let errors = 0
    const rejected = new Promise((resolve) => creator.onError.addListener(() => {
      if (++errors === 3) {
        resolve()
      }
    }))
    for (const data of [
      { type: '_RJ', protocolVersion: 3, creatorId: attackerId, userId: creatorId, users: [] },
      { type: '_UL', userId: joinerId },
      { type: '_UV', userId: attackerId },
    ]) {
      attacker.send({
        U: creatorId,
        D: JSON.stringify({ ...data, sender: attackerId, senderTime: Date.now() }),
      })
    }
    await rejected

    assert.deepStrictEqual(effects, [])
    const received = next(joiner.onMessage)
    assert.strictEqual(await creator.messageUser({ text: 'still here' }, joinerId), true)
    assert.strictEqual((await received).data.text, 'still here')
    await server.close()
  })

  it('closes an unverified user that messages anyone but the creator', async () => {
    const server = await startServer()
    const creator = createClient(server)
    const joiner = createClient(server)
    const { roomCode } = await createRoom(creator)
    const joinerId = await joinAndVerify(creator, joiner, roomCode)
    const attacker = await openRawClient(server, roomCode)
    const errors = []
    joiner.onError.addListener(({ error }) => errors.push(error))

    attacker.send({
      U: joinerId,
      D: JSON.stringify({ type: '_RJ', protocolVersion: 3, sender: attacker.joined.userId }),
    })
    assert.strictEqual((await attacker.closed).reason, 'invalid_protocol_message')

    // The next message the joiner gets is the creator's.
    const received = next(joiner.onMessage)
    await creator.messageRoom({ text: 'after' })
    assert.strictEqual((await received).data.text, 'after')
    assert.deepStrictEqual(errors, [])
    await server.close()
  })
})

describe('Private data', { timeout: 20000 }, () => {
  it('exchanges private data after verification and checks it on both sides', async () => {
    const server = await startServer()
    const creator = createClient(server)
    const joiner = createClient(server)
    const calls = []
    const { roomCode, userId: creatorId } = await createRoom(creator, {
      privateData: { role: 'creator' },
      verifyPrivateData: ({ data, userId }) => {
        calls.push(['creator', data, userId])
        return data.role === 'joiner'
      },
    })
    const joinerId = await joinAndVerify(creator, joiner, roomCode, {
      privateData: () => ({ role: 'joiner' }),
      verifyPrivateData: ({ data, userId }) => {
        calls.push(['joiner', data, userId])
        return data.role === 'creator'
      },
    })

    assert.deepStrictEqual(calls, [
      ['joiner', { role: 'creator' }, creatorId],
      ['creator', { role: 'joiner' }, joinerId],
    ])
    await server.close()
  })

  for (const side of ['creator', 'joiner']) {
    it(`removes the joiner when the ${side} rejects the private data`, async () => {
      const server = await startServer()
      const creator = createClient(server)
      const joiner = createClient(server)
      const reject = { verifyPrivateData: () => false }
      const { roomCode } = await createRoom(creator, side === 'creator' ? reject : {})
      const { code, userId } = await joinRoom(creator, joiner, roomCode, side === 'joiner' ? reject : {})
      const left = next(creator.onUserLeave)
      const disconnected = next(joiner.onConnection, ({ state }) => state === CONNECTION_DISCONNECTED)
      await creator.verifyUser(userId, code)

      assert.strictEqual((await left).userId, userId)
      await disconnected
      await server.close()
    })
  }
})

describe('Connection robustness', { timeout: 20000 }, () => {
  it('stays connected when an onMessage listener throws', async () => {
    const server = await startServer()
    const creator = createClient(server)
    const joiner = createClient(server)
    const { roomCode } = await createRoom(creator)
    await joinAndVerify(creator, joiner, roomCode)
    const logged = []
    const consoleError = console.error
    console.error = (error) => logged.push(error)
    try {
      creator.onMessage.addListener(() => {
        throw new Error('listener bug')
      })
      const texts = []
      const both = new Promise((resolve) => creator.onMessage.addListener(({ data }) => {
        if (texts.push(data.text) === 2) {
          resolve()
        }
      }))
      await joiner.messageRoom({ text: 'one' })
      await joiner.messageRoom({ text: 'two' })
      await both

      assert.deepStrictEqual(texts, ['one', 'two'])
      assert.strictEqual(logged[0].message, 'listener bug')
      assert.strictEqual(logged.length, 2)
    } finally {
      console.error = consoleError
    }
    await server.close()
  })

  it('buffers a shared message that arrives before _X4 after rejoining', async () => {
    const server = await startServer()
    const creator = createClient(server)
    const joiner = createClient(server)
    const { roomCode } = await createRoom(creator)
    await joinAndVerify(creator, joiner, roomCode)
    const left = next(creator.onUserLeave)
    joiner.leaveRoom()
    await left

    // Deliver the second message encrypted with the handshake key, _X4, after the first room message.
    const NativeWebSocket = globalThis.WebSocket
    let reordered = 0
    globalThis.WebSocket = class extends NativeWebSocket {
      addEventListener (type, listener, options) {
        if (type !== 'message') {
          return super.addEventListener(type, listener, options)
        }
        let handshakes = 0
        let held = null
        super.addEventListener('message', (event) => {
          const parts = decode(event.data, base64ToString)
          if (parts.P && !parts.K && ++handshakes === 2) {
            held = event
            return
          }
          listener(event)
          if (held && parts.E) {
            listener(held)
            held = null
            reordered++
          }
        }, options)
      }
    }
    creator.onUserVerified.addListener(() => creator.messageRoom({ text: 'early' }), { once: true })
    const received = next(joiner.onMessage)
    const errors = []
    joiner.onError.addListener(({ error }) => errors.push(error))
    try {
      await joinAndVerify(creator, joiner, roomCode)
    } finally {
      globalThis.WebSocket = NativeWebSocket
    }

    assert.strictEqual((await received).data.text, 'early')
    assert.strictEqual(reordered, 1)
    const after = next(joiner.onMessage)
    await creator.messageRoom({ text: 'later' })
    assert.strictEqual((await after).data.text, 'later')
    assert.deepStrictEqual(errors, [])
    await server.close()
  })

  it('reports socket errors as { error, event } and disconnects', async () => {
    const server = await startServer()
    const client = createClient(server)
    await server.close()
    const error = next(client.onError)
    const disconnected = next(client.onConnection, ({ state }) => state === CONNECTION_DISCONNECTED)
    client.joinRoom('ABCDEF')

    const data = await error
    assert.strictEqual(data.error.message, 'socket_error')
    assert.ok(data.event)
    await disconnected
  })
})

describe('Room creation failures', { timeout: 20000 }, () => {
  it('reports a refused room creation and can create or join a room afterwards', async () => {
    let address = 'first'
    const server = await startServer({
      getRemoteAddress: () => address,
      roomCreationsPerAddress: 1,
    })
    await fetch(`${server.httpUrl}/create-room`, { method: 'POST' })
    const client = createClient(server)
    const error = next(client.onError)

    assert.strictEqual(await client.createRoom(), undefined)
    assert.strictEqual((await error).error.message, 'room_creation_failed:429')

    // The client can still join a room...
    address = 'second'
    const creator = createClient(server)
    const { roomCode } = await createRoom(creator)
    await joinAndVerify(creator, client, roomCode)
    const disconnected = next(client.onConnection, ({ state }) => state === CONNECTION_DISCONNECTED)
    client.leaveRoom()
    await disconnected

    // ...and create one.
    address = 'third'
    assert.ok((await createRoom(client)).roomCode)
    await server.close()
  })

  it('lets another address create a room while one floods the endpoint', async () => {
    let address = 'flood'
    const server = await startServer({
      getRemoteAddress: () => address,
      roomCreationsGlobal: 3,
      roomCreationsPerAddress: 1,
    })
    const statuses = []
    for (let index = 0; index < 10; index++) {
      statuses.push((await fetch(`${server.httpUrl}/create-room`, { method: 'POST' })).status)
    }
    assert.deepStrictEqual(statuses, [200, ...Array(9).fill(429)])

    address = 'fresh'
    const creator = createClient(server)
    assert.ok((await createRoom(creator)).roomCode)
    await server.close()
  })
})

describe('Synchronized state', { timeout: 30000 }, () => {
  const createSynchronizer = (server, publicState) =>
    createClient(server, {}, (options) => createClientSynchronizer(options, {}, publicState))

  /**
   * Creates a room with a synchronizer as the creator, and lets each given client join and be verified. Resolves once the joining synchronizers received the first synchronised state.
   */
  const setUpRoom = async (creator, joiners) => {
    const { roomCode } = await createRoom(creator)
    for (const joiner of joiners) {
      const synchronised = joiner.publicState &&
        next(joiner.onMessage, ({ data }) => data.type === '_SS')
      await joinAndVerify(creator, joiner, roomCode)
      await synchronised
    }
  }

  it('ends with the same state when two users change the same key at once', async () => {
    const server = await startServer()
    const creator = createSynchronizer(server, { value: 'start' })
    const joiner = createSynchronizer(server, {})
    await setUpRoom(creator, [joiner])
    assert.deepStrictEqual({ ...joiner.publicState }, { value: 'start' })

    for (let round = 0; round < 5; round++) {
      const received = [creator, joiner].map((client) =>
        next(client.onMessage, ({ data }) => data.type === '_SU'))
      creator.publicState.value = `creator ${round}`
      joiner.publicState.value = `joiner ${round}`
      creator.sendUpdate()
      joiner.sendUpdate()
      await Promise.all(received)

      assert.deepStrictEqual({ ...creator.publicState }, { ...joiner.publicState })
    }
    await server.close()
  })

  it('disconnects nobody when a peer sends a poisoned update or a state of its own', async () => {
    const server = await startServer()
    const creator = createSynchronizer(server, { value: 1 })
    const victim = createSynchronizer(server, {})
    const attacker = createClient(server)
    await setUpRoom(creator, [victim, attacker])

    const errors = [creator, victim].map((client) => {
      const messages = []
      client.onError.addListener(({ error }) => messages.push(error.message))
      return messages
    })
    const rejected = [creator, victim].map((client) =>
      next(client.onError, ({ error }) => error.message === 'synchronized_state_not_from_creator'))
    await attacker.messageRoom({
      type: '_SU',
      identifier: 'poison',
      stateDelta: [{ type: 'set', path: ['__proto__', 'polluted'], new: true }],
      time: Date.now(),
    })
    await attacker.messageRoom({
      type: '_SS',
      state: { hacked: true },
      time: Date.now(),
    })
    await Promise.all(rejected)

    assert.deepStrictEqual(errors, [
      ['invalid_state_delta', 'synchronized_state_not_from_creator'],
      ['invalid_state_delta', 'synchronized_state_not_from_creator'],
    ])
    for (const client of [creator, victim]) {
      assert.deepStrictEqual({ ...client.publicState }, { value: 1 })
      assert.strictEqual(client.privateState.connectionState, CONNECTION_CONNECTED)
    }
    assert.strictEqual({}.polluted, undefined)

    // Both still receive the next update.
    const received = next(victim.onMessage, ({ data }) => data.type === '_SU')
    creator.publicState.value = 2
    creator.sendUpdate()
    await received
    assert.deepStrictEqual({ ...victim.publicState }, { value: 2 })
    await server.close()
  })
})
