// Library Imports
const client_io = require("socket.io-client");
const { v4: uuidv4 } = require('uuid');

// Local Imports
const constants = require('./constants');
const serializers = require('./serializers');

/*
* This function creates a socket connection with the local DTN
* node, and forwards local database updates, in order to keep foreign
* databases updated.
*/
const AAPForwarder = async ({ message, dtnHost, dtnPort, eids }) => {
  const localDtnNodeAddress = `http://${dtnHost}:${dtnPort}`;
  const localDTNNode = client_io.connect(localDtnNodeAddress);

  const { AAPMessageTypes } = constants;
  const { serializeMessage } = serializers;

  localDTNNode.send(serializeMessage({
    messageType: AAPMessageTypes.REGISTER,
    eid: uuidv4(),
  }));

  let totalMBSent = 0;

  eids.forEach(eid => {
    // Serialize the message
    const serializedMessage = serializeMessage({
      eid,
      messageType: AAPMessageTypes.SENDBUNDLE,
      localDate: (new Date()).getTime(),
      payload: JSON.stringify(message)
    });

    // Send the message to the DTN node
    localDTNNode.send(serializedMessage);

    // Add up the total MB sent
    totalMBSent += Buffer.byteLength(Buffer.from(serializedMessage)) / 1000 / 1000;
  });

  global.dtnStatistics.totalMBSent += totalMBSent;
};

module.exports = AAPForwarder;
