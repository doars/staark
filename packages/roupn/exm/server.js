import {
  createReadStream,
} from 'fs'
import {
  createServer as createHttpServer,
} from 'http'
import {
  dirname,
  join,
} from 'path'
import {
  fileURLToPath,
} from 'url'
import {
  WebSocketServer,
} from 'ws'

import {
  createServerConnector,
} from '../src/library/server-connector.js'

const PORT = 3000
const FILE_NAME = fileURLToPath(import.meta.url)
const DIRECTORY_NAME = dirname(FILE_NAME)

const {
  onUserJoin,
  onUserLeave,
  onRoomMessage,
  onRoomRemove,

  handleHttpRequest,
  handleSocketUpgrade,
} = createServerConnector({
  maxUsersPerRoom: 4,
  rateLimitDuration: 0,
})

onUserJoin.addListener(({
  userId,
  roomCode,
}) => {
  console.log(`User ${userId} joined room ${roomCode}`)
})
onUserLeave.addListener(({
  userId,
  roomCode,
}) => {
  console.log(`User ${userId} left room ${roomCode}`)
})
onRoomMessage.addListener(({
  sender,
  roomCode,
}) => {
  console.log(`User ${sender} sent message to room ${roomCode}`)
})
onRoomRemove.addListener(({
  roomCode,
}) => {
  console.log(`Room ${roomCode} is empty`)
})

const httpServer = createHttpServer((
  request,
  response,
) => {
  const url = request.url

  const staticFiles = {
    '/': {
      file: 'index.html',
      type: 'text/html',
    },
    '/index.html': {
      file: 'index.html',
      type: 'text/html',
    },
    '/client.iife.js': {
      file: 'client.iife.js',
      type: 'application/javascript',
    },
    '/client.iife.js.map': {
      file: 'client.iife.js.map',
      type: 'application/json',
    },
  }
  if (staticFiles[url]) {
    const { file, type } = staticFiles[url]
    response.writeHead(200, {
      'Content-Type': type,
    })
    createReadStream(
      join(DIRECTORY_NAME, file),
    ).pipe(response)
    return
  }

  const found = handleHttpRequest(
    request,
    response,
  )
  if (!found) {
    response.writeHead(404)
    response.end('Not found')
  }
})

const socketServer = new WebSocketServer({
  noServer: true,
})
httpServer.on('upgrade', (
  request,
  socket,
  head,
) => {
  const success = handleSocketUpgrade(
    request,
    socket,
    head,
    socketServer,
  )
  if (!success) {
    socket.destroy()
  }
})

httpServer.listen(PORT, () => {
  console.log('HTTP server listening on http://localhost:' + PORT)
  console.log('WebSocket server listening on ws://localhost:' + PORT)
})
