import { creationMethods, deletionMethods, updateMethods } from "./constants";

export const isCreationMethod = (actionType) => {
  return creationMethods.includes(actionType);
};

export const isDeletionMethod = (actionType) => {
  return deletionMethods.includes(actionType);
};

export const isUpdateMethod = (actionType) => {
  return updateMethods.includes(actionType);
};
