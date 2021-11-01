const net = require('net');
const mongoose = require('mongoose')
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

    // Destructuring received data
    const { type, modelName, data } = deserializedPayload;

    // https://mongoosejs.com/docs/api.html#mongoose_Mongoose-model
    const model = mongoose.model(modelName);

    if (type === 'dtCreate') {
      console.log(`Creating new document in ${modelName} with this data: ${data}`);
      model.create(...data);
    } else if (type === 'dtInsertMany') {
      model.insertMany(...data);
    } else if (type === 'dtDeleteOne') {
      model.deleteOne(...data);
    } else if (type === 'dtDeleteMany') {
      model.deleteMany(...data);
    } else if (type === 'dtUpdateOne') {
      model.updateOne(...data);
    } else if (type === 'dtUpdateMany') {
      model.updateMany(...data);
    } else if (type === 'dtReplaceOne') {
      model.replaceOne(...data);
    } else if (type === 'dtFindOneAndDelete') {
      model.findOneAndDelete(...data);
    } else if (type === 'dtFindOneAndRemove') {
      model.findOneAndRemove(...data);
    } else if (type === 'dtFindOneAndReplace') {
      model.findOneAndReplace(...data);
    } else if (type === 'dtFindOneAndUpdate') {
      model.findOneAndUpdate(...data);
    } else if (type === 'dtFindByIdAndDelete') {
      model.findByIdAndDelete(...data);
    } else if (type === 'dtFindByIdAndRemove') {
      model.findByIdAndRemove(...data);
    } else if (type === 'dtFindByIdAndUpdate') {
      model.findByIdAndUpdate(...data);
    }
  });
};

module.exports = initializeDTN;