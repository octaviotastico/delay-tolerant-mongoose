import mongoose from "mongoose";

const { model, Schema } = mongoose;

export const FileHistoryModel = model(
  "__delayTolerantMongooseFileHistory",
  Schema({
    changeIDs: [{ type: String }],
    dataChanges: [{ type: String }],
  })
);
