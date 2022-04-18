import { model, Schema } from "mongoose";

export const FileHistoryModel = model(
  "__delayTolerantMongooseFileHistory",
  Schema({
    historyIDs: [{ type: String }],
    dataChanges: [{ type: String }],
  })
);
