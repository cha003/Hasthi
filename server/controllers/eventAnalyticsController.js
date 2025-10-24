// server/controllers/eventAnalyticsController.js
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const mongoose = require("mongoose");

/**
 * GET /api/event-analytics
 * Query:
 *  - start=YYYY-MM-DD & end=YYYY-MM-DD (preferred) OR
 *  - months=N (1..36, default 12) -> last N months
 *
 * What we compute:
 *  - totals: { events, bookings, tickets, revenue }
 *  - timeseries (per month): { date, events, bookings, tickets, revenue }
 *  - byEvent: [{ event, bookings, tickets, revenue }]
 *  - topEvents (by tickets): [{ event, tickets }]
 *  - range: { fromMonth, toMonth }
 */
exports.getEventAnalytics = async (req, res, next) => {
  try {
    // --- Resolve time window ---
    let start, end;
    if (req.query.start && req.query.end) {
      start = new Date(req.query.start);
      end = new Date(req.query.end);
      // Normalize to day boundaries (UTC)
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);
    } else {
      const months = Math.min(Math.max(parseInt(req.query.months || "12", 10), 1), 36);
      const now = new Date();
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      start.setUTCMonth(start.getUTCMonth() - (months - 1));
    }

    // helper to create YYYY-MM keys
    const monthKey = (d) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 7);

    // Build month list
    const monthsList = [];
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    while (cur <= last) {
      monthsList.push(cur.toISOString().slice(0, 7));
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }

    // ===== Totals =====
    const [eventsTotal, bookingsTotalAgg] = await Promise.all([
      // Events whose start falls in the window
      Event.countDocuments({ start: { $gte: start, $lte: end }, status: { $ne: "cancelled" } }),
      // Bookings window: based on booking createdAt (activity during window)
      Booking.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: "booked",
          },
        },
        // join Event to get ticketPrice (fallback to price)
        {
          $lookup: {
            from: "events",
            localField: "event",
            foreignField: "_id",
            as: "ev",
          },
        },
        { $unwind: "$ev" },
        {
          $project: {
            tickets: 1,
            paymentStatus: 1,
            ticketPrice: {
              $cond: [
                { $gt: ["$ev.ticketPrice", 0] },
                "$ev.ticketPrice",
                { $ifNull: ["$ev.price", 0] },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            bookings: { $sum: 1 },
            tickets: { $sum: "$tickets" },
            // revenue: PAID tickets * price
            revenue: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentStatus", "paid"] },
                  { $multiply: ["$tickets", "$ticketPrice"] },
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const bookingsTotal = bookingsTotalAgg[0]?.bookings || 0;
    const ticketsTotal = bookingsTotalAgg[0]?.tickets || 0;
    const revenueTotal = bookingsTotalAgg[0]?.revenue || 0;

    // ===== Timeseries per month =====
    // Events scheduled by "start"
    const eventsByMonthAgg = await Event.aggregate([
      {
        $match: {
          start: { $gte: start, $lte: end },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$start", timezone: "UTC" } },
          events: { $sum: 1 },
        },
      },
      { $project: { _id: 0, month: "$_id", events: 1 } },
    ]);

    // Bookings by createdAt
    const bookingsByMonthAgg = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: "booked",
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "UTC" } },
          bookings: { $sum: 1 },
        },
      },
      { $project: { _id: 0, month: "$_id", bookings: 1 } },
    ]);

    // Tickets & revenue per month (needs join for price)
    const ticketsRevenueByMonthAgg = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: "booked",
        },
      },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "ev",
        },
      },
      { $unwind: "$ev" },
      {
        $project: {
          createdAt: 1,
          tickets: 1,
          paymentStatus: 1,
          ticketPrice: {
            $cond: [
              { $gt: ["$ev.ticketPrice", 0] },
              "$ev.ticketPrice",
              { $ifNull: ["$ev.price", 0] },
            ],
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "UTC" } },
          tickets: { $sum: "$tickets" },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "paid"] },
                { $multiply: ["$tickets", "$ticketPrice"] },
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0, month: "$_id", tickets: 1, revenue: 1 } },
    ]);

    const eventsByMonth = Object.fromEntries(eventsByMonthAgg.map((x) => [x.month, x.events]));
    const bookingsByMonth = Object.fromEntries(bookingsByMonthAgg.map((x) => [x.month, x.bookings]));
    const ticketsByMonth = Object.fromEntries(ticketsRevenueByMonthAgg.map((x) => [x.month, x.tickets]));
    const revenueByMonth = Object.fromEntries(ticketsRevenueByMonthAgg.map((x) => [x.month, x.revenue]));

    const timeseries = monthsList.map((mKey) => {
      const [y, m] = mKey.split("-").map((n) => parseInt(n, 10));
      const date = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
      return {
        date,
        events: eventsByMonth[mKey] || 0,
        bookings: bookingsByMonth[mKey] || 0,
        tickets: ticketsByMonth[mKey] || 0,
        revenue: revenueByMonth[mKey] || 0,
      };
    });

    // ===== Breakdown by event =====
    const byEventAgg = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: "booked",
        },
      },
      {
        $lookup: {
          from: "events",
          localField: "event",
          foreignField: "_id",
          as: "ev",
        },
      },
      { $unwind: "$ev" },
      {
        $project: {
          tickets: 1,
          paymentStatus: 1,
          title: "$ev.title",
          ticketPrice: {
            $cond: [
              { $gt: ["$ev.ticketPrice", 0] },
              "$ev.ticketPrice",
              { $ifNull: ["$ev.price", 0] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$title",
          bookings: { $sum: 1 },
          tickets: { $sum: "$tickets" },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "paid"] },
                { $multiply: ["$tickets", "$ticketPrice"] },
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0, event: "$_id", bookings: 1, tickets: 1, revenue: 1 } },
      { $sort: { tickets: -1 } },
    ]);

    const topEvents = byEventAgg.slice(0, 10).map(({ event, tickets }) => ({ event, tickets }));

    return res.json({
      totals: {
        events: eventsTotal,
        bookings: bookingsTotal,
        tickets: ticketsTotal,
        revenue: revenueTotal,
      },
      timeseries,
      byEvent: byEventAgg,
      topEvents,
      revenueByMonth: timeseries.map(({ date, revenue }) => ({ date, revenue })),
      range: { fromMonth: monthsList[0] || null, toMonth: monthsList[monthsList.length - 1] || null },
    });
  } catch (err) {
    next(err);
  }
};
