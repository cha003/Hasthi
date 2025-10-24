// client/src/pages/adoption/Adoption.jsx
import { useEffect, useState } from "react";
import { getAdoptableElephants } from "../../api/elephant";
import { requestAdoption, fetchMyAdoptionRequests } from "../../api/adoption";
import {
  Heart,
  MapPin,
  Calendar,
  User,
  Send,
  X,
  CheckCircle,
  Clock,
  Gift,
  Sparkles,
  Search,
  Filter,
  MessageSquare,
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

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
      <ElephantIcon className="absolute top-2 left-2 w-8 h-8 text-emerald-600 animate-pulse" />
    </div>
  </div>
);

const GenderBadge = ({ gender }) => {
  const isMale = gender?.toLowerCase() === "male";
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        isMale
          ? "bg-blue-100 text-blue-800 border border-blue-200"
          : "bg-pink-100 text-pink-800 border border-pink-200"
      }`}
    >
      {gender || "Unknown"}
    </span>
  );
};

const StatusBadge = ({ hasPending }) => {
  if (hasPending) {
    return (
      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-4 h-4" />
        Requested
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
      <Heart className="w-4 h-4" />
      Available
    </div>
  );
};

const MessageAlert = ({ message }) => {
  if (!message) return null;
  const isSuccess = message.includes("✅");
  const Icon = isSuccess ? CheckCircle : X;
  const colorClasses = isSuccess
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : "bg-rose-50 text-rose-800 border-rose-200";
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl border ${colorClasses} mt-4`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const EnhancedModal = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Heart className="w-6 h-6 text-white mr-3" />
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const ElephantCard = ({ elephant, onAdopt, hasPending }) => (
  <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-gray-100">
    {/* Header */}
    <div className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
      <div className="absolute top-4 right-4 opacity-20">
        <ElephantIcon className="w-16 h-16 text-emerald-500" />
      </div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">{elephant.name}</h3>
          <StatusBadge hasPending={hasPending} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-gray-600">
            <User className="w-4 h-4 mr-3 text-emerald-500" />
            <GenderBadge gender={elephant.gender} />
            {elephant.age && (
              <span className="ml-3 text-sm">
                <Calendar className="w-4 h-4 inline mr-1" />
                {elephant.age} years old
              </span>
            )}
          </div>

          {elephant.location && (
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-3 text-emerald-500" />
              <span className="text-sm">{elephant.location}</span>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Footer */}
    <div className="p-6 bg-white">
      <button
        onClick={() => onAdopt(elephant)}
        disabled={hasPending}
        className={`w-full flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
          hasPending
            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 group-hover:scale-105"
        }`}
        title={
          hasPending
            ? "You already requested adoption for this elephant"
            : "Request adoption for this elephant"
        }
      >
        {hasPending ? (
          <>
            <Clock className="w-5 h-5 mr-2" />
            Request Pending
          </>
        ) : (
          <>
            <Heart className="w-5 h-5 mr-2" />
            Request Adoption
          </>
        )}
      </button>
    </div>
  </div>
);

export default function Adoption() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [myRequests, setMyRequests] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: eData }, { data: rData }] = await Promise.all([
        getAdoptableElephants(),
        fetchMyAdoptionRequests(),
      ]);
      setRows(eData.elephants || []);
      setMyRequests(rData.requests || []);
      setErr("");
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load elephants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const hasPendingFor = (eleId) =>
    myRequests.some((r) => r.elephantId === eleId && r.status === "pending");

  const openConfirm = (ele) => {
    setSelected(ele);
    setNote("");
    setMsg("");
    setConfirmOpen(true);
  };

  const submitRequest = async () => {
    setBusy(true);
    try {
      await requestAdoption({ elephantId: selected._id, note });
      setMsg("Adoption request sent successfully! ✅");
      await load();
      setTimeout(() => setConfirmOpen(false), 700);
    } catch (e) {
      setMsg(e.response?.data?.message || "Failed to send adoption request");
    } finally {
      setBusy(false);
    }
  };

  // Filtered list
  const filteredElephants = rows.filter((ele) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      ele.name.toLowerCase().includes(q) ||
      (ele.location && ele.location.toLowerCase().includes(q));
    const matchesGender =
      !genderFilter || ele.gender?.toLowerCase() === genderFilter.toLowerCase();
    return matchesSearch && matchesGender;
  });

  const stats = {
    total: rows.length,
    pending: myRequests.filter((r) => r.status === "pending").length,
  };

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-rose-500">
            <div className="flex items-center">
              <X className="w-8 h-8 text-rose-500 mr-4" />
              <div>
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
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="absolute top-8 right-8 opacity-10 animate-pulse">
            <Heart className="w-24 h-24 text-white" />
          </div>
          <div className="absolute bottom-8 left-8 opacity-5 rotate-12">
            <ElephantIcon className="w-32 h-32 text-white" />
          </div>
          <div className="absolute top-1/2 right-1/4 opacity-5">
            <Gift className="w-40 h-40 text-white" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <ElephantIcon className="w-16 h-16 text-white mr-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-white">Adopt an Elephant</h1>
            </div>
            <p className="text-xl text-emerald-100 mb-8 max-w-3xl mx-auto">
              Choose an elephant to symbolically adopt and follow their journey. Build a special
              connection while supporting their care and wellbeing.
            </p>

            {!loading && (
              <div className="flex justify-center space-x-8">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-emerald-100 text-sm">Available</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                  <div className="text-2xl font-bold text-white">{stats.pending}</div>
                  <div className="text-emerald-100 text-sm">Your Requests</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search + Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search elephants by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg">
            <LoadingSpinner />
          </div>
        ) : filteredElephants.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ElephantIcon className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Elephants Found</h3>
            <p className="text-gray-600">
              {rows.length === 0
                ? "No elephants are available for adoption right now."
                : "No elephants match your search criteria."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredElephants.map((ele) => (
              <ElephantCard
                key={ele._id}
                elephant={ele}
                onAdopt={openConfirm}
                hasPending={hasPendingFor(ele._id)}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        {!loading && rows.length > 0 && (
          <div className="mt-12 text-center bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-12 text-white">
            <Sparkles className="w-16 h-16 text-white mx-auto mb-6 opacity-90" />
            <h3 className="text-2xl font-bold mb-4">Make a Difference Today</h3>
            <p className="text-emerald-100 max-w-2xl mx-auto">
              Every adoption helps provide food, medical care, and a safe environment for these
              magnificent creatures. Your support makes a real difference in their lives.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <EnhancedModal
        open={confirmOpen}
        title={`Adopt ${selected?.name || ""}`}
        onClose={() => setConfirmOpen(false)}
      >
        <div className="space-y-6">
          {selected && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center mb-3">
                <ElephantIcon className="w-8 h-8 text-emerald-600 mr-3" />
                <div>
                  <h4 className="font-semibold text-gray-900">{selected.name}</h4>
                  <div className="text-sm text-gray-600">
                    {selected.gender} • {selected.age} years • {selected.location}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
              <MessageSquare className="w-4 h-4 mr-2" />
              Personal Message (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="Share why you'd like to adopt this elephant and what it means to you..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This message will be shared with our caretaking team.
            </p>
          </div>

          <MessageAlert message={msg} />

          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={busy}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitRequest}
              disabled={busy}
              className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl min-w-[140px]"
            >
              {busy ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Request
                </>
              )}
            </button>
          </div>
        </div>
      </EnhancedModal>
    </div>
  );
}
