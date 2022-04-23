import {
  creationMethods,
  singleCreationMethods,
  multipleCreationMethods,
  deletionMethods,
  singleDeleteMethods,
  multipleDeleteMethods,
  updateMethods,
  singleUpdateMethods,
  multipleUpdateMethods,
  mergeStrategies,
  termColors,
} from "./constants.js";

// Creation methods
export const isCreationMethod = (actionType) => {
  return creationMethods.includes(actionType);
};

export const isSingleCreationMethod = (actionType) => {
  return singleCreationMethods.includes(actionType);
};

export const isMultipleCreationMethod = (actionType) => {
  return multipleCreationMethods.includes(actionType);
};

// Deletion methods
export const isDeletionMethod = (actionType) => {
  return deletionMethods.includes(actionType);
};

export const isSingleDeletionMethod = (actionType) => {
  return singleDeleteMethods.includes(actionType);
};

export const isMultipleDeletionMethod = (actionType) => {
  return multipleDeleteMethods.includes(actionType);
};

// Update methods
export const isUpdateMethod = (actionType) => {
  return updateMethods.includes(actionType);
};

export const isSingleUpdateMethod = (actionType) => {
  return singleUpdateMethods.includes(actionType);
};

export const isMultipleUpdateMethod = (actionType) => {
  return multipleUpdateMethods.includes(actionType);
};

// Merge strategies
export const isValidMergeStrategy = (strategy) => {
  return Object.values(mergeStrategies).includes(strategy);
};

export const validateMergeStrategyArray = () => Object.values(mergeStrategies).toString().replace(",", ", ");

// Console colors
export const consoleError = (message) => {
  console.error(`${termColors.FgRed}${message}${termColors.Reset}`);
};

// Config Object
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
    consoleError(`Valid MERGE_STRATEGY values are: ${validateMergeStrategyArray()}`);
    isValid = false;
  }
  return isValid;
};
