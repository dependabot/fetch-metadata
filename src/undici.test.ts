import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { AddressInfo } from 'node:net'
import { Duplex } from 'node:stream'
import { WebSocket } from 'undici'

test('rejects an unrequested WebSocket subprotocol without an uncaught exception', async () => {
  const server = createServer()
  let connection: Duplex | undefined
  server.on('upgrade', (request, socket) => {
    connection = socket
    const accept = createHash('sha1')
      .update(`${request.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64')
    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      'Sec-WebSocket-Protocol: unsolicited',
      '',
      ''
    ].join('\r\n'))
  })

  server.listen(0, '127.0.0.1')
  await once(server, 'listening')

  try {
    const { port } = server.address() as AddressInfo
    const socket = new WebSocket(`ws://127.0.0.1:${port}`)
    const onOpen = jest.fn()
    socket.addEventListener('open', onOpen)
    const message = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Expected handshake rejection')), 3000)
      socket.addEventListener('error', event => {
        clearTimeout(timeout)
        resolve(event.message)
      }, { once: true })
    })

    expect(message).toBe('Protocol was not set in the opening handshake.')
    expect(onOpen).not.toHaveBeenCalled()
  } finally {
    connection?.destroy()
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
    })
  }
})
