import {
  assert,
  describe,
  it,
} from '../../../../helpers/test.js'

import {
  applyDiff,
} from '../../dst/tiedliene.js'

describe('Apply diff', () => [
  it('shallow object none', () => {
    const actual = applyDiff({
      hello: 'there',
      general: 'kenobi',
    }, [])
    const expected = {
      hello: 'there',
      general: 'kenobi',
    }
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

  it('shallow proxy none', () => {
    const actual = applyDiff(new Proxy({
      hello: 'there',
      general: 'kenobi',
    }, {}), [])
    const expected = {
      hello: 'there',
      general: 'kenobi',
    }
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),

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
    assert.deepEqual(actual, expected)
  }),
])
