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
  let fileHistory;

  if (isSingleCreationMethod(actionType)) {
    // Convert the monogoose response to a document.
    const document = mongooseResponse.toObject();
    // Create the file history for the document.
    fileHistory = await createNewHistory(document);
  } else if (isMultipleCreationMethod(actionType)) {
    // Convert the mongoose response to an array of objects.
    const documents = mongooseResponse.map((document) => document.toObject());
    // Create the file history for each document.
    fileHistory = await Promise.all(documents.map((document) => createNewHistory(document)));
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

  // Get the filter from the local params
  let filter = localParams[0];
  // If the filter is a string, we need to convert it to an object.
  if (typeof filter === "string") {
    filter = { _id: filter };
  }

  // We can't perform the local operation yet, because we need to get the document to delete the file history first.
  let mongooseResponse;
  let fileHistory;

  if (isSingleDeletionMethod(actionType)) {
    // Get the document using the filter.
    const document = await this.findOne(filter);

    // If the document doesn't exist, we don't need to do anything.
    if (!document) {
      return;
    }

    // Create file history object, so the foreign databases can delete the object too.
    fileHistory = { documentID: document._id };
  } else if (isMultipleDeletionMethod(actionType)) {
    // Get all the documents using the filter.
    const documents = await this.find(filter);

    // If the documents don't exist, we don't need to do anything.
    if (!documents) {
      return;
    }

    // Create file history object, so the foreign databases can delete the object too.
    fileHistory = documents.map((document) => ({ documentID: document._id }));
  }

  // Delete the history for each document.
  await deleteHistory(fileHistory);

  // Perform the desired operation on the local database.
  mongooseResponse = await this[actionType](...localParams);

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

  // Get the filter from the local params
  let filter = localParams[0];
  // If the filter is a string, we need to convert it to an object.
  if (typeof filter === "string") {
    filter = { _id: filter };
  }

  // We do not perform the update yet, because some of the update
  // methods do not return the documents after performing the update.
  let mongooseResponse;
  let fileHistory;

  if (isSingleUpdateMethod(actionType)) {
    // Get the document that matches the filter.
    let localDocument = await this.findOne(filter);

    // If the document doesn't exist, we don't need to do anything.
    if (!localDocument) {
      return;
    }

    // Get the ID of the document, to find it later, after performing the update.
    const id = localDocument._id;

    // Update the local database.
    mongooseResponse = await this[actionType](...localParams);

    // If there is no modifiedCount or upsertedId, it means that the update didn't change a thing.
    if (!mongooseResponse.modifiedCount && !mongooseResponse.upsertedId) {
      return;
    }

    // Find the new versions of the document.
    const newDocumentVersion = await this.findOne({ _id: id });

    // Push the new version to the file history.
    fileHistory = await pushTohistory({ document: newDocumentVersion });

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

    // If there is no modifiedCount or upsertedId, it means that the update didn't change anything.
    if (!mongooseResponse.modifiedCount && !mongooseResponse.upsertedId) {
      return;
    }

    // Find the new versions of all documents.
    const newDocumentVersions = await Promise.all(ids.map((_id) => this.findOne({ _id })));

    // Push the new version to the file history of each document.
    fileHistory = await Promise.all(newDocumentVersions.map((document) => pushTohistory({ document })));
  }

  // DTN Update
  await handleAAPForwarder(actionType, this.modelName, fileHistory, localParams);

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
