import { performance } from 'node:perf_hooks'

import { manageState } from '../src/library/state.js'
import { cloneRecursive } from '../src/utilities/clone.js'

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

const measure = (operation) => {
  for (let index = 0; index < WARM_UPS; index++) {
    operation()
  }
  const durations = []
  const heapDeltas = []
  for (let index = 0; index < SAMPLES; index++) {
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
