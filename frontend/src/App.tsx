import { useState } from "react";
import { Agentation } from "agentation";
import { BrowserRouter, Link, NavLink as RRNavLink, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "./pages/Dashboard";
import { Incidents } from "./pages/Incidents";
import { RunDetail } from "./pages/RunDetail";
import { Settings } from "./pages/Settings";
import { ToastContainer } from "./components/Toasts";
import {
  Activity, LayoutDashboard, BarChart3,
  Settings as SettingsIcon, ScrollText,
  Search, Plus, HelpCircle,
  Grid3x3,
} from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

/* ── Nav definition ──────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/",          label: "Executive Dashboard", Icon: LayoutDashboard },
    ],
  },
  {
    label: "Analysis",
    items: [
      { to: "/incidents", label: "Incident Analytics",  Icon: BarChart3 },
    ],
  },
];

const FOOTER_NAV = [
  { to: "/settings", label: "Configuration", Icon: SettingsIcon },
  { to: "/logs",     label: "Logs",          Icon: ScrollText },
];

/* ── Sidebar ─────────────────────────────────────────────────────── */
function Sidebar() {
  const { pathname } = useLocation();

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" || pathname.startsWith("/runs") : pathname.startsWith(to);

  const NavItem = ({ to, label, Icon }: { to: string; label: string; Icon: React.ElementType }) => {
    const active = isActive(to);
    return (
      <RRNavLink
        to={to}
        title={label}
        className={`relative flex items-center gap-2.5 rounded px-3 py-[7px] text-sm transition-colors ${
          active
            ? "bg-brand-50 font-semibold text-brand-700"
            : "text-ink-600 hover:bg-slate-100 hover:text-ink-900"
        }`}
      >
        {active && (
          <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-600" />
        )}
        <Icon style={{ width: 18, height: 18 }} className="shrink-0" />
        <span className="truncate">{label}</span>
      </RRNavLink>
    );
  };

  return (
    <aside className="flex flex-col w-64 shrink-0 border-r border-slate-200 bg-[#F8FAFC] sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto z-20">
      {/* Project context header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shrink-0">
            <Activity style={{ width: 14, height: 14 }} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900 leading-tight truncate">OpsIntel</p>
            <p className="text-[11px] text-ink-600 leading-tight">Agentic Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-2 py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-ink-600">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => <NavItem key={item.to} {...item} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer nav + sim badge */}
      <div className="px-2 pb-3 border-t border-slate-200 pt-2 space-y-0.5">
        {FOOTER_NAV.map((item) => <NavItem key={item.to} {...item} />)}
        <div className="mt-3 px-3">
          <span className="pill pill-purple w-full justify-center py-1">
            Simulation Mode
          </span>
        </div>
      </div>
    </aside>
  );
}

/* ── TopNav ──────────────────────────────────────────────────────── */
function TopNav() {
  const [search, setSearch] = useState("");

  return (
    <header className="sticky top-0 z-40 h-12 flex items-center gap-3 px-4 bg-white border-b border-slate-200 shadow-nav">
      {/* App switcher */}
      <button className="btn-ghost !px-2 !py-1.5 text-ink-700">
        <Grid3x3 style={{ width: 16, height: 16 }} />
      </button>

      {/* Brand */}
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center">
          <Activity style={{ width: 13, height: 13 }} className="text-white" />
        </div>
        <span className="text-sm font-bold text-ink-900 leading-none">OpsIntel</span>
      </Link>

      {/* Global search */}
      <div className="flex-1 max-w-sm mx-4">
        <div className="relative">
          <Search style={{ width: 14, height: 14 }} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tickets, runs, issues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input !py-1 pl-8 pr-3 text-xs h-8"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 ml-auto">
        <Link to="/" className="btn-primary h-8 text-xs gap-1.5">
          <Plus style={{ width: 13, height: 13 }} />
          Create
        </Link>
        <Link to="/settings" className="btn-ghost !px-2 h-8 text-ink-700">
          <SettingsIcon style={{ width: 15, height: 15 }} />
        </Link>
        <button className="btn-ghost !px-2 h-8 text-ink-700">
          <HelpCircle style={{ width: 15, height: 15 }} />
        </button>
        {/* User avatar */}
        <button className="ml-1 w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 hover:bg-brand-700 transition-colors">
          OI
        </button>
      </div>
    </header>
  );
}

/* ── Stub page ───────────────────────────────────────────────────── */
function StubPage({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center h-80 text-center">
      <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
        <Icon style={{ width: 22, height: 22 }} className="text-brand-600" />
      </div>
      <p className="text-sm font-semibold text-ink-900 mb-1">{title}</p>
      <p className="text-xs text-ink-600 max-w-xs">
        This capability is not yet connected. Configure a data source in{" "}
        <Link to="/settings" className="text-brand-600 hover:underline">Configuration</Link>.
      </p>
    </div>
  );
}

/* ── Page-level header (title + optional subtitle) ───────────────── */
export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-base font-semibold text-ink-900 leading-snug">{title}</h1>
        {subtitle && <p className="text-xs text-ink-600 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ── App layout ──────────────────────────────────────────────────── */
function AppLayout() {
  return (
    <div className="min-h-screen bg-[#F7F8F9]">
      <TopNav />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/runs/:runId" element={<RunDetail />} />
            <Route path="/incidents"   element={<Incidents />} />
            <Route path="/settings"    element={<Settings />} />
            <Route path="/logs"        element={<StubPage title="Logs" icon={ScrollText} />} />
          </Routes>
        </main>
      </div>
      <ToastContainer />
      <Agentation />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
