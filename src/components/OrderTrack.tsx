import React, { useState } from 'react';
import { Language, Order, User } from '../types';
import { TRANSLATIONS } from '../constants/translations';
import { Search, Loader2, ShoppingBag, MapPin, Phone, DollarSign, Calendar, Clock, CheckCircle } from 'lucide-react';

interface OrderTrackProps {
  currentLanguage: Language;
  orders: Order[];
  currentUser?: User | null;
}

export default function OrderTrack({ currentLanguage, orders, currentUser }: OrderTrackProps) {
  const t = TRANSLATIONS[currentLanguage];
  const isRtl = currentLanguage === 'ar';

  const [searchId, setSearchId] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const myOrders = currentUser
    ? orders.filter(o => o.user_email.toLowerCase() === currentUser.email.toLowerCase())
    : [];

  const handleSelectAndTrackOrder = (orderId: string) => {
    setSearchId(orderId);
    setLoading(true);
    setHasSearched(false);
    setTimeout(() => {
      const match = orders.find(
        o => o.id.toLowerCase() === orderId.trim().toLowerCase()
      );
      setSearchedOrder(match || null);
      setHasSearched(true);
      setLoading(false);
    }, 1000);
  };

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;

    setLoading(true);
    setHasSearched(false);

    // Simulate database lookup search delay for visual luxury feel
    setTimeout(() => {
      const match = orders.find(
        o => o.id.toLowerCase() === searchId.trim().toLowerCase()
      );
      setSearchedOrder(match || null);
      setHasSearched(true);
      setLoading(false);
    }, 1000);
  };

  // Status mapping to step index
  const getStatusStepIndex = (status: Order['status']): number => {
    switch (status) {
      case 'pending': return 1;
      case 'processing': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      case 'cancelled': return 0; // Cancelled
      default: return 1;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      
      const locale = currentLanguage === 'ar' ? 'ar-EG' : currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
      
      const datePart = d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      const timePart = d.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `${datePart} - ${timePart}`;
    } catch (_) {
      return isoString;
    }
  };

  const getStatusInfo = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return {
          title: isRtl ? 'تم استقبال الطلب وبانتظار التأكيد' : 'Order Received & Pending',
          color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
          icon: '📥',
          desc: isRtl ? 'تم استقبال طلبك على خوادم رايفو الآمنة بانتظار التجهيز.' : 'Your order is safely registered on Ryvo servers and receipt sent.'
        };
      case 'processing':
        return {
          title: isRtl ? 'جاري تجهيز الطلب وفحص الجودة' : 'Processing & Quality Assurance',
          color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
          icon: '⚙️',
          desc: isRtl ? 'يخضع طلبك الفاخر لعمليات التعبئة والتحقق الفني الدقيق لضمان سلامته.' : 'Fulfillment experts are preparing, packing and inspecting item specifications.'
        };
      case 'shipped':
        return {
          title: isRtl ? 'تم شحن المنتجات وتسليمها للمندوب 🚚' : 'Dispatched / Shipped to carrier 🚚',
          color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
          icon: '🚚',
          desc: isRtl ? 'تم شحن الطرد وتسليمه لشركة التوصيل السريع للتسليم المباشر لعنوانك.' : 'Package dispatched under tracking guidelines to local delivery agent.'
        };
      case 'delivered':
        return {
          title: isRtl ? 'تم التوصيل والاستلام بنجاح 🎉' : 'Successfully Delivered & Completed 🎉',
          color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
          icon: '✅',
          desc: isRtl ? 'تم استلام المنتج الفاخر وإغلاق طلبكم بنجاح. تمنياتنا لكم بتجربة فريدة ومتميزة!' : 'Shipment confirmed at shipping address destination. Enjoy your purchase!'
        };
      case 'cancelled':
        return {
          title: isRtl ? 'تم إلغاء الطلب من قبل الإدارة ⛔' : 'Order Cancelled by Store ⛔',
          color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
          icon: '⛔',
          desc: isRtl ? 'تم إلغاء تفعيل هذا الطلب وإرجاع المدفوعات لمحفظتك المالية ومراقبة الحساب.' : 'Administrators canceled this transaction and issued refunds to wallet.'
        };
      default:
        return {
          title: status,
          color: 'text-slate-500 bg-slate-500/10 border-slate-550/20',
          icon: 'ℹ️',
          desc: ''
        };
    }
  };

  const currentStep = searchedOrder ? getStatusStepIndex(searchedOrder.status) : 1;

  const STATUS_STAGES = [
    { key: 'pending', title: t.dashboard_status_pending || 'قيد الانتظار', desc: 'تم استلام وتأكيد المعاملة وآمن' },
    { key: 'processing', title: t.dashboard_status_processing || 'جاري التجهيز', desc: 'المنتج يخضع لفحص الجودة والتغليف' },
    { key: 'shipped', title: t.dashboard_status_shipped || 'تم الشحن 🚚', desc: 'تم تسليم الشحنة لشركة التوصيل السريع' },
    { key: 'delivered', title: t.dashboard_status_delivered || 'تم التوصيل بنجاح ✅', desc: 'استلم المشتري الشحنة بأمان وتمت' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-3">
      
      {/* Search Header Form */}
      <div className="bg-[#1E293B] rounded-3xl p-6 sm:p-8 text-white mb-3 relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-tr from-amber-400/10 to-rose-450/15 rounded-full blur-3xl -mr-12 -mt-12"></div>
        <div className={`relative ${isRtl ? 'text-right' : 'text-left'} space-y-4`}>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-sans bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
              {t.track_tab || 'تتبع طلبك 🚚'}
            </h2>
            <p className="text-xs text-slate-850 font-semibold leading-relaxed">
              {isRtl ? 'تابع حالة شحن وتجهيز مشترياتك الفاخرة لحظة بلحظة وبكل تفصيل موثق' : 'Follow your parcel shipment details and preparing processes step-by-step securely'}
            </p>
          </div>

          <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <div className={`absolute inset-y-0 ${isRtl ? 'left-3' : 'right-3'} flex items-center pointer-events-none text-slate-400`}>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <input
                id="track-order-input-id"
                type="text"
                required
                placeholder={t.tracking_ph || 'أدخل رقم طلبك الفاخر للتتبع...'}
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className={`w-full py-3.5 px-4 rounded-xl text-base md:text-xs bg-white/10 text-white border-2 border-transparent focus:border-amber-400 outline-none placeholder-slate-450 transition-all ${
                  isRtl ? 'pr-4 pl-10 text-right' : 'pl-4 pr-10 text-left'
                }`}
              />
            </div>
            <button
              id="btn-track-submit"
              type="submit"
              disabled={loading}
              className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isRtl ? 'جاري البحث...' : 'Searching...'}</span>
                </>
              ) : (
                <span>{t.track_btn || 'ابحث الآن 🔍'}</span>
              )}
            </button>
          </form>

          {currentUser && myOrders.length > 0 && (
            <div className="pt-4 border-t border-slate-700/50 space-y-2">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wide block">
                {isRtl ? '📦 اختر سريعاً من معاملاتك وطلباتك السابقة للتتبع الفوري:' : '📦 Select and Track from your previous orders:'}
              </span>
              <div className="flex flex-wrap gap-2 pt-1 pb-1">
                {myOrders.map(ord => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => handleSelectAndTrackOrder(ord.id)}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-black font-sans transition-all cursor-pointer flex items-center gap-1.5 ${
                      searchId.toLowerCase() === ord.id.toLowerCase()
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md scale-95'
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                    }`}
                  >
                    <span>🧾 #{ord.id.substring(0, 8)}...</span>
                    <span className="text-[9px] opacity-75 font-mono">({ord.total} {isRtl ? 'ر.س' : 'SAR'})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lookup Workspace Results */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs text-slate-400 font-bold animate-pulse">{isRtl ? 'جاري مطابقة وتدقيق حماية التتبع الآمنة...' : 'Connecting tracking gateways...'}</p>
        </div>
      )}

      {!loading && hasSearched && searchedOrder && (
        <div className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-md space-y-3 animate-in fade-in duration-200 text-left">
          
          {/* Header Row */}
          <div className="border-b border-slate-100 dark:border-slate-200 pb-4 flex flex-wrap justify-between items-center gap-3">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold block">{t.dashboard_order_id}</span>
              <strong className="text-sm font-black text-slate-800 dark:text-gray-100 uppercase tracking-wider">{searchedOrder.id}</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block">{t.dashboard_order_date}</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-800">{searchedOrder.date}</span>
            </div>
          </div>

          {/* Core Status Timeline visual pipeline */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.track_status || 'الحالة الحالية للتسليم'}</h3>
            
            {searchedOrder.status === 'cancelled' ? (
              <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>{t.dashboard_status_cancelled || 'تم الإلغاء ❌'} - {isRtl ? 'عذراً، تم تمييز هذا الطلب كملغي وتمت إعادة المبالغ المدفوعة.' : 'Sorry, this order has been marked as cancelled.'}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-sans relative">
                {/* Visual Connector bar on large screens */}
                <div className="hidden md:block absolute top-[18px] left-[15%] right-[15%] h-[3px] bg-slate-100 dark:bg-slate-800 -z-10">
                  <div 
                    className="h-full bg-amber-400 transition-all duration-500" 
                    style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                  />
                </div>

                {STATUS_STAGES.map((stg, i) => {
                  const stepIndex = i + 1;
                  const isActive = stepIndex <= currentStep;
                  const isCurrent = stepIndex === currentStep;

                  return (
                    <div key={stg.key} className="flex flex-row md:flex-col items-center gap-3 text-left">
                      {/* Step Badge */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isActive 
                          ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/20 shadow-md' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600'
                      }`}>
                        {isActive ? <CheckCircle className="w-5 h-5 fill-current" /> : <span>{stepIndex}</span>}
                      </div>

                      {/* Labels */}
                      <div className={`space-y-0.5 ${isRtl ? 'text-right' : 'text-left'} flex-1`}>
                        <strong className={`block text-xs font-black ${
                          isCurrent ? 'text-amber-500' : isActive ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-650'
                        }`}>
                          {stg.title}
                        </strong>
                        <p className="text-[10px] text-slate-400 leading-normal font-semibold max-w-[150px]">
                          {stg.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detailed Status Changes History Timeline */}
          <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-200/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>{isRtl ? 'سجل تتبع الشحنة بالتوقيت الدقيق ⏱️' : 'Detailed Status History & Timestamps ⏱️'}</span>
            </h3>

            <div className="bg-slate-50 dark:bg-[#0A0C10] rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-slate-850 space-y-6">
              {(() => {
                const history = searchedOrder.status_history && searchedOrder.status_history.length > 0
                  ? searchedOrder.status_history
                  : [
                      {
                        status: searchedOrder.status,
                        timestamp: new Date(searchedOrder.date).toISOString()
                      }
                    ];

                return (
                  <div className={`relative border-slate-200 dark:border-slate-200/80 space-y-6 ${
                    isRtl ? 'border-r-2 pr-6 mr-3 text-right' : 'border-l-2 pl-6 ml-3 text-left'
                  }`}>
                    {history.map((hist, index) => {
                      const info = getStatusInfo(hist.status);
                      const isLast = index === history.length - 1;

                      return (
                        <div key={index} className="relative">
                          {/* Dot marker */}
                          <span className={`absolute top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#0A0C10] flex items-center justify-center shadow-sm ${
                            isRtl ? '-right-[32px]' : '-left-[32px]'
                          } ${
                            isLast ? 'bg-[var(--primary-color, #38bdf8)] ring-4 ring-[var(--primary-color, #38bdf8)]/20 ring-offset-0' : 'bg-slate-450 dark:bg-slate-700'
                          }`} />

                          {/* Content card */}
                          <div className={`p-4 rounded-xl border transition-all ${
                            isRtl ? 'text-right' : 'text-left'
                          } ${
                            isLast 
                              ? 'bg-white dark:bg-[#11141D] border-slate-200 dark:border-slate-850 shadow-sm' 
                              : 'bg-white/40 dark:bg-white/[0.02] border-slate-100/50 dark:border-slate-200/40'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm">{info.icon}</span>
                                <strong className={`text-xs font-black ${isLast ? 'text-[var(--primary-color, #38bdf8)]' : 'text-slate-800 dark:text-gray-250'}`}>
                                  {info.title}
                                </strong>
                                {isLast && (
                                  <span className="px-1.5 py-0.5 bg-[var(--primary-color, #38bdf8)]/10 text-[var(--primary-color, #38bdf8)] border border-[var(--primary-color, #38bdf8)]/25 rounded-md text-[8px] font-black uppercase tracking-wider">
                                    {isRtl ? 'الحالة الحالية' : 'Current State'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold font-mono">
                                ⏰ {formatTime(hist.timestamp)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed mt-1.5 max-w-2xl">
                              {info.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Ordered Item list */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t.products}</h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-[#0A0C10] rounded-2xl p-4 border border-slate-100 dark:border-slate-850">
              {searchedOrder.items.map((it, idx) => (
                <div key={idx} className="py-3 flex items-center gap-4 text-xs font-semibold">
                  <img src={it.image} alt={it.name} className="w-10 h-10 object-cover rounded-lg bg-white border border-slate-200 p-0.5 flex-shrink-0" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0 pr-1">
                    <strong className="block text-slate-900 dark:text-gray-100 font-bold truncate">{it.name}</strong>
                    {it.color && (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-250 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                        {t.selected_color || 'اللون'}: <span className="text-[var(--primary-color, #38bdf8)]">{it.color}</span>
                      </span>
                    )}
                  </div>
                  <div className={`text-right space-y-0.5 ${isRtl ? 'pr-2' : 'pl-2'}`}>
                    <span className="text-slate-800 dark:text-slate-850 block font-bold">{it.price} {t.currency} × {it.quantity}</span>
                    <span className="text-[10px] text-slate-400 block font-extrabold">{it.price * it.quantity} {t.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Metadata breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-slate-50 dark:bg-[#0A0C10] rounded-2xl p-6 border border-slate-100 dark:border-slate-850">
            <div className="space-y-3 font-sans">
              <strong className="text-xs font-black uppercase text-amber-500 block pb-1 border-b dark:border-slate-200">{t.personal_info || 'معلومات الشحنة'}</strong>
              <div className="space-y-2 text-slate-650 dark:text-slate-800">
                <div className="flex items-center gap-2 font-semibold">
                  <ShoppingBag className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>{searchedOrder.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-sans leading-relaxed">{searchedOrder.address}</span>
                </div>
                <div className="flex items-center gap-2 font-semibold">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="font-sans">{searchedOrder.phone}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <strong className="text-xs font-black uppercase text-amber-500 block pb-1 border-b dark:border-slate-200">{t.payment_method || 'حساب المعاملة'}</strong>
                <span className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-[10px] font-black rounded-lg uppercase tracking-wider inline-block text-slate-600 dark:text-slate-800">
                  {searchedOrder.payment_method === 'cash' ? t.payment_cash : searchedOrder.payment_method === 'apple' ? t.payment_apple : t.payment_card}
                </span>
              </div>

              <div className="pt-4 border-t dark:border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-extrabold">{t.total}:</span>
                <strong className="text-[var(--primary-color, #38bdf8)] text-xl font-black font-sans">{searchedOrder.total} {t.currency}</strong>
              </div>
            </div>
          </div>

        </div>
      )}

      {!loading && hasSearched && !searchedOrder && (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-200/80 space-y-4 max-w-xl mx-auto">
          <Clock className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-850">{t.track_not_found || 'عذراً، لم نجد طلب بهذا الرقم.'}</p>
          <p className="text-xs text-slate-400 leading-relaxed font-semibold">
            {isRtl ? 'يرجى مراجعة وتأكيد كود تتبع الطلب الخاص بك والمدرج بفاتورة الشراء والمحاولة من جديد.' : 'Please verify the order ID and try again.'}
          </p>
        </div>
      )}

    </div>
  );
}
