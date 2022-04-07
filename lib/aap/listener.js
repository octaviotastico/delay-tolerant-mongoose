const net = require('net');
const mongoose = require('mongoose')
const serializers = require('./serializers');
const constants = require('./constants');

/**
 * @description Await on this function to wait for ms milliseconds.
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise}
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
    client.on('error', err => reject(err));
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
    .then(connection => connection)
    .catch(async () => {
      console.log(`[ERROR] Failed to connect to μD3TN, retrying in ${msDelay / 1000} seconds.`);
      await delay(msDelay);
      return initializeDTN(dtnHost, dtnPort, agentID);
    });

/**
 * Creates a connection to μD3TN, registers the application, and listens for messages.
 * @param {string} dtnHost The host of the μD3TN AAP interface.
 * @param {number} dtnPort The port of the μD3TN AAP interface.
 * @param {number} agentID The agent ID we want to register.
 */
const initializeDTN = async (dtnHost, dtnPort, agentID) => {
  let netClient = await connectAndRetry(dtnHost, dtnPort, agentID);
  global.dtnNodeNetClient = netClient;

  console.log('[INFO] Connected successfuly to μD3TN.');
  global.dtnStatistics.isConnected = true;

  const { serializeMessage } = serializers;
  const { AAPMessageTypes } = constants;

  // Register to μD3TN with agent ID = 'bundlesink'
  console.log('[INFO] Sending register message to μD3TN.');
  netClient.write(serializeMessage({
    messageType: AAPMessageTypes.REGISTER,
    eid: agentID,
  }));

  netClient.on('end', async () => {
    netClient.destroy();
    console.log('[ERROR] μD3TN disconnected, attempting to reconnect.');
    global.dtnStatistics.isConnected = false;
    connectAndRetry(dtnHost, dtnPort, agentID).then(client => {
      netClient = client;
      global.dtnStatistics.isConnected = true;
    });
  });

  netClient.on('error', async (error) => {
    netClient.destroy();
    console.log('[ERROR] μD3TN error: ', error);
    global.dtnStatistics.isConnected = false;
    connectAndRetry(dtnHost, dtnPort, agentID).then(client => {
      netClient = client;
      global.dtnStatistics.isConnected = true;
    });
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

  netClient.on('data', async (receivedData) => {
    console.log('[INFO] Received data from μD3TN:');

    // Update amount of MB received from foreign databases.
    global.dtnStatistics.totalBundlesReceived += Buffer.byteLength(Buffer.from(receivedData)) / 1000 / 1000;

    // Deserialize μD3TN message.
    const deserializedMessage = deserializeMessage(receivedData);

    // Handle errors in deserialization.
    if (deserializedMessage.error) return; // TODO: Handle this better.

    const deserializedPayload = deserializedMessage?.payload?.toString('utf8') || "";
    console.log('Deserialized message:', deserializedMessage);
    console.log('Deserialized payload:', deserializedPayload);

    let payload = {};

    try {
      payload = JSON.parse(deserializedPayload);
      console.log('Parsed payload:', payload);
    } catch (e) {
      console.log('Payload is string:', deserializedPayload);
      return;
    }

    // Update local database with received payload.
    await updateLocalDatabase(payload);

  });
}

const updateLocalDatabase = async ({ type, modelName, localDate, data }) => {
  if ([null, undefined, ""].includes(type)) return;
  if ([null, undefined, ""].includes(modelName)) return;

  // https://mongoosejs.com/docs/api.html#mongoose_Mongoose-model
  const model = mongoose.model(modelName);

  if (type === 'create') {
    model.create(data);
  } else if (type === 'insertMany') {
    model.insertMany(data);
  } else if (type === 'deleteOne') {
    const { filter, options } = data;
    model.deleteOne(filter, options).exec();
  } else if (type === 'deleteMany') {
    const { filter, options } = data;
    model.deleteMany(filter, options).exec();
  } else if (type === 'updateOne') {
    const { filter, update, options } = data;
    model.findOne(filter, (err, doc) => {
      if (err) {
        console.log('[ERROR] dtUpdateOne - Failed to find document:', err);
        return;
      }
      // If received localDate is newer than the one in the database, update the database.
      const receivedUpdatedAt = new Date(localDate);
      const localUpdatedAt = doc && doc.updatedAt && new Date(doc.updatedAt);
      const isValidDate = localUpdatedAt instanceof Date && !isNaN(localUpdatedAt);
      if (!isValidDate || (localUpdatedAt < receivedUpdatedAt)) {
        model.updateOne(filter, update, options).exec();
        console.log('[INFO] Received localDate is newer than the one in the database, updating the database.');
        return;
      }
    });
  } else if (type === 'updateMany') {
    const { filter, update, options } = data;
    model.updateMany(filter, update, options).exec();
  } else if (type === 'replaceOne') {
    const { filter, replacement, options } = data;
    model.replaceOne(filter, replacement, options).exec();
  } else if (type === 'findOneAndDelete') {
    const { filter, options } = data;
    model.findOneAndDelete(filter, options).exec();
  } else if (type === 'findOneAndRemove') {
    const { filter, options } = data;
    model.findOneAndRemove(filter, options).exec();
  } else if (type === 'findOneAndReplace') {
    const { filter, replacement, options } = data;
    model.findOneAndReplace(filter, replacement, options).exec();
  } else if (type === 'findOneAndUpdate') {
    const { filter, update, options } = data;
    model.findOne(filter, (err, doc) => {
      if (err) {
        console.log('[ERROR] dtFindOneAndUpdate - Failed to find document:', err);
        return;
      }
      // If received localDate is newer than the one in the database, update the database.
      const receivedUpdatedAt = new Date(localDate);
      const localUpdatedAt = doc && doc.updatedAt && new Date(doc.updatedAt);
      const isValidDate = localUpdatedAt instanceof Date && !isNaN(localUpdatedAt);
      if (!isValidDate || (localUpdatedAt < receivedUpdatedAt)) {
        model.findOneAndUpdate(filter, update, options).exec();
        console.log('[INFO] Received localDate is newer than the one in the database, updating the database.');
        return;
      }
    });
  } else if (type === 'findByIdAndDelete') {
    const { id, options } = data;
    model.findByIdAndDelete(id, options).exec();
  } else if (type === 'findByIdAndRemove') {
    const { id, options } = data;
    model.findByIdAndRemove(id, options).exec();
  } else if (type === 'findByIdAndUpdate') {
    const { id, update, options } = data;
    model.findById(id._id, (err, doc) => {
      if (err) {
        console.log('[ERROR] dtFindByIdAndUpdate - Failed to find document:', id._id, err);
        return;
      }
      console.log('[INFO] dtFindByIdAndUpdate - Found document:', id._id);
      // If received localDate is newer than the one in the database, update the database.
      const receivedUpdatedAt = new Date(localDate);
      const localUpdatedAt = doc && doc.updatedAt && new Date(doc.updatedAt);
      const isValidDate = localUpdatedAt instanceof Date && !isNaN(localUpdatedAt);
      if (!isValidDate || (localUpdatedAt < receivedUpdatedAt)) {
        model.findByIdAndUpdate(id._id, update, options).exec();
        console.log('[INFO] Received localDate is newer than the one in the database, updating the database.');
        return;
      }
    });
  } else {
    console.log(`[ERROR] Unknown operation type: ${type}`);
  }
};

module.exports = initializeDTN;