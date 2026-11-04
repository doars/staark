import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
    applyDiff,
    determineDiff,
    revertDiff,
} from '../../src/index.js'

describe('Apply diff', () => {
  it('shallow object none', () => {
    const actual = applyDiff({
      hello: 'there',
      general: 'kenobi',
    }, [])
    const expected = {
      hello: 'there',
      general: 'kenobi',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow object delete', () => {
    const actual = applyDiff({
      hello: 'there',
      general: 'kenobi',
    }, [{
      type: 'delete',
      path: ['general',],
      old: 'kenobi',
    }])
    const expected = {
      hello: 'there',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow object add', () => {
    const actual = applyDiff({
      hello: 'there',
    }, [{
      type: 'set',
      path: ['general',],
      new: 'kenobi',
    }])
    const expected = {
      hello: 'there',
      general: 'kenobi',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow object set', () => {
    const actual = applyDiff({
      hello: 'there',
      general: 'kenobi',
    }, [{
      type: 'set',
      path: ['general',],
      old: 'kenobi',
      new: 'there',
    }, {
      type: 'set',
      path: ['hello',],
      old: 'there',
      new: 'kenobi',
    }])
    const expected = {
      hello: 'kenobi',
      general: 'there',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow array none', () => {
    const actual = applyDiff([
      'hello',
      'there',
      'general',
      'kenobi',
    ], [])
    const expected = [
      'hello',
      'there',
      'general',
      'kenobi',
    ]
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow array delete', () => {
    const actual = applyDiff([
      'hello',
      'there',
      'general',
      'kenobi',
    ], [{
      type: 'delete',
      path: ['3',],
      old: 'kenobi',
    }, {
      type: 'set',
      path: ['2',],
      old: 'general',
      new: 'kenobi',
    }])
    const expected = [
      'hello',
      'there',
      'kenobi',
    ]
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow array delete multiple', () => {
    const actual = applyDiff([
      'hello',
      'there',
      'general',
      'kenobi',
    ], [{
      type: 'delete',
      path: ['3',],
      old: 'kenobi',
    }, {
      type: 'delete',
      path: ['2',],
      old: 'general',
    }, {
      type: 'set',
      path: ['1',],
      old: 'there',
      new: 'kenobi',
    }, {
      type: 'set',
      path: ['0',],
      old: 'hello',
      new: 'general',
    }])
    const expected = [
      'general',
      'kenobi',
    ]
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow array add', () => {
    const actual = applyDiff([
      'hello',
      'there',
      'kenobi',
    ], [{
      type: 'set',
      path: ['3',],
      new: 'kenobi',
    }, {
      type: 'set',
      path: ['2',],
      old: 'kenobi',
      new: 'general',
    }])
    const expected = [
      'hello',
      'there',
      'general',
      'kenobi',
    ]
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object none', () => {
    const actual = applyDiff({
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    }, [])
    const expected = {
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object delete', () => {
    const actual = applyDiff({
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    }, [{
      type: 'delete',
      path: ['hello', 'general',],
      old: 'kenobi',
    }])
    const expected = {
      hello: {
        hello: 'there',
      },
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object add', () => {
    const actual = applyDiff({
      hello: {
        hello: 'there',
      },
    }, [{
      type: 'set',
      path: ['hello', 'general',],
      new: 'kenobi',
    }])
    const expected = {
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object set', () => {
    const actual = applyDiff({
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    }, [{
      type: 'set',
      path: ['hello', 'general',],
      old: 'kenobi',
      new: 'there',
    }, {
      type: 'set',
      path: ['hello', 'hello',],
      old: 'there',
      new: 'kenobi',
    }])
    const expected = {
      hello: {
        hello: 'kenobi',
        general: 'there',
      },
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object and array none', () => {
    const actual = applyDiff({
      hello: {
        hello: 'there',
      },
      general: [
        'general',
        'kenobi',
      ],
    }, [])
    const expected = {
      hello: {
        hello: 'there',
      },
      general: [
        'general',
        'kenobi',
      ],
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow proxy none', () => {
    const actual = applyDiff(new Proxy({
      hello: 'there',
      general: 'kenobi',
    }, {}), [])
    const expected = {
      hello: 'there',
      general: 'kenobi',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow proxy delete', () => {
    const actual = applyDiff(new Proxy({
      hello: 'there',
      general: 'kenobi',
    }, {}), [{
      type: 'delete',
      path: ['general',],
      old: 'kenobi',
    }])
    const expected = {
      hello: 'there',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow proxy add', () => {
    const actual = applyDiff(new Proxy({
      hello: 'there',
    }, {}), [{
      type: 'set',
      path: ['general',],
      new: 'kenobi',
    }])
    const expected = {
      hello: 'there',
      general: 'kenobi',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow proxy set', () => {
    const actual = applyDiff(new Proxy({
      hello: 'there',
      general: 'kenobi',
    }, {}), [{
      type: 'set',
      path: ['general',],
      old: 'kenobi',
      new: 'there',
    }, {
      type: 'set',
      path: ['hello',],
      old: 'there',
      new: 'kenobi',
    }])
    const expected = {
      hello: 'kenobi',
      general: 'there',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shared object changed through one path', () => {
    const shared = { value: 1 }
    const state = { left: shared, right: shared }
    const diff = determineDiff(state, {
      left: { value: 2 },
      right: { value: 1 },
    })
    assert.deepStrictEqual(applyDiff(state, diff), {
      left: { value: 2 },
      right: { value: 1 },
    })
    assert.deepStrictEqual(revertDiff(state, diff), {
      left: { value: 1 },
      right: { value: 1 },
    })
  })

  it('shared object changed the same way through both paths', () => {
    const shared = { value: 1 }
    const state = { left: shared, right: shared }
    const changed = { value: 2 }
    const diff = determineDiff(state, { left: changed, right: changed })
    assert.strictEqual(diff.length, 1)
    applyDiff(state, diff)
    assert.strictEqual(state.left, state.right)
    assert.strictEqual(state.left.value, 2)
  })

  it('cycle that is broken', () => {
    const state = { value: 1 }
    state.self = state
    const diff = determineDiff(state, { value: 2, self: { value: 1 } })
    applyDiff(state, diff)
    assert.deepStrictEqual(state, { value: 2, self: { value: 1 } })
    revertDiff(state, diff)
    assert.strictEqual(state.value, 1)
    assert.strictEqual(state.self.value, 1)
    assert.strictEqual(state.self.self.value, 1)
  })
})
