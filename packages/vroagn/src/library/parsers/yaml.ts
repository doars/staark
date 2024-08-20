import {
  RequestOptions,
  ResponseParser,
} from '../request.js'

interface YamlOptions {
  types?: string[],
  indentSize?: number,
}

type YamlValue = string | number | boolean | null | YamlObject | YamlValue[]
interface YamlObject {
  [key: string]: YamlValue,
}

const parseValue = (
  value: string,
  anchors: Record<string, YamlValue>,
): YamlValue => {
  if (value === 'null' || value === '~') {
    return null
  }
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
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
  if (!isNaN(Number(value))) {
    return Number(value)
  }
  if (
    value.startsWith('[')
    && value.endsWith(']')
  ) {
    return value
      .slice(1, -1)
      .split(',')
      .map(
        item => parseValue(item.trim(), anchors)
      )
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

export const yamlParser = (
  options: YamlOptions = {},
): ResponseParser => {
  return {
    types: options.types || ['yaml', 'application/yaml', 'text/yaml'],
    parser: async (
      response: Response,
      requestOptions: RequestOptions,
    ): Promise<any> => {
      const lines = (await response.text())
        .split('\n')
      const result: YamlObject = {}
      let currentObject: YamlValue = result
      let indentStack: YamlObject[] = [result]
      let currentIndent = 0
      let multilineKey: string | null = null
      let multilineValue: string[] = []
      const anchors: Record<string, YamlValue> = {}

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
          currentObject = currentObject[
            Object.keys(currentObject).pop()!
          ] as YamlObject
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
            const lastKey = Object.keys(currentObject).pop()!
            currentObject[lastKey] = []
            currentObject = currentObject[lastKey] as YamlValue[]
          }
          currentObject.push({})
          currentObject = currentObject[currentObject.length - 1] as YamlObject
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
        } else if (
          value === '|'
          || value === '>'
        ) {
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

