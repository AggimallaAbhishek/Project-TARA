import { Link, useLocation } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { LayoutDashboard, History, GitCompareArrows, LogOut, Menu, X, FolderKanban, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { buildClockSnapshot } from '../utils/timeClock';

export default function Navbar() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('');

  const userDisplayName = (user?.name || 'User').trim() || 'User';
  const userInitial = userDisplayName.charAt(0).toUpperCase();
  const avatarUrl = (user?.picture || '').trim();
  const shouldShowAvatarImage = Boolean(avatarUrl && failedAvatarUrl !== avatarUrl);
  const brandLogoSrc = '/tara-logo.png';
  const [publicClock, setPublicClock] = useState(() => buildClockSnapshot());
  
  const isActive = (path) => (path === '/projects' ? location.pathname.startsWith('/projects') : location.pathname === path);
  
  const navLinks = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/projects', label: 'Projects', icon: FolderKanban },
    { path: '/history', label: 'History', icon: History },
    { path: '/audit', label: 'Audit', icon: FileText },
    { path: '/compare', label: 'Compare', icon: GitCompareArrows },
  ];

  useEffect(() => {
    if (isAuthenticated) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setPublicClock(buildClockSnapshot());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isAuthenticated]);

  // Public navbar (not logged in)
  if (!isAuthenticated) {
    return (
      <nav className="sticky top-0 z-50 border-b border-dark-border bg-dark-secondary/92 backdrop-blur-xl">
        <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between gap-3">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[10px] tracking-[0.2em] uppercase px-2 py-1 border border-cyber-cyan/35 text-cyber-cyan bg-cyber-cyan/10">
                TARA
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase px-2 py-1 border border-risk-medium/35 text-risk-medium bg-risk-medium/10">
                STRIDE
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase px-2 py-1 border border-cyber-blue/35 text-cyber-blue bg-cyber-blue/10">
                RISK OPS
              </span>
            </div>

            <Link to="/" className="flex items-center gap-2">
              <motion.img
                whileHover={{ scale: 1.06 }}
                src={brandLogoSrc}
                alt="TARA logo"
                className="w-8 h-8 rounded-md object-cover border border-dark-border-strong bg-dark-tertiary"
              />
              <span className="text-sm sm:text-base font-display tracking-[0.35em] text-text-primary">
                ORBITAL
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline font-mono text-[11px] text-text-muted tracking-wide">
                UTC {publicClock.utc} · {publicClock.localZoneLabel} {publicClock.local} ({publicClock.localUtcOffset})
              </span>
              <Link
                to="/login"
                className="px-3 py-1.5 text-sm rounded-lg border border-dark-border text-text-secondary hover:text-text-primary hover:border-cyber-cyan/45 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Authenticated navbar
  return (
    <nav className="sticky top-0 z-50 border-b border-dark-border bg-dark-secondary/92 backdrop-blur-xl">
      <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Nav Links */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 mr-8">
              <motion.img
                whileHover={{ scale: 1.06 }}
                src={brandLogoSrc}
                alt="TARA logo"
                className="w-10 h-10 rounded-md object-cover border border-dark-border-strong bg-dark-tertiary"
              />
              <span className="text-2xl font-bold font-display text-text-primary tracking-wide">
                TARA
              </span>
            </Link>
            
            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1 rounded-xl p-1 bg-dark-tertiary/70 border border-dark-border">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive(link.path)
                      ? 'bg-dark-secondary text-text-primary border border-dark-border-strong shadow-inner-soft'
                      : 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center gap-3">
              {shouldShowAvatarImage ? (
                <img
                  src={avatarUrl}
                  alt={userDisplayName}
                  data-testid="navbar-avatar-image"
                  onError={() => setFailedAvatarUrl(avatarUrl)}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full ring-2 ring-dark-border"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full bg-dark-tertiary border border-dark-border-strong flex items-center justify-center"
                  data-testid="navbar-avatar-fallback"
                >
                  <span className="text-sm font-medium text-text-secondary">
                    {userInitial}
                  </span>
                </div>
              )}
              <span className="text-[1rem] text-text-secondary max-w-[220px] truncate">{userDisplayName}</span>
            </div>

            {/* Logout Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-base text-text-secondary hover:text-risk-critical rounded-lg border border-dark-border hover:border-risk-critical/60 hover:bg-dark-tertiary transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden p-2 text-text-secondary hover:text-text-primary"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden py-4 border-t border-dark-border mt-2"
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  isActive(link.path)
                    ? 'bg-dark-tertiary border border-dark-border-strong text-text-primary'
                    : 'text-text-secondary hover:bg-dark-tertiary'
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </div>
    </nav>
  );
}
