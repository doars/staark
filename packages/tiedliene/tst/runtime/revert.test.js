import {
  describe,
  it,
  expect,
} from 'bun:test'

import {
  revertDiff,
} from '../../dst/tiedliene.js'

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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
  })
})
