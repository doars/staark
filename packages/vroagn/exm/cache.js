/**
 * @typedef {Object} CacheOptions
 * @property {string} [name]
 * @property {number} [ttl] - Fallback time-to-live in milliseconds for cache validity if headers don't provide it
 */

const FALLBACK_TTL = 60 * 60 * 1000 // One hour.

const openCaches = {}

/**
 * @param {CacheOptions} [cacheOptions={}]
 * @returns {function(Request|string, RequestInit=): Promise<Response>}
 */
export const cacheFetch = (
  cacheOptions = {},
) => {
  return async (
    request,
    requestOptions = {},
  ) => {
    // Bypass caching if no cache name is provided or if cache is explicitly disabled.
    if (requestOptions.cache === 'no-store') {
      return await fetch(request, requestOptions)
    }

    const cacheName = cacheOptions.name ?? 'vroagn-cache'
    let cache = null
    if (openCaches[cacheName]) {
      cache = openCaches[cacheName]
    } else {
      cache = openCaches[cacheName] = await caches.open(cacheName)
    }

    const fetchFromNetworkAndCache = async () => {
      const networkResponse = await fetch(request, requestOptions)
      const cacheControl = networkResponse.headers.get('Cache-Control')
      const noStore = cacheControl?.includes('no-store') || false

      // Cache the response if it's successful and allowed.
      if (
        networkResponse.status === 200
        && !noStore
      ) {
        const clonedResponse = networkResponse.clone()
        const headers = new Headers(clonedResponse.headers)
        headers.set('date', new Date().toUTCString())

        const responseWithDate = new Response(clonedResponse.body, {
          status: clonedResponse.status,
          statusText: clonedResponse.statusText,
          headers: headers,
        })
        await cache.put(request, responseWithDate)
      }

      return networkResponse
    }

    // Handle the cache option in requestOptions.
    if (requestOptions.cache) {
      switch (requestOptions.cache) {
        case 'reload':
          await cache.delete(request)
          return await fetchFromNetworkAndCache()

        case 'no-cache': {
          const cachedResponse = await cache.match(request)
          if (cachedResponse) {
            const cacheControl = cachedResponse.headers.get('Cache-Control')
            if (
              cacheControl
              && cacheControl.includes('no-cache')
            ) {
              await cache.delete(request)
              return await fetchFromNetworkAndCache()
            }
          }
          return await fetchFromNetworkAndCache()
        }

        case 'force-cache': {
          const cachedResponse = await cache.match(request)
          if (cachedResponse) {
            return cachedResponse
          }
          return await fetchFromNetworkAndCache()
        }

        case 'only-if-cached': {
          const cachedResponse = await cache.match(request)
          if (!cachedResponse) {
            throw new Error('Request failed because no cached response is available')
          }
          return cachedResponse
        }

        default:
          // Continue for the 'default' cache option.
          break
      }
    }

    // Check if a valid cached response is available
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      const cacheControl = cachedResponse.headers.get('Cache-Control')
      const expiresHeader = cachedResponse.headers.get('Expires')

      if (cacheControl) {
        const noStore = cacheControl.includes('no-store')
        const noCache = cacheControl.includes('no-cache')
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
        const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : null

        if (noStore || noCache) {
          await cache.delete(request)
          return fetchFromNetworkAndCache()
        }

        if (maxAge !== null) {
          const cachedTime = new Date(cachedResponse.headers.get('date') || 0).getTime()
          const now = Date.now()
          const age = (now - cachedTime) / 1000

          if (age > maxAge) {
            await cache.delete(request)
            return fetchFromNetworkAndCache()
          }
        }
      } else if (expiresHeader) {
        const expires = new Date(expiresHeader).getTime()
        if (Date.now() > expires) {
          await cache.delete(request)
          return fetchFromNetworkAndCache()
        }
      } else {
        const dateHeader = cachedResponse.headers.get('date')
        if (dateHeader) {
          const cachedTime = new Date(dateHeader).getTime()
          const now = Date.now()
          const age = now - cachedTime
          if (age > (cacheOptions.ttl ?? FALLBACK_TTL)) {
            await cache.delete(request)
            return fetchFromNetworkAndCache()
          }
        }
      }

      return cachedResponse
    }

    return fetchFromNetworkAndCache()
  }
}
