import {
  RequestOptions,
  ResponseParser
} from '../request.js'

interface CsvOptions {
  types?: string[],
  hasHeaders?: boolean,

  columnDelimiter?: string,
  rowDelimiter?: string,
  escapeCharacter?: string,
}

// TODO: Check if the file starts with a delimiter specified.

export const csvParser = (
  options: CsvOptions,
): ResponseParser => {
  options = {
    columnDelimiter: ',',
    rowDelimiter: '\n',
    escapeCharacter: '"',

    ...options,
  }

  return {
    types: options.types || ['csv', 'text/csv',],
    parser: async (
      response: Response,
      requestOptions: RequestOptions,
    ): Promise<any> => {
      const string = await response.text()

      const rows: string[][] = []
      let currentRow: string[] = []
      let currentField = ''
      let insideQuotes = false

      for (let i = 0; i < string.length; i++) {
        const character = string[i]
        const nextCharacter = string[i + 1]

        if (character === options.escapeCharacter) {
          if (
            nextCharacter === options.escapeCharacter
            && insideQuotes
          ) {
            // Double quotes inside quotes.
            currentField += options.escapeCharacter
            i++ // Skip next quote.
          } else {
            // Toggle insideQuotes.
            insideQuotes = !insideQuotes
          }
        } else if (
          character === options.columnDelimiter
          && !insideQuotes
        ) {
          currentRow.push(
            currentField
          )
          currentField = ''
        } else if (
          character === options.rowDelimiter
          && !insideQuotes
        ) {
          currentRow.push(
            currentField
          )
          currentField = ''

          rows.push(currentRow)
          currentRow = []
        } else {
          currentField += character
        }
      }

      // Push the last field and row if there's any.
      if (currentField) {
        currentRow.push(
          currentField
        )
        currentField = ''
      }
      if (currentRow.length > 0) {
        rows.push(currentRow)
      }

      if (options.hasHeaders) {
        // Extract headers and create objects.
        const headers = rows[0]
        return rows.slice(1).map(row => {
          return headers.reduce((
            obj: Record<string, string>,
            header: string,
            index: number,
          ) => {
            obj[header] = row[index] || ''
            return obj
          }, {})
        })
      }

      return rows
    }
  }
}
