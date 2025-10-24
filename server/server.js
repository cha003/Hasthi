// server/server.js
require("dotenv").config();
const http = require("http");
const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    http.createServer(app).listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error("Failed to start server:", e);
    process.exit(1);
  }
})();
