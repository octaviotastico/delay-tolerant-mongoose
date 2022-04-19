// Library Imports
import { v4 as uuidv4 } from "uuid";

// Local Imports
import { FileHistoryModel } from "./fileHistoryModel";

export const createNewHistory = async (document) => {
  if (Array.isArray(document)) {
    document.forEach((doc) =>
      await FileHistoryModel.create({
        changeIDs: [uuidv4()],
        dataChanges: [JSON.stringify(doc)],
      })
    );
    return;
  }

  return await FileHistoryModel.create({
    changeIDs: [uuidv4()],
    dataChanges: [JSON.stringify(document)],
  });

};

export const saveNewHistory = async (newHistory) => {
  if (Array.isArray(newHistory)) {
    newHistory.forEach((history) => FileHistoryModel.create(history));
    return;
  }

  return await FileHistoryModel.create(newHistory);
};

export const pushTohistory = async ({ changeID, fileHistoryID, document }) => {
  await FileHistoryModel.updateOne(
    { _id: fileHistoryID },
    { $push: { changeIDs: [changeID || uuidv4()] } },
    { $push: { dataChanges: [JSON.stringify(document)] } } // TODO: Change this to be only the new changes, not the entire new document, to save space
  );

  return await FileHistoryModel.findOne({ _id: id });
};

export const getLatestChangeID = async (id) => {
  const history = await FileHistoryModel.findOne({ _id: id });
  return history.changeIDs[history.changeIDs.length - 1];
};

export const getLatestCommonParent = (h1, h2) => {
  const history1 = await FileHistoryModel.findOne({ _id: id1 });
  const history2 = await FileHistoryModel.findOne({ _id: id2 });

  const h1IDs = history1.changeIDs;
  const h2IDs = history2.changeIDs;

  for (let i = h1IDs.length - 1; i >= 0; i--) {
    const elem = h1IDs[i];
    if (h2IDs.includes(elem)) {
      return { data: history1.dataChanges[i], changeID: elem };
    };
  }

  return null;
};

export const deleteHistory = async (id) => {
  if (Array.isArray(id)) {
    id.forEach(async (_id) => {
      await FileHistoryModel.deleteOne({ _id });
    });
    return;
  }
  return await FileHistoryModel.deleteOne({ _id: id });
};
