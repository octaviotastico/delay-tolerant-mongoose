const struct = require('python-struct');
const constants = require('./constants');

/*
* @description: This function serializes a message, to send it to the local DTN node.
* @param {MessageType} msg - The type of message you want to send.
* @param {EID} msg - The EID (node ID) of the receiver.
* @param {Payload} msg - The payload of the message.
* @param {BundleID} msg - The bundle ID of the message.
* @return {Object} - The serialized message.
*
* It returns an object with the following properties:
*   - eid: The EID (node ID) of the sender.
*   - payload: The payload of the message.
*   - messageType: The type of message received.
*   - messageTypeStr: The string representation of the message type.
*   - bundle_id: The bundle ID of the message.
*/
const serializeMessage = ({ messageType, eid=null, payload=null, bundle_id=null }) => {
  const msg = [struct.pack("B", 0x10 | (messageType & 0xF))];

  const {
    REGISTER, SENDBUNDLE, RECVBUNDLE, SENDCONFIRM, CANCELBUNDLE, WELCOME,
  } = constants.AAPMessageTypes;

  // Sending my EID
  if ([REGISTER, SENDBUNDLE, RECVBUNDLE, WELCOME].includes(messageType)) {
    const newEID = eid || AGENT_ID;
    msg.push(struct.pack("!H", newEID.length));
    msg.push(Buffer.from(newEID, "ascii"));
  }

  // Sending Payload
  if ([SENDBUNDLE, RECVBUNDLE].includes(messageType)) {
    msg.push(struct.pack("!Q", payload.length));
    msg.push(payload);
  }

  // Sending Bundle ID
  if ([SENDCONFIRM, CANCELBUNDLE].includes(messageType)) {
    msg.push(struct.pack("!Q", bundle_id.length));
    msg.push(bundle_id);
  }

  // This is not working properly :(
  return msg.join('');
};

/*
* @description: This function deserializes the message received from the local DTN node.
* @param {Buffer} msg - The message received from the local DTN node.
* @return {Object} - The deserialized message.
*
* It returns an object with the following properties:
*   - eid: The EID (node ID) of the sender.
*   - payload: The payload of the message.
*   - messageType: The type of message received.
*   - messageTypeStr: The string representation of the message type.
*   - bundle_id: The bundle ID of the message.
*/
const deserializeMessage = (buffer) => {
  const {
    REGISTER, SENDBUNDLE, RECVBUNDLE, SENDCONFIRM, CANCELBUNDLE, WELCOME,
  } = constants.AAPMessageTypes;

  const { AAPMessageTypeToStr, AAPSupportedVersions } = constants;

  const errorDeserializing = {
    error: true,
    messageType: null,
    eid: null,
    payload: null,
    bundle_id: null,
  };

  // If buffer is empty, then we can't deserialize it
  if (buffer.length < 1) {
    console.error("[Buffer Length] Buffer is too short.", buffer.length);
    return errorDeserializing;
  }

  const version = (buffer[0] >> 4) & 0xF;
  if (!AAPSupportedVersions.includes(version)) {
    console.error("Version is not 1.");
    return errorDeserializing;
  }

  const messageType = buffer[0] & 0xF;

  let eid = null;
  let payload = null;
  let bundle_id = null;
  let index = 1;

  // Getting the EID
  if ([REGISTER, SENDBUNDLE, RECVBUNDLE, WELCOME].includes(messageType)) {
    if (buffer.length - index < 2) {
      console.error("[EID] Buffer is too short.", index, buffer.length);
      return errorDeserializing;
    }
    const eidLength = struct.unpack("!H", buffer.slice(index, index + 2))[0];
    index += 2;

    if (buffer.length - index < eidLength) {
      console.error("[EID] Buffer is too short.", index, buffer.length);
      return errorDeserializing;
    }

    eid = buffer.slice(index, index + eidLength).toString('ascii');
    index += eidLength;
  }

  // Getting the Payload
  if ([SENDBUNDLE, RECVBUNDLE].includes(messageType)) {
    if (buffer.length - index < 8) {
      console.error("[Payload] Buffer is too short.", index, buffer.length);
      return errorDeserializing;
    }
    const payloadLength = struct.unpack("!Q", buffer.slice(index, index + 8))[0];
    index += 8;
    if (buffer.length - index < payloadLength) {
      console.error("[Payload] Buffer is too short.", index, buffer.length);
      return errorDeserializing;
    }
    payload = buffer.slice(index, index + payloadLength);
    index += payloadLength;
  }

  // Getting the Bundle ID
  if ([SENDCONFIRM, CANCELBUNDLE].includes(messageType)) {
    if (buffer.length - index < 8) {
      console.error("[Bundle ID] Buffer is too short.", index, buffer.length);
      return errorDeserializing;
    }
    bundle_id = struct.unpack("!Q", buffer.slice(index, index + 8))[0];
    index += 8;
  }

  return {
    eid: eid,
    payload: payload,
    messageType: messageType,
    messageTypeStr: AAPMessageTypeToStr[messageType],
    bundle_id: bundle_id,
  };
};

module.exports = {
  serializeMessage,
  deserializeMessage,
};
