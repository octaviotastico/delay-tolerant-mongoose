const net = require('net');
const serializers = require('./serializers');

const initializeDTN = (dtnHost, dtnPort, agentID) => {
  const netClient = net.createConnection(dtnHost, dtnPort, agentID);

  const { deserializeMessage } = serializers;

  // Register to local node of the DTN with agent ID = 'bundlesink'
  netClient.write(serializeMessage({
    messageType: AAPMessageTypes.REGISTER,
    eid: agentID,
  }));

  // Listen for DTN messages from foreign DTN nodes.
  netClient.on('data', (receivedData) => {
    console.log('[netClient on data] Received data:');

    const deserializedMessage = deserializeMessage(receivedData);

    if (deserializedMessage.error) return; // TODO: Handle this better.

    const deserializedPayload = deserializedMessage?.payload?.toString('utf8') || "";
    console.log('Deserialized message:', deserializedMessage);
    console.log('Deserialized payload:', deserializedPayload);

    const { type, modelName, data } = deserializedPayload;

    if (type === 'dtCreate') {
      // Save the new document in the database
      // using deserializedPayload.modelName

      console.log(`Creating new document in ${modelName} with this data: ${data}`);
      // https://mongoosejs.com/docs/api.html#mongoose_Mongoose-model
      // mongoose.model(modelName).create(data)

    } else if (type === 'dtInsertMany') {
      // To be implemented
    } else if (type === 'dtDeleteOne') {
      // To be implemented
    } else if (type === 'dtDeleteMany') {
      // To be implemented
    } else if (type === 'dtUpdateOne') {
      // To be implemented
    } else if (type === 'dtUpdateMany') {
      // To be implemented
    } else if (type === 'dtReplaceOne') {
      // To be implemented
    } else if (type === 'dtFindOneAndDelete') {
      // To be implemented
    } else if (type === 'dtFindOneAndRemove') {
      // To be implemented
    } else if (type === 'dtFindOneAndReplace') {
      // To be implemented
    } else if (type === 'dtFindOneAndUpdate') {
      // To be implemented
    } else if (type === 'dtFindByIdAndDelete') {
      // To be implemented
    } else if (type === 'dtFindByIdAndRemove') {
      // To be implemented
    } else if (type === 'dtFindByIdAndUpdate') {
      // To be implemented
    }
  });
};

module.exports = initializeDTN;