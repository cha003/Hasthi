const PDFDocument = require("pdfkit");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

const Booking = require("../models/Booking");          // event bookings
const EntryBooking = require("../models/EntryBooking"); // entry bookings
const Event = require("../models/Event");

function monthRange(year, month) {
  const start = dayjs.utc().year(Number(year)).month(Number(month) - 1).date(1).startOf("day");
  const end = start.add(1, "month");
  return { start: start.toDate(), end: end.toDate(), label: start.format("MMMM YYYY") };
}

function money(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function writeHeader(doc, title, sub) {
  doc.fontSize(20).text(title, { align: "center" });
  doc.moveDown(0.2);
  doc.fontSize(12).fillColor("#555").text(sub, { align: "center" });
  doc.moveDown(1);
  doc.fillColor("#000");
}

function tableHeader(doc, x, y, cols) {
  doc.fontSize(11).fillColor("#111");
  let xi = x;
  cols.forEach(({ label, width, align }) => {
    doc.text(label, xi, y, { width, align: align || "left" });
    xi += width;
  });
  doc.moveTo(x, y + 14).lineTo(x + cols.reduce((s, c) => s + c.width, 0), y + 14).strokeColor("#ddd").stroke();
  doc.fillColor("#000");
}

function tableRow(doc, x, y, cols) {
  let xi = x;
  doc.fontSize(10).fillColor("#000");
  cols.forEach(({ text, width, align }) => {
    doc.text(String(text ?? ""), xi, y, { width, align: align || "left" });
    xi += width;
  });
}

async function monthlyInvoicePdf(req, res, next) {
  try {
    const { year, month } = req.params;
    const { start, end, label } = monthRange(year, month);

    // ——— Event bookings ———
    const eventBookings = await Booking.find({
      paymentStatus: "paid",
      status: "booked",
      updatedAt: { $gte: start, $lt: end }
    })
      .populate("event", "title start ticketPrice")
      .lean();

    // aggregate per event
    const eventAgg = new Map();
    let eventsTotalAmount = 0;
    let eventsTotalTickets = 0;

    for (const b of eventBookings) {
      const ev = b.event || {};
      const key = String(ev._id || b.event);
      const qty = Number(b.quantity ?? b.tickets ?? 1);
      const unit = Number(
        b.unitPrice ??
        b.price ??
        ev.ticketPrice ??
        0
      );
      const amount = Number(b.total ?? qty * unit);

      const row = eventAgg.get(key) || {
        eventId: key,
        title: ev.title || "Untitled event",
        date: ev.start ? new Date(ev.start) : null,
        tickets: 0,
        amount: 0
      };
      row.tickets += qty;
      row.amount += amount;
      eventAgg.set(key, row);

      eventsTotalTickets += qty;
      eventsTotalAmount += amount;
    }

    const eventRows = Array.from(eventAgg.values()).sort((a, b) =>
      (a.date?.getTime() || 0) - (b.date?.getTime() || 0)
    );

    // ——— Entry tickets ———
    const entryPaid = await EntryBooking.find({
      paymentStatus: "paid",
      status: "booked",
      updatedAt: { $gte: start, $lt: end }
    }).lean();

    let entryTotalTickets = 0;
    let entryTotalAmount = 0;
    let entryAdultQty = 0;
    let entryChildQty = 0;
    for (const b of entryPaid) {
      const tickets = Number(b.tickets || 0);
      entryTotalTickets += tickets;

      const total = Number(
        b.total ??
        (Array.isArray(b.items)
          ? b.items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0), 0)
          : 0)
      );
      entryTotalAmount += total;

      if (Array.isArray(b.items)) {
        for (const it of b.items) {
          if (String(it.type).toLowerCase() === "adult") entryAdultQty += Number(it.qty || 0);
          if (String(it.type).toLowerCase() === "child") entryChildQty += Number(it.qty || 0);
        }
      }
    }

    const grandTotal = eventsTotalAmount + entryTotalAmount;

    // ——— PDF ———
    const filename = `invoice-${year}-${String(month).padStart(2, "0")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    writeHeader(doc, "Monthly Invoice / Revenue Report", label);

    // Summary block
    doc.fontSize(12);
    doc.text(`Generated at: ${new Date().toLocaleString()}`);
    doc.moveDown(0.5);
    doc.text(`Period: ${dayjs.utc(start).format("YYYY-MM-DD")} to ${dayjs.utc(end).subtract(1, "day").format("YYYY-MM-DD")}`);
    doc.moveDown(1);

    doc.fontSize(12).text("Summary", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Events — Paid bookings: ${eventBookings.length}`);
    doc.text(`Events — Tickets: ${eventsTotalTickets}`);
    doc.text(`Events — Revenue: ${money(eventsTotalAmount)}`);
    doc.moveDown(0.4);
    doc.text(`Entry — Paid bookings: ${entryPaid.length}`);
    doc.text(`Entry — Tickets: ${entryTotalTickets} (Adult: ${entryAdultQty}, Child: ${entryChildQty})`);
    doc.text(`Entry — Revenue: ${money(entryTotalAmount)}`);
    doc.moveDown(0.6);
    doc.fontSize(12).text(`Grand Total: ${money(grandTotal)}`, { bold: true });
    doc.moveDown(1.2);

    // Events table
    doc.fontSize(12).text("Event Bookings (paid)", { underline: true });
    let x = 40, y = doc.y + 6;
    const evCols = [
      { label: "Event", width: 220 },
      { label: "Date", width: 120, align: "right" },
      { label: "Tickets", width: 80, align: "right" },
      { label: "Amount", width: 120, align: "right" }
    ];
    tableHeader(doc, x, y, evCols);
    y += 20;

    if (eventRows.length === 0) {
      doc.text("No paid event bookings in this month.", x, y);
      y += 20;
    } else {
      for (const r of eventRows) {
        tableRow(doc, x, y, [
          { text: r.title, width: 220 },
          { text: r.date ? dayjs(r.date).format("YYYY-MM-DD") : "-", width: 120, align: "right" },
          { text: r.tickets, width: 80, align: "right" },
          { text: money(r.amount), width: 120, align: "right" }
        ]);
        y += 16;
        if (y > 760) { doc.addPage(); y = 60; }
      }
      // footer row
      doc.moveTo(x, y + 4).lineTo(540, y + 4).strokeColor("#ddd").stroke();
      y += 10;
      tableRow(doc, x, y, [
        { text: "Events total", width: 220 },
        { text: "", width: 120 },
        { text: eventsTotalTickets, width: 80, align: "right" },
        { text: money(eventsTotalAmount), width: 120, align: "right" }
      ]);
      y += 24;
    }

    // Entry section
    if (y > 700) { doc.addPage(); y = 60; }
    doc.fontSize(12).text("Entry Tickets (paid)", 40, y, { underline: true });
    y = doc.y + 6;

    const enCols = [
      { label: "Metric", width: 220 },
      { label: "Value", width: 100, align: "right" },
      { label: "Amount", width: 120, align: "right" }
    ];
    tableHeader(doc, x, y, enCols); y += 20;

    tableRow(doc, x, y, [
      { text: "Paid entry bookings", width: 220 },
      { text: entryPaid.length, width: 100, align: "right" },
      { text: "-", width: 120, align: "right" }
    ]); y += 16;

    tableRow(doc, x, y, [
      { text: "Tickets (Adult)", width: 220 },
      { text: entryAdultQty, width: 100, align: "right" },
      { text: "-", width: 120, align: "right" }
    ]); y += 16;

    tableRow(doc, x, y, [
      { text: "Tickets (Child)", width: 220 },
      { text: entryChildQty, width: 100, align: "right" },
      { text: "-", width: 120, align: "right" }
    ]); y += 16;

    tableRow(doc, x, y, [
      { text: "Entry revenue", width: 220 },
      { text: entryTotalTickets, width: 100, align: "right" },
      { text: money(entryTotalAmount), width: 120, align: "right" }
    ]); y += 24;

    // Grand total footer
    if (y > 720) { doc.addPage(); y = 60; }
    doc.moveTo(40, y).lineTo(540, y).strokeColor("#bbb").stroke(); y += 10;
    doc.fontSize(12).text(`Grand Total: ${money(grandTotal)}`, 40, y);

    doc.end();
  } catch (e) {
    next(e);
  }
}

module.exports = { monthlyInvoicePdf };
