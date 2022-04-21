import { AAPForwarder } from "../aap/forwarder.js";
import { creationMethods, deletionMethods, updateMethods } from "../dtn/constants.js";
import { createNewHistory, deleteHistory, pushTohistory } from "../fileHistory/fileHistoryActions.js";
import {
  isCreationMethod,
  isUpdateMethod,
  isDeletionMethod,
  isSingleDeletionMethod,
  isSingleCreationMethod,
  isMultipleCreationMethod,
  isSingleUpdateMethod,
  isMultipleUpdateMethod,
  isMultipleDeletionMethod,
} from "./commons.js";

const handleFileHistory = ({ document, actionType, fileHistoryID }) => {
  if (creationMethods.includes(actionType)) {
    return createNewHistory(document);
  } else if (deletionMethods.includes(actionType)) {
    return deleteHistory(fileHistoryID);
  } else if (updateMethods.includes(actionType)) {
    return pushTohistory({ fileHistoryID, document });
  }
};

const handleAAPForwarder = async (method, modelName, fileHistory, data) => {
  await AAPForwarder({
    message: {
      method,
      modelName,
      localDate: new Date().getTime(),
      fileHistory,
      data,
    },
    eids: global.EID_LIST,
    dtnHost: global.DTN_HOST,
    dtnPort: global.DTN_PORT,
  });
};

/**
 * @description: Handles any creation action in the local database, the file history, and the AAP forwarding
 * @param {String} actionType: Name of the operation ('create' or 'insertMany')
 * @param {Object} localParams: Parameters used to perform the local update ([0]: docs, [1]: options, [2]: callback)
 */
async function handleCreationMethods(actionType, localParams) {
  // Perform the desired operation on the local database.
  const mongooseResponse = await this[actionType](...localParams);
  let fileHistory = null;
  let data = {};

  // If it is a document, we only need to handle file history for it.
  if (isSingleCreationMethod(actionType)) {
    // Create the data object to send to the AAP forwarder.
    data = { ...mongooseResponse };
    // Create the file history for the document
    fileHistory = handleFileHistory({ document: data, actionType });
    // Save the history ID inside the data
    data._fileHistoryID = fileHistory._id;
    // Update the document with the file historyID
    this.updateOne({ _id: data._id }, { $set: { _fileHistoryID: fileHistory._id } });
  }

  // Creation methods may return a document or an array of documents.
  if (isMultipleCreationMethod(actionType)) {
    // Array of history for each document.
    fileHistory = [];

    // Create the data object to send to the AAP forwarder.
    data = [...mongooseResponse];

    data.forEach((document, i) => {
      // Create the file history for each document.
      fileHistory.push(handleFileHistory({ document, actionType }));
      // Save the history ID inside the data
      document._fileHistoryID = fileHistory[i]._id;
      // Update the historyID of the documents.
      this.updateOne({ _id: document._id }, { $set: { _fileHistoryID: fileHistory[i]._id } });
    });
  }

  // DTN Update.
  await handleAAPForwarder(actionType, this.modelName, fileHistory, localParams);

  // Return the local response.
  return mongooseResponse;
}

const handleDeletionMethods = async (actionType, localParams) => {
  const conditions = localParams[0];
  let mongooseResponse;
  let fileHistory;

  if (isSingleDeletionMethod(actionType)) {
    // Get the document using the conditions.
    const document = await this.findOne(conditions); // TODO: Check if it works with ID search.

    // Get id of file history.
    fileHistory = document._fileHistoryID;

    // If the document exists, we need to delete the history.
    handleFileHistory({ fileHistoryID: fileHistory, actionType });

    // Perform the desired operation on the local database.
    mongooseResponse = await this[actionType](...localParams);
  } else if (isMultipleDeletionMethod(actionType)) {
    // Get all the documents using the conditions.
    const documents = await this.find(conditions);
    fileHistory = documents.map((document) => document._fileHistoryID);

    // Delete the history for each document.
    handleFileHistory({ fileHistoryID: fileHistory, actionType });

    // Perform the desired operation on the local database.
    mongooseResponse = await this[actionType](...localParams);
  }

  // DTN Update.
  await handleAAPForwarder(actionType, this.modelName, fileHistory, localParams);

  return mongooseResponse;
};

const handleUpdateMethods = async (actionType, localParams) => {
  // We do not perform the update yet, because some of the update
  // methods do not return the documents after performing the update.
  let mongooseResponse = null;
  const filter = localParams[0];

  if (isSingleUpdateMethod(actionType)) {
    // Get the id of the document that matches the filter.
    let data = await this.findOne(filter);
    const _id = data._id;

    // Update the local database.
    mongooseResponse = await this[actionType](...localParams);

    // If there is no modifiedCount or upsertedId,
    // it means that the update didn't change anything.
    if (!mongooseResponse.modifiedCount && !mongooseResponse.upsertedId) {
      return;
    }

    // Find the new versions of all documents
    const newDocumentVersion = await this.findOne({ _id });

    // Push the new version to the file history and get newFileHistory.
    const newFileHistory = handleFileHistory({
      document: newDocumentVersion,
      fileHistoryID: newDocumentVersion._fileHistoryID,
      actionType,
    });

    // DTN Update
    await handleAAPForwarder(actionType, this.modelName, newFileHistory, localParams);
  } else if (isMultipleUpdateMethod(actionType)) {
    // Get all the ids of the documents that match the query.
    const localDocuments = await this.find(filter);
    const ids = localDocuments.map((document) => document._id);

    // Update the local database
    mongooseResponse = await this[actionType](...localParams);

    // If there is no modifiedCount or upsertedId,
    // it means that the update didn't change anything.
    if (!mongooseResponse.modifiedCount && !mongooseResponse.upsertedId) {
      return;
    }

    // Find the new versions of all documents
    const newDocumentVersions = ids.map((id) => this.findOne({ _id: id }));

    // Push the new version to the file history and get newFileHistory of each document.
    const newFileHistoryArray = newDocumentVersions.map((document) =>
      handleFileHistory({
        document,
        fileHistoryID: document._fileHistoryID,
        actionType,
      })
    );

    // DTN Update
    await handleAAPForwarder(actionType, this.modelName, newFileHistoryArray, localParams);
  }

  return mongooseResponse;
};

/**
 * @description: This creates a function that edits the local database and calls the forwarder.
 * @param {String} actionType: The name of the operation ('create', 'deleteMany', etc...)
 */
export const createDTNMethod = function (actionType) {
  return async function (localParams) {
    if (isCreationMethod(actionType)) {
      return await handleCreationMethods(actionType, localParams);
    }

    if (isUpdateMethod(actionType)) {
      return await handleUpdateMethods(actionType, localParams);
    }

    if (isDeletionMethod(actionType)) {
      return await handleDeletionMethods(actionType, localParams);
    }
  };
};
