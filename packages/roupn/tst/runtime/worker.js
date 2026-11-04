import { resolveObjectURL } from 'node:buffer'
import { Worker as ThreadWorker } from 'node:worker_threads'

// Node has no browser Worker, so run the worker scripts from Blob URLs in a worker thread instead.
if (typeof globalThis.Worker === 'undefined') {
  globalThis.Worker = class extends EventTarget {
    constructor (url) {
      super()
      this._thread = resolveObjectURL(url).text().then((code) => {
        const thread = new ThreadWorker(
          `const { parentPort } = require('node:worker_threads')
          const self = {
            addEventListener: (type, listener) => parentPort.on(type, (data) => listener({ data })),
            postMessage: (data) => parentPort.postMessage(data),
          }
          ${code}`,
          { eval: true },
        )
        thread.on('message', (data) => this.dispatchEvent(new MessageEvent('message', { data })))
        thread.on('error', (error) => {
          const event = new Event('error')
          event.error = error
          this.dispatchEvent(event)
        })
        return thread
      })
    }

    postMessage (data) {
      this._thread.then((thread) => thread.postMessage(data))
    }

    terminate () {
      this._thread.then((thread) => thread.terminate())
    }
  }
}
