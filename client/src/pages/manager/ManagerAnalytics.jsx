// client/src/pages/manager/ManagerAnalytics.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Stethoscope,
  ClipboardList,
  FileText,
  Activity,
  MapPin,
  Calendar,
  RefreshCw,
  PieChart as PieIcon,
  BarChart as BarIcon,
  LineChart,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { fetchManagerAnalytics } from "../../api/analytics";

// palette
const COLORS = ["#10B981","#06B6D4","#F59E0B","#EF4444","#8B5CF6","#3B82F6","#22C55E","#14B8A6"];
const fmt = (n) => (n ?? 0).toLocaleString();
const monthShort = (isoDate) =>
  new Date(isoDate + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", year: "2-digit" });

export default function ManagerAnalytics() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  // date range OR months (fall back to last 12 months)
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [months, setMonths] = useState(12);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchManagerAnalytics(
        start && end ? { start, end } : { months }
      );
      setData(res?.data || null);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load manager analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = data?.totals || {};
  const rangeTotals = data?.rangeTotals || {};
  const timeseries = data?.timeseries || [];
  const elephantsByHealth = data?.elephantsByHealth || [];
  const healthRequestsByStatus = data?.healthRequestsByStatus || [];
  const topLocations = data?.topLocations || [];

  const kpis = [
    { icon: Activity, label: "Issues (range)", value: rangeTotals.issues, color: "from-emerald-500 to-teal-500" },
    { icon: Stethoscope, label: "Prescriptions (range)", value: rangeTotals.prescriptions, color: "from-sky-500 to-cyan-500" },
    { icon: ClipboardList, label: "Health Req. Created", value: rangeTotals.healthReqCreated, color: "from-indigo-500 to-violet-500" },
    { icon: FileText, label: "Caretaker Reports", value: rangeTotals.caretakerReports, color: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header / Filters */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manager Analytics</h1>
              <p className="text-gray-600 mt-1">Operations overview from elephants, issues, health requests & daily reports</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <input
                  type="date"
                  value={start}
                  onChange={(e)=>setStart(e.target.value)}
                  className="bg-transparent outline-none text-sm"
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="date"
                  value={end}
                  onChange={(e)=>setEnd(e.target.value)}
                  className="bg-transparent outline-none text-sm"
                />
                <button
                  onClick={() => {
                    if (start && end) {
                      setMonths(undefined);
                      load();
                    }
                  }}
                  className="ml-2 text-sm font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Apply
                </button>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-200">
                <BarIcon className="w-4 h-4 text-sky-700" />
                <select
                  value={months || 12}
                  onChange={(e) => {
                    setStart("");
                    setEnd("");
                    setMonths(parseInt(e.target.value,10));
                    setTimeout(load, 0);
                  }}
                  className="bg-transparent outline-none text-sm font-semibold"
                >
                  {[3,6,12,18,24,36].map(m => (
                    <option key={m} value={m}>{m} months</option>
                  ))}
                </select>
              </div>

              <button
                onClick={load}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span className="text-sm font-medium">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <div key={i} className={`rounded-xl p-5 border border-gray-100 bg-gradient-to-br ${k.color} shadow-sm text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur flex items-center justify-center">
                    <k.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-white/80 text-sm">{k.label}</div>
                    <div className="text-2xl font-bold">{fmt(k.value)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Trends */}
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Monthly Activity</h3>
            </div>
            <span className="text-sm text-gray-500">Issues • Prescriptions • HealthReq (created/fulfilled) • Caretaker Reports</span>
          </div>

          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
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
                <XAxis dataKey="date" tickFormatter={monthShort} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                  labelFormatter={(d) => new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                />
                <Legend />
                <Area type="monotone" dataKey="issues" name="Issues" stroke="#10B981" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="prescriptions" name="Prescriptions" stroke="#06B6D4" fill="url(#g2)" strokeWidth={2} />
                <Area type="monotone" dataKey="healthReqCreated" name="HealthReq Created" stroke="#F59E0B" fill="url(#g3)" strokeWidth={2} />
                <Area type="monotone" dataKey="healthReqFulfilled" name="HealthReq Fulfilled" stroke="#8B5CF6" fill="url(#g4)" strokeWidth={2} />
                <Area type="monotone" dataKey="caretakerReports" name="Caretaker Reports" stroke="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pies + Top Locations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Elephants by Health */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Elephants by Health</h3>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                  <Legend />
                  <Pie data={elephantsByHealth} dataKey="count" nameKey="status" outerRadius={110} innerRadius={60} paddingAngle={2}>
                    {elephantsByHealth.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Health Requests by Status */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Health Requests by Status</h3>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                  <Legend />
                  <Pie data={healthRequestsByStatus} dataKey="count" nameKey="status" outerRadius={110} innerRadius={60} paddingAngle={2}>
                    {healthRequestsByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Locations (Elephants) */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Top Locations (Elephants)</h3>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer>
                <BarChart data={[...topLocations].sort((a,b)=>b.count-a.count)} layout="vertical" margin={{ left: 80, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis type="category" dataKey="location" width={120} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="count" name="Elephants" radius={[6, 6, 0, 0]}>
                    {topLocations.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-emerald-700 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        )}
        {err ? <div className="text-center text-rose-600 text-sm">{err}</div> : null}
      </div>
    </div>
  );
}
