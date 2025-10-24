// client/src/pages/TicketPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getBooking, getTicketToken } from "../api/bookings";
import QRCode from "react-qr-code";
import {
  Ticket,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Download,
  Share2,
  CheckCircle,
  AlertCircle,
  Heart,
  Gift,
  Sparkles,
} from "lucide-react";

function money(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
  })
    .format(Number(n || 0))
    .replace("LKR", "Rs.");
}

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

export default function TicketPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [qrValue, setQrValue] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const b = await getBooking(id);
        if (!alive) return;

        if (b.status !== "booked" || b.paymentStatus !== "paid") {
          setErr("Ticket unavailable. Booking is unpaid or cancelled.");
          setLoading(false);
          return;
        }
        setBooking(b);

        // IMPORTANT: Use the raw token for the QR (your validator expects the token)
        const { token } = await getTicketToken(id);
        if (!alive) return;
        setQrValue(String(token || "")); // do NOT wrap as URL
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load ticket");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading your ticket...</p>
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ticket Unavailable</h2>
            <p className="text-red-600 mb-8">{err}</p>
            <Link to="/bookings">
              <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium shadow-lg hover:shadow-xl">
                Back to My Bookings
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ticket Not Found</h2>
            <p className="text-gray-600 mb-8">The ticket you are looking for does not exist.</p>
            <Link to="/bookings">
              <button className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium shadow-lg hover:shadow-xl">
                Back to My Bookings
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ev = typeof booking.event === "object" ? booking.event || {} : {};
  const qtyRaw = Number(booking.quantity ?? booking.tickets ?? 1);
  const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;

  // Robust, positive price resolution (mirror server logic)
  const unitFromBooking = (() => {
    const u1 = Number(booking.unitPrice);
    if (Number.isFinite(u1) && u1 > 0) return u1;
    const u2 = Number(booking.price);
    if (Number.isFinite(u2) && u2 > 0) return u2;
    return 0;
  })();

  const totalPersisted = Number(booking.total);
  const unitDerivedFromTotal = (Number.isFinite(totalPersisted) && totalPersisted > 0 && qty > 0)
    ? totalPersisted / qty
    : 0;

  const unitFromEvent = (() => {
    const tp = Number(ev.ticketPrice);
    if (Number.isFinite(tp) && tp > 0) return tp;
    const pr = Number(ev.price);
    if (Number.isFinite(pr) && pr > 0) return pr;
    return 0;
  })();

  const unit = unitFromBooking || unitDerivedFromTotal || unitFromEvent || 0;
  const total = (Number.isFinite(totalPersisted) && totalPersisted > 0)
    ? totalPersisted
    : qty * unit;

  const eventDate = ev.start ? new Date(ev.start) : null;
  const isUpcoming = eventDate ? eventDate.getTime() > Date.now() : false;

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
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <Link to="/bookings">
              <button className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all border border-white/30">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Bookings
              </button>
            </Link>
            <div className="flex space-x-3">
              <button className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all border border-white/30" title="Download">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all border border-white/30" title="Share">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Ticket className="w-16 h-16 text-white mr-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-white">E-Ticket</h1>
            </div>
            <div className="inline-flex items-center px-4 py-2 bg-green-500/20 backdrop-blur-sm rounded-full border border-green-400/30">
              <CheckCircle className="w-5 h-5 text-green-300 mr-2" />
              <span className="text-green-100 font-medium">Confirmed & Paid</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-8">
          {/* Ticket header strip */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ElephantIcon className="w-12 h-12 text-white mr-4" />
                <div>
                  <h2 className="text-2xl font-bold text-white">{ev.title || "Event"}</h2>
                  <p className="text-emerald-100">Hasthi.lk Conservation Event</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white/80 text-sm">Booking ID</div>
                <div className="text-white font-mono text-lg">{String(booking._id).slice(-8).toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* Ticket body */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>
                  <div className="space-y-4">
                    {ev.start && ev.end && (
                      <div className="flex items-start">
                        <Clock className="w-5 h-5 text-emerald-600 mr-3 mt-1" />
                        <div>
                          <div className="font-medium text-gray-900">Date & Time</div>
                          <div className="text-sm text-gray-600">
                            <div>
                              {new Date(ev.start).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                            <div className="mt-1">
                              {new Date(ev.start).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              -{" "}
                              {new Date(ev.end).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {ev.venue && (
                      <div className="flex items-start">
                        <MapPin className="w-5 h-5 text-emerald-600 mr-3 mt-1" />
                        <div>
                          <div className="font-medium text-gray-900">Venue</div>
                          <div className="text-sm text-gray-600">{ev.venue}</div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start">
                      <Users className="w-5 h-5 text-emerald-600 mr-3 mt-1" />
                      <div>
                        <div className="font-medium text-gray-900">Attendees</div>
                        <div className="text-sm text-gray-600">
                          {qty} {qty === 1 ? "person" : "people"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Booking Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ticket Price</span>
                      <span className="font-medium">{money(unit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity</span>
                      <span className="font-medium">{qty}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-900">Total Amount</span>
                        <span className="font-bold text-xl text-emerald-600">{money(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status callout */}
                <div
                  className={`p-4 rounded-xl border-2 ${
                    isUpcoming ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center">
                    <CalendarIcon
                      className={`w-5 h-5 mr-3 ${isUpcoming ? "text-blue-600" : "text-gray-500"}`}
                    />
                    <div>
                      <div className={`font-medium ${isUpcoming ? "text-blue-900" : "text-gray-900"}`}>
                        {isUpcoming ? "Upcoming Event" : "Past Event"}
                      </div>
                      <div className={`text-sm ${isUpcoming ? "text-blue-600" : "text-gray-600"}`}>
                        {isUpcoming
                          ? "Present this ticket at the venue entrance"
                          : "Thank you for supporting elephant conservation"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR */}
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Entry QR Code</h3>
                <div className="bg-gray-50 p-8 rounded-2xl border-2 border-dashed border-gray-300 mb-4">
                  {qrValue ? (
                    <QRCode value={qrValue} size={240} />
                  ) : (
                    <div className="flex items-center justify-center w-60 h-60">
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Generating QR Code...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Scan this QR code at the entrance</p>
                  <p className="text-xs text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded">
                    ID: {booking._id}
                  </p>
                </div>

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-900 mb-1">Important Notice</h4>
                      <ul className="text-sm text-amber-800 space-y-1">
                        <li>• Arrive 15 minutes before the event starts</li>
                        <li>• Bring a valid ID for verification</li>
                        <li>• This ticket is non-transferable</li>
                        <li>• Screenshot or printed version accepted</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer strip */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 mt-8 rounded-b-2xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Heart className="w-4 h-4 text-emerald-500 mr-2" />
                  <span>Your contribution supports elephant welfare and conservation</span>
                </div>
                <div className="text-sm text-gray-500">
                  Booked on {new Date(booking.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Link to="/bookings">
            <button className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to My Bookings
            </button>
          </Link>
          <button
            onClick={() => navigate("/calendar")}
            className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center"
          >
            <CalendarIcon className="w-5 h-5 mr-2" />
            View Calendar
          </button>
        </div>

        {/* Conservation message */}
        <div className="text-center bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white">
          <ElephantIcon className="w-16 h-16 text-white mx-auto mb-4 opacity-90" />
          <h3 className="text-2xl font-bold mb-2">Thank You for Supporting Conservation</h3>
          <p className="text-emerald-100 max-w-2xl mx-auto">
            Your ticket purchase directly contributes to the care and protection of Sri Lanka’s elephants.
          </p>
          <div className="flex items-center justify-center space-x-6 mt-6">
            <div className="flex items-center">
              <Gift className="w-5 h-5 text-emerald-300 mr-2" />
              <span className="text-emerald-100 text-sm">Direct Impact</span>
            </div>
            <div className="flex items-center">
              <Sparkles className="w-5 h-5 text-emerald-300 mr-2" />
              <span className="text-emerald-100 text-sm">Transparent Use</span>
            </div>
            <div className="flex items-center">
              <Heart className="w-5 h-5 text-emerald-300 mr-2" />
              <span className="text-emerald-100 text-sm">Meaningful Change</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
