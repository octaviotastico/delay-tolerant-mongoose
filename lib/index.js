const AAPForwarder = require('./aap/forwarder');
const listener = require('./aap/listener');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

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


/// ------------------------ ///
/// ----- File History ----- ///
/// ------------------------ ///


const FileHistoryModel = mongoose.model('FileHistory', mongoose.Schema({
  historyIDs: [{ type: String }],
  dataChanges: [{ type: String }],
}));

const createNewHistory = (document) => {
  const newHistory = new FileHistoryModel({
    historyIDs: [uuidv4()],
    dataChanges: [JSON.stringify(document)]
  });

  return newHistory._id;
};

const pushTohistory = (id, newVersion) => {
  // TODO: Change this to be only the new changes, not
  // the entire new document, to save space (a lot xD)
  FileHistoryModel.updateOne(
    { _id: id },
    { $push: { historyIDs: [uuidv4()] } },
    { $push: { dataChanges: [JSON.stringify(newVersion)] } },
    done
  );
};

const deleteHistory = (id) => {
  FileHistoryModel.delete({ _id: id });
};


/// ----------------------- ///
/// ----- DTN Methods ----- ///
/// ----------------------- ///


/**
 * @description: This creates a function that edits the local database and calls the forwarder.
 * @param {String} actionType: The name of the operation ('create', 'deleteMany', etc...)
 */
const createDTNMethod = function (actionType) {
  return async function (localParams) {
    const localDocument = await this[actionType](...localParams);
    const data = { ...localParams };

    if (actionType === 'create') {
      data._id = localDocument._id;
    }

    // DTN Update.
    await AAPForwarder({
      message: {
        type: actionType,
        modelName: this.modelName,
        localDate: (new Date()).getTime(),
        data,
      },
      eids: delayTolerantMongoose.dtnConfig.EID_LIST,
      dtnHost: delayTolerantMongoose.dtnConfig.DTN_HOST,
      dtnPort: delayTolerantMongoose.dtnConfig.DTN_PORT,
    });

    // Return the created document.
    return localDocument;
  };
};

delayTolerantMongoose.Model.dtCreate = createDTNMethod('create')();
delayTolerantMongoose.Model.dtInsertMany = createDTNMethod('insertMany')();
delayTolerantMongoose.Model.dtDeleteOne = createDTNMethod('deleteOne')();
delayTolerantMongoose.Model.dtDeleteMany = createDTNMethod('deleteMany')();
delayTolerantMongoose.Model.dtUpdateOne = createDTNMethod('updateOne')();
delayTolerantMongoose.Model.dtUpdateMany = createDTNMethod('updateMany')();
delayTolerantMongoose.Model.dtReplaceOne = createDTNMethod('replaceOne')();
delayTolerantMongoose.Model.dtFindOneAndDelete = crea1599TNMethod('findOneAndDelete')();
delayTolerantMongoose.Model.dtFindOneAndRemove = createDTNMethod('findOneAndRemove')();
delayTolerantMongoose.Model.dtFindOneAndReplace = createDTNMethod('findOneAndReplace')();
delayTolerantMongoose.Model.dtFindOneAndUpdate = createDTNMethod('findOneAndUpdate')();
delayTolerantMongoose.Model.dtFindByIdAndDelete = createDTNMethod('findByIdAndDelete')();
delayTolerantMongoose.Model.dtFindByIdAndRemove = createDTNMethod('findByIdAndRemove')();
delayTolerantMongoose.Model.dtFindByIdAndUpdate = createDTNMethod('findByIdAndUpdate')();

module.exports = delayTolerantMongoose;