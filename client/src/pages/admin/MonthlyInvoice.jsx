// client/src/pages/reports/MonthlyInvoice.jsx
import { useState } from "react";
import { downloadMonthlyInvoice } from "../../api/report";
import {
  Calendar,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const MessageAlert = ({ message, type = "success" }) => {
  if (!message) return null;
  const isSuccess = type === "success";
  const Icon = isSuccess ? CheckCircle : AlertTriangle;
  const color = isSuccess
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : "bg-rose-50 text-rose-800 border-rose-200";
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl border ${color}`}>
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default function MonthlyInvoice() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const clampMonth = (m) => Math.min(12, Math.max(1, Number(m) || 1));

  const doDownload = async () => {
    setBusy(true);
    setErr("");
    setOk("");
    try {
      const blob = await downloadMonthlyInvoice(year, month);
      const fname = `invoice-${year}-${String(month).padStart(2, "0")}.pdf`;
      saveBlob(blob, fname);
      setOk(`Invoice generated ✅ (${fname})`);
    } catch (e) {
      setErr(e?.response?.data?.message || "Download failed");
    } finally {
      setBusy(false);
    }
  };

  const setThisMonth = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const setLastMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 border border-white/30">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Monthly Invoice / Report</h1>
              <p className="text-emerald-100 mt-1">Generate and download monthly PDF invoices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">Select Period</h3>
          </div>

          <div className="p-6">
            {/* Alerts */}
            <div className="space-y-3 mb-4">
              {err && <MessageAlert message={err} type="error" />}
              {ok && <MessageAlert message={ok} type="success" />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  min="2000"
                  max="9999"
                />
              </div>

              {/* Month */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(clampMonth(e.target.value))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {[
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ].map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {String(idx + 1).padStart(2, "0")} — {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick picks */}
              <div className="sm:col-span-2 flex flex-wrap gap-3">
                <button
                  onClick={setThisMonth}
                  className="px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  This Month
                </button>
                <button
                  onClick={setLastMonth}
                  className="px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Last Month
                </button>

                <div className="ml-auto">
                  <button
                    onClick={doDownload}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold
                               bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                               hover:from-emerald-600 hover:to-teal-600 shadow-md transition
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Hint */}
              <div className="sm:col-span-2 text-xs text-gray-500">
                The file will be saved as{" "}
                <span className="font-mono">invoice-YYYY-MM.pdf</span>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
