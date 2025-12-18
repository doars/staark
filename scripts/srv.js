#!/usr/bin/env node

import fs from 'fs'
import http from 'http'
import path from 'path'

// Configuration
const PORT = process.env.PORT || 3000
const LOG_LEVEL = process.env.SRV_LOG_LEVEL || 2

const logDebug = (...args) => {
  if (LOG_LEVEL >= 3) {
    console.debug('[srv:debug]', ...args)
  }
}
const logInfo = (...args) => {
  if (LOG_LEVEL >= 2) {
    console.log('[srv:info]', ...args)
  }
}
const logWarn = (...args) => {
  if (LOG_LEVEL >= 1) {
    console.warn('[srv:warn]', ...args)
  }
}
const logError = (...args) => {
  if (LOG_LEVEL >= 0) {
    console.error('[srv:error]', ...args)
  }
}

const targetDirectory = process.argv[2]
if (!targetDirectory) {
  logInfo('Error: No directory specified.')
  logInfo('Usage: bun srv.js <directory-to-serve>')
  logInfo('Example: bun srv.js ./examples')
  process.exit(1)
}

const targetDirectoryResolved = path.resolve(targetDirectory)
if (!fs.existsSync(targetDirectoryResolved)) {
  logError(`Script "${targetDirectoryResolved}" not found.`)
  process.exit(1)
}

const MIME_TYPE_DEFAULT = 'application/octet-stream'
const MIME_TYPE_PLAIN = 'text/plain'
const MIME_TYPE_HTML = 'text/html'
const mimeTypes = {
  '.7z': 'application/x-7z-compressed',
  '.aac': 'audio/aac',
  '.avi': 'video/x-msvideo',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.cjs': 'text/javascript',
  '.css': 'text/css',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.eot': 'application/vnd.ms-fontobject',
  '.epub': 'application/epub+zip',
  '.gif': 'image/gif',
  '.gz': 'application/gzip',
  '.htm': MIME_TYPE_HTML,
  '.html': MIME_TYPE_HTML,
  '.ics': 'text/calendar',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.jsonld': 'application/ld+json',
  '.md': 'text/markdown',
  '.mid': 'audio/midi',
  '.midi': 'audio/midi',
  '.mjs': 'text/javascript',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.mpeg': 'video/mpeg',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.oga': 'audio/ogg',
  '.ogv': 'video/ogg',
  '.ogx': 'application/ogg',
  '.opd': 'application/vnd.oasis.opendocument.presentation',
  '.opus': 'audio/ogg',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.rar': 'application/vnd.rar',
  '.rtf': 'text/rtf',
  '.svg': 'image/svg+xml',
  '.tar': 'application/x-tar',
  '.tsv': 'text/tab-separated-value',
  '.txt': MIME_TYPE_PLAIN,
  '.wav': 'audio/wav',
  '.weba': 'audio/webm',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xhtml': 'application/xhtml+xml',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xml': 'text/xml',
  '.zip': 'application/zip',
}

const stylesheet = `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
}
.container {
  padding: 1rem;
}
h1 {
  margin: 1rem;
}
ul {
  list-style-type: none;
  padding-left: 0;
}
li {
  margin-bottom: 0;
  padding: 0;
}
a {
  display: block;
  padding: 0.5rem 1rem;
  text-decoration: none;
  border-radius: 0.25rem;
}
a:hover {
  background-color: #eee;
  text-decoration: underline;
  pointer: cursor;
}
`

/**
 * Determines the MIME type of a file based on its extension.
 * @param {string} filePath - The path to the file.
 * @returns {string} The MIME type.
 */
const getMimeType = (
  filePath,
) => {
  const extension = path.extname(filePath).toLowerCase()
  return (
    mimeTypes[extension]
    || MIME_TYPE_DEFAULT
  )
}

/**
 * Generates an HTML string for listing directory contents.
 * @param {string} currentLogicalPath - The current logical path being viewed (relative to rootDir).
 * @param {fs.Dirent[]} entries - An array of directory entries.
 * @returns {string} HTML string for the directory listing.
 */
const generateDirectoryListingHTML = (
  currentLogicalPath,
  entries,
) => {
  // Ensure currentLogicalPath starts with a slash for display and consistency.
  const displayPath = (
    currentLogicalPath.startsWith('/')
      ? currentLogicalPath
      : ('/' + currentLogicalPath)
  )

  // For link generation, ensure the base path for entries ends with a slash if it's not the root.
  let basePathForLinks = displayPath
  if (
    basePathForLinks !== '/'
    && !basePathForLinks.endsWith('/')
  ) {
    basePathForLinks += '/'
  }

  let listItems = ''
  // Add ".." link to go to the parent directory, if not in the root.
  if (displayPath !== '/') {
    const parentPathSegments = displayPath.split('/').filter(Boolean)
    // Remove the current directory segment.
    parentPathSegments.pop()
    const parentPath = `/${parentPathSegments.join('/')}`
    listItems += `<li><a href="${parentPath === '/' && parentPathSegments.length > 0 ? parentPath + '/' : parentPath}">../</a></li>`
  }

  // Sort entries: directories first, then files, alphabetically.
  entries.sort((
    a,
    b,
  ) => {
    if (
      a.isDirectory()
      && !b.isDirectory()
    ) {
      return -1
    }

    if (
      !a.isDirectory()
      && b.isDirectory()
    ) {
      return 1
    }

    return a.name.localeCompare(b.name)
  })

  for (const entry of entries) {
    // Skip dotfiles/dot-directories and node_modules in the listing itself.
    if (
      entry.name.startsWith('.')
      || entry.name === 'node_modules'
    ) {
      continue
    }
    const entryDisplayName = entry.name + (
      entry.isDirectory()
        ? '/'
        : ''
    )
    // Construct the link for the entry.
    const entryLink = basePathForLinks + entryDisplayName
    listItems += `<li><a href="${entryLink}">${entryDisplayName}</a></li>`
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Index of ${displayPath}</title>
    <style>${stylesheet}</style>
  </head>
  <body>
    <div class="container">
      <h1>Index of ${displayPath}</h1>
      <ul>
        ${listItems}
      </ul>
    </div>
  </body>
</html>`
}

/**
 * Starts the development server.
 * @param {string} rootDirArg - The root directory to serve files from.
 */
const startServer = async (
  rootDirectory
) => {
  const server = http.createServer(async (
    request,
    response,
  ) => {
    const {
      method,
      url,
    } = request

    if (!url.endsWith('/favicon.ico')) {
      logDebug(`Requesting ${method} ${url}`)
    }

    if (method !== 'GET') {
      response.writeHead(405, {
        'Content-Type': MIME_TYPE_PLAIN,
      })
      response.end('Method Not Allowed')
      return
    }

    try {
      // Decode and normalize the requested URL path. Remove query parameters for path resolution.
      let requestedLogicalPath = decodeURIComponent(
        url.split('?')[0],
      )

      // Check for forbidden path segments (dotfiles, node_modules). This check is on the logical path requested by the client.
      const pathSegments = requestedLogicalPath.split('/').filter(Boolean)
      if (
        pathSegments.some(
          segment => (
            segment.startsWith('.')
            || segment === 'node_modules'
          )
        )
      ) {
        logWarn(`Forbidden: Attempt to access restricted path segment in "${requestedLogicalPath}"`)

        response.writeHead(403, {
          'Content-Type': MIME_TYPE_PLAIN,
        })
        response.end('Forbidden: Access to dotfiles, dot-directories, or node_modules is not allowed.')
        return
      }

      // Construct the full file system path. path.join normalizes the path (e.g. /foo/../bar -> /bar) requestedLogicalPath is relative to the rootDir. If requestedLogicalPath starts with '/', path.join treats it as absolute, so strip leading slash.
      const effectiveRelativePath = (
        requestedLogicalPath.startsWith('/')
          ? requestedLogicalPath.substring(1)
          : requestedLogicalPath
      )
      const fileSystemPath = path.join(rootDirectory, effectiveRelativePath)

      // Path traversal check. Ensure the resolved path is within the root directory.
      if (
        !fileSystemPath.startsWith(rootDirectory + path.sep)
        && fileSystemPath !== rootDirectory
      ) {
        logWarn(`Forbidden: Path traversal attempt for "${fileSystemPath}" (from "${requestedLogicalPath}")`)

        response.writeHead(403, {
          'Content-Type': MIME_TYPE_PLAIN,
        })
        response.end('Forbidden: Access outside of the served directory is not allowed.')
        return
      }

      let stats
      try {
        stats = await fs.promises.stat(fileSystemPath)
      } catch (error) {
        if (error.code === 'ENOENT') {
          if (!fileSystemPath.endsWith('/favicon.ico')) {
            logWarn(`Not Found: ${fileSystemPath}`)
          }

          response.writeHead(404, {
            'Content-Type': MIME_TYPE_PLAIN,
          })
          response.end('Not Found')
        } else {
          logError(`Error stating file ${fileSystemPath}: ${error.message}`)

          response.writeHead(500, {
            'Content-Type': MIME_TYPE_PLAIN,
          })
          response.end('Internal Server Error')
        }
        return
      }

      if (stats.isDirectory()) {
        // Try to serve index.html from the directory.
        const indexPath = path.join(fileSystemPath, 'index.html')
        try {
          // Check if index.html exists and is readable.
          logInfo(`${method} ${url}`)

          await fs.promises.access(indexPath, fs.constants.R_OK)
          const indexContent = await fs.promises.readFile(indexPath)
          response.writeHead(200, {
            'Content-Type': MIME_TYPE_HTML,
          })
          response.end(indexContent)
        } catch (error) {
          // index.html not found or not readable, serve directory listing.
          logInfo(`${method} ${url}`)

          const entries = await fs.promises.readdir(fileSystemPath, {
            withFileTypes: true,
          })
          const htmlListing = generateDirectoryListingHTML(requestedLogicalPath, entries)
          response.writeHead(200, {
            'Content-Type': MIME_TYPE_HTML,
          })
          response.end(htmlListing)
        }
      } else if (stats.isFile()) {
        logInfo(`${method} ${url}`)

        const mimeType = getMimeType(fileSystemPath)
        const fileContent = await fs.promises.readFile(fileSystemPath)
        response.writeHead(200, {
          'Content-Type': mimeType,
        })
        response.end(fileContent)
      } else {
        // This case should ideally not be reached if fs.promises.stat was successful.
        logWarn(`Unknown resource type: ${fileSystemPath}`)

        response.writeHead(500, {
          'Content-Type': MIME_TYPE_PLAIN,
        })
        response.end('Internal Server Error: Unknown resource type')
      }
    } catch (error) {
      logError(`Unhandled error processing request ${url}: ${error.stack || error.message}`)

      if (!response.headersSent) {
        response.writeHead(500, {
          'Content-Type': MIME_TYPE_PLAIN,
        })
      }
      if (!response.writableEnded) {
        // Check if we can still write to the response.
        response.end('Internal Server Error')
      }
    }
  })

  server.listen(PORT, () => {
    logInfo(`Listening on http://localhost:${PORT}`)
    logInfo(`Serving: ${rootDirectory}`)
    logInfo('Press Ctrl+C to stop.')
  })

  server.on('error', (
    error,
  ) => {
    if (error.code === 'EADDRINUSE') {
      logError(`Port ${PORT} is already in use. Try a different port or stop the existing process.`)
    } else {
      logError(`${error.message}`)
    }
    process.exit(1)
  })
}

startServer(
  targetDirectoryResolved,
)
