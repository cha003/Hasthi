import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import {
  CreditCard, Calendar, Ticket, CheckCircle, XCircle,
  Clock, Users, AlertCircle, ArrowRight, QrCode as QrCodeIcon
} from "lucide-react";

import { getEntryBooking, getEntryTicketToken } from "../api/entry";
import { createEntryCheckout, confirmEntryPayment } from "../api/payments";

function money(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0
  }).format(Number(n || 0)).replace("LKR", "Rs.");
}

const TICKET_LABELS = {
  adult: "Adult Ticket",
  child: "Child Ticket",
};

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

export default function PaymentEntryPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { search, state } = useLocation();
  const qs = new URLSearchParams(search);

  const [booking, setBooking] = useState(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Ensure we only hit confirm endpoint once
  const didConfirm = useRef(false);

  // Load booking initially
  useEffect(() => {
    let stop = false;

    const load = async () => {
      try {
        const b = await getEntryBooking(id);
        if (!stop) setBooking(b);
      } catch (e) {
        if (!stop) setErr(e?.response?.data?.message || "Failed to load booking");
      }
    };

    load();
    return () => { stop = true; };
  }, [id]);

  // If returning from Stripe with ok=1, confirm on backend using session_id
  useEffect(() => {
    const ok = qs.get("ok") === "1";
    const sessionId = qs.get("session_id");

    if (!ok || !sessionId || didConfirm.current) return;
    didConfirm.current = true;

    (async () => {
      try {
        setVerifying(true);
        await confirmEntryPayment(id, sessionId); // marks booking as paid server-side
      } catch (e) {
        // If confirm fails (e.g., webhook delay), we’ll still poll below
      } finally {
        try {
          const b = await getEntryBooking(id);
          setBooking(b);
        } catch {}
        setVerifying(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, search]);

  // Lightweight polling fallback (handles race if Stripe takes a second)
  useEffect(() => {
    if (qs.get("ok") !== "1") return;
    let stop = false;

    (async () => {
      const delays = [800, 1200, 2000, 3000, 5000];
      for (const t of delays) {
        await new Promise(r => setTimeout(r, t));
        if (stop) return;
        try {
          const b = await getEntryBooking(id);
          setBooking(b);
          if (b.paymentStatus === "paid") break;
        } catch {}
      }
    })();

    return () => { stop = true; };
  }, [id, search]);

  // Items & totals (fallback to navigation state on first render)
  const items = useMemo(() => {
    if (booking?.items?.length) return booking.items;
    return state?.items || [];
  }, [booking, state]);

  const total = useMemo(() => {
    if (typeof booking?.total === "number") return booking.total;
    return state?.total ?? items.reduce((s, it) => s + Number(it.unitPrice || 0) * Number(it.qty || 0), 0);
  }, [booking, state, items]);

  const tickets = booking?.tickets ?? state?.tickets ?? 0;
  const paid = booking?.paymentStatus === "paid";
  const cancelled = booking?.status === "cancelled";

  // Fetch QR token once we are paid
  useEffect(() => {
    if (!paid || !booking || token) return;
    setLoadingToken(true);
    (async () => {
      try {
        const { token: newToken } = await getEntryTicketToken(id);
        setToken(newToken);
      } catch {
        // silently ignore
      } finally {
        setLoadingToken(false);
      }
    })();
  }, [paid, booking, id, token]);

  const pay = async () => {
    setBusy(true);
    setErr("");
    try {
      const { url } = await createEntryCheckout(id);
      window.location.href = url; // Stripe Checkout
    } catch (e) {
      setErr(e?.response?.data?.message || "Payment init failed");
    } finally {
      setBusy(false);
    }
  };

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          {err ? (
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Booking</h3>
              <p className="text-gray-600">{err}</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading booking details...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                paid
                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                  : cancelled
                  ? "bg-gradient-to-r from-red-500 to-pink-500"
                  : "bg-gradient-to-r from-blue-500 to-purple-500"
              }`}
            >
              {paid ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : cancelled ? (
                <XCircle className="w-8 h-8 text-white" />
              ) : (
                <CreditCard className="w-8 h-8 text-white" />
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {paid ? "Payment Confirmed!" : cancelled ? "Booking Cancelled" : "Complete Your Payment"}
          </h1>

          <div className="flex items-center justify-center gap-4 text-gray-600">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(booking.day).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {tickets} {tickets === 1 ? "ticket" : "tickets"}
            </div>
          </div>

          {qs.get("ok") === "1" && !paid && !cancelled && (
            <div className="mt-3 inline-flex items-center justify-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Clock className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">
                Payment completed. Confirming{verifying ? "…" : "…"}
              </span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Booking Summary Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
                <h2 className="text-xl font-semibold mb-2 flex items-center">
                  <Ticket className="w-6 h-6 mr-2" />
                  Booking Summary
                </h2>
                <div className="text-emerald-100">
                  Booking ID: #{String(booking._id || id).slice(-8).toUpperCase()}
                </div>
              </div>

              {/* Items Table */}
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 text-gray-700 font-semibold">Ticket Type</th>
                        <th className="text-center py-3 text-gray-700 font-semibold">Quantity</th>
                        <th className="text-right py-3 text-gray-700 font-semibold">Unit Price</th>
                        <th className="text-right py-3 text-gray-700 font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(booking.items ?? items).map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="py-4">
                            <div className="font-medium text-gray-900">
                              {TICKET_LABELS[item.type] || String(item.type).toUpperCase()}
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                              {item.qty}
                            </span>
                          </td>
                          <td className="py-4 text-right text-gray-600">{money(item.unitPrice)}</td>
                          <td className="py-4 text-right font-semibold text-gray-900">
                            {money((item.qty || 0) * (item.unitPrice || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan={3} className="py-4 text-right font-semibold text-lg text-gray-900">
                          Total Amount:
                        </td>
                        <td className="py-4 text-right font-bold text-2xl text-emerald-600">
                          {money(typeof booking.total === "number" ? booking.total : total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Payment / Status Panel */}
          <div className="lg:col-span-1">
            {err && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-red-700 font-medium">{err}</span>
                </div>
              </div>
            )}

            {!paid && !cancelled && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                  Payment Required
                </h3>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-blue-700 mb-2">Amount to Pay</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {money(typeof booking.total === "number" ? booking.total : total)}
                    </div>
                  </div>

                  <button
                    onClick={pay}
                    disabled={busy}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                  >
                    {busy ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <CreditCard className="w-5 h-5 mr-2" />
                        Pay with Card
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </div>
                    )}
                  </button>

                  {qs.get("ok") === "1" && (
                    <div className="flex items-center justify-center text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <Clock className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">Payment completed. Confirming...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {cancelled && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <div className="text-center">
                  <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Booking Cancelled</h3>
                  <p className="text-red-700 text-sm">This booking has been cancelled and payment is no longer available.</p>
                </div>
              </div>
            )}

            {paid && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <div className="text-center mb-6">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Payment Successful!</h3>
                  <p className="text-green-700 text-sm">Your e-ticket is ready for use.</p>
                </div>

                <div className="bg-white rounded-xl border-2 border-dashed border-green-300 p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center justify-center">
                    <QrCodeIcon className="w-5 h-5 mr-2" />
                    Your E-Ticket
                  </h4>

                  <div className="flex justify-center mb-4">
                    {loadingToken ? (
                      <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : token ? (
                      <div className="p-4 bg-white rounded-lg border">
                        <QRCode value={token} size={180} />
                      </div>
                    ) : (
                      <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
                        Preparing QR Code...
                      </div>
                    )}
                  </div>

                  <div className="text-center text-sm text-gray-600 mb-4">
                    Show this QR code at the entrance gate on{" "}
                    <span className="font-semibold">{new Date(booking.day).toLocaleDateString()}</span>
                  </div>

                  <button
                    onClick={() => nav("/entry/my")}
                    className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                  >
                    View All My Bookings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8 bg-white bg-opacity-80 backdrop-blur-sm rounded-xl p-6 border border-white">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <ElephantIcon className="w-5 h-5 text-emerald-600 mr-2" />
            Important Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>• Tickets are valid for the selected date only</div>
            <div>• Gates open at 8:00 AM daily</div>
            <div>• Last entry is at 4:00 PM</div>
            <div>• Please bring a valid ID for verification</div>
            <div>• Photography guidelines apply</div>
            <div>• Refunds available up to 24 hours before</div>
          </div>
        </div>
      </div>
    </div>
  );
}
