const AAPForwarder = require('./aap/forwarder');
const listener = require('./aap/listener');
const mongoose = require('mongoose');

const delayTolerantMongoose = {
  // Usual mongoose methods and properties.
  ...mongoose,

  // Delay tolerant network configuration.
  dtnConfig: {
    AGENT_ID: 'bundlesink',
    DTN_HOST: 'localhost',
    DTN_PORT: '4243',
    EID_LIST: ['dtn://b.dtn/bundlesink'],
  },

  // Update DTN configuration.
  updateDtnConfig(config) {
    this.dtnConfig = {
      ...this.dtnConfig,
      ...config,
    };
  },

  // Initialize connection with local DTN node
  // in order to listen for incoming bundles.
  initializeListener: () => {
    // This needs to run in another process maybe?
    listener(this.dtnConfig.DTN_HOST, this.dtnConfig.DTN_PORT, this.dtnConfig.AGENT_ID);
  },

  // Configure and start the listener.
  configDtnAndStart: (config) => {
    this.updateDtnConfig(config);
    this.initializeDTN();
  },

  // Mongoose model object, with the new delay tolerant methods.
  Model: {
    ...mongoose.Model,

    dtCreate: async (document) => {
      // Local Update
      const localUpdate = this.Model.create(document);
      // TODO: Handle error here
      // If local update went well
      // DTN Update.
      await AAPForwarder({ type: 'dtCreate', data: document, modelName: this.Model.modelName });

      return localUpdate;
    },

    dtInsertMany: async (documents) => {
      // Local Update.
      const localUpdate = this.Model.insertMany(documents);
      // DTN Update.
      await AAPForwarder({ type: 'dtInsertMany', data: documents, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtDeleteOne: async (filter = {}, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.deleteOne(filter, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtDeleteOne', data: { filter, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtDeleteMany: async (filter = {}, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.deleteMany(filter, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtDeleteMany', data: { filter, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtUpdateOne: async (filter = {}, update = {}, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.updateOne(filter, update, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtUpdateOne', data: { filter, update, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtUpdateMany: async (filter = {}, update = {}, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.updateMany(filter, update, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtUpdateMany', data: { filter, update, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtReplaceOne: async (filter = {}, replacement = {}, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.replaceOne(filter, replacement, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtReplaceOne', data: { filter, replacement, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtFindOneAndDelete: async (filter = {}, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.findOneAndDelete(filter, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtFindOneAndDelete', data: { filter, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtFindOneAndRemove: async (filter = {}, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.findOneAndRemove(filter, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtFindOneAndRemove', data: { filter, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtFindOneAndReplace: async (filter = {}, replacement = {}, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.findOneAndReplace(filter, replacement, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtFindOneAndReplace', data: { filter, replacement, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtFindOneAndUpdate: async (filter = {}, update = {}, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.findOneAndUpdate(filter, update, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtFindOneAndUpdate', data: { filter, update, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtFindByIdAndDelete: async (id, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.findByIdAndDelete(id, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtFindByIdAndDelete', data: { id, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtFindByIdAndRemove: async (id, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.findByIdAndRemove(id, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtFindByIdAndRemove', data: { id, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },

    dtFindByIdAndUpdate: async (id, update, options = {}, callback = {}) => {
      // Local Update.
      const localUpdate = this.Model.findByIdAndUpdate(id, update, options, callback);
      // DTN Update.
      await AAPForwarder({ type: 'dtFindByIdAndUpdate', data: { id, update, options, callback }, modelName: this.Model.modelName });
      return localUpdate;
    },
  }
};

module.exports = delayTolerantMongoose;