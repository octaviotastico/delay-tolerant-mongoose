import { model, Schema } from "mongoose";

export const FileHistoryModel = model(
  "__delayTolerantMongooseFileHistory",
  Schema({
    changeIDs: [{ type: String }],
    dataChanges: [{ type: String }],
  })
);
