import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  base64ToString,
  stringToBase64,
} from '../../src/utilities/encoding-server.js'
import {
  decode,
  encode,
} from '../../src/utilities/protocol.js'

describe('Protocol decoding', () => {
  const options = {
    allowedKeys: new Set(['D', 'S', 'P']),
    maxDecodedFieldBytes: 4,
    maxKeyBytes: 1,
    maxSegments: 2,
    maxTotalDecodedBytes: 5,
  }

  it('returns a null-prototype record', () => {
    const result = decode(`S:${stringToBase64('ok')}`, base64ToString, options)
    assert.strictEqual(Object.getPrototypeOf(result), null)
    assert.strictEqual(result.S, 'ok')
  })

  it('rejects malformed, duplicate, unknown, and excessive segments', () => {
    assert.throws(() => decode('S', base64ToString, options), TypeError)
    assert.throws(() => decode('S:***', base64ToString, options), TypeError)
    assert.throws(() => decode('D:b2s', base64ToString, options), TypeError)
    assert.throws(() => decode('C:b2s=', base64ToString, options), TypeError)
    assert.throws(() => decode('S:b2s=|S:b2s=', base64ToString, options), TypeError)
    assert.throws(
      () => decode('S:YQ==|D:Yg==|P:Yw==', base64ToString, options),
      RangeError,
    )
  })

  it('enforces decoded field and total byte limits', () => {
    assert.throws(() => decode('S:YWJjZGU=', base64ToString, options), RangeError)
    assert.throws(() => decode('P:abcde', base64ToString, options), RangeError)
    assert.throws(
      () => decode('S:YWJj|D:ZGVm', base64ToString, options),
      RangeError,
    )
  })

  it('encodes only the text payloads and passes other values as they are', () => {
    const message = encode({ D: '{"a":1}', P: 'YWJj', S: '|:' }, stringToBase64)
    assert.strictEqual(
      message,
      `D:${stringToBase64('{"a":1}')}|P:YWJj|S:${stringToBase64('|:')}`,
    )
    assert.deepStrictEqual(
      { ...decode(message, base64ToString) },
      { D: '{"a":1}', P: 'YWJj', S: '|:' },
    )
    assert.throws(() => encode({ U: 'a|S:b' }, stringToBase64), TypeError)
  })
})
