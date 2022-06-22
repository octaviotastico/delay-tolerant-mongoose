import { consoleError } from "../utils/utils.js";
import {
  // Creation methods
  creationMethods,
  singleCreationMethods,
  multipleCreationMethods,
  // Deletion methods
  deletionMethods,
  singleDeleteMethods,
  multipleDeleteMethods,
  // Update methods
  updateMethods,
  singleUpdateMethods,
  multipleUpdateMethods,
  // Merge strategies
  mergeStrategies,
} from "./constants.js";

/**
 * @description: Returns if the given method is a creation method or not.
 * @param {String} actionType: Name of the operation (e.g. 'create', 'deleteMany', etc...)
 */
export const isCreationMethod = (actionType) => {
  return creationMethods.includes(actionType);
};

/**
 * @description: Returns if the given method is a single document creation method or not.
 * @param {String} actionType: Name of the operation (e.g. 'create', 'deleteMany', etc...)
 */
export const isSingleCreationMethod = (actionType) => {
  return singleCreationMethods.includes(actionType);
};

/**
 * @description: Returns if the given method is a multiple document creation method or not.
 * @param {String} actionType: Name of the operation (e.g. 'create', 'deleteMany', etc...)
 */
export const isMultipleCreationMethod = (actionType) => {
  return multipleCreationMethods.includes(actionType);
};

/**
 * @description: Returns if the given method is a deletion method or not.
 * @param {String} actionType: Name of the operation (e.g. 'create', 'deleteMany', etc...)
 */
export const isDeletionMethod = (actionType) => {
  return deletionMethods.includes(actionType);
};

/**
 * @description: Returns if the given method is a single document deletion method or not.
 * @param {String} actionType: Name of the operation (e.g. 'create', 'deleteMany', etc...)
 */
export const isSingleDeletionMethod = (actionType) => {
  return singleDeleteMethods.includes(actionType);
};

/**
 * @description: Returns if the given method is a multiple document deletion method or not.
 * @param {String} actionType: Name of the operation (e.g. 'create', 'deleteMany', etc...)
 */
export const isMultipleDeletionMethod = (actionType) => {
  return multipleDeleteMethods.includes(actionType);
};

/**
 * @description: Returns if the given method is an update method or not.
 * @param {String} actionType: Name of the operation (e.g. 'create', 'deleteMany', etc...)
 */
export const isUpdateMethod = (actionType) => {
  return updateMethods.includes(actionType);
};

/**
 * @description: Returns if the given method is a single document update method or not.
 * @param {String} actionType: Name of the operation (e.g. 'create', 'deleteMany', etc...)
 */
export const isSingleUpdateMethod = (actionType) => {
  return singleUpdateMethods.includes(actionType);
};

/**
 * @description: Returns if the given method is a multiple document update method or not.
 * @param {String} actionType: Name of the operation (e.g. 'create', 'deleteMany', etc...)
 */
export const isMultipleUpdateMethod = (actionType) => {
  return multipleUpdateMethods.includes(actionType);
};

/**
 * @description: Returns if the given merge strategy is valid or not.
 * @param {String} strategy: Name of the merge strategy.
 */
export const isValidMergeStrategy = (strategy) => {
  return Object.values(mergeStrategies).includes(strategy);
};

/**
 * @description: Returns all the currently implemented merge strategies.
 */
export const allMergeStrategies = () => Object.values(mergeStrategies).toString().replace(",", ", ");

/**
 * @description: Returns if the given delay-tolerant-mongoose configuration object is valid or not.
 * @param {Object} config: Configuration object.
 */
export const isValidConfig = (config) => {
  let isValid = true;
  if ([null, undefined, ""].includes(config.AGENT_ID)) {
    consoleError("AGENT_ID is not defined.");
    isValid = false;
  }
  if ([null, undefined, ""].includes(config.DTN_HOST)) {
    consoleError("DTN_HOST is not defined.");
    isValid = false;
  }
  if ([null, undefined, ""].includes(config.DTN_PORT)) {
    consoleError("DTN_PORT is not defined.");
    isValid = false;
  }
  if ([null, undefined, ""].includes(config.EID_LIST)) {
    consoleError("EID_LIST is not defined.");
    isValid = false;
  }
  if ([null, undefined, ""].includes(config.REAL_TIME_UPDATE)) {
    consoleError("REAL_TIME_UPDATE is not defined.");
    isValid = false;
  }
  if ([null, undefined, ""].includes(config.UPDATE_INTERVAL)) {
    consoleError("UPDATE_INTERVAL is not defined.");
    isValid = false;
  }
  if ([null, undefined, ""].includes(config.MERGE_STRATEGY)) {
    consoleError("MERGE_STRATEGY is not defined.");
    isValid = false;
  }
  if ([null, undefined, ""].includes(config.SCHELUDE_CRON_UPDATE)) {
    consoleError("SCHELUDE_CRON_UPDATE is not defined.");
    isValid = false;
  }
  if (!isValidMergeStrategy(config.MERGE_STRATEGY)) {
    consoleError("MERGE_STRATEGY is not valid.");
    consoleError(`Valid MERGE_STRATEGY values are: ${allMergeStrategies()}`);
    isValid = false;
  }
  return isValid;
};
