const AAPForwarder = require('./aap/forwarder');
const listener = require('./aap/listener');
const mongoose = require('mongoose');

// TODO: Add this functions to be delay tolerant too:
// this.Model.createCollection
// this.Model.createIndexes
// this.Model.addListener
// this.Model.emit

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

  // Initialize connection with local DTN node
  // in order to listen for incoming bundles.
  initializeDTN: () => {
    listener(this.dtnConfig.DTN_HOST, this.dtnConfig.DTN_PORT, this.dtnConfig.AGENT_ID);
  },

  // Mongoose model object, with the new delay tolerant methods.
  Model = {
    ...mongoose.Model,

    dtCreate: async (document) => {
      const message = {
        type: 'dtCreate',
        data: document,
        modelName: this.Model.modelName,
      };

      await AAPForwarder(message);
      return await this.Model.create(document);
    },

    dtInsertMany: (documents) => {
      console.log("Calling delay tolerant insertMany...");
      console.log("Data: ", documents);
      console.log("Model Name: ", this.Model.modelName);
      // Send message over the DTN here...
      return this.Model.insertMany(documents);
    },

    dtDeleteOne: (filter = {}, options = {}, callback = {}) => {
      console.log("Calling delay tolerant deleteOne...");
      console.log("Filter: ", filter);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.deleteOne(filter, options, callback);
    },

    dtDeleteMany: (filter = {}, options = {}, callback = {}) => {
      console.log("Calling delay tolerant deleteMany...");
      console.log("Filter: ", filter);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.deleteMany(filter, options, callback);
    },

    dtUpdateOne: (filter = {}, update = {}, options = {}, callback = {}) => {
      console.log("Calling delay tolerant updateOne...");
      console.log("Filter: ", filter);
      console.log("Update: ", update);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.updateOne(filter, update, options, callback);
    },

    dtUpdateMany: (filter = {}, update = {}, options = {}, callback = {}) => {
      console.log("Calling delay tolerant updateMany...");
      console.log("Filter: ", filter);
      console.log("Update: ", update);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.updateMany(filter, update, options, callback);
    },

    dtReplaceOne: (filter = {}, replacement = {}, options = {}, callback = {}) => {
      console.log("Calling delay tolerant replaceOne...");
      console.log("Filter: ", filter);
      console.log("Replacement: ", replacement);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.replaceOne(filter, replacement, options, callback);
    },

    dtFindOneAndDelete: (filter = {}, options = {}, callback = {}) => {
      console.log("Calling delay tolerant findOneAndDelete...");
      console.log("Filter: ", filter);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.findOneAndDelete(filter, options, callback);
    },

    dtFindOneAndRemove: (filter = {}, options = {}, callback = {}) => {
      console.log("Calling delay tolerant findOneAndRemove...");
      console.log("Filter: ", filter);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.findOneAndRemove(filter, options, callback);
    },

    dtFindOneAndReplace: (filter = {}, replacement = {}, options = {}, callback = {}) => {
      console.log("Calling delay tolerant findOneAndReplace...");
      console.log("Filter: ", filter);
      console.log("Replacement: ", replacement);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.findOneAndReplace(filter, replacement, options, callback);
    },

    dtFindOneAndUpdate: (filter = {}, update = {}, options = {}, callback = {}) => {
      console.log("Calling delay tolerant findOneAndUpdate...");
      console.log("Filter: ", filter);
      console.log("Update: ", update);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.findOneAndUpdate(filter, update, options, callback);
    },

    dtFindByIdAndDelete: (id, options = {}, callback = {}) => {
      console.log("Calling delay tolerant findByIdAndDelete...");
      console.log("Id: ", id);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.findByIdAndDelete(id, options, callback);
    },

    dtFindByIdAndRemove: (id, options = {}, callback = {}) => {
      console.log("Calling delay tolerant findByIdAndRemove...");
      console.log("Id: ", id);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.findByIdAndRemove(id, options, callback);
    },

    dtFindByIdAndUpdate: (id, update, options = {}, callback = {}) => {
      console.log("Calling delay tolerant findByIdAndUpdate...");
      console.log("Id: ", id);
      console.log("Update: ", update);
      console.log("Options: ", options);
      console.log("Callback: ", callback);
      // Send message over the DTN here...
      return this.Model.findByIdAndUpdate(id, update, options, callback);
    },
  }
};

module.exports = delayTolerantMongoose;