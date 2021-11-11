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
  AGENT_ID: 'bundlesink',
  DTN_HOST: 'localhost',
  DTN_PORT: '4243',
  EID_LIST: ['dtn://b.dtn/bundlesink'],
};

/*
* Method for updating DTN configuration.
*/
delayTolerantMongoose.updateDtnConfig = (config) => {
  this.dtnConfig = {
    ...this.dtnConfig,
    ...config,
  };
};

/*
* Initialize connection with local DTN node
* in order to listen for incoming bundles.
*/
delayTolerantMongoose.initializeListener = () => {
  listener(this.dtnConfig.DTN_HOST, this.dtnConfig.DTN_PORT, this.dtnConfig.AGENT_ID);
  // This needs to run in another process maybe?
};

/*
* Calls updateDtnConfig and initializeListener
* methods with the given configuration.
*/
delayTolerantMongoose.configDtnAndStart = (config) => {
  this.updateDtnConfig(config);
  this.initializeListener();
};


/// ----------------------- ///
/// ----- DTN Methods ----- ///
/// ----------------------- ///

delayTolerantMongoose.Model.dtCreate = async (document) => {
  // Local Update
  const localUpdate = delayTolerantMongoose.Model.create(document);
  // TODO: Handle error here - If local update went well -> call AAPForwarder.
  await AAPForwarder({ type: 'dtCreate', data: document, modelName: delayTolerantMongoose.Model.modelName });

  return localUpdate;
};

delayTolerantMongoose.Model.dtInsertMany = async (documents) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.insertMany(documents);
  // DTN Update.
  await AAPForwarder({ type: 'dtInsertMany', data: documents, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtDeleteOne = async (filter = {}, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.deleteOne(filter, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtDeleteOne', data: { filter, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtDeleteMany = async (filter = {}, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.deleteMany(filter, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtDeleteMany', data: { filter, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtUpdateOne = async (filter = {}, update = {}, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.updateOne(filter, update, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtUpdateOne', data: { filter, update, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtUpdateMany = async (filter = {}, update = {}, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.updateMany(filter, update, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtUpdateMany', data: { filter, update, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtReplaceOne = async (filter = {}, replacement = {}, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.replaceOne(filter, replacement, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtReplaceOne', data: { filter, replacement, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndDelete = async (filter = {}, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.findOneAndDelete(filter, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindOneAndDelete', data: { filter, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndRemove = async (filter = {}, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.findOneAndRemove(filter, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindOneAndRemove', data: { filter, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndReplace = async (filter = {}, replacement = {}, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.findOneAndReplace(filter, replacement, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindOneAndReplace', data: { filter, replacement, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindOneAndUpdate = async (filter = {}, update = {}, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.findOneAndUpdate(filter, update, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindOneAndUpdate', data: { filter, update, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindByIdAndDelete = async (id, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.findByIdAndDelete(id, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindByIdAndDelete', data: { id, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindByIdAndRemove = async (id, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.findByIdAndRemove(id, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindByIdAndRemove', data: { id, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

delayTolerantMongoose.Model.dtFindByIdAndUpdate = async (id, update, options = {}, callback = {}) => {
  // Local Update.
  const localUpdate = delayTolerantMongoose.Model.findByIdAndUpdate(id, update, options, callback);
  // DTN Update.
  await AAPForwarder({ type: 'dtFindByIdAndUpdate', data: { id, update, options, callback }, modelName: delayTolerantMongoose.Model.modelName });
  return localUpdate;
};

module.exports = delayTolerantMongoose;