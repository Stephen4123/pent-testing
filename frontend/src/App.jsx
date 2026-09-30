import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Shield, Plus, User, Rocket, LayoutDashboard, Radio, FileText, ShieldAlert, Settings, LogOut, RefreshCw, Sun, Moon } from 'lucide-react'
import Dashboard from './Dashboard'
import Scans from './pages/Scans'
import ScanForm from './pages/ScanForm'
import Reports from './pages/Reports'
import ReportDetails from './pages/ReportDetails'
import AdminPanel from './pages/AdminPanel'
import Support from './pages/Support'
import Login from './pages/Login'
import './index.css'
import { AnimatePresence, motion } from 'framer-motion'

// Smooth page transition helper
function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </motion.div>
  );
}

// Navigation links with active states and icons
function NavLinks({ isAdmin }) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="nav-links">
      <Link to="/" className={path === '/' ? 'active' : ''}>
        <LayoutDashboard size={16} />
        <span>Dashboard</span>
      </Link>
      <Link to="/scans" className={path.startsWith('/scan') ? 'active' : ''}>
        <Radio size={16} />
        <span>Scans</span>
      </Link>
      <Link to="/reports" className={path.startsWith('/report') ? 'active' : ''}>
        <FileText size={16} />
        <span>Reports</span>
      </Link>
      {isAdmin && (
        <Link to="/admin" className={path.startsWith('/admin') ? 'active' : ''}>
          <ShieldAlert size={16} />
          <span>Admin</span>
        </Link>
      )}
    </div>
  );
}

// Setup Axios global configuration
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Setup Axios interceptor to add JWT token to all requests
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

axios.interceptors.response.use(response => {
  return response;
}, error => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new Event('auth-failed'));
  }
  return Promise.reject(error);
});

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNewScanPage = location.pathname === '/scan/new';
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('currentUser') || 'Admin User';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('isAdmin') === 'true';
  });
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleAuthFailed = () => {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setShowProfileMenu(false);
    };
    window.addEventListener('auth-failed', handleAuthFailed);
    return () => window.removeEventListener('auth-failed', handleAuthFailed);
  }, []);

  // Global Ctrl+K keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchExpanded(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoginSuccess = (userName, token, isUserAdmin) => {
    setCurrentUser(userName);
    setIsAuthenticated(true);
    setIsAdmin(isUserAdmin);
    localStorage.setItem('currentUser', userName);
    localStorage.setItem('token', token);
    localStorage.setItem('isAdmin', isUserAdmin);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    setShowProfileMenu(false);
  };

  const handleSwitchUser = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    setShowProfileMenu(false);
  };

  const getUserInitials = (name) => {
    if (!name) return 'AU';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleToggleDarkMode = (e) => {
    e.stopPropagation();
    setDarkMode(prev => !prev);
  };

  // Global toast listener
  useEffect(() => {
    const handleShowToast = (e) => {
      const newToast = { id: Date.now(), ...e.detail };
      setToasts((prev) => [...prev, newToast]);

      // Auto-remove toast after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.map(t => t.id === newToast.id ? { ...t, hiding: true } : t));
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, 300);
      }, 4000);
    };

    window.addEventListener('showToast', handleShowToast);
    return () => window.removeEventListener('showToast', handleShowToast);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileRef, searchRef]);

  // Toggle dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [darkMode]);

  return (
    <>
      {!isAuthenticated ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="app-container">
          <nav className="navbar">
            <div className="nav-left">
              <Link to="/" className="brand">
                <div className="brand-icon-wrapper">
                  <Shield size={20} />
                </div>
                <span>AutoSec</span>
                <span className="brand-badge">SOC AI</span>
              </Link>
              <NavLinks isAdmin={isAdmin} />
            </div>

            <div className="nav-right">
              {/* Engine Status Badge */}
              <div className="engine-status-pill" title="ZAP & Nuclei Core Scanning Daemons Ready">
                <div className="status-dot-pulse"></div>
                <span>Engine Active</span>
              </div>

              {!isNewScanPage && (
                <>
                  <div
                    className={`search-bar ${isSearchExpanded ? 'expanded' : ''}`}
                    ref={searchRef}
                    onClick={() => {
                      if (!isSearchExpanded) setIsSearchExpanded(true);
                    }}
                    title="Search (Ctrl + K)"
                  >
                    <Search size={16} style={{ flexShrink: 0 }} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search target, IP, or CVE... (Ctrl+K)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          navigate(`/scans?q=${encodeURIComponent(searchQuery)}`);
                        }
                      }}
                    />
                  </div>
                  <Link to="/scan/new">
                    <button className="btn-primary" title="Launch New Assessment">
                      <Plus size={16} /> Launch Scan
                    </button>
                  </Link>
                </>
              )}

              {/* User Avatar Menu */}
              <div
                ref={profileRef}
                className="profile-container"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className="profile-avatar">
                  {getUserInitials(currentUser)}
                </div>

                {showProfileMenu && (
                  <div className="profile-menu">
                    <div className="profile-menu-header">
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{currentUser}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', marginTop: '2px', fontWeight: '600' }}>
                        {isAdmin ? '🛡️ Administrator' : 'Security Analyst'}
                      </div>
                    </div>

                    <div className="profile-menu-item" onClick={handleToggleDarkMode}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {darkMode ? <Moon size={15} /> : <Sun size={15} />}
                        <span>Dark Theme</span>
                      </span>
                      <div className={`toggle-switch ${darkMode ? 'on' : ''}`}>
                        <div className="toggle-knob"></div>
                      </div>
                    </div>

                    <button className="profile-menu-item" onClick={handleSwitchUser}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={15} />
                        <span>Switch Account</span>
                      </span>
                    </button>

                    {isAdmin && (
                      <Link to="/admin" className="profile-menu-item" onClick={() => setShowProfileMenu(false)}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ShieldAlert size={15} />
                          <span>Admin Console</span>
                        </span>
                      </Link>
                    )}

                    <button className="profile-menu-item danger" onClick={handleLogout} style={{ borderTop: '1px solid var(--border)', marginTop: '0.25rem', paddingTop: '0.6rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LogOut size={15} />
                        <span>Sign Out</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </nav>

          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
              <Route path="/scans" element={<PageWrapper><Scans /></PageWrapper>} />
              <Route path="/scan/new" element={<PageWrapper><ScanForm /></PageWrapper>} />
              <Route path="/reports" element={<PageWrapper><Reports /></PageWrapper>} />
              <Route path="/report/active" element={<PageWrapper><ReportDetails /></PageWrapper>} />
              <Route path="/admin" element={<PageWrapper>{isAdmin ? <AdminPanel /> : <Dashboard />}</PageWrapper>} />
              <Route path="/support" element={<PageWrapper><Support /></PageWrapper>} />
            </Routes>
          </AnimatePresence>

          {/* Global Toast Container */}
          <div className="toast-container">
            {toasts.map(toast => (
              <div key={toast.id} className={`global-toast ${toast.hiding ? 'hiding' : ''}`}>
                <div className="toast-icon">
                  <Rocket size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{toast.title}</div>
                  {toast.message && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{toast.message}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default App
