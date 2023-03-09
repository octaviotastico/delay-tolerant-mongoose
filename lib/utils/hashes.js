import { createHash } from 'crypto';

/**
 * @description: toASCII function takes a string and converts it to ASCII.
 * @param {String} str: String to be converted.
 * @returns {String} ASCII string.
 */
const toASCII = (str) => Buffer.from(str, 'binary').toString('base64');

/**
 * @description: hash_XOR function takes two strings and XORs them.
 * @param {String} s1: First string.
 * @param {String} s2: Second string.
 * @returns {String} XORed string.
 * @example hash_XOR('hello', 'world') === hash_XOR('world', 'hello') === 'HwoeAAs='
 */
export const hash_XOR = (s1, s2) => {
  let hash = '';
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    hash += String.fromCharCode(s1.charCodeAt(i) ^ s2.charCodeAt(i % s2.length));
  }

  // Parse to ASCII
  const ascii_result = toASCII(hash);

  // Return a result with the same length as the input
  return ascii_result.padEnd(Math.max(s1.length, s2.length), 'A');
}

/**
 * @description: hash_SHA3_256 function takes two strings and hashes them using SHA3-256.
 * @param {String} s1: First string.
 * @param {String} s2: Second string.
 * @returns {String} Hashed string.
 * @example hash_SHA3_256('hello', 'world') === hash_SHA3_256('world', 'hello') === '92dad'
 */
export const hash_SHA3_256 = (s1, s2) => {
  // Create a SHA3-256 hash
  const hash = createHash('sha3-256');

  // Concatenate the inputs depending on their position in the alphabet
  const input = s1 < s2 ? s1 + s2 : s2 + s1;

  // Update the hash with the input
  hash.update(input);

  // Get the digest
  const result = hash.digest('hex');

  // Return a result with the same length as the input
  return result.slice(0, Math.min(s1.length, s2.length));
}