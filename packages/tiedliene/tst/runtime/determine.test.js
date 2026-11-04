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

describe('Determine diff', () => {
  it('shallow object same', () => {
    const actual = determineDiff({
      hello: 'there',
      general: 'kenobi',
    }, {
      hello: 'there',
      general: 'kenobi',
    })
    const expected = []
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow object delete', () => {
    const actual = determineDiff({
      hello: 'there',
      general: 'kenobi',
    }, {
      hello: 'there',
    })
    const expected = [{
      type: 'delete',
      path: ['general',],
      old: 'kenobi',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow object add', () => {
    const actual = determineDiff({
      hello: 'there',
    }, {
      hello: 'there',
      general: 'kenobi',
    })
    const expected = [{
      type: 'set',
      path: ['general',],
      new: 'kenobi',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow object set', () => {
    const actual = determineDiff({
      hello: 'there',
      general: 'kenobi',
    }, {
      hello: 'kenobi',
      general: 'there',
    })
    const expected = [{
      type: 'set',
      path: ['general',],
      old: 'kenobi',
      new: 'there',
    }, {
      type: 'set',
      path: ['hello',],
      old: 'there',
      new: 'kenobi',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow array same', () => {
    const actual = determineDiff([
      'hello',
      'there',
      'general',
      'kenobi',
    ], [
      'hello',
      'there',
      'general',
      'kenobi',
    ])
    const expected = []
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow array delete', () => {
    const actual = determineDiff([
      'hello',
      'there',
      'general',
      'kenobi',
    ], [
      'hello',
      'there',
      'kenobi',
    ])
    const expected = [{
      type: 'delete',
      path: [3],
      old: 'kenobi',
    }, {
      type: 'set',
      path: [2],
      new: 'kenobi',
      old: 'general',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow array delete multiple', () => {
    const actual = determineDiff([
      'hello',
      'there',
      'general',
      'kenobi',
    ], [
      'general',
      'kenobi',
    ])
    const expected = [{
      type: 'delete',
      path: [3],
      old: 'kenobi',
    }, {
      type: 'delete',
      path: [2],
      old: 'general',
    }, {
      type: 'set',
      path: [1],
      new: 'kenobi',
      old: 'there',
    }, {
      type: 'set',
      path: [0],
      old: 'hello',
      new: 'general',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow array add', () => {
    const actual = determineDiff([
      'hello',
      'there',
      'kenobi',
    ], [
      'hello',
      'there',
      'general',
      'kenobi',
    ])
    const expected = [{
      type: 'set',
      path: [2],
      new: 'general',
      old: 'kenobi',
    }, {
      type: 'set',
      path: [3],
      new: 'kenobi',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object same', () => {
    const actual = determineDiff({
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    }, {
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    })
    const expected = []
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object delete', () => {
    const actual = determineDiff({
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    }, {
      hello: {
        hello: 'there',
      },
    })
    const expected = [{
      type: 'delete',
      path: ['hello', 'general',],
      old: 'kenobi',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object add', () => {
    const actual = determineDiff({
      hello: {
        hello: 'there',
      },
    }, {
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    })
    const expected = [{
      type: 'set',
      path: ['hello', 'general',],
      new: 'kenobi',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object set', () => {
    const actual = determineDiff({
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    }, {
      hello: {
        hello: 'kenobi',
        general: 'there',
      },
    })
    const expected = [{
      type: 'set',
      path: ['hello', 'general',],
      old: 'kenobi',
      new: 'there',
    }, {
      type: 'set',
      path: ['hello', 'hello',],
      old: 'there',
      new: 'kenobi',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object and array same', () => {
    const actual = determineDiff({
      hello: {
        hello: 'there',
      },
      general: [
        'general',
        'kenobi',
      ],
    }, {
      hello: {
        hello: 'there',
      },
      general: [
        'general',
        'kenobi',
      ],
    })
    const expected = []
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow proxy same', () => {
    const actual = determineDiff(new Proxy({
      hello: 'there',
      general: 'kenobi',
    }, {}), {
      hello: 'there',
      general: 'kenobi',
    })
    const expected = []
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow proxy delete', () => {
    const actual = determineDiff(new Proxy({
      hello: 'there',
      general: 'kenobi',
    }, {}), {
      hello: 'there',
    })
    const expected = [{
      type: 'delete',
      path: ['general',],
      old: 'kenobi',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow proxy add', () => {
    const actual = determineDiff(new Proxy({
      hello: 'there',
    }, {}), {
      hello: 'there',
      general: 'kenobi',
    })
    const expected = [{
      type: 'set',
      path: ['general',],
      new: 'kenobi',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow proxy set', () => {
    const actual = determineDiff(new Proxy({
      hello: 'there',
      general: 'kenobi',
    }, {}), {
      hello: 'kenobi',
      general: 'there',
    })
    const expected = [{
      type: 'set',
      path: ['general',],
      old: 'kenobi',
      new: 'there',
    }, {
      type: 'set',
      path: ['hello',],
      old: 'there',
      new: 'kenobi',
    }]
    assert.deepStrictEqual(actual, expected)
  })

  it('array growth is appended in order without holes', () => {
    const state = [1]
    const diff = determineDiff(state, [1, 2, 3])
    assert.deepStrictEqual(diff.map((change) => change.path), [[1], [2]])
    assert.deepStrictEqual(applyDiff(state, diff), [1, 2, 3])
    assert.deepStrictEqual(revertDiff(state, diff), [1])
  })

  it('sparse array holes are set to undefined', () => {
    const state = [1, 2, 3]
    const diff = determineDiff(state, [1, , 3])
    assert.deepStrictEqual(diff, [{
      type: 'set',
      path: [1],
      old: 2,
      new: undefined,
    }])
    assert.deepStrictEqual(applyDiff(state, diff), [1, undefined, 3])
    assert.deepStrictEqual(revertDiff(state, diff), [1, 2, 3])
  })

  it('large nested diffs', () => {
    const before = {}
    const after = {}
    for (let index = 0; index < 300000; index++) {
      before[`key${index}`] = 0
      after[`key${index}`] = 1
    }
    assert.strictEqual(determineDiff({ record: before }, { record: after }).length, 300000)
  })

  it('object replaced by an array and back', () => {
    assert.deepStrictEqual(determineDiff({ list: {} }, { list: [] }), [{
      type: 'set',
      path: ['list'],
      old: {},
      new: [],
    }])
    assert.deepStrictEqual(determineDiff({ nested: { list: [1] } }, { nested: { list: { 0: 1 } } }), [{
      type: 'set',
      path: ['nested', 'list'],
      old: [1],
      new: { 0: 1 },
    }])
    assert.throws(() => determineDiff({}, []), TypeError)
    assert.throws(() => determineDiff([], {}), TypeError)
  })

  it('maps and sets holding objects and arrays', () => {
    const create = (value) => ({
      map: new Map([[{ key: [1] }, { value: [value] }]]),
      set: new Set([{ value }, [value]]),
    })
    assert.deepStrictEqual(determineDiff(create(1), create(1)), [])
    const diff = determineDiff(create(1), create(2))
    assert.deepStrictEqual(diff.map((change) => change.path), [['set'], ['map']])
    assert.deepStrictEqual(determineDiff(
      { set: new Set([{}]) },
      { set: new Set([[]]) },
    ).length, 1)
  })

  it('maps and sets that contain themselves', () => {
    const create = (value) => {
      const map = new Map([['value', value]])
      map.set('self', map)
      const set = new Set([value])
      set.add(set)
      return { map, set }
    }
    assert.deepStrictEqual(determineDiff(create(1), create(1)), [])
    const diff = determineDiff(create(1), create(2))
    assert.deepStrictEqual(diff.map((change) => change.path), [['set'], ['map']])
  })
})
