// client/src/pages/vet/AllIssues.jsx
import { useEffect, useState } from "react";
import {
  fetchAllIssues,
  uploadPrescription,
  getPrescriptionDownloadUrl,
} from "../../api/issue";
import Modal from "../../components/Modal";
import {
  FileWarning,
  Image as ImageIcon,
  Download,
  UploadCloud,
  Calendar,
  MapPin,
  User,
  X,
  Loader2,
  FileText,
  ClipboardList,
} from "lucide-react";

// Brand elephant (optional decorative)
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

export default function AllIssues() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // upload modal
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await fetchAllIssues();
      setRows(data.issues || []);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openUpload = (row) => {
    setTarget(row);
    setNote("");
    setFile(null);
    setFormErr("");
    setOpen(true);
  };

  const doUpload = async () => {
    setFormErr("");
    if (!file) {
      setFormErr("Please attach an image or PDF.");
      return;
    }
    setBusy(true);
    try {
      await uploadPrescription(target._id, { note, file });
      setOpen(false);
      setTarget(null);
      await load(); // refresh table
    } catch (e) {
      setFormErr(e.response?.data?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadPrescription = async (issueId) => {
    try {
      const { data } = await getPrescriptionDownloadUrl(issueId);
      if (data?.url) window.open(data.url, "_blank", "noopener,noreferrer");
      else alert("Download URL not available");
    } catch (e) {
      alert(e.response?.data?.message || "Failed to get download URL");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute -top-4 -right-4 opacity-5">
          <ElephantIcon className="w-24 h-24 text-emerald-500" />
        </div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl grid place-items-center shadow-lg">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            All Reported Issues
          </h2>
        </div>
        <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
      </div>

      {/* Status bar */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <FileWarning className="w-4 h-4 text-emerald-600" />
          <span>
            Showing <span className="font-semibold text-emerald-700">{rows.length}</span>{" "}
            issue{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-emerald-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>

      {/* Error / Empty */}
      {err ? (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full grid place-items-center">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error Loading Issues</h3>
              <p className="text-red-700">{err}</p>
            </div>
          </div>
        </div>
      ) : !loading && rows.length === 0 ? (
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full grid place-items-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Issues Reported</h3>
          <p className="text-gray-600">Once caretakers submit issues, they will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
          {/* Scroll wrapper */}
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-emerald-50">
            <table className="min-w-[960px] w-full text-left">
              <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                <tr className="text-sm text-emerald-900/80">
                  <th className="sticky left-0 bg-emerald-50/90 backdrop-blur px-4 py-3 font-semibold">
                    Date
                  </th>
                  <th className="sticky left-24 bg-emerald-50/90 backdrop-blur px-4 py-3 font-semibold">
                    Elephant
                  </th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Issue</th>
                  <th className="px-4 py-3 font-semibold">Photo</th>
                  <th className="px-4 py-3 font-semibold">Caretaker</th>
                  <th className="px-4 py-3 font-semibold">Prescription</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r._id}
                    className="border-b border-gray-100 hover:bg-emerald-50/40 transition-colors align-top"
                  >
                    {/* Sticky Date */}
                    <td className="sticky left-0 bg-white px-4 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>

                    {/* Sticky Elephant */}
                    <td className="sticky left-24 bg-white px-4 py-4">
                      <div className="font-semibold text-gray-900">{r.elephantName}</div>
                      <div className="text-xs text-gray-500">
                        ID: {String(r.elephantId).slice(-6).toUpperCase()}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-gray-700">
                      {r.elephantLocation ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          {r.elephantLocation}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="max-w-[44ch] text-sm text-gray-800 whitespace-pre-wrap">
                        {r.description}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      {r.photo?.url ? (
                        <a
                          href={r.photo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          <ImageIcon className="w-4 h-4" />
                          View Photo
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-600" />
                        {r.caretakerName}
                      </div>
                      <div className="text-xs text-gray-500">{r.caretakerEmail}</div>
                    </td>

                    <td className="px-4 py-4">
                      {r.prescription?.url ? (
                        <div className="grid gap-2">
                          <button
                            onClick={() => downloadPrescription(r._id)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                          {r.prescription.note ? (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium text-gray-800">Note:</span>{" "}
                              {r.prescription.note}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => openUpload(r)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow hover:shadow-md transition-all"
                      >
                        <UploadCloud className="w-4 h-4" />
                        Upload
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {open && (
        <Modal
          title={`Upload Prescription — ${target?.elephantName}`}
          onClose={() => setOpen(false)}
        >
          <div className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Note (optional)</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-700">Attach Image or PDF *</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
              {formErr && <div className="text-sm text-rose-600">{formErr}</div>}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={doUpload}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow hover:shadow-md disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {busy ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
