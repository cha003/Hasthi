// client/src/pages/BookEvent.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  MapPin,
  User,
  Phone,
  MessageSquare,
  Ticket,
  Users,
  Clock,
  AlertCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { getEvent } from "../api/events";
import { createBooking } from "../api/bookings";

/* ---------- helpers ---------- */

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

function money(n) {
  return `Rs. ${new Intl.NumberFormat("en-LK").format(Number(n || 0))}`;
}
const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** Extract a numeric ticket price from the event object or a fallback hint. */
function extractEventUnitPrice(ev, unitHint) {
  // Try common/possible field paths
  const candidates = [
    ev?.ticketPrice,
    ev?.price,
    ev?.pricing?.ticket,
    ev?.pricing?.standard,
    ev?.ticket?.price,
    ev?.amount,
    ev?.fee,
  ];

  for (const c of candidates) {
    if (c == null) continue;
    const n =
      typeof c === "string"
        ? Number(c.replace(/[^\d.]/g, "")) // handles "Rs. 1,000" → 1000
        : Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }

  // fallback to package-provided hint if present
  if (Number.isFinite(Number(unitHint)) && Number(unitHint) > 0) {
    return Number(unitHint);
  }

  // if everything fails → 0 (free/unknown)
  return 0;
}

/* ---------- page ---------- */

export default function BookEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // If user came from QuickPackageBooking, quantity is locked and we may have a unit price hint
  const lockedQty =
    location.state?.lockQuantity && Number.isFinite(Number(location.state?.quantity))
      ? Number(location.state.quantity)
      : null;

  const unitHint = Number(location.state?.unitHint ?? 0);

  // data + form state
  const [ev, setEv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [tickets, setTickets] = useState(1);
  const [attendeeName, setAttendeeName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // load event
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await getEvent(id);
        if (!mounted) return;
        setEv(data);

        const remain = Number(data?.remainingSeats ?? 0);
        if (lockedQty != null && Number.isFinite(lockedQty) && lockedQty > 0) {
          setTickets(Math.max(0, Math.min(lockedQty, remain)));
        } else {
          setTickets(remain > 0 ? 1 : 0);
        }
      } catch (e) {
        if (mounted) setErr(e?.response?.data?.message || "Failed to load event");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, lockedQty]);

  // derived values (hooks BEFORE any early returns)
  const remaining = useMemo(() => Number(ev?.remainingSeats ?? 0), [ev]);
  const soldOut = useMemo(() => (ev?.status !== "active") || remaining <= 0, [ev, remaining]);

  // keep tickets in range (respect lock)
  useEffect(() => {
    setTickets((t) => {
      if (remaining <= 0) return 0;
      const base = lockedQty != null ? lockedQty : Number(t || 1);
      return Math.min(Math.max(1, base), remaining);
    });
  }, [remaining, lockedQty]);

  const updateTickets = (delta) => {
    if (lockedQty != null) return; // locked by package
    setTickets((prev) => {
      const next = Number(prev || 1) + delta;
      return Math.min(Math.max(1, next), Math.max(1, remaining));
    });
  };

  // Unit price: robust extraction from event or hint
  const unit = useMemo(() => extractEventUnitPrice(ev, unitHint), [ev, unitHint]);

  /* ---------- early returns (after all hooks) ---------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event…</p>
        </div>
      </div>
    );
  }

  if (!ev) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Event not found</h3>
          <p className="text-gray-600">{err || "This event may be unavailable."}</p>
          <button
            onClick={() => navigate("/calendar")}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Calendar
          </button>
        </div>
      </div>
    );
  }

  const totalCost = Number(tickets) * unit;

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 opacity-5">
          <ElephantIcon className="w-32 h-32 text-emerald-600" />
        </div>
        <div className="absolute bottom-20 right-10 opacity-5 rotate-12">
          <ElephantIcon className="w-24 h-24 text-teal-600" />
        </div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4">
        {/* Back */}
        <button
          onClick={() => navigate("/calendar")}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Calendar
        </button>

        {/* Event Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          {ev.image ? (
            <div className="h-64 bg-gradient-to-r from-emerald-600 to-teal-600 relative overflow-hidden">
              <img src={ev.image} alt={ev.title} className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-black/30"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h1 className="text-3xl font-bold mb-2">{ev.title}</h1>
                <div className="flex items-center gap-4 text-emerald-100">
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {fmtDate(ev.start)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {fmtTime(ev.start)} - {fmtTime(ev.end)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 border-b">
              <h1 className="text-3xl font-bold text-gray-900">{ev.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-gray-700">
                <div className="flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {fmtDate(ev.start)}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {fmtTime(ev.start)} - {fmtTime(ev.end)}
                </div>
              </div>
            </div>
          )}

          {/* Info Strip */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                  <MapPin className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Venue</div>
                  <div className="font-semibold">{ev.venue || "TBA"}</div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Capacity</div>
                  <div className="font-semibold">{ev.capacity} people</div>
                </div>
              </div>

              <div className="flex items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mr-3 ${
                    soldOut ? "bg-red-100" : remaining <= 10 ? "bg-orange-100" : "bg-green-100"
                  }`}
                >
                  <Ticket
                    className={`w-6 h-6 ${
                      soldOut ? "text-red-600" : remaining <= 10 ? "text-orange-600" : "text-green-600"
                    }`}
                  />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Available</div>
                  <div
                    className={`font-semibold ${
                      soldOut ? "text-red-600" : remaining <= 10 ? "text-orange-600" : "text-green-600"
                    }`}
                  >
                    {soldOut ? "Sold Out" : `${remaining} seats`}
                  </div>
                </div>
              </div>
            </div>

            {ev.description && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">About This Event</h3>
                <p className="text-gray-700 leading-relaxed">{ev.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Booking Form */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (soldOut) return;
            setBusy(true);
            setErr("");
            try {
              const payload = {
                eventId: id,
                tickets: Number(tickets),
                attendeeName: attendeeName.trim(),
                phone: phone.trim(),
                note: note.trim(),
              };
              const booking = await createBooking(payload);
              navigate(`/payments/${booking._id}`, {
                state: {
                  event: ev,
                  tickets: Number(tickets),
                  attendeeName: attendeeName.trim(),
                  phone: phone.trim(),
                },
              });
            } catch (e2) {
              const msg =
                e2?.response?.status === 409
                  ? e2?.response?.data?.message || "You already booked this event."
                  : e2?.response?.data?.message || "Booking failed";
              setErr(msg);
            } finally {
              setBusy(false);
            }
          }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Ticket className="w-6 h-6 text-emerald-600 mr-3" />
            Book Your Tickets
          </h2>

          {err && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{err}</span>
            </div>
          )}

          {soldOut ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-900 mb-2">Event Unavailable</h3>
              <p className="text-red-700">This event is either sold out or no longer accepting bookings.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Attendee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      required
                      placeholder="Your name"
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="07XXXXXXXX"
    
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tickets */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Number of Tickets</label>

                {lockedQty != null && (
                  <div className="mb-3 inline-flex items-center px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                    <Lock className="w-4 h-4 mr-2" />
                    Quantity locked by selected package: <b className="ml-1">{lockedQty}</b>
                  </div>
                )}

                <div className="flex items-center justify-between p-6 border border-gray-200 rounded-xl">
                  <div>
                    <div className="font-semibold text-gray-900">Event Tickets</div>
                    <div className="text-emerald-600 font-bold text-lg">
                      {money(unit)} per person
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => updateTickets(-1)}
                      disabled={lockedQty != null || tickets <= 1}
                      className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-emerald-500 hover:text-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-bold text-xl text-gray-900">{tickets}</span>
                    <button
                      type="button"
                      onClick={() => updateTickets(1)}
                      disabled={lockedQty != null || tickets >= remaining}
                      className="w-10 h-10 rounded-full border-2 border-emerald-500 bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 hover:border-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">Max {remaining} available</p>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <MessageSquare className="w-4 h-4 text-emerald-600 mr-2" />
                  Special Requests (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Any note for organizers…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Summary + Submit */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-center md:text-left">
                    <div className="text-sm text-gray-600 mb-1">Booking Summary</div>
                    <div className="text-lg">
                      <span className="font-semibold text-gray-900">{tickets}</span>
                      <span className="text-gray-600 mx-2">tickets •</span>
                      <span className="font-bold text-emerald-600 text-xl">
                        {money(totalCost)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                  >
                    {busy ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing…
                      </>
                    ) : (
                      <>
                        Continue to Payment
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer links */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <Link
            to="/bookings"
            className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <Ticket className="w-4 h-4 mr-2" /> My bookings
          </Link>
          {!soldOut && (
            <span className="inline-flex items-center text-gray-600">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> Secure checkout
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
