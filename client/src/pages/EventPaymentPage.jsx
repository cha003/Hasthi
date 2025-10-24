import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import {
  CreditCard, Calendar as CalendarIcon, Ticket, CheckCircle, XCircle,
  Clock, AlertCircle, ArrowRight, MapPin, Download, QrCode as QrCodeIcon
} from "lucide-react";

import { getBooking, getTicketToken } from "../api/bookings";
import { getEvent } from "../api/events";
import { createEventCheckout, confirmEventPayment } from "../api/payments";

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
    minimumFractionDigits: 0
  }).format(Number(n || 0)).replace("LKR", "Rs.");
}

function getEventId(val) {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val._id) return String(val._id);
  return null;
}

export default function EventPaymentPage() {
  const { id } = useParams(); // booking id
  const nav = useNavigate();
  const { search } = useLocation();
  const qs = new URLSearchParams(search);

  const [booking, setBooking] = useState(null);
  const [event, setEvent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [verifying, setVerifying] = useState(false);
  const didConfirm = useRef(false);

  // QR token
  const [token, setToken] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);
  const qrRef = useRef(null);

  // Load booking + event
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const b = await getBooking(id);
        if (stop) return;
        setBooking(b);

        if (b?.event && typeof b.event === "object") {
          setEvent(b.event);
        } else {
          const evId = getEventId(b?.event);
          if (evId) {
            try {
              const ev = await getEvent(evId);
              if (!stop) setEvent(ev);
            } catch {
              if (!stop) setEvent(null);
            }
          } else {
            setEvent(null);
          }
        }
      } catch (e) {
        if (!stop) setErr(e?.response?.data?.message || "Failed to load booking");
      }
    })();
    return () => { stop = true; };
  }, [id]);

  // Confirm after Stripe redirect
  useEffect(() => {
    const ok = qs.get("ok") === "1";
    const sessionId = qs.get("session_id");
    if (!ok || !sessionId || didConfirm.current) return;

    didConfirm.current = true;
    (async () => {
      try {
        setVerifying(true);
        await confirmEventPayment(id, sessionId);
      } catch {
      } finally {
        try {
          const b = await getBooking(id);
          setBooking(b);
        } catch {}
        setVerifying(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, search]);

  // Poll as fallback while Stripe settles
  useEffect(() => {
    if (qs.get("ok") !== "1") return;
    let stop = false;
    (async () => {
      const delays = [800, 1200, 2000, 3000, 5000];
      for (const t of delays) {
        await new Promise(r => setTimeout(r, t));
        if (stop) return;
        try {
          const b = await getBooking(id);
          setBooking(b);
          if (b.paymentStatus === "paid") break;
        } catch {}
      }
    })();
    return () => { stop = true; };
  }, [id, search]);

  // Quantity (supports legacy `tickets`)
  const qty = useMemo(() => {
    const q = Number(booking?.quantity ?? booking?.tickets ?? 1);
    return Number.isFinite(q) && q > 0 ? q : 1;
  }, [booking]);

  // Unit price (event -> booking -> derive)
  const unit = useMemo(() => {
    const p1 = Number(event?.ticketPrice);
    if (Number.isFinite(p1) && p1 > 0) return p1;
    const p2 = Number(event?.price);
    if (Number.isFinite(p2) && p2 > 0) return p2;
    const p3 = Number(booking?.unitPrice);
    if (Number.isFinite(p3) && p3 > 0) return p3;
    const p4 = Number(booking?.price);
    if (Number.isFinite(p4) && p4 > 0) return p4;
    const persistedTotal = Number(booking?.total);
    if (Number.isFinite(persistedTotal) && persistedTotal > 0 && qty > 0) return persistedTotal / qty;
    return 0;
  }, [event, booking, qty]);

  // Total prefers persisted booking.total
  const total = useMemo(() => {
    const persisted = booking?.total;
    if (typeof persisted === "number" && Number.isFinite(persisted) && persisted > 0) return persisted;
    return qty * unit;
  }, [booking, qty, unit]);

  const paid = booking?.paymentStatus === "paid";
  const cancelled = booking?.status === "cancelled";

  // ✅ Robust “missing price” check: only true if ANY of total/unit/qty are not positive numbers
  const missingPrice =
    !Number.isFinite(total) || total <= 0 ||
    !Number.isFinite(unit)  || unit  <= 0 ||
    !Number.isFinite(qty)   || qty   <= 0;

  // Fetch QR token once paid
  useEffect(() => {
    if (!paid || !booking || token) return;
    setLoadingToken(true);
    (async () => {
      try {
        const { token: newToken } = await getTicketToken(booking._id);
        setToken(newToken);
      } catch {
      } finally {
        setLoadingToken(false);
      }
    })();
  }, [paid, booking, token]);

  // Start Stripe checkout (send overrides so server never rejects)
  const pay = async () => {
    setBusy(true);
    setErr("");
    try {
      const { url } = await createEventCheckout(id, {
        qtyOverride: qty,
        unitOverride: unit,
        totalOverride: total,
      });
      window.location.href = url;
    } catch (e) {
      setErr(e?.response?.data?.message || "Payment init failed");
    } finally {
      setBusy(false);
    }
  };

  // --- PDF helpers ---
  function svgToPngDataUrl(svgEl, size = 560, bg = "#ffffff") {
    return new Promise((resolve) => {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = url;
    });
  }

  async function downloadTicketPDF() {
    if (!paid || !token || !qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const pngDataUrl = await svgToPngDataUrl(svg, 560, "#ffffff");

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageW, 72, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("Hasthi.lk Event E-Ticket", 32, 45);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);

    const idShort = (booking?._id || "").slice(-8).toUpperCase();
    const title = event?.title || "Event";
    const venue = event?.venue || "-";
    const startStr = event?.start ? new Date(event.start).toLocaleString() : "-";
    const endStr = event?.end ? new Date(event.end).toLocaleString() : "-";
    const createdStr = booking?.createdAt ? new Date(booking.createdAt).toLocaleString() : "-";

    let y = 120;
    doc.text(`Booking ID: ${idShort}`, 32, y); y += 22;
    doc.text(`Event: ${title}`, 32, y); y += 22;
    doc.text(`Venue: ${venue}`, 32, y); y += 22;
    doc.text(`Start: ${startStr}`, 32, y); y += 22;
    doc.text(`End: ${endStr}`, 32, y); y += 22;
    doc.text(`Quantity: ${qty}`, 32, y); y += 22;
    doc.text(`Total: ${money(total)}`, 32, y); y += 22;
    doc.text(`Booked on: ${createdStr}`, 32, y);

    const qrSize = 280;
    const qrX = pageW - qrSize - 32;
    const qrY = 102;
    doc.addImage(pngDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Present this ticket QR at the venue entrance. Thank you for supporting conservation.",
      32,
      pageH - 40
    );

    doc.save(`hasthi-event-${idShort}.pdf`);
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          {err ? (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Error</h3>
              <p className="text-gray-600">{err}</p>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading booking…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const paidHeader = paid ? "Payment Confirmed!" :
                    cancelled ? "Booking Cancelled" :
                    "Complete Your Payment";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8">
      <div className="relative max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg
                ${paid ? "bg-gradient-to-r from-green-500 to-emerald-500"
                      : cancelled ? "bg-gradient-to-r from-red-500 to-pink-500"
                      : "bg-gradient-to-r from-blue-500 to-purple-500"}`}
            >
              {paid ? <CheckCircle className="w-8 h-8 text-white" /> :
               cancelled ? <XCircle className="w-8 h-8 text-white" /> :
               <CreditCard className="w-8 h-8 text-white" />}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{paidHeader}</h1>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-gray-700">
            <div className="flex items-center">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {event?.title || "Event"}
            </div>
            {event?.start && (
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {new Date(event.start).toLocaleString()}
              </div>
            )}
            <div className="flex items-center">
              <Ticket className="w-4 h-4 mr-2" />
              {qty} {qty === 1 ? "ticket" : "tickets"}
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

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
                <h2 className="text-xl font-semibold mb-1 flex items-center">
                  <Ticket className="w-6 h-6 mr-2" />
                  Booking Summary
                </h2>
                <div className="text-emerald-100">
                  Booking ID: #{String(booking._id || "").slice(-8).toUpperCase()}
                </div>
              </div>

              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 text-gray-700 font-semibold">Item</th>
                        <th className="text-right py-3 text-gray-700 font-semibold">Qty</th>
                        <th className="text-right py-3 text-gray-700 font-semibold">Unit</th>
                        <th className="text-right py-3 text-gray-700 font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr className="hover:bg-gray-50">
                        <td className="py-3">
                          <div className="font-medium text-gray-900">
                            {event?.title || "Event ticket"}
                            {event?.venue && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {event.venue}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-right text-gray-700">{qty}</td>
                        <td className="py-3 text-right text-gray-600">{money(unit)}</td>
                        <td className="py-3 text-right font-semibold text-gray-900">{money(qty * unit)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan={3} className="py-4 text-right font-semibold text-lg text-gray-900">
                          Total Amount:
                        </td>
                        <td className="py-4 text-right font-bold text-2xl text-emerald-600">
                          {money(total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {!paid && !cancelled && missingPrice && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
                    <AlertCircle className="w-5 h-5 text-amber-600 mr-2 mt-0.5" />
                    <div className="text-amber-800 text-sm">
                      This event has no valid ticket price yet. Please contact an admin to set{" "}
                      <code>ticketPrice</code> (or <code>price</code>) for the event.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="lg:col-span-1">
            {err && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
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
                    <div className="text-sm text-blue-700 mb-1">Amount to Pay</div>
                    <div className="text-2xl font-bold text-blue-900">{money(total)}</div>
                  </div>

                  <button
                    onClick={pay}
                    disabled={busy || missingPrice}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                  >
                    {busy ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing…
                      </>
                    ) : (
                      <>
                        Pay with Card
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </button>

                  {qs.get("ok") === "1" && (
                    <div className="flex items-center justify-center text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <Clock className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">
                        Payment completed. Confirming…
                      </span>
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
                  <p className="text-red-700 text-sm">This booking has been cancelled and payment is disabled.</p>
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

                  <div className="flex justify-center mb-4" ref={qrRef}>
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
                    Present this QR at the venue entrance.
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={downloadTicketPDF}
                      disabled={!token}
                      className="w-full inline-flex items-center justify-center bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60"
                      title="Download PDF Ticket"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF Ticket
                    </button>
                    <button
                      className="w-full bg-white text-emerald-700 border border-emerald-300 py-3 px-4 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
                      onClick={() => nav("/bookings")}
                    >
                      Go to My Bookings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Helpful info */}
        <div className="mt-8 bg-white bg-opacity-80 backdrop-blur-sm rounded-xl p-6 border border-white">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
            <ElephantIcon className="w-5 h-5 text-emerald-600 mr-2" />
            Payment Notes
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
            <div>• Seats are secured after successful payment</div>
            <div>• You’ll see this ticket under “My Bookings”</div>
            <div>• If the page doesn’t update, refresh after a minute</div>
            <div>• For issues, contact support with your booking ID</div>
          </div>
        </div>
      </div>
    </div>
  );
}
