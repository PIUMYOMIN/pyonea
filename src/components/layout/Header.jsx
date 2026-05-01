import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bars3Icon, XMarkIcon, ShoppingCartIcon,
  UserIcon, MagnifyingGlassIcon, ChevronDownIcon,
  SunIcon, MoonIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { NotificationBell } from '../Shared/NotificationsPanel';
import Logo from '../../assets/images/logo.png';

const Header = () => {
  const { t, i18n }               = useTranslation();
  const { user, logout, hasRole } = useAuth();
  const { totalItems }            = useCart();
  const navigate                  = useNavigate();
  const location                  = useLocation();

  const { isDark, toggleTheme } = useTheme();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [mobileSearch, setMobileSearch] = useState(false);

  const userMenuRef     = useRef(null);
  const debounceRef     = useRef(null);
  const mobileSearchRef = useRef(null);
  const isSyncingRef    = useRef(false);

  // Sync search input from URL (back/forward navigation)
  const urlQuery = useMemo(
    () => new URLSearchParams(location.search).get('search') || '',
    [location.search]
  );
  useEffect(() => {
    isSyncingRef.current = true;
    setSearchTerm(urlQuery);
    setTimeout(() => { isSyncingRef.current = false; }, 0);
  }, [urlQuery]);

  // Close mobile menu and search on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setMobileSearch(false);
  }, [location.pathname]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus mobile search input when it opens
  useEffect(() => {
    if (mobileSearch) {
      setTimeout(() => mobileSearchRef.current?.focus(), 50);
    }
  }, [mobileSearch]);

  // Debounced search — stable ref avoids recreation on every location change
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    if (isSyncingRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      if (value.trim()) {
        params.set('search', value.trim()); // URLSearchParams handles encoding
      } else {
        params.delete('search');
      }
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }, 500);
  }, [location.pathname, location.search, navigate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    clearTimeout(debounceRef.current);
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    navigate(`/products?${params.toString()}`);
    setMobileOpen(false);
    setMobileSearch(false);
  };

  const handleDashboard = () => {
    if (!user) { navigate('/login'); return; }
    if (hasRole('admin'))        navigate('/admin/dashboard');
    else if (hasRole('seller'))  navigate('/seller/dashboard');
    else                         navigate('/buyer/dashboard');
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  const goToNotifications = () => {
    if (!user) return;
    if (hasRole('admin')) {
      navigate('/admin/dashboard?tab=notifications');
    } else if (hasRole('seller')) {
      navigate('/seller/dashboard?tab=notifications');
    } else {
      navigate('/buyer/dashboard?tab=notifications');
    }
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    setUserMenuOpen(false);
    setMobileOpen(false);
  };

  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  // Active link detection
  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  const desktopLinkClass = (href) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(href)
        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold'
        : 'text-gray-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-slate-800'
    }`;

  const mobileLinkClass = (href) =>
    `flex items-center px-4 py-3 text-base font-medium rounded-xl transition-colors ${
      isActive(href)
        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold border-l-4 border-green-500 dark:border-green-600'
        : 'text-gray-700 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 hover:bg-gray-50 dark:hover:bg-slate-800'
    }`;

  const navigation = [
    { name: t('header.home'),       href: '/'           },
    { name: t('header.products'),   href: '/products'   },
    { name: t('header.sellers'),    href: '/sellers'    },
    { name: t('header.categories'), href: '/categories' },
  ];

  const isBuyer    = !user || hasRole('buyer');
  const userInitial = user?.name?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-50 border-b border-gray-100 dark:border-slate-800 theme-transition">

      {/* ── Main bar ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img src={Logo} alt="Pyonea" className="h-9 w-9 rounded-lg object-contain" />
            <span className="font-torus font-semibold text-green-800 dark:text-green-400 text-xl hidden sm:block">
              {t('header.logo_text')}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link key={item.href} to={item.href} className={desktopLinkClass(item.href)}>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop search */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-sm lg:max-w-md">
            <div className="relative w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('header.search_placeholder')}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg
                           bg-gray-50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500
                           focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2
                           focus:ring-green-400 focus:border-transparent placeholder-gray-400 transition-colors"
              />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 text-gray-500 dark:text-slate-400 hover:text-green-700 dark:hover:text-green-400
                         hover:bg-green-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isDark
                ? <SunIcon  className="h-5 w-5" />
                : <MoonIcon className="h-5 w-5" />}
            </button>

            {/* Mobile search toggle */}
            <button
              onClick={() => setMobileSearch(!mobileSearch)}
              className="sm:hidden p-2 text-gray-500 dark:text-slate-400 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label={t('header.search')}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>

            {/* Language switcher */}
            <div className="hidden sm:flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
              {['en', 'my'].map((lng) => (
                <button key={lng} onClick={() => changeLanguage(lng)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    i18n.language === lng
                      ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-green-400 shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                  }`}
                >
                  {lng === 'en' ? 'EN' : t('header.burmese')}
                </button>
              ))}
            </div>

            {/* Cart — buyers only */}
            {isBuyer && (
              <Link to="/cart"
                className="relative p-2 text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                aria-label="Cart"
              >
                <ShoppingCartIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center
                                   text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>
            )}

            {/* Notifications — authenticated users */}
            {user && <NotificationBell onClick={goToNotifications} />}

            {/* User dropdown */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-gray-50
                             focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
                >
                  <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-semibold
                                   flex items-center justify-center border-2 border-green-200">
                    {userInitial}
                  </span>
                  <ChevronDownIcon className={`hidden lg:block h-4 w-4 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg
                                  border border-gray-100 dark:border-slate-700 py-1 z-50 overflow-hidden">
                    <div className="px-4 py-2 border-b border-gray-50 dark:border-slate-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">{user.type || 'buyer'}</p>
                    </div>
                    <button onClick={handleDashboard}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-green-700 dark:hover:text-green-400 transition-colors">
                      {t('header.profile')}
                    </button>
                    <button onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      {t('header.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                           text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors">
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('header.login')}</span>
              </Link>
            )}

            {/* Hamburger — ONLY way to open/close mobile menu */}
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800
                         rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
              aria-label={t('header.open_menu')}
              aria-expanded={mobileOpen}
            >
              {mobileOpen
                ? <XMarkIcon className="h-5 w-5" />
                : <Bars3Icon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile search bar ──────────────────────────────────────────────── */}
      {mobileSearch && (
        <div className="sm:hidden border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                ref={mobileSearchRef}
                type="search"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t('header.search_placeholder')}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg
                           bg-gray-50 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <button type="submit"
              className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
              {t('header.search')}
            </button>
            <button type="button" onClick={() => setMobileSearch(false)}
              className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}

      {/* ── Transparent backdrop — clicking page body closes mobile menu ───── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile nav menu (above backdrop via z-50) ──────────────────────── */}
      {mobileOpen && (
        <div className="relative z-50 md:hidden border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">

          {/* Nav links */}
          <nav className="px-3 pt-3 pb-2 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={mobileLinkClass(item.href)}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="mx-4 border-t border-gray-100 dark:border-slate-800 my-2" />

          {/* Language switcher */}
          <div className="px-4 py-2">
            <p className="text-xs text-gray-400 dark:text-slate-600 mb-2 font-medium uppercase tracking-wide">Language</p>
            <div className="flex gap-2">
              {[
                { code: 'en', label: 'English' },
                { code: 'my', label: t('header.burmese') },
              ].map(({ code, label }) => (
                <button key={code} onClick={() => changeLanguage(code)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    i18n.language === code
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-4 border-t border-gray-100 dark:border-slate-800 my-2" />

          {/* User section */}
          <div className="px-3 pb-4">
            {user ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-4 py-2">
                  <span className="w-9 h-9 rounded-full bg-green-100 text-green-700 text-sm font-semibold
                                   flex items-center justify-center border-2 border-green-200 flex-shrink-0">
                    {userInitial}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">{user.type || 'buyer'}</p>
                  </div>
                </div>
                <button onClick={handleDashboard}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300
                             hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-green-700 dark:hover:text-green-400 rounded-xl transition-colors">
                  {t('header.profile')}
                </button>
                <button onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400
                             hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                  {t('header.logout')}
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-3 text-sm font-semibold
                             text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors">
                  {t('header.login')}
                </Link>
                <p className="text-center text-sm text-gray-500 dark:text-slate-500">
                  {t('header.new_user')}{' '}
                  <Link to="/register" onClick={() => setMobileOpen(false)}
                    className="font-semibold text-green-600 hover:text-green-700">
                    {t('header.sign_up')}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </header>
  );
};

export default Header;