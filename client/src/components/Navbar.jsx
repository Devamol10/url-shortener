import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css';

const Navbar = ({ onSearch }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    // The redirect to /login is now handled globally in AuthContext.logout()
    // via window.location.href to ensure a clean state flush.
    await logout();
  };

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/chat', label: 'Messages', icon: '💬' },
    { path: '/my-offers', label: 'Offers', icon: '🏷️' },
    { path: '/my-listings', label: 'My Listings', icon: '📦' },
  ];

  return (
    <>
      <nav className={styles.navbar} id="main-navbar">
        <div className={styles.navContainer}>
          {/* Logo */}
          <Link to="/" className={styles.logoLink}>
            <span className={styles.logoIcon}>🎓</span>
            <span className={styles.logoText}>CampusCart</span>
          </Link>

          {/* Search */}
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search items, books, electronics..."
              onChange={(e) => onSearch && onSearch(e.target.value)}
              id="global-search"
            />
          </div>

          {/* Desktop Nav Links */}
          <div className={styles.navLinks}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navLink} ${isActive(item.path) ? styles.active : ''}`}
              >
                {item.label}
              </Link>
            ))}

            <Link to="/add-item" className={styles.sellBtn}>
              <span className={styles.sellBtnIcon}>+</span>
              Sell
            </Link>

            {/* Profile */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                className={styles.profileBtn}
                onClick={() => setProfileOpen(!profileOpen)}
                aria-label="Profile menu"
                id="profile-menu-btn"
              >
                <svg className={styles.profileBtnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>

              {profileOpen && (
                <div className={styles.profileDropdown}>
                  {user && (
                    <>
                      <div className={styles.profileHeader}>
                        <div className={styles.profileAvatarLarge}>
                          {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className={styles.profileEmailLarge}>
                          {user.email}
                        </div>
                      </div>
                      <div className={styles.profileDropdownDivider} />
                    </>
                  )}
                  <Link to="/my-listings" className={styles.profileDropdownItem}>📦 My Listings</Link>
                  <Link to="/my-offers" className={styles.profileDropdownItem}>🏷️ My Offers</Link>
                  <Link to="/chat" className={styles.profileDropdownItem}>💬 Messages</Link>
                  <div className={styles.profileDropdownDivider} />
                  <button onClick={handleLogout} className={styles.profileDropdownItemDanger}>
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Overlay */}
      <div className={`${styles.mobileNav} ${mobileOpen ? styles.open : ''}`}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`${styles.mobileNavLink} ${isActive(item.path) ? styles.active : ''}`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <Link to="/add-item" className={styles.mobileSellBtn}>
          <span>+</span> Sell an Item
        </Link>
        {user && (
          <>
            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem', marginBottom: '1rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6c63ff 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
                  {user.email ? user.email.charAt(0).toUpperCase() : '?'}
                </div>
                <div style={{ color: '#f3f4f6', fontSize: '0.9rem', fontWeight: '600', wordBreak: 'break-all' }}>
                  {user.email}
                </div>
              </div>
              <button onClick={handleLogout} className={styles.mobileNavLink} style={{ color: '#ef4444', width: '100%' }}>
                <span>🚪</span> Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Navbar;
