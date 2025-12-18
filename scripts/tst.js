#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import {
    runTests,
} from '../helpers/test.js'

const targetDirectory = process.argv[2]
if (!targetDirectory) {
  console.log('Error: No directory specified.')
  console.log('Usage: bun tst.js <directory-to-explore>')
  console.log('Example: bun tst.js tst/runtime/')
  process.exit(1)
}

let absoluteTargetDirectory
try {
  absoluteTargetDirectory = path.resolve(targetDirectory)
  if (
    !fs.existsSync(absoluteTargetDirectory)
    || !fs.lstatSync(absoluteTargetDirectory).isDirectory()
  ) {
    console.error(`Error: Directory not found or is not a directory: ${absoluteTargetDirectory}`)
    process.exit(1)
  }
} catch (err) {
  console.error(`Error accessing directory: ${targetDirectory}`, err)
  process.exit(1)
}

const findFiles = async (
  directory,
) => {
  let files = []
  const entries = await fs.promises.readdir(directory, {
    withFileTypes: true,
  })
  for (const entry of entries) {
    const filePath = path.resolve(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue
      }
      files = files.concat(
        await findFiles(filePath),
      )
    } else if (
      entry.isFile()
      && filePath.endsWith('.js')
    ) {
      files.push(filePath)
    }
  }
  return files
}

const run = async (
) => {
  console.log(`Running tests in: ${absoluteTargetDirectory}`)

  let overallPassedCount = 0
  let overallFailedCount = 0

  try {
    const filesToTest = await findFiles(absoluteTargetDirectory)

    if (filesToTest.length === 0) {
      console.log('No test files found to run in the specified directory.')
      process.exit(0)
    }

    for (const filePath of filesToTest) {
      console.log(`\nTesting file: ${path.relative(process.cwd(), filePath)}`)
      try {
        // Dynamically import the test file. Adding a cache-busting query parameter to ensure fresh import if files change.
        await import(`file://${filePath}?cb=${Date.now()}`)

        const results = await runTests()
        let lastDescription = null
        for (const { description, testCase, error } of results.testsHandled) {
          if (description !== lastDescription) {
            lastDescription = description
            console.log(`  ${description}`)
          }
          if (error) {
            console.error(`    ❌ Failed: ${testCase.description}`)
            console.error(`       Error: ${error.message}`)
          } else {
            console.log(`    ✅ Passed: ${testCase.description}`)
          }
        }

        overallPassedCount += results.passedCount
        overallFailedCount += results.failedCount
      } catch (error) {
        console.error(`\n  Error processing file ${filePath}:`, error)
        overallFailedCount++
      }
    }

    console.log('\nOverall results:')
    console.log(`  Total tests executed across all files: ${overallPassedCount + overallFailedCount}`)
    console.log(`  Total passed: ${overallPassedCount} ✅`)
    console.log(`  Total failed: ${overallFailedCount} ❌`)

    if (overallFailedCount > 0) {
      console.log('\nNot all tests passed successfully.')
      process.exit(1)
    } else {
      console.log('All tests passed across all files!')
      process.exit(0)
    }

  } catch (error) {
    console.error('\n  An unexpected error occurred during the test run:', error)
    process.exit(1)
  }
}

run()
