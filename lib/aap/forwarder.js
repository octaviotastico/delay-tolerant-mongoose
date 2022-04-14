// Library Imports
import { v4 as uuidv4 } from "uuid";

// Local Imports
import { AAPMessageTypes } from "./constants";
import { serializeMessage } from "./serializers";

const getUniqueBundleID = (eid, localDate) => {
  const uuidv4str = uuidv4().split("-").join("").substring(0, 16);
  console.log("[INFO] Bundle ID:", `${eid}-${localDate}-${uuidv4str}`);
  return `${eid}-${localDate}-${uuidv4str}`;
};

const forwardUnsentMessages = async () => {
  const netClient = global.dtnNodeNetClient;
  const isDatabaseConnected = global.dtnStatistics.isConnected;
  if (!isDatabaseConnected || !netClient) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return forwardUnsentMessages();
  }

  const unsentMessages = global.bundlesWaitingInQueue;
  let amountLeft = unsentMessages.length;

  while (amountLeft--) {
    const message = unsentMessages[0];
    unsentMessages.splice(0, 1);

    // Send the message to μD3TN
    netClient.write(message);

    // Save the bundle ID and the message in the waiting list
    global.bundlesWaitingACK[bundleID] = message;
  }
};

/**
 * @description This function uses the currently created socket
 * connection with μD3TN, and forwards it the local database updates,
 * in order to keep all foreign databases updated.
 * @param {object} message The message to be sent to the other instances.
 * @param {Array} eids The list of eids to send the messages.
 */
export const AAPForwarder = async ({ message, eids }) => {
  const netClient = global.dtnNodeNetClient;

  let totalMBSent = 0;
  let localDate = new Date().getTime();

  eids.forEach((eid) => {
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
      // Send the message to μD3TN
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

  // Forward the unsent messages
  forwardUnsentMessages();
};
