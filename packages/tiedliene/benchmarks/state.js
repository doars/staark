import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'

import { determineDiff } from '../src/library/diff.js'
import { manageState } from '../src/library/state.js'
import { cloneRecursive } from '../src/utilities/clone.js'

// Run with "cold" to time the first call in a fresh process per sample.
const COLD_SAMPLES = 11
const COLD_SIZE = 5000
const MANY_KEYS = 50000
const WARM_UPS = 20
const SAMPLES = 50

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

const createFixture = (size) => {
  const items = []
  for (let index = 0; index < size; index++) {
    items.push({
      identifier: index,
      metadata: { active: true, label: `item-${index}` },
      value: index,
    })
  }
  return { items }
}

const createKeys = (value) => {
  const keys = {}
  for (let index = 0; index < MANY_KEYS; index++) {
    keys[`key-${index}`] = value
  }
  return { record: keys }
}

// Each case prepares its data untimed and returns the operation to time. The
// state cases only run cold, since the matrix below covers them warm.
const cases = {
  'diff one changed item': () => {
    const before = createFixture(COLD_SIZE)
    const after = cloneRecursive(before)
    after.items[COLD_SIZE - 1].value = -1
    return () => determineDiff(before, after)
  },
  'diff all items changed': () => {
    const before = createFixture(COLD_SIZE)
    const after = cloneRecursive(before)
    for (const item of after.items) {
      item.value = -1
    }
    return () => determineDiff(before, after)
  },
  [`diff ${MANY_KEYS} changed keys`]: () => {
    const before = createKeys(0)
    const after = createKeys(1)
    return () => determineDiff(before, after)
  },
  'state set': () => {
    const managed = manageState(createFixture(COLD_SIZE))
    let update = 0
    return () => {
      const next = managed.get()
      next.items[COLD_SIZE - 1].value = update++
      managed.set(next)
    }
  },
  'state undo': () => {
    const managed = manageState(createFixture(COLD_SIZE))
    const next = managed.get()
    next.items[COLD_SIZE - 1].value = -1
    managed.set(next)
    return () => managed.undo()
  },
  'state redo': () => {
    const managed = manageState(createFixture(COLD_SIZE))
    const next = managed.get()
    next.items[COLD_SIZE - 1].value = -1
    managed.set(next)
    managed.undo()
    return () => managed.redo()
  },
}

const measure = (operation, warmUps = WARM_UPS, samples = SAMPLES) => {
  for (let index = 0; index < warmUps; index++) {
    operation()
  }
  const durations = []
  const heapDeltas = []
  for (let index = 0; index < samples; index++) {
    const beforeHeap = process.memoryUsage().heapUsed
    const start = performance.now()
    operation()
    durations.push(performance.now() - start)
    heapDeltas.push(process.memoryUsage().heapUsed - beforeHeap)
  }
  const middle = median(durations)
  return {
    medianMilliseconds: middle,
    medianAbsoluteDeviation: median(
      durations.map((duration) => Math.abs(duration - middle)),
    ),
    medianHeapDeltaBytes: median(heapDeltas),
  }
}

if (process.argv[2] === 'sample') {
  const operation = cases[process.argv[3]]()
  const start = performance.now()
  operation()
  process.stdout.write(`${performance.now() - start}\n`)
} else if (process.argv[2] === 'cold') {
  for (const name of Object.keys(cases)) {
    const durations = []
    for (let index = 0; index < COLD_SAMPLES; index++) {
      const result = spawnSync(process.execPath, [
        import.meta.filename,
        'sample',
        name,
      ], { encoding: 'utf8' })
      durations.push(Number(result.stdout))
    }
    process.stdout.write(`${JSON.stringify({
      case: name,
      medianMilliseconds: median(durations),
      node: process.version,
      samples: COLD_SAMPLES,
    })}\n`)
  }
} else {
  for (const [name, setup] of Object.entries(cases)) {
    if (!name.startsWith('diff')) {
      continue
    }
    const many = name.endsWith('changed keys')
    process.stdout.write(`${JSON.stringify({
      case: name,
      node: process.version,
      ...measure(setup(), many ? 3 : WARM_UPS, many ? 11 : SAMPLES),
    })}\n`)
  }

  for (const size of [100, 1000, 5000]) {
    for (const maximumHistory of [0, 10, 50]) {
      let cloneCount = 0
      const clone = (value) => {
        cloneCount++
        return cloneRecursive(value)
      }
      const managed = manageState(createFixture(size), {
        clone,
        maximumHistory,
      })
      let update = 0
      const setResult = measure(() => {
        const next = managed.get()
        next.items[size - 1].value = update++
        managed.set(next)
      })
      const getResult = measure(() => managed.get())
      const undoResult = measure(() => managed.undo())
      const redoResult = measure(() => managed.redo())
      process.stdout.write(`${JSON.stringify({
        cloneCount,
        fixture: { maximumHistory, size },
        node: process.version,
        policy: 'clone',
        samples: SAMPLES,
        warmUps: WARM_UPS,
        operations: {
          get: getResult,
          redo: redoResult,
          set: setResult,
          undo: undoResult,
        },
      })}\n`)
    }
  }
}
