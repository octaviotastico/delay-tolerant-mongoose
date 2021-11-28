// Library Imports
const client_io = require("socket.io-client");
const { v4: uuidv4 } = require('uuid');

// Local Imports
const constants = require('./constants');
const serializers = require('./serializers');

const getUniqueBundleID = (eid, localDate) => {
  const uuidv4str = uuidv4().split('-').join('').substring(0, 16);
  console.log("[INFO] Bundle ID:", `${eid}-${localDate}-${uuidv4str}`);
  return `${eid}-${localDate}-${uuidv4str}`;
};

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
  let localDate = (new Date()).getTime();

  eids.forEach(eid => {
    // Geting the bundle ID so we can keep track the
    // state of the bundle, i.e: if it was sent or not
    // (ACK received), and if we need to resend it or not.
    const bundleID = getUniqueBundleID(eid, localDate);

    // Serialize the message
    const serializedMessage = serializeMessage({
      eid,
      messageType: AAPMessageTypes.SENDBUNDLE,
      payload: JSON.stringify(message),
      bundleID,
    });

    // Send the message to the DTN node
    localDTNNode.send(serializedMessage);

    // Save the bundle ID and the message in the waiting list
    global.bundlesWaitingACK[bundleID] = serializedMessage;
    global.totalBundlesSent++;

    totalMBSent += Buffer.byteLength(Buffer.from(serializedMessage)) / 1000 / 1000;

  });

  global.dtnStatistics.totalMBSent += totalMBSent;
};

module.exports = AAPForwarder;
