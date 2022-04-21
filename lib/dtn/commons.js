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
