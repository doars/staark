/**
 * @typedef {import('../request.js').RequestOptions} RequestOptions
 * @typedef {import('../request.js').ResponseParser} ResponseParser
 */

/**
 * @typedef {Object} TomlOptions Options for the TOML parser.
 * @property {string[]} [types] The types that should be parsed as TOML.
 */

/**
 * @typedef {string | number | boolean | Date | TomlObject | TomlValue[]} TomlValue The value of a TOML key.
 */

/**
 * @typedef {Object.<string, TomlValue>} TomlObject The parsed TOML object.
 */

/**
 * Parse a TOML value.
 *
 * @param {string} value The TOML value to parse.
 * @returns {TomlValue} The parsed TOML value.
 */
const parseTomlValue = (
  value,
) => {
  if (
    value.startsWith('"')
    && value.endsWith('"')
  ) {
    return value.slice(1, -1)
  }
  if (
    value.startsWith("'")
    && value.endsWith("'")
  ) {
    return value.slice(1, -1)
  }
  if (
    value === 'true'
    || value === 'false'
  ) {
    return value === 'true'
  }
  if (!isNaN(Number(value))) {
    return Number(value)
  }
  if (value.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/)) {
    return new Date(value)
  }
  return value
}

/**
 * Parse an inline table.
 *
 * @param {string} tableString The inline table string.
 * @returns {TomlObject} The parsed inline table.
 */
const parseInlineTable = (
  tableString,
) => {
  const result = {}
  let key = ''
  let value = ''
  let inQuotes = false
  let quoteChar = ''
  let inValue = false

  for (let i = 1; i < tableString.length - 1; i++) {
    const character = tableString[i]
    if (
      !inQuotes
      && (
        character === '"'
        || character === "'"
      )
    ) {
      inQuotes = true
      quoteChar = character
    } else if (
      inQuotes
      && character === quoteChar
    ) {
      inQuotes = false
    } else if (
      !inQuotes
      && character === '='
    ) {
      inValue = true
    } else if (
      !inQuotes
      && character === ','
    ) {
      result[key.trim()] = parseTomlValue(value.trim())
      key = ''
      value = ''
      inValue = false
    } else {
      if (inValue) {
        value += character
      } else {
        key += character
      }
    }
  }

  if (key) {
    result[key.trim()] = parseTomlValue(
      value.trim(),
    )
  }

  return result
}

/**
 * TOML parser.
 *
 * @param {TomlOptions} [options={}] Options for the TOML parser.
 * @returns {ResponseParser} The TOML parser.
 */
export const tomlParser = (
  options = {},
) => {
  return {
    types: options.types || [
      'toml',
      'application/toml',
    ],

    /**
     * Parse the response as a TOML object.
     *
     * @param {Response} response The response to parse.
     * @param {RequestOptions} requestOptions The options for the request.
     * @param {string} type The MIME type of the response.
     * @returns {Promise<TomlObject>} The parsed TOML object.
     */
    parser: async (
      response,
      requestOptions,
      type,
    ) => {
      const text = await response.text()

      const result = {}
      let currentTable = result
      let currentArray = null
      let multilineString = null
      let multilineStringDelimiter = null

      const lines = text.split(/\r?\n/)
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim()

        if (line === '' || line.startsWith('#')) {
          continue // Skip empty lines and comments
        }

        if (multilineString !== null) {
          if (line.endsWith(multilineStringDelimiter)) {
            multilineString += line.slice(0, -multilineStringDelimiter.length)
            currentTable[Object.keys(currentTable).pop()] = multilineString
            multilineString = null
            multilineStringDelimiter = null
          } else {
            multilineString += line + '\n'
          }
          continue
        }

        if (line.startsWith('[') && line.endsWith(']')) {
          // Table
          const tableName = line.slice(1, -1).trim()
          currentTable = result
          const parts = tableName.split('.')
          for (const part of parts) {
            if (!currentTable[part]) currentTable[part] = {}
            currentTable = currentTable[part]
          }
          currentArray = null
        } else if (line.startsWith('[[') && line.endsWith(']]')) {
          // Array of Tables
          const arrayName = line.slice(2, -2).trim()
          const parts = arrayName.split('.')
          let parent = result
          for (let i = 0; i < parts.length - 1; i++) {
            if (!parent[parts[i]]) parent[parts[i]] = {}
            parent = parent[parts[i]]
          }
          const lastPart = parts[parts.length - 1]
          if (!parent[lastPart]) parent[lastPart] = []
          const newTable = {}
          parent[lastPart].push(newTable)
          currentTable = newTable
          currentArray = null
        } else {
          // Key-value pair
          const [key, ...valueParts] = line.split('=')
          let value = valueParts.join('=').trim()

          if (value.startsWith('"""') || value.startsWith("'''")) {
            // Multi-line string
            multilineStringDelimiter = value.slice(0, 3)
            multilineString = value.slice(3)
            if (value.endsWith(multilineStringDelimiter)) {
              currentTable[key.trim()] = multilineString.slice(0, -3)
              multilineString = null
              multilineStringDelimiter = null
            }
          } else if (value.startsWith('{') && value.endsWith('}')) {
            // Inline table
            currentTable[key.trim()] = parseInlineTable(value)
          } else if (value.startsWith('[') && !value.endsWith(']')) {
            // Multi-line array
            currentArray = []
            value = value.slice(1).trim()
          } else {
            if (currentArray !== null) {
              if (value.endsWith(']')) {
                currentArray.push(parseTomlValue(value.slice(0, -1).trim()))
                currentTable[key.trim()] = currentArray
                currentArray = null
              } else {
                currentArray.push(parseTomlValue(value))
              }
            } else {
              currentTable[key.trim()] = parseTomlValue(value)
            }
          }
        }
      }

      return result
    }
  }
}
