// Library Imports
import mongoose from "mongoose";

// Local Imports
import { initializeDTN } from "./aap/listener.js";
import { isValidConfig } from "./dtn/commons.js";
import { createDTNMethod } from "./dtn/dtnMethods.js";

const delayTolerantMongoose = mongoose;

/// --------------------------------- ///
/// ----- Configuration Methods ----- ///
/// --------------------------------- ///

/**
 * @description: Object with current DTN configuration.
 */
delayTolerantMongoose.dtnConfig = {
  AGENT_ID: "bundlesink", // ID of the DTN agent.
  DTN_HOST: "localhost", // Host of the uD3TN instance.
  DTN_PORT: "4243", // Port of the uD3TN instance.
  EID_LIST: ["dtn://b.dtn/bundlesink"], // List of EIDs to forward to.
  MERGE_STRATEGY: "None", // Strategy to use when merging bundles.

  // TODO: Implement this options.
  REAL_TIME_UPDATE: true, // If true, the bundles will be send on every local change.
  SCHELUDE_CRON_UPDATE: "*/5 * * * *", // Cron expression for sending updates to μD3TN.
  UPDATE_INTERVAL: 5000, // In milliseconds, ignored if REAL_TIME_UPDATE is true.
};

/**
 * @description: Method for updating DTN configuration.
 * @param {Object} config: Object with DTN configuration.
 */
delayTolerantMongoose.updateDtnConfig = function (config) {
  const newConfig = {
    ...this.dtnConfig,
    ...config,
  };

  if (!isValidConfig(newConfig)) {
    console.error("Invalid DTN configuration.");
    return;
  }

  this.dtnConfig = newConfig;

  // TODO: Use this instead of delayTolerantMongoose.dtnConfig
  global.EID_LIST = this.dtnConfig.EID_LIST;
  global.DTN_HOST = this.dtnConfig.DTN_HOST;
  global.DTN_PORT = this.dtnConfig.DTN_PORT;
  global.MERGE_STRATEGY = this.dtnConfig.MERGE_STRATEGY;
};

/**
 * @description: Initialize connection with μD3TN in order to listen for incoming bundles.
 */
delayTolerantMongoose.initializeListener = function () {
  initializeDTN(this.dtnConfig.DTN_HOST, this.dtnConfig.DTN_PORT, this.dtnConfig.AGENT_ID);
};

/**
 * @description: Calls updateDtnConfig and initializeListener methods with the given configuration.
 * @param {Object} config: Object with DTN configuration.
 */
delayTolerantMongoose.configDtnAndStart = function (config) {
  this.updateDtnConfig(config);
  this.initializeListener();
};

/// ---------------------------- ///
/// ----- Merge strategies ----- ///
/// ---------------------------- ///

delayTolerantMongoose.availableMergeStrategies = [
  {
    name: "none",
    description:
      "[Default] No merge strategy is used. Documents are overwritten, depending on the 'send' timestamp (newest wins).",
  },
  {
    name: "threeWayMerge",
    description:
      "Documents are merged in a three way merge. This method uses more memory, but it has the advantage of being able to handle multiple versions of the same document so it does not lose any information (there are no overwrites).",
  },
];

/// --------------------------------- ///
/// ----- Aditional Information ----- ///
/// --------------------------------- ///

/**
 * @description: This is a list that contains all those bundles that were sent but that
 * were not received, or that are currently waiting for ack.
 */
const bundlesWaitingACK = {};
const bundlesWaitingInQueue = [];

global.bundlesWaitingACK = bundlesWaitingACK;
global.bundlesWaitingInQueue = bundlesWaitingInQueue;

/// ---------------------- ///
/// ----- Statistics ----- ///
/// ---------------------- ///

/**
 * Object with all available statistics.
 */
const dtnStatistics = {
  // Bundle Stats.
  totalBundlesSent: 0,
  totalBundlesReceived: 0,
  totalBundlesDropped: 0,
  totalBundlesInQueue: 0,

  // Network Stats.
  totalMBSent: 0,
  totalMBReceived: 0,
  totalMBDropped: 0,
  totalMBInQueue: 0,

  // General Stats.
  uptime: new Date().getTime(),
  lastUpdate: null,
  amountOfDatabasesConnected: 0,
  isConnected: false,
};

/**
 * Saving it as a global variable.
 */
global.dtnStatistics = dtnStatistics;

/**
 * Method to get all the statistics.
 */
delayTolerantMongoose.getAllStats = function () {
  return dtnStatistics;
};

/**
 * Method to get just the bundle statistics.
 */
delayTolerantMongoose.getBundleStats = function () {
  return {
    totalBundlesSent: dtnStatistics.totalBundlesSent,
    totalBundlesReceived: dtnStatistics.totalBundlesReceived,
    totalBundlesDropped: dtnStatistics.totalBundlesDropped,
    totalBundlesInQueue: dtnStatistics.totalBundlesInQueue,
  };
};

/**
 * Method to get just the network statistics.
 */
delayTolerantMongoose.getNetworkStats = function () {
  return {
    totalMBSent: dtnStatistics.totalMBSent,
    totalMBReceived: dtnStatistics.totalMBReceived,
    totalMBDropped: dtnStatistics.totalMBDropped,
    totalMBInQueue: dtnStatistics.totalMBInQueue,
  };
};

/**
 * Method to get just the general statistics.
 */
delayTolerantMongoose.getGeneralStats = function () {
  return {
    uptime: dtnStatistics.uptime,
    lastUpdate: dtnStatistics.lastUpdate,
    totalTimeRunning: (new Date() - dtnStatistics.uptime) / 1000,
    timeSinceLastUpdate: (new Date() - dtnStatistics.lastUpdate) / 1000,
    amountOfDatabasesConnected: delayTolerantMongoose.dtnConfig.EID_LIST.length,
    isConnected: dtnStatistics.isConnected,
  };
};

/// ------------------------- ///
/// ----- DTN Variables ----- ///
/// ------------------------- ///

global.dtnNodeNetClient = null;

/// ----------------------- ///
/// ----- DTN Methods ----- ///
/// ----------------------- ///

delayTolerantMongoose.Model.dtCreate = createDTNMethod("create");
delayTolerantMongoose.Model.dtInsertMany = createDTNMethod("insertMany");
delayTolerantMongoose.Model.dtDeleteOne = createDTNMethod("deleteOne");
delayTolerantMongoose.Model.dtDeleteMany = createDTNMethod("deleteMany");
delayTolerantMongoose.Model.dtUpdateOne = createDTNMethod("updateOne");
delayTolerantMongoose.Model.dtUpdateMany = createDTNMethod("updateMany");
delayTolerantMongoose.Model.dtReplaceOne = createDTNMethod("replaceOne");
delayTolerantMongoose.Model.dtFindOneAndDelete = createDTNMethod("findOneAndDelete");
delayTolerantMongoose.Model.dtFindOneAndRemove = createDTNMethod("findOneAndRemove");
delayTolerantMongoose.Model.dtFindOneAndReplace = createDTNMethod("findOneAndReplace");
delayTolerantMongoose.Model.dtFindOneAndUpdate = createDTNMethod("findOneAndUpdate");
delayTolerantMongoose.Model.dtFindByIdAndDelete = createDTNMethod("findByIdAndDelete");
delayTolerantMongoose.Model.dtFindByIdAndRemove = createDTNMethod("findByIdAndRemove");
delayTolerantMongoose.Model.dtFindByIdAndUpdate = createDTNMethod("findByIdAndUpdate");

export default delayTolerantMongoose;
