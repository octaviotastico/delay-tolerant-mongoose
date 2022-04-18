// Local Imports
import { FileHistoryModel } from "./fileHistoryModel";

export const createNewHistory = async (document) => {
  return await FileHistoryModel.create({
    historyIDs: [uuidv4()],
    dataChanges: [JSON.stringify(document)],
  })
};

export const saveNewHistory = async (newHistory) => {
  return await FileHistoryModel.create(newHistory);
};

// TODO: Change this to be only the new changes, not the entire new document, to save space (a lot xD)
export const pushTohistory = async (id, newVersion) => {
  await FileHistoryModel.updateOne(
    { _id: id },
    { $push: { historyIDs: [uuidv4()] } },
    { $push: { dataChanges: [JSON.stringify(newVersion)] } }
  );

  return await FileHistoryModel.findOne({ _id: id });
};

export const deleteHistory = async (id) => {
  await FileHistoryModel.delete({ _id: id });
};
