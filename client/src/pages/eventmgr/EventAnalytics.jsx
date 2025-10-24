// client/src/pages/eventmgr/EventAnalytics.jsx
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  Ticket,
  DollarSign,
  BarChart as BarIcon,
  LineChart as LineIcon,
  Trophy,
  Filter,
  ChevronDown,
  Eye,
  EyeOff,
  RefreshCw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LineChart as RLineChart,
  Line,
} from "recharts";
import { fetchEventAnalytics } from "../../api/analytics";

const COLORS = ["#10B981", "#06B6D4", "#F59E0B", "#8B5CF6", "#3B82F6", "#22C55E", "#EF4444", "#14B8A6"];
const fmt = (n) => (n ?? 0).toLocaleString();
const money = (n) =>
  (n ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const monthShort = (isoDate) =>
  new Date(isoDate + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", year: "2-digit" });

/** ===== Helpers ===== */
function trendFromLastTwo(series, key) {
  if (!Array.isArray(series) || series.length < 2) return { prev: null, pct: null, isUp: null };
  const last = series[series.length - 1]?.[key] ?? 0;
  const prev = series[series.length - 2]?.[key] ?? 0;
  if (!prev) return { prev: null, pct: null, isUp: null };
  const pct = ((last - prev) / prev) * 100;
  return { prev, pct, isUp: pct >= 0 };
}

/** ===== KPI Card (matches the screenshot vibe) ===== */
function KPICard({
  icon: Icon,
  title,
  value,
  hint,
  gradient, // tailwind gradient string
  series = [], // [{label/date, value}]
  dataKey = "value",
  trendPct, // number | null
  isPositive, // boolean | null
}) {
  const pctStr =
    typeof trendPct === "number" ? `${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}%` : null;

  return (
    <div
      className={`group relative rounded-2xl p-6 border border-black/5 bg-gradient-to-br ${gradient} shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
    >
      {/* soft bubbles like the screenshot */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-2 right-4 w-7 h-7 bg-white rounded-full blur-xl" />
        <div className="absolute bottom-6 left-6 w-12 h-12 bg-white/50 rounded-full blur-2xl" />
      </div>

      <div className="relative">
        {/* header row */}
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
          <BarChart3 className="w-10 h-10 text-white/15" />
        </div>

        {/* hint + trend */}
        <div className="flex items-end justify-between gap-3 mt-2">
          <div className="flex flex-col gap-2">
            {hint ? <div className="text-xs text-white/90 font-medium">{hint}</div> : <div />}
            {pctStr && (
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm ${
                  isPositive ? "bg-white/25 text-white" : "bg-black/20 text-white/95"
                }`}
              >
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {pctStr}
              </div>
            )}
          </div>

          {/* sparkline */}
          {series?.length > 1 ? (
            <div className="w-32 h-12 opacity-95">
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart data={series}>
                  <Line type="monotone" dataKey={dataKey} stroke="#fff" strokeWidth={3} dot={false} />
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

export default function EventAnalytics() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [seriesMode, setSeriesMode] = useState("area"); // "area" | "bars"
  const [loading, setLoading] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11);
    return d.toISOString().slice(0, 10);
  });
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));

  // Sections
  const [visibleSections, setVisibleSections] = useState({
    summary: true,
    trends: true,
    distribution: true,
    revenue: true,
  });
  const toggleSection = (k) => setVisibleSections((s) => ({ ...s, [k]: !s[k] }));

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetchEventAnalytics({ start, end });
      setData(res?.data || null);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load event analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = data?.totals || { events: 0, bookings: 0, tickets: 0, revenue: 0 };
  const timeseries = data?.timeseries || [];
  const byEvent = data?.byEvent || [];
  const topEvents = data?.topEvents || [];
  const revenueByMonth = data?.revenueByMonth || [];

  const ticketsAvg = useMemo(
    () => (timeseries.length ? Math.round(timeseries.reduce((s, d) => s + (d.tickets || 0), 0) / timeseries.length) : 0),
    [timeseries]
  );

  // Build small series for the sparklines
  const eventsSeries = timeseries.map((d) => ({ label: d.date, value: d.events ?? 0 }));
  const bookingsSeries = timeseries.map((d) => ({ label: d.date, value: d.bookings ?? 0 }));
  const ticketsSeries = timeseries.map((d) => ({ label: d.date, value: d.tickets ?? 0 }));
  const revenueSeries = timeseries.map((d) => ({ label: d.date, value: d.revenue ?? 0 }));

  // Trend % based on last 2 months
  const eventsTrend = trendFromLastTwo(timeseries, "events");
  const bookingsTrend = trendFromLastTwo(timeseries, "bookings");
  const ticketsTrend = trendFromLastTwo(timeseries, "tickets");
  const revenueTrend = trendFromLastTwo(timeseries, "revenue");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl overflow-hidden border border-emerald-200/50 bg-white shadow-2xl">
          <div className="relative p-8 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 overflow-hidden">
            {/* light blobs */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            </div>

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center border-2 border-white/30 shadow-2xl">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">Event Analytics</h1>
                  <p className="text-emerald-50 text-base">Bookings • Tickets • Revenue • Top events</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Filters toggle */}
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 text-white border border-white/30 backdrop-blur hover:bg-white/25 transition shadow-lg font-medium"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                </button>

                {/* Chart mode pills */}
                <div className="inline-flex rounded-xl overflow-hidden border border-white/30 shadow-lg bg-white/10 backdrop-blur-sm">
                  <button
                    onClick={() => setSeriesMode("area")}
                    className={`px-4 py-3 text-sm font-semibold transition-all ${
                      seriesMode === "area" ? "bg-white/30 text-white" : "text-white/80 hover:bg-white/15"
                    }`}
                    title="Area"
                  >
                    <LineIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSeriesMode("bars")}
                    className={`px-4 py-3 text-sm font-semibold transition-all ${
                      seriesMode === "bars" ? "bg-white/30 text-white" : "text-white/80 hover:bg-white/15"
                    }`}
                    title="Bars"
                  >
                    <BarIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Collapsible Filters */}
            {showFilters && (
              <div className="relative mt-6 pt-6 border-t border-white/20 animate-in slide-in-from-top-4 duration-300">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                  <div className="flex items-center gap-3 rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm text-white px-4 py-3 text-sm shadow-lg flex-1">
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold">Date Range:</span>
                    <input
                      type="date"
                      value={start}
                      max={end || undefined}
                      onChange={(e) => setStart(e.target.value)}
                      className="rounded-lg bg-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-white/60"
                    />
                    <span className="opacity-80">to</span>
                    <input
                      type="date"
                      value={end}
                      min={start || undefined}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setEnd(e.target.value)}
                      className="rounded-lg bg-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                    <button
                      onClick={load}
                      className="ml-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 font-medium transition"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* meta strip */}
          <div className="px-8 py-4 bg-gradient-to-r from-slate-50 to-emerald-50/40 border-t border-emerald-100/50">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span>
                <strong className="font-bold">Period:</strong> {start} to {end}
                {" • "}
                <strong className="font-bold">Generated:</strong>{" "}
                {new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Executive Summary (screenshot-like KPI cards) */}
        {visibleSections.summary ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">1</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Executive Summary</h2>
              </div>
              <button onClick={() => toggleSection("summary")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <EyeOff className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              <KPICard
                icon={Calendar}
                title="Events"
                value={fmt(totals.events)}
                hint="Scheduled in range"
                gradient="from-emerald-500 via-emerald-600 to-teal-600"
                series={eventsSeries}
                dataKey="value"
                trendPct={eventsTrend.pct}
                isPositive={eventsTrend.isUp}
              />
              <KPICard
                icon={BarChart3}
                title="Bookings"
                value={fmt(totals.bookings)}
                hint="Created in range"
                gradient="from-sky-500 via-sky-600 to-cyan-600"
                series={bookingsSeries}
                dataKey="value"
                trendPct={bookingsTrend.pct}
                isPositive={bookingsTrend.isUp}
              />
              <KPICard
                icon={Ticket}
                title="Tickets"
                value={fmt(totals.tickets)}
                hint={`Avg ${fmt(ticketsAvg)}/mo`}
                gradient="from-indigo-500 via-indigo-600 to-violet-600"
                series={ticketsSeries}
                dataKey="value"
                trendPct={ticketsTrend.pct}
                isPositive={ticketsTrend.isUp}
              />
              <KPICard
                icon={DollarSign}
                title="Revenue"
                value={money(totals.revenue)}
                hint="Paid only"
                gradient="from-rose-500 via-rose-600 to-pink-600"
                series={revenueSeries}
                dataKey="value"
                trendPct={revenueTrend.pct}
                isPositive={revenueTrend.isUp}
              />
            </div>
          </section>
        ) : (
          <button
            onClick={() => toggleSection("summary")}
            className="w-full p-5 rounded-2xl border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-emerald-700 font-medium group"
          >
            <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Show Executive Summary</span>
          </button>
        )}

        {/* Section 2: Monthly Trends */}
        {visibleSections.trends ? (
          <section className="bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                    {seriesMode === "area" ? <LineIcon className="w-6 h-6 text-white" /> : <BarIcon className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Monthly Trends</h3>
                    <p className="text-sm text-gray-600 mt-0.5">Events • Bookings • Tickets • Revenue</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  {seriesMode === "area" ? (
                    <AreaChart data={timeseries}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="g4" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tickFormatter={monthShort} tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }} />
                      <YAxis tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", padding: "12px 16px" }}
                        formatter={(val, name) => (name === "revenue" ? money(val) : fmt(val))}
                        labelFormatter={(d) =>
                          new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { month: "long", year: "numeric" })
                        }
                      />
                      <Legend wrapperStyle={{ paddingTop: "16px" }} />
                      <Area type="monotone" dataKey="events" name="Events" stroke="#10B981" fill="url(#g1)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="bookings" name="Bookings" stroke="#06B6D4" fill="url(#g2)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="tickets" name="Tickets" stroke="#F59E0B" fill="url(#g3)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#8B5CF6" fill="url(#g4)" strokeWidth={2.5} />
                    </AreaChart>
                  ) : (
                    <BarChart data={timeseries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" tickFormatter={monthShort} tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }} />
                      <YAxis tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", padding: "12px 16px" }}
                        formatter={(val, name) => (name === "Revenue" ? money(val) : fmt(val))}
                        labelFormatter={(d) =>
                          new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { month: "long", year: "numeric" })
                        }
                      />
                      <Legend wrapperStyle={{ paddingTop: "16px" }} />
                      <Bar dataKey="events" name="Events" fill="#10B981" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="bookings" name="Bookings" fill="#06B6D4" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="tickets" name="Tickets" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="revenue" name="Revenue" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        ) : (
          <button
            onClick={() => toggleSection("trends")}
            className="w-full p-5 rounded-2xl border-2 border-dashed border-gray-300 hover:border-sky-500 hover:bg-sky-50/50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-sky-700 font-medium group"
          >
            <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Show Monthly Trends</span>
          </button>
        )}

        {/* Section 3: Distribution */}
        {visibleSections.distribution ? (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Events by Tickets */}
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xl p-6 hover:shadow-2xl transition-shadow duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Top Events (by tickets)</h2>
                </div>
                <button onClick={() => toggleSection("distribution")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <EyeOff className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...topEvents].sort((a, b) => b.tickets - a.tickets)}
                    layout="vertical"
                    margin={{ left: 140, right: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis dataKey="event" type="category" width={220} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} formatter={(v) => fmt(v)} />
                    <Bar dataKey="tickets" name="Tickets" radius={[6, 6, 0, 0]}>
                      {topEvents.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bookings/Tickets/Revenue by Event */}
            {/* Bookings/Tickets/Revenue by Event */}
<div className="bg-white rounded-3xl border border-gray-200/80 shadow-xl p-6 hover:shadow-2xl transition-shadow duration-300">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold text-gray-900">Bookings / Tickets / Revenue by Event</h2>
  </div>

  <div className="h-[360px]">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={byEvent.slice(0, 12)}
        margin={{ top: 8, right: 28, left: 8, bottom: 64 }}
        barCategoryGap={14}
        barGap={6}
        maxBarSize={28}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {/* X labels: rotate + truncate to avoid overlap */}
        <XAxis
          dataKey="event"
          interval={0}
          height={64}
          tickMargin={8}
          angle={-30}
          textAnchor="end"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickFormatter={(v) => (v?.length > 18 ? v.slice(0, 18) + "…" : v)}
        />
        {/* Dual Y-axes */}
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
          tickFormatter={(v) => (v ?? 0).toLocaleString()}
        />

        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
          formatter={(val, name) =>
            name === "Revenue" ? [(val ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD" }), name]
                               : [(val ?? 0).toLocaleString(), name]
          }
          labelFormatter={(label) => label}
        />
        <Legend />

        {/* Grouped bars: counts on left axis, revenue on right axis */}
        <Bar yAxisId="left" dataKey="bookings" name="Bookings" fill="#06B6D4" radius={[6, 6, 0, 0]} />
        <Bar yAxisId="left" dataKey="tickets"  name="Tickets"  fill="#F59E0B" radius={[6, 6, 0, 0]} />
        <Bar yAxisId="right" dataKey="revenue" name="Revenue"  fill="#8B5CF6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
</div>

          </section>
        ) : (
          <button
            onClick={() => toggleSection("distribution")}
            className="w-full p-5 rounded-2xl border-2 border-dashed border-gray-300 hover:border-violet-500 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-violet-700 font-medium group"
          >
            <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Show Distribution</span>
          </button>
        )}

        {/* Section 4: Revenue by Month */}
        {visibleSections.revenue ? (
          <section className="bg-white rounded-3xl border border-gray-200/80 shadow-xl p-6 hover:shadow-2xl transition-shadow duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">4</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Revenue by Month</h2>
              </div>
              <button onClick={() => toggleSection("revenue")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <EyeOff className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueByMonth}>
                  <defs>
                    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={monthShort} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    labelFormatter={(d) =>
                      new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { month: "long", year: "numeric" })
                    }
                    formatter={(v) => money(v)}
                  />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#8B5CF6" fill="url(#gr)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        ) : (
          <button
            onClick={() => toggleSection("revenue")}
            className="w-full p-5 rounded-2xl border-2 border-dashed border-gray-300 hover:border-amber-500 hover:bg-amber-50/50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-amber-700 font-medium group"
          >
            <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Show Revenue by Month</span>
          </button>
        )}

        {/* Loading / Error */}
        {loading && (
          <div className="flex items-center justify-center gap-3 text-emerald-700 text-base font-medium py-8">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading event analytics…
          </div>
        )}
        {err && (
          <div className="text-center">
            <div className="inline-block px-6 py-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-medium shadow-sm">
              {err}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
