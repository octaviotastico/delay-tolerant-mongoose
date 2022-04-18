// TODO: Use something like this, instead of just using the strings.
export const mergeStrategies = {
  NONE: "none",
  THREE_WAY: "threeWayMerge",
}

export const creationMethods = ["create", "insertMany"];

export const deletionMethods = [
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
  "findOneAndRemove",
  "findByIdAndDelete",
  "findByIdAndRemove",
];

export const updateMethods = [
  "updateOne",
  "updateMany",
  "replaceOne",
  "findOneAndReplace",
  "findOneAndUpdate",
  "findByIdAndUpdate",
];
