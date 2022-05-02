import { termColors } from "./constants.js";

/**
 * @description Await on this function to wait for ms milliseconds.
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise}
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @description: Returns if the given object is iterable or not.
 * @param {Object} obj: Object to be checked.
 */
export const isIterable = (obj) => {
  if ([null, undefined].includes(obj)) {
    return false;
  }

  return typeof obj[Symbol.iterator] === "function";
};

/**
 * @description: Prints the given error message in the terminal with color red.
 * @param {String} message: Error message to be printed.
 */
export const consoleError = (message) => {
  console.error(`${termColors.FgRed}${message}${termColors.Reset}`);
};
