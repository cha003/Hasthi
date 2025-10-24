// server/app.js  (YOUR FILE UPDATED)
require("dotenv").config(); // must be first
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const adoptionRoutes = require("./routes/adoptionRoutes");
const userRoutes = require("./routes/userRoutes");
const paymentCtrl = require("./controllers/paymentController");
const path = require("path");
const healthRequestRoutes = require("./routes/healthRequestRoutes");
const chatRoutes = require("./routes/chatRoutes");



const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// health
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "backend", time: new Date().toISOString() });
});

// routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/elephants", require("./routes/elephantRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/issues", require("./routes/issueRoutes"));
app.use("/api/adoptions", adoptionRoutes);
app.use("/api/users", userRoutes);

// Add the new Contact route
app.use("/api/contact", require("./routes/contactroutes")); // Add this line for contact messages

// Events & bookings
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/entry", require("./routes/entryRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));

// ✅ Event Manager dashboard endpoints (lists for events & entry bookings)
app.use("/api/eventmgr", require("./routes/eventManagerRoutes"));

// ✅ NEW: Analytics endpoint
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/admin/analytics", require("./routes/analyticsRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));


app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

app.use("/api/health-requests", healthRequestRoutes);

app.use("/api/chat", chatRoutes);

app.use("/api/event-analytics", require("./routes/eventAnalyticsRoutes"));
// server/app.js
app.use("/api/manager-analytics", require("./routes/managerAnalyticsRoutes"));


// 404 + errors
app.use(notFound);
app.use(errorHandler);

module.exports = app;
