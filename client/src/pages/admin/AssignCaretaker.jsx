// client/src/pages/admin/AssignCaretaker.jsx
import { useEffect, useState } from "react";
import { fetchElephants } from "../../api/elephant";
import { assignCaretaker, fetchUsers } from "../../api/admin";
import Modal from "../../components/Modal";
import {
  Shield,
  Users,
  User,
  MapPin,
  Check,
  X,
  Loader2,
  Hash,
} from "lucide-react";

// Brand Elephant icon (same as other page)
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

const Badge = ({ yes }) => (
  <span
    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border
      ${yes ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}
  >
    {yes ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
    {yes ? "Assigned" : "Unassigned"}
  </span>
);

const LoadingScreen = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin" />
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin" />
      <ElephantIcon className="absolute top-2 left-2 w-8 h-8 text-emerald-600 animate-pulse" />
    </div>
  </div>
);

export default function AssignCaretaker() {
  const [elephants, setElephants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [open, setOpen] = useState(false);
  const [selectedElephant, setSelectedElephant] = useState(null);
  const [caretakers, setCaretakers] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const loadElephants = async () => {
    setLoading(true);
    try {
      const { data } = await fetchElephants();
      setElephants(data.elephants || []);
      setErr("");
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load elephants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadElephants();
  }, []);

  const openAssign = async (elephant) => {
    setSelectedElephant(elephant);
    setOpen(true);
    try {
      const { data } = await fetchUsers("caretaker");
      setCaretakers(data.users || []);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to load care-takers");
    }
  };

  const doAssign = async (caretaker) => {
    try {
      setBusyId(caretaker._id);
      await assignCaretaker(selectedElephant._id, caretaker._id);
      // update local row
      setElephants((prev) =>
        prev.map((e) =>
          e._id === selectedElephant._id ? { ...e, caretaker: caretaker._id } : e
        )
      );
      setOpen(false);
      setSelectedElephant(null);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to assign");
    } finally {
      setBusyId(null);
    }
  };

  // ---- Error UI (themed) ----
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
                <h3 className="text-lg font-semibold text-gray-900">Error Loading Elephants</h3>
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
          <div className="absolute top-8 right-8 opacity-10 animate-pulse">
            <ElephantIcon className="w-24 h-24 text-white" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 border border-white/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Assign Care-taker</h1>
                <p className="text-emerald-100 mt-1">Manage elephant → caretaker mappings</p>
              </div>
            </div>

            {!loading && (
              <div className="flex gap-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                  <div className="text-white text-sm font-medium">Elephants</div>
                  <div className="text-2xl font-bold text-white">{elephants.length}</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                  <div className="text-white text-sm font-medium">Assigned</div>
                  <div className="text-2xl font-bold text-white">
                    {elephants.filter((e) => !!e.caretaker).length}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Elephant List</h3>
            </div>
          </div>

          {loading ? (
            <LoadingScreen />
          ) : elephants.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ElephantIcon className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Elephants</h3>
              <p className="text-gray-600">Add elephants to assign care-takers.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-6 py-3 font-semibold">ID</th>
                    <th className="px-6 py-3 font-semibold">Name</th>
                    <th className="px-6 py-3 font-semibold">Gender</th>
                    <th className="px-6 py-3 font-semibold">Location</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {elephants.map((e, i) => (
                    <tr
                      key={e._id}
                      className={`border-t border-gray-100 ${i % 2 === 1 ? "bg-white" : "bg-white"}`}
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <span className="font-mono tracking-wide">
                            {e._id.slice(-6).toUpperCase()}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 flex items-center justify-center">
                            <ElephantIcon className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="font-medium text-gray-900">{e.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize">{e.gender}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 text-gray-700">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          {e.location || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge yes={!!e.caretaker} />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openAssign(e)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                                     bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                                     hover:from-emerald-600 hover:to-teal-600 shadow-md transition"
                        >
                          <Shield className="w-4 h-4" />
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal (uses your Modal wrapper; inner content themed) */}
      {open && (
        <Modal title={`Assign Care-taker — ${selectedElephant?.name}`} onClose={() => setOpen(false)}>
          <div className="space-y-4">
            {caretakers.map((c) => (
              <div
                key={c._id}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-100 to-teal-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => doAssign(c)}
                  disabled={busyId === c._id}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition shadow
                    ${busyId === c._id
                      ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
                    }`}
                >
                  {busyId === c._id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Assign
                    </>
                  )}
                </button>
              </div>
            ))}

            {!caretakers.length && (
              <div className="p-6 text-center text-gray-600 bg-gray-50 rounded-xl">
                No care-takers found. Change a user’s role to <span className="font-semibold">caretaker</span>.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
