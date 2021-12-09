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
 * @description Creates a connection to the DTN node.
 * @param {string} dtnHost The host of the DTN node.
 * @param {number} dtnPort The port of the DTN node.
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
 * @description Connects to the DTN node and retries connection if it fails.
 * @param {string} dtnHost The host of the DTN node.
 * @param {number} dtnPort The port of the DTN node.
 * @param {number} agentID The agent ID we want to register.
 * @returns Returns a net.Socket object if connection was successful, or retries if doesn't.
 */
const connectAndRetry = async (dtnHost, dtnPort, agentID, msDelay = 5000) =>
  createClientConnection(dtnHost, dtnPort)
    .then(connection => connection)
    .catch(async () => {
      console.log(`[ERROR] Failed to connect to DTN node, retrying in ${msDelay / 1000} seconds.`);
      await delay(msDelay);
      return initializeDTN(dtnHost, dtnPort, agentID);
    });

/**
 * Creates a connection to the DTN node, registers the application, and listens for messages.
 * @param {string} dtnHost The host of the DTN node.
 * @param {number} dtnPort The port of the DTN node.
 * @param {number} agentID The agent ID we want to register.
 */
const initializeDTN = async (dtnHost, dtnPort, agentID) => {
  let netClient = await connectAndRetry(dtnHost, dtnPort, agentID);
  global.dtnNodeNetClient = netClient;

  console.log('[INFO] Connected successfuly to DTN node.');
  global.dtnStatistics.isConnected = true;

  const { serializeMessage } = serializers;
  const { AAPMessageTypes } = constants;

  // Register to local node of the DTN with agent ID = 'bundlesink'
  console.log('[INFO] Sending register message to DTN node.');
  netClient.write(serializeMessage({
    messageType: AAPMessageTypes.REGISTER,
    eid: agentID,
  }));

  netClient.on('end', async () => {
    netClient.destroy();
    console.log('[ERROR] DTN Node disconnected, attempting to reconnect.');
    global.dtnStatistics.isConnected = false;
    connectAndRetry(dtnHost, dtnPort, agentID).then(client => {
      netClient = client;
      global.dtnStatistics.isConnected = true;
    });
  });

  netClient.on('error', async (error) => {
    netClient.destroy();
    console.log('[ERROR] DTN Node error: ', error);
    global.dtnStatistics.isConnected = false;
    connectAndRetry(dtnHost, dtnPort, agentID).then(client => {
      netClient = client;
      global.dtnStatistics.isConnected = true;
    });
  });

  // Listen for DTN messages from foreign DTN nodes.
  listen(netClient);
};

/**
 * @description Listens for messages from the DTN node, and saves
 * all the foreign database updates into the local database.
 * @param {net.Socket} netClient The net.Socket object to listen on.
 */
const listen = async (netClient) => {
  const { deserializeMessage } = serializers;

  // Listen for DTN messages from foreign DTN nodes.
  netClient.on('data', (receivedData) => {
    console.log('[INFO] Received data from DTN node:');

    // Update amount of MB received from foreign DTN nodes.
    global.dtnStatistics.totalBundlesReceived += Buffer.byteLength(Buffer.from(receivedData)) / 1000 / 1000;

    // Deserialize DTN message.
    const deserializedMessage = deserializeMessage(receivedData);

    // Handle errors in deserialization.
    if (deserializedMessage.error) return; // TODO: Handle this better.

    // Handle .
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

    // Destructuring received data
    const { type, modelName, data } = payload;

    // TODO: Handle this better.
    if ([null, undefined, ""].includes(modelName)) return;
    if ([null, undefined, ""].includes(type)) return;

    // https://mongoosejs.com/docs/api.html#mongoose_Mongoose-model
    const model = mongoose.model(modelName);

    if (type === 'dtCreate') {
      model.create(data);
    } else if (type === 'dtInsertMany') {
      model.insertMany(data);
    } else if (type === 'dtDeleteOne') {
      const { filter, options, callback } = data;
      model.deleteOne(filter, options, callback);
    } else if (type === 'dtDeleteMany') {
      const { filter, options, callback } = data;
      model.deleteMany(filter, options, callback);
    } else if (type === 'dtUpdateOne') {
      const { filter, update, options, callback } = data;
      model.updateOne(filter, update, options, callback);
    } else if (type === 'dtUpdateMany') {
      const { filter, update, options, callback } = data;
      model.updateMany(filter, update, options, callback);
    } else if (type === 'dtReplaceOne') {
      const { filter, replacement, options, callback } = data;
      model.replaceOne(filter, replacement, options, callback);
    } else if (type === 'dtFindOneAndDelete') {
      const { filter, options, callback } = data;
      model.findOneAndDelete(filter, options, callback);
    } else if (type === 'dtFindOneAndRemove') {
      const { filter, options, callback } = data;
      model.findOneAndRemove(filter, options, callback);
    } else if (type === 'dtFindOneAndReplace') {
      const { filter, replacement, options, callback } = data;
      model.findOneAndReplace(filter, replacement, options, callback);
    } else if (type === 'dtFindOneAndUpdate') {
      const { filter, update, options, callback } = data;
      model.findOneAndUpdate(filter, update, options, callback);
    } else if (type === 'dtFindByIdAndDelete') {
      const { id, options, callback } = data;
      model.findByIdAndDelete(id, options, callback);
    } else if (type === 'dtFindByIdAndRemove') {
      const { id, options, callback } = data;
      model.findByIdAndRemove(id, options, callback);
    } else if (type === 'dtFindByIdAndUpdate') {
      const { id, update, options, callback } = data;
      model.findByIdAndUpdate(id, update, options, callback);
    } else {
      console.log(`[ERROR] Unknown operation type: ${type}`);
    }
  });
}

module.exports = initializeDTN;