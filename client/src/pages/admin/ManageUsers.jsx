// client/src/pages/admin/ManageUsers.jsx
import { useEffect, useMemo, useState } from "react";
import { deleteUser, fetchUsers, updateUserRole } from "../../api/admin";
import ConfirmDialog from "../../components/ConfirmDialog";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Users,
  UserCog,
  Mail,
  Hash,
  Filter,
  Search,
  Download,
  X,
  Loader2,
} from "lucide-react";

// ✅ Added "eventmanager" so admins can assign it and filter by it
const ROLES = ["user", "manager", "caretaker", "veterinarian", "eventmanager", "admin"];

const LoadingScreen = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin" />
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin" />
    </div>
  </div>
);

export default function ManageUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [target, setTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // search + role filter
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(""); // empty = all

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await fetchUsers();
      setRows(data.users || []);
      setErr("");
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRoleChange = async (id, role) => {
    try {
      const { data } = await updateUserRole(id, role);
      setRows((prev) => prev.map((r) => (r._id === id ? data.user : r)));
    } catch (e) {
      alert(e.response?.data?.message || "Failed to update role");
    }
  };

  const askDelete = (row) => {
    setTarget(row);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await deleteUser(target._id);
      setRows((prev) => prev.filter((r) => r._id !== target._id));
      setConfirmOpen(false);
      setTarget(null);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to delete");
    } finally {
      setBusy(false);
    }
  };

  const shortId = (id = "") => String(id).slice(-6).toUpperCase();

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesRole = roleFilter ? r.role === roleFilter : true;
      const matchesText =
        !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q);
      return matchesRole && matchesText;
    });
  }, [rows, query, roleFilter]);

  const exportPdf = () => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const nowStr = new Date().toLocaleString();

      doc.setFontSize(16);
      doc.text("Hasthi.lk — Users", 40, 40);
      doc.setFontSize(10);
      doc.text(`Generated: ${nowStr}`, 40, 58);
      doc.text(`Count: ${filteredRows.length}`, 40, 72);

      autoTable(doc, {
        startY: 90,
        head: [["#", "Name", "Email", "Role", "ID"]],
        body: filteredRows.map((u, i) => [
          i + 1,
          u.name || "-",
          u.email || "-",
          u.role || "-",
          shortId(u._id),
        ]),
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255 }, // emerald
        columnStyles: { 2: { cellWidth: 220 } },
      });

      // Per-user detail pages (optional)
      filteredRows.forEach((u) => {
        doc.addPage();
        doc.setFontSize(16);
        doc.text(`User: ${u.name || "-"}`, 40, 60);

        doc.setFontSize(12);
        let y = 88;
        const line = (label, value) => {
          doc.text(`${label}: ${value || "-"}`, 40, y);
          y += 20;
        };

        line("Full ID", u._id);
        line("Email", u.email);
        line("Role", u.role);
        if (u.provider) line("Provider", u.provider);
        if (u.createdAt) line("Created At", new Date(u.createdAt).toLocaleString());
        if (u.updatedAt) line("Updated At", new Date(u.updatedAt).toLocaleString());
      });

      doc.save(`users_${Date.now()}.pdf`);
    } catch {
      alert("Failed to generate PDF. Make sure 'jspdf' and 'jspdf-autotable' are installed.");
    }
  };

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-rose-500">
            <div className="flex items-center">
              <X className="w-8 h-8 text-rose-500" />
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Error Loading Users</h3>
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
          <div className="absolute inset-0 bg-black opacity-20" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 border border-white/30">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Manage Users</h1>
                <p className="text-emerald-100 mt-1">Roles, search, export & deletion</p>
              </div>
            </div>

            {!loading && (
              <div className="flex gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                  <div className="text-white text-sm font-medium">Total</div>
                  <div className="text-2xl font-bold text-white">{rows.length}</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                  <div className="text-white text-sm font-medium">Filtered</div>
                  <div className="text-2xl font-bold text-white">{filteredRows.length}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls + Table */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 text-gray-900 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Filters & Actions</h3>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              title="Filter by role"
            >
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {(query || roleFilter) && (
              <button
                onClick={() => {
                  setQuery("");
                  setRoleFilter("");
                }}
                className="rounded-xl border-2 border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50"
                title="Clear filters"
              >
                Clear
              </button>
            )}

            <button
              onClick={exportPdf}
              className="md:ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold
                         bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                         hover:from-emerald-600 hover:to-teal-600 shadow-md transition"
              title="Export filtered users to PDF"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">Users</h3>
          </div>

          {loading ? (
            <LoadingScreen />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-6 py-3 font-semibold">Name</th>
                    <th className="px-6 py-3 font-semibold">Email</th>
                    <th className="px-6 py-3 font-semibold">Role</th>
                    <th className="px-6 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr key={r._id} className={i % 2 ? "bg-white" : "bg-white"}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center">
                            <Hash className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{r.name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail className="w-3.5 h-3.5" />
                              {shortId(r._id)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-gray-800">{r.email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={r.role}
                          onChange={(e) => onRoleChange(r._id, e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => askDelete(r)}
                          className="text-rose-600 hover:text-rose-700 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!filteredRows.length && (
                    <tr>
                      <td colSpan="4" className="px-6 py-10 text-center text-gray-600">
                        {rows.length ? "No users match your filters" : "No users"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete User"
        message={`Delete user "${target?.name}"? This cannot be undone.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doDelete}
        confirmText={
          busy ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Deleting...
            </span>
          ) : (
            "Yes, delete"
          )
        }
        cancelText="No"
        busy={busy}
      />
    </div>
  );
}
