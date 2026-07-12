import React, { useState, useEffect } from 'react';
import { CartItem, Language, Order, User } from '../types';
import { TRANSLATIONS } from '../constants/translations';
import { X, ShieldCheck, CheckCircle2, Loader2, ShoppingBag, CreditCard, Tag, Wallet } from 'lucide-react';
import { formatPrice } from '../utils/price';
import { playCheckoutSuccessSound } from '../utils/audio';

interface CheckoutModalProps {
  cart: CartItem[];
  currentLanguage: Language;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
  userEmail?: string;
  userName?: string;
  currentUser?: User | null;
  onUpdateUser?: (updated: User) => void;
  shopLogo?: string;
  integrations?: {
    stripeEnabled: boolean;
    stripeSecretKey: string;
    stripePublishableKey: string;
    applePayEnabled: boolean;
    applePayMerchantId: string;
    aramexEnabled: boolean;
    aramexAccountNumber: string;
    aramexUsername: string;
    aramexPassword: string;
    smsaEnabled: boolean;
    smsaApiKey: string;
    codEnabled: boolean;
  };
}

export default function CheckoutModal({
  cart,
  currentLanguage,
  onClose,
  onOrderSuccess,
  userEmail = '',
  userName = '',
  currentUser = null,
  onUpdateUser,
  shopLogo,
  integrations = {
    stripeEnabled: false,
    stripeSecretKey: '',
    stripePublishableKey: '',
    applePayEnabled: false,
    applePayMerchantId: '',
    aramexEnabled: false,
    aramexAccountNumber: '',
    aramexUsername: '',
    aramexPassword: '',
    smsaEnabled: false,
    smsaApiKey: '',
    codEnabled: true,
  }
}: CheckoutModalProps) {
  const t = TRANSLATIONS[currentLanguage];
  const isRtl = currentLanguage === 'ar';

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  
  // Calculate total weight and shipping characteristics
  const totalWeight = cart.reduce((acc, item) => {
    let itemWeight = item.product.weight;
    if (itemWeight === undefined || itemWeight === null) {
      if (item.product.category === 'bikes') itemWeight = 25; // 25kg standard sports bike
      else if (item.product.category === 'cars') itemWeight = 120; // 120kg mini roadster
      else if (item.product.is_digital) itemWeight = 0;
      else itemWeight = 1.5; // 1.5kg standard accessory/helmet
    }
    return acc + (itemWeight * item.quantity);
  }, 0);

  // Determine highest shipping class
  const maxShippingClass = cart.reduce<'standard' | 'heavy_bike' | 'oversized_car' | 'digital'>((highest, item) => {
    let currentClass = item.product.shipping_class;
    if (!currentClass) {
      if (item.product.is_digital) currentClass = 'digital';
      else if (item.product.category === 'cars') currentClass = 'oversized_car';
      else if (item.product.category === 'bikes') currentClass = 'heavy_bike';
      else currentClass = 'standard';
    }

    if (highest === 'oversized_car' || currentClass === 'oversized_car') return 'oversized_car';
    if (highest === 'heavy_bike' || currentClass === 'heavy_bike') return 'heavy_bike';
    if (highest === 'standard' || currentClass === 'standard') return 'standard';
    return currentClass;
  }, 'digital');

  // Group cart items by warehouse to detect split shipments and calculate cost
  const itemsByWarehouse: { [key: string]: typeof cart } = {};
  cart.forEach(item => {
    const warehouse = item.product.warehouse_name || (isRtl ? 'المستودع الرئيسي' : 'Main Warehouse');
    if (!itemsByWarehouse[warehouse]) {
      itemsByWarehouse[warehouse] = [];
    }
    itemsByWarehouse[warehouse].push(item);
  });

  const warehouseCount = Object.keys(itemsByWarehouse).length;
  const isSplitShipment = warehouseCount > 1;

  // Compute Shipping Fees dynamically supporting weight/size of bikes/cars
  let baseShippingCost = 35;
  let oversizedSurcharge = 0;
  
  if (maxShippingClass === 'digital') {
    baseShippingCost = 0;
  } else if (maxShippingClass === 'heavy_bike') {
    baseShippingCost = 150; // Bike standard freight
    oversizedSurcharge = Math.max(0, (totalWeight - 25) * 5); // 5 SAR per extra kg
  } else if (maxShippingClass === 'oversized_car') {
    baseShippingCost = 350; // Flatbed vehicle transport
    oversizedSurcharge = Math.max(0, (totalWeight - 100) * 8); // 8 SAR per extra kg
  } else {
    // Standard shipping
    baseShippingCost = 35;
    if (subtotal > 500) {
      baseShippingCost = 0; // Free standard shipping for orders > 500 SAR
    } else {
      // 35 SAR base + 15 SAR for each extra warehouse package
      baseShippingCost = 35 + (warehouseCount - 1) * 15;
    }
  }

  const shippingCost = baseShippingCost + oversizedSurcharge;

  // Form states
  const [fullname, setFullname] = useState(userName);
  const [country, setCountry] = useState(isRtl ? 'المملكة العربية السعودية' : 'Saudi Arabia');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [street, setStreet] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(userEmail);
  const [paymentMethod, setPaymentMethod] = useState(() => {
    if (integrations?.codEnabled && cart.every(item => item.product.cod_available !== false)) return 'cod';
    if (integrations?.stripeEnabled) return 'card';
    if (integrations?.applePayEnabled) return 'apple';
    return 'cod';
  });
  const [orderNotes, setOrderNotes] = useState('');

  // COD restrictions: check if all items allow Cash on Delivery
  const codAllowed = cart.every(item => item.product.cod_available !== false);

  // Auto switch payment method if COD is not allowed and currently selected
  useEffect(() => {
    if (!codAllowed && paymentMethod === 'cod') {
      setPaymentMethod('card');
    }
  }, [codAllowed, paymentMethod]);

  // Wallet deduction state (inputted amount)
  const [walletAmountUsed, setWalletAmountUsed] = useState(0);

  // Promo code states
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0); // in SAR
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [formError, setFormError] = useState('');

  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  // Dynamic values for wallet application
  const maxWalletAvailable = currentUser ? Math.min(currentUser.wallet_balance || 0, total) : 0;
  const finalWalletUsed = Math.min(walletAmountUsed, maxWalletAvailable);
  const remainingPayable = Math.max(0, total - finalWalletUsed);

  const handleApplyPromo = () => {
    setPromoError('');
    setPromoSuccess('');
    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    let matchedPercent = 0;
    let matchedFlat = 0;

    // Check built-in codes
    if (code === 'SARA10') matchedPercent = 10;
    else if (code === 'FAISAL20') matchedPercent = 20;
    else if (code === 'RYVO2026') matchedPercent = 10;
    else if (code === 'AI-BOOST2026' || code === 'AI-BOOST') matchedPercent = 15;
    else {
      // Check ryvo_affiliates info
      try {
        const savedAff = localStorage.getItem('ryvo_affiliates');
        if (savedAff) {
          const parsed = JSON.parse(savedAff);
          const matched = parsed.find((a: any) => a.code.toUpperCase() === code);
          if (matched) {
            matchedPercent = matched.discount_percent;
          }
        }
      } catch (_) {}

      // Check ryvo_points_coupons info
      try {
        const savedPt = localStorage.getItem('ryvo_points_coupons');
        if (savedPt) {
          const parsed = JSON.parse(savedPt);
          const matched = parsed.find((c: any) => c.code.toUpperCase() === code && !c.used);
          if (matched) {
            if (matched.value) {
              matchedPercent = matched.value;
            } else {
              matchedFlat = matched.discount_sar;
            }
          }
        }
      } catch (_) {}
    }

    if (matchedPercent > 0) {
      const calcDiscount = Math.round((matchedPercent / 100) * subtotal);
      setDiscountAmount(calcDiscount);
      setAppliedPromo(code);
      setPromoSuccess(
        isRtl 
          ? `تم تفعيل الكود [ ${code} ] بنجاح! تم خصم ${matchedPercent}% (-${calcDiscount} ريال)` 
          : `Promo code [ ${code} ] active! Saved ${matchedPercent}% (-${formatPrice(calcDiscount, currentLanguage)})`
      );
    } else if (matchedFlat > 0) {
      setDiscountAmount(matchedFlat);
      setAppliedPromo(code);
      setPromoSuccess(
        isRtl 
          ? `تم تفعيل كوبون النقاط [ ${code} ] بنجاح! تم خصم ${matchedFlat} ريال سعودي` 
          : `Points voucher [ ${code} ] active! Saved -${formatPrice(matchedFlat, currentLanguage)}`
      );
    } else {
      setPromoError(
        isRtl 
          ? 'عذراً، هذا الكود غير صحيح، منتهي، أو تم استخدامه مسبقاً!' 
          : 'Invalid, expired, or already used promotional code!'
      );
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (
      !fullname.trim() ||
      !country.trim() ||
      !city.trim() ||
      !district.trim() ||
      !street.trim() ||
      !phone.trim() ||
      !email.trim()
    ) {
      setFormError(t.error_empty_fields);
      return;
    }

    const address = [street.trim(), district.trim(), city.trim(), country.trim()].filter(Boolean).join(', ');

    setIsSubmitting(true);

    const tempUniqueId = `RYVO-${Math.floor(1000 + Math.random() * 9000)}-SA`;

    // Format payment method string
    let displayPaymentMethod = '';
    if (finalWalletUsed > 0) {
      if (remainingPayable === 0) {
        displayPaymentMethod = isRtl ? 'رصيد المحفظة بالكامل 💰' : 'Full Wallet Cash 💰';
      } else {
        const secondaryMethod = paymentMethod === 'cod' 
          ? (isRtl ? 'الدفع عند الاستلام 🚚' : 'COD 🚚')
          : paymentMethod === 'card'
            ? (isRtl ? 'بطاقة الائتمان 💳' : 'Credit Card 💳')
            : (isRtl ? 'أبل باي ' : 'Apple Pay ');
        displayPaymentMethod = isRtl 
          ? `المحفظة (${finalWalletUsed} ر.س) + ${secondaryMethod}`
          : `Wallet (${finalWalletUsed} SAR) + ${secondaryMethod}`;
      }
    } else {
      displayPaymentMethod = paymentMethod === 'cod' 
        ? (isRtl ? 'الدفع عند الاستلام 🚚' : 'Cash on Delivery 🚚')
        : paymentMethod === 'card'
          ? (isRtl ? 'بطاقة الائتمان 💳' : 'Credit Card 💳')
          : (isRtl ? 'أبل باي ' : 'Apple Pay ');
    }

    const uniqueVendors = Array.from(new Set(cart.map(it => it.product.supplier_id || 'ryvo-main')));

    const orderPayload = {
      id: tempUniqueId,
      customer_name: fullname,
      user_email: email,
      address,
      phone,
      payment_method: displayPaymentMethod,
      items: cart.map(it => {
        const itemCost = it.product.cost_price || it.product.supplier_purchase_price || (it.product.price * 0.6);
        return {
          product_id: it.product.id,
          name: currentLanguage === 'ar' ? it.product.name_ar : currentLanguage === 'fr' ? it.product.name_fr : it.product.name_en,
          price: it.product.price,
          quantity: it.quantity,
          image: it.product.image,
          color: it.color,
          vendor_id: it.product.supplier_id || 'ryvo-main',
          cost_price: itemCost,
          item_status: 'pending' as const,
          shipping_carrier: maxShippingClass === 'heavy_bike' || maxShippingClass === 'oversized_car' ? 'Aramex Heavy Freight' : 'SMSA Express'
        };
      }),
      total,
      payment_method_raw: paymentMethod,
      wallet_used: finalWalletUsed,
      total_weight: totalWeight,
      vendor_ids: uniqueVendors,
      payout_status: 'unpaid' as const,
      shipping_details: {
        total_weight: totalWeight,
        package_volume: cart.reduce((acc, it) => {
          const w = it.product.width || 10;
          const h = it.product.height || 10;
          const l = it.product.length || 10;
          return acc + (w * h * l * it.quantity);
        }, 0),
        customs_required: totalWeight > 30
      }
    };

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    })
      .then(res => res.json())
      .then(data => {
        setIsSubmitting(false);
        if (data.success && data.order) {
          const finalOrder = data.order;
          
          // If a points coupon or affiliate promo was applied, mark or record usage
          if (appliedPromo) {
            try {
              // 1. Check points coupon
              const savedPt = localStorage.getItem('ryvo_points_coupons');
              if (savedPt) {
                const parsed = JSON.parse(savedPt);
                const updated = parsed.map((c: any) => c.code.toUpperCase() === appliedPromo.toUpperCase() ? { ...c, used: true } : c);
                localStorage.setItem('ryvo_points_coupons', JSON.stringify(updated));
              }
            } catch (_) {}

            try {
              // 2. Check and update affiliate marketer stats
              const savedAff = localStorage.getItem('ryvo_affiliates');
              if (savedAff) {
                const parsed = JSON.parse(savedAff);
                const matchedIdx = parsed.findIndex((a: any) => a.code.toUpperCase() === appliedPromo.toUpperCase());
                if (matchedIdx !== -1) {
                  const matched = parsed[matchedIdx];
                  const commPercent = matched.commission_percent || 0;
                  const commAmount = Math.round((commPercent / 100) * subtotal);
                  
                  parsed[matchedIdx] = {
                    ...matched,
                    usage_count: (matched.usage_count || 0) + 1,
                    total_commission: (matched.total_commission || 0) + commAmount,
                    current_balance: (matched.current_balance || 0) + commAmount
                  };
                  localStorage.setItem('ryvo_affiliates', JSON.stringify(parsed));
                }
              }
            } catch (_) {}
          }

          // Deduct wallet balance locally as well
          if (currentUser && onUpdateUser && finalWalletUsed > 0) {
            const nextWallet = Math.max(0, (currentUser.wallet_balance || 0) - finalWalletUsed);
            const updatedUser: User = {
              ...currentUser,
              wallet_balance: nextWallet,
              wallet_history: [
                {
                  id: `wal-pay-${Math.floor(Math.random() * 89999)}`,
                  type: 'payment',
                  amount: finalWalletUsed,
                  description_ar: `شراء منتجات في الطلب رقم #${finalOrder.id} (خصم من المحفظة)`,
                  description_en: `Store checkout payment for order #${finalOrder.id} (wallet deduction)`,
                  date: new Date().toISOString().split('T')[0]
                },
                ...(currentUser.wallet_history || [])
              ]
            };
            onUpdateUser(updatedUser);
          }

          setSubmittedOrder(finalOrder);
          onOrderSuccess(finalOrder);
          playCheckoutSuccessSound();
        } else {
          setFormError(data.error || (isRtl ? 'حدث خطأ أثناء معالجة طلبك، يرجى المحاولة لاحقاً.' : 'An error occurred while processing your order.'));
        }
      })
      .catch(err => {
        setIsSubmitting(false);
        setFormError(isRtl ? 'تعذر الاتصال بالخادم، يرجى التحقق من الشبكة.' : 'Could not connect to the server. Please check your network.');
        console.error('Error submitting order:', err);
      });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/60 dark:bg-black/85 backdrop-blur-sm transition-opacity"></div>

      {/* Modal Dialog */}
      <div id="checkout-form-dialog" className="relative bg-white dark:bg-[#11141D] rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row border border-slate-150 dark:border-[#1E293B] animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-gray-100 max-h-[96vh] md:max-h-[85vh] overflow-y-auto md:overflow-hidden">
        
        {/* Close Button */}
        <button
          id="btn-checkout-close"
          onClick={onClose}
          className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} z-10 p-2.5 rounded-full bg-slate-50 hover:bg-[var(--primary-color)] hover:text-slate-950 dark:bg-slate-900 dark:hover:bg-[var(--primary-color)] dark:hover:text-[#0A0C10] transition-all cursor-pointer`}
        >
          <X className="w-4 h-4" />
        </button>

        {submittedOrder ? (
          /* Success Screen */
          <div className="w-full p-4 text-center space-y-6 max-w-xl mx-auto py-12 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto text-4xl">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white font-sans">{t.order_success_title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed font-sans">
                {t.order_success_text} 
                <strong className="text-rose-500 font-mono block text-lg tracking-wider mt-1.5 font-black bg-rose-500/10 py-1.5 rounded-xl border border-rose-500/20">
                  {submittedOrder.id}
                </strong>
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-slate-50 dark:bg-[#152033] rounded-2xl p-6 border border-slate-100 dark:border-slate-800 text-xs text-left font-sans space-y-4">
              <h3 className="font-bold border-b border-slate-200 dark:border-slate-700 pb-2 text-center text-slate-400 uppercase tracking-widest">{t.dashboard_orders_tab}</h3>
              
              <div className="space-y-2.5">
                {submittedOrder.items.map((it, i) => (
                  <div key={i} className="flex justify-between items-center text-slate-600 dark:text-gray-300">
                    <span className="font-semibold">{it.name} <strong className="text-slate-400 font-sans">x{it.quantity}</strong></span>
                    <span className="font-bold font-sans">{formatPrice(it.price * it.quantity, currentLanguage)}</span>
                  </div>
                ))}
              </div>

              {appliedPromo && (
                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-emerald-600 font-bold">
                  <span>{isRtl ? 'الخصم المطبق:' : 'Coupon Savings:'} ({appliedPromo})</span>
                  <span>-{formatPrice(discountAmount, currentLanguage)}</span>
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-750 pt-2.5 flex justify-between font-black text-slate-950 dark:text-white">
                <span>{t.total}</span>
                <span className="text-rose-500 font-mono text-sm">{formatPrice(submittedOrder.total, currentLanguage)}</span>
              </div>
            </div>

            <button
              id="btn-checkout-success-close"
              onClick={onClose}
              className="px-6 py-3 bg-[var(--primary-color)] hover:opacity-90 text-slate-950 font-bold rounded-xl text-xs uppercase cursor-pointer transition-all"
            >
              {t.close_btn}
            </button>
          </div>
        ) : (
          /* Form Screen */
          <>
            {/* Left Side: Receipt Items Breakdown */}
            <div className="flex-1 p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-[#0A0C10] flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#1E293B] md:max-h-[85vh] md:overflow-y-auto">
              <div className="space-y-4">
                {shopLogo && (
                  <div className="flex items-center gap-2 pb-3 mb-1 border-b border-slate-200 dark:border-slate-800/80">
                    {shopLogo.startsWith('data:image') || shopLogo.includes('http') || shopLogo.includes('/') ? (
                      <img src={shopLogo} alt="Logo" className="h-8 max-w-[120px] object-contain rounded-lg" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-sm font-black tracking-widest bg-gradient-to-r from-[var(--primary-color, #38bdf8)] to-amber-500 bg-clip-text text-transparent uppercase font-sans">
                        {shopLogo}
                      </span>
                    )}
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">RECEIPT SUMMARY</span>
                  </div>
                )}
                <span className="text-xs font-black uppercase text-[var(--primary-color, #38bdf8)] tracking-wider flex items-center gap-1.5 mb-2">
                  <ShoppingBag className="w-4 h-4" />
                  {t.cart_title}
                </span>

                <div className="space-y-3 max-h-[25vh] overflow-y-auto pr-1">
                  {cart.map(item => {
                    const name = currentLanguage === 'ar' ? item.product.name_ar : currentLanguage === 'fr' ? item.product.name_fr : item.product.name_en;
                    return (
                      <div key={item.product.id} className="flex items-center gap-3 bg-white dark:bg-[#11141D] p-2.5 rounded-xl border border-slate-100 dark:border-[#1E293B]">
                        <img src={item.product.image} className="w-10 h-10 object-cover rounded-lg" referrerPolicy="no-referrer" />
                        <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                          <h4 className="text-xs font-bold truncate text-slate-800 dark:text-gray-200">{name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 font-sans">{item.quantity} x {formatPrice(item.product.price, currentLanguage)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Secure Coupons/Promos Form Wrapper */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-400 block mb-1 text-start">
                    {isRtl ? 'هل لديك رمز أو كود خصم؟' : 'Have a Promo / Discount Code?'}
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      id="checkout-coupon-input-field"
                      type="text"
                      placeholder={isRtl ? 'مثال: RYVO2026' : 'e.g. RYVO2026'}
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      // Set text-base on mobile to completely prevent sudden zooming, md:text-xs restores normal desktop scale
                      className={`flex-1 text-base md:text-xs px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 outline-none font-bold uppercase transition-all ${
                        isRtl ? 'text-right' : 'text-left'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-[11px] font-black rounded-xl cursor-pointer transition-all flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3 text-amber-400" />
                      <span>{isRtl ? 'تطبيق' : 'Apply'}</span>
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-[10px] font-bold text-rose-500 mt-1 text-start animate-fade-in">{promoError}</p>
                  )}
                  {promoSuccess && (
                    <p className="text-[10px] font-bold text-emerald-600 mt-1 text-start animate-fade-in">{promoSuccess}</p>
                  )}
                </div>
              </div>

              {/* SMART CONSOLIDATION & SPLIT SHIPMENT ALERTS (FOR CUSTOMERS - CHECKOUT SIDEBAR) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
                {isSplitShipment ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                      <span className="text-sm">⚠️</span>
                      <div className={`text-[11px] font-bold leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
                        <p>{isRtl ? 'تنبيه شحن مجزأ (طرود منفصلة)' : 'Split Shipment Notice'}</p>
                        <p className="font-normal text-[9px] text-slate-400 mt-0.5">
                          {isRtl 
                            ? 'نظراً لاختلاف مستودعات المنتجات في طلبك، سيتم شحن السلع في طرود مستقلة لضمان سرعة الوصول.'
                            : 'Because your items are stored in different fulfillment centers, they will ship in separate packages.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      {Object.entries(itemsByWarehouse).map(([wh, items], index) => (
                        <div key={wh} className="p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-900 text-[10px]">
                          <div className="flex items-center justify-between font-black text-slate-500 border-b border-slate-100 dark:border-slate-900 pb-1 mb-1">
                            <span>📦 {isRtl ? `طرد #${index + 1}` : `Package #${index + 1}`}</span>
                            <span className="text-[9px] text-violet-500 font-bold">{wh}</span>
                          </div>
                          <ul className={`space-y-0.5 ${isRtl ? 'text-right' : 'text-left'} text-slate-500 dark:text-slate-400 font-medium list-disc list-inside`}>
                            {items.map(it => (
                              <li key={it.product.id} className="truncate">
                                <span className="font-bold text-slate-700 dark:text-slate-300">({it.quantity}x)</span> {isRtl ? it.product.name_ar : it.product.name_en}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <span className="text-base">✓</span>
                    <div className={`text-[11px] font-bold ${isRtl ? 'text-right' : 'text-left'}`}>
                      <p>{isRtl ? 'سيتم شحن جميع منتجاتك في طرد واحد رائع! 📦' : 'All your products will be shipped in one great package! 📦'}</p>
                      <p className="font-normal text-[9px] text-slate-400 mt-0.5">
                        {isRtl 
                          ? `جميع منتجاتك مجهزة في (${Object.keys(itemsByWarehouse)[0] || 'المستودع الرئيسي'}) وجاهزة للدمج`
                          : `All your items are hosted at (${Object.keys(itemsByWarehouse)[0] || 'Main Warehouse'})`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Subtotal summaries */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-2.5 text-xs font-bold text-slate-500 dark:text-slate-450">
                <div className="flex justify-between">
                  <span>{t.subtotal}</span>
                  <span className="text-slate-800 dark:text-white font-sans">{formatPrice(subtotal, currentLanguage)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{isRtl ? 'الخصم النشط:' : 'Promo Discount:'}</span>
                    <span className="font-sans">-{formatPrice(discountAmount, currentLanguage)}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1 border-y border-slate-100 dark:border-slate-800/40 py-2.5">
                  <div className="flex justify-between">
                    <span>{t.shipping}</span>
                    <span className={shippingCost === 0 ? 'text-emerald-500 font-sans' : 'text-slate-800 dark:text-white font-sans'}>
                      {shippingCost === 0 ? t.free : `${formatPrice(shippingCost, currentLanguage)}`}
                    </span>
                  </div>
                  {totalWeight > 0 && (
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                      <span>{isRtl ? `الوزن الكلي للشحنة:` : `Total weight:`}</span>
                      <span className="font-mono">{totalWeight.toFixed(1)} {isRtl ? 'كجم' : 'kg'}</span>
                    </div>
                  )}
                  {maxShippingClass === 'heavy_bike' && (
                    <div className="text-[9px] text-amber-500 font-bold bg-amber-500/5 px-2 py-1 rounded-md border border-amber-500/10 text-start mt-1">
                      🚚 {isRtl ? 'شحن دراجات مؤمن: معالجة طرد ثقيل وحساس' : 'Heavy Bike Freight: Secure high-volume logistics'}
                    </div>
                  )}
                  {maxShippingClass === 'oversized_car' && (
                    <div className="text-[9px] text-rose-500 font-bold bg-rose-500/5 px-2 py-1 rounded-md border border-rose-500/10 text-start mt-1">
                      🚛 {isRtl ? 'شحن مسطح خاص: طرود المركبات فائقة الضخامة' : 'Flatbed transport: Oversized vehicles package'}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between text-sm text-slate-900 dark:text-white">
                  <span className="font-black">{t.total}</span>
                  <span className="text-base text-rose-500 font-black font-sans">{formatPrice(total, currentLanguage)}</span>
                </div>
              </div>
            </div>

            {/* Right Side: Inputs Column */}
            <div className={`flex-1 p-4 sm:p-6 md:p-8 flex flex-col justify-between ${isRtl ? 'text-right' : 'text-left'} md:max-h-[85vh] md:overflow-y-auto`}>
              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">{t.checkout_title}</h2>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t.csrf_protective}</span>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-3.5 pt-2 font-sans">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">{t.fullname_label}</label>
                    <input
                      id="checkout-fullname"
                      type="text"
                      required
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                      // Fix sudden zoom: text-base on mobile, md:text-xs on desktop
                      className={`w-full text-base md:text-xs px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-[#0A0C10] text-slate-850 dark:text-white outline-none transition-all ${
                        isRtl ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>

                  {/* Split Address Fields */}
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                      {isRtl ? 'تفاصيل العنوان وشحن الطلب 📍' : 'Shipping Address Details 📍'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">
                          {isRtl ? 'الدولة' : 'Country'}
                        </label>
                        <input
                          id="checkout-country"
                          type="text"
                          required
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className={`w-full text-base md:text-xs px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-[#0A0C10] text-slate-850 dark:text-white outline-none transition-all ${
                            isRtl ? 'text-right' : 'text-left'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">
                          {isRtl ? 'المدينة' : 'City'}
                        </label>
                        <input
                          id="checkout-city"
                          type="text"
                          required
                          placeholder={isRtl ? 'الرياض، جدة...' : 'e.g. Riyadh, Jeddah...'}
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className={`w-full text-base md:text-xs px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-[#0A0C10] text-slate-850 dark:text-white outline-none transition-all ${
                            isRtl ? 'text-right' : 'text-left'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">
                          {isRtl ? 'اسم الحي' : 'District / Neighborhood'}
                        </label>
                        <input
                          id="checkout-district"
                          type="text"
                          required
                          placeholder={isRtl ? 'مثال: حي الياسمين' : 'e.g. Al Yasmin District'}
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className={`w-full text-base md:text-xs px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-[#0A0C10] text-slate-850 dark:text-white outline-none transition-all ${
                            isRtl ? 'text-right' : 'text-left'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-slate-400">
                          {isRtl ? 'اسم الشارع' : 'Street Name'}
                        </label>
                        <input
                          id="checkout-street"
                          type="text"
                          required
                          placeholder={isRtl ? 'مثال: شارع العليا، مبنى رقم...' : 'e.g. Olaya Street, Building...'}
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          className={`w-full text-base md:text-xs px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-[#0A0C10] text-slate-850 dark:text-white outline-none transition-all ${
                            isRtl ? 'text-right' : 'text-left'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">{t.email_label}</label>
                      <input
                        id="checkout-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        // Fix sudden zoom
                        className={`w-full text-base md:text-xs px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-[#0A0C10] text-slate-850 dark:text-white outline-none transition-all ${
                          isRtl ? 'text-right' : 'text-left'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">{t.phone_label}</label>
                      <input
                        id="checkout-phone"
                        type="tel"
                        required
                        placeholder="05xxxxxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        // Fix sudden zoom
                        className={`w-full text-base md:text-xs px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-[#0A0C10] text-slate-850 dark:text-white outline-none transition-all ${
                          isRtl ? 'text-right' : 'text-left'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Special Order Notes Textarea */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                      {isRtl ? 'ملاحظات خاصة بالطلب (اختياري)' : 'Special Delivery/Order Notes (Optional)'}
                    </label>
                    <textarea
                      id="checkout-order-notes"
                      rows={2}
                      placeholder={isRtl ? 'مثال: يرجى الاتصال قبل التوصيل، أو أي تعليمات خاصة بتسليم الطلب...' : 'e.g., Please call before delivery, or any specific delivery details...'}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className={`w-full text-base md:text-xs px-3.5 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-[#0A0C10] text-slate-850 dark:text-white outline-none transition-all resize-none ${
                        isRtl ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>

                  {/* Wallet Balance Usage Section */}
                  {currentUser && (currentUser.wallet_balance || 0) > 0 && (
                    <div className="p-3.5 border-2 border-dashed border-amber-500/30 rounded-2xl bg-amber-500/[0.02] dark:bg-amber-500/[0.01] space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-wider text-amber-500 flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5" />
                          {isRtl ? 'استخدام رصيد المحفظة المالية' : 'Pay via Wallet Balance'}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {isRtl ? 'الرصيد المتاح: ' : 'Available: '}
                          {(currentUser.wallet_balance || 0).toFixed(2)} {isRtl ? 'ر.س' : 'SAR'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-450 dark:text-slate-400 leading-relaxed font-medium">
                        {isRtl 
                          ? 'يمكنك خصم جزء أو كامل قيمة مشترياتك مباشرة من محفظتك المالية وسداد الباقي عبر بوابة الدفع التي تختارها.' 
                          : 'Deduct partial or full order total directly from your financial balance and pay the remainder via payment method below.'}
                      </p>
                      
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min={0}
                            max={maxWalletAvailable}
                            step="any"
                            placeholder="0.00"
                            value={walletAmountUsed || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (isNaN(val) || val < 0) {
                                setWalletAmountUsed(0);
                              } else {
                                setWalletAmountUsed(Math.min(val, maxWalletAvailable));
                              }
                            }}
                            className="w-full text-base md:text-xs font-bold px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-none focus:border-amber-400"
                          />
                          <span className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-2.5 text-[10px] font-bold text-slate-400`}>
                            {isRtl ? 'ر.س' : 'SAR'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWalletAmountUsed(maxWalletAvailable)}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black rounded-xl cursor-pointer transition-all uppercase"
                        >
                          {isRtl ? 'استخدام الأقصى' : 'Use Max'}
                        </button>
                      </div>

                      {walletAmountUsed > 0 && (
                        <div className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 space-y-1 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                          <div className="flex justify-between">
                            <span>{isRtl ? 'المخصوم من المحفظة:' : 'Wallet Deduction:'}</span>
                            <span>-{walletAmountUsed.toFixed(2)} {isRtl ? 'ر.س' : 'SAR'}</span>
                          </div>
                          <div className="flex justify-between font-black text-slate-800 dark:text-white border-t border-dashed border-amber-500/15 pt-1">
                            <span>{isRtl ? 'المبلغ المتبقي للسداد:' : 'Remaining to Pay:'}</span>
                            <span>{remainingPayable.toFixed(2)} {isRtl ? 'ر.س' : 'SAR'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Method Selector */}
                  {remainingPayable > 0 ? (
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">{t.payment_method}</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { id: 'cod', label: t.payment_cash, disabled: !codAllowed || !integrations.codEnabled, notActivated: !integrations.codEnabled },
                          { id: 'card', label: t.payment_card, disabled: !integrations.stripeEnabled, notActivated: !integrations.stripeEnabled },
                          { id: 'apple', label: t.payment_apple, disabled: !integrations.applePayEnabled, notActivated: !integrations.applePayEnabled }
                        ].map(meth => {
                          const isCurrentlySelected = paymentMethod === meth.id;
                          return (
                            <button
                              key={meth.id}
                              id={`btn-payment-${meth.id}`}
                              type="button"
                              disabled={meth.disabled}
                              onClick={() => setPaymentMethod(meth.id)}
                              className={`p-3 rounded-xl border-2 text-center text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                isCurrentlySelected
                                  ? 'border-[var(--primary-color, #38bdf8)] bg-[var(--primary-color, #38bdf8)]/5 text-[var(--primary-color, #38bdf8)]'
                                  : meth.disabled
                                    ? 'border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 text-slate-300 dark:text-slate-755 cursor-not-allowed opacity-50'
                                    : 'border-slate-100 dark:border-[#1E293B] hover:border-slate-200 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <CreditCard className="w-4 h-4 text-slate-450" />
                              <span className="text-[10px] leading-tight description-lang">{meth.label}</span>
                              {meth.notActivated ? (
                                <span className="text-[8px] text-amber-500 font-extrabold mt-0.5 animate-pulse">
                                  {isRtl ? 'غير مفعّل' : 'Not Activated'}
                                </span>
                              ) : meth.id === 'cod' && !codAllowed ? (
                                <span className="text-[8px] text-rose-500 font-extrabold mt-0.5">
                                  {isRtl ? 'غير مدعوم لسلتك' : 'Not supported'}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                      
                      {!codAllowed && (
                        <p className="text-[10px] text-rose-500 font-bold bg-rose-500/5 p-2 rounded-lg border border-rose-500/10 text-start leading-relaxed mt-1">
                          ⚠️ {isRtl 
                            ? 'الدفع عند الاستلام غير متاح لأن أحد المنتجات في سلتك لا يدعمه.' 
                            : 'Cash on Delivery is unavailable because one or more products in your cart do not support it.'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 border-2 border-emerald-500/20 bg-emerald-500/5 rounded-2xl text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 animate-in zoom-in-95">
                      <span>✓</span>
                      <span>
                        {isRtl 
                          ? 'رصيد المحفظة يغطي إجمالي الطلب بالكامل. لا حاجة لطريقة دفع إضافية.' 
                          : 'Wallet balance fully covers the total. No secondary payment method is needed.'}
                      </span>
                    </div>
                  )}
                </div>
                
                {formError && (
                  <p className="text-xs font-bold text-rose-500 py-1 text-center animate-fade-in bg-rose-500/10 rounded-lg border border-rose-500/15">
                    {formError}
                  </p>
                )}

                {/* Submitting CSRF feedback */}
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-base md:text-xs font-bold text-slate-600 dark:text-gray-305">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-color, #38bdf8)]" />
                    <span>{t.processing_order}</span>
                  </div>
                ) : (
                  <button
                    id="btn-checkout-submit"
                    type="submit"
                    className="w-full py-4 mt-2 bg-[var(--primary-color)] hover:opacity-90 text-slate-950 font-black hover:scale-[1.01] rounded-xl transition-all cursor-pointer text-xs uppercase shadow-md hover:shadow-[0_0_15px_rgba(var(--primary-color-rgb,56,189,248),0.35)]"
                  >
                    {t.confirm_order_btn}
                  </button>
                )}
              </form>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
