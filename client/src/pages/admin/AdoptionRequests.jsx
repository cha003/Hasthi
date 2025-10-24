import { useEffect, useState } from "react";
import {
  fetchAdoptionRequests,
  approveAdoptionRequest,
  rejectAdoptionRequest,
} from "../../api/adoption";
import {
  Heart,
  User,
  Calendar,
  Clock,
  Check,
  X,
  Filter,
  Sparkles,
  Mail,
  Hash,
} from "lucide-react";

// Elephant SVG (brand icon)
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

const StatusBadge = ({ status }) => {
  const styles = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-100 text-rose-800 border-rose-200",
  };

  const icons = {
    pending: <Clock className="w-4 h-4" />,
    approved: <Check className="w-4 h-4" />,
    rejected: <X className="w-4 h-4" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}
    >
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
      <ElephantIcon className="absolute top-2 left-2 w-8 h-8 text-emerald-600 animate-pulse" />
    </div>
  </div>
);

export default function AdoptionRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("pending");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await fetchAdoptionRequests(filter ? { status: filter } : {});
      setRows(data.requests || []);
      setErr("");
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const approve = async (id) => {
    setBusyId(id);
    try {
      await approveAdoptionRequest(id);
      await load();
    } catch (e) {
      alert(e.response?.data?.message || "Approve failed");
    } finally {
      setBusyId("");
    }
  };

  const reject = async (id) => {
    const ok = confirm("Are you sure you want to reject this adoption request?");
    if (!ok) return;
    setBusyId(id);
    try {
      await rejectAdoptionRequest(id);
      await load();
    } catch (e) {
      alert(e.response?.data?.message || "Reject failed");
    } finally {
      setBusyId("");
    }
  };

  // --------- UI ----------
  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-rose-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <X className="w-8 h-8 text-rose-500" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Error Loading Requests</h3>
                <p className="text-rose-600 mt-1">{err}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="absolute top-8 right-8 opacity-10 animate-pulse">
            <ElephantIcon className="w-24 h-24 text-white" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 border border-white/30">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Adoption Requests</h1>
                <p className="text-emerald-100 mt-1">Manage elephant adoption applications</p>
              </div>
            </div>

            {!loading && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                <div className="text-white text-sm font-medium">Total Requests</div>
                <div className="text-2xl font-bold text-white">{rows.length}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter buttons */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Filter Requests</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { key: "pending", label: "Pending", icon: Clock, color: "amber" },
              { key: "", label: "All", icon: Sparkles, color: "gray" },
              { key: "approved", label: "Approved", icon: Check, color: "emerald" },
              { key: "rejected", label: "Rejected", icon: X, color: "rose" },
            ].map(({ key, label, icon: Icon, color }) => {
              const isActive = filter === key;
              const colorClasses = {
                amber: isActive
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
                gray: isActive
                  ? "bg-gray-500 text-white border-gray-500"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
                emerald: isActive
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
                rose: isActive
                  ? "bg-rose-500 text-white border-rose-500"
                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
              };

              return (
                <button
                  key={key || "all"}
                  onClick={() => setFilter(key)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center font-medium ${colorClasses[color]}`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg">
            <LoadingSpinner />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Requests Found</h3>
            <p className="text-gray-600">There are no adoption requests matching your current filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <div
                key={r._id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Request Info */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Date & Status */}
                      <div className="flex items-start">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {new Date(r.createdAt).toLocaleTimeString()}
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex items-start">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                          <User className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{r.userName}</div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Mail className="w-3 h-3 mr-1" />
                            {r.userEmail}
                          </div>
                        </div>
                      </div>

                      {/* Elephant Info */}
                      <div className="flex items-start">
                        <div className="w-10 h-10 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                          <ElephantIcon className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{r.elephantName}</div>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Hash className="w-3 h-3 mr-1" />
                            ID: {String(r.elephantId).slice(-6).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {r.status === "pending" ? (
                      <div className="flex flex-col sm:flex-row gap-3 lg:flex-col xl:flex-row">
                        <button
                          onClick={() => approve(r._id)}
                          disabled={busyId === r._id}
                          className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl min-w-[120px]"
                        >
                          {busyId === r._id ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Approve
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => reject(r._id)}
                          disabled={busyId === r._id}
                          className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl min-w-[120px]"
                        >
                          {busyId === r._id ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-2" />
                              Reject
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-medium min-w-[120px]">
                        {r.status === "approved" ? "✓ Processed" : "✗ Processed"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
