// client/src/pages/manager/ManageElephant.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import {
  fetchElephants,
  updateElephant as apiUpdateElephant,
  deleteElephant as apiDeleteElephant,
} from "../../api/elephant";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  Edit3,
  Trash2,
  MapPin,
  Calendar,
  User,
  Hash,
  Heart,
  Loader,
  AlertCircle,
  Save,
  X,
  Search,    // <-- added
  FileText,  // <-- added
} from "lucide-react";

// Elephant icon matching the theme
const ElephantIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg viewBox="0 0 100 100" className={className} fill={color} aria-hidden="true">
    <path d="M20 60c0-15 10-25 25-25s25 10 25 25c0 8-3 15-8 20h-34c-5-5-8-12-8-20z" />
    <circle cx="35" cy="55" r="2" fill="white" />
    <path d="M15 65c-5 0-8 3-8 8s3 8 8 8c2 0 4-1 5-2" />
    <path d="M45 40c-8-5-15-3-20 2" />
    <circle cx="25" cy="75" r="8" opacity="0.1" />
    <circle cx="55" cy="75" r="8" opacity="0.1" />
  </svg>
);

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center space-y-4">
      <Loader className="w-8 h-8 animate-spin text-emerald-600" />
      <p className="text-gray-600">Loading elephants...</p>
    </div>
  </div>
);

// Error component
const ErrorMessage = ({ message }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center space-x-3">
    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
    <p className="text-red-800">{message}</p>
  </div>
);

// Empty state component
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
      <ElephantIcon className="w-10 h-10 text-emerald-600" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Elephants Yet</h3>
    <p className="text-gray-600 max-w-md">
      There are no elephants in the system yet. Add some elephants to start managing them.
    </p>
  </div>
);

export default function ManageElephant() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editOriginal, setEditOriginal] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    location: "",
    notes: "",
  });
  const [saveBusy, setSaveBusy] = useState(false);

  // delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [targetId, setTargetId] = useState(null);

  // search
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await fetchElephants();
        setRows(data.elephants || []);
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load elephants");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // open edit
  const onEdit = (row) => {
    setEditOriginal(row);
    setEditForm({
      name: row.name || "",
      age: row.age ?? "",
      gender: row.gender || "Male",
      location: row.location || "",
      notes: row.notes || "",
    });
    setEditOpen(true);
  };

  // compare changes (shallow)
  const hasChanges = useMemo(() => {
    if (!editOriginal) return false;
    const norm = (v) => (v === undefined || v === null ? "" : String(v));
    return (
      norm(editForm.name) !== norm(editOriginal.name) ||
      String(editForm.age ?? "") !== String(editOriginal.age ?? "") ||
      norm(editForm.gender) !== norm(editOriginal.gender) ||
      norm(editForm.location) !== norm(editOriginal.location) ||
      norm(editForm.notes) !== norm(editOriginal.notes)
    );
  }, [editForm, editOriginal]);

  // save update
  const onSave = async () => {
    if (!editOriginal) return;
    setSaveBusy(true);
    try {
      const payload = {
        name: editForm.name,
        gender: editForm.gender,
        location: editForm.location,
        notes: editForm.notes,
      };
      if (editForm.age !== "") payload.age = Number(editForm.age);

      const { data } = await apiUpdateElephant(editOriginal._id, payload);
      setRows((prev) => prev.map((r) => (r._id === editOriginal._id ? data.elephant : r)));
      setEditOpen(false);
      setEditOriginal(null);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to update elephant");
    } finally {
      setSaveBusy(false);
    }
  };

  // delete flow
  const onDelete = (row) => {
    setTargetId(row._id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setConfirmBusy(true);
    try {
      await apiDeleteElephant(targetId);
      setRows((prev) => prev.filter((r) => r._id !== targetId));
      setConfirmOpen(false);
      setTargetId(null);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete elephant");
    } finally {
      setConfirmBusy(false);
    }
  };

  // ---------- Instant filter for table ----------
  const displayRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.name || "").toLowerCase();
      const id = (r._id || "").toLowerCase();
      const last6 = id.slice(-6);
      return name.includes(q) || id.includes(q) || last6.includes(q);
    });
  }, [rows, query]);

  // ---------- Report generation (print-to-PDF) ----------
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const buildReportHtml = (list) => {
    const now = new Date().toLocaleString();
    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Elephant Health Report</title>
  <style>
    :root { --emerald:#10b981; --teal:#14b8a6; --border:#e5e7eb; --text:#374151; --muted:#6b7280; }
    *{box-sizing:border-box} body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:var(--text); margin:24px;}
    h1{margin:0 0 6px 0} .sub{color:var(--muted);margin-bottom:16px}
    .card{border:1px solid var(--border); border-radius:12px; overflow:hidden; margin:12px 0}
    .hd{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:linear-gradient(to right,#ecfdf5,#f0fdfa);border-bottom:1px solid var(--border)}
    .name{font-weight:700;color:var(--emerald)} .meta{font-size:12px;color:#6b7280}
    .body{padding:14px} .row{display:grid;grid-template-columns:160px 1fr;gap:12px;padding:6px 0;border-bottom:1px dashed #f1f5f9}
    .label{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.02em}
    .val{font-weight:600}
    .section{margin-top:8px}
    .footer{margin-top:16px;text-align:center;color:#9ca3af;font-size:12px}
    @media print { body{margin:.5in} .no-print{display:none} .card{page-break-inside:avoid} }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:12px;">
    <button onclick="window.print()" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:white;cursor:pointer">Print / Save PDF</button>
  </div>
  <h1>Elephant Health Report</h1>
  <div class="sub">Generated on ${esc(now)} • Total: ${list.length}</div>

  ${list
    .map((r) => {
      const h = r.health || {};
      const dash = (v) => (v === undefined || v === null || v === "" ? "—" : esc(v));
      const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
      return `
        <div class="card">
          <div class="hd">
            <div class="name">${dash(r.name || "Unnamed")}</div>
            <div class="meta">#${esc(String(r._id || "").slice(-6).toUpperCase())}</div>
          </div>
          <div class="body">
            <div class="row"><div class="label">Age</div><div class="val">${r.age !== undefined && r.age !== null ? esc(`${r.age} years`) : "—"}</div></div>
            <div class="row"><div class="label">Gender</div><div class="val">${dash(r.gender)}</div></div>
            <div class="row"><div class="label">Location</div><div class="val">${dash(r.location)}</div></div>
            <div class="row"><div class="label">Created</div><div class="val">${esc(fmtDate(r.createdAt))}</div></div>
            ${r.notes ? `<div class="row"><div class="label">Notes</div><div class="val">${dash(r.notes)}</div></div>` : ""}
            <div class="section">
              <div class="row"><div class="label">Health Status</div><div class="val">${dash(h.status)}</div></div>
              <div class="row"><div class="label">Last Checkup</div><div class="val">${esc(h.lastCheckup ? new Date(h.lastCheckup).toLocaleDateString() : "—")}</div></div>
              <div class="row"><div class="label">Weight (kg)</div><div class="val">${h.weightKg ?? "—"}</div></div>
              <div class="row"><div class="label">Height (m)</div><div class="val">${h.heightM ?? "—"}</div></div>
              ${h.vaccinations ? `<div class="row"><div class="label">Vaccinations</div><div class="val">${dash(h.vaccinations)}</div></div>` : ""}
              ${h.notes ? `<div class="row"><div class="label">Health Notes</div><div class="val">${dash(h.notes)}</div></div>` : ""}
            </div>
          </div>
        </div>
      `;
    })
    .join("")}

  <div class="footer">Hasthi.lk • Manager Report</div>
  <script>window.addEventListener('load',()=>{try{window.print()}catch(_){}}</script>
</body>
</html>
    `.trim();
  };

  const onGenerateReport = () => {
    // If there is a query, generate for the filtered rows; otherwise for all rows.
    const list = displayRows.length ? displayRows : rows;
    if (!list.length) {
      alert("No elephants to include in the report.");
      return;
    }
    const html = buildReportHtml(list);
    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Please allow popups to view the report.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  if (loading) return <LoadingSpinner />;
  if (err) return <ErrorMessage message={err} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
            <ElephantIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Elephants</h2>
            <p className="text-gray-600">
              {rows.length} elephant{rows.length !== 1 ? "s" : ""} in the sanctuary
              {query.trim() && (
                <span className="ml-2 text-emerald-700">• Showing {displayRows.length}</span>
              )}
            </p>
          </div>
        </div>

        {/* Right controls: search + report */}
        <div className="flex items-center gap-3 w-full max-w-md justify-end">
          {/* Search bar */}
          <div className="relative w-full">
            <div className="flex items-center bg-white border border-gray-300 rounded-xl px-3 py-2 shadow-sm">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full outline-none text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500"
                  title="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Generate Report button */}
          <button
            onClick={onGenerateReport}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow hover:from-emerald-600 hover:to-teal-600 transition-colors whitespace-nowrap"
            title="Generate printable report (Save as PDF)"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                <tr>
                  <th className="text-left p-4 font-semibold text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <Hash className="w-4 h-4" />
                      <span>ID</span>
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4" />
                      <span>Name</span>
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Age</span>
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Gender</span>
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Location</span>
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold text-emerald-800">Created</th>
                  <th className="text-left p-4 font-semibold text-emerald-800">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayRows.map((row, index) => (
                  <tr key={row._id} className="hover:bg-emerald-25 transition-colors group">
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {row._id.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                          <ElephantIcon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{row.name}</p>
                          <p className="text-sm text-gray-500">Elephant #{index + 1}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-900">{row.age ? `${row.age} years` : "-"}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          row.gender === "Male"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-pink-100 text-pink-800"
                        }`}
                      >
                        {row.gender}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-900">{row.location || "-"}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-600 text-sm">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(row)}
                          className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 transition-colors"
                          title="Edit elephant"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(row)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                          title="Delete elephant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500">
                      No elephants match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <Modal title="Update Elephant" onClose={() => setEditOpen(false)} className="max-w-2xl">
          <div className="space-y-6">
            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  placeholder="Enter elephant name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age (years)</label>
                <input
                  type="number"
                  placeholder="Age"
                  value={editForm.age}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                  min={0}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  placeholder="Current location"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                placeholder="Additional notes about the elephant..."
                rows={4}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setEditOpen(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                <div className="flex items-center space-x-2">
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </div>
              </button>

              {hasChanges && (
                <button
                  onClick={onSave}
                  disabled={saveBusy}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all font-medium shadow-lg"
                >
                  <div className="flex items-center space-x-2">
                    {saveBusy ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{saveBusy ? "Saving..." : "Save Changes"}</span>
                  </div>
                </button>
              )}
            </div>

            {!hasChanges && (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500">No changes to save</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Elephant"
        message="Are you sure you want to permanently delete this elephant? This action cannot be undone and will remove all associated data."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        busy={confirmBusy}
        variant="danger"
      />
    </div>
  );
}
