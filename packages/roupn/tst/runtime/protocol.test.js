import assert from 'node:assert/strict'
import {
  describe,
  it,
} from 'node:test'

import {
  base64ToString,
  stringToBase64,
} from '../../src/utilities/encoding-server.js'
import { decode } from '../../src/utilities/protocol.js'

describe('Protocol decoding', () => {
  const options = {
    allowedKeys: new Set(['A', 'B']),
    maxDecodedFieldBytes: 4,
    maxKeyBytes: 1,
    maxSegments: 2,
    maxTotalDecodedBytes: 5,
  }

  it('returns a null-prototype record', () => {
    const result = decode(`A:${stringToBase64('ok')}`, base64ToString, options)
    assert.strictEqual(Object.getPrototypeOf(result), null)
    assert.strictEqual(result.A, 'ok')
  })

  it('rejects malformed, duplicate, unknown, and excessive segments', () => {
    assert.throws(() => decode('A', base64ToString, options), TypeError)
    assert.throws(() => decode('A:***', base64ToString, options), TypeError)
    assert.throws(() => decode('C:b2s=', base64ToString, options), TypeError)
    assert.throws(() => decode('A:b2s=|A:b2s=', base64ToString, options), TypeError)
    assert.throws(
      () => decode('A:YQ==|B:Yg==|A:Yw==', base64ToString, options),
      RangeError,
    )
  })

  it('enforces decoded field and total byte limits', () => {
    assert.throws(() => decode('A:YWJjZGU=', base64ToString, options), RangeError)
    assert.throws(
      () => decode('A:YWJj|B:ZGVm', base64ToString, options),
      RangeError,
    )
  })
})
