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

const tsvTypes = [
  'tsv', 'text/tab-separated-values',
]

export const csvParser = (
  options: CsvOptions,
): ResponseParser => {
  return {
    types: options?.types || [
      'csv', 'text/csv',
      ...tsvTypes,
    ],
    parser: async (
      response: Response,
      requestOptions: RequestOptions,
      type: string,
    ): Promise<any> => {
      const optionsTemp = {
        columnDelimiter: (
          tsvTypes.includes(type)
            ? '	'
            : ','
        ),
        rowDelimiter: '\n',
        escapeCharacter: '"',

        ...options,
      }

      const string = await response.text()

      const rows: string[][] = []
      let currentRow: string[] = []
      let currentField = ''
      let insideQuotes = false

      for (let i = 0; i < string.length; i++) {
        const character = string[i]
        const nextCharacter = string[i + 1]

        if (character === optionsTemp.escapeCharacter) {
          if (
            nextCharacter === optionsTemp.escapeCharacter
            && insideQuotes
          ) {
            // Double quotes inside quotes.
            currentField += optionsTemp.escapeCharacter
            i++ // Skip next quote.
          } else {
            // Toggle insideQuotes.
            insideQuotes = !insideQuotes
          }
        } else if (
          character === optionsTemp.columnDelimiter
          && !insideQuotes
        ) {
          currentRow.push(
            currentField,
          )
          currentField = ''
        } else if (
          character === optionsTemp.rowDelimiter
          && !insideQuotes
        ) {
          currentRow.push(
            currentField,
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
          currentField,
        )
        currentField = ''
      }
      if (currentRow.length > 0) {
        rows.push(currentRow)
      }

      if (optionsTemp.hasHeaders) {
        // Extract headers and create objects.
        const headers = rows[0]
        return rows.slice(1).map(row => {
          return headers.reduce((
            object: Record<string, string>,
            header: string,
            index: number,
          ) => {
            object[header] = row[index] || ''
            return object
          }, {})
        })
      }

      return rows
    }
  }
}
