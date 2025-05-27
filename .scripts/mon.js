import {
  spawn,
} from 'child_process'
import {
  existsSync,
  readFileSync,
  statSync,
} from 'fs'
import {
  watch,
} from 'chokidar'
import {
  basename,
  resolve,
  dirname,
} from 'path'
import detective from 'detective-es6'

const DEBOUNCE_TIMEOUT = 200
const SHUTDOWN_TIMEOUT = 1000
// Numeric log levels:
const LOG_LEVEL = process.env.MON_LOG_LEVEL || 2
const logDebug = (...args) => {
  if (LOG_LEVEL >= 3) {
    console.debug('[mon:debug]', ...args)
  }
}
const logInfo = (...args) => {
  if (LOG_LEVEL >= 2) {
    console.log('[mon:info]', ...args)
  }
}
const logWarn = (...args) => {
  if (LOG_LEVEL >= 1) {
    console.warn('[mon:warn]', ...args)
  }
}
const logError = (...args) => {
  if (LOG_LEVEL >= 0) {
    console.error('[mon:error]', ...args)
  }
}

const targetScriptFullPath = process.argv[2]

if (!targetScriptFullPath) {
  console.log('Error: No script specified.')
  console.log('Usage: node mon.js <script-to-run.js>')
  console.log('Example: node mon.js server.js')
  process.exit(1)
}

const targetScript = resolve(targetScriptFullPath)

if (!existsSync(targetScript)) {
  logError(`Script "${targetScript}" not found.`)
  process.exit(1)
}

let childProcess = null
let debounceTimeout = null
let isRestarting = false
let watchedFiles = new Set()
let watcher = null

const resolveLocalDependency = (
  dependencyRequest,
  parentFilePath
) => {
  const parentDirectory = dirname(parentFilePath)

  let resolvedPath = null

  try {
    const potentialPath = require.resolve(dependencyRequest, {
      paths: [
        parentDirectory,
      ]
    })
    if (
      !potentialPath.includes('node_modules')
      && existsSync(potentialPath)
    ) {
      const stats = statSync(potentialPath)
      if (
        stats.isFile()
      ) {
        resolvedPath = potentialPath
      } else if (
        stats.isDirectory()
      ) {
        const indexExtensions = ['.js', '.mjs']
        for (const extension of indexExtensions) {
          const indexFile = resolve(potentialPath, 'index' + extension)
          if (
            existsSync(indexFile)
            && statSync(indexFile).isFile()
          ) {
            resolvedPath = indexFile
            break
          }
        }
      }
    }
  } catch (error) {
    // Silently fall through to manual resolution for relative paths.
  }

  if (
    !resolvedPath
    && (
      dependencyRequest.startsWith('./')
      || dependencyRequest.startsWith('../')
    )
  ) {
    const baseAttemptPath = resolve(parentDirectory, dependencyRequest)
    // Prioritize .js, .mjs as per detective-es6 focus.  An explicit import like './config.json' will have baseAttemptPath ending in '.json'.  The ext === '' check will then verify its existence.
    const extensions = ['', '.js', '.mjs']

    for (const extension of extensions) {
      const testPath = baseAttemptPath + extension
      if (
        existsSync(testPath)
        && statSync(testPath).isFile()
        && !testPath.includes('node_modules')
      ) {
        resolvedPath = testPath
        break
      }
    }

    if (
      !resolvedPath
      && existsSync(baseAttemptPath)
      && statSync(baseAttemptPath).isDirectory()
    ) {
      const indexExtensions = ['.js', '.mjs']
      for (const extension of indexExtensions) {
        const indexFilePath = resolve(baseAttemptPath, 'index' + extension)
        if (
          existsSync(indexFilePath)
          && statSync(indexFilePath).isFile()
          && !indexFilePath.includes('node_modules')
        ) {
          resolvedPath = indexFilePath
          break
        }
      }
    }
  }

  if (
    resolvedPath
    && resolvedPath.includes('node_modules')
  ) {
    return null
  }

  return (
    resolvedPath
      ? resolve(resolvedPath)
      : null
  )
}

const collectDependencies = async (
  filePath,
  allDependenciesSet,
  visitedSet,
) => {
  const absoluteFilePath = resolve(filePath)

  if (
    visitedSet.has(absoluteFilePath)
    || absoluteFilePath.includes('node_modules')
  ) {
    return
  }
  visitedSet.add(absoluteFilePath)

  try {
    if (!existsSync(absoluteFilePath)) {
      return
    }
    const stats = statSync(absoluteFilePath)
    if (!stats.isFile()) {
      return
    }

    allDependenciesSet.add(absoluteFilePath)

    const fileExtension = (
      basename(absoluteFilePath).includes('.')
        ? absoluteFilePath.split('.').pop().toLowerCase()
        : ''
    )

    // Only parse .js or .mjs files for further ES6 imports.
    if (!['js', 'mjs'].includes(fileExtension)) {
      return
    }

    const content = readFileSync(absoluteFilePath, 'utf-8')
    const dependencies = detective(content)

    for (const dep of dependencies) {
      const resolvedDepPath = resolveLocalDependency(dep, absoluteFilePath)
      if (resolvedDepPath) {
        await collectDependencies(resolvedDepPath, allDependenciesSet, visitedSet)
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      logWarn(`Referenced file not found: ${absoluteFilePath} (Error: ${error.message})`)
    } else if (
      error.message
      && (
        error.message.includes('Parsing error')
        || error.name === 'SyntaxError'
      )
    ) {
      logWarn(`Parsing error in ${absoluteFilePath}: ${error.message.split('\n')[0]}`)
    } else {
      logWarn(`Error processing ${absoluteFilePath} for dependencies: ${error.message}`)
    }
  }
}

const updateWatchedFiles = async (
) => {
  const newWatchedFiles = new Set()
  await collectDependencies(
    targetScript,
    newWatchedFiles,
    new Set(),
  )

  if (existsSync(targetScript)) {
    // Ensure target script itself is always watched.
    newWatchedFiles.add(targetScript)
  }

  const oldFilesArray = Array.from(watchedFiles).sort()
  const newFilesArray = Array.from(newWatchedFiles).sort()

  if (
    JSON.stringify(oldFilesArray) !== JSON.stringify(newFilesArray)
  ) {
    const newBaseNames = newFilesArray.map(filePath => basename(filePath))
    if (newBaseNames.length > 10) {
      logDebug(`Monitored files updated, now watching ${newBaseNames.length} files (including ${basename(targetScript)} and its ${newBaseNames.length > 0 ? newBaseNames.length - 1 : 0} unique local dependencies).`)
    } else if (newBaseNames.length > 0) {
      logDebug('Monitored files updated. Now watching:', newBaseNames)
    } else {
      logDebug('Monitored files updated. No files are currently being watched.')
    }
  }
  watchedFiles = newWatchedFiles

  if (
    watchedFiles.size === 0
    && existsSync(targetScript) // Check if target script exists before warning specifically about it
  ) {
    logWarn(`Warning: Dependency scan for ${basename(targetScript)} resulted in an empty set (excluding target itself if it exists). Will only watch the target script if present.`)
    if (existsSync(targetScript)) {
      watchedFiles.add(targetScript)
    }
  } else if (watchedFiles.size === 0) {
    logWarn('Warning: No files are being watched. Check script path and dependencies.')
  }
}

const spawnProcess = (
) => {
  if (childProcess) {
    logWarn('Internal error: Attempted to spawn process while one already exists.')
    return
  }
  isRestarting = false

  logInfo(`Running \`node ${basename(targetScript)}\`...`)
  childProcess = spawn('node', [targetScript,], {
    stdio: 'inherit',
  })
  childProcess.killedByMiniMon = false

  childProcess.on('close', (
    code,
    signal
  ) => {
    // Assume killed by us if childProcess is nullified quickly.
    const wasKilledByUs = childProcess
      ? childProcess.killedByMiniMon
      : true
    if (
      !wasKilledByUs
    ) {
      logWarn(`Script \`${basename(targetScript)}\` exited with code ${code}, signal ${signal}.`)
    }
    // If it exited on its own, childProcess is effectively gone. Check if the childProcess instance that emitted 'close' is the current one.
    if (
      childProcess
      && childProcess.pid === (
        childProcess
        && childProcess.pid
      )
    ) {
      childProcess = null
    }
  })

  childProcess.on('error', (
    error
  ) => {
    logError(`Failed to start or error in script \`${basename(targetScript)}\`: ${error.message}`)
    if (
      childProcess
      && childProcess.pid === (
        childProcess
        && childProcess.pid
      )
    ) {
      childProcess = null
    }
    // Reset flag in case of spawn error.
    isRestarting = false
  })
}

const startOrRestartScript = (
) => {
  if (isRestarting) {
    logInfo('Already in the process of restarting. Ignoring additional trigger.')
    return
  }

  if (childProcess) {
    isRestarting = true
    const previousPid = childProcess.pid
    logDebug(`Attempting to stop current script (\`${basename(targetScript)}\` PID: ${previousPid})...`)
    childProcess.killedByMiniMon = true

    childProcess.removeAllListeners('close')
    childProcess.removeAllListeners('error')

    childProcess.once('exit', (
    ) => {
      // This event fires for the process associated with `childProcess` when `once` was called.  We captured its PID in `previousPid`.
      if (
        childProcess
        && childProcess.pid === previousPid
      ) {
        childProcess = null
      }

      // Only spawn if a restart was intended.
      if (isRestarting) {
        logDebug(`Previous script instance (PID: ${previousPid}) exited.`)
        spawnProcess()
      }
    })

    const success = childProcess.kill('SIGTERM')
    if (
      !success
      && childProcess
    ) {
      logWarn('Failed to send SIGTERM. Process might already be dead or unresponsive.')
      if (childProcess.pid === previousPid) {
        childProcess = null
        if (isRestarting) {
          spawnProcess()
        }
      } else {
        isRestarting = false
      }
      return
    } else if (!childProcess) {
      if (isRestarting) {
        spawnProcess()
      } else {
        isRestarting = false
      }
      return
    }

    const killTimeoutId = setTimeout(() => {
      if (
        childProcess
        && childProcess.pid === previousPid
        && !childProcess.killed
      ) {
        logWarn('Script did not exit gracefully after SIGTERM. Sending SIGKILL.')
        childProcess.kill('SIGKILL')
      }
    }, SHUTDOWN_TIMEOUT)

    if (childProcess) {
      childProcess.once('exit', () => clearTimeout(killTimeoutId))
    }
  } else {
    spawnProcess()
  }
}

const shutdown = (
  signal
) => {
  logInfo(`\n${signal} received. Shutting down...`)
  if (watcher) {
    watcher.close()
  }
  clearTimeout(debounceTimeout)

  if (childProcess) {
    childProcess.killedByMiniMon = true
    childProcess.removeAllListeners()

    childProcess.once('exit', () => {
      logDebug('Child process exited.')
      process.exit(0)
    })

    const sentKill = childProcess.kill('SIGTERM')
    if (
      !sentKill
      && childProcess
      && !childProcess.killed
    ) {
      logWarn('Failed to send SIGTERM to child on shutdown.')
    } else if (
      !childProcess
      || childProcess.killed
    ) {
      process.exit(0)
    }

    setTimeout(() => {
      if (
        childProcess
        && !childProcess.killed
      ) {
        logInfo('Child process did not exit via SIGTERM on shutdown. Sending SIGKILL.')
        childProcess.kill('SIGKILL')
      }
      process.exit(0)
    }, SHUTDOWN_TIMEOUT)
  } else {
    process.exit(0)
  }
}

const main = async (
) => {
  logDebug(`Initial dependency scan for ${basename(targetScript)}...`)
  await updateWatchedFiles()

  startOrRestartScript()

  const watchPath = process.cwd()
  try {
    logDebug(`Watching for relevant file changes within ${watchPath}. (Effective files: ${watchedFiles.size})`)
    watcher = watch(watchPath, {
      ignored: [
        /(^|[\/\\])\../, // Dotfiles/folders
        /(^|[\/\\])node_modules([\/\\]|$)/,
        /(^|[\/\\])bower_components([\/\\]|$)/,
        /(^|[\/\\])dist([\/\\]|$)/,
        /(^|[\/\\])build([\/\\]|$)/,
        /(^|[\/\\])\.git([\/\\]|$)/,
      ],
      ignoreInitial: true,
      persistent: true,
      depth: 50,
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    })

    watcher.on('all', (
      eventType,
      changedPathRelative
    ) => {
      if (
        !changedPathRelative
      ) {
        return
      }

      const absoluteChangedPath = resolve(watchPath, changedPathRelative)
      if (watchedFiles.has(absoluteChangedPath)) {
        logDebug(`Relevant event: ${eventType} on ${basename(absoluteChangedPath)}.`)

        clearTimeout(debounceTimeout)
        debounceTimeout = setTimeout(async () => {
          logDebug('Re-scanning dependencies and restarting...')
          await updateWatchedFiles()
          startOrRestartScript()
        }, DEBOUNCE_TIMEOUT)
      }
    })

    watcher.on('error', (
      error
    ) => {
      logError('FS Watcher error:', error)
    })

  } catch (error) {
    logError(`Failed to initialize file watcher for ${watchPath}. The script will run once but will not restart on changes.`, error)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  logInfo(`Monitoring ${basename(targetScript)}. Press Ctrl+C to exit.`)
}

main().catch(
  error => {
    logError('Critical unhandled error in main execution:', error)
    process.exit(1)
  }
)
