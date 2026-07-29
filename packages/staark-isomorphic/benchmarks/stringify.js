import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'

import { memo } from '@doars/staark-common/src/memo.js'
import { node } from '@doars/staark-common/src/node.js'
import { stringifyPatch } from '../src/library/stringify.js'

const SAMPLES = 50
const WARM_UPS = 20
const SELF_CLOSING = new Set(['base', 'br', 'hr', 'img', 'input', 'link', 'meta', 'source', 'wbr'])
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeText = (value) => String(value).replace(/[&<>]/g, (character) => ESCAPES[character])
const escapeAttribute = (value) => String(value).replace(/[&<>"']/g, (character) => ESCAPES[character])

const renderFragments = (abstracts, state = {}) => {
  const fragments = []
  const render = (values) => {
    if (!values) return
    for (const abstract of values) {
      if (abstract === null || abstract === undefined || abstract === false) continue
      if (abstract.m) {
        const result = abstract.r(state, abstract.m)
        render(Array.isArray(result) ? result : [result])
      } else if (abstract.t) {
        const type = abstract.t.toLocaleLowerCase()
        fragments.push(`<${type}`)
        for (const name of Object.keys(abstract.a || {})) {
          let value = abstract.a[name]
          if (value === null || value === undefined) continue
          if (name === 'class' && typeof value === 'object') {
            if (Array.isArray(value)) value = value.join(' ')
            else value = Object.keys(value).filter((key) => value[key]).join(' ')
          } else if (name === 'style' && typeof value === 'object') {
            if (Array.isArray(value)) value = value.join(';')
            else {
              const styles = []
              for (const property of Object.keys(value)) {
                const cssProperty = property.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (part, offset) => `${offset ? '-' : ''}${part}`).toLowerCase()
                styles.push(`${cssProperty}:${Array.isArray(value[property]) ? value[property].join(' ') : value[property]}`)
              }
              value = styles.join(';')
            }
          }
          fragments.push(` ${name}="${escapeAttribute(value)}"`)
        }
        if (SELF_CLOSING.has(type)) fragments.push('/>')
        else {
          fragments.push('>')
          render(abstract.c)
          fragments.push(`</${type}>`)
        }
      } else fragments.push(` ${escapeText(abstract)} `)
    }
  }
  render(abstracts)
  return fragments.join('')
}

const broad = (size) => node('main', Array.from({ length: size }, (_, index) => node('p', { class: { active: index % 2 }, title: `item & ${index}` }, `text <${index}>`)))
const deep = (size) => {
  let current = 'deep & text'
  for (let index = 0; index < size; index++) current = node('section', { 'data-depth': index }, current)
  return current
}
const attributes = (size) => node('custom-element', Object.fromEntries(Array.from({ length: size }, (_, index) => [`data-${index}`, `"<&${index}`])), [node('svg', { viewBox: '0 0 10 10' }, node('path', { d: 'M0 0' })), node('input', { disabled: true }), memo((_, memory) => node('span', memory), 'memo')])
const fixtures = [
  ['broad-medium', broad(1000)],
  ['broad-large', broad(5000)],
  ['deep-medium', deep(100)],
  ['deep-large', deep(500)],
  ['attributes-medium', attributes(250)],
  ['attributes-large', attributes(1000)],
]

const median = (values) => [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)]
for (const [name, fixture] of fixtures) {
  const abstracts = [fixture]
  const expected = stringifyPatch(abstracts)[0]
  assert.strictEqual(renderFragments(abstracts), expected)
  const results = { concatenation: [], fragments: [] }
  for (let index = 0; index < WARM_UPS + SAMPLES; index++) {
    for (const variant of index % 2 ? ['fragments', 'concatenation'] : ['concatenation', 'fragments']) {
      const beforeHeap = process.memoryUsage().heapUsed
      const start = performance.now()
      const output = variant === 'fragments' ? renderFragments(abstracts) : stringifyPatch(abstracts)[0]
      const duration = performance.now() - start
      assert.strictEqual(output, expected)
      if (index >= WARM_UPS) results[variant].push({ duration, heap: process.memoryUsage().heapUsed - beforeHeap })
    }
  }
  const report = {}
  for (const variant of ['concatenation', 'fragments']) {
    const duration = median(results[variant].map((sample) => sample.duration))
    report[variant] = {
      medianMilliseconds: duration,
      medianAbsoluteDeviation: median(results[variant].map((sample) => Math.abs(sample.duration - duration))),
      medianHeapDeltaBytes: median(results[variant].map((sample) => sample.heap)),
    }
  }
  process.stdout.write(`${JSON.stringify({ fixture: name, node: process.version, samples: SAMPLES, warmUps: WARM_UPS, report })}\n`)
}
