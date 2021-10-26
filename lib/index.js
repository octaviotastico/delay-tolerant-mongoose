const mongoose = require('mongoose');

const dtnDefaultConfig = () => {
  return ({
    AGENT_ID: 'bundlesink',
    DTN_HOST: 'localhost',
    DTN_PORT: '4243',
  });
};

const dtCreate = (data) => {
  console.log("Calling delay tolerant save...");
  console.log("Data: ", data);
  console.log("Model Name: ", this.Model.modelName);

  // Send message over the DTN here...

  return this.Model.create(data);
};

const dtDeleteOne = (filter = {}, options = {}, callback = {}) => {
  console.log("Calling delay tolerant delete one...");
  console.log("Filter: ", filter);
  console.log("Options: ", options);
  console.log("Callback: ", callback);

  // Send message over the DTN here...

  return this.Model.deleteOne(filter, options, callback)
};

// TODO: Add this functions to be delay tolerant too:
// this.Model.createCollection
// this.Model.createIndexes
// this.Model.deleteMany
// this.Model.deleteOne
// this.Model.emit
// this.Model.insertMany
// this.Model.replaceOne
// this.Model.updateMany
// this.Model.updateOne
// this.Model.findByIdAndDelete
// this.Model.findByIdAndRemove
// this.Model.findByIdAndUpdate
// this.Model.findOneAndDelete
// this.Model.findOneAndRemove
// this.Model.findOneAndReplace
// this.Model.findOneAndUpdate
// this.Model.addListener

const dtFindOneAndUpdate = (data) => {
  console.log("Calling delay tolerant patch...");
  return this.Model.findOneAndUpdate({_id: data._id}, data, {new: true});
};

const dt_mongoose = {
  ...mongoose,
  DTN_CONFIG: dtnDefaultConfig,
  Model: {
    ...mongoose.Model,
    dtCreate,
    dtDeleteOne,
  },
};

module.exports = dt_mongoose;