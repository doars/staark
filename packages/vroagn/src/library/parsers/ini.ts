import {
  RequestOptions,
  ResponseParser,
} from '../request.js'

interface IniOptions {
  types?: string[],
}

interface IniObject {
  [section: string]: {
    [key: string]: string
  }
}

export const iniParser = (
  options: IniOptions = {},
): ResponseParser => {
  return {
    types: options.types || ['ini',],
    parser: async (
      response: Response,
      requestOptions: RequestOptions,
    ): Promise<IniObject> => {
      const text = await response.text()

      const result: IniObject = {}
      const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())

      let currentSection = ''
      for (const line of lines) {
        if (
          line === ''
          || line.startsWith(';')
          || line.startsWith('#')
        ) {
          // Skip empty lines and comments.
          continue
        }

        if (
          line.startsWith('[')
          && line.endsWith(']')
        ) {
          // New section.
          currentSection = line.slice(1, -1).trim()
          if (!result[currentSection]) {
            result[currentSection] = {}
          }
        } else {
          // Key-value pair.
          const [key, ...valueParts] = line.split('=')
          const value = valueParts.join('=').trim()

          if (currentSection === '') {
            // Global section (outside any named section).
            if (!result['global']) {
              result['global'] = {}
            }
            result['global'][key.trim()] = value
          } else {
            result[currentSection][key.trim()] = value
          }
        }
      }

      return result
    }
  }
}
