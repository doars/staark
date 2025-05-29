/**
 * Generates a 53-bit hash from a given string using the cyrb53 algorithm.
 *
 * @param {string} data - The input string to hash.
 * @param {number} [seed=0] - Optional seed value to alter the hash output.
 * @returns {number} A 53-bit integer hash of the input string.
 */
export const cyrb53 = (
  data,
  seed = 0,
) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
  for (let i = 0, characterCode; i < data.length; i++) {
    characterCode = data.charCodeAt(i)
    h1 = Math.imul(h1 ^ characterCode, 2654435761)
    h2 = Math.imul(h2 ^ characterCode, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}
