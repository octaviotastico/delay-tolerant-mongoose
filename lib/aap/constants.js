// AAP message type codes.
export const AAPMessageTypes = {
  ACK: 0x0,
  NACK: 0x1,
  REGISTER: 0x2,
  SENDBUNDLE: 0x3,
  RECVBUNDLE: 0x4,
  SENDCONFIRM: 0x5,
  CANCELBUNDLE: 0x6,
  WELCOME: 0x7,
  PING: 0x8,
  SENDBIBE: 0x9,
  RECVBIBE: 0xa,
};

export const AAPMessageTypeToStr = {
  0x0: "ACK",
  0x1: "NACK",
  0x2: "REGISTER",
  0x3: "SENDBUNDLE",
  0x4: "RECVBUNDLE",
  0x5: "SENDCONFIRM",
  0x6: "CANCELBUNDLE",
  0x7: "WELCOME",
  0x8: "PING",
  0x9: "SENDBIBE",
  0xa: "RECVBIBE",
};

export const AAPSupportedVersions = [1];
