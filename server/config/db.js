// server/config/db.js
const mongoose = require("mongoose");

async function connectDB(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { dbName: "hasthi" });
  console.log("✅ MongoDB connected");
}

module.exports = { connectDB };
