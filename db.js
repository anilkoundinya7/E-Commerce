const { MongoClient } = require("mongodb");

const uri = "mongodb://127.0.0.1:27017"; // your local MongoDB URI
const client = new MongoClient(uri);

let db; // ✅ no default assignment

async function connectDB() {
  try {
    await client.connect();
    db = client.db("amazon"); // ✅ your database name
    console.log("✅ Connected Successfully to MongoDB!");
  } catch (err) {
    console.error("❌ Connection Error:", err);
    throw err;
  }
}

function getDb() {
  if (!db) {
    throw new Error("❗Database not initialized. Call connectDB() before using getDb().");
  }
  return db;
}

module.exports = { connectDB, getDb };
