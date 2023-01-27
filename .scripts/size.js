import brotliSize from 'brotli-size'
import path from 'path'

export const size = async (filePath) => {
  let size
  try {
    size = await brotliSize.file(filePath)
  } catch (error) {
    console.log('Unable to determine file size of ' + path.basename(filePath))
    return
  }

  size = (size / 1024).toFixed(2) + 'kB'
  console.log(size + ' is ' + path.basename(filePath) + ' when using brotli compression!')
}
