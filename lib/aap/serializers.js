const struct = require('python-struct');
const constants = require('./constants');

/**
 * @description: This function serializes a message, to send it to the local DTN node.
 * @param {MessageType} Number - The type of message you want to send.
 * @param {EID} String - The EID (node ID) of the receiver.
 * @param {Payload} String - The payload of the message.
 * @param {BundleID} String - The bundle ID of the message.
 * @returns {{
 *   eid: The EID (node ID) of the sender.
 *   payload: The payload of the message.
 *   messageType: The type of message received.
 *   messageTypeStr: The string representation of the message type.
 *   bundle_id: The bundle ID of the message.
 * }} (The serialized message).
 */
const serializeMessage = ({ messageType, eid="", payload="", bundle_id="" }) => {
  const msg = [struct.pack("B", 0x10 | (messageType & 0xF))];

  const {
    REGISTER, SENDBUNDLE, RECVBUNDLE, SENDCONFIRM, CANCELBUNDLE, WELCOME,
  } = constants.AAPMessageTypes;

  // Sending my EID
  if ([REGISTER, SENDBUNDLE, RECVBUNDLE, WELCOME].includes(messageType)) {
    msg.push(struct.pack("!H", eid.length));
    msg.push(Buffer.from(eid, "ascii"));
  }

  // Sending Payload
  if ([SENDBUNDLE, RECVBUNDLE].includes(messageType)) {
    msg.push(struct.pack("!Q", payload.length));
    msg.push(Buffer.from(payload, 'utf-8'));
  }

  // Sending Bundle ID
  if ([SENDCONFIRM, CANCELBUNDLE].includes(messageType)) {
    msg.push(struct.pack("!Q", bundle_id.length));
  }

  // This is not working properly :(
  return Buffer.concat(msg);
};

/**
 * @description: This function deserializes the message received from the local DTN node.
 * @param {Buffer} msg - The message received from the local DTN node.
 * @returns {{
 *   eid: The EID (node ID) of the sender.
 *   payload: The payload of the message.
 *   messageType: The type of message received.
 *   messageTypeStr: The string representation of the message type.
 *   bundle_id: The bundle ID of the message.
 * }} - (The deserialized message).
 */
const deserializeMessage = (buffer) => {
  const {
    REGISTER, SENDBUNDLE, RECVBUNDLE, SENDCONFIRM, CANCELBUNDLE, WELCOME,
  } = constants.AAPMessageTypes;

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
  if (!constants.AAPSupportedVersions.includes(version)) {
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
    payload = (buffer.slice(index, index + payloadLength)).toString();
    const nullIndex = payload.indexOf("\0");
    if (nullIndex !== -1) {
      payload = payload.slice(0, nullIndex);
    }
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
    messageTypeStr: constants.AAPMessageTypeToStr[messageType],
    bundle_id: bundle_id,
    error: false,
  };
};

module.exports = {
  serializeMessage,
  deserializeMessage,
};

// TESTING

// console.log("[AAP] Serialize Message:", serializeMessage({
//   messageType: constants.AAPMessageTypes.SENDBUNDLE,
//   eid: "b1c4a89e-4905-5e3c-b57f-dc92627d011e",
//   payload: "Helloooo! :)",
//   bundle_id: "8e544c75-a128-4a8c-b22d-f45be71e309b",
// }));

// console.log("[AAP] Deserialize Message:", deserializeMessage(serializeMessage({
//   messageType: constants.AAPMessageTypes.SENDBUNDLE,
//   eid: "b1c4a89e-4905-5e3c-b57f-dc92627d011e",
//   payload: "Helloooo! :)",
//   bundle_id: "8e544c75-a128-4a8c-b22d-f45be71e309b",
// })));
