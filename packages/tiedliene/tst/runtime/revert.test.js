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

describe('Revert diff', () => {
  it('shallow object none', () => {
    const actual = revertDiff({
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
    const actual = revertDiff({
      hello: 'there',
    }, [{
      type: 'delete',
      path: ['general',],
      old: 'kenobi',
    }])
    const expected = {
      hello: 'there',
      general: 'kenobi',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow object add', () => {
    const actual = revertDiff({
      hello: 'there',
      general: 'kenobi',
    }, [{
      type: 'set',
      path: ['general',],
      new: 'kenobi',
    }])
    const expected = {
      hello: 'there',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow object set', () => {
    const actual = revertDiff({
      hello: 'kenobi',
      general: 'there',
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
      hello: 'there',
      general: 'kenobi',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow array none', () => {
    const actual = revertDiff([
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
    const actual = revertDiff([
      'hello',
      'there',
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
      'general',
      'kenobi',
    ]
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow array delete multiple', () => {
    const actual = revertDiff([
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
      new: 'kenobi',
      old: 'there',
    }, {
      type: 'set',
      path: ['0',],
      old: 'hello',
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

  it('shallow array add', () => {
    const actual = revertDiff([
      'hello',
      'there',
      'general',
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
      'kenobi',
    ]
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object none', () => {
    const actual = revertDiff({
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
    const actual = revertDiff({
      hello: {
        hello: 'there',
      },
    }, [{
      type: 'delete',
      path: ['hello', 'general',],
      old: 'kenobi',
    }])
    const expected = {
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object add', () => {
    const actual = revertDiff({
      hello: {
        hello: 'there',
        general: 'kenobi',
      },
    }, [{
      type: 'set',
      path: ['hello', 'general',],
      new: 'kenobi',
    }])
    const expected = {
      hello: {
        hello: 'there',
      },
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object set', () => {
    const actual = revertDiff({
      hello: {
        hello: 'kenobi',
        general: 'there',
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
        hello: 'there',
        general: 'kenobi',
      },
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('nested object and array none', () => {
    const actual = revertDiff({
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
    const actual = revertDiff(new Proxy({
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
    const actual = revertDiff(new Proxy({
      hello: 'there',
    }, {}), [{
      type: 'delete',
      path: ['general',],
      old: 'kenobi',
    }])
    const expected = {
      hello: 'there',
      general: 'kenobi',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow proxy add', () => {
    const actual = revertDiff(new Proxy({
      hello: 'there',
      general: 'kenobi',
    }, {}), [{
      type: 'set',
      path: ['general',],
      new: 'kenobi',
    }])
    const expected = {
      hello: 'there',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('shallow proxy set', () => {
    const actual = revertDiff(new Proxy({
      hello: 'kenobi',
      general: 'there',
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
      hello: 'there',
      general: 'kenobi',
    }
    assert.deepStrictEqual(actual, expected)
  })

  it('reverts from the last change to the first', () => {
    const actual = revertDiff({ value: 2 }, [{
      type: 'set',
      path: ['value'],
      new: 1,
    }, {
      type: 'set',
      path: ['value'],
      old: 1,
      new: 2,
    }])
    assert.deepStrictEqual(actual, {})
  })

  it('restores values that were undefined', () => {
    const record = { value: undefined }
    const recordDiff = determineDiff(record, { value: 1 })
    applyDiff(record, recordDiff)
    assert.deepStrictEqual(revertDiff(record, recordDiff), { value: undefined })

    const array = [undefined]
    const arrayDiff = determineDiff(array, [1])
    applyDiff(array, arrayDiff)
    assert.deepStrictEqual(revertDiff(array, arrayDiff), [undefined])
  })

  it('reverts an array delete by inserting the item again', () => {
    const diff = [{
      type: 'delete',
      path: [0],
      old: 'first',
    }]
    const state = applyDiff(['first', 'second'], diff)
    assert.deepStrictEqual(state, ['second'])
    assert.deepStrictEqual(revertDiff(state, diff), ['first', 'second'])
    assert.deepStrictEqual(revertDiff([1], [{
      type: 'delete',
      path: [0],
    }]), [undefined, 1])
  })
})
