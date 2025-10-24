import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getDonationReceipt } from "../../api/donation";
import jsPDF from "jspdf";
import {
  Gift,
  Download,
  CheckCircle2,
  AlertCircle,
  Mail,
  User as UserIcon,
  MapPin,
  ArrowLeft,
} from "lucide-react";

const DISPLAY_CURRENCY = (import.meta.env.VITE_STRIPE_CURRENCY || "LKR").toUpperCase();

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

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}
const fmtMoney = (n) => Number(n || 0).toLocaleString();
const safe = (s) => (s == null ? "" : String(s));

export default function DonationReceipt() {
  const q = useQuery();
  const navigate = useNavigate();
  const sessionId = q.get("session_id");

  const [rec, setRec] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const containerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!sessionId) {
        setErr("Missing checkout session_id in the URL.");
        setLoading(false);
        return;
      }
      try {
        const data = await getDonationReceipt(sessionId);
        if (mounted) {
          setRec(data || null);
          setErr("");
        }
      } catch (e) {
        if (mounted) setErr(e?.response?.data?.message || "Failed to load receipt");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [sessionId]);

  const createdStr = rec?.createdAt ? new Date(rec.createdAt).toLocaleString() : "";
  const status = (rec?.paymentStatus || rec?.status || "").toLowerCase();
  const isPaid = status === "paid";
  const currency = (rec?.currency || DISPLAY_CURRENCY).toUpperCase();

  const receiptNo =
    rec?.receiptNo ||
    (() => {
      const y = rec?.createdAt ? new Date(rec.createdAt).getFullYear() : new Date().getFullYear();
      const tail = (rec?.stripeSessionId || sessionId || "").slice(-6).toUpperCase() || "XXXXXX";
      return `DN-${y}-${tail}`;
    })();

  const downloadPdf = () => {
    if (!rec) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageW, 72, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Hasthi.lk Donation Receipt", 32, 46);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);

    let y = 110;
    doc.text(`Receipt No: ${receiptNo}`, 32, y); y += 20;
    doc.text(`Status: ${status ? status.toUpperCase() : "-"}`, 32, y); y += 20;
    doc.text(`Date: ${createdStr || "-"}`, 32, y); y += 20;
    doc.text(`Amount: ${currency} ${fmtMoney(rec?.amount)}`, 32, y); y += 20;

    if (rec?.user?.name || rec?.user?.email) {
      y += 10;
      doc.setFont(undefined, "bold"); doc.text("Donor", 32, y); doc.setFont(undefined, "normal"); y += 16;
      if (rec.user?.name) { doc.text(`Name: ${safe(rec.user.name)}`, 32, y); y += 18; }
      if (rec.user?.email) { doc.text(`Email: ${safe(rec.user.email)}`, 32, y); y += 18; }
    }

    if (rec?.elephant?.name) {
      y += 10;
      doc.setFont(undefined, "bold"); doc.text("Elephant", 32, y); doc.setFont(undefined, "normal"); y += 16;
      doc.text(`Name: ${safe(rec.elephant.name)}`, 32, y); y += 18;
      if (rec.elephant?.gender) { doc.text(`Gender: ${safe(rec.elephant.gender)}`, 32, y); y += 18; }
      if (rec.elephant?.age != null) { doc.text(`Age: ${safe(rec.elephant.age)}`, 32, y); y += 18; }
      if (rec.elephant?.location) { doc.text(`Location: ${safe(rec.elephant.location)}`, 32, y); y += 18; }
    }

    if (rec?.note) {
      y += 10;
      doc.setFont(undefined, "bold"); doc.text("Note", 32, y); doc.setFont(undefined, "normal"); y += 16;
      const text = doc.splitTextToSize(rec.note, pageW - 64);
      doc.text(text, 32, y); y += text.length * 14 + 10;
    }

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Thank you for supporting elephant care and conservation.", 32, pageH - 40);

    const nameSafe = (receiptNo || `donation-${sessionId}`).replace(/[^\w\-]+/g, "_");
    doc.save(`${nameSafe}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute top-8 right-8 opacity-10">
            <Gift className="w-24 h-24 text-white" />
          </div>
          <div className="absolute bottom-8 left-8 opacity-10">
            <ElephantIcon className="w-32 h-32 text-white" />
          </div>
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-14">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl md:text-4xl font-bold text-white">Donation Receipt</h1>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <p className="text-emerald-100 mt-2">You can download a PDF copy for your records.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {!sessionId ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-rose-500 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
            <div>Missing Stripe checkout session_id in the URL.</div>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="inline-block w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <div className="mt-3 text-gray-600">Loading receipt…</div>
          </div>
        ) : err ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-rose-500 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5" />
            <div>{err}</div>
          </div>
        ) : (
          <div ref={containerRef} className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-semibold text-gray-900">Hasthi.lk Donation</h2>
              </div>
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  (status === "paid") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {(status === "paid") ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {(status || "-").toUpperCase()}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-500">Receipt No</div>
                <div className="font-semibold">{receiptNo}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Date</div>
                <div className="font-semibold">{createdStr || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Amount</div>
                <div className="font-semibold">
                  {currency} {fmtMoney(rec?.amount)}
                </div>
              </div>
              {/* <div>
                <div className="text-sm text-gray-500">Stripe Session</div>
                <div className="font-mono text-xs break-all">{rec?.stripeSessionId || sessionId}</div>
              </div> */}
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-sm text-gray-500 mb-2">Donor</div>
                {rec?.user ? (
                  <>
                    {rec.user?.name && (
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-emerald-600" />
                        <div>{rec.user.name}</div>
                      </div>
                    )}
                    {rec.user?.email && (
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4 text-emerald-600" />
                        <div>{rec.user.email}</div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-600">-</div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-sm text-gray-500 mb-2">Elephant</div>
                {rec?.elephant ? (
                  <>
                    <div className="font-semibold">{rec.elephant?.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {rec.elephant?.gender || "—"}{rec.elephant?.age != null ? ` • ${rec.elephant.age} yrs` : ""}
                    </div>
                    {rec.elephant?.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>{rec.elephant.location}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-600">General Fund</div>
                )}
              </div>
            </div>

            {rec?.note && (
              <div className="mt-6 rounded-xl border border-gray-200 p-4">
                <div className="text-sm text-gray-500 mb-2">Your Message</div>
                <div className="text-gray-800">{rec.note}</div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-end gap-3">
             
              <button
                onClick={downloadPdf}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
