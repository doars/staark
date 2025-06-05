const tests = []

/**
 * Defines a test suite.
 * @param {string} description - The description of the test suite.
 * @param {function} callback - The function containing the test cases.
 */
export const describe = (
  description,
  callback,
) => {
  tests.push({
    description,
    cases: callback(),
  })
}

/**
 * Defines a test case.
 * @param {string} description - The description of the test case.
 * @param {function} testFunction - The function containing the test logic.
 */
export const it = (
  description,
  testFunction,
) => {
  return {
    description,
    testFunction,
  }
}

/**
 * Performs a deep equality check between two values.
 * @param {any} actual - The actual value.
 * @param {any} expected - The expected value.
 */
const deepEqual = (
  actual,
  expected,
) => {
  if (actual === expected) {
    return true
  }

  if (
    actual == null
    || expected == null
    || typeof actual !== 'object'
    || typeof expected !== 'object'
  ) {
    return false
  }

  const keysA = Object.keys(actual)
  const keysB = Object.keys(expected)

  if (keysA.length !== keysB.length) {
    return false
  }

  for (const key of keysA) {
    if (
      !keysB.includes(key)
      || !deepEqual(actual[key], expected[key])
    ) {
      return false
    }
  }
  return true
}

export const assert = {
  /**
   * Asserts that value is truthy.
   * @param {*} actual - The actual value.
   */
  assert: (
    actual,
  ) => {
    if (!actual) {
      const error = new Error(`AssertionError: Expected value to be truthy.\n       Actual: ${JSON.stringify(actual)}`)
      error.actual = actual
      throw error
    }
  },
  /**
   * Asserts that two values are deeply equal.
   * @param {*} actual - The actual value.
   * @param {*} expected - The expected value.
   */
  deepEqual: (
    actual,
    expected,
  ) => {
    if (!deepEqual(actual, expected)) {
      const error = new Error(`AssertionError: Expected values to be deeply equal.\n       Actual: ${JSON.stringify(actual)}\n       Expected: ${JSON.stringify(expected)}`)
      error.actual = actual
      error.expected = expected
      throw error
    }
  },
  /**
   * Asserts that two values are strictly equal.
   * @param {*} actual - The actual value.
   * @param {*} expected - The expected value.
   */
  equal: (
    actual,
    expected,
  ) => {
    if (actual !== expected) {
      const error = new Error(`AssertionError: Expected values to be strictly.\n       Actual: ${JSON.stringify(actual)}\n       Expected: ${JSON.stringify(expected)}`)
      error.actual = actual
      error.expected = expected
      throw error
    }
  },
}

/**
 * Runs all collected tests.
 * @returns {Object} Test results.
 */
export const runTests = async (
) => {
  const testsHandled = []
  let passedCount = 0
  let failedCount = 0

  for (const test of tests) {
    for (const testCase of test.cases) {
      try {
        if (testCase.testFunction.constructor.name === 'AsyncFunction') {
          await testCase.testFunction()
        } else {
          testCase.testFunction()
        }

        passedCount++
        testsHandled.push({
          description: test.description,
          testCase,
          error: null,
        })
      } catch (error) {
        failedCount++
        testsHandled.push({
          description: test.description,
          testCase,
          error,
        })
      }
    }
  }
  tests.length = 0

  return {
    failedCount,
    passedCount,
    testsHandled,
  }
}
