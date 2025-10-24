//--------------------------------------------------------
// client/src/pages/BookEntry.jsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createEntryBooking } from "../api/entry";
import {
  Calendar,
  Ticket,
  Phone,
  User,
  StickyNote,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe
} from "lucide-react";

// Visitor-based price shown to the user (server re-validates)
const VISITOR_PRICE = { local: 1500, foreign: 5000 };
const LABELS = { adult: "Adult", child: "Child" };

function ymd(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function money(n) {
  return Intl.NumberFormat().format(Number(n || 0));
}

// === Frontend validation helpers (ADDED) ===
const NAME_MIN = 2;
function validateName(v) {
  const t = String(v || "").trim();
  if (!t) return "Full name is required";
  if (t.length < NAME_MIN) return "Name is too short";
  // Letters in any language, spaces, apostrophes, dots, hyphens
  if (!/^[\p{L}][\p{L}\p{M}\s.'-]{1,}$/u.test(t)) return "Use letters and spaces only";
  return "";
}
function normalizePhone(v) {
  return String(v || "").replace(/[()\s-]/g, "");
}
function validatePhone(v) {
  const raw = String(v || "");
  if (!raw.trim()) return "Phone number is required";
  const p = normalizePhone(raw);
  // Sri Lanka: +94XXXXXXXXX (9 digits) or 0XXXXXXXXX (10 digits)
  if (/^\+94\d{9}$/.test(p) || /^0\d{9}$/.test(p)) return "";
  return "Enter a valid Sri Lankan phone (e.g., 0712345678 or +94712345678)";
}
function validateNote(v) {
  const t = String(v || "");
  if (t.length > 200) return "Note must be 200 characters or fewer";
  return "";
}

export default function BookEntry() {
  const navigate = useNavigate();
  const location = useLocation();

  // If user came from QuickPackageBooking, counts are locked
  const lockCounts = Boolean(location.state?.lockCounts);
  const lockedTickets = lockCounts ? Number(location.state?.lockedTickets) : null;
  const stateItems = Array.isArray(location.state?.items) ? location.state.items : null;
  const prefillDay = location.state?.day;

  // derive initial qty from passed state
  const initialQty = useMemo(() => {
    const base = { adult: 1, child: 0 };
    if (stateItems && stateItems.length) {
      for (const it of stateItems) {
        if (it?.type === "adult") base.adult = Number(it.qty || 0);
        if (it?.type === "child") base.child = Number(it.qty || 0);
      }
    }
    if (lockCounts && lockedTickets != null) {
      const sum = Number(base.adult) + Number(base.child);
      if (sum !== lockedTickets) {
        // normalize: put all into adults by default
        return { adult: Math.max(0, lockedTickets), child: 0 };
      }
    }
    return base;
  }, [stateItems, lockCounts, lockedTickets]);

  const [selectedDate, setSelectedDate] = useState(prefillDay ? new Date(prefillDay) : new Date());
  const [attendeeName, setAttendeeName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(initialQty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // NEW: visitor type (affects unit price per ticket)
  const [visitorType, setVisitorType] = useState("local"); // 'local' | 'foreign'
  const unitPrice = VISITOR_PRICE[visitorType];

  // === Field-level validation state (ADDED) ===
  const [fieldErr, setFieldErr] = useState({
    attendeeName: "",
    phone: "",
    note: ""
  });

  const validateAll = () => {
    const e = {
      attendeeName: validateName(attendeeName),
      phone: validatePhone(phone),
      note: validateNote(note)
    };
    setFieldErr(e);
    // any non-empty error message means invalid
    return !Object.values(e).some(Boolean);
  };

  // real-time soft validation: clear field error while typing if it becomes valid (ADDED)
  useEffect(() => {
    if (fieldErr.attendeeName) {
      const m = validateName(attendeeName);
      if (!m) setFieldErr((s) => ({ ...s, attendeeName: "" }));
    }
    if (fieldErr.phone) {
      const m = validatePhone(phone);
      if (!m) setFieldErr((s) => ({ ...s, phone: "" }));
    }
    if (fieldErr.note) {
      const m = validateNote(note);
      if (!m) setFieldErr((s) => ({ ...s, note: "" }));
    }
  }, [attendeeName, phone, note]); // eslint-disable-line react-hooks/exhaustive-deps

  // if locked, always enforce sum == lockedTickets
  useEffect(() => {
    if (!lockCounts || lockedTickets == null) return;
    setQty((s) => {
      const a = Math.max(0, Math.min(lockedTickets, Number(s.adult || 0)));
      const c = Math.max(0, lockedTickets - a);
      return { adult: a, child: c };
    });
  }, [lockCounts, lockedTickets]);

  const tickets = useMemo(
    () => Number(qty.adult || 0) + Number(qty.child || 0),
    [qty.adult, qty.child]
  );
  const total = useMemo(() => unitPrice * tickets, [unitPrice, tickets]);

  const bump = (type, delta) => {
    if (lockCounts) return; // locked by package
    setQty((s) => {
      const next = Math.max(0, Number(s[type] || 0) + delta);
      return { ...s, [type]: next };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    if (!attendeeName.trim() || !phone.trim()) {
      setErr("Name and phone are required");
      // run granular validation too (ADDED)
      validateAll();
      return;
    }
    // extra granular validation (ADDED)
    if (!validateAll()) {
      setErr("Please correct the highlighted fields");
      return;
    }
    if (tickets < 1) {
      setErr("Select at least one ticket");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        day: ymd(selectedDate),
        visitorType, // IMPORTANT: backend prices by visitor type (local/foreign)
        items: Object.entries(qty)
          .filter(([, q]) => Number(q) > 0)
          .map(([type, q]) => ({ type, qty: Number(q) })), // server sets prices
        attendeeName: attendeeName.trim(),
        phone: normalizePhone(phone.trim()),
        note: note.trim(),
      };

      const b = await createEntryBooking(payload);
      setOk("Booking created. Redirecting to payment");
      // pass unit price so payment page can show correct breakdown if needed
      const itemsForState = Object.entries(qty)
        .filter(([, q]) => Number(q) > 0)
        .map(([type, q]) => ({ type, qty: Number(q), unitPrice }));

      navigate(`/payments/entry/${b._id}`, {
        state: { day: payload.day, items: itemsForState, total, tickets, visitorType },
      });
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Booking failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute top-8 left-8 opacity-10 animate-pulse">
            <img
              src="../src/assets/logo.png"
              alt="Hasthi.lk Logo"
              className="h-35 w-35 object-contain shrink-0 rounded-full  p-1 shadow-md"
            />
          </div>
          <div className="absolute bottom-8 right-8 opacity-10 rotate-12">
            <img
              src="../src/assets/logo.png"
              alt="Hasthi.lk Logo"
              className="h-35 w-35 object-contain shrink-0 rounded-full  p-1 shadow-md"
            />
          </div>
          <div className="absolute top-1/2 left-1/4 opacity-5">
            <img
              src="../src/assets/logo.png"
              alt="Hasthi.lk Logo"
              className="h-35 w-35 object-contain shrink-0 rounded-full  p-1 shadow-md"
            />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4">
            <Ticket className="w-14 h-14 text-white" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">Book Entry Ticket</h1>
          </div>
          <p className="text-emerald-100 text-center mt-4 text-lg">
            Pick a date, choose visitor type, enter details, and proceed to secure payment
          </p>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Alerts */}
        {err && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div>{err}</div>
          </div>
        )}
        {ok && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <CheckCircle2 className="w-5 h-5 mt-0.5" />
            <div>{ok}</div>
          </div>
        )}

        <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Date card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900">Select date</h2>
              </div>
              <div className="rounded-xl border border-gray-200 p-2">
                <DatePicker
                  selected={selectedDate}
                  onChange={(d) => setSelectedDate(d || new Date())}
                  inline
                  minDate={new Date()}
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                />
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Selected: <span className="font-medium">{new Date(selectedDate).toDateString()}</span>
              </p>
            </div>
          </div>

          {/* Details + visitor + tickets */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attendee details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendee details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm text-gray-700">
                  <span className="flex items-center gap-2 font-medium">
                    <User className="w-4 h-4 text-emerald-600" />
                    Full name
                  </span>
                  <input
                    className={`mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${
                      fieldErr.attendeeName
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-emerald-500"
                    }`}
                    value={attendeeName}
                    onChange={(e) => {
                      setAttendeeName(e.target.value);
                    }}
                    onBlur={() =>
                      setFieldErr((s) => ({ ...s, attendeeName: validateName(attendeeName) }))
                    }
                    aria-invalid={Boolean(fieldErr.attendeeName) || undefined}
                    required
                  />
                  {fieldErr.attendeeName ? (
                    <p className="mt-1 text-xs text-red-600">{fieldErr.attendeeName}</p>
                  ) : null}
                </label>

                <label className="text-sm text-gray-700">
                  <span className="flex items-center gap-2 font-medium">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    Phone number
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="0712345678 or +94712345678"
                    className={`mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${
                      fieldErr.phone
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-emerald-500"
                    }`}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                    }}
                    onBlur={() => setFieldErr((s) => ({ ...s, phone: validatePhone(phone) }))}
                    aria-invalid={Boolean(fieldErr.phone) || undefined}
                    required
                  />
                  {fieldErr.phone ? (
                    <p className="mt-1 text-xs text-red-600">{fieldErr.phone}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">Sri Lankan numbers are preferred</p>
                  )}
                </label>

                <label className="md:col-span-2 text-sm text-gray-700">
                  <span className="flex items-center gap-2 font-medium">
                    <StickyNote className="w-4 h-4 text-emerald-600" />
                    Note (optional)
                  </span>
                  <input
                    className={`mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ${
                      fieldErr.note
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:ring-emerald-500"
                    }`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={() => setFieldErr((s) => ({ ...s, note: validateNote(note) }))}
                    placeholder="Message to staff (optional)"
                    maxLength={220}
                    aria-invalid={Boolean(fieldErr.note) || undefined}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    {fieldErr.note ? (
                      <p className="text-xs text-red-600">{fieldErr.note}</p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Up to 200 characters recommended
                      </p>
                    )}
                    <p className="text-xs text-gray-400">{`${note.length}/220`}</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Visitor type */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900">Visitor type</h2>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setVisitorType("local")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition ${
                    visitorType === "local"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Local (Rs. {money(VISITOR_PRICE.local)})
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorType("foreign")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition ${
                    visitorType === "foreign"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Foreign (Rs. {money(VISITOR_PRICE.foreign)})
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                One flat price per person based on visitor type. ID may be requested at entry.
              </p>
            </div>

            {/* Tickets */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Tickets</h2>
                {lockCounts && (
                  <span className="inline-flex items-center px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                    <Lock className="w-4 h-4 mr-1" />
                    Ticket amount locked ({lockedTickets})
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {Object.keys(LABELS).map((type) => (
                  <div
                    key={type}
                    className="flex items-center gap-4 rounded-xl border border-gray-200 p-4"
                  >
                    <div className="w-28 font-medium text-gray-900">{LABELS[type]}</div>
                    <div className="text-gray-600">
                      Price:&nbsp;<span className="font-medium">Rs. {money(unitPrice)}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => bump(type, -1)}
                        className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 disabled:opacity-60"
                        aria-label={`Decrease ${LABELS[type]}`}
                        disabled={lockCounts}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={qty[type]}
                        onChange={(e) => {
                          if (lockCounts) return;
                          setQty((s) => ({
                            ...s,
                            [type]: Math.max(0, Number(e.target.value || 0)),
                          }));
                        }}
                        className="w-16 rounded-lg border border-gray-300 px-3 py-2 text-center outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50"
                        disabled={lockCounts}
                      />
                      <button
                        type="button"
                        onClick={() => bump(type, +1)}
                        className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 disabled:opacity-60"
                        aria-label={`Increase ${LABELS[type]}`}
                        disabled={lockCounts}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white rounded-2xl shadow-lg p-6">
              <div className="text-gray-800">
                Visitor: <strong className="capitalize">{visitorType}</strong>
                <span className="mx-2 text-gray-400">|</span>
                Unit: <strong>Rs. {money(unitPrice)}</strong>
                <span className="mx-2 text-gray-400">|</span>
                Tickets: <strong>{tickets}</strong>
                <span className="mx-2 text-gray-400">|</span>
                Total: <strong>Rs. {money(total)}</strong>
              </div>
              <button
                type="submit"
                disabled={busy || tickets < 1}
                className="w-full md:w-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60"
              >
                {busy ? "Booking..." : "Book now"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
//--------------------------------------------------------
