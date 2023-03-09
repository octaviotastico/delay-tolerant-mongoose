// Library Imports
import { v4 as uuidv4 } from "uuid";

// Local Imports
import { FileHistoryModel } from "./fileHistoryModel.js";

/**
 * @description: Creates a new file history entry to track changes of a document.
 * @param {Object} document: Document to which we will track the changes.
 */
export const createNewHistory = async (document) => {
  if (Array.isArray(document)) {
    return await Promise.all(
      document.map((doc) =>
        FileHistoryModel.create({
          changeIDs: [uuidv4()],
          dataChanges: [JSON.stringify(doc)],
          documentID: doc._id,
        })
      )
    );
  }

  return await FileHistoryModel.create({
    changeIDs: [uuidv4()],
    dataChanges: [JSON.stringify(document)],
    documentID: document._id,
  });
};

/**
 * @description: Saves a previously created file history in the database.
 * @param {Object} newHistory: History to be saved into the DB.
 */
export const saveNewHistory = async (newHistory) => {
  if (Array.isArray(newHistory)) {
    return await Promise.all(
      newHistory.history((history) => {
        FileHistoryModel.create(history);
      })
    );
  }

  return await FileHistoryModel.create(newHistory);
};

/**
 * @description: Push new version of a document to the file history.
 * @param {Object} document: Latest versioin of the document.
 * @param {Object} changeID: ID of the latest version of the document.
 * @param {String} fileHistoryID: ID of the file history.
 */
export const pushTohistory = async ({ document, changeID, fileHistoryID }) => {
  console.log("[INFO] Pushing new change to history.");

  const fileHistory = await FileHistoryModel.findOne(
    fileHistoryID ? { _id: fileHistoryID } : { documentID: document._id || document.id }
  );

  // TODO: Change this to be only the new changes, not the entire new document, to save space.
  fileHistory.dataChanges.push(JSON.stringify(document));
  fileHistory.changeIDs.push(changeID || uuidv4());

  return await fileHistory.save();
};

/**
 * @description: Returns latest changeID.
 * @param {Object} filter: Filter to get the local file history object.
 */
export const getLatestChangeID = async (filter) => {
  const history = await FileHistoryModel.findOne(filter);
  return history.changeIDs[history.changeIDs.length - 1];
};

/**
 * @description: Returns latest common parent between the local file history and the incoming file history.
 * @param {Object} filter: Filter to get the local file history object.
 * @param {Object} incomingFileHistory: Object with the incoming file history.
 */
export const getLatestCommonParent = async (filter, incomingFileHistory) => {
  const localHistory = await FileHistoryModel.findOne(filter);

  for (let i = localHistory.changeIDs.length - 1; i >= 0; i--) {
    const elem = localHistory.changeIDs[i];
    if (incomingFileHistory.changeIDs.includes(elem)) {
      return { data: localHistory.dataChanges[i], changeID: elem };
    }
  }

  return null;
};

/**
 * @description: Returns latest common parent between two local file histories.
 * @param {Object} filter1: Filter to get the first local file history object.
 * @param {Object} filter2: Filter to get the second local file history object.
 */
export const getLatestCommonParentInDB = async (filter1, filter2) => {
  const history1 = await FileHistoryModel.findOne(filter1);
  const history2 = await FileHistoryModel.findOne(filter2);

  const h1IDs = history1.changeIDs;
  const h2IDs = history2.changeIDs;

  for (let i = h1IDs.length - 1; i >= 0; i--) {
    const elem = h1IDs[i];
    if (h2IDs.includes(elem)) {
      return { data: history1.dataChanges[i], changeID: elem };
    }
  }

  return null;
};

/**
 * @description: Delete a file history entry in the DB.
 * @param {Object} filter: Filter to search the file history to delete.
 */
export const deleteHistory = async (filter) => {
  if (Array.isArray(filter)) {
    return await Promise.all(
      filter.map((f) => {
        FileHistoryModel.deleteOne(f);
      })
    );
  }

  return await FileHistoryModel.deleteOne(filter);
};
