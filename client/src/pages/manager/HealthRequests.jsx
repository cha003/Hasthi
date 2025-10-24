import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchHealthRequests, fulfillHealthRequest, rejectHealthRequest } from "../../api/health";
import { 
  CheckCircle, 
  XCircle, 
  Upload, 
  FileText, 
  User, 
  MapPin, 
  Clock, 
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Download,
  Eye,
  MessageSquare
} from "lucide-react";
import { fileUrl } from "../../lib/url";

const STATUS_OPTIONS = [
  { value: "all", label: "All Requests", color: "gray" },
  { value: "pending", label: "Pending", color: "yellow" },
  { value: "fulfilled", label: "Fulfilled", color: "green" },
  { value: "rejected", label: "Rejected", color: "red" }
];

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  fulfilled: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

export default function HealthRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("pending"); // pending | fulfilled | rejected | all
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const params = filter === "all" ? {} : { status: filter };
      const { data } = await fetchHealthRequests(params);
      setRows(data?.requests || []);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(row =>
      row.userName?.toLowerCase().includes(term) ||
      row.userEmail?.toLowerCase().includes(term) ||
      row.elephantName?.toLowerCase().includes(term) ||
      row.elephantLocation?.toLowerCase().includes(term) ||
      row.note?.toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  const handleFulfill = async (row, file, note) => {
    if (!file) {
      alert("Please choose a PDF file first.");
      return;
    }
    // Validate file type and size (<= 10MB)
    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB.");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("report", file);
      if (note?.trim()) fd.append("managerNote", note.trim());
      await fulfillHealthRequest(row._id, fd);
      await load(true);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to upload report");
    }
  };

  const handleReject = async (row) => {
    const note = prompt("Reason (optional):")?.trim() || "";
    if (!window.confirm(`Are you sure you want to reject the health request for ${row.elephantName}?`)) {
      return;
    }
    try {
      await rejectHealthRequest(row._id, { managerNote: note });
      await load(true);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to reject request");
    }
  };

  const handleRefresh = () => {
    load(true);
  };

  const pendingCount = rows.filter(r => r.status === "pending").length;
  const fulfilledCount = rows.filter(r => r.status === "fulfilled").length;
  const rejectedCount = rows.filter(r => r.status === "rejected").length;

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Health Requests</h2>
          <p className="text-gray-600 mt-1">Manage elephant health report requests from users</p>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <div className="bg-yellow-50 px-3 py-2 rounded-lg">
            <span className="font-medium text-yellow-800">{pendingCount} Pending</span>
          </div>
          <div className="bg-green-50 px-3 py-2 rounded-lg">
            <span className="font-medium text-green-800">{fulfilledCount} Fulfilled</span>
          </div>
          <div className="bg-red-50 px-3 py-2 rounded-lg">
            <span className="font-medium text-red-800">{rejectedCount} Rejected</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user name, email, elephant name, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      {err && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Requests</h3>
              <p className="text-red-700 text-sm mt-1">{err}</p>
            </div>
          </div>
          <button
            onClick={() => load()}
            className="mt-3 text-red-700 hover:text-red-800 text-sm underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-4" />
          <p className="text-gray-600">Loading health requests...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !err && filteredRows.length === 0 && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-gray-900 font-medium mb-2">No requests found</h3>
          <p className="text-gray-600">
            {searchTerm ? "Try adjusting your search terms or filters." : "No health requests match the current filter."}
          </p>
        </div>
      )}

      {/* Request List */}
      {!loading && !err && filteredRows.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Showing {filteredRows.length} of {rows.length} requests
          </div>

          {filteredRows.map((r) => (
            <RequestRow
              key={r._id}
              row={r}
              onFulfill={handleFulfill}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRow({ row, onFulfill, onReject }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const href = row.reportUrl ? fileUrl(row.reportUrl) : "#";

  const handleUpload = async () => {
    setUploading(true);
    try {
      await onFulfill(row, file, note);
      setFile(null);
      setNote("");
    } finally {
      setUploading(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await onReject(row);
    } finally {
      setRejecting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <User className="w-5 h-5 text-emerald-600 mr-2" />
              <span className="font-semibold text-gray-900">{row.userName}</span>
              <span className="text-gray-500 text-sm ml-2">({row.userEmail})</span>
            </div>

            <div className="flex items-center text-gray-700 mb-2">
              <MapPin className="w-4 h-4 text-emerald-600 mr-2" />
              <span className="font-medium">{row.elephantName}</span>
              {row.elephantLocation && (
                <span className="text-gray-500 ml-2">• {row.elephantLocation}</span>
              )}
            </div>

            <div className="flex items-center text-gray-600 text-sm">
              <Clock className="w-4 h-4 mr-2" />
              Requested on {formatDate(row.createdAt)}
            </div>
          </div>

          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[row.status]}`}>
            {row.status === "fulfilled" && <CheckCircle className="w-3 h-3 mr-1" />}
            {row.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
            {row.status}
          </span>
        </div>

        {/* User Note */}
        {row.note && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <MessageSquare className="w-4 h-4 text-gray-500 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">User Note:</p>
                <p className="text-sm text-gray-600">{row.note}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions Section */}
        {row.status === "pending" ? (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload PDF Report *
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  {file && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Add a note for the user..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? "Uploading..." : "Upload & Send PDF"}
                </button>

                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                >
                  {rejecting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  {rejecting ? "Rejecting..." : "Reject Request"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                {row.managerNote && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Manager Note: </span>
                    <span className="text-sm text-gray-600">{row.managerNote}</span>
                  </div>
                )}
                {row.respondedAt && (
                  <div className="text-sm text-gray-600">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Responded on {formatDate(row.respondedAt)}
                  </div>
                )}
              </div>

              {row.reportUrl && (
                <div className="flex gap-2">
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View PDF
                  </a>
                  <a
                    href={href}
                    download
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
