import React from 'react';
import { Language, User, SimulatedEmail } from '../types';
import { TRANSLATIONS } from '../constants/translations';
import { X, ShieldAlert, Key, Mail, Sparkles, UserCheck, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

// Seeding standard registered users helper
const getRegisteredUsers = (): User[] => {
  const saved = localStorage.getItem('ryvo_registered_users');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
  }
  const defaultUsers: User[] = [
    {
      email: 'ryvo.shopa@gmail.com',
      name: 'أدمن رايفو',
      role: 'admin',
      favorites: [],
      password: '123456'
    },
    {
      email: 'customer@example.com',
      name: 'أحمد الغامدي',
      role: 'customer',
      favorites: [],
      password: '123456'
    }
  ];
  localStorage.setItem('ryvo_registered_users', JSON.stringify(defaultUsers));
  return defaultUsers;
};

const saveRegisteredUsers = (users: User[]) => {
  localStorage.setItem('ryvo_registered_users', JSON.stringify(users));
};

const sendSimulatedEmail = (to: string, subject: string, body: string) => {
  const saved = localStorage.getItem('ryvo_customer_emails');
  let emails: SimulatedEmail[] = [];
  if (saved) {
    try {
      emails = JSON.parse(saved);
    } catch (e) {
      // ignore
    }
  }
  const newEmail: SimulatedEmail = {
    id: `EMAIL-${Math.floor(1000 + Math.random() * 9000)}`,
    to: to.toLowerCase().trim(),
    subject,
    body,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    read: false
  };
  emails.unshift(newEmail);
  localStorage.setItem('ryvo_customer_emails', JSON.stringify(emails));
};

interface AuthModalProps {
  currentLanguage: Language;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export default function AuthModal({
  currentLanguage,
  onClose,
  onAuthSuccess
}: AuthModalProps) {
  const t = TRANSLATIONS[currentLanguage];
  const isRtl = currentLanguage === 'ar';

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanEmail = email.toLowerCase().trim();

    if (authMode === 'forgot') {
      if (!cleanEmail) {
        setFeedback({ type: 'error', text: t.error_empty_fields });
        return;
      }

      // Simulated recovery process
      const users = getRegisteredUsers();
      const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        const foundPassword = existingUser.password || '123456';
        sendSimulatedEmail(
          cleanEmail,
          isRtl ? 'استعادة كلمة المرور لمتجر رايفو 🔑' : 'Password Recovery - Ryvo Store 🔑',
          isRtl 
            ? `أهلاً بك ${existingUser.name}،\n\nلقد تلقينا طلباً لاستعادة كلمة المرور الخاصة بك.\nكلمة السر الحالية لحسابك هي: [ ${foundPassword} ]\n\nيرجى استخدامها لتسجيل الدخول بأمان وتغييرها من لوحة التحكم في أي وقت.\n\nطاب يومك بكل خير،\nفريق دعم رايفو الفاخر.`
            : `Hello ${existingUser.name},\n\nWe received a request to recover your password.\nYour current password is: [ ${foundPassword} ]\n\nPlease use it to login securely and modify it from your dashboard in settings at any time.\n\nBest regards,\nRyvo Store Support Team.`
        );
        setFeedback({
          type: 'success',
          text: isRtl 
            ? `تم إرسال كلمة المرور بنجاح إلى بريدك الإلكتروني! تفقد صندوق الرسائل الواردة بصفحة "البريد الوارد" في حسابك. كلمة مرورك هي: ${foundPassword}`
            : `Your password has been retrieved and sent to your email successfully! Check your "Virtual Inbox" tab. Password: ${foundPassword}`
        });
      } else {
        // Create user with temp password and send mail
        const tempPass = `ryvo-${Math.floor(1000 + Math.random() * 9000)}`;
        const namePart = cleanEmail.split('@')[0];
        const newCustName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        const newUser: User = {
          email: cleanEmail,
          name: newCustName,
          role: 'customer',
          favorites: [],
          password: tempPass
        };
        const updatedUsers = [...users, newUser];
        saveRegisteredUsers(updatedUsers);

        sendSimulatedEmail(
          cleanEmail,
          isRtl ? 'حساب جديد وكلمة المرور المؤقتة لمتجر رايفو 🚀' : 'New Account Temp Password - Ryvo Store 🚀',
          isRtl 
            ? `أهلاً بك ${newCustName}،\n\nقمنا بإنشاء حساب تلقائي لك وإعداد كلمة مرور جديدة بطلبك.\nكلمة المرور المؤقتة هي: [ ${tempPass} ]\n\nطاب يومك بكل خير،\nفريق دعم رايفو.`
            : `Hello ${newCustName},\n\nWe initialized a new profile and generated a secure password for you.\nYour temporary password is: [ ${tempPass} ]\n\nHave a great day!\nSupport Team.`
        );

        setFeedback({
          type: 'success',
          text: isRtl 
            ? `لم نعثر على بريد مسجل، قمنا بإنشاء حساب وإرسال كلمة السر المؤقتة إليه! بريدك الوارد تصله كلمة السر: ${tempPass}`
            : `Email not registered. We set up an account and generated a temp password: ${tempPass}. Check your Inbox!`
        });
      }
      return;
    }

    if (!cleanEmail || !password.trim() || (authMode === 'register' && !fullname.trim())) {
      setFeedback({ type: 'error', text: t.error_empty_fields });
      return;
    }

    const registeredList = getRegisteredUsers();

    // Check credentials simulation
    if (authMode === 'login') {
      let match = registeredList.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
      
      // Extra fallback check to allow registered affiliates to log in directly
      if (!match) {
        try {
          const savedAff = localStorage.getItem('ryvo_affiliates');
          if (savedAff) {
            const parsed = JSON.parse(savedAff);
            const foundAff = parsed.find((a: any) => a.email.toLowerCase() === cleanEmail && a.password === password);
            if (foundAff) {
              match = {
                email: foundAff.email,
                name: foundAff.name,
                role: 'affiliate',
                favorites: [],
                password: foundAff.password,
                phone: foundAff.phone || ''
              };
              const updatedList = [...registeredList, match];
              saveRegisteredUsers(updatedList);
            }
          }
        } catch (_) {}
      }

      if (match) {
        if (match.role === 'customer') {
          const award = 3;
          match.points = (match.points || 0) + award;
          if (!match.points_history) match.points_history = [];
          match.points_history.unshift({
            id: `pt-log-${Math.floor(Math.random() * 89999)}`,
            reason_ar: 'مكافأة نقاط تسجيل الدخول اليومي للمتجر 🪙',
            reason_en: 'Daily store loyalty login points reward 🪙',
            points: award,
            date: new Date().toISOString().split('T')[0]
          });

          // Save back to list
          const newList = registeredList.map(u => u.email.toLowerCase() === match.email.toLowerCase() ? match : u);
          saveRegisteredUsers(newList);
        }

        setFeedback({ 
          type: 'success', 
          text: match.role === 'admin' 
            ? t.auth_success_admin 
            : match.role === 'affiliate'
              ? (currentLanguage === 'ar' ? 'تم تسجيل دخول الشريك المسوق بنجاح! 💸' : 'Affiliate partner logged in successfully! 💸')
              : t.auth_success_customer 
        });
        setTimeout(() => {
          onAuthSuccess(match);
          onClose();
        }, 1200);
      } else {
        // Failback admin check to respect the default hardcoded check
        if (cleanEmail === 'ryvo.shopa@gmail.com' && password === '123456') {
          const defaultAdmin = registeredList.find(u => u.email.toLowerCase() === 'ryvo.shopa@gmail.com') || {
            email: 'ryvo.shopa@gmail.com',
            name: 'أدمن رايفو',
            role: 'admin',
            favorites: [],
            password: '123456'
          };
          setFeedback({ type: 'success', text: t.auth_success_admin });
          setTimeout(() => {
            onAuthSuccess(defaultAdmin);
            onClose();
          }, 1200);
        } else {
          setFeedback({
            type: 'error',
            text: isRtl 
              ? 'يبدو أن البريد الإلكتروني أو كلمة المرور غير صحيحة! يرجى التحقق وإعادة المحاولة أو استعادتها.' 
              : 'Login failed. Invalid email address or password combination!'
          });
        }
      }
    } else {
      // Sign-Up registration simulation
      const dupe = registeredList.some(u => u.email.toLowerCase() === cleanEmail);
      if (dupe) {
        setFeedback({
          type: 'error',
          text: isRtl ? 'هذا البريد الإلكتروني مسجل بالفعل لمستخدم أخر!' : 'Email already linked to another active account!'
        });
        return;
      }

      const roleType = cleanEmail === 'ryvo.shopa@gmail.com' ? 'admin' : 'customer';
      const newRegisteredUser: User = {
        email: cleanEmail,
        name: fullname,
        role: roleType,
        favorites: [],
        password: password,
        token: `token-user-${Math.floor(Math.random() * 8999)}`,
        points: roleType === 'customer' ? 35 : 0,
        points_history: roleType === 'customer' ? [
          {
            id: `pt-wel-${Math.floor(Math.random() * 89999)}`,
            reason_ar: 'الهدية الترحيبية لتسجيل حساب جديد بمتجر رايفو 🎉',
            reason_en: 'Welcome bonus gift for registering our new Ryvo account 🎉',
            points: 35,
            date: new Date().toISOString().split('T')[0]
          }
        ] : []
      };

      const newList = [...registeredList, newRegisteredUser];
      saveRegisteredUsers(newList);

      setFeedback({ type: 'success', text: currentLanguage === 'ar' ? 'تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...' : 'Account created successfully! Logging you in.' });
      setTimeout(() => {
        onAuthSuccess(newRegisteredUser);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"></div>

      {/* Dialog container */}
      <div id="auth-form-dialog" className="relative bg-white dark:bg-[#11141D] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 sm:p-8 border border-slate-150 dark:border-[#1E293B] animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-gray-100">
        
        {/* Close button */}
        <button
          id="btn-auth-close"
          onClick={onClose}
          className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} p-2 rounded-full bg-slate-50 hover:bg-[var(--primary-color)] hover:text-slate-950 dark:bg-slate-900 dark:hover:bg-[var(--primary-color)] dark:hover:text-[#0A0C10] transition-all cursor-pointer`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="space-y-2 text-center pb-4">
          <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
            {authMode === 'login' ? t.login : authMode === 'register' ? t.register : (isRtl ? 'استعادة كلمة المرور' : 'Recover Password')}
          </h2>
          <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-relaxed">
            {authMode === 'forgot' 
              ? (isRtl ? 'أدخل بريدك الإلكتروني وسنرسل لك كلمة المرور فوراً' : 'Enter your registered email and we will locate and send your credentials')
              : t.welcome_text}
          </p>
        </div>

        {/* Alert Feedback messaging */}
        {feedback && (
          <div className={`p-4 rounded-xl text-xs font-bold ${
            feedback.type === 'error' 
              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
              : 'bg-[var(--primary-color, #38bdf8)]/10 text-[var(--primary-color, #38bdf8)] border border-[var(--primary-color, #38bdf8)]/20'
          } mb-4 text-center`}>
            {feedback.type === 'success' && <UserCheck className="w-4 h-4 inline-block align-middle me-1" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name for register */}
          {authMode === 'register' && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{t.fullname_label}</label>
              <input
                id="auth-reg-fullname"
                type="text"
                required
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className={`w-full text-base md:text-xs px-3.5 py-3 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-800 dark:text-white outline-none transition-all ${
                  isRtl ? 'text-right' : 'text-left'
                }`}
              />
            </div>
          )}

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{t.email_label}</label>
            <div className="relative">
              <div className={`absolute inset-y-0 ${isRtl ? 'left-3' : 'right-3'} flex items-center pointer-events-none text-slate-400`}>
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full text-base md:text-xs py-3 px-3.5 pr-10 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all ${
                  isRtl ? 'text-right pr-3.5 pl-10' : 'text-left pr-10 pl-3.5'
                }`}
              />
            </div>
          </div>

          {/* Password */}
          {authMode !== 'forgot' && (
            <div className="space-y-1 font-sans">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">{t.password_label}</label>
              <div className="relative font-sans">
                <div className={`absolute inset-y-0 ${isRtl ? 'left-3' : 'right-3'} flex items-center pointer-events-none text-slate-400`}>
                  <Key className="w-4 h-4" />
                </div>
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-base md:text-xs py-3 px-10 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-transparent focus:border-[var(--primary-color, #38bdf8)] focus:bg-white dark:focus:bg-black text-slate-850 dark:text-white outline-none transition-all placeholder-slate-400 text-center"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 ${isRtl ? 'right-3' : 'left-3'} flex items-center text-slate-400 hover:text-[var(--primary-color)] transition-colors`}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Action button */}
          <button
            id="btn-auth-submit"
            type="submit"
            className="w-full py-3.5 bg-[var(--primary-color)] hover:opacity-90 hover:shadow-[0_0_15px_rgba(var(--primary-color-rgb,56,189,248),0.3)] text-slate-950 font-black rounded-xl transition-all cursor-pointer text-xs uppercase"
          >
            {authMode === 'login' ? t.login : authMode === 'register' ? t.register : (isRtl ? 'إرسال كلمة المرور 📩' : 'Submit Recovery 📩')}
          </button>
        </form>

        {/* Change auth mode */}
        <div className="flex flex-col gap-2 items-center justify-center pt-5 border-t border-slate-100 dark:border-slate-200 mt-5">
          {authMode === 'login' && (
            <button
              id="btn-auth-forgot-trigger"
              onClick={() => { setFeedback(null); setAuthMode('forgot'); }}
              className="text-[10px] font-bold uppercase text-amber-500 hover:underline cursor-pointer"
            >
              {isRtl ? 'هل نسيت كلمة المرور؟ 🔑' : 'Forgot Password? 🔑'}
            </button>
          )}

          <button
            id="btn-auth-mode-swap"
            onClick={() => {
              setFeedback(null);
              if (authMode === 'forgot') {
                setAuthMode('login');
              } else {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
              }
            }}
            className="text-[10px] font-black uppercase text-[var(--primary-color, #38bdf8)] hover:underline cursor-pointer transition-colors"
          >
            {authMode === 'forgot'
              ? (isRtl ? 'العودة لتسجيل الدخول 🔙' : 'Back to Login 🔙')
              : authMode === 'login' ? t.dont_have_acc : t.already_have_acc}
          </button>
        </div>



      </div>
    </div>
  );
}
