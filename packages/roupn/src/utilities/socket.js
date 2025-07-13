/**
 * Creates a message that can be send over the websocket to close the connection.
 *
 * @param {object} request - The request that has been upgraded to a socket.
 * @param {string} status - Status of the message.
 * @param {string} contentType - The content type of the message data.
 * @param {string} message - Message data to provide to the client.
 * @returns The message to send over the socket.
 */
export const closeMessage = (
  request,
  status,
  contentType,
  message,
) => [
  'HTTP/' + request.httpVersion + ' ' + status,
  'Connection: close',
  'Content-Type: ' + contentType,
  'Content-Length: ' + Buffer.byteLength(message),
  '',
  message,
].join('\r\n')
