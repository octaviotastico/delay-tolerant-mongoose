import { model, Schema } from "mongoose";

const FileHistoryModel = model(
  "__delayTolerantMongooseFileHistory",
  Schema({
    historyIDs: [{ type: String }],
    dataChanges: [{ type: String }],
  })
);

module.exports = FileHistoryModel;
