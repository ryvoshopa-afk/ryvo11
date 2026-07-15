import React, { useState, useEffect } from 'react';
import { useConfirm } from './ConfirmationDialog';
import { Language, Theme, User } from '../types';
import { TRANSLATIONS } from '../constants/translations';
import { ShoppingBag, Heart, User as UserIcon, Sun, Moon, Settings, ShieldAlert, Languages, Search, Sliders, MessageSquare, Truck, Home, Facebook, Twitter, Instagram, Youtube, Music, Ghost, Volume2, VolumeX, Coins, BookOpen, Bell } from 'lucide-react';
import { formatPrice } from '../utils/price';

interface NavbarProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  currentTheme: Theme;
  onThemeToggle: () => void;
  favoritesCount: number;
  cartCount: number;
  currentUser: User | null;
  onCartOpen: () => void;
  onAuthOpen: () => void;
  onLogout: () => void;
  onNavigate: (view: 'home' | 'admin' | 'dashboard' | 'favorites' | 'chat' | 'track' | 'blog') => void;
  currentView: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onFavoritesOpen: () => void;
  shopLogo: string;
  socialLinks?: {
    facebook: string;
    twitter: string;
    instagram: string;
    youtube: string;
    snapchat: string;
    tiktok: string;
  };
  announcementTextAr?: string;
  announcementTextEn?: string;
  announcementTextFr?: string;
  announcementLink?: string;
  
  // Dynamic 30 Suggestions additions
  currentCurrency: string;
  onCurrencyChange: (curr: any) => void;
  allProducts: any[];
  onProductClick: (prod: any) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  triggerToast?: (msg: string) => void;
}

// Interactive text helper that matches URLs and promo codes, making them clickable or copyable
function renderInteractiveText(
  text: string, 
  isRtl: boolean, 
  onCopySuccess: (code: string) => void
) {
  if (!text) return null;

  const EXCLUDE_WORDS = new Set([
    'HTML', 'CSS', 'SAR', 'USD', 'AED', 'EUR', 'GMT', 'UTC', 'AM', 'PM', 'OK', 
    'INFO', 'AI', 'JSON', 'API', 'VITE', 'NODE', 'CJS', 'ESM', 'TODO', 'WIFI', 
    'FAQ', 'IP', 'URL', 'ID', 'PDF', 'JPEG', 'PNG', 'SVG', 'CJ', 'APP', 'CHAT', 'ADMIN'
  ]);

  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, partIdx) => {
        if (part.match(urlRegex)) {
          let href = part;
          if (part.toLowerCase().startsWith('www.')) {
            href = 'https://' + part;
          }
          return (
            <a
              key={partIdx}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-sky-500 dark:text-sky-450 hover:underline font-bold break-all mx-1 px-1 py-0.5 bg-sky-500/5 dark:bg-sky-400/5 rounded border border-sky-500/10 cursor-pointer"
              title={isRtl ? 'افتح الرابط 🔗' : 'Open Link 🔗'}
              onClick={(e) => e.stopPropagation()}
            >
              <span>{part}</span>
              <svg className="w-3 h-3 shrink-0 inline ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          );
        }

        const codeRegex = /(`[^`]+`|\b[A-Z0-9_-]{4,15}\b)/g;
        const subParts = part.split(codeRegex);

        return (
          <span key={partIdx}>
            {subParts.map((subPart, subIdx) => {
              const isBacktick = subPart.startsWith('`') && subPart.endsWith('`');
              const cleanWord = isBacktick ? subPart.slice(1, -1) : subPart;
              const isCodePattern = isBacktick || (
                subPart.match(/^[A-Z0-9_-]{4,15}$/) && 
                !EXCLUDE_WORDS.has(subPart.toUpperCase()) &&
                /[A-Z]/.test(subPart)
              );

              if (isCodePattern && cleanWord.trim()) {
                const codeToCopy = cleanWord.trim();
                return (
                  <button
                    key={subIdx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(codeToCopy).then(() => {
                        onCopySuccess(codeToCopy);
                      });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[11px] font-extrabold rounded border border-amber-500/25 cursor-pointer hover:bg-amber-500/20 dark:hover:bg-amber-500/30 active:scale-95 transition-all shadow-sm"
                    title={isRtl ? 'انقر لنسخ الكود 📋' : 'Click to copy code 📋'}
                  >
                    <span>{codeToCopy}</span>
                    <svg className="w-3 h-3 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                );
              }

              return <span key={subIdx}>{subPart}</span>;
            })}
          </span>
        );
      })}
    </>
  );
}

export default function Navbar({
  currentLanguage,
  onLanguageChange,
  currentTheme,
  onThemeToggle,
  favoritesCount,
  cartCount,
  currentUser,
  onCartOpen,
  onAuthOpen,
  onLogout,
  onNavigate,
  currentView,
  searchQuery,
  onSearchChange,
  onFavoritesOpen,
  shopLogo,
  socialLinks,
  announcementTextAr,
  announcementTextEn,
  announcementTextFr,
  announcementLink,
  
  currentCurrency,
  onCurrencyChange,
  allProducts,
  onProductClick,
  isMuted,
  onMuteToggle,
  triggerToast
}: NavbarProps) {
  const t = TRANSLATIONS[currentLanguage];
  const isRtl = currentLanguage === 'ar';
  const { confirm } = useConfirm();

  const handleLogoutClick = async () => {
    const confirmed = await confirm({
      title: isRtl ? 'تسجيل الخروج من الحساب 🔒' : 'Sign Out of Account 🔒',
      description: isRtl 
        ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من متجر رايفو؟ سيتعين عليك إدخال بياناتك مجدداً لاحقاً.'
        : 'Are you sure you want to sign out of Ryvo Store? You will need to re-authenticate to access your profile.',
      confirmText: isRtl ? 'تسجيل الخروج' : 'Log Out',
      cancelText: isRtl ? 'البقاء في الحساب' : 'Stay Connected',
      type: 'warning'
    });
    if (confirmed) {
      onLogout();
    }
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const loadNotifs = () => {
      const saved = localStorage.getItem('ryvo_broadcast_notifications');
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch (e) {}
      } else {
        const defaultNotif = [
          {
            id: 'welcome-notif',
            title: isRtl ? 'أهلاً بك في متجر رايفو الفاخر! 🎉' : 'Welcome to Ryvo Premium Store! 🎉',
            body: isRtl 
              ? 'يسعدنا تقديم كود الخصم الحصري RYVO2026 للحصول على خصم إضافي بقيمة 10% على جميع مشترياتك اليوم! تسوقاً ممتعاً!'
              : 'Use code RYVO2026 at checkout to save an extra 10% on your purchases today!',
            icon: '🎉',
            date: new Date().toLocaleDateString(isRtl ? 'ar-SA' : 'en-US'),
            time: new Date().toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })
          }
        ];
        setNotifications(defaultNotif);
        localStorage.setItem('ryvo_broadcast_notifications', JSON.stringify(defaultNotif));
      }
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 2500);
    return () => clearInterval(interval);
  }, [isRtl]);

  // Background poller for live support replies and system notifications via /api/notifications API
  useEffect(() => {
    const conversationId = (currentUser ? currentUser.email : (localStorage.getItem('ryvo_support_guest_id') || '')).toLowerCase().trim();
    if (!conversationId) return;

    const fetchLiveNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?conversationId=${encodeURIComponent(conversationId)}`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data && data.success) {
              let hasNew = false;
              const savedNotifs = localStorage.getItem('ryvo_broadcast_notifications');
              let parsedNotifs: any[] = [];
              if (savedNotifs) {
                try { parsedNotifs = JSON.parse(savedNotifs); } catch (e) {}
              }

              // Sync Support Replies
              if (Array.isArray(data.supportNotifications)) {
                data.supportNotifications.forEach((msg: any) => {
                  const notifId = msg.id;
                  const alreadyNotified = parsedNotifs.some((n: any) => n.id === notifId);
                  const seenKey = `client_seen_support_msg_${notifId}`;
                  
                  if (!alreadyNotified && !localStorage.getItem(seenKey)) {
                    localStorage.setItem(seenKey, 'true');
                    parsedNotifs.unshift({
                      id: notifId,
                      title: isRtl ? msg.title : msg.titleEn,
                      body: msg.body,
                      icon: msg.icon || '💬',
                      date: new Date(msg.timestamp).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US'),
                      time: msg.time || new Date(msg.timestamp).toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
                      read: false,
                      type: 'support_reply'
                    });
                    hasNew = true;
                  }
                });
              }

              // Sync System-wide Broadcast Announcements
              if (Array.isArray(data.systemNotifications)) {
                data.systemNotifications.forEach((sys: any) => {
                  const alreadyNotified = parsedNotifs.some((n: any) => n.id === sys.id);
                  if (!alreadyNotified) {
                    parsedNotifs.unshift({
                      id: sys.id,
                      title: isRtl ? sys.title : sys.titleEn,
                      body: isRtl ? sys.body : sys.bodyEn,
                      icon: sys.icon || '🎉',
                      date: new Date(sys.timestamp).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US'),
                      time: new Date(sys.timestamp).toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
                      read: false,
                      type: 'system_broadcast'
                    });
                    hasNew = true;
                  }
                });
              }

              if (hasNew) {
                const updatedList = parsedNotifs.slice(0, 30);
                localStorage.setItem('ryvo_broadcast_notifications', JSON.stringify(updatedList));
                setNotifications(updatedList);
                if (triggerToast) {
                  triggerToast(isRtl ? '🔔 لديك رسائل وإشعارات جديدة متوفرة!' : '🔔 You have new messages and notifications!');
                }
              }
            }
          } else {
            console.warn("Expected JSON response from /api/notifications but received:", contentType);
          }
        }
      } catch (err) {
        console.error("Error fetching live notifications:", err);
      }
    };

    fetchLiveNotifications();
    const interval = setInterval(fetchLiveNotifications, 5000);
    return () => clearInterval(interval);
  }, [currentUser, isRtl, triggerToast]);

  const cycleLanguage = () => {
    if (currentLanguage === 'ar') onLanguageChange('en');
    else if (currentLanguage === 'en') onLanguageChange('fr');
    else onLanguageChange('ar');
  };

  const cycleCurrency = () => {
    const list = ['SAR', 'USD', 'AED', 'EUR'];
    const idx = list.indexOf(currentCurrency);
    const nextIdx = (idx + 1) % list.length;
    onCurrencyChange(list[nextIdx]);
  };


  return (
    <>
      {/* Top Custom Announcement Bar */}
      <div className="w-full bg-slate-900 text-slate-350 dark:bg-black text-[11px] py-1.5 border-b border-slate-200 dark:border-white/5 font-sans relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-3 flex items-center justify-center gap-3">
          {announcementLink ? (
            <a
              href={announcementLink.startsWith('http') ? announcementLink : `https://${announcementLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-bold select-none text-slate-100 hover:text-[var(--primary-color,#38bdf8)] transition-all"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-color,#38bdf8)]"></span>
              <span>
                {currentLanguage === 'ar' ? announcementTextAr : currentLanguage === 'fr' ? announcementTextFr : announcementTextEn}
              </span>
              <span className="underline text-[9.5px] opacity-85 hover:opacity-100 px-1.5 py-0.5 bg-white/10 rounded ml-1">
                {currentLanguage === 'ar' ? 'عرض الرابط 🔗' : 'View Link 🔗'}
              </span>
            </a>
          ) : (
            <div className="flex items-center gap-2 font-bold select-none text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary-color,#38bdf8)] animate-pulse"></span>
              <span>
                {currentLanguage === 'ar' ? announcementTextAr : currentLanguage === 'fr' ? announcementTextFr : announcementTextEn}
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-[#11141D] border-b border-slate-150 dark:border-[#1E293B] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-3">
          <div className={`flex items-center justify-between h-20 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <button
                id="ryvo-brand"
                onClick={() => onNavigate('home')}
                className="group flex items-center gap-1 transition-all duration-300 hover:scale-[1.03]"
              >
                {shopLogo.startsWith('data:image') || shopLogo.includes('http') || shopLogo.includes('/') ? (
                  <div className={`transition-all duration-300 flex items-center justify-center ${currentTheme === 'light' ? 'bg-black rounded-full p-2.5 w-16 h-16 shadow-lg border border-slate-200' : 'h-16'}`}>
                    <img 
                      src={shopLogo} 
                      alt="Shop Logo" 
                      width={64}
                      height={64}
                      className={`object-contain transition-all duration-300 ${currentTheme === 'light' ? 'h-full w-full rounded-full' : 'h-14 max-w-[180px] sm:max-w-[210px]'}`} 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                ) : shopLogo.toUpperCase().includes('RYVO') ? (
                  <div className={`transition-all duration-300 flex items-center gap-1.5 text-xl font-black font-sans tracking-tight ${currentTheme === 'light' ? 'bg-black text-white px-5 py-2.5 rounded-full shadow-lg border border-slate-250' : 'text-lg sm:text-xl'}`}>
                    <span className="text-[var(--primary-color,#38bdf8)] font-black">RYVO</span>
                    {shopLogo.toUpperCase().replace('RYVO', '').trim() && (
                      <span className={currentTheme === 'light' ? 'text-white' : 'text-slate-900 dark:text-white'}>
                        {shopLogo.toUpperCase().replace('RYVO', '').trim()}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className={`transition-all duration-300 text-xl font-black font-sans tracking-tight ${currentTheme === 'light' ? 'bg-black text-white px-5 py-2.5 rounded-full shadow-lg border border-slate-250' : 'text-lg sm:text-xl'}`}>
                    <span className="bg-gradient-to-r from-[var(--primary-color,#38bdf8)] to-amber-500 bg-clip-text text-transparent uppercase font-black">
                      {shopLogo}
                    </span>
                  </div>
                )}
              </button>

              {/* Quick Navigation Links */}
              <div className="hidden md:flex items-center gap-6">
                <button
                  id="nav-link-home"
                  onClick={() => onNavigate('home')}
                  className={`text-sm font-semibold transition-colors ${
                    currentView === 'home'
                      ? 'text-[var(--primary-color)] font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t.home}
                </button>

                <button
                  id="nav-link-track"
                  onClick={() => onNavigate('track')}
                  className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                    currentView === 'track'
                      ? 'text-[var(--primary-color)] font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[var(--primary-color)]'
                  }`}
                >
                  <Truck className="w-4 h-4 text-amber-500" />
                  {t.track_tab || 'تتبع طلبك 🚚'}
                </button>

                <button
                  id="nav-link-blog"
                  onClick={() => onNavigate('blog')}
                  className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                    currentView === 'blog'
                      ? 'text-[var(--primary-color)] font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[var(--primary-color)]'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-sky-500" />
                  <span>{currentLanguage === 'ar' ? 'المدونة ✍️' : currentLanguage === 'fr' ? 'Blog ✍️' : 'Blog ✍️'}</span>
                </button>

                <button
                  id="nav-link-chat"
                  onClick={() => onNavigate('chat')}
                  className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                    currentView === 'chat'
                      ? 'text-[var(--primary-color)] font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[var(--primary-color)]'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-[var(--primary-color)]" />
                  {t.support_tab || 'الدردشة 💬'}
                </button>
                
                {currentUser && currentUser.role === 'admin' ? (
                  <button
                    id="nav-link-admin"
                    onClick={() => onNavigate('admin')}
                    className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                      currentView === 'admin'
                        ? 'text-[var(--primary-color)] font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-red-400'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    {t.admin_panel}
                  </button>
                ) : currentUser ? (
                  <button
                    id="nav-link-dashboard"
                    onClick={() => onNavigate('dashboard')}
                    className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                      currentView === 'dashboard'
                        ? 'text-[var(--primary-color)] font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-[var(--primary-color)]'
                    }`}
                  >
                    <Settings className="w-4 h-4 animate-spin-slow text-[var(--primary-color, #38bdf8)]" />
                    {currentUser.role === 'affiliate' ? (isRtl ? 'حساب المسوق 💸' : 'Affiliate Portal 💸') : t.customer_panel}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Search bar inside header */}
            <div className="hidden lg:block w-72 max-w-xs relative">
              <div className={`absolute inset-y-0 ${isRtl ? 'left-3' : 'right-3'} flex items-center pointer-events-none text-gray-400`}>
                <Search className="w-4 h-4" />
              </div>
              <input
                id="global-search"
                type="text"
                placeholder={t.search_placeholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className={`w-full py-2 px-4 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-[#0A0C10] text-slate-800 dark:text-gray-100 outline-none transition-all ${
                  isRtl ? 'pr-4 pl-10 text-right' : 'pl-4 pr-10 text-left'
                }`}
              />

              {/* Suggestions Autocomplete List */}
              {searchQuery.trim().length > 0 && allProducts && (
                <div className={`absolute left-0 right-0 mt-2 bg-white dark:bg-[#11141D] border border-slate-150 dark:border-[#1E293B] rounded-2xl shadow-xl z-50 max-h-80 overflow-y-auto ${isRtl ? 'text-right' : 'text-left'}`}>
                  {(() => {
                    const q = searchQuery.toLowerCase().trim();
                    const filtered = allProducts.filter(p => 
                      p.name_ar.toLowerCase().includes(q) || 
                      p.name_en.toLowerCase().includes(q) || 
                      p.name_fr.toLowerCase().includes(q)
                    );
                    if (filtered.length === 0) {
                      return <div className="p-4 text-xs text-slate-400 dark:text-slate-500 font-bold text-center">{isRtl ? 'لا توجد نتائج مطابقة 🔍' : 'No matches found 🔍'}</div>;
                    }
                    return (
                      <div className="py-2 divide-y divide-slate-100 dark:divide-[#1E293B]">
                        {filtered.slice(0, 5).map((prod) => {
                          const name = isRtl ? prod.name_ar : currentLanguage === 'fr' ? prod.name_fr : prod.name_en;
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => {
                                onProductClick?.(prod);
                                onSearchChange('');
                              }}
                              className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/60 flex items-center gap-3 transition-colors text-left cursor-pointer"
                            >
                              <img src={prod.image} className="w-8 h-8 rounded-lg object-cover bg-slate-150 p-0.5 flex-shrink-0" referrerPolicy="no-referrer" />
                              <div className="flex-1 min-w-0 text-left">
                                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{name}</h4>
                                <span className="text-[10px] font-black text-amber-500 font-mono">{formatPrice(prod.price, currentLanguage)}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Accessories (Lang, Theme, Cart, Fav, Auth) */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              
              {/* Settings Dropdown Button (Consolidating Language, Currency, Sound Toggle) */}
              <div className="relative">
                <button
                  id="navbar-settings-button"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-300 hover:scale-105 transition-transform relative cursor-pointer flex items-center justify-center"
                  title={isRtl ? 'الإعدادات والخيارات ⚙️' : 'Settings & Options ⚙️'}
                >
                  <Settings className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${isSettingsOpen ? 'animate-spin' : 'hover:rotate-45 transition-transform duration-300'}`} />
                </button>

                {isSettingsOpen && (
                  <>
                    {/* Backdrop with elegant blur */}
                    <div 
                      className="fixed inset-0 bg-black/40 dark:bg-black/70 z-40 backdrop-blur-xs"
                      onClick={() => setIsSettingsOpen(false)}
                    />
                    
                    {/* Centered Panel below the navbar */}
                    <div className="fixed top-[84px] left-1/2 -translate-x-1/2 w-[92%] sm:w-full max-w-sm bg-white dark:bg-[#11141D] border border-slate-150 dark:border-[#1E293B] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                      <div className="p-3 bg-slate-50 dark:bg-black/40 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 dark:text-amber-400">
                          ⚙️ {isRtl ? 'تخصيص التجربة' : 'Customize Experience'}
                        </span>
                        <button 
                          onClick={() => setIsSettingsOpen(false)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
                        >
                          {isRtl ? 'تم' : 'Done'}
                        </button>
                      </div>

                      <div className="p-4 space-y-4 text-right">
                        {/* Language Selection */}
                        <div className="space-y-1.5">
                          <label className={`block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                            🌐 {isRtl ? 'اللغة المفضلة' : 'Preferred Language'}
                          </label>
                          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-[#0A0C10] rounded-xl p-1 border dark:border-[#1E293B]">
                            {([
                              { code: 'ar', label: 'العربية' },
                              { code: 'en', label: 'English' },
                              { code: 'fr', label: 'Français' }
                            ]).map((la) => (
                              <button
                                key={la.code}
                                onClick={() => {
                                  onLanguageChange(la.code as Language);
                                }}
                                className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                  currentLanguage === la.code
                                    ? 'bg-[var(--primary-color)] text-slate-950 shadow-sm font-black'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                              >
                                {la.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Currency Selection */}
                        <div className="space-y-1.5">
                          <label className={`block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                            🪙 {isRtl ? 'العملة المعروضة' : 'Display Currency'}
                          </label>
                          <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-[#0A0C10] rounded-xl p-1 border dark:border-[#1E293B]">
                            {(['SAR', 'USD', 'AED', 'EUR'] as const).map((curr) => (
                              <button
                                key={curr}
                                onClick={() => onCurrencyChange(curr)}
                                className={`py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                                  currentCurrency === curr
                                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                              >
                                {curr}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Sound Audio Toggle */}
                        <div className="space-y-1.5">
                          <label className={`block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                            🔊 {isRtl ? 'المؤثرات الصوتية' : 'Sound Effects'}
                          </label>
                          <button
                            onClick={onMuteToggle}
                            className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                              !isMuted 
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold' 
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-[#1E293B] text-slate-500 dark:text-slate-400 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-500 animate-pulse" />}
                              <span className="text-[11px] font-bold">
                                {isMuted ? (isRtl ? 'الأصوات مكتومة' : 'Sounds Muted') : (isRtl ? 'الأصوات مفعلة' : 'Sounds Active')}
                              </span>
                            </div>
                            <span className="text-[10px] font-black underline uppercase">
                              {isMuted ? (isRtl ? 'تشغيل' : 'Enable') : (isRtl ? 'كتم' : 'Mute')}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Dark & Light mode switch */}
              <button
                id="theme-toggler"
                onClick={onThemeToggle}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-800 hover:scale-105 transition-transform"
                aria-label={currentLanguage === 'ar' ? 'تغيير المظهر الداكن والفاتح' : 'Toggle Theme'}
              >
                {currentTheme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {/* Favorites Heart (Visible on tablet/desktop, mobile uses bottom Nav) */}
              <button
                id="favorites-shortcut"
                onClick={onFavoritesOpen}
                className="hidden sm:block p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#1E293B] text-rose-500 hover:scale-105 transition-transform relative animate-in fade-in"
                aria-label={currentLanguage === 'ar' ? 'عرض المنتجات المفضلة' : 'View favorite products'}
              >
                <Heart className="w-4 h-4" />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {favoritesCount}
                  </span>
                )}
              </button>

              {/* Notification Bell with Dropdown */}
              <div className="relative">
                <button
                  id="navbar-notification-bell"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:scale-105 transition-transform relative cursor-pointer"
                  title={isRtl ? 'الإشعارات والتنبيهات 🔔' : 'Notifications 🔔'}
                >
                  <Bell className="w-4 h-4" />
                  {(() => {
                    const unreadCount = notifications.filter((n: any) => !n.read).length;
                    return unreadCount > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                        {unreadCount}
                      </span>
                    ) : null;
                  })()}
                </button>

                {isNotifOpen && (
                  <>
                    {/* Centered Backdrop */}
                    <div 
                      className="fixed inset-0 bg-black/40 dark:bg-black/70 z-40 backdrop-blur-xs"
                      onClick={() => setIsNotifOpen(false)}
                    />
                    
                    {/* Floating Centered Dropdown right below the Navbar */}
                    <div className="fixed top-[84px] left-1/2 -translate-x-1/2 w-[92%] sm:w-full max-w-lg md:max-w-xl bg-white dark:bg-[#11141D] border border-slate-150 dark:border-[#1E293B] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                      <div className="p-4 bg-slate-50 dark:bg-black/40 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800 dark:text-amber-400">
                            🔔 {isRtl ? 'مركز إشعارات رايفو' : 'Ryvo Notification Hub'}
                          </span>
                          {notifications.filter((n: any) => !n.read).length > 0 && (
                            <span className="px-2 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full animate-pulse">
                              {notifications.filter((n: any) => !n.read).length} {isRtl ? 'جديد' : 'new'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {notifications.length > 0 && (
                            <button
                              onClick={() => {
                                const updated = notifications.map((n: any) => ({ ...n, read: true }));
                                setNotifications(updated);
                                localStorage.setItem('ryvo_broadcast_notifications', JSON.stringify(updated));
                                if (triggerToast) {
                                  triggerToast(isRtl ? '✅ تم تحديد الكل كمقروء' : '✅ Marked all as read');
                                } else {
                                  setCopyToast(isRtl ? 'تم تحديد الكل كمقروء' : 'Marked all as read');
                                  setTimeout(() => setCopyToast(null), 2000);
                                }
                              }}
                              className="text-[10px] text-amber-600 dark:text-amber-400 font-black bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              {isRtl ? 'قراءة الكل' : 'Mark all as read'}
                            </button>
                          )}
                          <button 
                            onClick={() => setIsNotifOpen(false)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            {isRtl ? 'إغلاق' : 'Close'}
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                        {notifications.length === 0 ? (
                          <div className="p-10 text-center text-slate-400 text-xs font-semibold">
                            {isRtl ? 'لا توجد إشعارات حالياً.' : 'No active notifications.'}
                          </div>
                        ) : (
                          notifications.map((notif: any) => {
                            const handleNotifClick = () => {
                              if (!notif.read) {
                                const updated = notifications.map((n: any) => n.id === notif.id ? { ...n, read: true } : n);
                                setNotifications(updated);
                                localStorage.setItem('ryvo_broadcast_notifications', JSON.stringify(updated));
                              }
                              if (notif.type === 'support_reply') {
                                setIsNotifOpen(false);
                                onNavigate('chat');
                              }
                            };

                            return (
                              <div 
                                key={notif.id} 
                                onClick={handleNotifClick}
                                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors text-right flex gap-3 cursor-pointer ${
                                  !notif.read ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.03]' : ''
                                }`}
                              >
                                <span className="text-xl shrink-0 mt-0.5">{notif.icon || '📢'}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug">{notif.title}</h4>
                                    {!notif.read && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" title={isRtl ? 'غير مقروء' : 'Unread'} />
                                    )}
                                  </div>
                                  <p className="text-[10.5px] text-slate-500 dark:text-slate-450 mt-1 leading-relaxed font-medium font-sans whitespace-pre-wrap">
                                    {renderInteractiveText(notif.body, isRtl, (copiedCode) => {
                                      handleNotifClick();
                                      if (triggerToast) {
                                        triggerToast(isRtl ? `📋 تم نسخ كود الخصم: ${copiedCode}` : `📋 Copied discount code: ${copiedCode}`);
                                      } else {
                                        setCopyToast(copiedCode);
                                        setTimeout(() => setCopyToast(null), 2000);
                                      }
                                    })}
                                  </p>
                                  <span className="text-[8px] text-slate-400 font-mono mt-2 block">{notif.date} • {notif.time}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Local Notification Copied Toast */}
              {copyToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-black py-3 px-5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
                  <svg className="w-4 h-4 shrink-0 text-emerald-400 dark:text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    {isRtl ? `تم النسخ بنجاح: ${copyToast}` : `Successfully copied: ${copyToast}`}
                  </span>
                </div>
              )}

              {/* Shopping Bag / Cart */}
              <button
                id="cart-trigger"
                onClick={onCartOpen}
                className="p-2.5 rounded-xl bg-[var(--primary-color)]/10 dark:bg-[var(--primary-color)]/10 border border-slate-200 dark:border-[var(--primary-color)]/30 text-[var(--primary-color)] hover:scale-105 transition-transform relative"
                aria-label={currentLanguage === 'ar' ? 'فتح سلة المشتريات' : 'Open shopping cart'}
              >
                <ShoppingBag className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white dark:bg-white dark:text-[#0A0C10] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* User credentials / Auth triggers */}
              {currentUser ? (
                <div className="flex items-center gap-1.5">
                  <button
                    id="user-profile-avatar"
                    onClick={() => onNavigate(currentUser.role === 'admin' ? 'admin' : 'dashboard')}
                    className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-gray-100 transition-colors border dark:border-[#1E293B]"
                    aria-label={currentLanguage === 'ar' ? 'لوحة التحكم الشخصية' : 'Go to user profile dashboard'}
                  >
                    <UserIcon className="w-4 h-4 text-[var(--primary-color)]" />
                    <span className="max-w-[80px] truncate">{currentUser.name}</span>
                  </button>
                  <button
                    id="auth-logout-btn"
                    onClick={handleLogoutClick}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-bold hover:bg-rose-500 hover:text-white transition-all active:scale-95 cursor-pointer"
                    aria-label={currentLanguage === 'ar' ? 'تسجيل الخروج من الحساب' : 'Logout of account'}
                  >
                    {t.logout}
                  </button>
                </div>
              ) : (
                <button
                  id="auth-login-trigger"
                  onClick={onAuthOpen}
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 bg-[var(--primary-color)] text-slate-950 font-black hover:shadow-[0_0_15px_rgba(var(--primary-color-rgb, 56, 189, 248),0.3)] hover:scale-[1.02] active:scale-95 text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                  aria-label={currentLanguage === 'ar' ? 'تسجيل الدخول أو إنشاء حساب' : 'Login or sign up'}
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.login}</span>
                </button>
              )}

            </div>

          </div>
        </div>
      </nav>

      {/* Luxury Sticky Bottom Navigation Bar for Mobile screens */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0A0C10]/95 backdrop-blur-md border-t border-slate-200 dark:border-[#1E293B] shadow-[0_-3px_30px_rgba(0,0,0,0.08)] md:hidden pb-safe">
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {/* Col 1: Home */}
          <button
            id="mobile-nav-home"
            onClick={() => onNavigate('home')}
            aria-label={currentLanguage === 'ar' ? 'الذهاب للرئيسية' : 'Go to Home'}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] font-black transition-all ${
              currentView === 'home'
                ? 'text-[var(--primary-color, #38bdf8)] scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-850'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>{t.home}</span>
          </button>

          {/* Col 2: Track */}
          <button
            id="mobile-nav-track"
            onClick={() => onNavigate('track')}
            aria-label={currentLanguage === 'ar' ? 'تتبع طلبك' : 'Track your order'}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] font-black transition-all ${
              currentView === 'track'
                ? 'text-[var(--primary-color, #38bdf8)] scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-850'
            }`}
          >
            <Truck className="w-5 h-5 text-amber-500" />
            <span>{t.track_tab ? t.track_tab.replace('🚚', '').trim() : 'تتبع'}</span>
          </button>

          {/* Col 3: Chat Support */}
          <button
            id="mobile-nav-chat"
            onClick={() => onNavigate('chat')}
            aria-label={currentLanguage === 'ar' ? 'الدعم والمساعدة بالذكاء الاصطناعي' : 'AI chat support'}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] font-black transition-all ${
              currentView === 'chat'
                ? 'text-[var(--primary-color, #38bdf8)] scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-850'
            }`}
          >
            <MessageSquare className="w-5 h-5 text-[var(--primary-color)]" />
            <span>{t.chat_tab ? t.chat_tab.replace('💬', '').trim() : 'الدردشة'}</span>
          </button>

          {/* Col 4: Favorites */}
          <button
            id="mobile-nav-favorites"
            onClick={onFavoritesOpen}
            aria-label={currentLanguage === 'ar' ? 'عرض المنتجات المفضلة' : 'View favorite products'}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] font-black transition-all ${
              currentView === 'favorites'
                ? 'text-rose-500 scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-rose-450'
            } relative`}
          >
            <Heart className="w-5 h-5 text-rose-500" />
            <span>{t.favorites}</span>
            {favoritesCount > 0 && (
              <span className="absolute top-2 right-4 bg-rose-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Col 5: Profile Dashboard / Admin / Login */}
          <button
            id="mobile-nav-profile"
            onClick={() => {
              if (currentUser) {
                onNavigate(currentUser.role === 'admin' ? 'admin' : 'dashboard');
              } else {
                onAuthOpen();
              }
            }}
            aria-label={currentUser ? (currentUser.role === 'admin' ? (currentLanguage === 'ar' ? 'لوحة تحكم المسؤول' : 'Admin Panel') : (currentLanguage === 'ar' ? 'لوحة التحكم الشخصية' : 'User Dashboard')) : (currentLanguage === 'ar' ? 'تسجيل الدخول أو إنشاء حساب' : 'Login or register')}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] font-black transition-all ${
              currentView === 'dashboard' || currentView === 'admin'
                ? 'text-[var(--primary-color, #38bdf8)] scale-105'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-850'
            }`}
          >
            {currentUser && currentUser.role === 'admin' ? (
              <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
            ) : (
              <UserIcon className="w-5 h-5 text-[var(--primary-color, #38bdf8)]" />
            )}
            <span>{currentUser ? (currentUser.role === 'admin' ? t.admin_panel.split(' ')[0] : currentUser.role === 'affiliate' ? (isRtl ? 'المسوق' : 'Affiliate') : t.customer_panel.split(' ')[0]) : t.login}</span>
          </button>
        </div>
      </div>
    </>
  );
}
