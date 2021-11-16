const AAPForwarder = require('./aap/forwarder');
const listener = require('./aap/listener');
const mongoose = require('mongoose');

const delayTolerantMongoose = mongoose;

/// --------------------------------- ///
/// ----- Configuration Methods ----- ///
/// --------------------------------- ///

/*
* Object with current DTN configuration.
*/
delayTolerantMongoose.dtnConfig = {
  AGENT_ID: 'bundlesink', // ID of the DTN agent.
  DTN_HOST: 'localhost', // Host of the uD3TN instance.
  DTN_PORT: '4243', // Port of the uD3TN instance.
  EID_LIST: ['dtn://b.dtn/bundlesink'], // List of EIDs to forward to.
  REAL_TIME_UPDATE: true, // If true, the DTN node will be updated on every local change.
  UPDATE_INTERVAL: 5000, // In milliseconds, ignored if REAL_TIME_UPDATE is true.

  // TODO: Use cron time for updates.
  SCHELUDE_CRON_UPDATE: '*/5 * * * *', // Cron expression for updating the DTN node.
};

/*
* Method for updating DTN configuration.
*/
delayTolerantMongoose.updateDtnConfig = function (config) {
  this.dtnConfig = {
    ...this.dtnConfig,
    ...config,
  };
};

/*
* Initialize connection with local DTN node
* in order to listen for incoming bundles.
*/
delayTolerantMongoose.initializeListener = function () {
  listener(this.dtnConfig.DTN_HOST, this.dtnConfig.DTN_PORT, this.dtnConfig.AGENT_ID);
};

/*
* Calls updateDtnConfig and initializeListener
* methods with the given configuration.
*/
delayTolerantMongoose.configDtnAndStart = function (config) {
  this.updateDtnConfig(config);
  this.initializeListener();
};

/// ---------------------- ///
/// ----- Statistics ----- ///
/// ---------------------- ///

/*
* Object with all available statistics.
*/
const dtnStatistics = {
  // Bundle Stats.
  dtnBundlesSent: 0,
  dtnBundlesReceived: 0,
  dtnBundlesDropped: 0,
  dtnBundlesInQueue: 0,

  // Network Stats.
  totalMBSent: 0,
  totalMBReceived: 0,
  totalMBDropped: 0,
  totalMBInQueue: 0,

  // General Stats.
  uptime: (new Date()).getTime(),
  lastUpdate: null,
  amountOfDatabasesConnected: 0,
};

/*
* Saving it as a global variable.
*/
global.dtnStatistics = dtnStatistics;

/*
* Method to get all the statistics.
*/
delayTolerantMongoose.getAllStats = function () {
  return dtnStatistics;
};

/*
* Method to get just the bundle statistics.
*/
delayTolerantMongoose.getBundleStats = function () {
  return {
    dtnBundlesSent: dtnStatistics.dtnBundlesSent,
    dtnBundlesReceived: dtnStatistics.dtnBundlesReceived,
    dtnBundlesDropped: dtnStatistics.dtnBundlesDropped,
    dtnBundlesInQueue: dtnStatistics.dtnBundlesInQueue,
  }
};

/*
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

/*
* Method to get just the general statistics.
*/
delayTolerantMongoose.getGeneralStats = function () {
  return {
    uptime: dtnStatistics.uptime,
    lastUpdate: dtnStatistics.lastUpdate,
    totalTimeRunning: (new Date() - dtnStatistics.uptime) / 1000,
    timeSinceLastUpdate: (new Date() - dtnStatistics.lastUpdate) / 1000,
    amountOfDatabasesConnected: delayTolerantMongoose.dtnConfig.EID_LIST.length,
  }
};

/// ----------------------- ///
/// ----- DTN Methods ----- ///
/// ----------------------- ///

delayTolerantMongoose.Model.dtCreate = async function (document) {
  // Local Update
  const localUpdate = this.Model.create(document);
  // DTN Update.
  await AAPForwarder({ type: 'dtCreate', data: document, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtInsertMany = async function (documents) {
  // Local Update.
  const localUpdate = this.Model.insertMany(documents);
  // DTN Update.
  await AAPForwarder({ type: 'dtInsertMany', data: documents, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtDeleteOne = async function (filter = {}, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.deleteOne(filter, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtDeleteOne', data: { filter, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtDeleteMany = async function (filter = {}, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.deleteMany(filter, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtDeleteMany', data: { filter, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtUpdateOne = async function (filter = {}, update = {}, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.updateOne(filter, update, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtUpdateOne', data: { filter, update, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtUpdateMany = async function (filter = {}, update = {}, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.updateMany(filter, update, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtUpdateMany', data: { filter, update, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtReplaceOne = async function (filter = {}, replacement = {}, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.replaceOne(filter, replacement, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtReplaceOne', data: { filter, replacement, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndDelete = async function (filter = {}, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.findOneAndDelete(filter, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindOneAndDelete', data: { filter, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndRemove = async function (filter = {}, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.findOneAndRemove(filter, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindOneAndRemove', data: { filter, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndReplace = async function (filter = {}, replacement = {}, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.findOneAndReplace(filter, replacement, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindOneAndReplace', data: { filter, replacement, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndUpdate = async function (filter = {}, update = {}, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.findOneAndUpdate(filter, update, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindOneAndUpdate', data: { filter, update, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindByIdAndDelete = async function (id, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.findByIdAndDelete(id, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindByIdAndDelete', data: { id, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindByIdAndRemove = async function (id, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.findByIdAndRemove(id, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindByIdAndRemove', data: { id, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindByIdAndUpdate = async function (id, update, options = {}, callback = {}) {
  // Local Update.
  const localUpdate = this.Model.findByIdAndUpdate(id, update, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindByIdAndUpdate', data: { id, update, options, callback }, modelName: this.Model.modelName });
  return localUpdate;
};

module.exports = delayTolerantMongoose;