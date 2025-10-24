// client/src/pages/caretaker/MyElephants.jsx
import { useEffect, useRef, useState } from "react";
import { fetchMyElephants } from "../../api/elephant";
import { createReport } from "../../api/report";
import { createIssue, fetchMyIssues, getPrescriptionDownloadUrl } from "../../api/issue";
import Modal from "../../components/Modal";
import {
  Heart,
  ClipboardList,
  AlertTriangle,
  FileDown,
  Image as ImageIcon,
  Loader,
  PlusCircle,
  Stethoscope,
  MapPin,
  User,
  Calendar,
  Mic,
  Square,
  Languages,
} from "lucide-react";

// Brand icon (kept consistent)
const ElephantIcon = ({ className = "w-6 h-6", color = "currentColor" }) => (
  <svg viewBox="0 0 100 100" className={className} fill={color} aria-hidden="true">
    <path d="M20 60c0-15 10-25 25-25s25 10 25 25c0 8-3 15-8 20h-34c-5-5-8-12-8-20z" />
    <circle cx="35" cy="55" r="2" fill="white" />
    <path d="M15 65c-5 0-8 3-8 8s3 8 8 8c2 0 4-1 5-2" />
    <path d="M45 40c-8-5-15-3-20 2" />
    <circle cx="25" cy="75" r="8" opacity="0.1" />
    <circle cx="55" cy="75" r="8" opacity="0.1" />
  </svg>
);

// Loading & Error UIs
const LoadingBlock = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center space-y-4">
      <Loader className="w-8 h-8 animate-spin text-emerald-600" />
      <p className="text-gray-600">Loading your elephants...</p>
    </div>
  </div>
);

const ErrorBlock = ({ message }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
    <AlertTriangle className="w-5 h-5 text-red-600" />
    <p className="text-red-800">{message}</p>
  </div>
);

// Empty state
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
      <ElephantIcon className="w-10 h-10 text-emerald-600" />
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assigned Elephants</h3>
    <p className="text-gray-600 max-w-md">You don’t have any elephants assigned yet.</p>
  </div>
);

export default function MyElephants() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // report modal
  const [openReport, setOpenReport] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reportForm, setReportForm] = useState({ feedingDetails: "", healthNote: "" });
  const [reportSaving, setReportSaving] = useState(false);
  const [reportErr, setReportErr] = useState("");

  // issue modal
  const [openIssue, setOpenIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ description: "" });
  const [issueFile, setIssueFile] = useState(null);
  const [issueSaving, setIssueSaving] = useState(false);
  const [issueErr, setIssueErr] = useState("");

  // issues list modal (per elephant)
  const [openList, setOpenList] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState("");
  const [issues, setIssues] = useState([]);

  // ---- Voice typing (Web Speech API) ----
  const [speechLang, setSpeechLang] = useState("en-US"); // try "si-LK" (Sinhala) / "ta-IN" (Tamil)
  const [listeningField, setListeningField] = useState(null); // 'feedingDetails' | 'healthNote' | 'issueDescription' | null
  const [speechErr, setSpeechErr] = useState("");
  const recognitionRef = useRef(null);                      // SpeechRecognition instance
  const SR =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  // Live interim preview per field (not saved to form)
  const [interimPreview, setInterimPreview] = useState({
    feedingDetails: "",
    healthNote: "",
    issueDescription: "",
  });

  // Helpers to tidy/clean text
  const collapseWordRepeats = (text) => {
    return text
      .split(/\s+/)
      .filter(Boolean)
      .reduce((acc, w, i, arr) => {
        if (i > 0 && w.toLowerCase() === arr[i - 1].toLowerCase()) return acc;
        acc.push(w);
        return acc;
      }, [])
      .join(" ");
  };

  const collapsePhraseRepeats = (text) => {
    // remove immediate repeated n-grams (n from 6 down to 3)            // stop repeating words
    let out = text;
    for (let n = 6; n >= 3; n--) {
      const tokens = out.split(/\s+/).filter(Boolean);
      if (tokens.length < n * 2) continue;
      let i = 0;
      const res = [];
      while (i < tokens.length) {
        const chunk = tokens.slice(i, i + n).join(" ");
        const next = tokens.slice(i + n, i + 2 * n).join(" ");
        res.push(...tokens.slice(i, i + n));
        if (chunk && next && chunk.toLowerCase() === next.toLowerCase()) {
          i += n * 2; // skip duplicate
        } else {
          i += n;
        }
      }
      out = res.join(" ");
    }
    return out;
  };

  const tidyText = (text) => {
    let t = (text || "").replace(/\s+/g, " ").trim();
    t = collapseWordRepeats(t);
    t = collapsePhraseRepeats(t);
    // Only do simple sentence casing for ASCII to avoid harming si/ta
    if (/^[\x00-\x7F]+$/.test(t)) {
      t = t.replace(/(^\s*[a-z])/, (m) => m.toUpperCase());
      t = t.replace(/([.!?]\s+)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());
    }
    return t;
  };

  const cleanField = (fieldKey) => {         // suggest suitable word for unrecognixed words
    setReportForm((prev) => ({ ...prev, [fieldKey]: tidyText(prev[fieldKey] || "") }));
    if (fieldKey === "issueDescription") {
      setIssueForm((prev) => ({ ...prev, description: tidyText(prev.description || "") }));
    }
  };

  const stopVoice = () => {        // stop voice typing
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    setListeningField(null);
    setInterimPreview({ feedingDetails: "", healthNote: "", issueDescription: "" });
  };

  const startVoice = (fieldKey /* 'feedingDetails' | 'healthNote' | 'issueDescription' */) => {
    setSpeechErr("");
    if (!SR) {
      setSpeechErr("Voice typing is not supported in this browser.");
      return;
    }
    try {
      stopVoice();
      const rec = new SR();
      recognitionRef.current = rec;
      rec.lang = speechLang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      setListeningField(fieldKey);

      rec.onresult = (event) => {
        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + " ";
          } else {
            interim += transcript;
          }
        }

        // Live preview (NOT saved)
        setInterimPreview((prev) => ({
          ...prev,
          [fieldKey]: interim,
        }));

        if (finalChunk) {
          const cleaned = tidyText(finalChunk);

          if (fieldKey === "issueDescription") {
            setIssueForm((prev) => {
              const merged = tidyText((prev.description || "") + " " + cleaned);
              return { ...prev, description: merged };
            });
          } else {
            setReportForm((prev) => {
              const merged = tidyText((prev[fieldKey] || "") + " " + cleaned);
              return { ...prev, [fieldKey]: merged };
            });
          }

          // clear preview after final chunk
          setInterimPreview((prev) => ({ ...prev, [fieldKey]: "" }));
        }
      };

      rec.onerror = (e) => {
        setSpeechErr(
          e?.error === "not-allowed"
            ? "Microphone permission was denied."
            : `Voice typing error: ${e?.error || "unknown"}`
        );
        stopVoice();
      };

      rec.onend = () => {
        // Tidy on end
        if (fieldKey === "issueDescription") {
          setIssueForm((prev) => ({ ...prev, description: tidyText(prev.description || "") }));
        } else {
          setReportForm((prev) => ({ ...prev, [fieldKey]: tidyText(prev[fieldKey] || "") }));
        }
        stopVoice();
      };

      rec.start();
    } catch (err) {
      setSpeechErr("Could not start voice typing.");
      stopVoice();
    }
  };
  // ---- end voice typing ----

  useEffect(() => {
    (async () => {
      try {
        const { data } = await fetchMyElephants();
        setRows(data.elephants || []);
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();

    return () => stopVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openReportModal = (row) => {
    setSelected(row);
    setReportForm({ feedingDetails: "", healthNote: "" });
    setReportErr("");
    setSpeechErr("");
    setListeningField(null);
    setInterimPreview({ feedingDetails: "", healthNote: "", issueDescription: "" });
    setOpenReport(true);
  };

  const submitReport = async () => {
    setReportErr("");
    if (!reportForm.feedingDetails.trim()) {
      setReportErr("Feeding details are required");
      return;
    }
    setReportSaving(true);
    try {
      await createReport({
        elephantId: selected._id,
        feedingDetails: reportForm.feedingDetails.trim(),
        healthNote: reportForm.healthNote.trim(),
      });
      stopVoice();
      setOpenReport(false);
      setSelected(null);
      alert("Report saved ✅");
    } catch (e) {
      setReportErr(e?.response?.data?.message || "Failed to save report");
    } finally {
      setReportSaving(false);
    }
  };

  const openIssueModal = (row) => {
    setSelected(row);
    setIssueForm({ description: "" });
    setIssueFile(null);
    setIssueErr("");
    setSpeechErr("");
    setListeningField(null);
    setInterimPreview({ feedingDetails: "", healthNote: "", issueDescription: "" });
    setOpenIssue(true);
  };

  const submitIssue = async () => {
    setIssueErr("");
    if (!issueForm.description.trim()) {
      setIssueErr("Issue description is required");
      return;
    }
    setIssueSaving(true);
    try {
      await createIssue({
        elephantId: selected._id,
        description: issueForm.description.trim(),
        file: issueFile || undefined,
      });
      stopVoice();
      setOpenIssue(false);
      setSelected(null);
      alert("Issue submitted ✅");
    } catch (e) {
      setIssueErr(e?.response?.data?.message || "Failed to submit issue");
    } finally {
      setIssueSaving(false);
    }
  };

  const openIssuesList = async (row) => {
    setSelected(row);
    setOpenList(true);
    setListLoading(true);
    setListErr("");
    try {
      const { data } = await fetchMyIssues({ elephantId: row._id });
      setIssues(data.issues || []);
    } catch (e) {
      setListErr(e?.response?.data?.message || "Failed to load issues");
    } finally {
      setListLoading(false);
    }
  };

  const downloadPrescription = async (issueId) => {
    try {
      const { data } = await getPrescriptionDownloadUrl(issueId);
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        alert("Download URL not available");
      }
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to get download URL");
    }
  };

  if (loading) return <LoadingBlock />;
  if (err) return <ErrorBlock message={err} />;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      {/* <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
            <ElephantIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Elephants</h1>
            <p className="text-gray-600">
              Elephants assigned to your care and daily reporting.
            </p>
            <div className="mt-2 w-16 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
          </div>
        </div>
      </div> */}

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                <tr>
                  <th className="text-left p-4 font-semibold text-emerald-800">ID</th>
                  <th className="text-left p-4 font-semibold text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4" />
                      <span>Name</span>
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Age</span>
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Gender</span>
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>Location</span>
                    </div>
                  </th>
                  <th className="text-left p-4 font-semibold text-emerald-800">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, idx) => (
                  <tr key={r._id} className="hover:bg-emerald-25 transition-colors">
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {r._id.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                          <ElephantIcon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{r.name}</p>
                          <p className="text-sm text-gray-500">Elephant #{idx + 1}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-900">{r.age ?? "-"}</span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          r.gender === "Male"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-pink-100 text-pink-800"
                        }`}
                      >
                        {r.gender}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-900">{r.location || "-"}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openReportModal(r)}
                          className="inline-flex items-center px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Add daily report"
                        >
                          <ClipboardList className="w-4 h-4 mr-1.5" />
                          Add Report
                        </button>
                        <button
                          onClick={() => openIssueModal(r)}
                          className="inline-flex items-center px-3 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
                          title="Report an issue"
                        >
                          <AlertTriangle className="w-4 h-4 mr-1.5" />
                          Report Issue
                        </button>
                        <button
                          onClick={() => openIssuesList(r)}
                          className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          title="View submitted issues"
                        >
                          <Stethoscope className="w-4 h-4 mr-1.5" />
                          View Issues
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {openReport && (
        <Modal
          title={`Add Daily Report — ${selected?.name}`}
          onClose={() => {
            stopVoice();
            setOpenReport(false);
          }}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Voice typing controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Languages className="w-4 h-4" />
                <span>Voice language:</span>
                <select
                  value={speechLang}
                  onChange={(e) => setSpeechLang(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-gray-700"
                  title="Speech recognition language"
                >
                  <option value="en-US">English (US)</option>
                  <option value="si-LK">Sinhala (si-LK)</option>
                  <option value="ta-IN">Tamil (ta-IN)</option>
                </select>
              </div>

              {speechErr ? (
                <div className="text-sm text-red-600">{speechErr}</div>
              ) : null}
            </div>

            {/* Feeding Details with mic + clean + preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Feeding Details *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cleanField("feedingDetails")}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50"
                    title="Clean up text"
                  >
                    Clean
                  </button>

                  {listeningField === "feedingDetails" ? (
                    <button
                      type="button"
                      onClick={stopVoice}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                      title="Stop voice typing"
                    >
                      <Square className="w-4 h-4 mr-1" /> Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startVoice("feedingDetails")}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      title="Start voice typing for Feeding Details"
                    >
                      <Mic className="w-4 h-4 mr-1" /> Speak
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={4}
                placeholder="e.g., 10kg jackfruit at 8:00 AM, 5kg grass at 3:00 PM"
                value={reportForm.feedingDetails}
                onChange={(e) =>
                  setReportForm({ ...reportForm, feedingDetails: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />

              {interimPreview.feedingDetails && (
                <div className="text-xs text-gray-500 mt-1 italic">
                  Live (not saved): {interimPreview.feedingDetails}
                </div>
              )}
            </div>

            {/* Health Condition Note with mic + clean + preview */}
            <div>
              <div className="flex items-center justify-between mb-2 mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Health Condition Note
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cleanField("healthNote")}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50"
                    title="Clean up text"
                  >
                    Clean
                  </button>

                  {listeningField === "healthNote" ? (
                    <button
                      type="button"
                      onClick={stopVoice}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                      title="Stop voice typing"
                    >
                      <Square className="w-4 h-4 mr-1" /> Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startVoice("healthNote")}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      title="Start voice typing for Health Note"
                    >
                      <Mic className="w-4 h-4 mr-1" /> Speak
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="e.g., slight limp on left hind leg, cleaned wound"
                value={reportForm.healthNote}
                onChange={(e) =>
                  setReportForm({ ...reportForm, healthNote: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />

              {interimPreview.healthNote && (
                <div className="text-xs text-gray-500 mt-1 italic">
                  Live (not saved): {interimPreview.healthNote}
                </div>
              )}
            </div>

            {reportErr && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700">
                {reportErr}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => {
                  stopVoice();
                  setOpenReport(false);
                }}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={reportSaving}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all font-medium shadow-lg inline-flex items-center"
              >
                {reportSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Submit Report
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Issue Modal */}
      {openIssue && (
        <Modal
          title={`Report Issue — ${selected?.name}`}
          onClose={() => {
            stopVoice();
            setOpenIssue(false);
          }}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Voice typing controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Languages className="w-4 h-4" />
                <span>Voice language:</span>
                <select
                  value={speechLang}
                  onChange={(e) => setSpeechLang(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-gray-700"
                  title="Speech recognition language"
                >
                  <option value="en-US">English (US)</option>
                  <option value="si-LK">Sinhala (si-LK)</option>
                  <option value="ta-IN">Tamil (ta-IN)</option>
                </select>
              </div>

              {speechErr ? (
                <div className="text-sm text-red-600">{speechErr}</div>
              ) : null}
            </div>

            {/* Describe the issue with mic + clean + preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Describe the issue *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cleanField("issueDescription")}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50"
                    title="Clean up text"
                  >
                    Clean
                  </button>

                  {listeningField === "issueDescription" ? (
                    <button
                      type="button"
                      onClick={stopVoice}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                      title="Stop voice typing"
                    >
                      <Square className="w-4 h-4 mr-1" /> Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startVoice("issueDescription")}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      title="Start voice typing for Issue"
                    >
                      <Mic className="w-4 h-4 mr-1" /> Speak
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={5}
                placeholder="e.g., bleeding from right tusk, appetite reduced, abnormal behavior..."
                value={issueForm.description}
                onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />

              {interimPreview.issueDescription && (
                <div className="text-xs text-gray-500 mt-1 italic">
                  Live (not saved): {interimPreview.issueDescription}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attach photo (optional)</label>
              <div className="flex items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIssueFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
              {issueFile && (
                <div className="mt-2 text-sm text-gray-600 flex items-center">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Selected: {issueFile.name}
                </div>
              )}
            </div>

            {issueErr && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700">{issueErr}</div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => {
                  stopVoice();
                  setOpenIssue(false);
                }}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitIssue}
                disabled={issueSaving}
                className="px-6 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-all font-medium shadow-lg inline-flex items-center"
              >
                {issueSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-1.5" />
                    Submit Issue
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Issues list Modal */}
      {openList && (
        <Modal title={`My Issues — ${selected?.name}`} onClose={() => setOpenList(false)} className="max-w-3xl">
          <div className="space-y-4">
            {listLoading ? (
              <LoadingBlock />
            ) : listErr ? (
              <ErrorBlock message={listErr} />
            ) : issues.length ? (
              <div className="overflow-x-auto border border-emerald-100 rounded-xl">
                <table className="w-full bg-white rounded-xl">
                  <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                    <tr>
                      <th className="text-left p-3 font-semibold text-emerald-800">Date</th>
                      <th className="text-left p-3 font-semibold text-emerald-800">Issue</th>
                      <th className="text-left p-3 font-semibold text-emerald-800">Photo</th>
                      <th className="text-left p-3 font-semibold text-emerald-800">Prescription</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 align-top">
                    {issues.map((i) => (
                      <tr key={i._id}>
                        <td className="p-3 whitespace-nowrap text-gray-700">
                          {new Date(i.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 max-w-[420px]">
                          <div className="whitespace-pre-wrap text-gray-900">{i.description}</div>
                        </td>
                        <td className="p-3">
                          {i.photo?.url ? (
                            <a
                              href={i.photo.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              <ImageIcon className="w-4 h-4 mr-1.5" />
                              View Photo
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {i.prescription?.url ? (
                            <div className="space-y-2">
                              <button
                                onClick={() => downloadPrescription(i._id)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                              >
                                <FileDown className="w-4 h-4 mr-1.5" />
                                Download
                              </button>
                              {i.prescription.note ? (
                                <div className="text-sm text-gray-600">
                                  <span className="font-medium">Note:</span> {i.prescription.note}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-600">No issues found for this elephant.</div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
