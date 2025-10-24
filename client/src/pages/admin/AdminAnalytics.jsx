// client/src/pages/admin/AdminAnalytics.jsx
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Users,
  Heart,
  UserX,
  MapPin,
  Activity,
  LineChart as LineIcon,
  BarChart as BarIcon,
  PieChart as PieIcon,
  RefreshCw,
  FileText,
  Calendar,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  ChevronDown,
} from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
  Line,
  LineChart as RLineChart,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

import { fetchAnalytics } from "../../api/analytics";
import { summarizeAnalytics } from "../../api/ai";

// Tailwind-friendly color palette (good contrast)
const COLORS = [
  "#10B981",
  "#06B6D4",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#3B82F6",
  "#14B8A6",
  "#22C55E",
];

const fmt = (n) => (n ?? 0).toLocaleString();
const monthShort = (isoDate) =>
  new Date(isoDate + "T00:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });

const ElephantIcon = ({ className = "w-8 h-8", color = "currentColor" }) => (
  <svg viewBox="0 0 100 100" className={className} fill={color} aria-hidden="true">
    <path d="M20 60c0-15 10-25 25-25s25 10 25 25c0 8-3 15-8 20h-34c-5-5-8-12-8-20z" />
    <circle cx="35" cy="55" r="2" fill="white" />
    <path d="M15 65c-5 0-8 3-8 8s3 8 8 8c2 0 4-1 5-2" />
    <path d="M45 40c-8-5-15-3-20 2" />
    <circle cx="25" cy="75" r="8" opacity="0.1" />
    <circle cx="55" cy="75" r="8" opacity="0.1" />
  </svg>
);

// KPI card with sparkline and trend badge (from "above" CSS)
function KPICard({
  icon: Icon,
  title,
  value,
  hint,
  gradient,
  series = [],
  dataKey = "value",
  showSparkline = true,
  previousValue,
}) {
  const hasPrev = typeof previousValue === "number" && previousValue !== 0;
  const trendPct = hasPrev ? (((value ?? 0) - previousValue) / previousValue) * 100 : null;
  const trendStr =
    trendPct !== null ? (trendPct >= 0 ? `+${trendPct.toFixed(1)}%` : `${trendPct.toFixed(1)}%`) : null;
  const isPositive = trendPct !== null && trendPct >= 0;

  return (
    <div className={`group relative rounded-2xl p-6 border border-white/20 bg-gradient-to-br ${gradient} shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}>
      {/* Animated background bloom */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl transform translate-x-16 -translate-y-16 group-hover:scale-150 transition-transform duration-700" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center ring-2 ring-white/30 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-white/95 text-xs font-bold uppercase tracking-wider mb-1">{title}</div>
              <div className="text-3xl font-extrabold text-white">{fmt(value)}</div>
            </div>
          </div>
          <ElephantIcon className="w-10 h-10 text-white/10 group-hover:text-white/20 transition-colors duration-300" />
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="text-xs text-white/90 font-medium">{hint}</div>
            {trendStr && (
              <div
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
                  isPositive ? "bg-white/20 text-white" : "bg-black/20 text-white/90"
                }`}
              >
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {trendStr}
              </div>
            )}
          </div>
          {showSparkline && series.length > 1 ? (
            <div className="w-32 h-12 opacity-90 group-hover:opacity-100 transition-opacity">
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

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [months, setMonths] = useState(12);
  const [seriesMode, setSeriesMode] = useState("area"); // "area" | "bars"
  const [loading, setLoading] = useState(false);

  // AI summary
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState("");

  // Date range (optional)
  const todayIso = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filters collapse
  const [showFilters, setShowFilters] = useState(false);

  const [visibleSections, setVisibleSections] = useState({
    summary: true,
    trends: true,
    composition: true,
    breakdown: true,
  });

  const toggleSection = (key) =>
    setVisibleSections((s) => ({
      ...s,
      [key]: !s[key],
    }));

  const useDateRange = Boolean(startDate && endDate);

  const load = async () => {
    setLoading(true);
    try {
      const params = useDateRange ? { start: startDate, end: endDate } : { months };
      const res = await fetchAnalytics(params);
      setData(res?.data || null);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, startDate, endDate]);

  // Data slices
  const totals = data?.totals || { users: 0, elephants: 0, adoptions: 0, caretakers: 0 };
  const timeseries = data?.timeseries || [];
  const byRole = data?.byRole || [];
  const adoptionsByStatus = data?.adoptionsByStatus || [];
  const topLocations = data?.topLocations || [];

  // Executive Summary metrics
  const totalUsers = totals.users || 0;
  const totalRequests = adoptionsByStatus.reduce((s, x) => s + (x.count || 0), 0);
  const rejectedCount = adoptionsByStatus.find((x) => x.status?.toLowerCase() === "rejected")?.count || 0;
  const entryVisits = timeseries.reduce((s, d) => s + (d.visits || 0), 0);

  const usersSeries = timeseries.map((d) => ({ label: d.date, value: d.users }));
  const visitsSeries = timeseries.map((d) => ({ label: d.date, value: d.visits }));

  const visitsAvg = useMemo(
    () =>
      timeseries.length
        ? Math.round(timeseries.reduce((s, d) => s + (d.visits || 0), 0) / timeseries.length)
        : 0,
    [timeseries]
  );

  // Approval donut
  const approved = adoptionsByStatus.find((x) => x.status?.toLowerCase() === "approved")?.count || 0;
  const approvedPct = totalRequests ? Math.round((approved / totalRequests) * 100) : 0;
  const donutData = [
    { name: "Approved", value: approvedPct },
    { name: "Others", value: 100 - approvedPct },
  ];

  // Build AI summary payload
  const buildReportPayload = () => ({
    generatedAt: new Date().toISOString(),
    months: useDateRange ? undefined : months,
    dateRange: useDateRange ? { start: startDate, end: endDate } : null,
    totals,
    timeseries,
    byRole,
    adoptionsByStatus,
    topLocations,
    meta: {
      app: "Hasthi.lk",
      section: "Admin Analytics",
    },
  });

  const handleSummarize = async () => {
    try {
      setSummaryLoading(true);
      setSummaryText("");
      const report = buildReportPayload();
      const { data } = await summarizeAnalytics(report);
      if (data?.ok && data?.summary) {
        setSummaryText(data.summary);
      } else {
        setSummaryText("AI summary unavailable. Please try again.");
      }
    } catch (e) {
      setSummaryText("AI summary unavailable. Please try again.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const resetDates = () => {
    setStartDate("");
    setEndDate("");
  };

  const exportData = () => {
    const json = JSON.stringify(buildReportPayload(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl overflow-hidden border border-emerald-200/50 bg-white shadow-2xl">
          <div className="relative p-8 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" />
              <div
                className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"
                style={{ animationDelay: "1s" }}
              />
            </div>

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center border-2 border-white/30 shadow-2xl">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-tight">
                    Hasthi.lk Analytics
                  </h1>
                  <p className="text-emerald-50 text-base">
                    Comprehensive insights into platform performance & user engagement
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 text-white border border-white/30 backdrop-blur hover:bg-white/25 transition shadow-lg font-medium"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                </button>


                <button
                  onClick={handleSummarize}
                  disabled={summaryLoading}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/20 text-white border border-white/40 backdrop-blur hover:bg-white/30 transition shadow-lg font-medium disabled:opacity-50"
                >
                  {summaryLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI Summary
                    </>
                  )}
                </button>

              </div>
            </div>

            {/* Collapsible Filters */}
            {showFilters && (
              <div className="relative mt-6 pt-6 border-t border-white/20 animate-in slide-in-from-top-4 duration-300">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                  {/* Date range */}
                  <div className="flex items-center gap-3 rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm text-white px-4 py-3 text-sm shadow-lg flex-1">
                    <Calendar className="w-5 h-5" />
                    <span className="font-semibold">Date Range:</span>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || todayIso}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-lg bg-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-white/60"
                    />
                    <span className="opacity-80">to</span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      max={todayIso}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-lg bg-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                    <button
                      onClick={resetDates}
                      className="ml-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 font-medium transition"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Months selector */}
                  <div className="flex items-center gap-3 rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm text-white px-4 py-3 text-sm shadow-lg">
                    <span className="font-semibold">Last</span>
                    <select
                      value={months}
                      onChange={(e) => setMonths(parseInt(e.target.value, 10))}
                      disabled={useDateRange}
                      className="rounded-lg bg-white/20 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/50 font-semibold disabled:opacity-50"
                    >
                      {[3, 6, 12, 18, 24, 36].map((m) => (
                        <option key={m} value={m} className="text-gray-900 bg-white">
                          {m} months
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Chart mode */}
                  <div className="inline-flex rounded-xl overflow-hidden border border-white/30 shadow-lg bg-white/10 backdrop-blur-sm">
                    <button
                      onClick={() => setSeriesMode("area")}
                      className={`px-4 py-3 text-sm font-semibold transition-all ${
                        seriesMode === "area" ? "bg-white/30 text-white" : "text-white/80 hover:bg-white/15"
                      }`}
                    >
                      <LineIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSeriesMode("bars")}
                      className={`px-4 py-3 text-sm font-semibold transition-all ${
                        seriesMode === "bars" ? "bg-white/30 text-white" : "text-white/80 hover:bg-white/15"
                      }`}
                    >
                      <BarIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-8 py-4 bg-gradient-to-r from-slate-50 to-emerald-50/40 border-t border-emerald-100/50">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>
                <strong className="font-bold">Period:</strong>{" "}
                {useDateRange ? `${startDate || "—"} to ${endDate || "—"}` : `Last ${months} months`}
                {" • "}
                <strong className="font-bold">Generated:</strong>{" "}
                {new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        {summaryText && (
          <div className="bg-gradient-to-br from-white to-emerald-50/50 rounded-3xl border border-emerald-200/50 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="px-6 py-5 border-b border-emerald-100 flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-white">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">AI-Generated Summary</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{summaryText}</p>
            </div>
          </div>
        )}

        {/* Section 1: Executive Summary */}
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
                icon={Users}
                title="Total Users"
                value={totalUsers}
                hint="All registered accounts"
                gradient="from-emerald-500 via-emerald-600 to-teal-600"
                series={usersSeries}
                showSparkline={true}
                previousValue={Math.max(totalUsers - Math.round(totalUsers * 0.08), 1)}
              />
              <KPICard
                icon={Heart}
                title="All Requests"
                value={totalRequests}
                hint="Adoption applications"
                gradient="from-sky-500 via-sky-600 to-cyan-600"
                series={[]}
                showSparkline={false}
                previousValue={Math.max(totalRequests - Math.round(totalRequests * 0.05), 1)}
              />
              <KPICard
                icon={MapPin}
                title="Entry Visits"
                value={entryVisits}
                hint={`Period total • Avg ${fmt(visitsAvg)}/mo`}
                gradient="from-indigo-500 via-indigo-600 to-violet-600"
                series={visitsSeries}
                showSparkline={true}
                previousValue={Math.max(entryVisits - Math.round(entryVisits * 0.1), 1)}
              />
              <KPICard
                icon={UserX}
                title="Rejected"
                value={rejectedCount}
                hint="Adoption denials"
                gradient="from-rose-500 via-rose-600 to-pink-600"
                series={[]}
                showSparkline={false}
                previousValue={Math.max(rejectedCount - 2, 1)}
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

        {/* Section 2: Activity Trends */}
        {visibleSections.trends ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">2</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Activity Trends</h2>
              </div>
              <button onClick={() => toggleSection("trends")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <EyeOff className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                      {seriesMode === "area" ? (
                        <LineIcon className="w-6 h-6 text-white" />
                      ) : (
                        <BarIcon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Monthly Activity Overview</h3>
                      <p className="text-sm text-gray-600 mt-0.5">User growth • Adoptions • Site traffic</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-3">
                    {[
                      { color: "emerald", label: "Users" },
                      { color: "cyan", label: "Adoptions" },
                      { color: "amber", label: "Visits" },
                    ].map(({ color, label }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-${color}-50 border border-${color}-200 shadow-sm`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-${color}-500`} />
                        <span className="text-xs font-semibold text-gray-700">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {seriesMode === "area" ? (
                      <AreaChart data={timeseries}>
                        <defs>
                          <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="gAdopt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="gVisits" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={monthShort}
                          tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }}
                          stroke="#cbd5e1"
                          tickLine={false}
                        />
                        <YAxis tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }} stroke="#cbd5e1" tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                            padding: "12px 16px",
                          }}
                          labelFormatter={(d) =>
                            new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
                              month: "long",
                              year: "numeric",
                            })
                          }
                        />
                        <Legend wrapperStyle={{ paddingTop: "24px" }} iconType="circle" />
                        <Area type="monotone" dataKey="users" name="New Users" stroke="#10B981" strokeWidth={3} fill="url(#gUsers)" />
                        <Area type="monotone" dataKey="adoptions" name="Approved Adoptions" stroke="#06B6D4" strokeWidth={3} fill="url(#gAdopt)" />
                        <Area type="monotone" dataKey="visits" name="Entry Visits" stroke="#F59E0B" strokeWidth={3} fill="url(#gVisits)" />
                      </AreaChart>
                    ) : (
                      <BarChart data={timeseries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={monthShort}
                          tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }}
                          stroke="#cbd5e1"
                          tickLine={false}
                        />
                        <YAxis tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }} stroke="#cbd5e1" tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                            padding: "12px 16px",
                          }}
                          labelFormatter={(d) =>
                            new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
                              month: "long",
                              year: "numeric",
                            })
                          }
                        />
                        <Legend wrapperStyle={{ paddingTop: "24px" }} iconType="circle" />
                        <Bar dataKey="users" name="New Users" fill="#10B981" radius={[10, 10, 0, 0]} />
                        <Bar dataKey="adoptions" name="Approved Adoptions" fill="#06B6D4" radius={[10, 10, 0, 0]} />
                        <Bar dataKey="visits" name="Entry Visits" fill="#F59E0B" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <button
            onClick={() => toggleSection("trends")}
            className="w-full p-5 rounded-2xl border-2 border-dashed border-gray-300 hover:border-sky-500 hover:bg-sky-50/50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-sky-700 font-medium group"
          >
            <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Show Activity Trends</span>
          </button>
        )}

        {/* Section 3: Composition & Distribution */}
        {visibleSections.composition ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">3</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Composition & Distribution</h2>
              </div>
              <button onClick={() => toggleSection("composition")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <EyeOff className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Approval Rate */}
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                      <PieIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Approval Rate</h3>
                      <p className="text-xs text-gray-600 mt-0.5">Adoption success metrics</p>
                    </div>
                  </div>
                </div>

                <div className="relative p-6">
                  <div className="h-[280px]">
                    <ResponsiveContainer>
                      <RadialBarChart data={donutData} innerRadius="65%" outerRadius="100%" startAngle={90} endAngle={-270}>
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar background dataKey="value" cornerRadius={10}>
                          {donutData.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? "#10B981" : "#E5E7EB"} />
                          ))}
                        </RadialBar>
                        <Tooltip formatter={(v, n) => [`${v}%`, n]} contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="rounded-2xl bg-white shadow-xl px-6 py-4 text-center border border-gray-100">
                      <div className="text-3xl font-black text-emerald-600">{approvedPct}%</div>
                      <div className="text-xs text-gray-600 font-semibold mt-1">Approved</div>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3 py-2">
                    <span className="w-4 h-4 rounded-md inline-block bg-emerald-500" />
                    <span className="text-sm font-semibold text-gray-700">Approved</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <span className="w-4 h-4 rounded-md inline-block bg-gray-300" />
                    <span className="text-sm font-semibold text-gray-700">Others</span>
                  </div>
                </div>
              </div>

              {/* Users by Role */}
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Users by Role</h3>
                    <p className="text-xs text-gray-600 mt-0.5">Account type breakdown</p>
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byRole}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="role" tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0", padding: "12px 16px" }} />
                      <Bar dataKey="count" name="Users" radius={[10, 10, 0, 0]}>
                        {byRole.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Locations */}
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Top Locations</h3>
                    <p className="text-xs text-gray-600 mt-0.5">Elephant distribution</p>
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...topLocations].sort((a, b) => b.count - a.count)}
                      layout="vertical"
                      margin={{ left: 90, right: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="location"
                        tick={{ fontSize: 13, fill: "#64748b", fontWeight: 500 }}
                        width={120}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0", padding: "12px 16px" }} />
                      <Bar dataKey="count" name="Elephants" radius={[0, 10, 10, 0]}>
                        {topLocations.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <button
            onClick={() => toggleSection("composition")}
            className="w-full p-5 rounded-2xl border-2 border-dashed border-gray-300 hover:border-violet-500 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-violet-700 font-medium group"
          >
            <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Show Composition & Distribution</span>
          </button>
        )}

        {/* Section 4: Adoption Status Breakdown */}
        {visibleSections.breakdown ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">4</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Adoption Status Breakdown</h2>
              </div>
              <button onClick={() => toggleSection("breakdown")} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <EyeOff className="w-5 h-5 text-gray-500" />
              </button>
            </header>

            <div className="bg-white rounded-3xl border border-gray-200/80 p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0", padding: "12px 16px" }} />
                    <Legend wrapperStyle={{ paddingTop: "24px" }} iconType="circle" />
                    <Pie
                      data={adoptionsByStatus}
                      dataKey="count"
                      nameKey="status"
                      outerRadius={140}
                      innerRadius={80}
                      paddingAngle={3}
                      label={(entry) => `${entry.status}: ${entry.count}`}
                      labelLine={{ stroke: "#64748b", strokeWidth: 1 }}
                    >
                      {adoptionsByStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        ) : (
          <button
            onClick={() => toggleSection("breakdown")}
            className="w-full p-5 rounded-2xl border-2 border-dashed border-gray-300 hover:border-amber-500 hover:bg-amber-50/50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-amber-700 font-medium group"
          >
            <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Show Adoption Status Breakdown</span>
          </button>
        )}

        {/* Loading / Error */}
        {loading && (
          <div className="flex items-center justify-center gap-3 text-emerald-700 text-base font-medium py-8">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading analytics data…
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
