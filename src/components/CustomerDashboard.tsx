import React from 'react';
import { useConfirm } from './ConfirmationDialog';
import { Language, Order, Product, User } from '../types';
import { TRANSLATIONS } from '../constants/translations';
import { ShoppingBag, Heart, Settings, Plus, Key, Calendar, Mail, CheckCircle, ShieldCheck, Coins, History, Award, Wallet, CreditCard, ArrowRightLeft, MapPin, Phone, Sparkles, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatPrice } from '../utils/price';

interface CustomerDashboardProps {
  currentUser: User | null;
  currentLanguage: Language;
  orders: Order[];
  allProducts: Product[];
  favorites: string[];
  onFavoriteToggle: (pId: string) => void;
  onProductClick: (p: Product) => void;
  onUpdateUserName: (newName: string) => void;
  shopLogo: string;
  onUpdateUser?: (updatedUser: User) => void;
  onCancelOrder?: (orderId: string) => void;
}

export default function CustomerDashboard({
  currentUser,
  currentLanguage,
  orders,
  allProducts,
  favorites,
  onFavoriteToggle,
  onProductClick,
  onUpdateUserName,
  shopLogo,
  onUpdateUser,
  onCancelOrder
}: CustomerDashboardProps) {
  const t = TRANSLATIONS[currentLanguage];
  const isRtl = currentLanguage === 'ar';
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<'orders' | 'favorites' | 'settings' | 'inbox' | 'wallet'>('orders');

  // Invoice & Email sending states
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentStatus, setEmailSentStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleDownloadTextInvoice = (ord: Order) => {
    const itemsStr = ord.items.map(it => `• ${it.name} [x${it.quantity}] - Price: ${it.price} * ${it.quantity} = ${it.price * it.quantity} ${isRtl ? 'ر.س' : 'SAR'}`).join('\n');
    
    const invoiceText = `
==================================================
           ${(shopLogo || 'RYVO').toUpperCase()} PREMIUM STORE OFFICIAL RECEIPT
==================================================
Order Reference ID: #${ord.id}
Transaction Date:   ${ord.date}
Client Name:        ${ord.customer_name}
Client Email:       ${ord.user_email}
Delivery Node:      ${ord.address}
Contact Line:       ${ord.phone}
Payment Method:     ${ord.payment_method.toUpperCase()}
Fulfillment Status: ${ord.status.toUpperCase()}
==================================================
PURCHASED BASKET ITEMS:
${itemsStr}
--------------------------------------------------
Subtotal:           ${ord.total} ${isRtl ? 'ر.س' : 'SAR'}
VAT (15% inclusive): Included
TOTAL PAID SUM:     ${ord.total} ${isRtl ? 'ر.س' : 'SAR'}
==================================================
Thank you for your trust in our premium sports outlets!
Track or check history anytime at our verified portal.
==================================================
`;
    
    const element = document.createElement("a");
    const file = new Blob([invoiceText.trim()], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `Ryvo_Invoice_${ord.id.substring(0,8)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setToastMessage(isRtl ? '📥 تم تحميل ملف الفاتورة النصي بنجاح!' : '📥 Text Invoice downloaded successfully!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Personal Settings fields
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [profileCity, setProfileCity] = useState(currentUser?.city || '');
  const [profileDistrict, setProfileDistrict] = useState(currentUser?.district || '');
  const [profileStreet, setProfileStreet] = useState(currentUser?.street || '');
  const [profilePostalCode, setProfilePostalCode] = useState(currentUser?.postal_code || '');
  const [profilePassword, setProfilePassword] = useState(currentUser?.password || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Affiliate states
  const [affiliateTab, setAffiliateTab] = useState<'overview' | 'settings'>('overview');
  const [affiliateStats, setAffiliateStats] = useState<any | null>(null);
  const [affiliateIban, setAffiliateIban] = useState('');

  // Sync state with current user prop changes (e.g., login transitions)
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfilePhone(currentUser.phone || '');
      setProfileCity(currentUser.city || '');
      setProfileDistrict(currentUser.district || '');
      setProfileStreet(currentUser.street || '');
      setProfilePostalCode(currentUser.postal_code || '');
      setProfilePassword(currentUser.password || '');

      if (currentUser.role === 'affiliate') {
        try {
          const savedAff = localStorage.getItem('ryvo_affiliates');
          if (savedAff) {
            const parsed = JSON.parse(savedAff);
            const matched = parsed.find((a: any) => a.email.toLowerCase() === currentUser.email.toLowerCase());
            if (matched) {
              setAffiliateStats(matched);
              setAffiliateIban(matched.iban || '');
            }
          }
        } catch (_) {}
      }
    }
  }, [currentUser]);

  // Financial Wallet Action States
  const [chargeAmount, setChargeAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [walletProcessing, setWalletProcessing] = useState(false);
  const [convertPointsInput, setConvertPointsInput] = useState('');

  // Redeemed points coupons state/list
  const [redeemedCoupons, setRedeemedCoupons] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('ryvo_points_coupons');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  const handleChargeWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const amount = parseFloat(chargeAmount);
    if (isNaN(amount) || amount <= 0) return;

    setWalletProcessing(true);
    setTimeout(() => {
      const updatedUser: User = {
        ...currentUser,
        wallet_balance: (currentUser.wallet_balance || 0) + amount,
        wallet_history: [
          {
            id: `wal-chg-${Date.now()}`,
            type: 'charge',
            amount: amount,
            description_ar: `شحن رصيد المحفظة عبر بطاقة الدفع المباشر (*${cardNumber.slice(-4) || '7789'}) 💳`,
            description_en: `Charged financial wallet balance via credit card (*${cardNumber.slice(-4) || '7789'}) 💳`,
            date: new Date().toISOString().split('T')[0]
          },
          ...(currentUser.wallet_history || [])
        ]
      };

      // Sync registered users
      const savedList = localStorage.getItem('ryvo_registered_users');
      if (savedList) {
        try {
          const parsed = JSON.parse(savedList);
          const idx = parsed.findIndex((pu: any) => pu.email.toLowerCase() === currentUser.email.toLowerCase());
          if (idx !== -1) {
            parsed[idx] = updatedUser;
            localStorage.setItem('ryvo_registered_users', JSON.stringify(parsed));
          }
        } catch (_) {}
      }

      if (onUpdateUser) onUpdateUser(updatedUser);

      setWalletProcessing(false);
      setChargeAmount('');
      setCardNumber('');
      setCardHolder('');
      setCardExpiry('');
      setCardCvv('');
      setToastMessage(isRtl ? `💳 تم شحن رصيدك بنجاح بمبلغ ${amount} ر.س!` : `💳 Wallet charged successfully with ${amount} SAR!`);
      setTimeout(() => setToastMessage(''), 4000);
    }, 1500);
  };

  const handleConvertPointsToWallet = (pointsToConvert: number) => {
    if (!currentUser) return;
    const userPoints = currentUser.points || 0;
    if (pointsToConvert <= 0 || userPoints < pointsToConvert) return;

    // Conversion rate: 10 points = 1 SAR cash
    const cashCredited = Math.floor(pointsToConvert / 10);
    if (cashCredited <= 0) {
      setToastMessage(isRtl ? '⚠️ يجب تحويل 10 نقاط على الأقل للحصول على 1 ر.س!' : '⚠️ Minimum 10 points needed to convert to 1 SAR!');
      setTimeout(() => setToastMessage(''), 4000);
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      points: userPoints - pointsToConvert,
      points_history: [
        {
          id: `pt-conv-${Date.now()}`,
          reason_ar: `تحويل ${pointsToConvert} نقطة ولاء إلى رصيد المحفظة المالي بقيمة ${cashCredited} ر.س 💸`,
          reason_en: `Converted ${pointsToConvert} loyalty points to ${cashCredited} SAR wallet cash 💸`,
          points: -pointsToConvert,
          date: new Date().toISOString().split('T')[0]
        },
        ...(currentUser.points_history || [])
      ],
      wallet_balance: (currentUser.wallet_balance || 0) + cashCredited,
      wallet_history: [
        {
          id: `wal-pts-${Date.now()}`,
          type: 'points_convert',
          amount: cashCredited,
          description_ar: `استبدال وتحويل ${pointsToConvert} نقطة إلى رصيد مباشر بالمحفظة 🎉`,
          description_en: `Redeemed and converted ${pointsToConvert} points to direct wallet cash 🎉`,
          date: new Date().toISOString().split('T')[0]
        },
        ...(currentUser.wallet_history || [])
      ]
    };

    // Sync registered users
    const savedList = localStorage.getItem('ryvo_registered_users');
    if (savedList) {
      try {
        const parsed = JSON.parse(savedList);
        const idx = parsed.findIndex((pu: any) => pu.email.toLowerCase() === currentUser.email.toLowerCase());
        if (idx !== -1) {
          parsed[idx] = updatedUser;
          localStorage.setItem('ryvo_registered_users', JSON.stringify(parsed));
        }
      } catch (_) {}
    }

    if (onUpdateUser) onUpdateUser(updatedUser);
    setConvertPointsInput('');
    setToastMessage(isRtl ? `🎉 تم بنجاح تحويل النقاط وإضافة ${cashCredited} ر.س إلى رصيد محفظتك المالي!` : `🎉 Swapped successfully! Added ${cashCredited} SAR to your financial wallet!`);
    setTimeout(() => setToastMessage(''), 5000);
  };

  const handleRedeemPointsCoupon = () => {
    if (!currentUser || (currentUser.points || 0) < 150) return;

    const newPoints = (currentUser.points || 0) - 150;
    const couponCode = `RYVO-PTS-15-${Math.floor(1000 + Math.random() * 9005)}`;
    
    // Add to points history
    const historyItem = {
      id: `pt-red-${Date.now()}`,
      reason_ar: `استبدال 150 نقطة بكوبون خصم بقيمة 15 ريال سعودي [ ${couponCode} ] 🎟️`,
      reason_en: `Redeemed 150 points for a flat 15 SAR coupon [ ${couponCode} ] 🎟️`,
      points: -150,
      date: new Date().toISOString().split('T')[0]
    };

    const updatedUser: User = {
      ...currentUser,
      points: newPoints,
      points_history: [historyItem, ...(currentUser.points_history || [])]
    };

    // Callback to parent to update globally
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    } else {
      onUpdateUserName(currentUser.name);
    }

    // Save coupon in local storage
    const newCoupon = {
      code: couponCode,
      discount_sar: 15,
      used: false,
      date: new Date().toISOString().split('T')[0]
    };
    const updatedCoupons = [newCoupon, ...redeemedCoupons];
    setRedeemedCoupons(updatedCoupons);
    localStorage.setItem('ryvo_points_coupons', JSON.stringify(updatedCoupons));

    setToastMessage(isRtl ? `🎉 تم استبدال النقاط بنجاح! كود خصمك: ${couponCode}` : `🎉 Success! Your discount coupon code: ${couponCode}`);
    setTimeout(() => setToastMessage(''), 8000);
  };

  if (!currentUser) return null;

  // Filter orders related to this user
  const userOrders = orders.filter(o => o.user_email.toLowerCase() === currentUser.email.toLowerCase());

  // Filter favorite products
  const favoriteProducts = allProducts.filter(p => favorites.includes(p.id));

  // Load simulated emails for this user
  const getInboxEmails = () => {
    const saved = localStorage.getItem('ryvo_customer_emails');
    if (saved) {
      try {
        const parsed: any[] = JSON.parse(saved);
        return parsed.filter(m => m.to.toLowerCase() === currentUser.email.toLowerCase());
      } catch (e) {
        // ignore
      }
    }
    return [];
  };

  const inboxEmails = getInboxEmails();

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    if (currentUser) {
      const updated: User = {
        ...currentUser,
        name: profileName,
        phone: profilePhone,
        city: profileCity,
        district: profileDistrict,
        street: profileStreet,
        postal_code: profilePostalCode,
      };

      // Sync back to registered users list in local storage
      const savedList = localStorage.getItem('ryvo_registered_users');
      if (savedList) {
        try {
          const parsed = JSON.parse(savedList);
          const idx = parsed.findIndex((pu: any) => pu.email.toLowerCase() === currentUser.email.toLowerCase());
          if (idx !== -1) {
            parsed[idx] = updated;
            localStorage.setItem('ryvo_registered_users', JSON.stringify(parsed));
          }
        } catch (_) {}
      }

      if (onUpdateUser) {
        onUpdateUser(updated);
      } else {
        onUpdateUserName(profileName);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleAffiliateSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    // 1. Update ryvo_affiliates
    try {
      const savedAff = localStorage.getItem('ryvo_affiliates');
      if (savedAff) {
        const parsed = JSON.parse(savedAff);
        const idx = parsed.findIndex((a: any) => a.email.toLowerCase() === currentUser.email.toLowerCase());
        if (idx !== -1) {
          parsed[idx] = {
            ...parsed[idx],
            name: profileName,
            phone: profilePhone,
            password: profilePassword,
            iban: affiliateIban.trim()
          };
          localStorage.setItem('ryvo_affiliates', JSON.stringify(parsed));
          setAffiliateStats(parsed[idx]);
        }
      }
    } catch (_) {}

    // 2. Update ryvo_registered_users
    const updatedUser: User = {
      ...currentUser,
      name: profileName,
      phone: profilePhone,
      password: profilePassword
    };

    const savedUsers = localStorage.getItem('ryvo_registered_users');
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        const idx = parsed.findIndex((pu: any) => pu.email.toLowerCase() === currentUser.email.toLowerCase());
        if (idx !== -1) {
          parsed[idx] = {
            ...parsed[idx],
            name: profileName,
            phone: profilePhone,
            password: profilePassword,
            role: 'affiliate'
          };
          localStorage.setItem('ryvo_registered_users', JSON.stringify(parsed));
        }
      } catch (_) {}
    }

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    } else {
      onUpdateUserName(profileName);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  if (currentUser && currentUser.role === 'affiliate') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-800 dark:text-gray-100">
        {/* Welcome Board */}
        <div className="bg-[#11141D] border border-slate-200 dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden mb-6 shadow-sm">
          <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-rose-500/10 to-transparent rounded-full blur-3xl -mr-12 -mt-12"></div>
          
          <div className={`relative ${isRtl ? 'text-right' : 'text-left'} space-y-2`}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/15 border border-rose-500/25 rounded-full text-[10px] font-black text-rose-400 tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRtl ? 'شريك نجاح معتمد 🏆' : 'Verified Affiliate Partner 🏆'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-sans bg-gradient-to-r from-white to-rose-400 bg-clip-text text-transparent">
              {isRtl ? `أهلاً بك، شريكنا العزيز ${currentUser.name}! 👋` : `Welcome, partner ${currentUser.name}! 👋`}
            </h2>
            <p className="text-xs text-slate-400">
              {isRtl ? 'لوحة التحكم الحصرية بالمسوقين بالعمولة لمتجر RYVO الفاخر' : 'Exclusive Affiliate Partner Portal for RYVO Premium Store'}
            </p>
          </div>
        </div>

        {/* Tab Switch Headers */}
        <div className="flex bg-slate-100 dark:bg-[#0A0C10] border dark:border-[#1E293B] rounded-2xl p-1 gap-1 mb-6 max-w-md mx-auto">
          <button
            onClick={() => setAffiliateTab('overview')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              affiliateTab === 'overview'
                ? 'bg-white dark:bg-[#11141D] text-rose-500 shadow-sm'
                : 'text-slate-500 hover:text-rose-500'
            }`}
          >
            <Coins className="w-4 h-4 text-rose-500" />
            <span>{isRtl ? 'الأرباح والأداء 💸' : 'Earnings & Performance'}</span>
          </button>

          <button
            onClick={() => setAffiliateTab('settings')}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              affiliateTab === 'settings'
                ? 'bg-white dark:bg-[#11141D] text-rose-500 shadow-sm'
                : 'text-slate-500 hover:text-rose-500'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{isRtl ? 'بيانات الحساب ⚙️' : 'Account Settings'}</span>
          </button>
        </div>

        {/* Notification Banner */}
        {toastMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl text-xs font-black border border-emerald-500/20 text-center flex items-center justify-center gap-2 animate-in slide-in-from-top-2 duration-300">
            <CheckCircle className="w-5 h-5 animate-bounce" />
            <span>{toastMessage}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-6 p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl text-xs font-black border border-emerald-500/20 text-center flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>{isRtl ? 'تم تحديث البيانات الشخصية بنجاح!' : 'Personal information updated successfully!'}</span>
          </div>
        )}

        {/* Affiliate Tabs content */}
        {affiliateTab === 'overview' ? (
          <div className="space-y-6">
            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Promo Code Card */}
              <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-6 text-white flex flex-col justify-between shadow-lg shadow-rose-500/15 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full -mr-6 -mb-6"></div>
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-white/75">{isRtl ? 'كود الخصم الترويجي الخاص بك' : 'YOUR EXCLUSIVE PROMO CODE'}</p>
                  <h3 className="text-3xl font-black tracking-widest mt-2 font-mono select-all text-center">{affiliateStats?.code || 'SARA10'}</h3>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(affiliateStats?.code || 'SARA10');
                      setToastMessage(isRtl ? '📋 تم نسخ كود الخصم بنجاح!' : '📋 Promo code copied successfully!');
                      setTimeout(() => setToastMessage(''), 3000);
                    }}
                    className="px-4 py-2 bg-white text-rose-600 font-extrabold text-xs rounded-xl hover:bg-slate-50 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {isRtl ? 'نسخ الكود' : 'Copy Code'}
                  </button>
                  <span className="text-[10px] font-bold text-white/90">
                    {isRtl ? `خصم العميل: ${affiliateStats?.discount_percent || 10}% • عمولتك: ${affiliateStats?.commission_percent || 5}%` : `Client Discount: ${affiliateStats?.discount_percent || 10}% • Comm.: ${affiliateStats?.commission_percent || 5}%`}
                  </span>
                </div>
              </div>

              {/* Current Earnings Card */}
              <div className="bg-white dark:bg-[#11141D] border border-slate-150 dark:border-[#1E293B] rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{isRtl ? 'الأرباح الحالية القابلة للسحب' : 'CURRENT UNPAID BALANCE'}</p>
                    <span className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                      <Coins className="w-5 h-5" />
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-emerald-500 font-sans mt-3">
                    {affiliateStats?.current_balance || 0} <span className="text-xs font-bold">{isRtl ? 'ر.س' : 'SAR'}</span>
                  </h3>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-4">
                  {isRtl ? 'جاهزة للتحويل إلى حسابك البنكي بمجرد التسجيل' : 'Ready to be wired to your bank account'}
                </p>
              </div>

              {/* Total Commissions / Code Uses Card */}
              <div className="bg-white dark:bg-[#11141D] border border-slate-150 dark:border-[#1E293B] rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{isRtl ? 'مرات استخدام الكود' : 'PROMO CODE USAGES'}</p>
                    <span className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                      <TrendingUp className="w-5 h-5" />
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white font-sans mt-3">
                    {affiliateStats?.usage_count || 0} <span className="text-xs font-bold">{isRtl ? 'مرة' : 'times'}</span>
                  </h3>
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-4 flex justify-between items-center">
                  <span>{isRtl ? 'إجمالي الأرباح الكلية:' : 'Total commissions earned:'}</span>
                  <span className="font-sans text-slate-700 dark:text-slate-300 font-black">{affiliateStats?.total_commission || 0} {isRtl ? 'ر.س' : 'SAR'}</span>
                </div>
              </div>
            </div>

            {/* Withdrawal request card */}
            <div className="bg-white dark:bg-[#11141D] border border-slate-150 dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-sm text-right space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5 justify-start">
                  <CreditCard className="w-5 h-5 text-rose-500" />
                  <span>{isRtl ? 'طلب سحب الأرباح والحساب البنكي 💳' : 'Withdraw Earnings & Bank Info 💳'}</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  {isRtl ? 'أدخل رقم الآيبان الخاص بك لطلب تحويل أرباحك الحالية مباشرة لحسابك البنكي.' : 'Submit your bank account IBAN to request immediate payout transfer from admin.'}
                </p>
              </div>

              {affiliateStats?.withdrawal_requested ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-bold text-center space-y-2">
                  <p className="flex items-center justify-center gap-1.5">
                    <span className="animate-ping w-2 h-2 bg-amber-500 rounded-full inline-block"></span>
                    <span>{isRtl ? `لديك طلب سحب معلق بقيمة [ ${affiliateStats.current_balance} ريال ]` : `You have a pending payout request of [ ${affiliateStats.current_balance} SAR ]`}</span>
                  </p>
                  <p className="text-[10px] opacity-80 font-mono">
                    {isRtl ? `الحساب البنكي (IBAN): ${affiliateIban}` : `IBAN: ${affiliateIban}`}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                    {isRtl ? 'جاري مراجعة الطلب وتحويل المبلغ إلى حسابك البنكي من قبل الإدارة.' : 'The administration is verifying details to wire funds directly.'}
                  </p>
                </div>
              ) : (affiliateStats?.current_balance || 0) === 0 ? (
                <div className="p-5 bg-slate-50 dark:bg-[#0A0C10] border border-slate-100 dark:border-slate-800 rounded-2xl text-xs text-slate-450 text-center font-bold">
                  {isRtl ? '💡 لا توجد أرباح قابلة للسحب حالياً. شارك كود الخصم الخاص بك مع عملائك لتكسب العمولات على كل عملية شراء!' : '💡 No withdrawable balance available yet. Share your code with customers to earn payouts!'}
                </div>
              ) : null}

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!affiliateIban.trim()) {
                  setToastMessage(isRtl ? '⚠️ يرجى إدخال رقم الآيبان البنكي أولاً!' : '⚠️ Please enter your bank IBAN first!');
                  setTimeout(() => setToastMessage(''), 3000);
                  return;
                }
                
                // Submit request logic
                try {
                  const savedAff = localStorage.getItem('ryvo_affiliates');
                  if (savedAff) {
                    const parsed = JSON.parse(savedAff);
                    const idx = parsed.findIndex((a: any) => a.email.toLowerCase() === currentUser.email.toLowerCase());
                    if (idx !== -1) {
                      parsed[idx] = {
                        ...parsed[idx],
                        iban: affiliateIban.trim(),
                        withdrawal_requested: true
                      };
                      localStorage.setItem('ryvo_affiliates', JSON.stringify(parsed));
                      setAffiliateStats(parsed[idx]);
                      setToastMessage(isRtl ? '🎉 تم تقديم طلب سحب الأرباح بنجاح! بانتظار التحويل.' : '🎉 Payout request submitted successfully! Awaiting transfer.');
                      setTimeout(() => setToastMessage(''), 5000);
                    }
                  }
                } catch (_) {}
              }} className="space-y-4 max-w-lg mx-auto">
                <div className="space-y-1.5 text-right">
                  <label className="text-[10px] uppercase font-black text-slate-400 block">{isRtl ? 'رقم الآيبان البنكي (IBAN)' : 'Bank Account IBAN'}</label>
                  <input
                    type="text"
                    required
                    value={affiliateIban}
                    onChange={(e) => setAffiliateIban(e.target.value)}
                    placeholder="SA00 0000 0000 0000 0000 0000"
                    disabled={affiliateStats?.withdrawal_requested}
                    className="w-full text-center text-xs font-mono py-3 px-4 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-rose-500 focus:bg-white text-slate-850 dark:text-white outline-none transition-all text-left font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={affiliateStats?.withdrawal_requested || (affiliateStats?.current_balance || 0) === 0}
                  className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md disabled:cursor-not-allowed shadow-rose-500/10 active:scale-95"
                >
                  💵 {isRtl ? 'حفظ الحساب وتقديم طلب سحب الأرباح' : 'Save & Submit Payout Request'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Affiliate settings tab */
          <div className="bg-white dark:bg-[#11141D] rounded-3xl p-6 sm:p-8 border border-slate-150 dark:border-[#1E293B] max-w-xl mx-auto shadow-sm text-right space-y-6">
            <form onSubmit={handleAffiliateSave} className="space-y-4">
              <h3 className="text-base font-black border-b border-slate-100 dark:border-[#1E293B] pb-3 text-slate-800 dark:text-white flex items-center gap-1.5 justify-end">
                <Settings className="w-5 h-5 text-rose-500" />
                <span>{isRtl ? 'تعديل بيانات الحساب الشخصي' : 'Update Personal Affiliate Account'}</span>
              </h3>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 block">{isRtl ? 'اسم الشريك بالكامل' : 'Full Partner Name'}</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full text-xs px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-rose-500 text-slate-850 dark:text-white outline-none transition-all text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 block">{isRtl ? 'البريد الإلكتروني (غير قابل للتعديل)' : 'Email Address (read-only)'}</label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full text-xs py-3 px-3.5 rounded-xl bg-slate-100 dark:bg-[#0A0C10] text-slate-400 border border-transparent cursor-not-allowed text-left font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 block">{isRtl ? 'رقم الهاتف / الجوال' : 'Phone / Contact Number'}</label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full text-xs py-3 px-3.5 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-rose-500 text-slate-850 dark:text-white outline-none transition-all text-left font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400 block">{isRtl ? 'كلمة المرور للحساب' : 'Account Password'}</label>
                <input
                  type="text"
                  required
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  className="w-full text-xs py-3 px-3.5 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-rose-500 text-slate-850 dark:text-white outline-none transition-all text-left font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-rose-500/10 active:scale-[0.99]"
              >
                💾 {isRtl ? 'حفظ البيانات الشخصية الفاخرة' : 'Save Personal Partner Details'}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-3 py-6 text-slate-800 dark:text-gray-100">
      
      {/* Welcome Board */}
      <div className="bg-[#11141D] border border-slate-200 dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden mb-3 shadow-sm">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-[var(--primary-color, #38bdf8)]/10 to-transparent rounded-full blur-3xl -mr-12 -mt-12"></div>
        
        <div className={`relative ${isRtl ? 'text-right' : 'text-left'} space-y-2`}>
          <h2 className="text-2xl sm:text-3xl font-black font-sans bg-gradient-to-r from-white to-[var(--primary-color, #38bdf8)] bg-clip-text text-transparent">
            {t.dashboard_welcome}
          </h2>
          <p className="text-xs text-slate-400">
            {currentUser.name} ({currentUser.email}) • {currentUser.role === 'admin' ? t.admin_panel : t.customer_panel}
          </p>
        </div>
      </div>

      {/* Tab Switch Headers */}
      <div className="flex bg-slate-100 dark:bg-[#0A0C10] border dark:border-[#1E293B] rounded-2xl p-1 gap-1 mb-3 max-w-2xl mx-auto flex-wrap sm:flex-nowrap">
        <button
          id="btn-dash-tab-orders"
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-white dark:bg-[#11141D] text-[var(--primary-color)] shadow-sm'
              : 'text-slate-500 hover:text-[var(--primary-color)]'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{t.dashboard_orders_tab}</span>
        </button>

        <button
          id="btn-dash-tab-favorites"
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'favorites'
              ? 'bg-white dark:bg-[#11141D] text-[var(--primary-color)] shadow-sm'
              : 'text-slate-500 hover:text-[var(--primary-color)]'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>{t.favorites}</span>
          {favorites.length > 0 && (
            <span className="bg-[var(--primary-color, #38bdf8)]/10 text-[var(--primary-color, #38bdf8)] text-[10px] px-2 py-0.5 rounded-full font-black">
              {favorites.length}
            </span>
          )}
        </button>

        <button
          id="btn-dash-tab-inbox"
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'inbox'
              ? 'bg-white dark:bg-[#11141D] text-[var(--primary-color)] shadow-sm'
              : 'text-slate-500 hover:text-[var(--primary-color)]'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>{isRtl ? 'البريد الوارد 📩' : 'Virtual Inbox 📩'}</span>
          {inboxEmails.length > 0 && (
            <span className="bg-amber-500/20 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-black">
              {inboxEmails.length}
            </span>
          )}
        </button>

        <button
          id="btn-dash-tab-wallet"
          onClick={() => setActiveTab('wallet')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'wallet'
              ? 'bg-white dark:bg-[#11141D] text-amber-505 shadow-sm'
              : 'text-slate-500 hover:text-amber-505'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-500" />
          <span>{isRtl ? 'محفظة النقاط 🪙' : 'Points Wallet 🪙'}</span>
          {(currentUser.points || 0) > 0 && (
            <span className="bg-amber-500/20 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-black">
              {currentUser.points}
            </span>
          )}
        </button>

        <button
          id="btn-dash-tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-white dark:bg-[#11141D] text-[var(--primary-color)] shadow-sm'
              : 'text-slate-500 hover:text-[var(--primary-color)]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{t.dashboard_settings_tab}</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="animate-in fade-in duration-300">
        
        {/* TAB 1: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {userOrders.length === 0 ? (
              <div className="bg-white dark:bg-[#111827] rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-200/80 space-y-4 max-w-xl mx-auto">
                <ShoppingBag className="w-12 h-12 text-slate-800 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-450 leading-relaxed">{t.no_orders}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {userOrders.map((ord) => (
                  <div
                    key={ord.id}
                    id={`order-log-${ord.id}`}
                    className="bg-white dark:bg-[#131b2e] rounded-3xl p-4 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 animate-in fade-in-50 duration-200"
                  >
                    {/* Log Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="space-y-0.5 text-left">
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">{t.dashboard_order_id}</span>
                        <strong className="text-xs sm:text-sm font-sans font-black text-rose-505 select-all">#{ord.id}</strong>
                      </div>

                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 font-sans">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{ord.date}</span>
                        </div>

                        {/* Status Label badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase text-center ${
                          ord.status === 'delivered' 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : ord.status === 'shipped' 
                            ? 'bg-amber-500/10 text-amber-500 animate-pulse' 
                            : ord.status === 'cancelled' 
                            ? 'bg-rose-500/10 text-rose-500' 
                            : 'bg-indigo-500/10 text-indigo-500'
                        }`}>
                          {t[`dashboard_status_${ord.status}`] || ord.status}
                        </span>
                      </div>
                    </div>

                    {/* Ordered Items rows */}
                    <div className="space-y-3">
                      {ord.items.map((item, index) => {
                        const prodDetails = allProducts.find(p => p.id === item.product_id);
                        return (
                          <div key={index} className="border-b border-slate-50 dark:border-slate-900/45 pb-3 last:pb-0 last:border-0">
                            <div className="flex flex-row items-center justify-between gap-3 text-xs min-w-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <img src={item.image} className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-0.5 flex-shrink-0" referrerPolicy="no-referrer" />
                                <div className="text-left min-w-0">
                                  <span className="font-bold text-slate-805 dark:text-gray-200 block truncate max-w-[150px] sm:max-w-xs">{item.name}</span>
                                  <span className="text-[10px] text-slate-400 font-black">
                                    {prodDetails?.is_digital ? (
                                      <span className="text-amber-500 font-bold">{isRtl ? '⚡ منتج رقمي تسليم فوري' : '⚡ Instant Digital Delivery'}</span>
                                    ) : (
                                      `x${item.quantity}`
                                    )}
                                  </span>
                                </div>
                              </div>
                              <span className="font-extrabold text-slate-800 dark:text-slate-300 flex-shrink-0 font-mono">{item.price * item.quantity} {t.currency}</span>
                            </div>

                            {/* Digital content auto-delivery details block */}
                            {prodDetails?.is_digital && ord.status !== 'cancelled' && (
                              <div className="mt-2.5 p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-dashed border-amber-500/35 rounded-2xl space-y-2 text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                                  <span>⚡ {isRtl ? 'بيانات التفعيل والتحميل الرقمي الخاص بك:' : 'Your Activation Details & File Download:'}</span>
                                </div>

                                {prodDetails.digital_delivery_text && (
                                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80 font-mono text-[11px] text-slate-705 dark:text-slate-300 break-all select-all whitespace-pre-line">
                                    {prodDetails.digital_delivery_text}
                                  </div>
                                )}

                                {prodDetails.digital_file_url && (
                                  <div className="flex justify-start">
                                    <a
                                      href={prodDetails.digital_file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm cursor-pointer"
                                    >
                                      <span>⬇️</span>
                                      <span>{isRtl ? 'تحميل الملف الرقمي الفوري' : 'Download Digital File'}</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Log Footer Total */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between font-black text-sm">
                      <span className="text-slate-400">{t.total}</span>
                      <span className="text-[var(--primary-color, #38bdf8)] text-base font-mono">{ord.total} {t.currency}</span>
                    </div>

                    {/* Invoice interactive controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-1.5 print:hidden">
                      {(ord.status === 'pending' || ord.status === 'processing') && onCancelOrder && (
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: isRtl ? 'إلغاء الطلب الفاخر ✕' : 'Cancel Luxury Order ✕',
                              description: isRtl 
                                ? 'هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ سيتم إرجاع كميات المنتجات تلقائياً إلى المخزن.'
                                : 'Are you sure you want to cancel this order? Item stock levels will automatically be restored.',
                              confirmText: isRtl ? 'نعم، إلغاء الطلب' : 'Yes, Cancel Order',
                              cancelText: isRtl ? 'تراجع' : 'Keep Order',
                              type: 'danger'
                            });
                            if (confirmed) {
                              onCancelOrder(ord.id);
                            }
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-black cursor-pointer flex items-center justify-center gap-1.5 transition-all text-center"
                        >
                          <span>✕</span>
                          <span>{isRtl ? 'إلغاء الطلب' : 'Cancel Order'}</span>
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceOrder(ord)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-black text-slate-800 dark:text-gray-100 cursor-pointer flex items-center justify-center gap-1.5 transition-all text-center"
                      >
                        <span>📄</span>
                        <span>{isRtl ? 'تحميل وعرض الفاتورة' : 'View & Download Invoice'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoiceOrder(ord);
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-black cursor-pointer flex items-center justify-center gap-1.5 transition-all text-center"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'إرسال للجوال (جيميل/آيفون)' : 'Send to Phone / Gmail'}</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FAVORITE ITEMS */}
        {activeTab === 'favorites' && (
          <div>
            {favoriteProducts.length === 0 ? (
              <div className="bg-white dark:bg-[#11141D] rounded-3xl p-12 text-center border border-slate-150 dark:border-[#1E293B] space-y-4 max-w-xl mx-auto">
                <Heart className="w-12 h-12 text-slate-800 dark:text-slate-750 mx-auto" />
                <p className="text-xs font-bold text-slate-450 leading-relaxed">{t.empty_cart}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                {favoriteProducts.map((prod) => {
                  const pName = currentLanguage === 'ar' ? prod.name_ar : currentLanguage === 'fr' ? prod.name_fr : prod.name_en;
                  return (
                    <div
                      key={prod.id}
                      className="bg-white dark:bg-[#11141D] rounded-2xl p-4 border border-slate-150 dark:border-[#1E293B] flex items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={prod.image} className="w-12 h-12 object-cover rounded-xl bg-slate-900 p-1 flex-shrink-0" referrerPolicy="no-referrer" />
                        <div className="text-left truncate">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-gray-100 truncate">{pName}</h4>
                          <span className="text-[10px] font-black text-[var(--primary-color, #38bdf8)]">{prod.price} {t.currency}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          id={`dash-fav-view-${prod.id}`}
                          onClick={() => onProductClick(prod)}
                          className="p-1.5 bg-slate-150 dark:bg-slate-900 rounded-lg hover:bg-[var(--primary-color)] hover:text-slate-950 text-[var(--primary-color)] transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`dash-fav-remove-${prod.id}`}
                          onClick={() => onFavoriteToggle(prod.id)}
                          className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Heart className="w-3.5 h-3.5" fill="currentColor" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}        {/* TAB 3: SETTINGS PROFILE FORM */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-[#11141D] rounded-3xl p-6 sm:p-8 border border-slate-150 dark:border-[#1E293B] max-w-xl mx-auto shadow-sm">
            
            <form onSubmit={handleProfileSave} className="space-y-4">
              <h3 className="text-base font-black border-b border-slate-100 dark:border-[#1E293B] pb-3">{t.personal_info}</h3>

              {/* Save change success message */}
              {saveSuccess && (
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-bold border border-emerald-500/20 text-center flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>{currentLanguage === 'ar' ? 'تم تحديث الملف الشخصي بنجاح!' : 'Profile updated successfully!'}</span>
                </div>
              )}

              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{t.fullname_label}</label>
                <input
                  id="settings-fullname-field"
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className={`w-full text-base md:text-xs px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all ${
                    isRtl ? 'text-right' : 'text-left'
                  }`}
                />
              </div>

              <div className="space-y-1 text-left font-sans">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{t.email_label}</label>
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isRtl ? 'left-3' : 'right-3'} flex items-center pointer-events-none text-slate-500`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full text-xs py-3 px-3.5 pr-10 rounded-xl bg-slate-100 dark:bg-[#0A0C10] text-slate-400 dark:text-slate-550 border border-transparent cursor-not-allowed text-left font-sans"
                  />
                </div>
              </div>

              {/* Phone number field */}
              <div className="space-y-1 text-left font-sans">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'رقم الهاتف / الجوال 📞' : 'Phone / Contact Line 📞'}</label>
                <div className="relative">
                  <div className={`absolute inset-y-0 ${isRtl ? 'left-3' : 'right-3'} flex items-center pointer-events-none text-slate-500`}>
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={profilePhone}
                    placeholder="05xxxxxxx"
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className={`w-full text-xs py-3 px-10 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all ${
                      isRtl ? 'text-right' : 'text-left'
                    }`}
                  />
                </div>
              </div>

              {/* Structured Address Sections */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--primary-color,#38bdf8)] flex items-center gap-1 font-sans">
                  <MapPin className="w-4 h-4" />
                  <span>{isRtl ? 'تفاصيل عنوان الشحن والتوصيل 📍' : 'Shipping Address Details 📍'}</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 text-left font-sans">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'المدينة' : 'City'}</label>
                    <input
                      type="text"
                      required
                      value={profileCity}
                      placeholder={isRtl ? 'الرياض، جدة...' : 'Riyadh, Jeddah...'}
                      onChange={(e) => setProfileCity(e.target.value)}
                      className={`w-full text-xs py-3 px-3.5 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all ${
                        isRtl ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>

                  <div className="space-y-1 text-left font-sans">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'اسم الحي' : 'District / Neighborhood'}</label>
                    <input
                      type="text"
                      required
                      value={profileDistrict}
                      placeholder={isRtl ? 'الياسمين، الملقا...' : 'Al-Yasmin, Al-Malqa...'}
                      onChange={(e) => setProfileDistrict(e.target.value)}
                      className={`w-full text-xs py-3 px-3.5 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all ${
                        isRtl ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 text-left font-sans">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'اسم الشارع' : 'Street (e.g. King Fahd Road)'}</label>
                    <input
                      type="text"
                      required
                      value={profileStreet}
                      placeholder={isRtl ? 'شارع الملك فهد...' : 'Olaya Street...'}
                      onChange={(e) => setProfileStreet(e.target.value)}
                      className={`w-full text-xs py-3 px-3.5 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all ${
                        isRtl ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>

                  <div className="space-y-1 text-left font-sans">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'الرمز البريدي (اختياري)' : 'Postal Code (Optional)'}</label>
                    <input
                      type="text"
                      value={profilePostalCode}
                      placeholder="12345"
                      onChange={(e) => setProfilePostalCode(e.target.value)}
                      className={`w-full text-xs py-3 px-3.5 rounded-xl border bg-slate-200 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all ${
                        isRtl ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t.csrf_protective}</span>
              </div>

              <button
                id="btn-settings-save"
                type="submit"
                className="w-full py-3 bg-[var(--primary-color)] hover:opacity-90 text-slate-950 font-black text-xs uppercase cursor-pointer rounded-xl transition-all active:scale-95 shadow-md font-sans"
              >
                {t.save_changes}
              </button>
            </form>

          </div>
        )}

        {/* TAB 4: INBOX / EMAILS */}
        {activeTab === 'inbox' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-white dark:bg-[#11141D] rounded-3xl p-6 border border-slate-150 dark:border-[#1E293B] shadow-sm">
              <h3 className="text-base font-black border-b border-slate-100 dark:border-slate-200 pb-3 flex items-center gap-1.5 justify-between">
                <span>{isRtl ? 'صندوق الوارد الافتراضي 📬' : 'Your Virtual Inbox 📬'}</span>
                <span className="text-[10px] font-bold text-slate-400">({currentUser.email})</span>
              </h3>

              {inboxEmails.length === 0 ? (
                <div className="py-12 text-center text-slate-450 text-xs font-semibold space-y-3">
                  <span className="text-3xl block">✉️</span>
                  <p>{isRtl ? 'صندوق الوارد فارغ تماماً حالياً.' : 'Your virtual inbox is empty right now.'}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-4">
                  {inboxEmails.map((email: any) => (
                    <div key={email.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-amber-400 font-sans">{email.subject}</h4>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{email.date} • {email.time}</span>
                        </div>
                        <span className="text-[9px] bg-[var(--primary-color, #38bdf8)]/10 text-[var(--primary-color, #38bdf8)] px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                          {isRtl ? 'مستلم' : 'Received'}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-[#0A0C10] rounded-2xl border border-slate-100 dark:border-slate-800/80 text-[11.5px] leading-relaxed font-sans whitespace-pre-wrap text-slate-700 dark:text-slate-300 text-left">
                        {email.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: POINTS WALLET / FINANCIAL CASH DUAL WALLET */}
        {activeTab === 'wallet' && (
          <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-200">
            
            {/* 1. DUAL WALLET OVERVIEW (CASH AND POINTS SIDE-BY-SIDE) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* FINANCIAL CASH WALLET CARD */}
              <div id="financial-cash-wallet-card" className="bg-[#11141D] border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl flex flex-col justify-between min-h-[220px]">
                <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-[var(--primary-color, #38bdf8)]/10 to-transparent rounded-full blur-3xl -mr-16 -mt-16"></div>
                
                <div className="space-y-4 relative">
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--primary-color, #38bdf8)]/10 text-[var(--primary-color, #38bdf8)] rounded-full text-[10px] font-black uppercase tracking-wider">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'المحفظة المالية الرصيدية' : 'Financial Wallet'}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans tracking-widest uppercase">RYVO PAY</span>
                  </div>

                  <div className="space-y-1 text-left">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'الرصيد المتاح حالياً' : 'AVAILABLE CASH BALANCE'}</span>
                    <div className="flex items-baseline gap-2">
                      <strong className="text-4xl font-black text-white font-mono tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                        {(currentUser.wallet_balance || 0).toFixed(2)}
                      </strong>
                      <span className="text-sm text-[var(--primary-color, #38bdf8)] font-black">
                        {isRtl ? 'ر.س' : 'SAR'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-8 relative border-t border-slate-800/60 mt-4">
                  <div className="text-left font-sans">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">{isRtl ? 'اسم صاحب الحساب' : 'ACCOUNT HOLDER'}</span>
                    <span className="text-xs text-slate-300 font-bold">{currentUser.name}</span>
                  </div>
                  <div className="w-10 h-7 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-center justify-center font-mono text-[10px] text-amber-500 font-extrabold tracking-tighter shadow-inner opacity-75">
                    CHIP
                  </div>
                </div>
              </div>

              {/* LOYALTY POINTS WALLET CARD */}
              <div id="loyalty-points-wallet-card" className="bg-[#11141D] border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl flex flex-col justify-between min-h-[220px]">
                <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl -mr-16 -mt-16"></div>
                
                <div className="space-y-4 relative">
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-wider">
                      <Award className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'محفظة نقاط الولاء المكافئة' : 'Loyalty Points Wallet'}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans tracking-widest uppercase">RYVO CLUB</span>
                  </div>

                  <div className="space-y-1 text-left">
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'نقاط المكافآت المتاحة' : 'LOYALTY POINTS'}</span>
                    <div className="flex items-baseline gap-2">
                      <strong className="text-4xl font-extrabold text-amber-500 font-mono tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                        {currentUser.points || 0}
                      </strong>
                      <span className="text-sm text-yellow-500 font-bold">
                        {isRtl ? 'نقطة' : 'PTS'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-8 relative border-t border-slate-800/60 mt-4">
                  <div className="text-left font-sans">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">{isRtl ? 'الباقة العضوية للمشترك' : 'CLUB TIER STATUS'}</span>
                    <span className="text-xs text-amber-450 font-black">
                      {(currentUser.points || 0) >= 200 ? (isRtl ? '🥇 العضوية البلاتينية الفاخرة' : '🥇 Exclusive Platinum') : (isRtl ? '🥈 العضوية الذهبية المتميزة' : '🥈 Premium Gold Club')}
                    </span>
                  </div>
                  <Coins className="w-8 h-8 text-amber-500 animate-pulse" />
                </div>
              </div>

            </div>

            {/* 2. ACTIONS PANEL (RECHARGE AND POINTS SWAPPER) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* ACTIONS: FINANCIAL CASH CHARGING PORTAL */}
              <div className="bg-white dark:bg-[#11141D] border border-slate-150 dark:border-slate-800 rounded-3xl p-6 text-left space-y-4 font-sans">
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--primary-color,#38bdf8)] flex items-center gap-1.5 font-sans border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <CreditCard className="w-4 h-4 text-[var(--primary-color)]" />
                  <span>{isRtl ? 'شحن رصيد المحفظة المالي (فيزا/مدى) 💳' : 'Charge Financial Wallet Balance 💳'}</span>
                </h4>

                <form onSubmit={handleChargeWalletSubmit} className="space-y-3 font-sans">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-450 block">{isRtl ? 'المبلغ المراد شحنه (ر.س):' : 'Amount to Charge (SAR):'}</label>
                    <input
                      type="number"
                      required
                      min="10"
                      max="10000"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                      placeholder={isRtl ? 'مثال: 100' : 'e.g., 100'}
                      className="w-full text-xs p-3 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all"
                    />
                    <span className="text-[9px] text-slate-400 block">{isRtl ? 'الحد الأدنى للشحن هو 10 ريال سعودي' : 'Minimum recharge amount is 10 SAR'}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-450 block">{isRtl ? 'رقم بطاقة الدفع (16 رقم):' : 'Card Number (16 digits):'}</label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => {
                        const formatted = e.target.value.replace(/\W/gi, '').replace(/(.{4})/g, '$1 ').trim();
                        setCardNumber(formatted);
                      }}
                      placeholder="4000 1234 5678 9010"
                      className="w-full text-xs p-3 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-450 block">{isRtl ? 'تاريخ الانتهاء:' : 'Expiry Date:'}</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.length === 2 && !val.includes('/')) {
                            val += '/';
                          }
                          setCardExpiry(val);
                        }}
                        placeholder="MM/YY"
                        className="w-full text-xs p-3 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all text-center font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">CVV:</label>
                      <input
                        type="password"
                        required
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        placeholder="123"
                        className="w-full text-xs p-3 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all text-center font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-450 block">{isRtl ? 'اسم حامل البطاقة:' : 'Cardholder Name:'}</label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder={isRtl ? 'الاسم الثلاثي المكتوب علئ البطاقة' : 'As written on card'}
                      className="w-full text-xs p-3 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={walletProcessing}
                    className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer mt-4 ${
                      walletProcessing 
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-[var(--primary-color,#38bdf8)] text-slate-950 hover:bg-[var(--primary-color,#38bdf8)]/90 shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {walletProcessing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                        <span>{isRtl ? 'جاري معالجة المعاملة الآمنة...' : 'Securing transaction...'}</span>
                      </>
                    ) : (
                      <>
                        <span>💳</span>
                        <span>{isRtl ? `شحن المحفظة بمبلغ ${chargeAmount || '0'} ر.س الآن` : `Charge ${chargeAmount || '0'} SAR Now`}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* ACTIONS: LOYALTY POINTS DIRECT EXCHANGE AND COUPOUN SWAPPER */}
              <div className="bg-white dark:bg-[#11141D] border border-slate-150 dark:border-slate-800 rounded-3xl p-6 text-left space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5 font-sans border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                  <span>{isRtl ? 'تحويل واستبدال نقاط الولاء لكاش بالمحفظة 💸' : 'Convert Loyalty Points to Wallet Cash 💸'}</span>
                </h4>

                <div className="space-y-4 font-sans">
                  
                  {/* Option A: Convert Points Directly to Wallet Cash */}
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4.5 space-y-3.5">
                    <div>
                      <h5 className="text-xs font-black text-slate-850 dark:text-amber-400">{isRtl ? 'أ. تحويل فوري ومباشر إلى رصيد بالمحفظة 🎉' : 'A. Direct Points-to-Cash Swap 🎉'}</h5>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5 font-medium">
                        {isRtl 
                          ? 'يمكنك الآن استبدال أي كمية من نقاطك وتحويلها فوراً إلى فلوس حقيقية تنزل في محفظتك المادية! (كل 10 نقاط = 1 ريال سعودي).'
                          : 'Exchange your accumulated loyalty points directly for spending cash credited instantly (10 points = 1 SAR cash).'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{isRtl ? 'کمية النقاط المراد استبدالها:' : 'Points to Convert:'}</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="10"
                          step="10"
                          value={convertPointsInput}
                          onChange={(e) => setConvertPointsInput(e.target.value)}
                          placeholder={isRtl ? 'مثال: 100 نقطة' : 'e.g. 100'}
                          className="flex-1 text-xs p-3 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-amber-500 focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setConvertPointsInput(String(Math.floor((currentUser.points || 0) / 10) * 10))}
                          className="px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer border border-amber-500/10"
                        >
                          {isRtl ? 'الكل' : 'MAX'}
                        </button>
                      </div>
                      
                      {/* Live calculation banner if input entered */}
                      {parseFloat(convertPointsInput) >= 10 && (
                        <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-[10.5px] text-emerald-500 font-bold flex justify-between items-center text-left">
                          <span>{isRtl ? 'الرصيد المكتسب المضاف لمحفظتك:' : 'Real Cash added directly to Wallet:'}</span>
                          <span className="font-mono text-xs text-slate-800 dark:text-emerald-400 font-black">+{Math.floor(parseFloat(convertPointsInput) / 10)} ر.س</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleConvertPointsToWallet(parseInt(convertPointsInput) || 0)}
                        disabled={!convertPointsInput || parseInt(convertPointsInput) < 10 || (currentUser.points || 0) < (parseInt(convertPointsInput) || 0)}
                        className={`w-full py-2.5 rounded-xl font-black text-xs tracking-wide transition-all uppercase cursor-pointer flex items-center justify-center gap-1.5 ${
                          convertPointsInput && parseInt(convertPointsInput) >= 10 && (currentUser.points || 0) >= (parseInt(convertPointsInput) || 0)
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'تحويل النقاط لفلوس بالمحفظة الآن 💸' : 'Convert Points to Cash Now 💸'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Option B: Standard Points to Coupon Code */}
                  <div className="bg-slate-50 dark:bg-[#0A0C10] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4.5 space-y-3">
                    <div>
                      <h5 className="text-xs font-black text-slate-800 dark:text-white">{isRtl ? 'ب. استبدال 150 نقطة بكوبون خصم متجر 🎟️' : 'B. standard Points-To-Coupon Exchange 🎟️'}</h5>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                        {isRtl 
                          ? 'استبدل 150 نقطة ولاء للحصول على كوبون خصم تقليدي فوري بقيمة 15 ريال سعودي عند إتمام الدفع.'
                          : 'Exchange exactly 150 points for flat 15 SAR coupon code you write at the checkout input.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={(currentUser.points || 0) < 150}
                      onClick={handleRedeemPointsCoupon}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 uppercase tracking-wide cursor-pointer ${
                        (currentUser.points || 0) >= 150
                          ? 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-505 cursor-not-allowed'
                      }`}
                    >
                      <span>🎟️</span>
                      <span>{isRtl ? 'إبدأ الاستبدال لكوبون (15 ر.س)' : 'Redeem 150 pts coupon code'}</span>
                    </button>
                  </div>

                </div>
              </div>

            </div>

            {/* 3. BOTH HISTORIES AND MANUALS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Point Earning Methods Guide */}
              <div className="bg-white dark:bg-[#11141D] rounded-3xl p-6 border border-slate-150 dark:border-[#1E293B] shadow-sm text-left space-y-4 font-sans">
                <h4 className="text-sm font-black border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-705 dark:text-white font-sans">
                  <span>🪙 {isRtl ? 'كيف يمكنك كسب المزيد من النقاط؟' : 'How to earn more points?'}</span>
                </h4>
                
                <ul className="space-y-4 text-xs text-slate-500 dark:text-slate-400 font-sans">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-black flex-shrink-0 text-[10px]">3</span>
                    <div>
                      <strong className="text-slate-700 dark:text-slate-200 block">{isRtl ? 'تسجيل الدخول اليومي' : 'Daily Login Reward'}</strong>
                      <span className="text-[10px] text-slate-400 block">{isRtl ? 'احصل على 3 نقاط في كل مرة تسجل فيها الدخول اليومي!' : 'Get 3 loyalty points on your daily store login.'}</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-black flex-shrink-0 text-[10px]">10</span>
                    <div>
                      <strong className="text-slate-700 dark:text-slate-200 block">{isRtl ? 'لكل عملية شراء (أول 6 طلبات)' : 'Every Purchase Order (First 6 Orders)'}</strong>
                      <span className="text-[10px] text-slate-400 block">{isRtl ? 'تكسب 10 نقاط كاملة على كل طلب شراء لأول 6 طلبات.' : 'Get 10 points for each of your first 6 orders.'}</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-black flex-shrink-0 text-[10px]">10</span>
                    <div>
                      <strong className="text-slate-700 dark:text-slate-200 block">{isRtl ? 'الطلبات الكبيرة (أكثر من 300 دولار)' : 'High Value Orders (> $300)'}</strong>
                      <span className="text-[10px] text-slate-400 block">{isRtl ? 'تكسب 10 نقاط إضافية عن أي طلب تتجاوز قيمته 300 دولار.' : 'Earn 10 points for premium class transactions.'}</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-black flex-shrink-0 text-[10px]">10</span>
                    <div>
                      <strong className="text-slate-700 dark:text-slate-200 block">{isRtl ? 'كتابة تعليق على المنتج' : 'Leave a Review/Rating'}</strong>
                      <span className="text-[10px] text-slate-400 block">{isRtl ? 'احصل على 10 نقاط عند إبداء رأيك وتقييم المنتج.' : 'Get 10 points for helping other riders.'}</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-black flex-shrink-0 text-[10px]">15</span>
                    <div>
                      <strong className="text-slate-700 dark:text-slate-200 block">{isRtl ? 'أرفق صور المنتج مع التعليق 🎉' : 'Attach Photo with your Review 🎉'}</strong>
                      <span className="text-[10px] text-slate-400 block">{isRtl ? 'احصل على 15 نقطة بدلاً من 10 عند إرفاق صورة مع تعليقك!' : 'Earn 15 points total when you upload visual proofs.'}</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* CASH WALLET TRANSACTION HISTORY */}
              <div className="bg-white dark:bg-[#11141D] rounded-3xl p-6 border border-slate-150 dark:border-[#1E293B] shadow-sm text-left flex flex-col space-y-4">
                <h4 className="text-sm font-black border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-705 dark:text-white">
                  <History className="w-4 h-4 text-[var(--primary-color)]" />
                  <span>{isRtl ? 'سجل عمليات المحفظة المالية' : 'Financial Ledger / Cash History'}</span>
                </h4>

                <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2.5 pr-1 font-sans">
                  {!currentUser.wallet_history || currentUser.wallet_history.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                      <p>🚫 {isRtl ? 'لا توجد حركات مالية مسجلة بمحفظتك.' : 'No cash transactions recorded yet.'}</p>
                    </div>
                  ) : (
                    currentUser.wallet_history.map((hist: any, idx: number) => (
                      <div key={hist.id || idx} className="p-3 bg-slate-50 dark:bg-[#0A0C10] rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] gap-2 font-sans">
                        <div className="text-left leading-normal font-sans">
                          <strong className="block text-slate-705 dark:text-slate-100 font-extrabold">{isRtl ? hist.description_ar : hist.description_en}</strong>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{hist.date}</span>
                        </div>
                        <span className={`font-black font-mono flex-shrink-0 text-xs ${hist.type === 'payment' ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {hist.type === 'payment' ? `-${hist.amount} ر.س` : `+${hist.amount} ر.س`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* LOYALTY POINTS TRANSACTION LEDGER */}
              <div className="bg-white dark:bg-[#11141D] rounded-3xl p-6 border border-slate-150 dark:border-[#1E293B] shadow-sm text-left flex flex-col space-y-4">
                <h4 className="text-sm font-black border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-705 dark:text-white">
                  <History className="w-4 h-4 text-amber-500" />
                  <span>{isRtl ? 'سجل حركات ونشاط النقاط الولائية' : 'Points Ledger & Activity Log'}</span>
                </h4>

                <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2.5 pr-1 font-sans">
                  {!currentUser.points_history || currentUser.points_history.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                      <p>🚫 {isRtl ? 'لا توجد حركات سابقة على نقاطك.' : 'No previous loyalty point events recorded.'}</p>
                    </div>
                  ) : (
                    currentUser.points_history.map((hist: any, idx: number) => (
                      <div key={hist.id || idx} className="p-3 bg-slate-50 dark:bg-[#0A0C10] rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs gap-3">
                        <div className="text-left font-sans">
                          <strong className="block text-slate-705 dark:text-white leading-snug">{isRtl ? hist.reason_ar : hist.reason_en}</strong>
                          <span className="text-[9px] text-slate-405 block mt-0.5">{hist.date}</span>
                        </div>
                        <span className={`font-black text-xs font-mono flex-shrink-0 ${hist.points >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {hist.points >= 0 ? `+${hist.points}` : hist.points}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Redeemed Points Coupons Sub-ledger */}
            {redeemedCoupons.length > 0 && (
              <div className="bg-white dark:bg-[#11141D] rounded-3xl p-6 border border-slate-150 dark:border-[#1E293B] shadow-sm text-left space-y-4">
                <h4 className="text-sm font-black border-b border-slate-100 dark:border-slate-850 pb-3 flex items-center gap-2 text-amber-550 dark:text-white">
                  <span>🎟️ {isRtl ? 'كوبونات الخصم المستبدلة والنشطة' : 'Your Redeemed Points Coupons'}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                  {redeemedCoupons.map((c, i) => (
                    <div key={i} className={`p-3.5 rounded-2xl border flex justify-between items-center gap-2 ${c.used ? 'bg-slate-50 dark:bg-[#0A0C10] border-slate-100 dark:border-slate-800 opacity-60' : 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/15'}`}>
                      <div className="text-left">
                        <span className="font-mono font-black text-xs block text-slate-800 dark:text-white select-all">{c.code}</span>
                        <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'قيمة الخصم: 15 ر.س' : 'Value: 15 SAR ($4)'}</span>
                      </div>
                      <div className="text-right">
                        <span className={`px-2.5 py-1 text-[9px] uppercase font-black rounded-lg ${c.used ? 'bg-slate-200 dark:bg-slate-850 text-slate-500' : 'bg-emerald-500/20 text-emerald-600'}`}>
                          {c.used ? (isRtl ? 'مستخدم' : 'Used') : (isRtl ? 'نشط' : 'Active')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Brand-new Stateful printable invoice & email sender modal */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-xl p-6 shadow-2xl relative border border-slate-100 flex flex-col max-h-[90vh] scale-in-95 animate-in duration-200">
            
            {/* Header Action Row */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 print:hidden">
              <span className="text-xs font-black uppercase text-amber-600 tracking-wider flex items-center gap-1.5">
                <span>📄</span>
                <span>{isRtl ? 'فاتورة الشراء وحساب الفواتير لمتجر رايفو' : 'Ryvo Official Verified Purchase Receipt'}</span>
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadTextInvoice(selectedInvoiceOrder)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded-xl cursor-pointer flex items-center gap-1 transition-all"
                >
                  <span>📥</span>
                  <span>{isRtl ? 'تنزيل الفاتورة' : 'Download TXT'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black rounded-xl cursor-pointer flex items-center gap-1 transition-all"
                >
                  <span>🖨️</span>
                  <span>{isRtl ? 'طباعة / تحميل PDF' : 'Print / Download'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoiceOrder(null);
                    setEmailSentStatus(false);
                    setIsSendingEmail(false);
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 text-[11px] font-black rounded-xl cursor-pointer transition-all"
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>

            {/* Email dispatch section */}
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-500/20 rounded-2xl my-3 space-y-2 print:hidden">
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1 text-left">
                  <h4 className="text-xs font-black text-amber-800 flex items-center gap-1 justify-start">
                    <Mail className="w-4 h-4 text-amber-600" />
                    <span>{isRtl ? 'إرسال الفاتورة إلى بريدك الإلكتروني' : 'Deliver Invoice to your Mailbox'}</span>
                  </h4>
                  <p className="text-[10px] text-amber-700 font-bold">
                    {isRtl ? 'أدخل بريدك لارسال نسخة رسمية للجيميل أو تطبيق البريد بالآيفون والأندرويد' : 'Input email direction to generate instant copy for Apple/Gmail clients.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="email"
                  id="invoice-recipient-email-customer"
                  defaultValue={currentUser.email}
                  placeholder="name@gmail.com"
                  className="flex-1 px-3 py-2 text-base md:text-xs bg-white border border-amber-200 focus:border-amber-500 outline-none rounded-xl font-bold font-sans text-slate-850"
                />
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={() => {
                    setIsSendingEmail(true);
                    setTimeout(() => {
                      setIsSendingEmail(false);
                      setEmailSentStatus(true);
                      
                      // Construct beautiful text representation of the invoice!
                      const itemsString = selectedInvoiceOrder.items.map(it => `• ${it.name} [x${it.quantity}] -> ${it.price * it.quantity} USD`).join('\n');
                      const receiptBody = `----------------------------------------------\n        RYVO PREMIUM OFFICIAL INVOICE\n----------------------------------------------\nReceipt Date: ${selectedInvoiceOrder.date}\nOrder Reference: #${selectedInvoiceOrder.id}\nCustomer: ${currentUser.name}\nEmail: ${currentUser.email}\nStatus: Delivered\n\nPURCHASED PRODUCTS:\n${itemsString}\n\n----------------------------------------------\nTOTAL PAID Amount: ${selectedInvoiceOrder.total} USD\n----------------------------------------------\nThank you for choosing Ryvo Premium Outlets!\nWe appreciate your loyalty with us.\nTo review or track: https://ai.studio/build\n----------------------------------------------`;
                      
                      const emailInput = document.getElementById('invoice-recipient-email-customer') as HTMLInputElement;
                      const destination = emailInput?.value || currentUser.email;
                      const mailtoUrl = `mailto:${destination}?subject=${encodeURIComponent(`Ryvo Official Purchase Receipt #${selectedInvoiceOrder.id}`)}&body=${encodeURIComponent(receiptBody)}`;
                      window.location.href = mailtoUrl;

                      setToastMessage(isRtl ? '📧 تم توجيه الفاتورة بنجاح لتطبيق البريد التابع لجهازك!' : '📧 Successfully prepared in your device mail app client.');
                      setTimeout(() => setToastMessage(''), 4000);
                    }, 1200);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all flex-shrink-0"
                >
                  {isSendingEmail ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>📧 {isRtl ? 'أرسل الآن' : 'Send'}</span>
                  )}
                </button>
              </div>

              {emailSentStatus && (
                <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 pt-1 animate-in slide-in-from-top-2 justify-start">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-505" />
                  <span>{isRtl ? 'تم فتح تطبيق البريد (جيميل/آيفون) لإرسال الفاتورة بنجاح!' : 'Your default mail client has opened to submit the invoice successfully!'}</span>
                </div>
              )}
            </div>

            {/* Printable Body */}
            <div id="printable-receipt-card" className="flex-1 overflow-y-auto py-6 font-sans space-y-6 text-left" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
              
              {/* Brand Logo & Shop info - top right locks logo! */}
              <div className="flex justify-between items-start flex-row">
                <div className="text-left text-[10px] text-slate-500 font-bold space-y-1" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                  <div>{isRtl ? 'تاريخ الفاتورة:' : 'Receipt Date:'} {selectedInvoiceOrder.date}</div>
                  <div className="font-mono">{isRtl ? 'الرقم المرجعي للطلب:' : 'Order Code:'} #{selectedInvoiceOrder.id}</div>
                </div>
                <div className="space-y-1 text-right flex flex-col items-end">
                  {shopLogo.startsWith('data:image') || shopLogo.includes('http') || shopLogo.includes('/') ? (
                    <img src={shopLogo} alt="Logo" className="h-10 object-contain rounded-lg" referrerPolicy="no-referrer" />
                  ) : (
                    <h2 className="text-2xl font-black tracking-tight">{shopLogo}</h2>
                  )}
                  <p className="text-[10px] text-slate-400 font-bold">{isRtl ? 'علامة رايفو الفاخرة المعتمدة' : 'Official Verified Ryvo Outlet Service'}</p>
                </div>
              </div>

              {/* Billing details / Customer profiling */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 text-left">{isRtl ? 'بيانات المشتري وتتبع الشحن:' : 'Buyer & Order Tracking Details:'}</h4>
                <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-left">
                  <div>
                    <span className="text-slate-400 font-semibold block">{isRtl ? 'اسم المستلم:' : 'Buyer Name:'}</span>
                    <span className="text-slate-850">{currentUser.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">{isRtl ? 'عنوان الشحن والبريد:' : 'Shipping Address:'}</span>
                    <span className="text-slate-850 block truncate">{currentUser.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">{isRtl ? 'حالة الطلب الحالية:' : 'Logistics State:'}</span>
                    <span className="text-indigo-600 capitalize">{selectedInvoiceOrder.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">{isRtl ? 'طريقة الدفع:' : 'Payment Mode:'}</span>
                    <span className="text-emerald-600 font-semibold">{isRtl ? 'الدفع الآمن بالبطاقة' : 'Secure Card Payment'}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider text-left">{isRtl ? 'المنتجات والملحقات المشتراة:' : 'Itemized breakdown list:'}</h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 font-black text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-2.5 text-left">{isRtl ? 'المنتج' : 'Item'}</th>
                        <th className="px-4 py-2.5 text-center">{isRtl ? 'الكمية' : 'Qty'}</th>
                        <th className="px-4 py-2.5 text-right">{isRtl ? 'الإجمالي' : 'Subtotal'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoiceOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-800 text-left">{item.name}</td>
                          <td className="px-4 py-3 text-center text-slate-500 font-mono font-bold">x{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-black font-mono text-slate-800">{item.price * item.quantity} {t.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="space-y-1.5 pt-4 border-t border-slate-100 text-xs font-bold text-left" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                <div className="flex justify-between max-w-xs ms-auto">
                  <span className="text-slate-400">{isRtl ? 'إجمالي المنتجات قبل الضريبة:' : 'Subtotal before tax:'}</span>
                  <span className="text-slate-700 font-mono">{(parseFloat(selectedInvoiceOrder.total) * 0.85).toFixed(2)} {t.currency}</span>
                </div>
                <div className="flex justify-between max-w-xs ms-auto">
                  <span className="text-slate-400">{isRtl ? 'شحن فوري سريع ومجاني:' : 'Premium Secure Shipping:'}</span>
                  <span className="text-emerald-600 font-mono">0.00 {t.currency}</span>
                </div>
                <div className="flex justify-between max-w-xs ms-auto text-sm font-black border-t border-slate-100 pt-1.5">
                  <span className="text-slate-900">{isRtl ? 'القيمة الإجمالية المدفوعة:' : 'Combined Total Paid:'}</span>
                  <span className="text-emerald-600 font-mono">{selectedInvoiceOrder.total} {t.currency}</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Floating interactive toast notifications */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-black border border-indigo-500/35 text-white text-xs px-4 py-2.5 rounded-2xl shadow-xl font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
