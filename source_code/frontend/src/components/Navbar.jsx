import { Link, useLocation } from 'react-router-dom';
/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { LayoutDashboard, History, GitCompareArrows, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

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
  
  const isActive = (path) => location.pathname === path;
  
  const navLinks = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/history', label: 'History', icon: History },
    { path: '/compare', label: 'Compare', icon: GitCompareArrows },
  ];

  // Public navbar (not logged in)
  if (!isAuthenticated) {
    return (
      <nav className="bg-dark-secondary/80 backdrop-blur-md border-b border-dark-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <Link to="/welcome" className="flex items-center gap-2">
              <motion.img
                whileHover={{ scale: 1.06 }}
                src={brandLogoSrc}
                alt="TARA logo"
                className="w-10 h-10 rounded-lg object-cover border border-cyber-cyan/25 bg-dark-tertiary"
              />
              <span className="text-xl font-bold font-display text-text-primary">
                TARA
              </span>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Authenticated navbar
  return (
    <nav className="bg-dark-secondary/80 backdrop-blur-md border-b border-dark-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Nav Links */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 mr-8">
              <motion.img
                whileHover={{ scale: 1.06 }}
                src={brandLogoSrc}
                alt="TARA logo"
                className="w-10 h-10 rounded-lg object-cover border border-cyber-cyan/25 bg-dark-tertiary"
              />
              <span className="text-xl font-bold font-display text-text-primary">
                TARA
              </span>
            </Link>
            
            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive(link.path)
                      ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-dark-tertiary'
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
                  className="w-8 h-8 rounded-full bg-cyber-cyan/20 flex items-center justify-center"
                  data-testid="navbar-avatar-fallback"
                >
                  <span className="text-sm font-medium text-cyber-cyan">
                    {userInitial}
                  </span>
                </div>
              )}
              <span className="text-sm text-text-secondary max-w-[180px] truncate">{userDisplayName}</span>
            </div>

            {/* Logout Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-risk-critical rounded-lg border border-dark-border hover:border-risk-critical/50 transition-all duration-200"
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
            className="md:hidden py-4 border-t border-dark-border"
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  isActive(link.path)
                    ? 'bg-cyber-cyan/10 text-cyber-cyan'
                    : 'text-text-secondary'
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
