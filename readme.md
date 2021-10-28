# Delay Tolerant Mongoose

[![downloads](https://img.shields.io/npm/dt/delay-tolerant-mongoose.svg)](https://www.npmjs.com/package/delay-tolerant-mongoose) [![downloads](https://img.shields.io/npm/dm/delay-tolerant-mongoose.svg)](https://www.npmjs.com/package/delay-tolerant-mongoose) [![downloads](https://img.shields.io/npm/l/delay-tolerant-mongoose.svg)](https://www.npmjs.com/package/delay-tolerant-mongoose)

## **Table of contents**

- [About](#about)
- [Motivation](#motivation)
- [How to use it](#how-to-use-it)
- [List of new methods](#list-of-new-methods)
- [DTN Configuration](#dtn-configuration)
- [Installation](#installation)
- [Important Note](#important-note)
- [License](#license)

## **About**

**TL;DR:** This project is a wrapper for [Mongoose](https://mongoosejs.com/), that adds support for making your application delay tolerant.

## **Motivation**
Making your existing application delay tolerant (i.e. to work in a DTN) can be tedious, and will probably require a lot of extra work, learning new protocols (such as [µD3TN](https://gitlab.com/d3tn/ud3tn)), and rewriting of multiple modules.

So, in order to make that process easier, I created this new npm package, which connects and synchronizes multiple mongoose databases spread throughout a DTN.

Then when using this package, instead of just updating the local database, you will be updating the non-local databases too.

## **How to use it**

Let's say you have a backend (written in JavaScript) that uses mongoose.

Then, somewhere in your project, you call the connect method like this:

```javascript
const mongoose = import('mongoose');

mongoose.connect(DATABASE_URL).then(() => {
  console.log('Connected to database!');
});
```

And then, on the services of your endpoints, you'll have functions like this:

```javascript
const YourModel = require('/models/your-model');

const getDocuments = async () => {
  return await YourModel.find({});
};

const saveDocument = async (document) => {
  return await YourModel.create(document);
};

const updateDocument = async (id, updatedDoc) => {
  return await YourModel.findByIdAndUpdate(id, updatedDoc, { new: false });
};

const deleteDocument = async (id) => {
  return await YourModel.findByIdAndRemove(id);
};
```

Like I said earlier, what that code does is to connect your backend to your local database and save all your documents there. To prevent that, instead of `mongoose`, you can import `delay-tolerant-mongoose`, and use it as follows:

```javascript
const mongoose = import('delay-tolerant-mongoose');

mongoose.connect(MONGO_URL).then(() => {
  console.log('Connected to database!');
});

mongoose.configDtnAndStart({
  AGENT_ID: 'your-agent-id',
  DTN_HOST: 'local-dtn-node-host',
  DTN_PORT: 'local-dtn-node-port',
  EID_LIST: [
    'non-local-dtn-node-address-1',
    'non-local-dtn-node-address-2',
    ...
  ],
});
```

And that is almost all you would need to do in order to synchronize all your databases, to add the `configDtnAndStart` call after or before the `mongoose.connect`.

What that function does is update the local DTN node configuration and start a listener in `DTN_HOST`:`DTN_PORT` address, in order to update the local database in case any of the non-local backends add new data to their databases.

To understand better the configuration object, you can go to the [DTN Configuration](#dtn-configuration) section.

After that, you will also need to change the methods used in the services. You can use the local methods (the original [mongoose methods](https://mongoosejs.com/docs/api.html#Model)), or the new delay tolerant methods of this package for **creating**, **updating** and **deleting** documents.

Using the last example, you'll need to write:

```javascript
const YourModel = require('/models/your-model');

const getDocuments = async () => {
  return await YourModel.find({});
};

const saveDocument = async (document) => {
  return await YourModel.dtCreate(document);
};

const updateDocument = async (id, updatedDoc) => {
  return await YourModel.dtFindByIdAndUpdate(id, updatedDoc, { new: false });
};

const deleteDocument = async (id) => {
  return await YourModel.dtFindByIdAndRemove(id);
};
```

As you probably noticed, only the methods that updates the database changed (those who write, edit, or delete documents, not the ones that get documents, like `find`).

So, that is the last change you meed to do, to update the names of the methods you call.

## **List of new methods**

The list of the new delay tolerant methods is:

| Original Method | Delay Tolerant Method | Description |
| --------------- | --------------------- | ----------- |
| `create` | `dtCreate` | Saves a new document in the database |
| `insertMany` | `dtInsertMany` | Saves multiple documents in the database in one call (faster than multiple .create) |
| `deleteOne` | `dtDeleteOne` | Deletes the first document that matches the given filter |
| `deleteMany` | `dtDeleteMany` | Deletes many documents that matches the given filter |
| `updateOne` | `dtUpdateOne` | Updates the first document that matches the given filter |
| `updateMany` | `dtUpdateMany` | Updates many documents that matches the given filter |
| `replaceOne` | `dtReplaceOne` | Replaces the first document matching the given filter |
| `findOneAndDelete` | `dtFindOneAndDelete` | Finds a matching document, removes it, and returns the document |
| `findOneAndRemove` | `dtFindOneAndRemove` | Like findOneAndDelete, but becomes a MongoDB findAndModify() command, and returns the document |
| `findOneAndReplace` | `dtFindOneAndReplace` | Replaces the first document that matches the given filter, and returns the document |
| `findOneAndUpdate` | `dtFindOneAndUpdate` | Updates the first document that matches the given filter, and returns the document |
| `findByIdAndDelete` | `dtFindByIdAndDelete` | Triggers findOneAndDelete with the given ID, and returns the document |
| `findByIdAndRemove` | `dtFindByIdAndRemove` | Triggers findOneAndRemove with the given ID, and returns the document |
| `findByIdAndUpdate` | `dtFindByIdAndUpdate` | Triggers findOneAndUpdate with the given ID, and returns the document |

## **DTN Configuration**

- **AGENT_ID**: The Agent ID (the last part of the EID), to register your application.
  - **Example**: If your local DTN node address is `dtn://node-name.dtn/` and you decide to register your application as "myApp" (i.e. Agent ID = "myApp"), then your endpoint would be: `dtn://node-name.dtn/myApp`.

- **DTN_HOST**: This is used to configure the local DTN Node to forward the messages to this host.

- **DTN_PORT**: This is used to configure the local DTN Node to forward the messages to this port.

- **EID_LIST**: The list of nodes of the DTN (the Endpoint Identifiers) where your other databases are located. It's needed in order to update them when you create/edit/delete a document locally.

## **Installation**

If you use `npm`, just:
```
npm i delay-tolerant-mongoose
```

Or if you use `yarn`:

```
yarn add delay-tolerant-mongoose
```

## **Important Note**

This is still being in development, it's only published because I wanted to test it by installing it with yarn on another project.

## **License**

The MIT license.