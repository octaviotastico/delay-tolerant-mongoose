// Library Imports
const { v4: uuidv4 } = require('uuid');

// Local Imports
const constants = require('./constants');
const serializers = require('./serializers');

const getUniqueBundleID = (eid, localDate) => {
  const uuidv4str = uuidv4().split('-').join('').substring(0, 16);
  console.log("[INFO] Bundle ID:", `${eid}-${localDate}-${uuidv4str}`);
  return `${eid}-${localDate}-${uuidv4str}`;
};

/**
* @description: This function uses the currently created socket connection
* with the DTN node, and forwards it the local database updates, in order
* to keep all foreign databases updated.
*/
const AAPForwarder = async ({ message, eids }) => {
  const netClient = global.dtnNodeNetClient;

  const { AAPMessageTypes } = constants;
  const { serializeMessage } = serializers;

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

    if (netClient) {
      // Send the message to the DTN node
      netClient.write(serializedMessage);

      // Save the bundle ID and the message in the waiting list
      global.bundlesWaitingACK[bundleID] = serializedMessage;
      totalMBSent += Buffer.byteLength(Buffer.from(serializedMessage)) / 1000 / 1000;
    } else {
      console.log("[ERROR] No netClient found");
      console.log("[LOG] Saving package in queue to be sent later");
      // Save the message in the queue to be sent later
      global.bundlesWaitingInQueue.push(serializedMessage);
    }
  });

  global.dtnStatistics.totalMBSent += totalMBSent;
};

module.exports = AAPForwarder;
