// client/src/components/QuickPackageBooking.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, X, ArrowRight, AlertCircle, Calendar, MapPin, 
  Clock, Sparkles, TrendingUp, Heart, Star, CheckCircle,
  Gift, Zap, Shield, Smile
} from "lucide-react";
import { listEvents, getEvent } from "../api/events";

// ---- Images for packages (place files in client/src/assets/) ----
import CoupleImg from "../assets/pack1.png";
import FamilyImg from "../assets/pack2.png";
import MaxImg from "../assets/pack3.png";

// ---- Enhanced Helpers ----
function money(n) {
  const val = Number(n || 0);
  if (!Number.isFinite(val) || val <= 0) return "TBA";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
  })
    .format(val)
    .replace("LKR", "Rs.");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

function getTimeUntilEvent(dateStr) {
  if (!dateStr) return "";
  try {
    const eventDate = new Date(dateStr);
    const now = new Date();
    const diffMs = eventDate.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (days < 1) return "Today";
    if (days === 1) return "Tomorrow";
    if (days <= 7) return `In ${days} days`;
    if (days <= 30) return `In ${Math.ceil(days / 7)} weeks`;
    return `In ${Math.ceil(days / 30)} months`;
  } catch {
    return "";
  }
}

// ---- Enhanced Packages with more details ----
const PACKAGES = [
  {
    key: "couple",
    label: "Romantic Escape",
    subtitle: "Perfect for Two",
    people: 2,
    blurb: "Intimate experience designed for couples",
    description: "Create unforgettable memories together with our specially curated couple's experience. Includes priority seating and romantic photo opportunities.",
    grad: "from-rose-400 via-pink-500 to-red-500",
    lightGrad: "from-rose-50 to-pink-50",
    img: CoupleImg,
    alt: "Couple enjoying the sanctuary",
    icon: Heart,
    benefits: ["Priority seating", "Photo opportunities", "Couple's guide", "Romantic ambiance"],
    popular: false,
    discount: 0,
  },
  {
    key: "family",
    label: "Family Adventure",
    subtitle: "Bring the Whole Crew",
    people: 4,
    blurb: "Perfect family bonding experience",
    description: "A comprehensive family experience with activities for all ages. Special attention to children's safety and engagement throughout the visit.",
    grad: "from-emerald-400 via-teal-500 to-cyan-500",
    lightGrad: "from-emerald-50 to-teal-50",
    img: FamilyImg,
    alt: "Happy family visiting with children",
    icon: Users,
    benefits: ["Child-friendly activities", "Family photos", "Safety priority", "Educational content"],
    popular: true,
    discount: 10,
  },
  {
    key: "max",
    label: "Group Celebration",
    subtitle: "Big Group Vibes",
    people: 8,
    blurb: "Ultimate group experience",
    description: "Perfect for celebrations, team building, or large family gatherings. Includes group coordination and special arrangements.",
    grad: "from-blue-400 via-indigo-500 to-purple-500",
    lightGrad: "from-blue-50 to-indigo-50",
    img: MaxImg,
    alt: "Large group at the event",
    icon: Sparkles,
    benefits: ["Group coordination", "Celebration setup", "Team activities", "Group discounts"],
    popular: false,
    discount: 15,
  },
];

// Enhanced default entry with different pricing tiers
const ENTRY_PRICING = {
  adult: 1200,
  child: 700,
  senior: 1000,
  student: 900,
};

export default function QuickPackageBooking() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const modalRef = useRef(null);

  const [pkg, setPkg] = useState(PACKAGES[1]); // Default to popular family package
  const [mode, setMode] = useState("entry");

  // ENTRY (enhanced with more ticket types)
  const [entryDate, setEntryDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(2);
  const [showAdvancedEntry, setShowAdvancedEntry] = useState(false);

  const totalTickets = useMemo(() => adults + children, [adults, children]);
  const entryTotal = useMemo(
    () => adults * ENTRY_PRICING.adult + children * ENTRY_PRICING.child,
    [adults, children]
  );

  // Validate ticket distribution
  const ticketsValid = totalTickets === pkg.people;

  // EVENT (enhanced with filtering and sorting)
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [evErr, setEvErr] = useState("");
  const [eventId, setEventId] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [eventFilter, setEventFilter] = useState("all"); // all, today, week, month
  const [sortBy, setSortBy] = useState("date"); // date, price, popularity

  // Enhanced event loading with filters
  const loadEvents = useCallback(async () => {
    if (!open || mode !== "event") return;
    
    setLoadingEvents(true);
    setEvErr("");
    
    try {
      const arr = await listEvents();
      const now = Date.now();
      
      let filtered = (Array.isArray(arr) ? arr : [])
        .filter((e) => (!e.status || e.status === "active") && e.start && new Date(e.start).getTime() >= now);

      // Apply date filter
      if (eventFilter === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        filtered = filtered.filter(e => {
          const eventDate = new Date(e.start);
          return eventDate >= today && eventDate < tomorrow;
        });
      } else if (eventFilter === "week") {
        const weekFromNow = new Date(now + 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(e => new Date(e.start).getTime() <= weekFromNow.getTime());
      } else if (eventFilter === "month") {
        const monthFromNow = new Date(now + 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(e => new Date(e.start).getTime() <= monthFromNow.getTime());
      }

      // Apply sorting
      if (sortBy === "date") {
        filtered.sort((a, b) => new Date(a.start) - new Date(b.start));
      } else if (sortBy === "price") {
        filtered.sort((a, b) => {
          const priceA = Number(a.ticketPrice || a.price || 0);
          const priceB = Number(b.ticketPrice || b.price || 0);
          return priceA - priceB;
        });
      } else if (sortBy === "popularity") {
        filtered.sort((a, b) => (b.bookings || 0) - (a.bookings || 0));
      }

      setEvents(filtered);
      setEventId(filtered[0]?._id ? String(filtered[0]._id) : "");
    } catch (e) {
      setEvErr(e?.response?.data?.message || "Failed to load events");
    } finally {
      setLoadingEvents(false);
    }
  }, [open, mode, eventFilter, sortBy]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Enhanced event detail fetching
  useEffect(() => {
    if (!eventId) {
      setSelectedDetail(null);
      return;
    }
    
    let cancelled = false;
    (async () => {
      try {
        const full = await getEvent(eventId);
        if (!cancelled) setSelectedDetail(full || null);
      } catch {
        if (!cancelled) setSelectedDetail(null);
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const selectedFromList = useMemo(
    () => events.find((e) => String(e._id) === String(eventId)),
    [events, eventId]
  );

  const eventUnitPrice = useMemo(() => {
    const d = Number(selectedDetail?.ticketPrice ?? selectedDetail?.price);
    if (Number.isFinite(d) && d > 0) return d;
    const l = Number(selectedFromList?.ticketPrice ?? selectedFromList?.price);
    if (Number.isFinite(l) && l > 0) return l;
    return 0;
  }, [selectedDetail, selectedFromList]);

  const packageTotal = useMemo(() => pkg.people * eventUnitPrice, [pkg.people, eventUnitPrice]);
  const discountAmount = useMemo(() => packageTotal * (pkg.discount / 100), [packageTotal, pkg.discount]);
  const finalTotal = useMemo(() => packageTotal - discountAmount, [packageTotal, discountAmount]);

  // Enhanced modal animations
  const resetFormFor = useCallback((nextPkg) => {
    setPkg(nextPkg);
    setMode("entry");
    setEntryDate("");
    setAdults(Math.ceil(nextPkg.people * 0.6));
    setChildren(Math.floor(nextPkg.people * 0.4));
    setEvents([]);
    setEventId("");
    setEvErr("");
    setSelectedDetail(null);
    setShowAdvancedEntry(false);
    setAnimationStep(0);
    setOpen(true);
    
    // Stagger animations
    setTimeout(() => setAnimationStep(1), 100);
    setTimeout(() => setAnimationStep(2), 200);
  }, []);

  // Enhanced navigation with better state management
  const goEntry = useCallback(() => {
    nav("/entry/book", {
      state: {
        quickPackage: true,
        packageKey: pkg.key,
        lockCounts: true,
        lockedTickets: pkg.people,
        items: [
          { type: "adult", qty: adults },
          { type: "child", qty: children },
        ],
        day: entryDate || undefined,
        discount: pkg.discount,
        totalAmount: entryTotal - (entryTotal * pkg.discount / 100),
      },
    });
  }, [nav, pkg, adults, children, entryDate, entryTotal]);

  const goEvent = useCallback(() => {
    if (!eventId) return nav("/calendar");

    nav(`/events/${eventId}/book`, {
      state: {
        quickPackage: true,
        packageKey: pkg.key,
        lockQuantity: true,
        quantity: pkg.people,
        unitHint: eventUnitPrice > 0 ? eventUnitPrice : undefined,
        discount: pkg.discount,
        totalAmount: finalTotal,
      },
    });
  }, [nav, eventId, pkg, eventUnitPrice, finalTotal]);

  // Enhanced event option display
  const getEventOptionLabel = useCallback((ev) => {
    const per = Number(ev?.ticketPrice ?? ev?.price ?? 0);
    const perLabel = money(per);
    const totalLabel = per > 0 ? money(per * pkg.people) : "TBA";
    const timeUntil = getTimeUntilEvent(ev.start);
    const venue = ev.venue ? ` • ${ev.venue}` : "";
    const bookings = ev.bookings ? ` • ${ev.bookings} booked` : "";
    
    return `${ev.title || "Event"} • ${timeUntil}${venue}${bookings} • ${perLabel}/person • ${totalLabel} total`;
  }, [pkg.people]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && modalRef.current) {
        // Enhanced tab trapping would go here
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Auto-adjust tickets when package changes
  useEffect(() => {
    if (!open) return;
    const newAdults = Math.ceil(pkg.people * 0.6);
    const newChildren = pkg.people - newAdults;
    setAdults(newAdults);
    setChildren(newChildren);
  }, [pkg.people, open]);

  return (
    <section className="mb-20 relative overflow-hidden">
      {/* Enhanced decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 rounded-full opacity-40 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-full opacity-40 blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-rose-100 via-pink-100 to-red-100 rounded-full opacity-30 blur-3xl animate-pulse" style={{ animationDelay: "4s" }}></div>
      </div>

      <div className="relative container mx-auto px-4">
        {/* Enhanced header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full text-emerald-700 font-medium text-sm mb-6">
            <Zap className="w-4 h-4" />
            Quick & Easy Booking
          </div>
          <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 bg-clip-text text-transparent mb-4">
            Choose Your Perfect
            <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Experience Package
            </span>
          </h2>
          <p className="text-gray-600 text-xl max-w-2xl mx-auto leading-relaxed">
            Pre-configured packages with locked ticket counts and instant pricing. 
            Simply pick your group size and we'll handle the rest.
          </p>
        </div>

        {/* Enhanced package grid with larger images */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {PACKAGES.map((p, index) => {
            const Icon = p.icon;
            return (
              <div
                key={p.key}
                className="group relative"
                style={{
                  animation: "fadeInUp 0.8s ease-out forwards",
                  animationDelay: `${index * 150}ms`,
                  opacity: 0,
                }}
              >
                {/* Popular badge */}
                {p.popular && (
                  <div className="absolute -top-3 -right-3 z-20 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    POPULAR
                  </div>
                )}

                {/* Discount badge */}
                {p.discount > 0 && (
                  <div className="absolute -top-3 -left-3 z-20 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    {p.discount}% OFF
                  </div>
                )}

                <button
                  onClick={() => resetFormFor(p)}
                  className="w-full bg-white rounded-3xl overflow-hidden shadow-xl border-2 border-transparent hover:border-emerald-200 hover:shadow-2xl transition-all duration-700 text-left relative group-hover:-translate-y-3 group-hover:rotate-1"
                  style={{ transformOrigin: "center bottom" }}
                >
                  {/* Enhanced hover overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${p.grad} opacity-0 group-hover:opacity-10 transition-all duration-700 rounded-3xl z-10`}></div>
                  
                  {/* Animated background pattern */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-all duration-700 z-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent transform rotate-45 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
                  </div>

                  {/* ENHANCED LARGE PACKAGE IMAGE */}
                  <div className="relative mb-0 overflow-hidden h-80 bg-gradient-to-br from-gray-50 to-gray-100">
                    {/* Background pattern */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-white/50"></div>
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(120, 200, 150, 0.1) 0%, transparent 50%)`,
                    }}></div>
                    
                    {/* Main image with enhanced effects */}
                    <img
                      src={p.img}
                      alt={p.alt}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-105 group-hover:contrast-105 group-hover:saturate-110"
                    />
                    
                    {/* Multiple overlay effects */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-all duration-500" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${p.grad} opacity-0 group-hover:opacity-20 transition-all duration-700`} />
                    
                    {/* Floating icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                      <div className="bg-white/95 backdrop-blur-sm rounded-full p-4 transform scale-0 group-hover:scale-100 transition-all duration-300 delay-200 shadow-xl">
                        <Icon className="w-8 h-8 text-gray-700" />
                      </div>
                    </div>
                    
                    {/* Animated shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
                    
                    {/* Corner accents */}
                    <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100"></div>
                    <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-500 delay-200"></div>
                  </div>

                  {/* Enhanced content section */}
                  <div className="p-8 relative z-20">
                    {/* Enhanced icon with animation */}
                    <div className="relative mb-6">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${p.grad} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                    </div>

                    {/* Enhanced content */}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-gray-900 group-hover:to-gray-600 transition-all duration-500">
                            {p.label}
                          </h3>
                          <p className="text-sm text-gray-500 font-medium">{p.subtitle}</p>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-4 text-base leading-relaxed">{p.description}</p>

                      {/* Benefits list */}
                      <div className="mb-6">
                        <div className="grid grid-cols-2 gap-2">
                          {p.benefits.slice(0, 4).map((benefit, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                              <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Enhanced footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${p.lightGrad} group-hover:from-emerald-50 group-hover:to-teal-50 rounded-xl transition-all duration-500`}>
                            <Users className="w-5 h-5 text-gray-500 group-hover:text-emerald-600 transition-colors duration-300" />
                            <span className="font-bold text-gray-900 text-lg">{p.people}</span>
                            <span className="text-gray-600 group-hover:text-emerald-700 transition-colors duration-300">people</span>
                          </div>
                          {p.discount > 0 && (
                            <div className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg">
                              Save {p.discount}%
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-all duration-300">
                            <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform duration-300" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced shine effect on content */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"></div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Trust indicators */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-8 px-8 py-4 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-2xl">
            <div className="flex items-center gap-2 text-gray-600">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium">Secure Booking</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">Instant Confirmation</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Smile className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">100% Satisfaction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Modal - keeping original modal code for functionality */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            style={{ animation: "fadeIn 0.4s ease-out" }}
            onClick={() => setOpen(false)}
          />
          <div
            ref={modalRef}
            className="relative w-full max-w-4xl max-h-[95vh] overflow-auto bg-white rounded-3xl shadow-2xl border border-gray-200"
            style={{ animation: "slideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          >
            {/* Enhanced header */}
            <div className={`relative px-8 py-6 bg-gradient-to-r ${pkg.grad} text-white rounded-t-3xl overflow-hidden`}>
              <div className="absolute inset-0 bg-black/10 rounded-t-3xl" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden ring-4 ring-white/30 shadow-lg">
                      <img src={pkg.img} alt={pkg.alt} className="w-full h-full object-cover" />
                    </div>
                    {pkg.popular && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 text-yellow-800 fill-current" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/80 font-semibold">Quick Package</div>
                    <div className="text-2xl font-bold flex items-center gap-3">
                      {pkg.label}
                      <div className="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-sm">
                        <Users className="w-4 h-4" />
                        {pkg.people} locked
                      </div>
                    </div>
                    <div className="text-sm text-white/90">{pkg.subtitle}</div>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-3 rounded-2xl bg-white/20 hover:bg-white/30 transition-all duration-300 hover:scale-105"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Enhanced tabs */}
              <div className="flex items-center gap-3 mb-8 bg-gray-100 rounded-2xl p-2">
                <button
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    mode === "entry" 
                      ? "bg-white shadow-lg text-emerald-700 scale-[1.02] ring-2 ring-emerald-100" 
                      : "text-gray-700 hover:bg-gray-50 hover:scale-[1.01]"
                  }`}
                  onClick={() => setMode("entry")}
                >
                  <Calendar className="w-5 h-5" />
                  Entry Tickets
                  <span className={`text-xs px-2 py-1 rounded-full ${mode === "entry" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                    Daily Access
                  </span>
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    mode === "event" 
                      ? "bg-white shadow-lg text-emerald-700 scale-[1.02] ring-2 ring-emerald-100" 
                      : "text-gray-700 hover:bg-gray-50 hover:scale-[1.01]"
                  }`}
                  onClick={() => setMode("event")}
                >
                  <Sparkles className="w-5 h-5" />
                  Event Tickets
                  <span className={`text-xs px-2 py-1 rounded-full ${mode === "event" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                    Special Events
                  </span>
                </button>
              </div>

              {/* Content based on mode */}
              {mode === "entry" ? (
                <div 
                  className={`transition-all duration-500 ${animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                >
                  {/* Enhanced entry mode content */}
                  <div className="mb-6 flex items-start gap-3 text-emerald-800 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200 rounded-2xl p-5">
                    <div className="p-3 bg-emerald-200 rounded-xl flex-shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Ticket Distribution for {pkg.people} People</div>
                      <div className="text-sm">
                        Choose how to distribute your <b>{pkg.people} locked tickets</b> between adults and children. 
                        {pkg.discount > 0 && (
                          <span className="ml-2 px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">
                            {pkg.discount}% Package Discount Applied
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left side - Form inputs */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Visit Date
                        </label>
                        <input
                          type="date"
                          value={entryDate}
                          onChange={(e) => setEntryDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-lg"
                        />
                        {entryDate && (
                          <p className="text-sm text-emerald-600 mt-2 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Selected: {formatDate(entryDate)}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Adults (Age 13+)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={pkg.people}
                              value={adults}
                              onChange={(e) => {
                                const newAdults = Math.max(0, Math.min(pkg.people, Math.floor(Number(e.target.value || 0))));
                                setAdults(newAdults);
                                setChildren(pkg.people - newAdults);
                              }}
                              className={`w-full border-2 rounded-xl px-4 py-4 transition-all duration-200 text-lg font-semibold ${
                                ticketsValid 
                                  ? "border-emerald-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500" 
                                  : "border-red-200 focus:ring-4 focus:ring-red-500/20 focus:border-red-500"
                              }`}
                            />
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                              × {money(ENTRY_PRICING.adult)}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Children (Age 5-12)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={pkg.people}
                              value={children}
                              onChange={(e) => {
                                const newChildren = Math.max(0, Math.min(pkg.people, Math.floor(Number(e.target.value || 0))));
                                setChildren(newChildren);
                                setAdults(pkg.people - newChildren);
                              }}
                              className={`w-full border-2 rounded-xl px-4 py-4 transition-all duration-200 text-lg font-semibold ${
                                ticketsValid 
                                  ? "border-emerald-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500" 
                                  : "border-red-200 focus:ring-4 focus:ring-red-500/20 focus:border-red-500"
                              }`}
                            />
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                              × {money(ENTRY_PRICING.child)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {!ticketsValid && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium">
                            Total must equal {pkg.people} people. Currently: {totalTickets}
                          </span>
                        </div>
                      )}

                      {/* Quick adjust buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setAdults(pkg.people);
                            setChildren(0);
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          All Adults
                        </button>
                        <button
                          onClick={() => {
                            const half = Math.floor(pkg.people / 2);
                            setAdults(half);
                            setChildren(pkg.people - half);
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          Half & Half
                        </button>
                        <button
                          onClick={() => {
                            setAdults(0);
                            setChildren(pkg.people);
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          All Children
                        </button>
                      </div>
                    </div>

                    {/* Right side - Pricing summary */}
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Pricing Breakdown
                        </h4>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span>Adult tickets ({adults})</span>
                            <span className="font-semibold">{money(adults * ENTRY_PRICING.adult)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Child tickets ({children})</span>
                            <span className="font-semibold">{money(children * ENTRY_PRICING.child)}</span>
                          </div>
                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Subtotal</span>
                              <span className="font-semibold">{money(entryTotal)}</span>
                            </div>
                            {pkg.discount > 0 && (
                              <>
                                <div className="flex items-center justify-between text-sm text-emerald-600">
                                  <span>Package discount ({pkg.discount}%)</span>
                                  <span className="font-semibold">-{money(entryTotal * pkg.discount / 100)}</span>
                                </div>
                                <div className="flex items-center justify-between text-lg font-bold text-emerald-700 border-t pt-2">
                                  <span>Final Total</span>
                                  <span>{money(entryTotal - (entryTotal * pkg.discount / 100))}</span>
                                </div>
                              </>
                            )}
                            {pkg.discount === 0 && (
                              <div className="flex items-center justify-between text-lg font-bold text-gray-900 border-t pt-2">
                                <span>Total</span>
                                <span>{money(entryTotal)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-6">
                        <h4 className="text-lg font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          What's Included
                        </h4>
                        <div className="space-y-2">
                          {pkg.benefits.map((benefit, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm text-emerald-700">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
                    <div className="text-gray-600">
                      <div className="font-semibold text-gray-900">{pkg.label}</div>
                      <div className="text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {pkg.people} people locked
                        {!ticketsValid && <span className="text-red-500">• Fix ticket distribution</span>}
                      </div>
                    </div>
                    <button
                      onClick={goEntry}
                      disabled={!ticketsValid || !entryDate}
                      className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                    >
                      <Calendar className="w-5 h-5" />
                      Continue to Entry Booking
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className={`transition-all duration-500 ${animationStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                >
                  {/* Enhanced event mode content */}
                  <div className="mb-6 flex items-start gap-3 text-emerald-800 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200 rounded-2xl p-5">
                    <div className="p-3 bg-emerald-200 rounded-xl flex-shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">Event Package for {pkg.people} People</div>
                      <div className="text-sm">
                        Select an event and we'll lock your ticket quantity to <b>{pkg.people}</b>. 
                        Price comes directly from the event.
                        {pkg.discount > 0 && (
                          <span className="ml-2 px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">
                            {pkg.discount}% Package Discount
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Event filters and sorting */}
                  <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700">Filter:</label>
                      <select
                        value={eventFilter}
                        onChange={(e) => setEventFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="all">All upcoming</option>
                        <option value="today">Today</option>
                        <option value="week">This week</option>
                        <option value="month">This month</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700">Sort by:</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="date">Date</option>
                        <option value="price">Price</option>
                        <option value="popularity">Popularity</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left side - Event selection */}
                    <div className="lg:col-span-2">
                      <label className="block text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Choose Your Event
                      </label>
                      
                      {loadingEvents ? (
                        <div className="w-full h-32 rounded-2xl border-2 border-gray-200 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                          <div className="text-center">
                            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <div className="text-sm text-gray-600">Loading amazing events...</div>
                          </div>
                        </div>
                      ) : evErr ? (
                        <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex items-center gap-3">
                          <AlertCircle className="w-6 h-6 flex-shrink-0" />
                          <div>
                            <div className="font-semibold mb-1">Failed to load events</div>
                            <div>{evErr}</div>
                          </div>
                        </div>
                      ) : events.length === 0 ? (
                        <div className="text-center bg-gray-50 border-2 border-gray-200 rounded-2xl p-8">
                          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <div className="text-lg font-semibold text-gray-700 mb-2">No events found</div>
                          <div className="text-sm text-gray-600 mb-4">
                            No upcoming events match your current filter. Try adjusting your search criteria.
                          </div>
                          <button
                            onClick={() => setEventFilter("all")}
                            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm"
                          >
                            Show all events
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                          {events.map((ev) => {
                            const isSelected = String(ev._id) === String(eventId);
                            const unitPrice = Number(ev?.ticketPrice ?? ev?.price ?? 0);
                            const totalForPackage = unitPrice * pkg.people;
                            
                            return (
                              <button
                                key={ev._id}
                                onClick={() => setEventId(String(ev._id))}
                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
                                  isSelected 
                                    ? "border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-lg scale-[1.02]" 
                                    : "border-gray-200 hover:border-emerald-200 bg-white hover:bg-emerald-50/50"
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className={`font-semibold text-lg ${isSelected ? "text-emerald-900" : "text-gray-900"}`}>
                                      {ev.title || "Untitled Event"}
                                    </h4>
                                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {getTimeUntilEvent(ev.start)}
                                      </div>
                                      {ev.venue && (
                                        <div className="flex items-center gap-1">
                                          <MapPin className="w-4 h-4" />
                                          {ev.venue}
                                        </div>
                                      )}
                                      {ev.bookings && (
                                        <div className="flex items-center gap-1">
                                          <Users className="w-4 h-4" />
                                          {ev.bookings} booked
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="ml-4 p-2 bg-emerald-500 rounded-full">
                                      <CheckCircle className="w-5 h-5 text-white" />
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-gray-600">
                                    {formatDate(ev.start)}
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm text-gray-600">
                                      {money(unitPrice)}/person
                                    </div>
                                    <div className={`font-bold ${isSelected ? "text-emerald-700" : "text-gray-900"}`}>
                                      {money(totalForPackage)} total
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right side - Event details and pricing */}
                    <div className="space-y-6">
                      {selectedFromList && (
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-6">
                          <h4 className="text-lg font-semibold text-emerald-800 mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            Selected Event
                          </h4>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="font-semibold text-emerald-900">{selectedFromList.title}</div>
                              <div className="text-sm text-emerald-700">
                                {formatDate(selectedFromList.start)}
                              </div>
                            </div>
                            
                            {selectedFromList.venue && (
                              <div className="flex items-center gap-2 text-sm text-emerald-700">
                                <MapPin className="w-4 h-4" />
                                {selectedFromList.venue}
                              </div>
                            )}
                            
                            {selectedFromList.description && (
                              <div className="text-sm text-emerald-800 bg-emerald-100 rounded-lg p-3">
                                {selectedFromList.description}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Package Summary
                        </h4>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span>Tickets (locked)</span>
                            <span className="font-semibold">{pkg.people} people</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Unit price</span>
                            <span className="font-semibold">{money(eventUnitPrice)}</span>
                          </div>
                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Subtotal</span>
                              <span className="font-semibold">{money(packageTotal)}</span>
                            </div>
                            {pkg.discount > 0 && (
                              <>
                                <div className="flex items-center justify-between text-sm text-emerald-600">
                                  <span>Package discount ({pkg.discount}%)</span>
                                  <span className="font-semibold">-{money(discountAmount)}</span>
                                </div>
                                <div className="flex items-center justify-between text-lg font-bold text-emerald-700 border-t pt-2">
                                  <span>Final Total</span>
                                  <span>{money(finalTotal)}</span>
                                </div>
                              </>
                            )}
                            {pkg.discount === 0 && (
                              <div className="flex items-center justify-between text-lg font-bold text-gray-900 border-t pt-2">
                                <span>Total</span>
                                <span>{money(packageTotal)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
                    <div className="text-gray-600">
                      {selectedFromList ? (
                        <div>
                          <div className="font-semibold text-gray-900">{selectedFromList.title}</div>
                          <div className="text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(selectedFromList.start)}
                            {selectedFromList.venue && (
                              <>
                                <span>•</span>
                                <MapPin className="w-4 h-4" />
                                {selectedFromList.venue}
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Select an event to continue</div>
                      )}
                    </div>
                    <button
                      onClick={goEvent}
                      disabled={!eventId}
                      className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-5 h-5" />
                      Continue to Event Booking
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced footer */}
            <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 rounded-b-3xl">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Your ticket count is locked for this package. Final pricing confirmed on next step.
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    2min booking
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Instant confirm
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced keyframes and custom scrollbar */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #059669;
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </section>
  );
}