import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PenTool,
  Eye,
  History,
  Cpu,
  Settings,
  Sparkles,
  Menu,
  X,
  Bell,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { checkGithubHumanizerUpdate } from '../services/github';

export const DashboardLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string>('1.2.0');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check update on website load (1 hour cache logic)
    const runUpdateCheck = async () => {
      setCheckingUpdate(true);
      try {
        const result = await checkGithubHumanizerUpdate();
        if (result && result.hasUpdate) {
          setHasUpdate(true);
          setLatestVersion(result.latestSha ? `sha-${result.latestSha.substring(0, 6)}` : 'terbaru');
        }
      } catch (err) {
        console.warn('Update check warning:', err);
      } finally {
        setCheckingUpdate(false);
      }
    };

    runUpdateCheck();
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/generate', label: 'Generate', icon: PenTool },
    { path: '/preview', label: 'Preview', icon: Eye },
    { path: '/history', label: 'History', icon: History },
    {
      path: '/humanizer',
      label: 'Humanizer',
      icon: Cpu,
      badge: hasUpdate ? 'Update' : undefined,
    },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard Summary';
      case '/generate':
        return 'Generate AI Human Article';
      case '/preview':
        return 'WordPress Classic Editor Preview';
      case '/history':
        return 'Riwayat Artikel';
      case '/humanizer':
        return 'Humanizer Engine Dashboard';
      case '/settings':
        return 'Gemini API & System Settings';
      default:
        return 'AI Human Article Generator';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col md:flex-row antialiased">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 sticky top-0 h-screen z-20">
        {/* Brand */}
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <img
            src="https://i.ibb.co.com/wr0x733r/prajurit-digital.jpg"
            alt="Prajurit Digital"
            className="w-10 h-10 rounded-xl object-cover shadow-md shadow-[#fe4c6f]/20 border border-gray-100"
          />
          <div>
            <h1 className="font-bold text-base leading-tight text-gray-900">AI Human Article</h1>
            <span className="text-[11px] font-medium text-[#fe4c6f] tracking-wide uppercase">
              Engine v2.9.1
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#fe4c6f] text-white shadow-sm shadow-[#fe4c6f]/30'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-gray-900 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Humanizer Version Footer Widget */}
        <div className="p-4 border-t border-gray-100 m-3 rounded-xl bg-gray-50/80 border border-gray-200/60">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span className="font-medium text-gray-700">Engine Status</span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ready
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Rule engine: <span className="font-semibold text-gray-900">blader/humanizer</span>
          </p>
        </div>

        {/* Sidebar Copyright Footer */}
        <div className="p-3.5 border-t border-gray-100 text-center bg-gray-50/50">
          <p className="text-[11px] font-semibold text-gray-500">
            © 2026 Karya Prajurit Digital.
          </p>
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <img
            src="https://i.ibb.co.com/wr0x733r/prajurit-digital.jpg"
            alt="Prajurit Digital"
            className="w-8 h-8 rounded-lg object-cover border border-gray-100"
          />
          <span className="font-bold text-sm text-gray-900">AI Human Article</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-white z-20 p-4 space-y-2 border-b border-gray-200 shadow-xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#fe4c6f] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-gray-900">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">{getPageTitle()}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tanpa Database • Express Serverless Gemini Proxy • Humanizer Engine
            </p>
          </div>

          {/* GitHub Humanizer Update Banner Notification */}
          {hasUpdate && (
            <NavLink
              to="/humanizer"
              className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3.5 py-1.5 rounded-xl hover:bg-amber-100 transition-colors shadow-xs"
            >
              <Bell className="w-4 h-4 text-amber-600 animate-bounce" />
              <span>
                Pembaruan Humanizer Rules Tersedia! (<strong>{latestVersion}</strong>)
              </span>
              <span className="font-semibold text-[#fe4c6f] underline ml-1">Update Now &rarr;</span>
            </NavLink>
          )}
        </header>

        {/* Outlet View */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
