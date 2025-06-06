const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI; 
let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

module.exports = clientPromise;
