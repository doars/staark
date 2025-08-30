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

// Import the library.
import {
    createServerConnector,
} from '../src/library/server-connector.js'

const PORT = 3000
const FILE_NAME = fileURLToPath(import.meta.url)
const DIRECTORY_NAME = dirname(FILE_NAME)

// Create a server connector instance.
const {
  onUserJoin,
  onUserLeave,
  onRoomMessage,
  onRoomRemove,

  handleHttpRequest,
  handleSocketUpgrade,

  // Additional functions and events are also exported.
} = createServerConnector({
  // Configuration options.
})

// Log events so we can see what is happening.
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

// Set up the HTTP server.
const httpServer = createHttpServer((
  request,
  response,
) => {
  const url = request.url

  // Provide the data to the client.
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

  // The connector handles requests to the /create-room endpoint.
  const handled = handleHttpRequest(
    request,
    response,
  )
  if (!handled) {
    // Handle other requests or return 404.
    response.writeHead(404)
    response.end('Not found')
  }
})

// Set up the WebSocket server.
const socketServer = new WebSocketServer({
  noServer: true,
})
httpServer.on('upgrade', (
  request,
  socket,
  head,
) => {
  // The connector handles upgrades for the /join-room endpoint.
  const handled = handleSocketUpgrade(
    request,
    socket,
    head,
    socketServer,
  )
  if (!handled) {
    socket.destroy()
  }
})

// Start the server.
httpServer.listen(PORT, () => {
  console.log('HTTP server listening on http://localhost:' + PORT)
})
