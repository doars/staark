/**
 * @typedef {import('../request.js').RequestOptions} RequestOptions
 * @typedef {import('../request.js').ResponseParser} ResponseParser
 */

/**
 * @typedef {Object} YamlOptions Options for the YAML parser.
 * @property {string[]} [types] Content types to parse as YAML.
 * @property {number} [indentSize] Number of spaces to use for indentation.
 */

/**
 * @typedef {string | number | boolean | null | YamlObject | YamlValue[]} YamlValue YAML value.
 */

/**
 * @typedef {Object.<string, YamlValue>} YamlObject YAML object.
 */

/**
 * Parses a YAML value.
 *
 * @param {string} value Value to parse.
 * @param {Record<string, YamlValue>} anchors Anchors.
 * @returns {YamlValue} Parsed value.
 */
const parseValue = (value, anchors) => {
  if (value === 'null' || value === '~') {
    return null
  }
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1)
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1)
  }
  if (!isNaN(Number(value))) {
    return Number(value)
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(item => parseValue(item.trim(), anchors))
  }
  if (value.startsWith('*')) {
    const anchorName = value.slice(1).trim()
    return anchors[anchorName]
  }
  if (value.includes('!!')) {
    const [tag, tagValue] = value.split(' ')
    switch (tag) {
      case '!!int':
        return parseInt(tagValue)
      case '!!float':
        return parseFloat(tagValue)
      case '!!str':
        return tagValue
      case '!!bool':
        return tagValue.toLowerCase() === 'true'
      default:
        return tagValue
    }
  }
  return value
}

/**
 * YAML parser.
 *
 * @param {YamlOptions} [options={}] Options for the YAML parser.
 * @returns {ResponseParser} Response parser that parses YAML.
 */
export const yamlParser = (
  options = {},
) => {
  return {
    types: options.types || [
      'yaml',
      'application/yaml',
      'text/yaml',
    ],

    /**
     * Parse the response as a YAML object.
     *
     * @param {Response} response The response to parse.
     * @param {RequestOptions} requestOptions The request options.
     * @param {string} type The MIME type of the response.
     * @returns {Promise<YamlObject>} The parsed YAML object.
     */
    parser: async (
      response,
      requestOptions,
      type,
    ) => {
      const lines = (await response.text()).split('\n')
      const result = {}
      let currentObject = result
      let indentStack = [result]
      let currentIndent = 0
      let multilineKey = null
      let multilineValue = []
      const anchors = {}

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trimEnd()
        if (line.trim().startsWith('#')) {
          continue
        }

        const indent = line.search(/\S/)

        if (multilineKey !== null) {
          if (indent > currentIndent) {
            multilineValue.push(line.trim())
            continue
          } else {
            currentObject[multilineKey] = multilineValue.join('\n')
            multilineKey = null
            multilineValue = []
          }
        }

        if (indent > currentIndent) {
          indentStack.push(currentObject)
          currentObject = currentObject[Object.keys(currentObject).pop()]
        } else if (indent < currentIndent) {
          while (indent < currentIndent) {
            indentStack.pop()
            currentObject = indentStack[indentStack.length - 1]
            currentIndent -= options.indentSize || 2
          }
        }

        currentIndent = indent

        if (line.trim() === '-') {
          if (!Array.isArray(currentObject)) {
            const lastKey = Object.keys(currentObject).pop()
            currentObject[lastKey] = []
            currentObject = currentObject[lastKey]
          }
          currentObject.push({})
          currentObject = currentObject[currentObject.length - 1]
          continue
        }

        const colonIndex = line.indexOf(':')
        if (colonIndex === -1) {
          continue
        }

        const key = line.slice(0, colonIndex).trim()
        let value = line.slice(colonIndex + 1).trim()

        if (value.startsWith('&')) {
          const anchorName = value.slice(1).split(' ')[0]
          value = value.slice(anchorName.length + 2).trim()
          const parsedValue = parseValue(value, anchors)
          anchors[anchorName] = parsedValue
          currentObject[key] = parsedValue
        } else if (value.startsWith('*')) {
          const anchorName = value.slice(1).trim()
          currentObject[key] = anchors[anchorName]
        } else if (value === '|' || value === '>') {
          multilineKey = key
          currentIndent += options.indentSize || 2
        } else if (value) {
          currentObject[key] = parseValue(value, anchors)
        } else {
          currentObject[key] = {}
        }
      }

      return result
    }
  }
}
