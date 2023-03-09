// Library Imports
import net from "net";
import mongoose from "mongoose";
import diff3 from "diff3";

// Local imports
import {
  saveNewHistory,
  deleteHistory,
  pushTohistory,
  getLatestChangeID,
  getLatestCommonParent,
} from "../fileHistory/fileHistoryActions.js";
import { isCreationMethod, isDeletionMethod, isMultipleUpdateMethod, isSingleUpdateMethod } from "../dtn/commons.js";
import { deserializeMessage, serializeMessage } from "./serializers.js";
import { AAPMessageTypes } from "./constants.js";
import { delay } from "../utils/utils.js";
import { hash_SHA3_256 } from "../utils/hashes.js";

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
    const filter = data[0];
    model.find(filter, (err, docs) => {
      if (err) {
        console.log(`[ERROR] ${method} - Failed to find documents: ${err}`);
        return;
      }

      docs.forEach((doc) => {
        // If received localDate is newer than the one in the database, update the database.
        const receivedUpdatedAt = new Date(localDate);
        const localUpdatedAt = doc && doc.updatedAt && new Date(doc.updatedAt);
        const isValidDate = localUpdatedAt instanceof Date && !isNaN(localUpdatedAt);
        if (!isValidDate || localUpdatedAt < receivedUpdatedAt) {
          model[method](...data).exec();
          console.log("[INFO] Received localDate is newer than the one in the database, updating the database.");
        }
      });
    });
  }
};

const threeMergeStrategyUpdate = async ({ model, data, method, fileHistory, latestLocalVersion }) => {
  console.log("[INFO] Starting 3-merge strategy update.", { model, data, method, fileHistory, latestLocalVersion });

  // Get file history ID.
  const fileHistoryID = fileHistory._id;

  // Get both latest local version and received version.
  let latestIncomingVersion = fileHistory.dataChanges[fileHistory.dataChanges.length - 1]; // data[1];

  // Remove unwanted fields from the latest incoming version.
  latestIncomingVersion = JSON.parse(latestIncomingVersion);
  delete latestIncomingVersion._id;
  delete latestIncomingVersion.__v;
  delete latestIncomingVersion.updatedAt;
  delete latestIncomingVersion.createdAt;
  latestIncomingVersion = JSON.stringify(latestIncomingVersion);

  // Get the document ID, since _id is not available for latestLocalVersion.
  const _id = JSON.parse(latestIncomingVersion).id;

  // Stringify the latest local version so we can use it in diff3.
  const latestLocalVersionStringified = JSON.stringify(latestLocalVersion);

  // Get the change ID of the latest local version.
  const latestLocalVersionChangeID = await getLatestChangeID({ documentID: _id });
  const latestIncomingVersionChangeID = fileHistory.changeIDs[fileHistory.changeIDs.length - 1];

  // Get the parent version of the local and incoming versions.
  const parentVersion = await getLatestCommonParent({ documentID: _id }, fileHistory);

  // If the parent version is the same as the latest local version, we can just update the local version.
  if (parentVersion.changeID === latestLocalVersionChangeID) {
    console.log("[INFO] Parent version is the same as the latest local version, updating the local version.");
    // Save the new incoming version.
    await model[method](...data);
    // Push incoming version changeID to the file history.
    await pushTohistory({
      changeID: latestIncomingVersionChangeID,
      document: JSON.parse(latestIncomingVersion),
    });
    return;
  }

  // If the parent version do not match with the latest local version,
  // we need to merge the incoming version with the latest local version.
  const diff3Merge = diff3(latestLocalVersionStringified, parentVersion.data, latestIncomingVersion);

  const conflicts = diff3Merge.length > 1;

  if (conflicts) {
    console.log("[INFO] Conflicts detected:", diff3Merge);
    return;
  }

  // Get the ok part of the merge.
  const mergedData = diff3Merge[0].ok.join("");

  // Push new version to file history.
  pushTohistory({
    document: mergedData,
    fileHistoryID: fileHistoryID,
    changeID: hash_SHA3_256(latestLocalVersionChangeID, latestIncomingVersionChangeID),
  });

  // Parse the merged data.
  const parsedMergedData = JSON.parse(mergedData);

  // Update the local version with the merged version.
  const newData = [...data];
  newData[1] = parsedMergedData;
  await model[method](...newData);
};

const threeWayMergeStrategy = async ({ model, data, method, fileHistory }) => {
  console.log("[INFO] Three way merge strategy.", { model, data, method, fileHistory });

  if (isCreationMethod(method)) {
    await model[method](...data);
    await saveNewHistory(fileHistory);
    return;
  }

  if (isDeletionMethod(method)) {
    await model[method](...data);
    await deleteHistory(fileHistory);
    return;
  }

  if (isSingleUpdateMethod(method)) {
    const filter = data[0];
    const latestLocalVersion = await model.findOne(filter).select(['-__v', '-_id', '-createdAt', '-updatedAt', '-deletedAt']);
    await threeMergeStrategyUpdate({ model, data, method, fileHistory, latestLocalVersion });
    return;
  }

  if (isMultipleUpdateMethod(method)) {
    await model.find(filter, async (err, docs) => {
      if (err) {
        console.log(`[ERROR] ${method} - Failed to find documents: ${err}`);
        return;
      }

      await Promise.all(
        docs.map((latestLocalVersion) => {
          threeMergeStrategyUpdate({ model, data, method, fileHistory, latestLocalVersion });
        })
      );
    });
  }
};

const updateLocalDatabase = async ({ method, modelName, localDate, fileHistory, data }) => {
  // https://mongoosejs.com/docs/api.html#mongoose_Mongoose-model
  const model = mongoose.model(modelName);
  const mergeStrategy = global.MERGE_STRATEGY;

  if (!Array.isArray(data)) {
    data = [data];
  }

  switch (mergeStrategy) {
    case "none": // TODO: Should I add an async/await here?
      noneMergeStrategy({ model, data, method, localDate });
      break;

    case "threeWayMerge":
      await threeWayMergeStrategy({ model, data, method, fileHistory });
      break;

    default:
      console.log("[ERROR] Unknown merge strategy:", mergeStrategy);
      break;
  }
};
