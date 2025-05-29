/**
 * Type definition for event listener options.
 * @typedef {Object} EventListenerOptions
 * @property {boolean} [once] - If true, the listener will be removed after the first call.
 */

/**
 * Type definition for an event listener callback.
 * @typedef {(data: any) => void} EventListenerCallback
 */

/**
 * Type definition for the event object returned by createEvent.
 * @typedef {Object} Event
 * @property {(callback: EventListenerCallback, options?: EventListenerOptions) => void} addListener
 * @property {(callback: EventListenerCallback) => void} removeListener
 * @property {(data: any) => void} dispatch
 */

/**
 * Creates a custom event system with add, remove, and dispatch capabilities.
 *
 * @returns {Event} An event object with methods to manage listeners.
 */
export const createEvent = () => {
  /** @type {Map<EventListenerCallback, EventListenerOptions | undefined>} */
  const listeners = new Map()

  return {
    /**
     * Adds a listener callback for the event.
     * @param {EventListenerCallback} callback - The listener function to add.
     * @param {EventListenerOptions} [options] - Optional options for the listener (e.g., { once: true }).
     */
    addListener: (
      callback,
      options
    ) => {
      if (!listeners.has(callback)) {
        listeners.set(callback, options)
      }
    },

    /**
     * Removes a listener callback from the event.
     * @param {EventListenerCallback} callback - The listener function to remove.
     */
    removeListener: (
      callback,
    ) => {
      listeners.delete(callback)
    },

    /**
     * Dispatches the event to all registered listeners.
     * @param {any} data - Data to pass to each listener callback.
     */
    dispatch: (
      data,
    ) => {
      for (const [listener, options] of listeners.entries()) {
        listener(data)
        if (
          options
          && options.once
        ) {
          listeners.delete(listener)
        }
      }
    },
  }
}
