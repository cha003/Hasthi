// server/controllers/managerAnalyticsController.js
const mongoose = require("mongoose");
const Elephant = require("../models/Elephant");
const Issue = require("../models/Issue");
const HealthRequest = require("../models/HealthRequest");
const Report = require("../models/Report");
const User = require("../models/User");

/**
 * GET /api/manager-analytics
 * Accepts: ?start=YYYY-MM-DD&end=YYYY-MM-DD  OR  ?months=12 (default)
 * Returns: totals, timeseries, pies/bars, and top lists to visualize.
 */
exports.getManagerAnalytics = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const monthsQ = Math.min(Math.max(parseInt(req.query.months || "12", 10), 1), 36);

    // Resolve time range
    let startDate, endDate;
    if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
      if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
        return res.status(400).json({ message: "Invalid date range" });
      }
      // inclusive end-of-day
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default: last N months inclusive
      const now = new Date();
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      endDate.setUTCMonth(endDate.getUTCMonth() + 1); // first day of next month
      endDate.setUTCHours(0, 0, 0, 0);
      endDate = new Date(endDate - 1); // last ms of this month

      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      startDate.setUTCMonth(startDate.getUTCMonth() - (monthsQ - 1));
      startDate.setUTCHours(0, 0, 0, 0);
    }

    // Month key projection helper (YYYY-MM)
    const monthKey = (field) => ({
      $dateToString: { format: "%Y-%m", date: `$${field}`, timezone: "UTC" },
    });

    // --- Totals (overall) ---
    const [
      elephantsTotal,
      issuesTotal,
      healthReqTotal,
      reportsTotal,
      caretakersTotal,
      veterinariansTotal,
    ] = await Promise.all([
      Elephant.countDocuments({}),
      Issue.countDocuments({}),
      HealthRequest.countDocuments({}),
      Report.countDocuments({}),
      User.countDocuments({ role: "caretaker" }),
      User.countDocuments({ role: "veterinarian" }),
    ]);

    // --- Pie: Elephants by health.status ---
    const elephantsByHealth = await Elephant.aggregate([
      { $group: { _id: "$health.status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]);

    // --- Pie: Health Requests by status ---
    const healthRequestsByStatus = await HealthRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]);

    // --- Top locations (by elephant count) ---
    const topLocations = await Elephant.aggregate([
      { $match: { location: { $exists: true, $ne: null, $ne: "" } } },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $project: { _id: 0, location: "$_id", count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Build list of YYYY-MM keys across the selected range
    const monthsList = [];
    {
      const a = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
      const b = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));
      for (
        let d = new Date(a);
        d <= b;
        d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
      ) {
        monthsList.push(d.toISOString().slice(0, 7));
      }
    }

    // --- Timeseries: Issues created per month ---
    const issuesByMonthAgg = await Issue.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: monthKey("createdAt"), issues: { $sum: 1 } } },
      { $project: { _id: 0, month: "$_id", issues: 1 } },
    ]);

    // --- Timeseries: Prescriptions uploaded per month ---
    const prescriptionsByMonthAgg = await Issue.aggregate([
      {
        $match: {
          "prescription.uploadedAt": { $exists: true, $ne: null, $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: monthKey("prescription.uploadedAt"), prescriptions: { $sum: 1 } } },
      { $project: { _id: 0, month: "$_id", prescriptions: 1 } },
    ]);

    // --- Timeseries: Health Requests created vs fulfilled per month ---
    const hrCreatedByMonthAgg = await HealthRequest.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: monthKey("createdAt"), created: { $sum: 1 } } },
      { $project: { _id: 0, month: "$_id", created: 1 } },
    ]);
    const hrFulfilledByMonthAgg = await HealthRequest.aggregate([
      {
        $match: {
          respondedAt: { $gte: startDate, $lte: endDate },
          status: "fulfilled",
        },
      },
      { $group: { _id: monthKey("respondedAt"), fulfilled: { $sum: 1 } } },
      { $project: { _id: 0, month: "$_id", fulfilled: 1 } },
    ]);

    // --- Timeseries: Daily Caretaker Reports per month ---
    const reportsByMonthAgg = await Report.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: monthKey("createdAt"), reports: { $sum: 1 } } },
      { $project: { _id: 0, month: "$_id", reports: 1 } },
    ]);

    // Turn aggregation arrays into fast lookups
    const toMap = (arr, key, valKey) => Object.fromEntries(arr.map((x) => [x[key], x[valKey]]));
    const issuesByMonthMap = toMap(issuesByMonthAgg, "month", "issues");
    const prescByMonthMap = toMap(prescriptionsByMonthAgg, "month", "prescriptions");
    const hrCreatedMap = toMap(hrCreatedByMonthAgg, "month", "created");
    const hrFulfilledMap = toMap(hrFulfilledByMonthAgg, "month", "fulfilled");
    const reportsByMonthMap = toMap(reportsByMonthAgg, "month", "reports");

    // Final timeseries rows
    const timeseries = monthsList.map((mKey) => {
      const [y, m] = mKey.split("-").map((n) => parseInt(n, 10));
      const date = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10); // "YYYY-MM-01"
      return {
        date,
        issues: issuesByMonthMap[mKey] || 0,
        prescriptions: prescByMonthMap[mKey] || 0,
        healthReqCreated: hrCreatedMap[mKey] || 0,
        healthReqFulfilled: hrFulfilledMap[mKey] || 0,
        caretakerReports: reportsByMonthMap[mKey] || 0,
      };
    });

    // Totals for this range (handy KPIs)
    const rangeTotals = {
      issues: timeseries.reduce((s, d) => s + d.issues, 0),
      prescriptions: timeseries.reduce((s, d) => s + d.prescriptions, 0),
      healthReqCreated: timeseries.reduce((s, d) => s + d.healthReqCreated, 0),
      healthReqFulfilled: timeseries.reduce((s, d) => s + d.healthReqFulfilled, 0),
      caretakerReports: timeseries.reduce((s, d) => s + d.caretakerReports, 0),
    };

    res.json({
      range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      totals: {
        elephants: elephantsTotal,
        issues: issuesTotal,
        healthRequests: healthReqTotal,
        caretakerReports: reportsTotal,
        caretakers: caretakersTotal,
        veterinarians: veterinariansTotal,
      },
      rangeTotals,
      timeseries,
      elephantsByHealth,         // pie
      healthRequestsByStatus,    // pie
      topLocations,              // bar (vertical)
    });
  } catch (err) {
    next(err);
  }
};
