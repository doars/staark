export const CREATED_EVENT = 'staark-created'

export type CustomEventListener = (
  event: CustomEvent,
) => unknown

export const onCreated = (
  id: string,
  callback: CustomEventListener,
) => {
  const handleEvent = (
    event: Event,
  ) => {
    if ((event as CustomEvent).detail.target.getAttribute('id') === id) {
      document.body.removeEventListener(
        CREATED_EVENT,
        handleEvent,
      )

      callback(event as CustomEvent)
    }
  }

  document.body.addEventListener(
    CREATED_EVENT,
    handleEvent,
  )
}
