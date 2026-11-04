import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import {
  after,
  describe,
  it,
} from 'node:test'

import { WebSocketServer } from 'ws'

import { createClientConnector } from '../../src/library/client-connector.js'
import {
  CONNECTION_CONNECTED,
  CONNECTION_DISCONNECTED,
} from '../../src/library/message-types.js'
import { createServerConnector } from '../../src/library/server-connector.js'

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
