// client/src/pages/profile/ManageProfile.jsx
import { useEffect, useState } from "react";
import { fetchMe, updateMe, uploadAvatar, changePassword, deleteMe } from "../../api/user";
import { useAuth } from "../../context/AuthProvider";
import { 
  User, 
  Mail, 
  Lock, 
  Camera, 
  Save, 
  Upload, 
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Chrome,
  KeyRound,
  UserCircle
} from "lucide-react";

// Brand Elephant (matches rest of admin theme)
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

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-emerald-600 rounded-full animate-spin"></div>
      <User className="absolute top-2 left-2 w-8 h-8 text-emerald-600 animate-pulse" />
    </div>
  </div>
);

const MessageAlert = ({ message, type = "success" }) => {
  if (!message) return null;
  const isSuccess = message.includes("✅") || type === "success";
  const Icon = isSuccess ? CheckCircle : AlertTriangle;
  const colorClasses = isSuccess 
    ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
    : "bg-rose-50 text-rose-800 border-rose-200";
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl border ${colorClasses} mt-4`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const PasswordInput = ({ value, onChange, placeholder, disabled }) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-12 disabled:bg-gray-50 disabled:text-gray-500"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
};

const EnhancedConfirmDialog = ({ open, onConfirm, onCancel, busy }) => {
  const [confirmText, setConfirmText] = useState("");
  if (!open) return null;

  const handleConfirm = () => {
    if (confirmText === "DELETE") onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-white mr-3" />
            <h3 className="text-lg font-semibold text-white">Delete Account</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            This action cannot be undone. This will permanently delete your account and all associated data.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-bold text-rose-600">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              placeholder="DELETE"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy || confirmText !== "DELETE"}
              className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg hover:from-rose-600 hover:to-pink-600 font-medium disabled:opacity-50 flex items-center min-w-[100px] justify-center"
            >
              {busy ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ManageProfile() {
  const { user: authUser, logout, setUser: setAuthUser } = useAuth() || {};
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // profile form
  const [form, setForm] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // avatar
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");

  // password
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");

  // danger zone
  const [delBusy, setDelBusy] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await fetchMe();
        setUser(data.user);
        setForm({ name: data.user?.name || "", email: data.user?.email || "" });
      } catch (e) {
        setErr(e.response?.data?.message || "Failed to load profile");
      } finally { 
        setLoading(false); 
      }
    })();
  }, []);

  const saveProfile = async () => {
    setSaving(true); 
    setMsg("");
    try {
      const { data } = await updateMe(form);
      setUser(data.user);
      setMsg("Profile updated ✅");
      if (setAuthUser) setAuthUser((prev) => ({ ...(prev || {}), ...data.user }));
    } catch (e) {
      setMsg(e.response?.data?.message || "Update failed");
    } finally { 
      setSaving(false); 
    }
  };

  const saveAvatar = async () => {
    if (!avatarFile) { 
      setAvatarMsg("Please choose an image"); 
      return; 
    }
    setAvatarBusy(true); 
    setAvatarMsg("");
    try {
      const { data } = await uploadAvatar(avatarFile);
      setUser(data.user);
      setAvatarMsg("Profile photo updated ✅");
      if (setAuthUser) setAuthUser((prev) => ({ ...(prev || {}), ...data.user }));
      else window.location.reload();
    } catch (e) {
      setAvatarMsg(e.response?.data?.message || "Upload failed");
    } finally { 
      setAvatarBusy(false); 
    }
  };

  const savePassword = async () => {
    setPwdBusy(true); 
    setPwdMsg("");
    try {
      await changePassword(pwd);
      setPwdMsg("Password updated ✅");
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      setPwdMsg(e.response?.data?.message || "Password update failed");
    } finally { 
      setPwdBusy(false); 
    }
  };

  const removeAccount = async () => {
    setDelBusy(true);
    try {
      await deleteMe();
      alert("Account deleted");
      logout?.();
    } catch (e) {
      alert(e.response?.data?.message || "Delete failed");
    } finally { 
      setDelBusy(false); 
      setShowDeleteDialog(false);
    }
  };

  if (err) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-rose-500">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-rose-500 mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Error Loading Profile</h3>
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
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="absolute top-8 right-8 opacity-10 animate-pulse">
            <UserCircle className="w-24 h-24 text-white" />
          </div>
          <div className="absolute bottom-8 left-8 opacity-5">
            <ElephantIcon className="w-32 h-32 text-white" />
          </div>
        </div>

        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4 border border-white/30">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Manage Profile</h1>
              <p className="text-emerald-100 mt-1">Update your personal information and settings</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-r from-emerald-100 to-teal-100 flex items-center justify-center">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt="Profile picture" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-2xl font-bold text-emerald-600">
                        {(user?.name?.[0] || "?").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                    <Camera className="w-3 h-3 text-white" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{user?.name || 'Unnamed User'}</h2>
                  <div className="flex items-center text-gray-600 mt-1">
                    <Mail className="w-4 h-4 mr-2" />
                    {user?.email}
                  </div>
                  <div className="flex items-center mt-2">
                    {user?.provider === "google" ? (
                      <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                        <Chrome className="w-4 h-4 mr-2" />
                        Signed in via Google
                      </div>
                    ) : (
                      <div className="flex items-center text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                        <Mail className="w-4 h-4 mr-2" />
                        Email/Password Account
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Avatar Upload */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center">
                  <Camera className="w-5 h-5 text-purple-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Profile Photo</h3>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Choose New Photo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max size 5MB. JPG/PNG recommended.</p>
                  </div>
                  
                  <button
                    onClick={saveAvatar}
                    disabled={avatarBusy || !avatarFile}
                    className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {avatarBusy ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </>
                    )}
                  </button>
                  
                  <MessageAlert message={avatarMsg} />
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-100 to-cyan-100 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center">
                  <Edit className="w-5 h-5 text-blue-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Profile Details</h3>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-6 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Enter your email address"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl w-full"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                  
                  <MessageAlert message={msg} />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-100 to-orange-100 px-6 py-4 border-b border-gray-100">
                <div className="flex items-center">
                  <KeyRound className="w-5 h-5 text-amber-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Password Security</h3>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-800">
                    {user?.provider === "google"
                      ? "Google account detected. You can set a password to also allow email/password login."
                      : "Change your password below to keep your account secure."}
                  </p>
                </div>
                
                <div className="space-y-6 max-w-md">
                  {user?.provider !== "google" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <PasswordInput
                        value={pwd.currentPassword}
                        onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <PasswordInput
                      value={pwd.newPassword}
                      onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
                      placeholder="Enter new password"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <PasswordInput
                      value={pwd.confirmPassword}
                      onChange={(e) => setPwd({ ...pwd, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>
                  
                  <button
                    onClick={savePassword}
                    disabled={pwdBusy}
                    className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl w-full"
                  >
                    {pwdBusy ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Update Password
                      </>
                    )}
                  </button>
                  
                  <MessageAlert message={pwdMsg} />
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-rose-200 overflow-hidden">
              <div className="bg-gradient-to-r from-rose-100 to-pink-100 px-6 py-4 border-b border-rose-200">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600 mr-3" />
                  <h3 className="text-lg font-semibold text-rose-800">Danger Zone</h3>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                    <h4 className="font-semibold text-rose-800 mb-2">Delete Account</h4>
                    <p className="text-sm text-rose-700">
                      This will permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={delBusy}
                    className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <EnhancedConfirmDialog
        open={showDeleteDialog}
        onConfirm={removeAccount}
        onCancel={() => setShowDeleteDialog(false)}
        busy={delBusy}
      />
    </div>
  );
}
