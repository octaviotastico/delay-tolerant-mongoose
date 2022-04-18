// TODO: Use something like this, instead of just using the strings.
export const mergeStrategies = {
  NONE: "none",
  THREE_WAY: "threeWayMerge",
};

// Creation methods
export const singleCreationMethods = ["create"];
export const multipleCreationMethods = ["insertMany"];
export const creationMethods = [...singleCreationMethods, ...multipleCreationMethods];

// Deletion methods
export const singleDeleteMethods = [
  "deleteOne",
  "findOneAndDelete",
  "findOneAndRemove",
  "findByIdAndDelete",
  "findByIdAndRemove",
];
export const multipleDeleteMethods = ["deleteMany"];
export const deletionMethods = [...singleDeleteMethods, ...multipleDeleteMethods];

// Update methods
export const singleUpdateMethods = [
  "updateOne",
  "replaceOne",
  "findOneAndReplace",
  "findOneAndUpdate",
  "findByIdAndUpdate",
];
export const multipleUpdateMethods = ["updateMany"];
export const updateMethods = [...singleUpdateMethods, ...multipleUpdateMethods];
