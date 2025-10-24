// client/src/pages/Register.jsx
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRegister } from "../api/auth";
import { useAuth } from "../context/AuthProvider";
import GoogleLoginButton from "../components/GoogleLoginButton";
import {
  Eye, EyeOff, Mail, Lock, User, UserPlus, AlertCircle, Globe, Award, Zap,
  CheckCircle, // used in chip list
  CheckCircle2, // used in toast icon
  X // toast close
} from "lucide-react";

/* ----------------------- Reusable Toast ----------------------- */
function Toast({ open, onClose, title = "", message = "", variant = "success" }) {
  if (!open) return null;
  const grad =
    variant === "success" ? "from-emerald-500 to-teal-500" :
    variant === "error"   ? "from-rose-500 to-red-500"     :
                            "from-slate-500 to-gray-500";

  return (
    <div className="fixed bottom-6 right-6 z-[100001] w-[92vw] max-w-sm" role="status" aria-live="polite">
      <div className={`relative rounded-2xl p-[2px] bg-gradient-to-r ${grad} shadow-2xl`}>
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 pl-3 pr-2 border border-white/60">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r ${grad} text-white grid place-items-center shadow`}>
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
    </div>
  );
}

/* ----------------------- Brand Elephant ----------------------- */
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

/* ----------------------- Benefits Card ----------------------- */
const BenefitCard = ({ icon: Icon, title, description, delay = 0 }) => (
  <div
    className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4 text-white transform hover:scale-105 transition-all duration-300"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start">
      <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg mr-3">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-xs opacity-90 leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

/* ----------------------- Password Strength ----------------------- */
const PasswordStrength = ({ password }) => {
  const getStrength = (pass) => {
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getStrength(password);
  const getColor = () => {
    if (strength <= 1) return "bg-red-500";
    if (strength <= 2) return "bg-yellow-500";
    if (strength <= 3) return "bg-blue-500";
    return "bg-green-500";
  };

  const getLabel = () => {
    if (strength <= 1) return "Weak";
    if (strength <= 2) return "Fair";
    if (strength <= 3) return "Good";
    return "Strong";
  };

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600">Password strength</span>
        <span className={`font-medium ${strength <= 1 ? 'text-red-600' : strength <= 2 ? 'text-yellow-600' : strength <= 3 ? 'text-blue-600' : 'text-green-600'}`}>
          {getLabel()}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div
          className={`h-1 rounded-full transition-all duration-300 ${getColor()}`}
          style={{ width: `${(strength / 4) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

/* ----------------------- Floating Styles ----------------------- */
const FloatingStyle = () => (
  <style jsx>{`
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse-soft { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
    .animate-pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }
    .animate-delay-200 { animation-delay: 200ms; }
    .animate-delay-400 { animation-delay: 400ms; }
    .animate-delay-600 { animation-delay: 600ms; }
  `}</style>
);

export default function Register() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Toast state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  const showToast = (title, message = "", variant = "success", autoMs = 3000) => {
    setToastTitle(title);
    setToastMsg(message);
    setToastVariant(variant);
    setToastOpen(true);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToastOpen(false), autoMs);
  };

  const roleToPath = useMemo(() => ({
    manager: "/manager",
    admin: "/admin",
    caretaker: "/caretaker",
    veterinarian: "/vet",
    _default: "/"
  }), []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const { data } = await apiRegister(form);
      setUser(data.user);

      // toast success
      const firstName = (data.user?.name || "").split(" ")[0] || "Welcome";
      const role = data.user?.role;
      const path = roleToPath[role] || roleToPath._default;

      showToast("Account created successfully 🎉", `Hi ${firstName}, setting up your dashboard…`, "success", 1800);

      // small delay so toast is visible before navigation
      setTimeout(() => nav(path), 800);
    } catch (e) {
      const message = e?.response?.data?.message || "Registration failed";
      setErr(message);
      showToast("Registration failed", message, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatingStyle />
      <div className="relative min-h-screen overflow-hidden">
        {/* Background Image with Overlay - Changed to elephant image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1564760055775-d63b17a55c44?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2942&q=80')`
          }}
        />
        {/* Dynamic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/90 via-teal-800/85 to-green-900/90"></div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 opacity-10 animate-float">
            <img
              src="../src/assets/logo.png"
              alt="Hasthi.lk Logo"
              className="h-35 w-35 object-contain shrink-0 rounded-full  p-1 shadow-md"
            />
          </div>
          <div className="absolute bottom-32 left-16 opacity-10 animate-float" style={{ animationDelay: '1.5s' }}>
            <img
              src="../src/assets/logo.png"
              alt="Hasthi.lk Logo"
              className="h-35 w-35 object-contain shrink-0 rounded-full  p-1 shadow-md"
            />
          </div>
          <div className="absolute top-1/3 right-1/4 opacity-5 animate-float" style={{ animationDelay: '3s' }}>
            <img
              src="../src/assets/logo.png"
              alt="Hasthi.lk Logo"
              className="h-35 w-35 object-contain shrink-0 rounded-full  p-1 shadow-md"
            />
          </div>
          {/* Floating particles */}
          <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-white/30 rounded-full animate-pulse-soft"></div>
          <div className="absolute top-3/4 right-1/5 w-1 h-1 bg-white/40 rounded-full animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-white/20 rounded-full animate-pulse-soft" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative min-h-screen flex">
          {/* Left Side - Benefits & Motivation */}
          <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 text-white">
            <div className="max-w-lg animate-fadeInUp">
              {/* Logo and Brand */}
              <div className="flex items-center mb-8">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl border border-white/30">
                  <img
                    src="../src/assets/logo.png"
                    alt="Hasthi.lk Logo"
                    className="h-35 w-35 object-contain shrink-0 rounded-full bg-white p-1 shadow-md"
                  />
                </div>
                <div className="ml-4">
                  <h1 className="text-3xl font-bold">Hasthi.lk</h1>
                  <p className="text-emerald-200 text-sm">Join the Conservation Movement</p>
                </div>
              </div>

              {/* Hero Content */}
              <div className="mb-8 animate-fadeInUp animate-delay-200">
                <h2 className="text-4xl font-bold mb-4 leading-tight">
                  Become a Guardian of
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-300">
                    Sri Lanka&apos;s Giants
                  </span>
                </h2>
                <p className="text-xl text-emerald-100 leading-relaxed mb-6">
                  Join thousands of passionate conservationists working together to protect and preserve elephant habitats across Sri Lanka.
                </p>

                {/* Quick Benefits */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center bg-white/20 rounded-full px-3 py-1 text-sm">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-300" />
                    Free to join
                  </div>
                  <div className="flex items-center bg-white/20 rounded-full px-3 py-1 text-sm">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-300" />
                    Make real impact
                  </div>
                  <div className="flex items-center bg-white/20 rounded-full px-3 py-1 text-sm">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-300" />
                    Connect with experts
                  </div>
                </div>
              </div>

              {/* Benefits Grid */}
              <div className="space-y-4 animate-fadeInUp animate-delay-400">
                <BenefitCard
                  icon={Globe}
                  title="Global Impact"
                  description="Contribute to wildlife conservation efforts recognized worldwide"
                  delay={600}
                />
                <BenefitCard
                  icon={Award}
                  title="Expert Network"
                  description="Connect with veterinarians, researchers, and conservation experts"
                  delay={800}
                />
                <BenefitCard
                  icon={Zap}
                  title="Real-time Updates"
                  description="Get instant notifications about elephant sightings and conservation activities"
                  delay={1000}
                />
              </div>

              {/* Trust Indicators */}
              <div className="mt-8 animate-fadeInUp animate-delay-600">
                <p className="text-emerald-200 text-sm mb-4">Trusted by conservation organizations:</p>
                <div className="flex items-center space-x-6 text-white/60">
                  <div className="text-xs font-medium">Wildlife Dept. SL</div>
                  <div className="text-xs font-medium">WWF Partner</div>
                  <div className="text-xs font-medium">IUCN Certified</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Registration Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 animate-fadeInUp">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl border border-white/30">
                    <img
                      src="../src/assets/logo.png"
                      alt="Hasthi.lk Logo"
                      className="h-35 w-35 object-contain shrink-0 rounded-full bg-white p-1 shadow-md"
                    />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Hasthi.lk</h1>
                <p className="text-emerald-200">Join the Conservation Movement</p>
              </div>

              {/* Header */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Start Your Journey</h2>
                <p className="text-emerald-200">Create your account and help protect elephants today</p>
              </div>

              {/* Card */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
                <form onSubmit={onSubmit} className="space-y-6">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-gray-50 focus:bg-white hover:border-emerald-300"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-gray-50 focus:bg-white hover:border-emerald-300"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Create Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a secure password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={6}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-gray-50 focus:bg-white hover:border-emerald-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <PasswordStrength password={form.password} />
                  </div>

                  {/* Error */}
                  {err && (
                    <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{err}</span>
                    </div>
                  )}

                  {/* Terms */}
                  <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
                    By creating an account, you agree to our conservation mission and commit to protecting elephant welfare through responsible platform usage.
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center relative overflow-hidden group"
                  >
                    {/* Button shine effect */}
                    <div className="absolute inset-0 w-3 bg-white opacity-20 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>

                    {loading ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating your account...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <UserPlus className="w-5 h-5 mr-2" />
                        Join the Conservation Effort
                      </div>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="my-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500 font-medium">or sign up with</span>
                    </div>
                  </div>
                </div>

                {/* Google Login */}
                <GoogleLoginButton />

                {/* Login link */}
                <div className="mt-6 text-center">
                  <p className="text-gray-600">
                    Already part of our community?{" "}
                    <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors hover:underline">
                      Sign in here
                    </Link>
                  </p>
                </div>
              </div>

              {/* Footer note */}
              <div className="text-center">
                <p className="text-sm text-emerald-100">
                  Join 2,400+ conservationists making a real difference for Sri Lankan elephants
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Toast */}
        <Toast
          open={toastOpen}
          onClose={() => setToastOpen(false)}
          title={toastTitle}
          message={toastMsg}
          variant={toastVariant}
        />
      </div>
    </>
  );
}
