// client/src/pages/user/Donation.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDonationCheckout } from "../../api/donation";
import client from "../../api/client";
import {
  Gift,
  Search,
  Heart,
  MapPin,
  Calendar,
  User,
  DollarSign,
  CreditCard,
  Shield,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  CheckCircle,
  Star,
  Target,
} from "lucide-react";

const DISPLAY_CURRENCY = (import.meta.env.VITE_STRIPE_CURRENCY || "LKR").toUpperCase();

// Brand Elephant icon (matches theme)
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

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
      <Gift className="absolute top-2 left-2 w-8 h-8 text-emerald-600 animate-pulse" />
    </div>
  </div>
);

const GenderBadge = ({ gender }) => {
  const isMale = gender?.toLowerCase() === "male";
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        isMale
          ? "bg-blue-100 text-blue-800 border border-blue-200"
          : "bg-pink-100 text-pink-800 border border-pink-200"
      }`}
    >
      {gender || "Unknown"}
    </span>
  );
};

const ElephantCard = ({ elephant, isSelected, onSelect }) => (
  <div
    onClick={() => onSelect(elephant)}
    className={`group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 ${
      isSelected
        ? "border-emerald-500 ring-4 ring-emerald-200 transform scale-105"
        : "border-gray-100 hover:border-emerald-300"
    }`}
  >
    <div className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 rounded-t-2xl">
      <div className="absolute top-3 right-3 opacity-20">
        <ElephantIcon className="w-12 h-12 text-emerald-500" />
      </div>

      {isSelected && (
        <div className="absolute top-3 left-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="relative">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{elephant.name}</h3>
        <div className="space-y-2">
          <div className="flex items-center text-gray-600">
            <User className="w-3 h-3 mr-2 text-emerald-500" />
            <GenderBadge gender={elephant.gender} />
            {elephant.age && (
              <span className="ml-2 text-xs">
                <Calendar className="w-3 h-3 inline mr-1" />
                {elephant.age} yrs
              </span>
            )}
          </div>

          {elephant.location && (
            <div className="flex items-center text-gray-600 text-xs">
              <MapPin className="w-3 h-3 mr-2 text-emerald-500" />
              <span>{elephant.location}</span>
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="p-4 bg-white rounded-b-2xl">
      <div
        className={`text-center text-xs font-medium transition-colors ${
          isSelected ? "text-emerald-600" : "text-gray-500 group-hover:text-emerald-600"
        }`}
      >
        {isSelected ? "Selected for Donation" : "Click to Select"}
      </div>
    </div>
  </div>
);

const DonationAmountButton = ({ amount, isSelected, onClick, label }) => (
  <button
    onClick={() => onClick(amount.toString())}
    className={`p-4 rounded-xl border-2 transition-all duration-200 font-semibold ${
      isSelected
        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
        : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
    }`}
  >
    <div className="text-lg">
      {DISPLAY_CURRENCY} {amount.toLocaleString()}
    </div>
    {label && <div className="text-xs text-gray-600 mt-1">{label}</div>}
  </button>
);

export default function Donation() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get("/elephants/public");
        setRows(data.elephants || []);
      } catch (e) {
        setErr(e.response?.data?.message || "Failed to load elephants");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        !q || r.name?.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const startCheckout = async () => {
    if (!selected) return alert("Please select an elephant to donate to");
    const amt = Number(amount);
    if (!amt || amt <= 0) return alert("Please enter a valid donation amount");
    setBusy(true);
    try {
      const { data } = await createDonationCheckout({
        elephantId: selected._id,
        amount: amt,
        note: note?.trim(),
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to create checkout session");
      }
    } catch (e) {
      alert(e.response?.data?.message || "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  const suggestedAmounts = [
    { amount: 500, label: "Feed for a day" },
    { amount: 1000, label: "Medical care" },
    { amount: 2500, label: "Weekly support" },
    { amount: 5000, label: "Monthly care" },
  ];

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-rose-500">
            <div className="flex items-center">
              <Gift className="w-8 h-8 text-rose-500 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Error Loading Elephants</h3>
                <p className="text-rose-600 mt-1">{err}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="absolute top-8 right-8 opacity-10 animate-pulse">
            <Gift className="w-24 h-24 text-white" />
          </div>
          <div className="absolute bottom-8 left-8 opacity-5 rotate-12">
            <ElephantIcon className="w-32 h-32 text-white" />
          </div>
          <div className="absolute top-1/2 left-1/4 opacity-5">
            <Heart className="w-40 h-40 text-white" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Gift className="w-16 h-16 text-white mr-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-white">Support Our Elephants</h1>
            </div>
            <p className="text-xl text-emerald-100 mb-8 max-w-3xl mx-auto">
              Your donation directly supports elephant care, food, and medical expenses. Choose an
              elephant to support and make a meaningful difference in their life.
            </p>

            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center text-emerald-100">
                <Shield className="w-5 h-5 mr-2" />
                Secure Payment
              </div>
              <div className="flex items-center text-emerald-100">
                <Target className="w-5 h-5 mr-2" />
                100% Direct Impact
              </div>
              <div className="flex items-center text-emerald-100">
                <Star className="w-5 h-5 mr-2" />
                Transparent Usage
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back + Search */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-emerald-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-3 w-full max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search elephants by name or location..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <ElephantIcon className="w-6 h-6 text-emerald-600 mr-3" />
                Choose an Elephant to Support
              </h3>

              {loading ? (
                <LoadingSpinner />
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <ElephantIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">No Elephants Found</h4>
                  <p className="text-gray-500">
                    {rows.length === 0
                      ? "No elephants are currently available for donation."
                      : "No elephants match your search criteria."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filtered.map((elephant) => (
                    <ElephantCard
                      key={elephant._id}
                      elephant={elephant}
                      isSelected={selected?._id === elephant._id}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Donation Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Gift className="w-6 h-6 text-emerald-600 mr-3" />
                Donation Details
              </h3>

              {/* Selected Elephant */}
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                <div className="text-sm font-medium text-gray-700 mb-2">Selected Elephant:</div>
                <div className="text-lg font-bold text-emerald-700">
                  {selected ? selected.name : "None selected"}
                </div>
                {selected && (
                  <div className="text-sm text-gray-600 mt-1">
                    {selected.gender} • {selected.age || "Age unknown"} •{" "}
                    {selected.location || "Location unknown"}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Donation Amount ({DISPLAY_CURRENCY})
                </label>

                {/* Suggested amounts */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {suggestedAmounts.map((s) => (
                    <DonationAmountButton
                      key={s.amount}
                      amount={s.amount}
                      label={s.label}
                      isSelected={amount === s.amount.toString()}
                      onClick={setAmount}
                    />
                  ))}
                </div>

                {/* Custom amount */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                    {DISPLAY_CURRENCY}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter custom amount"
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Note */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Personal Message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a message with your donation..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Checkout */}
              <button
                onClick={startCheckout}
                disabled={busy || !selected || !amount}
                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {busy ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Donate via Stripe
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
                <Shield className="w-4 h-4 mr-2 text-emerald-500" />
                Secure checkout powered by Stripe
              </div>
            </div>
          </div>
        </div>

        {/* Impact strip */}
        <div className="mt-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-8 text-white">
          <div className="text-center">
            <Sparkles className="w-12 h-12 text-white mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">Your Impact Matters</h3>
            <p className="text-emerald-100 max-w-2xl mx-auto mb-6">
              Every donation helps provide essential care for our elephants including food, medical
              treatment, and maintaining safe habitats. Your support makes a real difference in
              their daily lives.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold">LKR 500</div>
                <div className="text-emerald-100 text-sm">Feeds an elephant for one day</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold">LKR 2,500</div>
                <div className="text-emerald-100 text-sm">Covers weekly care expenses</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold">LKR 10,000</div>
                <div className="text-emerald-100 text-sm">Supports medical treatment</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
