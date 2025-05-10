const { MongoClient } = require("mongodb");

const uri = "mongodb://127.0.0.1:27017";

const client = new MongoClient(uri);
let db = {}

async function connectDB() {
    try {
        await client.connect();
        console.log("Connected Successfully to MongoDB!");
        db = client.db("amazon"); 
    } catch (err) {
        console.error("Connection Error:", err);
    }
}

async function getDb(){
    return db
}



module.exports = { connectDB, getDb };