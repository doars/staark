const BRACKET_CLOSE = ']'
const BRACKET_OPEN = '['
const DOT = '.'
const EQUAL = '='
const HASH = '#'
const QUOTE_SINGLE = '\''
const QUOTE_DOUBLE = '"'

enum TokenTypes {
  attribute = 0,
  class = 1,
  id = 2,
  type = 3,
}

export const selectorToTokenizer = (
  selector: string,
): [string, Record<string, any>] => {
  const length: number = selector.length
  let i: number = 0

  let type: string = ''
  const attributes: Record<string, any> = {}

  let tokenA: string = ''
  let tokenB: string | true = true
  let tokenType: TokenTypes = TokenTypes.type
  const storeToken = () => {
    if (tokenA) {
      switch (tokenType) {
        case TokenTypes.attribute:
          attributes[tokenA] = tokenB === true ? true : tokenB
          tokenB = true
          break

        case TokenTypes.class:
          if (!attributes.class) {
            attributes.class = tokenA
            break
          }
          attributes.class += ' ' + tokenA
          break

        case TokenTypes.id:
          attributes.id = tokenA
          break

        case TokenTypes.type:
          type = tokenA
          break
      }
      tokenA = ''
    }
  }

  let character: string

  let attributeBracketCount: number
  const parseAttribute = (
  ): void => {
    attributeBracketCount = 0

    while (i < length) {
      character = selector[i]
      i++
      if (character === EQUAL) {
        // Parse attribute value.
        tokenB = ''
        character = selector[i]
        const endOnDoubleQuote = character === QUOTE_DOUBLE
        const endOnSingleQuote = character === QUOTE_SINGLE
        if (endOnDoubleQuote || endOnSingleQuote) {
          tokenB += character
          i++
        }

        while (i < length) {
          character = selector[i]
          if (
            (endOnDoubleQuote && character === QUOTE_DOUBLE) ||
            (endOnSingleQuote && character === QUOTE_SINGLE)
          ) {
            tokenB += character
            i++
            break
          } else if (
            !endOnDoubleQuote &&
            !endOnSingleQuote &&
            character === BRACKET_CLOSE
          ) {
            break
          }
          tokenB += character
          i++
        }

        if (
          (
            tokenB[0] === QUOTE_DOUBLE &&
            tokenB[tokenB.length - 1] === QUOTE_DOUBLE
          ) ||
          (
            tokenB[0] === QUOTE_SINGLE &&
            tokenB[tokenB.length - 1] === QUOTE_SINGLE
          )
        ) {
          tokenB = tokenB.substring(1, tokenB.length - 1)
        }


        // Consume until closing bracket, but don't store the tokes since these are invalid.
        while (i < length) {
          character = selector[i]
          i++
          if (character === BRACKET_CLOSE) {
            break
          }
        }
        break
      } else if (character === BRACKET_OPEN) {
        attributeBracketCount++
        continue
      } else if (character === BRACKET_CLOSE) {
        attributeBracketCount--
        if (attributeBracketCount < 0) {
          break
        }
        continue
      }

      tokenA += character
    }
    storeToken()
  }

  while (i < length) {
    character = selector[i]
    i++

    if (character === HASH) {
      storeToken()
      tokenType = TokenTypes.id
      continue
    } else if (character === DOT) {
      storeToken()
      tokenType = TokenTypes.class
      continue
    } else if (character === BRACKET_OPEN) {
      storeToken()
      tokenType = TokenTypes.attribute
      parseAttribute()
      continue
    }

    tokenA += character
  }

  return [type, attributes]
}
