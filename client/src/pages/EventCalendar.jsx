// client/src/pages/EventCalendar.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  listEvents, createEvent, updateEvent, cancelEvent, deleteEvent, getEventBookings
} from "../api/events";
import { useAuth } from "../context/AuthProvider";
import {
  Calendar as CalendarIcon, Users, Plus, Edit3, Ticket, MapPin, Clock, X, Ban, CheckCircle2
} from "lucide-react";

/** Tailwind Modal (glass overlay) — viewport-safe */
function Modal({ open, onClose, children }) {
  if (!open) return null;
  const node = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm p-4 sm:p-6 grid place-items-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-4xl md:max-w-5xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {children}
      </div>
    </div>
  );
  return createPortal(node, document.body);
}

/** Pretty Toast (glass, gradient border) */
function Toast({ open, onClose, title = "", message = "", variant = "success" }) {
  if (!open) return null;

  const color =
    variant === "success" ? "from-emerald-500 to-teal-500"
    : variant === "error" ? "from-rose-500 to-red-500"
    : "from-slate-500 to-gray-500";

  return createPortal(
    <div
      className="fixed bottom-6 right-6 z-[100001] w-[92vw] max-w-sm"
      role="status"
      aria-live="polite"
    >
      <div className="relative rounded-2xl p-[2px] bg-gradient-to-r shadow-2xl"
           style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))` }}>
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 pl-3 pr-2 border border-white/60">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r ${color} text-white grid place-items-center shadow`}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{title}</div>
              {message && <div className="text-sm text-gray-700 mt-0.5">{message}</div>}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label="Close notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const toISO = (val) => { const d = new Date(val); return isNaN(d.getTime()) ? null : d.toISOString(); };
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
};

/** NEW: helper to detect events that are already over (past end time) */
const isEventPast = (ev) => {
  try {
    const end = ev?.end ? new Date(ev.end) : (ev?.start ? new Date(ev.start) : null);
    if (!end || isNaN(end.getTime())) return false;
    return end.getTime() < Date.now();
  } catch {
    return false;
  }
};

/** Optional brand icon for header background detail */
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

export default function EventCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only EVENT MANAGER can manage (create/edit/cancel/delete)
  const canManage = user?.role === "eventmanager";

  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "", description: "", venue: "", start: "", end: "", capacity: 1, price: 0
  });

  // View/Edit
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Manager: bookings table for selected event
  const [eventBookings, setEventBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Day list for users
  const [dayOpen, setDayOpen] = useState(false);
  const [dayItems, setDayItems] = useState([]);
  const [dayLabel, setDayLabel] = useState("");

  // Themed toolbar state
  const [calTitle, setCalTitle] = useState("");
  const [activeView, setActiveView] = useState("dayGridMonth");

  // Success Toast state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  const calendarRef = useRef(null);
  const createTitleRef = useRef(null);

  // NEW: memo for whether the currently opened event is in the past (used in user modal)
  const currentEnded = useMemo(() => (current ? isEventPast(current) : false), [current]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    const mOpen = modalOpen || createOpen || editOpen || dayOpen;
    const prev = document.body.style.overflow;
    if (mOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [modalOpen, createOpen, editOpen, dayOpen]);

  const load = async () => {
    const data = await listEvents(canManage ? { includeBookingStats: 1 } : {});
    setEvents(data);
  };
  useEffect(() => { load(); }, [canManage]);

  const fcEvents = useMemo(
    () =>
      events.map((e) => {
        let title;
        if (canManage && e.stats) {
          const total = e.stats.ticketsTotal || 0;
          const pd = e.stats.paid || 0;
          const pn = e.stats.pending || 0;
          title = `${e.title}${e.status === "cancelled" ? " (Cancelled)" : ""} • ${total} booked (paid ${pd}, pending ${pn})`;
        } else {
          title = `${e.title}${e.status === "cancelled" ? " (Cancelled)" : ""}`;
        }
        return { id: e._id, title, start: e.start, end: e.end, extendedProps: e };
      }),
    [events, canManage]
  );

  const openCreateAt = (dateStr) => {
    const base = new Date(dateStr);
    const start = new Date(base); start.setHours(10, 0, 0, 0);
    const end = new Date(base);   end.setHours(11, 0, 0, 0);
    setCreateForm({ title: "", description: "", venue: "", start: start.toISOString(), end: end.toISOString(), capacity: 1, price: 0 });
    calendarRef.current?.getApi().unselect();
    setModalOpen(true);
    setCreateOpen(true);
    setTimeout(() => createTitleRef.current?.focus(), 0);
  };

  const onDateClick = (info) => {
    if (canManage) {
      openCreateAt(info.dateStr);
    } else {
      const dayStart = new Date(info.dateStr);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const items = events.filter((e) => new Date(e.start) < dayEnd && new Date(e.end) >= dayStart);
      setDayItems(items);
      setDayLabel(dayStart.toDateString());
      setModalOpen(true);
      setDayOpen(true);
    }
  };

  const onSelect = (info) => {
    if (!canManage) return;
    setCreateForm({ title: "", description: "", venue: "", start: info.startStr, end: info.endStr || info.startStr, capacity: 1, price: 0 });
    calendarRef.current?.getApi().unselect();
    setModalOpen(true);
    setCreateOpen(true);
    setTimeout(() => createTitleRef.current?.focus(), 0);
  };

  const onEventClick = async (clickInfo) => {
    const e = clickInfo.event.extendedProps;
    setCurrent(e);
    setEditOpen(true);
    setModalOpen(true);

    if (canManage) {
      setBookingsLoading(true);
      try {
        const rows = await getEventBookings(e._id);
        setEventBookings(rows);
      } catch {
        setEventBookings([]);
      } finally {
        setBookingsLoading(false);
      }
    }
  };

  const onEventDropOrResize = async (changeInfo) => {
    if (!canManage) return;
    const e = changeInfo.event;
    try {
      await updateEvent(e.id, { start: e.start?.toISOString(), end: e.end?.toISOString() });
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Update failed");
      changeInfo.revert();
    }
  };

  const closeAll = () => {
    setCreateOpen(false);
    setEditOpen(false);
    setDayOpen(false);
    setCurrent(null);
    setModalOpen(false);
  };

  // -------- New: Success toast helper --------
  const showSuccess = (title, message = "") => {
    setToastTitle(title);
    setToastMsg(message);
    setToastOpen(true);
    // auto dismiss
    window.clearTimeout(showSuccess._t);
    showSuccess._t = window.setTimeout(() => setToastOpen(false), 3000);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        venue: createForm.venue.trim(),
        start: toISO(createForm.start),
        end: toISO(createForm.end),
        capacity: Number(createForm.capacity),
        price: Number(createForm.price) || 0
      };
      await createEvent(payload);

      // Close modal before showing toast
      closeAll();

      // Pretty success toast
      const when = createForm.start ? new Date(createForm.start).toLocaleString() : "";
      showSuccess("Event created successfully 🎉", `${payload.title}${when ? ` • ${when}` : ""}`);

      // Refresh events
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Create failed");
    }
  };

  useEffect(() => {
    if (!current) return;
    setEditForm({
      title: current.title || "",
      description: current.description || "",
      venue: current.venue || "",
      start: toLocalInput(current.start),
      end: toLocalInput(current.end),
      capacity: current.capacity || 1,
      status: current.status || "active",
      price: current.price ?? 0
    });
  }, [current]);

  const submitEdit = async () => {
    try {
      await updateEvent(current._id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        venue: editForm.venue.trim(),
        start: toISO(editForm.start),
        end: toISO(editForm.end),
        capacity: Number(editForm.capacity),
        status: editForm.status,
        price: Number(editForm.price) || 0
      });
      closeAll();
      showSuccess("Changes saved", editForm.title || "");
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Update failed");
    }
  };

  const doDelete = async () => {
    if (!confirm("Delete this event permanently?")) return;
    try {
      await deleteEvent(current._id);
      closeAll();
      showSuccess("Event deleted");
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Delete failed");
    }
  };

  const currentHasBookings = canManage && current?.stats && (current.stats.ticketsTotal > 0);

  /** Custom render for FC events (badge style + cancelled) */
  const renderEventContent = (arg) => {
    const e = arg.event.extendedProps;
    const cancelled = e?.status === "cancelled";
    return (
      <div
        className={`px-2 py-1 rounded text-xs font-medium truncate ${
          cancelled ? "bg-red-100 text-red-800 line-through" : "bg-emerald-100 text-emerald-800"
        }`}
        title={arg.event.title}
      >
        {arg.timeText && <span className="mr-1">{arg.timeText}</span>}
        {arg.event.title}
      </div>
    );
  };

  /** ===== Themed Toolbar handlers ===== */
  const api = () => calendarRef.current?.getApi();

  const goPrev = () => { api()?.prev(); syncTitle(); };
  const goNext = () => { api()?.next(); syncTitle(); };
  const goToday = () => { api()?.today(); syncTitle(); };

  const changeView = (viewName) => {
    api()?.changeView(viewName);
    setActiveView(viewName);
    syncTitle();
  };

  const syncTitle = () => {
    const t = api()?.view?.title || "";
    setCalTitle(t);
  };

  const onDatesSet = () => syncTitle();

  /** ===== Render ===== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Gradient Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute top-8 left-8 opacity-10 animate-pulse">
            <img
              src="../src/assets/logo.png"
              alt="Hasthi.lk Logo"
              className="h-35 w-35 object-contain shrink-0 rounded-full p-1 shadow-md"
            />
          </div>
          <div className="absolute bottom-8 right-8 opacity-10 rotate-12">
            <img
              src="../src/assets/logo.png"
              alt="Hasthi.lk Logo"
              className="h-35 w-35 object-contain shrink-0 rounded-full p-1 shadow-md"
            />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ElephantIcon className="w-12 h-12 text-white mr-4" />
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Event Calendar</h1>
                <p className="text-emerald-100">
                  {canManage ? "Create and manage events" : "Discover and book elephant conservation events"}
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
              <Users className="w-5 h-5 mr-2 text-emerald-100" />
              <span className="text-white">{user ? `${user.name} (${user.role})` : "Guest"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Themed Toolbar (replaces FC headerToolbar) */}
        <div className="bg-white rounded-2xl shadow-lg mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border-b border-gray-200">
            {/* Left: navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50"
                aria-label="Previous"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" className="text-gray-700">
                  <path fill="currentColor" d="M15.41 7.41L14 6l-6 6l6 6l1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              <button
                onClick={goToday}
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-white font-medium shadow hover:from-emerald-600 hover:to-teal-600"
              >
                Today
              </button>
              <button
                onClick={goNext}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50"
                aria-label="Next"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" className="text-gray-700">
                  <path fill="currentColor" d="m8.59 16.59L10 18l6-6l-6-6l-1.41 1.41L13.17 12z"/>
                </svg>
              </button>

              <div className="ml-3 hidden sm:flex items-center text-gray-700">
                <CalendarIcon className="w-5 h-5 text-emerald-600 mr-2" />
                <span className="font-semibold">{calTitle}</span>
              </div>
            </div>

            {/* Right: view switcher */}
            <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden">
              {[
                { id: "dayGridMonth", label: "Month" },
                { id: "timeGridWeek", label: "Week" },
                { id: "timeGridDay", label: "Day" },
              ].map((v, i) => {
                const active = activeView === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => changeView(v.id)}
                    className={
                      "px-4 py-2 text-sm font-medium " +
                      (active
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50")
                    }
                    style={{ borderLeft: i === 0 ? "none" : "1px solid #e5e7eb" }}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar */}
          <div className="p-2 sm:p-4">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              selectable={canManage && !modalOpen}
              editable={canManage && !modalOpen}
              selectMirror
              events={fcEvents}
              dateClick={onDateClick}
              select={onSelect}
              eventClick={onEventClick}
              eventDrop={onEventDropOrResize}
              eventResize={onEventDropOrResize}
              eventContent={renderEventContent}
              datesSet={onDatesSet}
              height="auto"
            />
          </div>
        </div>

        {/* How-to card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
          <div className="flex items-start gap-4">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How to use the calendar</h3>
              <div className="space-y-2 text-gray-600">
                {canManage ? (
                  <>
                    <p className="flex items-center"><Plus className="w-4 h-4 mr-2 text-emerald-600" /> Click any date (or select a range) to create events</p>
                    <p className="flex items-center"><Edit3 className="w-4 h-4 mr-2 text-emerald-600" /> Drag to reschedule, click events to edit or view bookings</p>
                    <p className="flex items-center"><Ticket className="w-4 h-4 mr-2 text-emerald-600" /> Green = active, Red = cancelled</p>
                  </>
                ) : (
                  <>
                    <p className="flex items-center"><Ticket className="w-4 h-4 mr-2 text-emerald-600" /> Click a day to see events, then book</p>
                    <p className="flex items-center"><Users className="w-4 h-4 mr-2 text-emerald-600" /> Bring friends—limited seats per event</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal (Event Manager only) */}
      <Modal open={createOpen && canManage} onClose={closeAll}>
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mr-4">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Create Event</h3>
            </div>
            <button onClick={closeAll} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={submitCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Title</label>
                <input
                  ref={createTitleRef}
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Event title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Venue</label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Venue"
                  value={createForm.venue}
                  onChange={(e) => setCreateForm((f) => ({ ...f, venue: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Start</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={toLocalInput(createForm.start)}
                  onChange={(e) => setCreateForm((f) => ({ ...f, start: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">End</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={toLocalInput(createForm.end)}
                  onChange={(e) => setCreateForm((f) => ({ ...f, end: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Capacity</label>
                <input
                  type="number" min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={createForm.capacity}
                  onChange={(e) => setCreateForm((f) => ({ ...f, capacity: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Ticket Price (LKR)</label>
                <input
                  type="number" min="0" step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                  value={createForm.price}
                  onChange={(e) => setCreateForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Description</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                placeholder="Event description"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={closeAll} className="px-5 py-3 rounded-xl border hover:bg-gray-50">
                Close
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* View / Edit Modal */}
      <Modal open={editOpen && !!current} onClose={closeAll}>
        {current && (
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                  current.status === 'cancelled'
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}>
                  {current.status === 'cancelled'
                    ? <Ban className="w-6 h-6 text-white" />
                    : <CalendarIcon className="w-6 h-6 text-white" />
                  }
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{current.title}</h3>
                  {current.status === "cancelled" && (
                    <span className="inline-block px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full mt-1">
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
              <button onClick={closeAll} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <Clock className="w-5 h-5 mr-3 text-emerald-600" />
                  <div>
                    <div className="font-medium">Start</div>
                    <div className="text-sm">{new Date(current.start).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-5 h-5 mr-3 text-emerald-600" />
                  <div>
                    <div className="font-medium">End</div>
                    <div className="text-sm">{new Date(current.end).toLocaleString()}</div>
                  </div>
                </div>
                {current.venue && (
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-5 h-5 mr-3 text-emerald-600" />
                    <div>
                      <div className="font-medium">Venue</div>
                      <div className="text-sm">{current.venue}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-3 text-emerald-600" />
                  <div>
                    <div className="font-medium">Capacity</div>
                    <div className="text-sm">{current.capacity} people</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <Ticket className="w-5 h-5 mr-3 text-emerald-600" />
                  <div>
                    <div className="font-medium">Available Seats</div>
                    <div className="text-sm">{current.remainingSeats} remaining</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <Ticket className="w-5 h-5 mr-3 text-emerald-600" />
                  <div>
                    <div className="font-medium">Ticket Price</div>
                    <div className="text-sm">LKR {Intl.NumberFormat().format(current.price ?? 0)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Manager edit + bookings */}
            {canManage && (
              <>
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Edit</h4>
                  {editForm && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={editForm.title}
                        onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))}
                        placeholder="Title"
                      />
                      <input
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={editForm.venue}
                        onChange={(e) => setEditForm((s) => ({ ...s, venue: e.target.value }))}
                        placeholder="Venue"
                      />
                      <input
                        type="datetime-local"
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={editForm.start}
                        onChange={(e) => setEditForm((s) => ({ ...s, start: e.target.value }))}
                      />
                      <input
                        type="datetime-local"
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={editForm.end}
                        onChange={(e) => setEditForm((s) => ({ ...s, end: e.target.value }))}
                      />
                      <input
                        type="number" min="1"
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={editForm.capacity}
                        onChange={(e) => setEditForm((s) => ({ ...s, capacity: e.target.value }))}
                        placeholder="Capacity"
                      />
                      <select
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={editForm.status}
                        onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value }))}
                      >
                        <option value="active">active</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                      <input
                        type="number" min="0" step="0.01"
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        value={editForm.price}
                        onChange={(e) => setEditForm((s) => ({ ...s, price: e.target.value }))}
                        placeholder="Ticket price"
                      />
                      <input
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 md:col-span-2"
                        value={editForm.description}
                        onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))}
                        placeholder="Description"
                      />
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Bookings</h4>
                  {bookingsLoading ? (
                    <div className="text-gray-600">Loading…</div>
                  ) : eventBookings.length === 0 ? (
                    <div className="text-gray-500">No bookings yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[520px] w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="px-3 py-2">User</th>
                            <th className="px-3 py-2 text-center">Tickets</th>
                            <th className="px-3 py-2 text-center">Status</th>
                            <th className="px-3 py-2 text-center">Payment</th>
                            <th className="px-3 py-2">When</th>
                          </tr>
                        </thead>
                        <tbody className="[&>tr]:border-t [&>tr]:border-gray-100">
                          {eventBookings.map((b) => (
                            <tr key={b._id}>
                              <td className="px-3 py-2">
                                {b.user?.name} <span className="opacity-70">({b.user?.email})</span>
                              </td>
                              <td className="px-3 py-2 text-center">{b.tickets}</td>
                              <td className="px-3 py-2 text-center">{b.status}</td>
                              <td className="px-3 py-2 text-center">{b.paymentStatus}</td>
                              <td className="px-3 py-2">{new Date(b.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (!confirm("Cancel this event?")) return;
                        try {
                          await cancelEvent(current._id);
                          closeAll();
                          showSuccess("Event cancelled", current.title || "");
                          await load();
                        } catch (e) {
                          alert(e?.response?.data?.message || "Cancel failed");
                        }
                      }}
                      disabled={current.status === "cancelled"}
                      className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                      title={current.status === "cancelled" ? "Already cancelled" : ""}
                    >
                      Cancel Event
                    </button>
                    <button
                      onClick={doDelete}
                      disabled={currentHasBookings}
                      className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
                      title={currentHasBookings ? "Cannot delete an event that has bookings" : ""}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={closeAll} className="px-4 py-2 rounded-lg border hover:bg-gray-50">Close</button>
                    <button
                      onClick={async () => { await submitEdit(); await load(); }}
                      className="px-5 py-2 rounded-lg text-white font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </>
            )}

            {!canManage && (
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => { if (currentEnded) return; const id = current._id; closeAll(); navigate(`/events/${id}/book`); }}
                  disabled={currentEnded}
                  className="px-4 py-2 rounded-lg text-white font-medium bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {currentEnded ? "Ended" : "Book on page"}
                </button>
                <button onClick={closeAll} className="px-4 py-2 rounded-lg border hover:bg-gray-50">Close</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Day list (User) */}
      <Modal open={dayOpen} onClose={closeAll}>
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Events on {dayLabel}</h3>
            <button onClick={closeAll} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {dayItems.length === 0 ? (
            <p className="text-gray-600">No events for this day.</p>
          ) : (
            <div className="grid gap-3">
              {dayItems.map((ev) => (
                <div key={ev._id} className="border border-gray-200 rounded-xl p-4 bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {ev.title}{" "}
                        {ev.status === "cancelled" && (
                          <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 align-middle">
                            Cancelled
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {new Date(ev.start).toLocaleString()} → {new Date(ev.end).toLocaleString()}
                        {ev.venue ? ` • ${ev.venue}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-right text-gray-600">
                      Cap {ev.capacity} • Left {ev.remainingSeats}
                    </div>
                  </div>

                  {ev.description && <div className="mt-2 text-sm text-gray-700">{ev.description}</div>}

                  <div className="mt-3 text-right">
                    <button
                      onClick={() => { if (isEventPast(ev)) return; closeAll(); navigate(`/events/${ev._id}/book`); }}
                      disabled={ev.status !== "active" || ev.remainingSeats <= 0 || isEventPast(ev)}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        (ev.status !== "active" || ev.remainingSeats <= 0 || isEventPast(ev))
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                      }`}
                    >
                      {ev.status !== "active"
                        ? "Unavailable"
                        : ev.remainingSeats <= 0
                        ? "Sold out"
                        : isEventPast(ev)
                        ? "Ended"
                        : "Book"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-right mt-4">
            <button onClick={closeAll} className="px-4 py-2 rounded-lg border hover:bg-gray-50">Close</button>
          </div>
        </div>
      </Modal>

      {/* Global Success Toast */}
      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        title={toastTitle}
        message={toastMsg}
        variant="success"
      />
    </div>
  );
}
