// Local Imports
import FileHistoryModel from "./fileHistoryModel";

export const createNewHistory = (document) => {
  const newHistory = new FileHistoryModel({
    historyIDs: [uuidv4()],
    dataChanges: [JSON.stringify(document)],
  }).save();

  return newHistory;
};

export const pushTohistory = (id, newVersion) => {
  // TODO: Change this to be only the new changes, not
  // the entire new document, to save space (a lot xD)
  FileHistoryModel.updateOne(
    { _id: id },
    { $push: { historyIDs: [uuidv4()] } },
    { $push: { dataChanges: [JSON.stringify(newVersion)] } }
  );

  return FileHistoryModel.findOne({ _id: id });
};

export const deleteHistory = (id) => {
  FileHistoryModel.delete({ _id: id });
};
