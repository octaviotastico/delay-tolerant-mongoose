// Library Imports
import net from "net";
import mongoose from "mongoose";
import diff3 from "diff3"

// Local imports
import { saveNewHistory, deleteHistory, pushTohistory, getLatestChangeID } from "../fileHistory/fileHistoryActions";
import { isCreationMethod, isDeletionMethod, isSingleUpdateMethod } from "../dtn/commons";
import { AAPMessageTypes } from "./constants";
import { serializeMessage } from "./serializers";

/**
 * @description Await on this function to wait for ms milliseconds.
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @description Creates a connection to μD3TN.
 * @param {string} dtnHost The host of the μD3TN AAP interface.
 * @param {number} dtnPort The port of the μD3TN AAP interface.
 * @returns Returns a promise that resolves to a net.Socket object or an error if something goes wrong.
 */
const createClientConnection = (dtnHost, dtnPort) =>
  new Promise((resolve, reject) => {
    const client = net.createConnection(dtnPort, dtnHost, () => {
      resolve(client);
    });
    // Reject on error
    client.on("error", (err) => reject(err));
  });

/**
 * @description Connects to μD3TN and retries connection if it fails.
 * @param {string} dtnHost The host of the μD3TN AAP interface.
 * @param {number} dtnPort The port of the μD3TN AAP interface.
 * @param {number} agentID The agent ID we want to register.
 * @returns Returns a net.Socket object if connection was successful, or retries if doesn't.
 */
const connectAndRetry = async (dtnHost, dtnPort, agentID, msDelay = 5000) =>
  createClientConnection(dtnHost, dtnPort)
    .then((connection) => connection)
    .catch(async () => {
      console.log(`[ERROR] Failed to connect to μD3TN, retrying in ${msDelay / 1000} seconds.`);
      await delay(msDelay);
      return initializeDTN(dtnHost, dtnPort, agentID);
    });

/**
 * @description Closes the connection and throws a message to the console.
 * @param {*} netClient Connection to μD3TN.
 * @param {*} message Message to show in the console.
 */
const netClientConnectionEnd = (netClient, message) => {
  netClient.destroy();
  console.log(message);
  global.dtnStatistics.isConnected = false;
  connectAndRetry(dtnHost, dtnPort, agentID).then((client) => {
    netClient = client;
    global.dtnStatistics.isConnected = true;
  });
};

/**
 * @description Creates a connection to μD3TN, registers the application, and listens for messages.
 * @param {string} dtnHost The host of the μD3TN AAP interface.
 * @param {number} dtnPort The port of the μD3TN AAP interface.
 * @param {number} agentID The agent ID we want to register.
 */
export const initializeDTN = async (dtnHost, dtnPort, agentID) => {
  let netClient = await connectAndRetry(dtnHost, dtnPort, agentID);
  global.dtnNodeNetClient = netClient;

  console.log("[INFO] Connected successfuly to μD3TN.");
  global.dtnStatistics.isConnected = true;

  // Register to μD3TN with agent ID = 'bundlesink'
  console.log("[INFO] Sending register message to μD3TN.");
  netClient.write(
    serializeMessage({
      messageType: AAPMessageTypes.REGISTER,
      eid: agentID,
    })
  );

  netClient.on("end", async () => {
    netClientConnectionEnd(netClient, "[INFO] μD3TN disconnected, attempting to reconnect.");
  });

  netClient.on("error", async (error) => {
    netClientConnectionEnd(netClient, `[ERROR] μD3TN error: ${error}`);
  });

  // Listen for messages from foreign databases.
  listen(netClient);
};

/**
 * @description Listens for messages from μD3TN, and saves
 * all the foreign database updates into the local database.
 * @param {net.Socket} netClient The net.Socket object to listen on.
 */
const listen = async (netClient) => {
  const { deserializeMessage } = serializers;

  netClient.on("data", async (receivedData) => {
    console.log("[INFO] Received data from μD3TN:");

    // Update amount of MB received from foreign databases.
    global.dtnStatistics.totalBundlesReceived += Buffer.byteLength(Buffer.from(receivedData)) / 1000 / 1000;

    // Deserialize μD3TN message.
    const deserializedMessage = deserializeMessage(receivedData);

    // Handle errors in deserialization.
    if (deserializedMessage.error) return; // TODO: Handle this better.

    const deserializedPayload = deserializedMessage?.payload?.toString("utf8") || "";
    console.log("Deserialized message:", deserializedMessage);
    console.log("Deserialized payload:", deserializedPayload);

    let payload = {};

    try {
      payload = JSON.parse(deserializedPayload);
      console.log("Parsed payload:", payload);
    } catch (e) {
      console.log("Payload is string:", deserializedPayload);
      return;
    }

    // Update local database with received payload.
    await updateLocalDatabase(payload);
  });
};

/**
 * @description Decides what to do with the received payload, whether to update the local database or not, using the "none" merge method.
 * @param {mongoose.Model} model - Model to update.
 * @param {array} data - Payload to be sent to the mongoose method.
 * @param {string} method - Mongoose method to use.
 * @param {Date} localDate - Date in which the document was last updated.
 */
const noneMergeStrategy = ({ model, data, method, localDate }) => {

  if (isCreationMethod(method)) {
    // Create new document.
    model[method](...data);
  }

  if (isDeletionMethod(method)) {
    // Delete document.
    model[method](...data).exec();
  }

  // If it is not creation or deletion, it is an update.
  if (isSingleUpdateMethod(method)) {
    const filter = data[0];
    model.findOne(filter, (err, doc) => {
      if (err) {
        console.log(`[ERROR] ${method} - Failed to find document: ${err}`);
        return;
      }

      // If received localDate is newer than the one in the database, update the database.
      const receivedUpdatedAt = new Date(localDate);
      const localUpdatedAt = doc && doc.updatedAt && new Date(doc.updatedAt);
      const isValidDate = localUpdatedAt instanceof Date && !isNaN(localUpdatedAt);
      if (!isValidDate || localUpdatedAt < receivedUpdatedAt) {
        model[method](...data).exec();
        console.log("[INFO] Received localDate is newer than the one in the database, updating the database.");
      }
    });
  } else if (isMultipleUpdateMethod(method)) {
    // TODO: Work on this case
    // const filter = data[0];
    // const update = data[1];
    // model.updateMany(filter, update, (err, doc) => {
    //   if (err) {
    //     console.log(`[ERROR] ${method} - Failed to update documents: ${err}`);
    //     return;
    //   }
    // });
  }
};

const threeWayMergeStrategy = ({ model, data, method, fileHistory }) => {
  if (isCreationMethod(method)) {
    model[method](data);
    saveNewHistory(fileHistory);
    return;
  }

  if (isDeletionMethod(method)) {
    model[method](data);
    deleteHistory(fileHistory);
    return;
  }

  // We need to merge the received data with the local data.
  const filter = data[0];

  if (isSingleUpdateMethod(method)) {
    // Get both latest local version and received version.
    const latestLocalVersion = await model.findOne(filter);
    const latestIncomingVersion = fileHistory.dataChanges[fileHistory.dataChanges.length - 1]; // data[1];

    // Get the change ID of the latest local version.
    const latestLocalVersionChangeID = getLatestChangeID(latestLocalVersion._fileHistoryID);
    const latestIncomingVersionChangeID = fileHistory.changeIDs[fileHistory.changeIDs.length - 1];

    // Get the parent version of the local and incoming versions.
    const parentVersion = getLatestCommonParent(
      latestLocalVersion._fileHistoryID,
      latestIncomingVersion._fileHistoryID
    );

    // If the parent version is the same as the latest local version, we can just update the local version.
    if (parentVersion.changeID === latestLocalVersionChangeID) {
      // Save the new incoming version.
      model[method](data);
      // Push incoming version changeID to the file history.
      pushTohistory({
        fileHistoryID: latestLocalVersion._fileHistoryID,
        changeID: latestIncomingVersionChangeID,
        document: latestIncomingVersion
      });
      return;
    }

    // If the parent version do not match with the latest local version,
    // we need to merge the incoming version with the latest local version.
    const diff3Merge = diff3(latestLocalVersion, parentVersion, latestIncomingVersion);
    const conflicts = diff3Merge.length > 1;

    if (conflicts) {
      console.log("[INFO] Conflicts detected:", diff3Merge);
      return;
    }

    // Update the local version with the merged version.
    model[method](data);

    // Get the ok part of the merge.
    const mergedData = diff3Merge[0].ok.join("");

    // Push new version to file history.
    pushTohistory({
      fileHistoryID: latestLocalVersion._fileHistoryID,
      document: mergedData
    });
  } else if (isMultipleUpdateMethod(method)) {
    // TODO: Work on this case
  }
};

const updateLocalDatabase = async ({ actionType, modelName, localDate, fileHistory, data }) => {
  // https://mongoosejs.com/docs/api.html#mongoose_Mongoose-model
  const model = mongoose.model(modelName);
  const mergeStrategy = global.MERGE_STRATEGY;

  switch (mergeStrategy) {
    case "none":
      noneMergeStrategy({ model, data, method: actionType, localDate });
      break;

    case "threeWay":
      threeWayMergeStrategy({ model, data, method: actionType, fileHistory });
      break;

    default:
      console.log("[ERROR] Unknown merge strategy:", mergeStrategy);
      break;
  }
};
