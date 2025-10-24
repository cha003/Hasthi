// client/src/pages/MyBookings.jsx
import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { myBookings, cancelBooking } from "../api/bookings";
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  CreditCard,
  X,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle,
  Heart,
  Users,
  Gift,
  Sparkles,
} from "lucide-react";

/* Brand icon */
const ElephantIcon = ({ className = "w-8 h-8", color = "currentColor" }) => (
  <svg viewBox="0 0 100 100" className={className} fill={color} aria-hidden="true">
    <path d="M20 60c0-15 10-25 25-25s25 10 25 25c0 8-3 15-8 20h-34c-5-5-8-12-8-20z"/>
    <circle cx="35" cy="55" r="2" fill="white"/>
    <path d="M15 65c-5 0-8 3-8 8s3 8 8 8c2 0 4-1 5-2"/>
    <path d="M45 40c-8-5-15-3-20 2"/>
    <circle cx="25" cy="75" r="8" opacity="0.1"/>
    <circle cx="55" cy="75" r="8" opacity="0.1"/>
  </svg>
);

function money(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
  })
    .format(Number(n || 0))
    .replace("LKR", "Rs.");
}

function statusLabel(b) {
  if (b.status === "cancelled") return "Cancelled";
  return b.paymentStatus === "paid" ? "Booked" : "Waiting for payment";
}
function getStatusColor(b) {
  if (b.status === "cancelled") return "text-red-600 bg-red-50";
  if (b.paymentStatus === "paid") return "text-emerald-600 bg-emerald-50";
  return "text-orange-600 bg-orange-50";
}
function getStatusIcon(b) {
  if (b.status === "cancelled") return <X className="w-4 h-4" />;
  if (b.paymentStatus === "paid") return <CheckCircle className="w-4 h-4" />;
  return <AlertCircle className="w-4 h-4" />;
}

/** ---------- Amount helpers (mirror your payment/ticket pages) ---------- */
function resolveQty(b) {
  const q = Number(b?.quantity ?? b?.tickets ?? 0);
  return Number.isFinite(q) && q > 0 ? q : 0;
}
function resolveUnit(b, ev) {
  // Prefer booking-captured prices
  const u1 = Number(b?.unitPrice);
  if (Number.isFinite(u1) && u1 > 0) return u1;
  const u2 = Number(b?.price);
  if (Number.isFinite(u2) && u2 > 0) return u2;

  // If a positive total exists, derive unit from total/qty
  const qty = resolveQty(b) || 1;
  const totalPersisted = Number(b?.total);
  if (Number.isFinite(totalPersisted) && totalPersisted > 0 && qty > 0) {
    return totalPersisted / qty;
  }

  // Fall back to event pricing
  const tp = Number(ev?.ticketPrice);
  if (Number.isFinite(tp) && tp > 0) return tp;
  const pr = Number(ev?.price);
  if (Number.isFinite(pr) && pr > 0) return pr;

  return 0;
}
function resolveTotal(b, ev) {
  const persisted = Number(b?.total);
  if (Number.isFinite(persisted) && persisted > 0) return persisted;
  const qty = resolveQty(b);
  const unit = resolveUnit(b, ev);
  return qty * unit;
}

export default function MyBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await myBookings(); // server returns bookings with event populated
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Stats (use the same total resolution to avoid zeros)
  const totals = useMemo(() => {
    const confirmed = rows.filter((b) => b.paymentStatus === "paid" && b.status !== "cancelled");
    const pending = rows.filter((b) => b.paymentStatus === "pending" && b.status !== "cancelled");

    const totalSpent = confirmed.reduce((sum, b) => {
      const ev = typeof b.event === "object" ? b.event : null;
      return sum + resolveTotal(b, ev);
    }, 0);

    return {
      totalBookings: rows.length,
      confirmedBookings: confirmed.length,
      pendingPayments: pending.length,
      totalSpent,
    };
  }, [rows]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute top-8 left-8 opacity-10 animate-pulse">
            <ElephantIcon className="w-24 h-24 text-white" />
          </div>
          <div className="absolute bottom-8 right-8 opacity-10 rotate-12">
            <ElephantIcon className="w-32 h-32 text-white" />
          </div>
          <div className="absolute top-1/2 left-1/4 opacity-5">
            <ElephantIcon className="w-40 h-40 text-white" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Ticket className="w-16 h-16 text-white mr-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-white">My Bookings</h1>
            </div>
            <p className="text-xl text-emerald-100 mb-8 max-w-3xl mx-auto">
              Track your elephant conservation event bookings and support our mission
            </p>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-emerald-500">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{totals.totalBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-gray-900">{totals.confirmedBookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Payment</p>
                <p className="text-2xl font-bold text-gray-900">{totals.pendingPayments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Contributed</p>
                <p className="text-2xl font-bold text-gray-900">{money(totals.totalSpent)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ElephantIcon className="w-8 h-8 text-emerald-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Your Conservation Journey</h2>
                <p className="text-gray-600">Every booking supports elephant welfare and conservation</p>
              </div>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Table / Cards */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading your bookings...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <ElephantIcon className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No bookings yet</h3>
            <p className="text-gray-600 mb-8">Start your conservation journey by booking your first event</p>
            <div className="space-y-4">
              <div className="flex items-center justify-center text-gray-500">
                <Heart className="w-5 h-5 text-emerald-500 mr-3" />
                <span>Support elephant welfare through our events</span>
              </div>
              <div className="flex items-center justify-center text-gray-500">
                <Users className="w-5 h-5 text-emerald-500 mr-3" />
                <span>Join our community of conservationists</span>
              </div>
              <div className="flex items-center justify-center text-gray-500">
                <Sparkles className="w-5 h-5 text-emerald-500 mr-3" />
                <span>Make a real difference in conservation</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Event Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Tickets</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((b, index) => {
                    const ev = typeof b.event === "object" ? b.event : null;
                    const qty = resolveQty(b);
                    const total = resolveTotal(b, ev);

                    const canCancel =
                      b.status !== "cancelled" &&
                      b.paymentStatus !== "paid" &&
                      ev &&
                      new Date(ev.start).getTime() > Date.now();

                    const canPay = b.status !== "cancelled" && b.paymentStatus !== "paid";
                    const canViewTicket = b.paymentStatus === "paid" && b.status === "booked";

                    return (
                      <tr key={b._id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mr-4">
                              <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {ev?.title || "(deleted event)"}
                              </p>
                              {ev?.venue && (
                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  {ev.venue}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {ev ? (
                            <div className="text-sm">
                              <div className="flex items-center text-gray-900 mb-1">
                                <Clock className="w-4 h-4 mr-2 text-emerald-500" />
                                <span className="font-medium">Start:</span>
                              </div>
                              <div className="text-gray-600 ml-6 mb-2">
                                {new Date(ev.start).toLocaleString()}
                              </div>
                              <div className="flex items-center text-gray-900 mb-1">
                                <Clock className="w-4 h-4 mr-2 text-emerald-500" />
                                <span className="font-medium">End:</span>
                              </div>
                              <div className="text-gray-600 ml-6">
                                {new Date(ev.end).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
                            <Ticket className="w-4 h-4 mr-1" />
                            {qty}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-lg font-semibold text-gray-900">{money(total)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(b)}`}>
                            {getStatusIcon(b)}
                            <span className="ml-1">{statusLabel(b)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {canCancel && (
                              <button
                                onClick={async () => {
                                  if (!confirm("Cancel this booking?")) return;
                                  try {
                                    await cancelBooking(b._id);
                                    await load();
                                  } catch (e) {
                                    alert(e?.response?.data?.message || "Cancel failed");
                                  }
                                }}
                                className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                              >
                                <X className="w-4 h-4 mr-1 inline" />
                                Cancel
                              </button>
                            )}

                            {canPay && (
                              <Link to={`/payments/${b._id}`}>
                                <button className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all text-sm font-medium shadow-md hover:shadow-lg">
                                  <CreditCard className="w-4 h-4 mr-1 inline" />
                                  Pay Now
                                </button>
                              </Link>
                            )}

                            {canViewTicket && (
                              <button
                                onClick={() => nav(`/tickets/${b._id}`)}
                                className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                              >
                                <Eye className="w-4 h-4 mr-1 inline" />
                                View E-Ticket
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="lg:hidden">
              {rows.map((b) => {
                const ev = typeof b.event === "object" ? b.event : null;
                const qty = resolveQty(b);
                const total = resolveTotal(b, ev);

                const canCancel =
                  b.status !== "cancelled" &&
                  b.paymentStatus !== "paid" &&
                  ev &&
                  new Date(ev.start).getTime() > Date.now();

                const canPay = b.status !== "cancelled" && b.paymentStatus !== "paid";
                const canViewTicket = b.paymentStatus === "paid" && b.status === "booked";

                return (
                  <div key={b._id} className="border-b border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mr-4">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {ev?.title || "(deleted event)"}
                          </h3>
                          {ev?.venue && (
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <MapPin className="w-4 h-4 mr-1" />
                              {ev.venue}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(b)}`}>
                        {getStatusIcon(b)}
                        <span className="ml-1">{statusLabel(b)}</span>
                      </div>
                    </div>

                    {ev && (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-2 text-emerald-500" />
                          <span>Start: {new Date(ev.start).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-2 text-emerald-500" />
                          <span>End: {new Date(ev.end).toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Ticket className="w-5 h-5 mr-2 text-emerald-500" />
                        <span className="text-sm text-gray-600">{qty} tickets</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-900">{money(total)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canCancel && (
                        <button
                          onClick={async () => {
                            if (!confirm("Cancel this booking?")) return;
                            try {
                              await cancelBooking(b._id);
                              await load();
                            } catch (e) {
                              alert(e?.response?.data?.message || "Cancel failed");
                            }
                          }}
                          className="flex items-center px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel Booking
                        </button>
                      )}

                      {canPay && (
                        <Link to={`/payments/${b._id}`}>
                          <button className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all text-sm font-medium shadow-md hover:shadow-lg">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay Now
                          </button>
                        </Link>
                      )}

                      {canViewTicket && (
                        <button
                          onClick={() => nav(`/tickets/${b._id}`)}
                          className="flex items-center px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View E-Ticket
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Support message */}
        {rows.length > 0 && (
          <div className="text-center bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-12 text-white mt-8">
            <ElephantIcon className="w-20 h-20 text-white mx-auto mb-6 opacity-90" />
            <h3 className="text-3xl font-bold mb-4">Thank You for Your Support</h3>
            <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
              Your bookings directly contribute to elephant welfare and conservation efforts.
            </p>
            <div className="flex items-center justify-center space-x-8 mt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totals.confirmedBookings}</div>
                <div className="text-emerald-200 text-sm">Events Supported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{money(totals.totalSpent)}</div>
                <div className="text-emerald-200 text-sm">Total Contribution</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
