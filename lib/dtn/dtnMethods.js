import { AAPForwarder } from "../aap/forwarder.js";
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

/**
 * @description: Handles the AAP forwarding (creating the bundle and sending it to the AAP)
 * @param {String} method: Name of the operation (e.g. 'create', 'insertMany', etc...)
 * @param {String} modelName: Name of the model (e.g. 'users', 'posts', etc...)
 * @param {Object} fileHistory: File history object
 * @param {Object} data: Same as localParams,Parameters used to perform the local update ([0]: docs, [1]: options, [2]: callback)
 */
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
  console.log("actionType", actionType, "localParams", localParams);

  // Perform the desired operation on the local database.
  const mongooseResponse = await this[actionType](...localParams);
  let fileHistory = null;
  let data = {};

  // If it is a document, we only need to handle file history for it.
  if (isSingleCreationMethod(actionType)) {
    // Create the data object to send to the AAP forwarder.
    data = mongooseResponse.toObject();
    // Create the file history for the document
    fileHistory = await createNewHistory(data);
    // Save the history ID inside the data
    data._fileHistoryID = fileHistory._id;
    // Update the document with the file historyID
    await this.updateOne({ _id: data._id }, { $set: { _fileHistoryID: fileHistory._id } });

    // TODO: Since _fileHistoryID is not in the schema, it doesn't get saved in the database.
    // TODO: We need to add it to the schema somehow, or make the user add it to the schema. :(
  }

  // Creation methods may return a document or an array of documents.
  if (isMultipleCreationMethod(actionType)) {
    // Array of history for each document.
    fileHistory = [];

    // Create the data object to send to the AAP forwarder.
    data = mongooseResponse.map((document) => document.toObject());

    await Promise.all(
      data.map(async (document, i) => {
        // Create the file history for each document.
        fileHistory.push(await createNewHistory(document));
        // Save the history ID inside the data.
        document._fileHistoryID = fileHistory[i]._id;
        // Update the historyID of the documents.
        await this.updateOne({ _id: document._id }, { $set: { _fileHistoryID: fileHistory[i]._id } });
      })
    );
  }

  // DTN Update.
  await handleAAPForwarder(actionType, this.modelName, fileHistory, localParams);

  // Return the local response.
  return mongooseResponse;
}

/**
 * @description: Handles any deletion action in the local database, the file history, and the AAP forwarding
 * @param {String} actionType: Name of the operation ('deleteOne', 'findOneAndDelete', 'findOneAndRemove', 'findByIdAndDelete', 'findByIdAndRemove', 'deleteMany')
 * @param {Object} localParams: Parameters used to perform the local update ([0]: filter, [1]: options, [2]: callback)
 */
async function handleDeletionMethods(actionType, localParams) {
  console.log("actionType", actionType, "localParams", localParams);

  let conditions = localParams[0];
  if (typeof conditions === "string") {
    // If the conditions are a string, we need to convert it to an object.
    conditions = { _id: conditions };
  }

  let mongooseResponse;
  let fileHistory;

  if (isSingleDeletionMethod(actionType)) {
    // Get the document using the conditions.
    const document = await this.findOne(conditions);

    // If the document doesn't exist, we don't need to do anything.
    if (!document) {
      return;
    }

    // Get id of file history.
    fileHistory = document._fileHistoryID;

    // If the document exists, we need to delete the history.
    await deleteHistory(fileHistory);

    // Perform the desired operation on the local database.
    mongooseResponse = await this[actionType](...localParams);
  } else if (isMultipleDeletionMethod(actionType)) {
    // Get all the documents using the conditions.
    const documents = await this.find(conditions);

    // If the documents don't exist, we don't need to do anything.
    if (!documents) {
      return;
    }

    fileHistory = documents.map((document) => document._fileHistoryID);

    // Delete the history for each document.
    await deleteHistory(fileHistory);

    // Perform the desired operation on the local database.
    mongooseResponse = await this[actionType](...localParams);
  }

  // DTN Update.
  await handleAAPForwarder(actionType, this.modelName, fileHistory, localParams);

  return mongooseResponse;
}

/**
 * @description: Handles any update action in the local database, the file history, and the AAP forwarding
 * @param {String} actionType: Name of the operation ('updateOne', 'replaceOne', 'findOneAndReplace', 'findOneAndUpdate', 'findByIdAndUpdate', 'updateMany')
 * @param {Object} localParams: Parameters used to perform the local update ([0]: filter, [1]: update, [2]: options, [3]: callback)
 */
async function handleUpdateMethods(actionType, localParams) {
  console.log("actionType", actionType, "localParams", localParams);

  // We do not perform the update yet, because some of the update
  // methods do not return the documents after performing the update.
  let mongooseResponse = null;
  const filter = localParams[0];

  if (isSingleUpdateMethod(actionType)) {
    // Get the id of the document that matches the filter.
    let data = await this.findOne(filter);

    // If the document doesn't exist, we don't need to do anything.
    if (!data) {
      return;
    }

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
    const newFileHistory = await pushTohistory({
      document: newDocumentVersion,
      fileHistoryID: newDocumentVersion._fileHistoryID,
    });

    // DTN Update
    await handleAAPForwarder(actionType, this.modelName, newFileHistory, localParams);
  } else if (isMultipleUpdateMethod(actionType)) {
    // Get all the ids of the documents that match the query.
    const localDocuments = await this.find(filter);

    // If the documents don't exist, we don't need to do anything.
    if (!localDocuments) {
      return;
    }

    const ids = localDocuments.map((document) => document._id);

    // Update the local database
    mongooseResponse = await this[actionType](...localParams);

    // If there is no modifiedCount or upsertedId,
    // it means that the update didn't change anything.
    if (!mongooseResponse.modifiedCount && !mongooseResponse.upsertedId) {
      return;
    }

    // Find the new versions of all documents
    const newDocumentVersions = await Promise.all(ids.map((_id) => this.findOne({ _id })));

    // Push the new version to the file history and get newFileHistory of each document.
    const newFileHistoryArray = await Promise.all(
      newDocumentVersions.map((document) =>
        pushTohistory({
          document,
          fileHistoryID: document._fileHistoryID,
        })
      )
    );

    // DTN Update
    await handleAAPForwarder(actionType, this.modelName, newFileHistoryArray, localParams);
  }

  return mongooseResponse;
}

/**
 * @description: This creates a function that edits the local database and calls the forwarder.
 * @param {String} actionType: The name of the operation ('create', 'deleteMany', etc...)
 */
export const createDTNMethod = function (actionType) {
  return async function (localParams) {
    // Safe check for the localParams spread operator used by the mongoose methods.
    if (!Array.isArray(localParams)) {
      localParams = [localParams];
    }

    if (isCreationMethod(actionType)) {
      return await handleCreationMethods.bind(this)(actionType, localParams);
    }

    if (isUpdateMethod(actionType)) {
      return await handleUpdateMethods.bind(this)(actionType, localParams);
    }

    if (isDeletionMethod(actionType)) {
      return await handleDeletionMethods.bind(this)(actionType, localParams);
    }
  };
};
