import {
  describe,
  it,
  expect,
} from 'bun:test'

import {
  determineDiff,
} from '../../dst/tiedliene.js'

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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
      path: ['3',],
      old: 'kenobi',
    }, {
      type: 'set',
      path: ['2',],
      new: 'kenobi',
      old: 'general',
    }]
    expect(actual).toEqual(expected)
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
    }]
    expect(actual).toEqual(expected)
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
      path: ['3',],
      new: 'kenobi',
    }, {
      type: 'set',
      path: ['2',],
      new: 'general',
      old: 'kenobi',
    }]
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
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
    expect(actual).toEqual(expected)
  })
})
