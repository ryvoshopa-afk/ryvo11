import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, RefreshCw, Truck, Mail, Phone, Calendar, Sparkles } from 'lucide-react';
import { Language } from '../types';

interface LegalPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: Language;
  initialTab?: 'terms' | 'privacy' | 'returns' | 'shipping' | 'contact';
}

export default function LegalPagesModal({
  isOpen,
  onClose,
  currentLanguage,
  initialTab = 'terms'
}: LegalPagesModalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'returns' | 'shipping' | 'contact'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const isRtl = currentLanguage === 'ar';

  const tabs = [
    { id: 'terms', label_ar: 'الشروط والأحكام 📜', label_en: 'Terms & Conditions 📜', label_fr: 'Conditions Générales 📜', icon: FileText },
    { id: 'privacy', label_ar: 'سياسة الخصوصية 🔒', label_en: 'Privacy Policy 🔒', label_fr: 'Politique de Confidentialité 🔒', icon: ShieldCheck },
    { id: 'returns', label_ar: 'الاسترجاع والاستبدال 🔄', label_en: 'Returns & Exchange 🔄', label_fr: 'Retours & Échange 🔄', icon: RefreshCw },
    { id: 'shipping', label_ar: 'الشحن والتوصيل 🚚', label_en: 'Shipping & Delivery 🚚', label_fr: 'Livraison & Expédition 🚚', icon: Truck },
    { id: 'contact', label_ar: 'معلومات التواصل 📞', label_en: 'Contact Info 📞', label_fr: 'Infos de Contact 📞', icon: Mail }
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="legal-modal-container"
        className="relative w-full max-w-4xl bg-white dark:bg-[#11141D] rounded-3xl border border-slate-150 dark:border-[#1E293B] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-350"
      >
        {/* Header */}
        <div className={`p-6 border-b border-slate-100 dark:border-[#1E293B] flex items-center justify-between ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-color,#38bdf8)]/10 flex items-center justify-center text-[var(--primary-color,#38bdf8)]">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              {currentLanguage === 'ar' ? 'الوثائق والسياسات الرسمية لمتجر Ryvo' : 'Ryvo Official Policies & Legal Center'}
            </h2>
          </div>
          <button
            id="close-legal-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-450 hover:text-slate-700 dark:hover:text-white rounded-xl bg-slate-50 dark:bg-slate-900/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab triggers */}
        <div className="bg-slate-50/50 dark:bg-[#0A0C10]/50 border-b border-slate-100 dark:border-[#1E293B] p-2 flex flex-wrap gap-1.5 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const label = currentLanguage === 'ar' ? tab.label_ar : currentLanguage === 'fr' ? tab.label_fr : tab.label_en;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`legal-tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  active 
                    ? 'bg-slate-900 text-white dark:bg-[var(--primary-color,#38bdf8)] dark:text-[#0A0C10] shadow-md' 
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-500 dark:text-[#0A0C10]' : 'text-slate-400'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Contents area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 font-sans text-sm text-slate-600 dark:text-slate-300 space-y-6 scrollbar-thin">
          {activeTab === 'terms' && (
            <div className={`space-y-4 leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-1.5 text-amber-500">
                <Calendar className="w-4 h-4" />
                <span className="text-[11px] font-black">{currentLanguage === 'ar' ? 'تاريخ التحديث الأخير: يونيو 2026' : 'Last Updated: June 2026'}</span>
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '1. شروط الاستخدام والأهلية' : '1. Terms of Use & Eligibility'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'يرجى قراءة شروط الخدمة هذه بعناية قبل استخدام متجر Ryvo الإلكتروني. من خلال الوصول إلى متجرنا أو الشراء منا، فإنك توافق على الالتزام الكامل بهذه الشروط. الخدمات مخصصة للمستهلكين البالغين سن الرشد القانوني (18 عاماً فأكثر).'
                  : 'Please read these terms of service carefully before accessing or using Ryvo Store. By accessing or purchasing from our platform, you agree to be bound by these Terms of Service. Services are restricted to individuals at least 18 years of age.'}
              </p>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '2. حساب العميل والمسؤوليات' : '2. Customer Account & Security'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'عند إنشاء حساب في متجر Ryvo، يجب عليك تزويدنا بمعلومات دقيقة وكاملة. أنت مسؤول عن حماية كلمة المرور الخاصة بك وعن جميع الأنشطة التي تتم بموجب حسابك.'
                  : 'When registering an account with Ryvo Store, you must provide precise and accurate data. You bear full responsibility for safeguarding your account credentials, passwords, and actions.'}
              </p>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '3. الأسعار وتوفر المنتجات' : '3. Pricing & Inventory Availability'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'نحن نحتفظ بالحق في تعديل أسعار المنتجات أو إيقاف أي صنف في أي وقت دون إشعار مسبق. الأسعار المعروضة في المتجر تشمل ضريبة القيمة المضافة ما لم يذكر خلاف ذلك.'
                  : 'We reserve the absolute right to amend prices or discontinue products without prior notification. Listed prices include VAT where applicable, unless specified otherwise.'}
              </p>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '4. المنتجات الرقمية والاشتراكات' : '4. Digital Deliverables & Subscriptions'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'المنتجات الرقمية مثل أدلة صيانة المحركات ودورات الفيديو التعليمية مخصصة للاستخدام الشخصي غير التجاري فقط. يمنع منعاً باتاً مشاركة الروابط، توزيع الملفات، أو نسخ المحتوى دون إذن كتابي رسمي من شركة Ryvo.'
                  : 'Digital items, including motorcycle repair handbooks and training masterclasses, are restricted to individual non-commercial use. Sharing links, copying content, or distributing raw files is strictly prohibited.'}
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className={`space-y-4 leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-1.5 text-amber-500">
                <Calendar className="w-4 h-4" />
                <span className="text-[11px] font-black">{currentLanguage === 'ar' ? 'تاريخ التحديث الأخير: يونيو 2026' : 'Last Updated: June 2026'}</span>
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '1. البيانات التي نجمعها' : '1. Collected Personal Information'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'نقوم بجمع البيانات التي تقدمها لنا طواعية، بما في ذلك الاسم، بريدك الإلكتروني، رقم الهاتف، وعنوان الشحن والتوصيل، بالإضافة إلى تفاصيل الدفع لتأمين معالجة الطلبات بشكل كامل وموثوق.'
                  : 'We collect personal information that you willingly provide, such as your full name, email address, contact phone number, delivery address, and encrypted payment details to safely process transactions.'}
              </p>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '2. حماية وتأمين البيانات' : '2. Advanced Data Protection & Security'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'متجر Ryvo محمي بشهادات SSL ومستويات تشفير معقدة لمنع تسريب البيانات. نحن لا نقوم ببيع أو مشاركة بياناتك الخاصة مع أي جهات خارجية لأغراض تسويقية، ونحافظ على سريتها تماماً.'
                  : 'Ryvo Store is fully secured using military-grade SSL layers and database encryption standards. We strictly never sell, trade, or distribute your private data to external marketing companies.'}
              </p>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '3. ملفات تعريف الارتباط Cookies' : '3. Web Cookies & Local Cache'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'نستخدم الكوكيز وحلول التخزين المحلي لتحسين تجربة تصفحك، مثل الاحتفاظ بالمنتجات في سلتك وتفضيلات العملة واللغة.'
                  : 'We use tracking cookies and local web storage to optimize your navigation, persist items in your cart, and remember your preferred language and currency.'}
              </p>
            </div>
          )}

          {activeTab === 'returns' && (
            <div className={`space-y-4 leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-1.5 text-amber-500">
                <Calendar className="w-4 h-4" />
                <span className="text-[11px] font-black">{currentLanguage === 'ar' ? 'تاريخ التحديث الأخير: يونيو 2026' : 'Last Updated: June 2026'}</span>
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '1. فترة الاسترجاع والاستبدال' : '1. Cancellation & Return Window'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'نقدم لعملائنا الكرام فترة مرنة لاسترجاع أو استبدال المنتجات الملموسة (الدراجات، الخوذات، الإكسسوارات) خلال 14 يوماً من تاريخ استلام الشحنة، بشرط أن يكون المنتج بحالته الأصلية تماماً وغير مستخدم.'
                  : 'We proudly support a flexible 14-day exchange and return policy for physical items (bikes, helmets, gear) from the delivery receipt date, provided items remain brand new and unused.'}
              </p>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '2. الحالات المستثناة من الاسترجاع' : '2. Items Exempted from Returns'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'بسبب طبيعة المنتجات الرقمية (كتيبات الصيانة الإلكترونية، ملفات الدورات التدريبية) التي يتم تسليمها وتحميلها فورياً، فإنها مستثناة تماماً من الاسترجاع والاستبدال بمجرد إتمام الدفع والوصول لملف التحميل.'
                  : 'Due to the instantaneous nature of digital items (E-Books, video modules, manuals) which are delivered and saved instantly to your computer/phone, these items are non-refundable once purchased.'}
              </p>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '3. تكاليف الشحن ورسوم الاسترداد' : '3. Shipping Charges on Return'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'يتحمل العميل رسوم شحن الإرجاع ما لم يكن المنتج تالفاً أو يحتوي على عيب مصنعي واضح، وفي هذه الحالة نتحمل في Ryvo تكاليف الشحن بالكامل لتسليمك بديلاً جديداً.'
                  : 'Customers are responsible for return shipping costs unless the delivered item has a factory defect, in which case Ryvo covers all pickup and replacement fees.'}
              </p>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className={`space-y-4 leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center gap-1.5 text-amber-500">
                <Calendar className="w-4 h-4" />
                <span className="text-[11px] font-black">{currentLanguage === 'ar' ? 'تاريخ التحديث الأخير: يونيو 2026' : 'Last Updated: June 2026'}</span>
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '1. مناطق التوصيل والشحن' : '1. Regional Deliveries'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'نوفر خدمات شحن سريعة وآمنة تشمل جميع مدن المملكة العربية السعودية (الرياض، جدة، الدمام، مكة، المدينة...)، بالإضافة إلى دول مجلس التعاون الخليجي عبر شركاء لوجستيين معتمدين.'
                  : 'We offer express shipping to all cities in Saudi Arabia (Riyadh, Jeddah, Dammam, Mecca, Medina, etc.) as well as GCC countries using verified logistic partners.'}
              </p>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '2. مدة الشحن المتوقعة' : '2. Shipping & Lead Times'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'يتم تجهيز وتسليم الطلبات لشركة الشحن في غضون 24-48 ساعة عمل. تستغرق مدة التوصيل داخل المملكة بين 3 إلى 5 أيام عمل، وللشحن الدولي بين 5 إلى 9 أيام عمل.'
                  : 'Orders are packed and dispatched within 24-48 business hours. Expected transit is 3-5 business days within Saudi Arabia and 5-9 days for international freight.'}
              </p>
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {currentLanguage === 'ar' ? '3. تتبع الشحنة' : '3. Real-Time Tracking'}
              </h3>
              <p>
                {currentLanguage === 'ar'
                  ? 'بمجرد شحن طلبك، ستتلقى رسالة بريد إلكتروني تحتوي على رابط تتبع الشحنة المباشر، لتتمكن من متابعة خط سير الدراجة أو الإكسسوار حتى باب منزلك بكل سهولة.'
                  : 'Once your order is shipped, you will automatically receive a tracking link to follow your motorcycle and premium items safely to your doorstep.'}
              </p>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className={`space-y-6 leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white mb-2">
                  {currentLanguage === 'ar' ? 'تواصل معنا في أي وقت' : 'We are Here to Help'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  {currentLanguage === 'ar'
                    ? 'فريق دعم متجر Ryvo المتخصص جاهز للرد على استفساراتك حول طلبات الدراجات النارية، الخوذات، أو تحميل المنتجات الرقمية على مدار الساعة.'
                    : 'Our specialized support team at Ryvo Store is standing by to assist with your bike orders, custom helmet sizes, or digital download questions 24/7.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-150 dark:border-slate-800/80 flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-xs font-black uppercase text-slate-400 block">{currentLanguage === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</strong>
                    <a href="mailto:ryvo.shopa@gmail.com" className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white hover:text-[var(--primary-color,#38bdf8)] transition-all">
                      ryvo.shopa@gmail.com
                    </a>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-150 dark:border-slate-800/80 flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-xs font-black uppercase text-slate-400 block">{currentLanguage === 'ar' ? 'رقم الهاتف / الدعم' : 'Phone / WhatsApp Support'}</strong>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white font-mono">
                      +966 50 000 0000
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-[var(--primary-color,#38bdf8)]/10 border border-emerald-500/20 rounded-2xl text-center">
                <p className="text-xs font-bold text-slate-700 dark:text-emerald-400">
                  {currentLanguage === 'ar' 
                    ? '⚡ هل تبحث عن إجابات فورية؟ استخدم دردشة الدعم المباشر المتاحة في القائمة العلوية للتحدث الفوري مع الذكاء الاصطناعي ووكيل الدعم !' 
                    : '⚡ Looking for instant assistance? Try using the live Support Chat in the top menu to chat with our intelligent agent right away!'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="p-4 bg-slate-50 dark:bg-[#0A0C10] border-t border-slate-100 dark:border-[#1E293B] text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
          {currentLanguage === 'ar' ? 'Ryvo Store © 2026 جميع الحقوق محفوظة لشركة رايفو المحدودة' : 'Ryvo Store © 2026 All Rights Reserved to Ryvo Co. Ltd'}
        </div>
      </div>
    </div>
  );
}
