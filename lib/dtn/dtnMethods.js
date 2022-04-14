import { AAPForwarder } from "./aap/forwarder";
import { creationMethods, deletionMethods, updateMethods } from "./dtn/constants.js";
import { isCreationMethod, isUpdateMethod } from "./commons";
import { createNewHistory, deleteHistory, pushTohistory } from "../fileHistory/fileHistoryActions";

const handleFileHistory = (document, actionType) => {
  if (creationMethods.includes(actionType)) {
    return createNewHistory(document);
  } else if (deletionMethods.includes(actionType)) {
    deleteHistory(document._fileHistoryID);
  } else if (updateMethods.includes(actionType)) {
    return pushTohistory(document._fileHistoryID, document);
  }
};

/**
 * @description: Handles any creation action in the local database, the file history, and the AAP forwarding
 * @param {String} actionType: Name of the operation ('create' or 'insertMany')
 * @param {Object} localParams: Parameters used to perform the local update ([0]: docs, [1]: options, [2]: callback)
 */
const handleCreationMethods = (actionType, localParams) => {
  // Perform the desired operation on the local database.
  const mongooseResponse = await this[actionType](...localParams);
  let fileHistory = null;
  let data = {};

  // If it is a document, we only need to handle file history for it.
  if (actionType === "create") {
    // Create the data object to send to the AAP forwarder.
    data = { ...mongooseResponse };
    // Create the file history for the document
    fileHistory = handleFileHistory(data, actionType);
    // Save the history ID inside the data
    data._fileHistoryID = fileHistory._id;
    // Update the document with the file historyID
    this.updateOne({ _id: data._id }, { $set: { _fileHistoryID: fileHistory._id } });
  }

  // Creation methods may return a document or an array of documents.
  if (actionType === "insertMany") {
    // Array of history for each document.
    fileHistory = [];

    // Create the data object to send to the AAP forwarder.
    data = [...mongooseResponse];

    data.forEach((document, i) => {
      // Create the file history for each document.
      fileHistory.push(handleFileHistory(document, actionType));
      // Save the history ID inside the data
      document._fileHistoryID = fileHistory[i]._id;
      // Update the historyID of the documents.
      this.updateOne({ _id: document._id }, { $set: { _fileHistoryID: fileHistory[i]._id } });
    });

  }

  // DTN Update.
  await AAPForwarder({
    message: {
      type: actionType,
      modelName: this.modelName,
      localDate: new Date().getTime(),
      fileHistory,
      data,
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });

  // Return the created document.
  return data;
};

const handleDeletionMethods = (documents, actionType) => {
  return;
};

const handleUpdateMethods = (documents, actionType) => {
  return;
};

/**
 * @description: This creates a function that edits the local database and calls the forwarder.
 * @param {String} actionType: The name of the operation ('create', 'deleteMany', etc...)
 */
export const createDTNMethod = function (actionType) {
  return async function (localParams) {
    // If the operation is deletion, first we need to get the document.
    // Because deleteOne and deleteMany don't return the document.
    let documentBeforeUpdate;
    if (deletionMethods.includes(actionType)) {
      documentBeforeUpdate = await this.findOne(localParams);
    }

    // Perform the desired operation on the local database.
    const mongooseResponse = await this[actionType](...localParams);
    let data = { ...localParams };

    // TODO: Improve this and move all this if's to a new function.
    // Creation methods may return a document or an array of documents.
    if (creationMethods.includes(actionType)) {
      data = mongooseResponse;

      if (Array.isArray(data)) {
        // If it is an array, we need to handle file history for each one.
        data.forEach((document) => {
          document._fileHistoryID = handleFileHistory(document, actionType);
        });
        // We also need to update the file history for all the documents in the database.
        data.forEach((document) => {
          this.updateOne({ _id: document._id }, { $set: { _fileHistoryID: document._fileHistoryID } }, done);
        });
      } else {
        // If it is a document, we only need to handle file history for it.
        data._fileHistoryID = handleFileHistory(data, actionType);
        this.updateOne({ _id: data._id }, { $set: { _fileHistoryID: data._fileHistoryID } }, done);
      }
    } else if (deletionMethods.includes(actionType)) {
      // Since deleteOne and deleteMany don't return the document, we save
      // the document before deleting it in the documentBeforeUpdate variable.

      if (Array.isArray(documentBeforeUpdate)) {
        // If it is an array, we need to handle file history for each one.
        documentBeforeUpdate.forEach((document) => {
          handleFileHistory(document, actionType);
        });
      } else {
        // If it is a document, we only need to handle file history for it.
        handleFileHistory(documentBeforeUpdate, actionType);
      }
    } else if (updateMethods.includes(actionType)) {
      // A lot of update methods don't return the entire document,
      // so we need to get the document again.
      // const document = await this.findOne({ _id: localParams[0] }); // This is bad for multiple updates.

      if (actionType === "updateMany") {
        // If it is an array, we need to handle file history for each one.
        const localDocuments = this.find(localParams[0]); // Finds all the documents that match the query.
        localDocuments.forEach((document) => {
          handleFileHistory(document, actionType);
        });
      } else {
        // If it is a document, we only need to handle file history for it.
        const localDocument = await this.findOne(localParams[0]);
        handleFileHistory(localDocument, actionType);
      }
    }

    // DTN Update.
    await AAPForwarder({
      message: {
        type: actionType,
        modelName: this.modelName,
        localDate: new Date().getTime(),
        data,
      },
      eids: delayTolerantMongoose.dtnConfig.EID_LIST,
      dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
      dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
    });

    // Return the created document.
    return data;
  };
};

/**
 * @description: This creates a function that edits the local database and calls the forwarder.
 * @param {String} actionType: The name of the operation ('create', 'deleteMany', etc...)
 */
export const createDTNMethod2 = function (actionType) {
  return async function (localParams) {
    if(isCreationMethod(actionType)) {
      handleCreationMethods(actionType, localParams);
    }

    //////////////////////////////////////////////

    if(isUpdateMethod(actionType)) {
      // We don't perform the update yey, because some
      // methods don't return the updated documents.

      if (actionType === "updateOne") {
        // UpdateOne doesn't return the entire document,
        // so we need to get the document again.
        const filter = localParams[0];
        const update = localParams[1];
        const options = localParams[2];

        // Get the id of the document that matches the filter.
        let data = await this.findOne(filter);
        const _id = data._id;

        // Update the local database.
        const mongooseResponse = await this[actionType](...localParams);

        // If there is no modifiedCount or upsertedId,
        // it means that the update didn't change anything.
        if (!mongooseResponse.modifiedCount && !mongooseResponse.upsertedId) {
          return;
        }

        // Find the new versions of all documents
        const newDocumentVersion = await this.findOne({ _id });

        // Push the new version to the file history and get newFileHistory.
        const newFileHistory = handleFileHistory(newDocumentVersion, actionType);

        await AAPForwarder({
          message: {
            type: actionType,
            modelName: this.modelName,
            localDate: new Date().getTime(),
            data: newDocumentVersion,
            fileHistory: newFileHistory,
          },
          eids: delayTolerantMongoose.dtnConfig.EID_LIST,
          dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
          dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
        });
      } else if (actionType === "updateMany") {

        // ----------------------------------- >

        // UpdateMany doesn't return the entire documents,
        // so we need to get the documents again.
        const filter = localParams[0];
        const update = localParams[1];
        const options = localParams[2];

        // Get all the ids of the documents that match the query.
        const localDocuments = await this.find(filter);
        const ids = localDocuments.map((document) => document._id);

        // Update the local database
        const mongooseResponse = await this[actionType](...localParams);

        // If there is no modifiedCount or upsertedId,
        // it means that the update didn't change anything.
        if (!mongooseResponse.modifiedCount && !mongooseResponse.upsertedId) {
          return;
        }

        // Find the new versions of all documents
        const newDocumentVersions = ids.map(id => this.findOne({ _id: id }));

        // Push the new version to the file history and get newFileHistory of each document.
        const newFileHistoryArray = newDocumentVersions.map((document) =>
          handleFileHistory(document, actionType)
        );

        await AAPForwarder({
          message: {
            type: actionType,
            modelName: this.modelName,
            localDate: new Date().getTime(),
            data: newDocumentVersions,
            fileHistory: newFileHistoryArray,
          },
          eids: delayTolerantMongoose.dtnConfig.EID_LIST,
          dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
          dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
        });

        // ----------------------------------- >

      }


    }

    //////////////////////////////////////////////
  };
};
