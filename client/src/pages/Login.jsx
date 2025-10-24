// client/src/pages/Login.jsx
import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiLogin } from "../api/auth";
import { useAuth } from "../context/AuthProvider";
import GoogleLoginButton from "../components/GoogleLoginButton";
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle, Shield, Users, Heart, CheckCircle2, X } from "lucide-react";

/* ----------------------- Reusable Toast ----------------------- */
function Toast({ open, onClose, title = "", message = "", variant = "success" }) {
  if (!open) return null;
  const grad =
    variant === "success" ? "from-emerald-500 to-teal-500" :
    variant === "error"   ? "from-rose-500 to-red-500"     :
                            "from-slate-500 to-gray-500";

  return (
    // portal not strictly required here; page has no z-index conflicts
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

/* ----------------------- Stat Card ----------------------- */
const StatCard = ({ icon: Icon, number, label, delay = 0 }) => (
  <div
    className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 text-white text-center transform hover:scale-105 transition-all duration-300"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex justify-center mb-2">
      <Icon className="w-6 h-6" />
    </div>
    <div className="text-2xl font-bold mb-1">{number}</div>
    <div className="text-sm opacity-90">{label}</div>
  </div>
);

/* ----------------------- Floating Animations ----------------------- */
const FloatingStyle = () => (
  <style jsx>{`
    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
    .animate-delay-200 { animation-delay: 200ms; }
    .animate-delay-400 { animation-delay: 400ms; }
  `}</style>
);

export default function Login() {
  const nav = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
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
      const { data } = await apiLogin(form);
      setUser(data.user);

      // success toast (brief delay before navigate so it shows)
      const firstName = (data.user?.name || "").split(" ")[0] || "Welcome";
      const role = data.user?.role;
      const path = roleToPath[role] || roleToPath._default;

      showToast(`Signed in successfully`, `Hi ${firstName}, redirecting to your dashboard…`, "success", 1500);

      setTimeout(() => nav(path), 700);
    } catch (e) {
      const message = e?.response?.data?.message || "Login failed";
      setErr(message);
      showToast("Sign-in failed", message, "error", 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatingStyle />
      <div className="relative min-h-screen overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              `url('https://images.unsplash.com/photo-1564760055775-d63b17a55c44?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2942&q=80')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/90 via-teal-800/85 to-cyan-900/90"></div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 opacity-10 animate-float">
            <img src="../src/assets/logo.png" alt="Hasthi.lk Logo"
                 className="h-35 w-35 object-contain shrink-0 rounded-full p-1 shadow-md" />
          </div>
          <div className="absolute bottom-32 right-16 opacity-10 animate-float" style={{ animationDelay: '1s' }}>
            <img src="../src/assets/logo.png" alt="Hasthi.lk Logo"
                 className="h-35 w-35 object-contain shrink-0 rounded-full p-1 shadow-md" />
          </div>
          <div className="absolute top-1/2 left-1/4 opacity-5 animate-float" style={{ animationDelay: '2s' }}>
            <img src="../src/assets/logo.png" alt="Hasthi.lk Logo"
                 className="h-35 w-35 object-contain shrink-0 rounded-full p-1 shadow-md" />
          </div>
          <div className="absolute top-1/4 right-1/3 w-2 h-2 bg-white/20 rounded-full animate-pulse"></div>
          <div className="absolute top-3/4 left-1/5 w-1 h-1 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-white/15 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative min-h-screen flex">
          {/* Left Side */}
          <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 text-white">
            <div className="max-w-lg animate-fadeInUp">
              <div className="flex items-center mb-8">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl border border-white/30">
                  <img src="../src/assets/logo.png" alt="Hasthi.lk Logo"
                       className="h-35 w-35 object-contain shrink-0 rounded-full bg-white p-1 shadow-md" />
                </div>
                <div className="ml-4">
                  <h1 className="text-3xl font-bold">Hasthi.lk</h1>
                  <p className="text-emerald-200 text-sm">Elephant Conservation Platform</p>
                </div>
              </div>

              <div className="mb-8 animate-fadeInUp animate-delay-200">
                <h2 className="text-4xl font-bold mb-4 leading-tight">
                  Protecting Sri Lanka&apos;s
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">
                    Majestic Elephants
                  </span>
                </h2>
                <p className="text-xl text-emerald-100 leading-relaxed">
                  Join our mission to conserve and protect elephant populations through
                  innovative technology and community collaboration.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 animate-fadeInUp animate-delay-400">
                <StatCard icon={Shield} number="2,400+" label="Elephants Protected" delay={600} />
                <StatCard icon={Users} number="500+" label="Active Users" delay={800} />
                <StatCard icon={Heart} number="98%" label="Success Rate" delay={1000} />
              </div>

              <div className="mt-8 space-y-3 animate-fadeInUp animate-delay-400">
                <div className="flex items-center text-emerald-100">
                  <div className="w-2 h-2 bg-emerald-300 rounded-full mr-3"></div>
                  <span>Real-time elephant tracking and monitoring</span>
                </div>
                <div className="flex items-center text-emerald-100">
                  <div className="w-2 h-2 bg-teal-300 rounded-full mr-3"></div>
                  <span>Veterinary care management system</span>
                </div>
                <div className="flex items-center text-emerald-100">
                  <div className="w-2 h-2 bg-cyan-300 rounded-full mr-3"></div>
                  <span>Community conservation initiatives</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full lg:w-1/2 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 animate-fadeInUp">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl border border-white/30">
                    <ElephantIcon className="w-10 h-10 text-white" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Hasthi.lk</h1>
                <p className="text-emerald-200">Elephant Conservation Platform</p>
              </div>

              {/* Header */}
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-emerald-200">Sign in to continue your conservation journey</p>
              </div>

              {/* Card */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
                <form onSubmit={onSubmit} className="space-y-6">
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
                        placeholder="Enter your email"
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
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
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
                  </div>

                  {/* Error (kept inline for visibility) */}
                  {err && (
                    <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{err}</span>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 w-3 bg-white opacity-20 transform skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    {loading ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <LogIn className="w-5 h-5 mr-2" />
                        Sign In
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
                      <span className="px-4 bg-white text-gray-500 font-medium">or continue with</span>
                    </div>
                  </div>
                </div>

                {/* Google Login */}
                <GoogleLoginButton />

                {/* Register link */}
                <div className="mt-6 text-center">
                  <p className="text-gray-600">
                    Don&apos;t have an account?{" "}
                    <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors hover:underline">
                      Join the conservation effort
                    </Link>
                  </p>
                </div>
              </div>

              {/* Footer note */}
              <div className="text-center">
                <p className="text-sm text-emerald-100">
                  By signing in, you join a community dedicated to protecting Sri Lanka&apos;s elephants
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
