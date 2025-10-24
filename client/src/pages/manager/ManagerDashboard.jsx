import { useState, useMemo } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import {
  Plus,
  Menu,
  X,
  LogOut,
  ArrowLeft,
  Shield,
  Clipboard,
  TreePine,
  BarChart3, // ✅ NEW for Analytics
} from "lucide-react";

// Elephant icon matching the theme
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

// Shared nav link component
function NavButton({ to, icon: Icon, collapsed, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "w-full flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
          isActive
            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
            : "text-gray-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:text-emerald-700",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={`${collapsed ? "w-6 h-6" : "w-5 h-5 mr-3"} ${
              isActive ? "text-white" : "text-emerald-600"
            }`}
          />
          {!collapsed && <span>{children}</span>}
        </>
      )}
    </NavLink>
  );
}

export default function ManagerDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigationItems = useMemo(
    () => [
      {
        to: "/manager/register-elephant",
        icon: Plus,
        label: "Register Elephant",
        description: "Add new elephants to the sanctuary",
      },
      {
        to: "/manager/manage-elephant",
        icon: TreePine,
        label: "Manage Elephants",
        description: "View and edit elephant information",
      },
      {
        to: "/manager/health-requests",
        icon: Clipboard,
        label: "Health Requests",
        description: "Fulfill health report requests from adopters",
      },
      // ✅ NEW: Manager Analytics (no AI, just visualizations)
      {
        to: "/manager/analytics",
        icon: BarChart3,
        label: "Analytics",
        description: "Visual reports for elephants, issues & requests",
      },
    ],
    []
  );

  const activeItem = navigationItems.find((n) => location.pathname.startsWith(n.to));
  const activeLabel = activeItem?.label || "Manager Dashboard";

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Sidebar */}
      <aside
        className={[
          "relative shrink-0 overflow-hidden bg-white",
          collapsed ? "w-20" : "w-72",
          "border-r border-emerald-100",
        ].join(" ")}
      >
        {/* Decorative gradient (scoped to sidebar) */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-emerald-50/50 to-teal-50/50 pointer-events-none" />

        {/* Decorative elephant (scoped to sidebar) */}
        <div
          className={`absolute ${collapsed ? "top-4 right-2" : "top-4 right-4"} opacity-5 z-0`}
        >
          <ElephantIcon className="w-16 h-16 text-emerald-500" />
        </div>

        <div className="relative z-10 p-6 h-full flex flex-col">
          {/* Brand / collapse */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <ElephantIcon className="w-6 h-6 text-white" />
              </div>
              {!collapsed && (
                <div className="ml-3">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Manager Panel
                  </h2>
                  <div className="w-16 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" />
                </div>
              )}
            </div>
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="p-2 rounded-lg hover:bg-emerald-50 transition-colors text-emerald-600"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>

          {/* User card */}
          {!collapsed && user && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 mb-8 border border-emerald-100">
              <div className="flex items-center mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <div className="flex items-center">
                    <Clipboard className="w-4 h-4 text-emerald-600 mr-1" />
                    <span className="text-sm text-emerald-700 capitalize">
                      {user.role || "manager"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navigationItems.map((item) => (
              <div key={item.to} className="relative group">
                <NavButton to={item.to} icon={item.icon} collapsed={collapsed}>
                  {item.label}
                </NavButton>

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 invisible group-hover:visible bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                    {item.label}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Info card */}
          {!collapsed && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Manager Tools
              </h4>
              <p className="text-sm text-blue-700">
                Manage elephant registrations and sanctuary operations with care and precision.
              </p>
            </div>
          )}

          {/* Footer actions */}
          <div className="mt-8 space-y-3">
            <div className="h-px bg-gradient-to-r from-emerald-200 to-teal-200" />

            {/* Back link */}
            <Link
              to="/"
              className={[
                "w-full flex items-center",
                collapsed ? "justify-center" : "px-4",
                "py-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 group",
              ].join(" ")}
              title="Back to user dashboard"
            >
              <ArrowLeft
                className={`${collapsed ? "w-5 h-5" : "w-4 h-4 mr-2"} group-hover:-translate-x-1 transition-transform`}
              />
              {!collapsed && <span className="text-sm font-medium">Back to Dashboard</span>}
            </Link>

            {/* Logout */}
            <button
              onClick={logout}
              className={[
                "w-full flex items-center",
                collapsed ? "justify-center" : "px-4",
                "py-3 rounded-xl bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 text-rose-700 hover:from-rose-100 hover:to-red-100 transition-all duration-200 group",
              ].join(" ")}
              title="Logout"
            >
              <LogOut
                className={`${collapsed ? "w-5 h-5" : "w-4 h-4 mr-2"} group-hover:scale-110 transition-transform`}
              />
              {!collapsed && <span className="text-sm font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-8">
        {/* Header card */}
        
        <div>
          <Link
                to="/manager/analytics"
                title="Open Manager Analytics"
              >
                {/* <BarChart3 className="w-4 h-4" /> */}
                {/* <span>View Analytics</span> */}
              </Link>
        </div>

        {/* Routed content */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-emerald-100 min-h-[560px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
