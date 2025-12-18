# Documentation guidelines

## File structure
1. All documentation should be written in Markdown (`.md`) format
2. Main documentation files should be named `README.md`

## Style guidelines
1. Use clear, concise, and simple language
2. Ensure content is accessible
3. Include code examples for complex functionality
4. Document all APIs and methods
5. Keep documentation up to date with code changes
6. Document changes in the CHANGELOG.md

## Markdown best practices
1. Use headers for structure (h1 -> h6)
2. Use code blocks with language specification
3. Use lists for steps and features
4. Use tables for structured data
5. Use blockquotes for important notes
6. Use links for references
7. Use images with alt text

# JavaScript

## General formatting
- Use 2 spaces for indentation
- Use single quotes for strings
- Use LF (Unix-style) line endings
- No trailing whitespace
- One empty line at end of file
- Avoid semicolons
- Break long statements up with linebreaks
- In code files where if statements take up multiple lines of code place the `||` and `&&` operators at the start of the line. For ternary comparators `?` and `:` place these at the start of the line as well.

## Naming conventions
### Variables and functions
- Do not abbreviate function, property, and variable names
- Use camelCase, except for global constants write these in UPPER_SNAKE_CASE

### Files
- Use kebab-case for file names: `my-module.js`
- Use PascalCase for component files: `MyComponent.js`
- Use `.js` extension for all JavaScript files

## Spacing and line breaks
```javascript
// Function declarations use arrow functions
const myArrowFunction = (
  param1,
  param2,
) => {
  // Function body
}

// Object literals
const myObject = {
  key1: 'value1',
  key2: 'value2',
}

// Arrays
const myArray = [
  'item1',
  'item2',
]

// Control structures
if (
  condition
  && otherCondition
) {
  // Code
} else {
  // Code
}

// Ternary operators
const result = (
  condition
  ? value1
  : value2
)
```

## Imports and exports
- Always import with file extension
- Deconstruct imports where possible
- Only add named exports, do not export a default
```javascript
// Group imports by type
// Build-in modules
import path from 'path'
import fs from 'fs'

// External
import {
  mount,
  node,
} from '@doars/staark'

// Internal modules
import { myFunction } from './my-module.js'
import {
  otherFunction,
  anotherFunction,
} from '../other-module.js'
```

## Comments
- Write documentations for functions using JSDocs.
- Ensure all parameters have a type specified.
- Add type definitions instead of complicated inline single line signature.
```javascript
// Single-line comments are placed before the code not inline
const value = 42

/**
 * Multi-line comments for functions
 * @param {string} param1 - Description of param1
 * @param {number} param2 - Description of param2
 * @throws {ErrorType} Description of when this error is thrown
 * @fires onUpdate - Description of when event is fired
 * @returns {boolean} Description of return value
 * @example
 * Example usage of the function
 * myFunction(...)
 */
const myFunction (
  param1,
  param2,
) => {
  // Implementation
}
```

## Classes
- Never use classes, use a function that returns an object instead

## Functions
- Use default parameters instead of conditional logic
- Use rest parameters for variable arguments
- Use arrow functions and avoid the `this` keyword

## Objects
- Use object shorthand notation
- Use object destructuring for function parameters
- Use object spread for immutable updates
- Use computed property names when appropriate

## Arrays
- Use loops instead of array methods
- Use array destructuring
- Use array spread for immutable updates

## Async code
- Use async/await instead of raw promises
- Use Promise.all for parallel operations
- Use try/catch for error handling

## Performance considerations
- Use proper data structures for the task

## Security
- Use error types
- Handle errors
- Use clear, concise and simple error messages
- Follow security best practices

## Accessibility
- Follow accessibility guidelines
