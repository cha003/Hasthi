// client/src/pages/entry/EntryBookings.jsx
import { useEffect, useMemo, useState } from "react";
import { listEntryBookingsManage } from "../../api/entry";
import {
  AlertCircle,
  Search,
  Calendar as CalendarIcon,
  FilterX,
  CreditCard,
  CheckCircle2,
  XCircle,
  Users,
  Ticket,
  FileText,
  Activity,
  DollarSign,
  TrendingUp,
  CalendarRange,
  Download,
  RefreshCw,
  Hash,
  ShoppingBag,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart as RLineChart,
  Line,
} from "recharts";

/* ---------------------- Helpers ---------------------- */
const pad = (n) => String(n).padStart(2, "0");
const toLocalISO = (d) => {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}`;
};
const toMonthKey = (d) => {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "Unknown";
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
};
const monthRange = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { from: toLocalISO(start), to: toLocalISO(end) };
};
const nf = (n) => Intl.NumberFormat().format(Number(n || 0));

/* ---------------------- Small UI parts ---------------------- */
const LoadingBlock = ({ label = "Loading bookings…" }) => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin"></div>
      </div>
      <span className="text-gray-600 font-medium">{label}</span>
    </div>
  </div>
);

const ErrorBlock = ({ message }) => (
  <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4 flex items-start space-x-3">
    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
    <div>
      <h3 className="font-medium text-red-800">Error Loading Data</h3>
      <p className="text-red-700 mt-1">{message}</p>
    </div>
  </div>
);

const StatusPill = ({ children, tone = "gray", className = "" }) => {
  const tones = {
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    rose: "bg-rose-100 text-rose-800 border-rose-200",
    violet: "bg-violet-100 text-violet-800 border-violet-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

/* ---------------------- Gradient KPI card (screenshot style) ---------------------- */
function KPICardGradient({
  icon: Icon,
  title,
  value,
  hint,
  gradient, // e.g. "from-emerald-500 via-emerald-600 to-teal-600"
  series = [], // [{label, value}]
  dataKey = "value",
  trendPct, // number|null
  isPositive, // boolean|null
}) {
  const pctStr =
    typeof trendPct === "number" ? `${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}%` : null;

  return (
    <div className={`group relative rounded-2xl p-6 border border-black/5 bg-gradient-to-br ${gradient} shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}>
      {/* soft bubbles like the sample */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-2 right-4 w-7 h-7 bg-white rounded-full blur-xl" />
        <div className="absolute bottom-6 left-6 w-12 h-12 bg-white/50 rounded-full blur-2xl" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center ring-2 ring-white/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white/95 text-[11px] font-extrabold tracking-widest uppercase mb-1">
                {title}
              </div>
              <div className="text-3xl leading-none font-extrabold text-white">{value}</div>
            </div>
          </div>
          {/* subtle ghost icon */}
          <div className="w-10 h-10 text-white/15">
            {/* placeholder for brand/shape if needed */}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 mt-2">
          <div className="flex flex-col gap-2">
            {hint ? <div className="text-xs text-white/90 font-medium">{hint}</div> : <div />}
            {pctStr && (
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm ${
                  isPositive ? "bg-white/25 text-white" : "bg-black/20 text-white/95"
                }`}
              >
                <TrendingUp className={`w-3.5 h-3.5 ${isPositive ? "" : "rotate-180"}`} />
                {pctStr}
              </div>
            )}
          </div>

          {/* Sparkline */}
          {series?.length > 1 ? (
            <div className="w-32 h-12 opacity-95">
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart data={series}>
                  <Line type="monotone" dataKey={dataKey} stroke="#ffffff" strokeWidth={3} dot={false} />
                </RLineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="w-32 h-12" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Main Component ---------------------- */
export default function EntryBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // live filters
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [pstat, setPstat] = useState("");

  // month selection
  const [month, setMonth] = useState(""); // "YYYY-MM"

  useEffect(() => {
    if (!month) return;
    const { from: f, to: t } = monthRange(month);
    setFrom(f);
    setTo(t);
  }, [month]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await listEntryBookingsManage({
        q: q || undefined,
        from: from || undefined,
        to: to || undefined,
        status: status || undefined,
        paymentStatus: pstat || undefined,
      });
      setRows(Array.isArray(data) ? data : data?.rows || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, from, to, status, pstat]);

  const clearFilters = () => {
    setQ("");
    setFrom("");
    setTo("");
    setStatus("");
    setPstat("");
    setMonth("");
  };

  /* --------- Totals --------- */
  const totalLKR = useMemo(
    () => rows.reduce((s, r) => s + Number(r.total || 0), 0),
    [rows]
  );

  const paidLKR = useMemo(
    () =>
      rows.reduce(
        (s, r) => s + (r.paymentStatus === "paid" ? Number(r.total || 0) : 0),
        0
      ),
    [rows]
  );

  const pendingLKR = useMemo(
    () =>
      rows.reduce(
        (s, r) => s + (r.paymentStatus === "pending" ? Number(r.total || 0) : 0),
        0
      ),
    [rows]
  );

  const totalTickets = useMemo(
    () => rows.reduce((s, r) => s + Number(r.tickets || 0), 0),
    [rows]
  );

  /* --------- Monthly aggregates --------- */
  const monthlySummaryDesc = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const key = toMonthKey(r.day || r.createdAt);
      if (!map[key]) {
        map[key] = {
          month: key,
          orders: 0,
          tickets: 0,
          income: 0,
          paid: 0,
          pending: 0,
        };
      }
      map[key].orders += 1;
      map[key].tickets += Number(r.tickets || 0);
      const amount = Number(r.total || 0);
      map[key].income += amount;
      if (r.paymentStatus === "paid") map[key].paid += amount;
      else map[key].pending += amount;
    }
    // DESC for tables
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [rows]);

  // ASC for sparklines (chronological)
  const monthlyAsc = useMemo(
    () => [...monthlySummaryDesc].sort((a, b) => a.month.localeCompare(b.month)),
    [monthlySummaryDesc]
  );

  const monthlyTotals = useMemo(() => {
    return monthlySummaryDesc.reduce(
      (acc, m) => {
        acc.orders += m.orders;
        acc.tickets += m.tickets;
        acc.income += m.income;
        acc.paid += m.paid;
        acc.pending += m.pending;
        return acc;
      },
      { orders: 0, tickets: 0, income: 0, paid: 0, pending: 0 }
    );
  }, [monthlySummaryDesc]);

  /* --------- KPI sparklines & trends (last two months) --------- */
  const ordersSeries = monthlyAsc.map((m) => ({ label: m.month, value: m.orders }));
  const ticketsSeries = monthlyAsc.map((m) => ({ label: m.month, value: m.tickets }));
  const incomeSeries = monthlyAsc.map((m) => ({ label: m.month, value: m.income }));
  const paidSeries = monthlyAsc.map((m) => ({ label: m.month, value: m.paid }));

  const trendFromSeries = (arr) => {
    if (!arr || arr.length < 2) return { pct: null, isPositive: null };
    const last = arr[arr.length - 1].value ?? 0;
    const prev = arr[arr.length - 2].value ?? 0;
    if (!prev) return { pct: null, isPositive: null };
    const pct = ((last - prev) / prev) * 100;
    return { pct, isPositive: pct >= 0 };
  };

  const ordersTrend = trendFromSeries(ordersSeries);
  const ticketsTrend = trendFromSeries(ticketsSeries);
  const incomeTrend = trendFromSeries(incomeSeries);
  const paidTrend = trendFromSeries(paidSeries);

  /* ---------------------- Export Selected Month PDF ---------------------- */
  const exportSelectedMonthPDF = async () => {
    if (!month) {
      alert("Please select a month first.");
      return;
    }
    const ym = month;
    const rowsForMonth = rows.filter((r) => {
      const d = new Date(r.day || r.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      return key === ym;
    });

    if (!rowsForMonth.length) {
      alert("No data for the selected month.");
      return;
    }

    const summary = rowsForMonth.reduce(
      (acc, r) => {
        acc.orders += 1;
        acc.tickets += Number(r.tickets || 0);
        const amt = Number(r.total || 0);
        acc.income += amt;
        if (r.paymentStatus === "paid") acc.paid += amt;
        else acc.pending += amt;
        return acc;
      },
      { orders: 0, tickets: 0, income: 0, paid: 0, pending: 0 }
    );

    const [{ jsPDF }, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableMod.default || autoTableMod;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 36;
    const top = 40;
    const brand = { r: 16, g: 185, b: 129 };
    const pageWidth = doc.internal.pageSize.getWidth();
    const usable = pageWidth - left * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(34, 34, 34);
    doc.text(`Hasthi.lk — Entry Bookings Report (${ym})`, left, top);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const filterBits = [];
    if (from) filterBits.push(`From: ${from}`);
    if (to) filterBits.push(`To: ${to}`);
    if (status) filterBits.push(`Status: ${status}`);
    if (pstat) filterBits.push(`Payment: ${pstat}`);
    if (q) filterBits.push(`Search: "${q}"`);
    const filterLine = filterBits.length
      ? `Filters — ${filterBits.join(" • ")}`
      : "Filters — none";
    doc.text(filterLine, left, top + 18);
    doc.text(`Generated: ${new Date().toLocaleString()}`, left, top + 32);

    autoTable(doc, {
      startY: top + 52,
      head: [
        ["MONTH", "Orders", "Tickets", "Income (LKR)", "Paid (LKR)", "Pending (LKR)"],
      ],
      body: [
        [
          ym,
          nf(summary.orders),
          nf(summary.tickets),
          nf(summary.income),
          nf(summary.paid),
          nf(summary.pending),
        ],
      ],
      styles: {
        fontSize: 10,
        cellPadding: 6,
        halign: "right",
        overflow: "linebreak",
        cellWidth: "wrap",
      },
      columnStyles: { 0: { halign: "left" } },
      headStyles: { fillColor: [brand.r, brand.g, brand.b], textColor: 255 },
      margin: { left, right: left },
      tableWidth: usable,
    });

    const dayRows = rowsForMonth
      .map((r) => {
        const d = new Date(r.day || r.createdAt);
        return [
          toLocalISO(d),
          r.user?.name || "-",
          r.tickets ?? 0,
          nf(r.total || 0),
          r.paymentStatus || "-",
          r.status || "-",
        ];
      })
      .sort((a, b) => new Date(a[0]) - new Date(b[0]));

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 14,
      head: [["Day", "User", "Tickets", "Total (LKR)", "Payment", "Status"]],
      body: dayRows,
      styles: {
        fontSize: 9,
        cellPadding: 5,
        halign: "right",
        overflow: "linebreak",
        cellWidth: "wrap",
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 70 },
        1: { halign: "left", cellWidth: 150 },
        2: { cellWidth: 55 },
        3: { cellWidth: 75 },
        4: { cellWidth: 70 },
        5: { cellWidth: 65 },
      },
      headStyles: { fillColor: [brand.r, brand.g, brand.b], textColor: 255 },
      margin: { left, right: left },
      tableWidth: usable,
      pageBreak: "auto",
    });

    doc.save(`entry-bookings-${ym}.pdf`);
  };

  /* ---------------------- UI ---------------------- */
  if (loading) return <LoadingBlock />;
  if (err) return <ErrorBlock message={err} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
           

            <div className="flex items-center space-x-3">
              <button
                onClick={load}
                className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={exportSelectedMonthPDF}
                className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Month PDF
              </button>
            </div>
          </div>
        </div>

        {/* KPI gradient cards (screenshot style) */}
        <div className="bg-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICardGradient
              icon={ShoppingBag}
              title="Total Orders"
              value={nf(rows.length)}
              hint="All orders in current filters"
              gradient="from-emerald-500 via-emerald-600 to-teal-600"
              series={ordersSeries}
              trendPct={ordersTrend.pct}
              isPositive={ordersTrend.isPositive}
            />
            <KPICardGradient
              icon={Ticket}
              title="Tickets Booked"
              value={nf(totalTickets)}
              hint="Sum of tickets"
              gradient="from-sky-500 via-sky-600 to-cyan-600"
              series={ticketsSeries}
              trendPct={ticketsTrend.pct}
              isPositive={ticketsTrend.isPositive}
            />
            <KPICardGradient
              icon={DollarSign}
              title="Revenue (LKR)"
              value={nf(totalLKR)}
              hint="Paid + pending"
              gradient="from-indigo-500 via-indigo-600 to-violet-600"
              series={incomeSeries}
              trendPct={incomeTrend.pct}
              isPositive={incomeTrend.isPositive}
            />
            <KPICardGradient
              icon={Activity}
              title="Paid / Pending"
              value={`${nf(paidLKR)} / ${nf(pendingLKR)}`}
              hint="Cash flow this period"
              gradient="from-rose-500 via-rose-600 to-pink-600"
              series={paidSeries}
              trendPct={paidTrend.pct}
              isPositive={paidTrend.isPositive}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-end">
            {/* Search */}
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  placeholder="Name / email / phone"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Booking Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                <option value="">Any</option>
                <option value="booked">booked</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select
                value={pstat}
                onChange={(e) => setPstat(e.target.value)}
                className="w-full px-3 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              >
                <option value="">Any</option>
                <option value="paid">paid</option>
                <option value="pending">pending</option>
              </select>
            </div>

            {/* Month (auto-apply) */}
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="min-w-0 w-full px-3 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Clear */}
            <div className="xl:col-span-1">
              <button
                onClick={clearFilters}
                className="w-full h-[44px] md:h-[46px] inline-flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                title="Clear all filters"
              >
                <FilterX className="w-4 h-4 mr-2" />
                Clear
              </button>
            </div>
          </div>

          {/* Live summary */}
          <div className="mt-3 text-sm text-gray-600">
            Showing <b>{rows.length}</b> booking{rows.length === 1 ? "" : "s"}
            {from ? <> from <b>{from}</b></> : null}
            {to ? <> to <b>{to}</b></> : null}
            {status ? <> • status: <b>{status}</b></> : null}
            {pstat ? <> • payment: <b>{pstat}</b></> : null}
            {q ? <> • matching <b>&quot;{q}&quot;</b></> : null}
          </div>
        </div>

        {/* Monthly Report */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Monthly Report</h2>
              <p className="text-sm text-gray-600">Aggregated by month (respects current filters).</p>
            </div>
            <button
              onClick={exportSelectedMonthPDF}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-sm"
              title="Download selected month PDF"
            >
              <FileText className="w-4 h-4 mr-2" />
              Download Month PDF
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900">Month</th>
                  <th className="text-right px-6 py-4 font-semibold text-gray-900">Orders</th>
                  <th className="text-right px-6 py-4 font-semibold text-gray-900">Tickets</th>
                  <th className="text-right px-6 py-4 font-semibold text-gray-900">Income (LKR)</th>
                  <th className="text-right px-6 py-4 font-semibold text-gray-900">Paid (LKR)</th>
                  <th className="text-right px-6 py-4 font-semibold text-gray-900">Pending (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlySummaryDesc.map((m) => (
                  <tr key={m.month} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-900">{m.month}</td>
                    <td className="px-6 py-4 text-right text-gray-900">{nf(m.orders)}</td>
                    <td className="px-6 py-4 text-right text-gray-900">{nf(m.tickets)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">{nf(m.income)}</td>
                    <td className="px-6 py-4 text-right text-emerald-700">{nf(m.paid)}</td>
                    <td className="px-6 py-4 text-right text-amber-700">{nf(m.pending)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-700">Total</td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-700">
                    {nf(monthlyTotals.orders)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-700">
                    {nf(monthlyTotals.tickets)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">
                    {nf(monthlyTotals.income)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-700">
                    {nf(monthlyTotals.paid)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-amber-700">
                    {nf(monthlyTotals.pending)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Bookings ({rows.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900">Day</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900">User</th>
                  <th className="text-right px-6 py-4 font-semibold text-gray-900">Tickets</th>
                  <th className="hidden md:table-cell text-left px-6 py-4 font-semibold text-gray-900">
                    Items
                  </th>
                  <th className="text-right px-6 py-4 font-semibold text-gray-900">Total (LKR)</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900">Payment</th>
                  <th className="text-left px-6 py-4 font-semibold text-gray-900">Status</th>
                  <th className="hidden lg:table-cell text-left px-6 py-4 font-semibold text-gray-900">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 align-top">
                {rows.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {new Date(r.day).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[160px] md:max-w-none">
                          {r.user?.name || "-"}
                        </span>
                      </div>
                      <div className="text-xs md:text-sm text-gray-500 truncate max-w-[220px]">
                        {r.user?.email || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">{r.tickets}</td>
                    <td className="hidden md:table-cell px-6 py-4 text-gray-900">
                      {Array.isArray(r.items) && r.items.length ? (
                        r.items.map((it, idx) => (
                          <span key={idx} className="inline-block mr-2 mb-1">
                            <StatusPill tone="violet">{`${it.type}×${it.qty}`}</StatusPill>
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {nf(r.total || 0)}
                    </td>
                    <td className="px-6 py-4">
                      {r.paymentStatus === "paid" ? (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <StatusPill tone="emerald">paid</StatusPill>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                          <StatusPill tone="amber">pending</StatusPill>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {r.status === "booked" ? (
                        <StatusPill tone="blue">booked</StatusPill>
                      ) : r.status === "cancelled" ? (
                        <span className="inline-flex items-center gap-1">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <StatusPill tone="rose">cancelled</StatusPill>
                        </span>
                      ) : (
                        <StatusPill>unknown</StatusPill>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-gray-700">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>

              {rows.length ? (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-right font-semibold text-gray-700">
                      Total
                    </td>
                    <td className="hidden md:table-cell" />
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      LKR {nf(totalLKR)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              ) : null}
            </table>

            {!rows.length && (
              <div className="text-center py-12">
                <CalendarRange className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-600">
                  Try adjusting search or filters, or pick a different month.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
