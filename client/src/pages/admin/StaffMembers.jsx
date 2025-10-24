// client/src/pages/admin/StaffMembers.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchUsers, createStaffUser } from "../../api/admin";
import { Users, UserPlus, Mail, Shield, Loader2, X } from "lucide-react";

// Avoid Tailwind JIT purging by mapping classes instead of template strings
const pillClasses = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
};
const Pill = ({ children, color = "emerald" }) => (
  <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full border ${pillClasses[color] || pillClasses.emerald}`}>
    {children}
  </span>
);

export default function StaffMembers() {
  const [vets, setVets] = useState([]);
  const [caretakers, setCaretakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "veterinarian", // or "caretaker"
  });
  const [formErr, setFormErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      // Ask server for filtered lists, but also hard-filter on client to guarantee correctness
      const [v, c] = await Promise.all([
        fetchUsers({ role: "veterinarian" }),
        fetchUsers({ role: "caretaker" }),
      ]);

      const vetsRaw = v?.data?.users || [];
      const caretakersRaw = c?.data?.users || [];

      // ✅ Hard filter on client to ensure ONLY expected roles render
      setVets(vetsRaw.filter((u) => u?.role === "veterinarian"));
      setCaretakers(caretakersRaw.filter((u) => u?.role === "caretaker"));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(
    () => ({ vets: vets.length, caretakers: caretakers.length }),
    [vets, caretakers]
  );

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    setFormErr("");

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormErr("Please fill all fields.");
      return;
    }
    if (!["veterinarian", "caretaker"].includes(form.role)) {
      setFormErr("Role must be veterinarian or caretaker.");
      return;
    }

    setBusy(true);
    try {
      // ✅ Create staff user (server validates and saves)
      await createStaffUser(form);
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "veterinarian" });
      await load(); // refresh both lists
    } catch (e) {
      setFormErr(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to create staff member"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Header actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Staff Members</h2>
            <p className="text-gray-500 text-sm">Veterinarians & Caretakers</p>
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-md transition"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="text-sm text-emerald-700 font-medium">Veterinarians</div>
          <div className="text-3xl font-extrabold text-emerald-800">{totals.vets}</div>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
          <div className="text-sm text-teal-700 font-medium">Caretakers</div>
          <div className="text-3xl font-extrabold text-teal-800">{totals.caretakers}</div>
        </div>
      </div>

      {/* Error / Loading */}
      {err ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{err}</div>
      ) : loading ? (
        <div className="min-h-[30vh] grid place-items-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : (
        // Side-by-side lists
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Veterinarians (LEFT) */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill color="emerald">Veterinarians</Pill>
              </div>
              <span className="text-sm text-gray-500">{vets.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {vets.map((u) => (
                    <tr key={u._id} className="odd:bg-white even:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-600" />
                          {u.name || "-"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-gray-500" />
                          {u.email || "-"}
                        </div>
                      </td>
                      <td className="px-5 py-3 capitalize text-emerald-700">{u.role}</td>
                    </tr>
                  ))}
                  {!vets.length && (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-gray-500">
                        No veterinarians yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Caretakers (RIGHT) */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill color="teal">Caretakers</Pill>
              </div>
              <span className="text-sm text-gray-500">{caretakers.length} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {caretakers.map((u) => (
                    <tr key={u._id} className="odd:bg-white even:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-teal-600" />
                          {u.name || "-"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-gray-500" />
                          {u.email || "-"}
                        </div>
                      </td>
                      <td className="px-5 py-3 capitalize text-teal-700">{u.role}</td>
                    </tr>
                  ))}
                  {!caretakers.length && (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-gray-500">
                        No caretakers yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {open && (
        <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm p-4 grid place-items-center">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold">Add Staff Member</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="px-5 py-4 space-y-4">
              {formErr && (
                <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                  {formErr}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: Dr. Nimal Perera"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 capitalize"
                >
                  <option value="veterinarian">veterinarian</option>
                  <option value="caretaker">caretaker</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-md transition disabled:opacity-70"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
