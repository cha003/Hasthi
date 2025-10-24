// client/src/pages/eventmgr/MyEvents.jsx
import { useEffect, useState, useMemo } from "react";
import { listMyEventsManage, getEventBookings, cancelEvent, deleteEvent } from "../../api/events";
import {
  Loader,
  AlertCircle,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  Ban,
  FileText,
  Activity,
  CalendarRange,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Download,
  Calendar,
} from "lucide-react";

export default function MyEvents() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [busy, setBusy] = useState(false);

  // ---------- Helpers ----------
  const nf = (n) => Intl.NumberFormat().format(Number(n || 0));
  const pad = (n) => String(n).padStart(2, "0");
  const toLocalISO = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  };
  const dtHuman = (d) => new Date(d).toLocaleString();

  // ---------- Init ----------
  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await listMyEventsManage({ includeBookingStats: 1 });
      setRows(Array.isArray(data) ? data : data?.events || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); // eslint-disable-next-line
  }, []);

  // ---------- Actions ----------
  const viewBookings = async (row) => {
    setOpen(true);
    setTarget(row);
    try {
      const list = await getEventBookings(row._id);
      setBookings(list || []);
    } catch {
      setBookings([]);
    }
  };
  const doCancel = async (row) => {
    if (!confirm("Cancel this event?")) return;
    setBusy(true);
    try {
      await cancelEvent(row._id);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Cancel failed");
    } finally {
      setBusy(false);
    }
  };
  const doDelete = async (row) => {
    if (!confirm("Delete this event permanently?")) return;
    setBusy(true);
    try {
      await deleteEvent(row._id);
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  // ---------- Aggregates ----------
  const totals = useMemo(() => {
    return rows.reduce(
      (a, r) => {
        a.events += 1;
        a.tickets += Number(r?.stats?.ticketsTotal || 0);
        a.paid += Number(r?.stats?.paid || 0);
        a.pending += Number(r?.stats?.pending || 0);
        a.capacity += Number(r?.capacity || 0);
        a.remaining += Number(r?.remainingSeats || 0);
        return a;
      },
      { events: 0, tickets: 0, paid: 0, pending: 0, capacity: 0, remaining: 0 }
    );
  }, [rows]);

  const utilizationPct = useMemo(() => {
    if (!totals.capacity) return 0;
    const sold = totals.capacity - totals.remaining;
    return Math.max(0, Math.round((sold / totals.capacity) * 100));
  }, [totals]);

  // ---------- PDF ----------
  const exportEventsPDF = async () => {
    const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = autoTableMod.default || autoTableMod;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 36,
      top = 40,
      brand = { r: 16, g: 185, b: 129 };
    const usable = doc.internal.pageSize.getWidth() - left * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Hasthi.lk — Events Report", left, top);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, left, top + 18);

    autoTable(doc, {
      startY: top + 36,
      head: [["Title", "Start", "End", "Venue", "Cap/Remain", "Status", "Tickets"]],
      body: rows.map((r) => {
        const total = r.stats?.ticketsTotal ?? 0;
        const paid = r.stats?.paid ?? 0;
        const pending = r.stats?.pending ?? 0;
        return [
          r.title || "-",
          dtHuman(r.start),
          dtHuman(r.end),
          r.venue || "-",
          `${r.capacity ?? "-"}/${r.remainingSeats ?? "-"}`,
          r.status || "unknown",
          `${total} (paid ${paid} / pend ${pending})`,
        ];
      }),
      styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [brand.r, brand.g, brand.b], textColor: 255 },
      margin: { left, right: left },
      tableWidth: usable,
    });

    doc.save(`events-report-${toLocalISO(new Date())}.pdf`);
  };

  const exportEventBookingsPDF = async () => {
    if (!target) return;
    const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = autoTableMod.default || autoTableMod;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 36,
      top = 40,
      brand = { r: 16, g: 185, b: 129 };
    const usable = doc.internal.pageSize.getWidth() - left * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Hasthi.lk — Bookings Report`, left, top);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`${target.title || "-"}`, left, top + 18);

    autoTable(doc, {
      startY: top + 40,
      head: [["User", "Email", "Tickets", "Payment", "Status", "When"]],
      body: bookings.map((b) => [
        b.user?.name || "-",
        b.user?.email || "-",
        b.tickets ?? 0,
        b.paymentStatus || "-",
        b.status || "-",
        dtHuman(b.createdAt),
      ]),
      styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [brand.r, brand.g, brand.b], textColor: 255 },
      margin: { left, right: left },
      tableWidth: usable,
    });

    doc.save(`event-${(target.title || "bookings").replace(/\s+/g, "-")}.pdf`);
  };

  // ---------- UI bits ----------
  const LoadingBlock = () => (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center space-y-3">
        <Loader className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="text-gray-600">Loading events…</span>
      </div>
    </div>
  );

  const ErrorBlock = ({ message }) => (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
      <AlertCircle className="w-5 h-5 text-red-600" />
      <p className="text-red-800">{message}</p>
    </div>
  );

  // 🔥 New: Subtle glass container
  const GlassCard = ({ children, className = "", ...props }) => (
    <div className={`backdrop-blur-sm bg-white/70 border border-white/20 shadow-xl shadow-black/5 ${className}`} {...props}>
      {children}
    </div>
  );

  // 🔥 Colored metric cards (only colors changed)
  const MetricCard = ({ title, value, icon: Icon, trend, color = "emerald", subtitle }) => {
    const chipGrad = {
      blue: "from-blue-500 to-blue-600 text-white",
      emerald: "from-emerald-500 to-emerald-600 text-white",
      purple: "from-purple-500 to-purple-600 text-white",
      orange: "from-orange-500 to-orange-600 text-white",
      rose: "from-rose-500 to-rose-600 text-white",
    };

    const cardBg = {
      blue: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
      emerald: "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200",
      purple: "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200",
      orange: "bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200",
      rose: "bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200",
    };

    const trendTone = {
      blue: "text-blue-700 bg-blue-50",
      emerald: "text-emerald-700 bg-emerald-50",
      purple: "text-purple-700 bg-purple-50",
      orange: "text-orange-700 bg-orange-50",
      rose: "text-rose-700 bg-rose-50",
    };

    return (
      <div
        className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-500
                    hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-1 ${cardBg[color]}`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 opacity-10">
          <Icon className="w-full h-full" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-r ${chipGrad[color]} shadow-lg`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>

          {trend && (
            <div className="flex items-center mt-4 text-sm">
              <div className={`flex items-center px-2 py-1 rounded-full ${trendTone[color]}`}>
                <TrendingUp className="w-3 h-3 mr-1" />
                <span className="font-medium">{trend}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const Pill = ({ children, tone = "gray" }) => {
    const tones = {
      gray: "bg-gray-100 text-gray-800 border-gray-200",
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
      amber: "bg-amber-100 text-amber-800 border-amber-200",
      rose: "bg-rose-100 text-rose-800 border-rose-200",
      violet: "bg-violet-100 text-violet-800 border-violet-200",
    };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${tones[tone]}`}>{children}</span>;
  };

  if (loading) return <LoadingBlock />;
  if (err) return <ErrorBlock message={err} />;

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-4 lg:px-6 py-4">
      <div className="w-full max-w-screen-2xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          
            <div className="flex items-start gap-3">
             
             
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <button
                onClick={load}
                disabled={busy}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-50 justify-center"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${busy ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={exportEventsPDF}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Events PDF
              </button>
              <a href="/calendar" className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white justify-center">
                <Calendar className="w-4 h-4 mr-2" />
                Create event
              </a>
            </div>
          
        </div>

        {/* 🔥 Highlighted Stats Section */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="flex items-center mb-6">
            <TrendingUp className="w-5 h-5 text-indigo-600 mr-2" />
            <h2 className="text-lg font-bold text-gray-900">Dashboard Summary</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <MetricCard
              title="Total Events"
              value={nf(totals.events)}
              icon={CalendarRange}
              gradient="from-sky-500 via-sky-600 to-cyan-600"
              trend="+2% vs last month"
              color="blue"
              subtitle={`${rows.filter((r) => r.status === "active").length} active`}
            />
            <MetricCard
              title="Tickets Sold"
              value={nf(totals.tickets)}
              icon={Users}
              trend="+5% vs last month"
              color="emerald"
              subtitle={`${nf(totals.pending)} pending`}
            />
            <MetricCard
              title="Revenue (LKR)"
              value={nf(totals.paid)}
              icon={DollarSign}
              trend="+4% vs last month"
              color="purple"
              subtitle={`Pending LKR ${nf(totals.pending)}`}
            />
            <MetricCard
              title="Utilization"
              value={`${utilizationPct}%`}
              icon={Activity}
              color="orange"
              subtitle={`${nf(totals.capacity - totals.remaining)}/${nf(totals.capacity)} seats`}
            />
          </div>
        </div>

        {/* Events Table Card */}
        <GlassCard className="rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white/80">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Events ({rows.length})</h2>
          </div>

          {/* horizontal scroll on small screens, prevent overflow */}
          <div className="overflow-x-auto">
            {/* min width so columns don't squash on small; sticky header improves usability */}
            <table className="w-full min-w-[880px] lg:min-w-[1000px] text-sm table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-900 w-[22%]">Title</th>
                  <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-900 w-[17%]">Start</th>
                  <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-900 w-[17%] hidden md:table-cell">End</th>
                  <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-900 w-[16%]">Venue</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-semibold text-gray-900 w-[11%]">Cap/Remain</th>
                  <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-900 w-[9%]">Status</th>
                  <th className="text-right px-4 sm:px-6 py-3 font-semibold text-gray-900 w-[8%]">Tickets</th>
                  <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-900 w-[8%]">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 align-top">
                {rows.map((r) => {
                  const total = r.stats?.ticketsTotal ?? 0;
                  const paid = r.stats?.paid ?? 0;
                  const pending = r.stats?.pending ?? 0;
                  const hasBookings = total > 0;

                  const statusPill =
                    r.status === "active" ? (
                      <Pill tone="emerald">active</Pill>
                    ) : r.status === "cancelled" ? (
                      <span className="inline-flex items-center space-x-1">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <Pill tone="rose">cancelled</Pill>
                      </span>
                    ) : (
                      <Pill tone="gray">{r.status || "unknown"}</Pill>
                    );

                  return (
                    <tr key={r._id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Title + tags */}
                      <td className="px-4 sm:px-6 py-3">
                        <div className="font-semibold text-gray-900 truncate" title={r.title}>
                          {r.title}
                        </div>
                        {r.tags?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {r.tags.map((t, i) => (
                              <Pill key={i} tone="violet">
                                {t}
                              </Pill>
                            ))}
                          </div>
                        ) : null}
                      </td>

                      {/* Start / End */}
                      <td className="px-4 sm:px-6 py-3 text-gray-800">
                        <div className="flex items-center min-w-0">
                          <Clock className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                          <span className="truncate">{dtHuman(r.start)}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-gray-800 hidden md:table-cell">
                        <div className="flex items-center min-w-0">
                          <Clock className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                          <span className="truncate">{dtHuman(r.end)}</span>
                        </div>
                      </td>

                      {/* Venue */}
                      <td className="px-4 sm:px-6 py-3 text-gray-900">
                        <div className="flex items-center min-w-0">
                          <MapPin className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                          <span className="truncate" title={r.venue || "-"}>
                            {r.venue || "-"}
                          </span>
                        </div>
                      </td>

                      {/* Cap/Remain */}
                      <td className="px-4 sm:px-6 py-3 text-right text-gray-900 whitespace-nowrap">
                        <span className="font-medium">{r.capacity}</span>
                        <span className="text-gray-400"> / </span>
                        <span className="font-medium">{r.remainingSeats}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 sm:px-6 py-3">{statusPill}</td>

                      {/* Tickets */}
                      <td className="px-4 sm:px-6 py-3 text-right">
                        <div className="font-semibold text-gray-900">{nf(total)}</div>
                        
                      </td>

                      {/* Actions */}
                      <td className="px-4 sm:px-6 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => viewBookings(r)}
                            className="w-9 h-9 inline-grid place-items-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                            title="View bookings"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => doCancel(r)}
                            disabled={r.status === "cancelled" || busy}
                            className={`w-9 h-9 inline-grid place-items-center rounded-lg ${
                              r.status === "cancelled" || busy
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-amber-50 hover:bg-amber-100 text-amber-700"
                            }`}
                            title="Cancel event"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => doDelete(r)}
                            disabled={hasBookings || busy}
                            className={`w-9 h-9 inline-grid place-items-center rounded-lg ${
                              hasBookings || busy
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-rose-50 hover:bg-rose-100 text-rose-700"
                            }`}
                            title={hasBookings ? "Has bookings" : "Delete event"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals footer */}
              {rows.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 sm:px-6 py-3 font-semibold text-gray-700">Total</td>
                    <td className="px-4 sm:px-6 py-3" />
                    <td className="px-4 sm:px-6 py-3 hidden md:table-cell" />
                    <td className="px-4 sm:px-6 py-3" />
                    <td className="px-4 sm:px-6 py-3 text-right font-semibold text-gray-700">
                      {nf(totals.capacity)} / {nf(totals.remaining)}
                    </td>
                    <td className="px-4 sm:px-6 py-3" />
                    <td className="px-4 sm:px-6 py-3 text-right font-bold text-gray-900">{nf(totals.tickets)}</td>
                    <td className="px-4 sm:px-6 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Empty state (desktop) */}
          {rows.length === 0 && (
            <div className="text-center py-12">
              <CalendarRange className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-600">Create your first event to get started.</p>
            </div>
          )}
        </GlassCard>

        {/* Mobile/cards view */}
        <div className="md:hidden space-y-3">
          {rows.map((r) => {
            const total = r.stats?.ticketsTotal ?? 0;
            const paid = r.stats?.paid ?? 0;
            const pending = r.stats?.pending ?? 0;
            const hasBookings = total > 0;

            return (
              <div key={r._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 break-words">{r.title}</div>
                    {r.tags?.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.tags.map((t, i) => (
                          <Pill key={i} tone="violet">
                            {t}
                          </Pill>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    {r.status === "active" ? (
                      <Pill tone="emerald">active</Pill>
                    ) : r.status === "cancelled" ? (
                      <Pill tone="rose">cancelled</Pill>
                    ) : (
                      <Pill tone="gray">{r.status || "unknown"}</Pill>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-700">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-emerald-600" />
                    {dtHuman(r.start)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-emerald-600" />
                    {dtHuman(r.end)}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-emerald-600" />
                    <span className="break-words">{r.venue || "-"}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2 text-emerald-600" />
                    {r.capacity} / {r.remainingSeats}
                  </div>
                  <div className="text-gray-900">
                    <span className="font-semibold">{nf(total)}</span>
                    
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => viewBookings(r)}
                    className="w-9 h-9 inline-grid place-items-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                    title="View bookings"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => doCancel(r)}
                    disabled={r.status === "cancelled" || busy}
                    className={`w-9 h-9 inline-grid place-items-center rounded-lg ${
                      r.status === "cancelled" || busy
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-700"
                    }`}
                    title="Cancel event"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => doDelete(r)}
                    disabled={hasBookings || busy}
                    className={`w-9 h-9 inline-grid place-items-center rounded-lg ${
                      hasBookings || busy
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-rose-50 hover:bg-rose-100 text-rose-700"
                    }`}
                    title={hasBookings ? "Has bookings" : "Delete event"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {!rows.length && <div className="text-center text-gray-500">No events yet.</div>}
        </div>

        {/* Bookings modal */}
        {open && (
          <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/50 grid place-items-center z-[9999] px-3">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-[min(900px,95vw)] max-h-[85vh] overflow-auto rounded-2xl p-4 md:p-6 border border-gray-200 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold text-gray-900">Event Bookings</h3>
                  <p className="text-gray-600 truncate">{target?.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportEventBookingsPDF}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    title="Download bookings PDF"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download PDF
                  </button>
                  <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                    Close
                  </button>
                </div>
              </div>

              {bookings.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] table-auto">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-4 md:px-6 py-3 font-semibold text-gray-900">User</th>
                        <th className="text-right px-4 md:px-6 py-3 font-semibold text-gray-900">Tickets</th>
                        <th className="text-left px-4 md:px-6 py-3 font-semibold text-gray-900">Payment</th>
                        <th className="text-left px-4 md:px-6 py-3 font-semibold text-gray-900">Status</th>
                        <th className="text-left px-4 md:px-6 py-3 font-semibold text-gray-900">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bookings.map((b) => (
                        <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 md:px-6 py-3">
                            <div className="font-medium text-gray-900 break-words">{b.user?.name || "-"}</div>
                            <div className="text-sm text-gray-500 break-words">{b.user?.email || "-"}</div>
                          </td>
                          <td className="px-4 md:px-6 py-3 text-right text-gray-900">{b.tickets}</td>
                          <td className="px-4 md:px-6 py-3">
                            {b.paymentStatus === "paid" ? (
                              <span className="inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <Pill tone="emerald">paid</Pill>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1">
                                <Clock className="w-4 h-4 text-amber-600" />
                                <Pill tone="amber">pending</Pill>
                              </span>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-3">
                            {b.status === "booked" ? (
                              <Pill tone="blue">booked</Pill>
                            ) : b.status === "cancelled" ? (
                              <span className="inline-flex items-center space-x-1">
                                <XCircle className="w-4 h-4 text-rose-600" />
                                <Pill tone="rose">cancelled</Pill>
                              </span>
                            ) : (
                              <Pill tone="gray">{b.status || "unknown"}</Pill>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-3 whitespace-nowrap text-gray-700">{dtHuman(b.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-500">No bookings.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
