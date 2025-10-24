// server/controllers/analyticsController.js
const User = require("../models/User");
const Elephant = require("../models/Elephant");
const AdoptionRequest = require("../models/AdoptionRequest");
const EntryBooking = require("../models/EntryBooking");

function startOfMonth(d) {
  const x = new Date(d);
  x.setUTCDate(1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function endOfMonth(d) {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + 1, 0);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}
function firstOfDay(iso) {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function lastOfDay(iso) {
  const d = new Date(iso);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
function ymFirstDayISO(y, m1to12) {
  return `${y}-${String(m1to12).padStart(2, "0")}-01`;
}
function monthSpan(startISO, endISO) {
  const out = [];
  const s = startOfMonth(firstOfDay(startISO));
  const e = endOfMonth(lastOfDay(endISO));

  let y = s.getUTCFullYear();
  let m = s.getUTCMonth();

  while (true) {
    out.push(ymFirstDayISO(y, m + 1));
    const d = new Date(Date.UTC(y, m, 1));
    d.setUTCMonth(m + 1, 1);
    if (d > e) break;
    y = d.getUTCFullYear();
    m = d.getUTCMonth();
  }
  return out;
}

exports.getAnalytics = async (req, res, next) => {
  try {
    const { start, end, months } = req.query;

    // Determine range
    let startISO, endISO;
    if (start && end) {
      startISO = start;
      endISO = end;
    } else {
      const now = new Date();
      const e = endOfMonth(now).toISOString();
      const mBack = Math.max(Math.min(parseInt(months || "12", 10), 36), 1);
      const sDate = new Date(now);
      sDate.setUTCMonth(sDate.getUTCMonth() - (mBack - 1), 1);
      startISO = startOfMonth(sDate).toISOString();
      endISO = e;
    }

    const startDate = firstOfDay(startISO);
    const endDate = lastOfDay(endISO);

    // ---- Totals (global) ----
    const [usersTotal, elephantsTotal, adoptionsTotal, caretakersTotal] = await Promise.all([
      User.countDocuments({}),
      Elephant.countDocuments({}),
      AdoptionRequest.countDocuments({}),
      User.countDocuments({ role: "caretaker" }),
    ]);

    // ---- Time series (monthly within range) ----
    // Users created per month
    const usersAgg = await User.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);

    // Approved adoptions per month (createdAt for request month)
    const adoptionsAgg = await AdoptionRequest.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: "approved" } },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);

    // Entry visits per month (sum tickets by booking day)
    const visitsAgg = await EntryBooking.aggregate([
      {
        $match: {
          day: { $gte: startDate, $lte: endDate },
          status: "booked",
        },
      },
      {
        $group: {
          _id: { y: { $year: "$day" }, m: { $month: "$day" } },
          tickets: { $sum: { $ifNull: ["$tickets", 0] } },
        },
      },
    ]);

    const key = (y, m) => `${y}-${String(m).padStart(2, "0")}`;

    const mapUsers = new Map(usersAgg.map((r) => [key(r._id.y, r._id.m), r.count]));
    const mapAdopt = new Map(adoptionsAgg.map((r) => [key(r._id.y, r._id.m), r.count]));
    const mapVisits = new Map(visitsAgg.map((r) => [key(r._id.y, r._id.m), r.tickets]));

    const monthsList = monthSpan(startDate.toISOString(), endDate.toISOString());
    const timeseries = monthsList.map((isoFirst) => {
      const d = new Date(isoFirst + "T00:00:00Z");
      const k = key(d.getUTCFullYear(), d.getUTCMonth() + 1);
      return {
        date: isoFirst,
        users: mapUsers.get(k) || 0,
        adoptions: mapAdopt.get(k) || 0,
        visits: mapVisits.get(k) || 0,
      };
    });

    // ---- Users by role (global) ----
    const byRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $project: { _id: 0, role: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]);

    // ---- Adoptions by status (within range) ----
    const statuses = ["approved", "pending", "rejected"];
    const statusAgg = await AdoptionRequest.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]);
    const adoptionsByStatus = statuses.map((s) => {
      const f = statusAgg.find((x) => x.status === s);
      return { status: s, count: f ? f.count : 0 };
    });

    // ---- Top elephant locations (global) ----
    const topLocations = await Elephant.aggregate([
      { $group: { _id: { $ifNull: ["$location", "Unknown"] }, count: { $sum: 1 } } },
      { $project: { _id: 0, location: "$_id", count: 1 } },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]);

    res.json({
      range: { start: startDate.toISOString(), end: endDate.toISOString() },
      totals: { users: usersTotal, elephants: elephantsTotal, adoptions: adoptionsTotal, caretakers: caretakersTotal },
      timeseries,
      byRole,
      adoptionsByStatus,
      topLocations,
    });
  } catch (err) {
    next(err);
  }
};
