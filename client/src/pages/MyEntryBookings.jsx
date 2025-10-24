// client/src/pages/MyEntryBookings.jsx
import { useEffect, useRef, useState } from "react";
import { myEntryBookings, cancelEntryBooking, getEntryTicketToken } from "../api/entry";
import QRCode from "react-qr-code";
import {
  Calendar,
  QrCode,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Ticket,
  Clock,
  Download
} from "lucide-react";
import jsPDF from "jspdf";

/* Brand icon (same as before) */
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

function statusPill(b) {
  const isCancelled = b.status === "cancelled";
  const isPaid = b.paymentStatus === "paid" && !isCancelled;

  const color =
    isCancelled ? "text-red-600 bg-red-50" :
    isPaid ? "text-emerald-600 bg-emerald-50" :
    "text-orange-600 bg-orange-50";

  const Icon =
    isCancelled ? X :
    isPaid ? CheckCircle :
    AlertCircle;

  const label =
    isCancelled ? "Cancelled" :
    isPaid ? "Booked" :
    "Waiting for payment";

  return { color, Icon, label };
}

export default function MyEntryBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [qrFor, setQrFor] = useState({ id: null, token: "" });

  // ref to grab the rendered SVG for conversion → PNG (for PDF embedding)
  const qrRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const list = await myEntryBookings();
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const doCancel = async (id) => {
    if (!confirm("Cancel this entry booking? (Only pending payments are cancellable)")) return;
    try {
      await cancelEntryBooking(id);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Cancel failed");
    }
  };

  const showQR = async (id) => {
    try {
      setQrFor({ id, token: "" });
      const { token } = await getEntryTicketToken(id);
      setQrFor({ id, token });
    } catch (e) {
      setQrFor({ id: null, token: "" });
      alert(e?.response?.data?.message || "Cannot get ticket — ensure it is paid");
    }
  };

  // --- helpers to build the PDF ---
  function svgToPngDataUrl(svgEl, size = 560, bg = "#ffffff") {
    return new Promise((resolve) => {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = url;
    });
  }

  async function downloadTicketPDF() {
    if (!qrFor.id || !qrRef.current) return;

    const b = rows.find(r => r._id === qrFor.id);
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    // QR → PNG for nice quality in PDF
    const pngDataUrl = await svgToPngDataUrl(svg, 560, "#ffffff");

    const doc = new jsPDF({ unit: "pt", format: "a4" }); // 595 x 842 pt
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // header bar
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 0, pageW, 72, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("Hasthi.lk Entry E-Ticket", 32, 45);

    // details
    doc.setTextColor(15, 23, 42); // slate-900-ish
    doc.setFontSize(12);

    const idShort = (b?._id || "").slice(-8).toUpperCase();
    const dateStr = b?.day ? new Date(b.day).toLocaleDateString() : "-";
    const createdStr = b?.createdAt ? new Date(b.createdAt).toLocaleString() : "-";

    let y = 120;
    doc.text(`Booking ID: ${idShort}`, 32, y);
    y += 22;
    doc.text(`Entry Date: ${dateStr}`, 32, y);
    y += 22;
    doc.text(`Tickets: ${b?.tickets ?? "-"}`, 32, y);
    y += 22;
    doc.text(`Created: ${createdStr}`, 32, y);

    // QR on the right
    const qrSize = 280;
    const qrX = pageW - qrSize - 32;
    const qrY = 102;
    doc.addImage(pngDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // footer note
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Show this QR at the entry gate. Thank you for supporting conservation.",
      32,
      pageH - 40
    );

    // file name
    doc.save(`hasthi-entry-${idShort}.pdf`); // ← triggers a direct download (no print dialog)
  }

  const total = rows.length;
  const confirmed = rows.filter(b => b.paymentStatus === "paid" && b.status !== "cancelled").length;
  const pending = rows.filter(b => b.paymentStatus === "pending" && b.status !== "cancelled").length;

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
              <h1 className="text-4xl md:text-5xl font-bold text-white">My Entry Bookings</h1>
            </div>
            <p className="text-xl text-emerald-100 mb-8 max-w-3xl mx-auto">
              View your day-entry bookings and access e-tickets instantly
            </p>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center px-5 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all font-medium shadow-lg disabled:opacity-60"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Error */}
        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {err}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-emerald-500">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
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
                <p className="text-2xl font-bold text-gray-900">{confirmed}</p>
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
                <p className="text-2xl font-bold text-gray-900">{pending}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content (table/cards) — unchanged */}
        {/* ... your existing table & mobile cards code stays the same ... */}

        {/* Desktop table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Tickets</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((b, i) => {
                  const { color, Icon, label } = statusPill(b);
                  const canCancel = b.paymentStatus === "pending" && b.status === "booked";
                  const canShowQR = b.paymentStatus === "paid" && b.status === "booked";
                  return (
                    <tr key={b._id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mr-4">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-sm text-gray-900 font-semibold">
                            {new Date(b.day).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
                          <Ticket className="w-4 h-4 mr-1" />
                          {b.tickets}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                          <Icon className="w-4 h-4" />
                          <span className="ml-1">{label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center capitalize">{b.paymentStatus}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-emerald-500 mr-2" />
                          {new Date(b.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {canCancel && (
                            <button
                              onClick={() => doCancel(b._id)}
                              className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                            >
                              <X className="w-4 h-4 mr-1 inline" />
                              Cancel
                            </button>
                          )}
                          {canShowQR && (
                            <button
                              onClick={() => showQR(b._id)}
                              className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                            >
                              <QrCode className="w-4 h-4 mr-1 inline" />
                              Show QR
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

          {/* Mobile cards (unchanged) */}
          <div className="lg:hidden">
            {rows.map((b) => {
              const { color, Icon, label } = statusPill(b);
              const canCancel = b.paymentStatus === "pending" && b.status === "booked";
              const canShowQR = b.paymentStatus === "paid" && b.status === "booked";
              return (
                <div key={b._id} className="border-b border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mr-4">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {new Date(b.day).toLocaleDateString()}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Clock className="w-4 h-4 mr-2 text-emerald-500" />
                          <span>Created: {new Date(b.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                      <Icon className="w-4 h-4" />
                      <span className="ml-1">{label}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
                      <Ticket className="w-4 h-4 mr-1" />
                      {b.tickets} tickets
                    </div>
                    <div className="text-sm capitalize text-gray-700">{b.paymentStatus}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canCancel && (
                      <button
                        onClick={() => doCancel(b._id)}
                        className="flex items-center px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel Booking
                      </button>
                    )}
                    {canShowQR && (
                      <button
                        onClick={() => showQR(b._id)}
                        className="flex items-center px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Show QR
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* QR Modal */}
        {qrFor.id && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setQrFor({ id: null, token: "" })} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <button
                onClick={() => setQrFor({ id: null, token: "" })}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center mb-4">
                <QrCode className="w-6 h-6 text-emerald-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">E-Ticket QR</h3>
              </div>
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-xl" ref={qrRef}>
                {qrFor.token ? (
                  <QRCode value={qrFor.token} size={220} />
                ) : (
                  <div className="flex flex-col items-center text-gray-600">
                    <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mb-3" />
                    Generating QR...
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Show this QR at the entry gate. Keep your screen brightness high for fast scanning.
              </p>

              <div className="mt-4 flex gap-2 justify-between">
                <button
                  onClick={() => setQrFor({ id: null, token: "" })}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={downloadTicketPDF}
                  disabled={!qrFor.token}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  title="Download PDF Ticket"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF Ticket
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer note */}
        {rows.length > 0 && !loading && (
          <div className="text-center bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-10 text-white mt-8">
            <ElephantIcon className="w-16 h-16 text-white mx-auto mb-4 opacity-90" />
            <h4 className="text-2xl font-bold mb-2">Thanks for visiting</h4>
            <p className="text-emerald-100">
              Your entries help sustain care, habitat, and protection programs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}




