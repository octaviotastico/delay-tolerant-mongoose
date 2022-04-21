// Library Imports
import struct from "python-struct";

// Local Imports
import { AAPMessageTypes, AAPMessageTypeToStr, AAPSupportedVersions } from "./constants.js";

/**
 * @typedef {Object} BundleBuffer
 * @property {string} eid The EID (node ID) of the sender.
 * @property {string} payload The payload of the message.
 * @property {number} messageType The type of message received.
 * @property {string} messageTypeStr The string representation of the message type.
 * @property {string} bundleID The bundle ID of the message.
 */

/**
 * @description: This function serializes a message, to send it to μD3TN.
 * @param {number} messageType The type of message you want to serialize.
 * @param {string} eid The EID (node ID) of the receiver.
 * @param {string} payload The payload of the message.
 * @param {string} bundleID The bundle ID of the message.
 * @returns {BundleBuffer} The serialized message.
 */
export const serializeMessage = ({ messageType, eid = "", payload = "", bundleID = "" }) => {
  const msg = [struct.pack("B", 0x10 | (messageType & 0xf))];

  const { REGISTER, SENDBUNDLE, RECVBUNDLE, SENDCONFIRM, CANCELBUNDLE, WELCOME } = AAPMessageTypes;

  // Sending my EID
  if ([REGISTER, SENDBUNDLE, RECVBUNDLE, WELCOME].includes(messageType)) {
    msg.push(struct.pack("!H", Buffer.from(eid, "ascii").length));
    msg.push(Buffer.from(eid, "ascii"));
  }

  // Sending Payload
  if ([SENDBUNDLE, RECVBUNDLE].includes(messageType)) {
    msg.push(struct.pack("!Q", Buffer.from(payload, "utf-8").length));
    msg.push(Buffer.from(payload, "utf-8"));
  }

  // Sending Bundle ID
  if ([SENDCONFIRM, CANCELBUNDLE].includes(messageType)) {
    msg.push(struct.pack("!Q", bundleID.length));
  }

  return Buffer.concat(msg);
};

/**
 * @description: This function deserializes the message received from μD3TN.
 * @param {Buffer} msg The message received from μD3TN.
 * @returns {BundleBuffer} The deserialized message.
 */
export const deserializeMessage = (buffer) => {
  const { REGISTER, SENDBUNDLE, RECVBUNDLE, SENDCONFIRM, CANCELBUNDLE, WELCOME } = AAPMessageTypes;

  const errorDeserializing = {
    error: true,
    messageType: null,
    eid: null,
    payload: null,
    bundleID: null,
  };

  // If buffer is empty, then we can't deserialize it
  if (buffer.length < 1) {
    console.error("[Buffer Length] Buffer is too short.", buffer.length);
    return errorDeserializing;
  }

  const version = (buffer[0] >> 4) & 0xf;
  if (!AAPSupportedVersions.includes(version)) {
    console.error("Version is not 1.");
    return errorDeserializing;
  }

  const messageType = buffer[0] & 0xf;

  let eid = null;
  let payload = null;
  let bundleID = null;
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

    eid = buffer.slice(index, index + eidLength).toString("ascii");
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
    payload = buffer.slice(index, index + payloadLength).toString();
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
    bundleID = struct.unpack("!Q", buffer.slice(index, index + 8))[0];
    index += 8;
  }

  return {
    eid: eid,
    payload: payload,
    messageType: messageType,
    messageTypeStr: AAPMessageTypeToStr[messageType],
    bundleID: bundleID,
    error: false,
  };
};
