import { useEffect, useState } from "react";
import { fetchMyAdoptedElephants } from "../../api/adoption";
import { requestHealthReport, fetchMyHealthRequests } from "../../api/health";
import { fetchMyCertificates } from "../../api/adoption"; // <-- NEW
import { Calendar, MapPin, Info, Clock, Stethoscope, FileText, CheckCircle, Hourglass, Award } from "lucide-react";
import { fileUrl } from "../../lib/url"; // <-- existing

const ElephantIcon = ({ className = "w-8 h-8", color = "currentColor" }) => (
  <svg viewBox="0 0 100 100" className={className} fill={color} aria-hidden="true">
    <path d="M20 60c0-15 10-25 25-25s25 10 25 25c0 8-3 15-8 20h-34c-5-5-8-12-8-20z"/>
    <circle cx="35" cy="55" r="2" fill="white"/>
    <path d="M15 65c-5 0-8 3-8 8s3 8 8 8c2 0 4-1 5-2"/>
    <path d="M45 40c-8-5-15-3-20 2"/>
  </svg>
);

export default function MyAdoptedElephants() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // health requests keyed by elephantId
  const [healthMap, setHealthMap] = useState({});
  const [busyId, setBusyId] = useState(null);

  // --- NEW: certificates keyed by elephantId ---
  const [certMap, setCertMap] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [eleRes, hrRes, certRes] = await Promise.all([
        fetchMyAdoptedElephants(),
        fetchMyHealthRequests(),
        fetchMyCertificates().catch(() => ({ data: { certificates: [] } })) // tolerant
      ]);

      const elephants = Array.isArray(eleRes?.data?.elephants) ? eleRes.data.elephants : [];
      const reqs = Array.isArray(hrRes?.data?.requests) ? hrRes.data.requests : [];

      const map = {};
      for (const r of reqs) {
        const key = String(r.elephantId);
        if (!map[key]) map[key] = [];
        map[key].push(r);
      }
      Object.keys(map).forEach(k => map[k].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));

      // --- NEW: build certificate map by elephantId (latest)
      const certs = {};
      const certRows = Array.isArray(certRes?.data?.certificates) ? certRes.data.certificates : [];
      for (const c of certRows) {
        const k = String(c.elephantId);
        // keep latest by date
        if (!certs[k] || new Date(c.certificateIssuedAt || 0) > new Date(certs[k].certificateIssuedAt || 0)) {
          certs[k] = c;
        }
      }

      setRows(elephants);
      setHealthMap(map);
      setCertMap(certs);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load adopted elephants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const latestFor = (elephantId) => {
    const list = healthMap[String(elephantId)] || [];
    return list.length ? list[0] : null;
  };

  const requestFor = async (elephant) => {
    try {
      setBusyId(elephant._id);
      await requestHealthReport({ elephantId: elephant._id });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to request health status");
    } finally {
      setBusyId(null);
    }
  };

  const empty = !loading && !err && rows.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Adopted Elephants</h1>

      {loading && <div className="p-6 bg-white rounded-xl shadow">Loading...</div>}
      {err && <div className="p-6 bg-red-50 text-red-700 rounded-xl shadow">{err}</div>}
      {empty && (
        <div className="p-8 bg-white rounded-xl shadow text-gray-600 flex items-center space-x-3">
          <Info className="w-5 h-5" />
          <span>You haven’t adopted an elephant yet, or your request hasn’t been approved.</span>
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((e) => {
            const latest = latestFor(e._id);
            const isPending = latest?.status === "pending";
            const isFulfilled = latest?.status === "fulfilled";
            const isRejected = latest?.status === "rejected";
            const hasPdf = Boolean(latest?.reportUrl);
            const href = hasPdf ? fileUrl(latest.reportUrl) : "#";

            // --- NEW: certificate availability
            const certRow = certMap[String(e._id)];
            const hasCert = Boolean(certRow?.certificateUrl);
            const certHref = hasCert ? fileUrl(certRow.certificateUrl) : "#";

            return (
              <div key={e._id} className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-5 flex items-center text-white">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                    <ElephantIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{e.name}</h3>
                    <p className="text-emerald-100">Adopted</p>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center text-gray-700">
                    <MapPin className="w-4 h-4 mr-2 text-emerald-600" />
                    <span className="truncate">{e.location || "Unknown location"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-gray-700">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">Gender</div>
                      <div className="font-semibold">{e.gender}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">Age</div>
                      <div className="font-semibold">{typeof e.age === "number" ? `${e.age} yrs` : "N/A"}</div>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Clock className="w-4 h-4 mr-2 text-emerald-600" />
                    <span className="truncate">
                      Adopted on{" "}
                      {e.adoptedAt ? new Date(e.adoptedAt).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  {e.notes && (
                    <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {e.notes}
                    </div>
                  )}

                  {/* --- NEW: Certificate actions --- */}
                  <div className="pt-2">
                    {hasCert ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a
                          href={certHref}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          title="Open your adoption certificate"
                        >
                          <Award className="w-4 h-4 mr-2" />
                          View Adoption Certificate (PDF)
                        </a>
                        <a
                          href={certHref}
                          download
                          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100"
                          title="Download certificate"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">
                        Certificate will appear here once your request is approved.
                      </div>
                    )}
                  </div>

                  {/* Health report actions (existing) */}
                  <div className="pt-3 border-t">
                    {isFulfilled && hasPdf && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Latest Health Report (PDF)
                        </a>
                        <a
                          href={href}
                          download
                          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100"
                        >
                          Download
                        </a>
                      </div>
                    )}

                    {isPending && (
                      <div className="mt-2 text-amber-700 bg-amber-50 p-2 rounded-lg text-sm inline-flex items-center">
                        <Hourglass className="w-4 h-4 mr-2" />
                        Your request is pending manager review.
                      </div>
                    )}

                    {isRejected && (
                      <div className="mt-2 text-rose-700 bg-rose-50 p-2 rounded-lg text-sm">
                        Last request was rejected. You can request again.
                      </div>
                    )}

                    {!isPending && (
                      <button
                        onClick={() => requestFor(e)}
                        disabled={busyId === e._id}
                        className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <Stethoscope className="w-4 h-4 mr-2" />
                        {busyId === e._id ? "Requesting..." : "Request Health Status"}
                      </button>
                    )}

                    {isFulfilled && latest?.respondedAt && (
                      <div className="mt-2 text-xs text-gray-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1 text-emerald-600" />
                        Updated on {new Date(latest.respondedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
