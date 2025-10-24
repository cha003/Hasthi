// client/src/pages/eventmgr/EventManagerDashboard.jsx
import { useState, useMemo } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import {
  CalendarDays,
  Ticket,
  Menu,
  X,
  LogOut,
  ArrowLeft,
  Bell,
  Settings,
  Sparkles,
  Shield,
  BarChart3,          // <-- NEW: icon for Analytics
} from "lucide-react";

// Brand elephant icon to stay consistent across roles
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

function NavButton({ to, icon: Icon, collapsed, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "w-full flex items-center px-4 py-3 rounded-xl font-medium transition-all duration-200 group relative",
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

export default function EventManagerDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigationItems = useMemo(
    () => [
      {
        to: "/eventmgr/events",
        icon: CalendarDays,
        label: "My Events",
        description: "Create, schedule, and manage sanctuary events",
      },
      {
        to: "/eventmgr/entry-bookings",
        icon: Ticket,
        label: "Entry Bookings",
        description: "Review and manage visitor ticket bookings",
      },
      // --- NEW: Event Analytics entry ---
      {
        to: "/eventmgr/analytics",
        icon: BarChart3,
        label: "Event Analytics",
        description: "Visual reports for events, bookings, tickets, revenue",
      },
    ],
    []
  );

  const activeItem = navigationItems.find((n) => location.pathname.startsWith(n.to));
  const activeLabel = activeItem?.label || "Event Manager";

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Sidebar */}
      <aside
        className={[
          collapsed ? "w-20" : "w-72",
          "transition-all duration-300 ease-in-out bg-white shadow-xl border-r border-emerald-100 relative sticky top-0 h-screen",
        ].join(" ")}
      >
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-teal-50/50 pointer-events-none" />

        {/* Decorative brand */}
        <div className={`absolute ${collapsed ? "top-4 right-2" : "top-4 right-4"} opacity-5`}>
          <ElephantIcon className="w-16 h-16 text-emerald-500" />
        </div>

        <div className="relative z-10 p-6 h-full flex flex-col">
          {/* Brand header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <ElephantIcon className="w-6 h-6 text-white" />
              </div>
              {!collapsed && (
                <div className="ml-3">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Event Manager
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
          

          {/* Nav */}
          <nav className="flex-1 space-y-2">
            {navigationItems.map((item) => (
              <div key={item.to} className="relative group">
                <NavButton to={item.to} icon={item.icon} collapsed={collapsed}>
                  {item.label}
                </NavButton>
                {collapsed && (
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 invisible group-hover:visible bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45" />
                    {item.label}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer actions */}
          <div className="mt-8 space-y-3">
            <div className="h-px bg-gradient-to-r from-emerald-200 to-teal-200" />
            {!collapsed && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors group"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-emerald-600 mx-auto group-hover:scale-110 transition-transform" />
                </button>
                <button
                  type="button"
                  className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors group"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 text-emerald-600 mx-auto group-hover:scale-110 transition-transform" />
                </button>
              </div>
            )}

            <Link
              to="/"
              className={[
                "w-full flex items-center",
                collapsed ? "justify-center" : "px-4",
                "py-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 group",
              ].join(" ")}
              title="Back to home"
            >
              <ArrowLeft
                className={`${collapsed ? "w-5 h-5" : "w-4 h-4 mr-2"} group-hover:-translate-x-1 transition-transform`}
              />
              {!collapsed && <span className="text-sm font-medium">Back to Home</span>}
            </Link>

            <button
              onClick={logout}
              className={[
                "w-full flex items-center",
                collapsed ? "justify-center" : "px-4",
                "py-3 rounded-xl bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 text-rose-700 hover:from-rose-100 hover:to-red-100 transition-all duration-200 group",
              ].join(" ")}
              title="Logout"
            >
              <LogOut className={`${collapsed ? "w-5 h-5" : "w-4 h-4 mr-2"} group-hover:scale-110 transition-transform`} />
              {!collapsed && <span className="text-sm font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-8">
        {/* Header card */}
        

        {/* Routed content */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-emerald-100 min-h-[560px] relative overflow-hidden">
          {/* Optional background glyph */}
          <div className="absolute top-6 right-6 opacity-5">
            <Ticket className="w-20 h-20 text-emerald-500" />
          </div>

          <div className="relative z-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
