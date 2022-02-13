const AAPForwarder = require('./aap/forwarder');
const listener = require('./aap/listener');
const mongoose = require('mongoose');

const delayTolerantMongoose = mongoose;

/// --------------------------------- ///
/// ----- Configuration Methods ----- ///
/// --------------------------------- ///

/**
 * @description: Object with current DTN configuration.
 */
delayTolerantMongoose.dtnConfig = {
  AGENT_ID: 'bundlesink', // ID of the DTN agent.
  DTN_HOST: 'localhost', // Host of the uD3TN instance.
  DTN_PORT: '4243', // Port of the uD3TN instance.
  EID_LIST: ['dtn://b.dtn/bundlesink'], // List of EIDs to forward to.
  REAL_TIME_UPDATE: true, // If true, the bundles will be send on every local change.
  UPDATE_INTERVAL: 5000, // In milliseconds, ignored if REAL_TIME_UPDATE is true.

  // TODO: Use cron time for updates.
  SCHELUDE_CRON_UPDATE: '*/5 * * * *', // Cron expression for sending updates to μD3TN.
};

/**
 * @description: Method for updating DTN configuration.
 * @param {Object} config: Object with DTN configuration.
 */
delayTolerantMongoose.updateDtnConfig = function (config) {
  this.dtnConfig = {
    ...this.dtnConfig,
    ...config,
  };
};

/**
 * @description: Initialize connection with μD3TN in order to listen for incoming bundles.
 */
delayTolerantMongoose.initializeListener = function () {
  listener(this.dtnConfig.DTN_HOST, this.dtnConfig.DTN_PORT, this.dtnConfig.AGENT_ID);
};

/**
 * @description: Calls updateDtnConfig and initializeListener methods with the given configuration.
 * @param {Object} config: Object with DTN configuration.
 */
delayTolerantMongoose.configDtnAndStart = function (config) {
  this.updateDtnConfig(config);
  this.initializeListener();
};

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
  uptime: (new Date()).getTime(),
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
  }
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
  }
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
  }
};

/// ------------------------- ///
/// ----- DTN Variables ----- ///
/// ------------------------- ///

global.dtnNodeNetClient = null;

/// ----------------------- ///
/// ----- DTN Methods ----- ///
/// ----------------------- ///

delayTolerantMongoose.Model.dtCreate = async function (document) {
  // Local Update
  const localUpdate = await this.create(document);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtCreate',
      data: document,
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  // Return the created document.
  return localUpdate;
};

delayTolerantMongoose.Model.dtInsertMany = async function (documents) {
  // Local Update.
  const localUpdate = await this.insertMany(documents);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtInsertMany',
      data: documents,
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtDeleteOne = async function (filter = {}, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.deleteOne(filter, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtDeleteOne',
      data: { filter, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtDeleteMany = async function (filter = {}, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.deleteMany(filter, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtDeleteMany',
      data: { filter, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtUpdateOne = async function (filter = {}, update = {}, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.updateOne(filter, update, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtUpdateOne',
      data: { filter, update, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtUpdateMany = async function (filter = {}, update = {}, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.updateMany(filter, update, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtUpdateMany',
      data: { filter, update, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtReplaceOne = async function (filter = {}, replacement = {}, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.replaceOne(filter, replacement, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtReplaceOne',
      data: { filter, replacement, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndDelete = async function (filter = {}, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.findOneAndDelete(filter, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtFindOneAndDelete',
      data: { filter, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndRemove = async function (filter = {}, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.findOneAndRemove(filter, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtFindOneAndRemove',
      data: { filter, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndReplace = async function (filter = {}, replacement = {}, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.findOneAndReplace(filter, replacement, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtFindOneAndReplace',
      data: { filter, replacement, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndUpdate = async function (filter = {}, update = {}, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.findOneAndUpdate(filter, update, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtFindOneAndUpdate',
      data: { filter, update, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindByIdAndDelete = async function (id, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.findByIdAndDelete(id, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtFindByIdAndDelete',
      data: { id, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindByIdAndRemove = async function (id, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.findByIdAndRemove(id, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtFindByIdAndRemove',
      data: { id, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindByIdAndUpdate = async function (id, update, options = {}, callback = () => {}) {
  // Local Update.
  const localUpdate = await this.findByIdAndUpdate(id, update, options, callback);
  // DTN Update.
  await AAPForwarder({
    message: {
      type: 'dtFindByIdAndUpdate',
      data: { id, update, options, callback },
      modelName: this.modelName,
      localDate: (new Date()).getTime(),
    },
    eids: delayTolerantMongoose.dtnConfig.EID_LIST,
    dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
    dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
  });
  return localUpdate;
};

module.exports = delayTolerantMongoose;