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
  netClient.on('data', (data) => {
    console.log('[netClient on data] Received data:');

    const deserializedMessage = deserializeMessage(data);

    if (deserializedMessage.error) return; // TODO: Handle this better.

    const deserializedPayload = deserializedMessage?.payload?.toString('utf8') || "";
    console.log('Deserialized message:', deserializedMessage);
    console.log('Deserialized payload:', deserializedPayload);

    // Save this DTN message to the database calling the
    // corresponding function (create, delete, edit, etc).
  });
};

module.exports = initializeDTN;