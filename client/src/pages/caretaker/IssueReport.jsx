// client/src/pages/caretaker/ComingSoon.jsx
import { useEffect, useState } from "react";
import { fetchMyReports } from "../../api/report";
import {
  Search,
  Calendar,
  X,
  FileText,
  MapPin,
  Apple,
  Heart,
  Clock,
  Filter,
  ChevronRight
} from "lucide-react";

// Brand elephant icon (same look & feel as other caretaker pages)
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

function fmtDate(d) {
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + "T00:00:00Z").toDateString();
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default function ComingSoon() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  // filters
  const [q, setQ] = useState("");
  const [onDate, setOnDate] = useState(""); // "YYYY-MM-DD"

  // internal: debounced query value for live search
  const [debouncedQ, setDebouncedQ] = useState(q);

  // debounce text search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  // fetch with current filters
  const load = async ({ qParam, dateParam } = {}) => {
    setLoading(true);
    setErr("");
    try {
      const params = {};
      if (qParam) params.q = qParam;
      if (dateParam) {
        // single calendar filters to one day
        params.start = dateParam;
        params.end = dateParam;
      }
      const { data } = await fetchMyReports(params);
      setRows(data.reports || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    load({ qParam: "", dateParam: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // live updates: when debounced search or date changes
  useEffect(() => {
    load({ qParam: debouncedQ || "", dateParam: onDate || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, onDate]);

  const clearFilters = () => {
    setQ("");
    setOnDate("");
  };

  const hasActiveFilters = q || onDate;

  return (
    <div className="space-y-6">
      {/* Decorative header */}
      <div className="relative">
        <div className="absolute -top-4 -right-4 opacity-5">
          <ElephantIcon className="w-24 h-24 text-emerald-500" />
        </div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Daily Reports
          </h2>
        </div>
        <div className="w-20 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-gray-900">Filter Reports</span>
          {hasActiveFilters && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-emerald-600">Active filters</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Search className="w-4 h-4 text-emerald-600" />
              <span>Search Reports</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Type to search elephants, feeding, health..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Date Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Filter by Date</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={onDate}
                onChange={(e) => setOnDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Clear Button */}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className={[
                "flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                hasActiveFilters
                  ? "bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 text-rose-700 hover:from-rose-100 hover:to-red-100"
                  : "bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed"
              ].join(" ")}
            >
              <X className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-gray-600">
              Showing <span className="font-bold text-emerald-700">{rows.length}</span> report{rows.length === 1 ? "" : "s"}
              {onDate && <> on <span className="font-bold text-emerald-700">{fmtDate(onDate)}</span></>}
              {debouncedQ && <> matching <span className="font-bold text-emerald-700">"{debouncedQ}"</span></>}
            </p>
          </div>

          {loading && (
            <div className="flex items-center space-x-2 text-emerald-600">
              <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Results */}
      {err ? (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full grid place-items-center">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error Loading Reports</h3>
              <p className="text-red-700">{err}</p>
            </div>
          </div>
        </div>
      ) : !loading && rows.length === 0 ? (
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full grid place-items-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Found</h3>
          <p className="text-gray-600">
            {hasActiveFilters
              ? "Try adjusting your search filters to find more reports."
              : "No daily reports have been submitted yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => (
            <div
              key={r._id}
              className="bg-white rounded-xl shadow-lg border border-emerald-100 hover:shadow-xl transition-all duration-200 group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl grid place-items-center shadow-lg flex-shrink-0">
                      <ElephantIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{r.elephantName}</h3>
                      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          {fmtDate(r.dateKey)}
                        </span>
                        <span className="capitalize">{r.elephantGender}</span>
                        {r.elephantLocation && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-emerald-600" />
                            {r.elephantLocation}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedReport(selectedReport === r._id ? null : r._id)}
                      className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
                      title={selectedReport === r._id ? "Collapse" : "Expand"}
                    >
                      <ChevronRight
                        className={`w-4 h-4 text-emerald-600 transition-transform ${
                          selectedReport === r._id ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Quick preview cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Apple className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-800">Feeding Details</span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {r.feedingDetails || "No feeding details recorded"}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Health Status</span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {r.healthNote || "No health concerns noted"}
                    </p>
                  </div>
                </div>

                {/* Expanded details */}
                {selectedReport === r._id && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="grid gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Apple className="w-4 h-4 text-emerald-600" />
                          <span>Detailed Feeding Report</span>
                        </h4>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {r.feedingDetails || "No detailed feeding information was provided."}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Heart className="w-4 h-4 text-blue-600" />
                          <span>Health Observations</span>
                        </h4>
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {r.healthNote || "No specific health observations were recorded."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
