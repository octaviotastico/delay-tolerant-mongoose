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
const AAPForwarder = async (message, dtnHost, dtnPort, eids) => {
  const localDtnNodeAddress = `http://${dtnHost}:${dtnPort}`
  const localDTNNode = client_io.connect(localDtnNodeAddress);

  const { AAPMessageTypes } = constants;
  const { serializeMessage } = serializers;

  localDTNNode.send(serializeMessage({
    messageType: AAPMessageTypes.REGISTER,
    eid: uuidv4(),
  }));

  eids.forEach(eid => {
    localDTNNode.send(serializeMessage({
      eid,
      messageType: AAPMessageTypes.SENDBUNDLE,
      payload: JSON.stringify(message)
    }));
  });
};

module.exports = AAPForwarder;
