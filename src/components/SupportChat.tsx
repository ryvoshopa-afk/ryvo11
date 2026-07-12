import React, { useState, useEffect, useRef } from 'react';
import { useConfirm } from './ConfirmationDialog';
import { Language, User as UserType } from '../types';
import { TRANSLATIONS } from '../constants/translations';
import { INITIAL_PRODUCTS } from '../constants/initialProducts';
import { 
  Send, 
  User, 
  MessageSquare, 
  BadgeCheck, 
  Sparkles, 
  Paperclip, 
  X, 
  Home, 
  FileText, 
  Image as ImageIcon,
  Download,
  Star,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'support';
  text: string;
  time: string;
  clientName?: string;
  clientEmail?: string;
  timestamp: number;
  attachment?: {
    name: string;
    url: string;
    type: 'image' | 'video' | 'file';
  };
}

interface SupportSettings {
  welcomeMessage: string;
  supportName: string;
  supportAvatar: string;
  isAgentOnline: boolean;
  suggestions?: {
    id: string;
    textAr: string;
    textEn: string;
    icon: string;
    isActive: boolean;
    order?: number;
  }[];
}

interface SupportChatProps {
  currentLanguage: Language;
  currentUser: UserType | null;
  onClose?: () => void;
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
              className="inline-flex items-center gap-0.5 text-sky-500 dark:text-sky-400 hover:underline font-bold break-all mx-1 px-1 py-0.5 bg-sky-500/5 dark:bg-sky-400/5 rounded border border-sky-500/10 cursor-pointer"
              title={isRtl ? 'افتح الرابط 🔗' : 'Open Link 🔗'}
              onClick={(e) => e.stopPropagation()}
            >
              <span>{part}</span>
              <svg className="w-3.5 h-3.5 shrink-0 inline ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
                    className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 bg-amber-500/10 dark:bg-amber-500/20 text-amber-650 dark:text-amber-400 font-mono text-[11px] font-extrabold rounded border border-amber-500/25 cursor-pointer hover:bg-amber-500/20 dark:hover:bg-amber-500/30 active:scale-95 transition-all shadow-sm"
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

export default function SupportChat({ currentLanguage, currentUser, onClose }: SupportChatProps) {
  const t = TRANSLATIONS[currentLanguage];
  const isRtl = currentLanguage === 'ar';
  const { confirm } = useConfirm();

  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const savedId = (currentUser ? currentUser.email : (localStorage.getItem('ryvo_support_guest_id') || '')).toLowerCase().trim();
      if (savedId) {
        const saved = localStorage.getItem(`ryvo_support_messages_${savedId}`);
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });
  const [inputText, setInputText] = useState('');
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [guestName, setGuestName] = useState(() => localStorage.getItem('ryvo_guest_name') || '');
  const [selectedFile, setSelectedFile] = useState<{ name: string; url: string; type: 'image' | 'video' | 'file' } | null>(null);
  const [convStatus, setConvStatus] = useState<string>('active');
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [isRatedSubmitted, setIsRatedSubmitted] = useState<boolean>(false);
  
  // Settings and active suggestions
  const [settings, setSettings] = useState<SupportSettings>({
    welcomeMessage: isRtl ? 'مرحباً بك في رايفو! كيف يمكنني مساعدتك؟' : 'Welcome to Ryvo! How can I assist you?',
    supportName: isRtl ? 'ريم (الدعم المالي والتقني)' : 'Reem (Support Representative)',
    supportAvatar: '💡',
    isAgentOnline: false,
    suggestions: []
  });

  const [showSuggestionsMenu, setShowSuggestionsMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive conversation ID based on current user email or guest ID (always lowercase and trimmed)
  const conversationId = (currentUser ? currentUser.email : (localStorage.getItem('ryvo_support_guest_id') || (() => {
    const newId = `guest-${Math.random().toString(36).substr(2, 9)}@ryvo.co`;
    localStorage.setItem('ryvo_support_guest_id', newId);
    return newId;
  })())).toLowerCase().trim();

  // Load support settings & initialize chat session
  useEffect(() => {
    let active = true;

    // Sync with local storage immediately when conversationId changes to prevent visual layout flicker
    const backupKey = `ryvo_support_messages_${conversationId}`;
    try {
      const localSaved = localStorage.getItem(backupKey);
      if (localSaved) {
        setMessages(JSON.parse(localSaved));
      } else {
        setMessages([]);
      }
    } catch (e) {
      setMessages([]);
    }

    // 1. Fetch system support settings
    fetch('/api/support/settings')
      .then(res => res.json())
      .then(data => {
        if (active && data && data.welcomeMessage) {
          setSettings(data);
        }
      })
      .catch(err => console.error("Error loading support settings:", err));

    // 2. Fetch or create active conversation from server
    const fetchConversation = () => {
      fetch(`/api/support/conversations/${encodeURIComponent(conversationId)}`)
        .then(res => res.json())
        .then(data => {
          if (!active) return;
          if (data && data.messages) {
            let finalMessages = data.messages;
            setMessages(prev => {
              // Avoid race condition where older server messages overwrite recent optimistic local messages
              const missingOptimistic = prev.filter(m => m.id.startsWith('msg-') && !data.messages.some((dm: any) => dm.id === m.id));
              if (missingOptimistic.length > 0) {
                const merged = [...data.messages];
                missingOptimistic.forEach(m => {
                  if (!merged.some(dm => dm.text === m.text)) {
                    merged.push(m);
                  }
                });
                finalMessages = merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                return finalMessages;
              }
              return data.messages;
            });
            // Save to local storage backup
            localStorage.setItem(backupKey, JSON.stringify(finalMessages));
            setConvStatus(data.status || 'active');
            
            // Check if admin is typing
            if (data.supportTypingUntil && data.supportTypingUntil > Date.now()) {
              setIsAdminTyping(true);
            } else {
              setIsAdminTyping(false);
            }
          }
        })
        .catch(err => console.error("Error fetching conversation state:", err));
    };

    fetchConversation();
    const interval = setInterval(fetchConversation, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAdminTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper to push typing notification to server
  const handleInputKeyDown = () => {
    fetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: 'user' })
    }).catch(() => {});
  };

  const handleSend = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    
    const textToSend = customText !== undefined ? customText : inputText;
    if (!textToSend.trim() && !selectedFile) return;

    // Dynamically parse client environment details from userAgent
    const ua = window.navigator.userAgent;
    let detectedDevice = 'Desktop';
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) {
      detectedDevice = /Tablet|iPad/i.test(ua) ? 'Tablet' : 'Mobile';
    }
    
    let detectedOs = 'Windows';
    if (/Macintosh|Mac OS X/i.test(ua)) detectedOs = 'macOS';
    else if (/Android/i.test(ua)) detectedOs = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) detectedOs = 'iOS';
    else if (/Linux/i.test(ua)) detectedOs = 'Linux';

    let detectedBrowser = 'Chrome';
    if (/Firefox/i.test(ua)) detectedBrowser = 'Firefox';
    else if (/Chrome/i.test(ua)) detectedBrowser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) detectedBrowser = 'Safari';
    else if (/Edg/i.test(ua)) detectedBrowser = 'Edge';

    // Build user message body with real detected metadata
    const payload = {
      message: textToSend,
      sender: 'user',
      clientName: currentUser ? currentUser.name : (guestName.trim() || (isRtl ? 'عميل زائر' : 'Guest Customer')),
      clientEmail: currentUser ? currentUser.email : conversationId,
      clientPhone: currentUser?.phone || '',
      country: 'SA',
      language: currentLanguage,
      device: detectedDevice,
      os: detectedOs,
      browser: detectedBrowser,
      ip: '127.0.0.1', // Server will override with actual client IP if available
      attachment: selectedFile || undefined
    };

    // Optimistic local state update
    const tempUserMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      clientName: payload.clientName,
      clientEmail: payload.clientEmail,
      attachment: selectedFile || undefined
    };

    setMessages(prev => {
      const updated = [...prev, tempUserMsg];
      const backupKey = `ryvo_support_messages_${conversationId}`;
      localStorage.setItem(backupKey, JSON.stringify(updated));
      return updated;
    });
    setInputText('');
    setSelectedFile(null);
    setShowSuggestionsMenu(false);

    // Call server API
    fetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.conversation) {
          setMessages(data.conversation.messages);
          setConvStatus(data.conversation.status || 'active');
          const backupKey = `ryvo_support_messages_${conversationId}`;
          localStorage.setItem(backupKey, JSON.stringify(data.conversation.messages));
        }
      })
      .catch(err => {
        console.error("Failed to deliver message via API:", err);
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSelectedFile({
          name: file.name,
          url: reader.result,
          type: isImage ? 'image' : (isVideo ? 'video' : 'file')
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Chat Rating submit handler
  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: ratingInput,
          ratingComment: ratingComment
        })
      });
      if (res.ok) {
        setIsRatedSubmitted(true);
        setConvStatus('active'); // Re-enable default active screen with fresh session
      }
    } catch (err) {
      console.error("Failed to submit rating:", err);
    }
  };

  // Default fallback suggestions if admin has defined none
  const defaultSuggestions = [
    { textAr: '📦 أين طلبي؟', textEn: '📦 Where is my order?', icon: '📦' },
    { textAr: '🚚 تتبع الشحنة', textEn: '🚚 Track shipping', icon: '🚚' },
    { textAr: '🔄 سياسة الاستبدال والاسترجاع', textEn: '🔄 Return & exchange policy', icon: '🔄' },
    { textAr: '💳 وسائل الدفع والتقسيط', textEn: '💳 Payment & installments', icon: '💳' },
    { textAr: '🛡️ الضمان الذهبي للجودة', textEn: '🛡️ Quality guarantee warranty', icon: '🛡️' }
  ];

  // Merge admin-defined suggestions or fallback
  const activeSuggestions = settings.suggestions && settings.suggestions.length > 0
    ? settings.suggestions.filter(s => s.isActive)
    : defaultSuggestions.map((s, idx) => ({
        id: `def-${idx}`,
        textAr: s.textAr,
        textEn: s.textEn,
        icon: s.icon,
        isActive: true,
        order: idx
      }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 text-slate-800 dark:text-gray-100 font-sans">
      <div className="bg-white dark:bg-[#11141D] w-full h-full sm:h-[92vh] sm:max-w-5xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 relative">
        
        {/* Fullscreen Header area */}
        <div className="bg-[#1E293B] dark:bg-black p-4 sm:p-6 text-white relative overflow-hidden flex-shrink-0 flex items-center justify-between border-b border-slate-200 dark:border-white/5">
          <div className="absolute right-0 top-0 w-80 h-80 bg-[var(--primary-color,#38bdf8)]/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className={`relative flex items-center gap-3 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
            <button 
              type="button"
              onClick={onClose}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-all hover:scale-105 active:scale-95"
              title={isRtl ? 'إغلاق والعودة للمتجر' : 'Close and go back'}
            >
              <Home className="w-5 h-5 text-[var(--primary-color,#38bdf8)]" />
            </button>
            
            <div className={`space-y-0.5 text-left ${isRtl ? 'sm:text-right' : 'sm:text-left'}`}>
              <h2 className="text-sm sm:text-base font-black bg-gradient-to-r from-[var(--primary-color,#38bdf8)] to-amber-400 bg-clip-text text-transparent flex items-center gap-1.5 justify-start">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{isRtl ? 'مساعد الدعم الذكي من رايفو ✨' : 'Ryvo Smart Virtual Assistant ✨'}</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold leading-none text-right">
                {isRtl 
                  ? `أهلاً بك يا ${currentUser ? currentUser.name : 'زائرنا العزيز'} • خدمة فورية مدار الساعة` 
                  : `Welcome, ${currentUser ? currentUser.name : 'Guest'} • Prompt support 24/7`}
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="p-2 sm:p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all text-xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Guest name entry bar if guest */}
        {!currentUser && (
          <div className="bg-amber-500/5 dark:bg-amber-550/10 border-b border-slate-150 dark:border-slate-850 p-2.5 flex items-center justify-center gap-3 text-right">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-sans">
              👤 {isRtl ? 'اسمك الكريم (ليظهر لدى موظفي الدعم):' : 'Your name (shows on support admin panel):'}
            </span>
            <input
              type="text"
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                localStorage.setItem('ryvo_guest_name', e.target.value);
              }}
              placeholder={isRtl ? 'أدخل اسمك الكريم...' : 'Enter your name...'}
              className="px-3 py-1 bg-white dark:bg-[#0A0C10] border border-slate-205 dark:border-slate-800 text-base md:text-xs font-black rounded-lg text-slate-850 dark:text-gray-100 outline-none w-48 transition-all focus:border-amber-400 text-center font-sans"
            />
          </div>
        )}

        {/* Handover notification if status is waiting for human agent */}
        {convStatus === 'waiting' && (
          <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-b border-amber-500/20 p-3 text-right flex items-center gap-2 px-6 justify-start">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-sans">
              ⚠️ {isRtl 
                ? 'جاري ربطك بموظف الدعم البشري الآن، يرجى الانتظار ومواصلة الكتابة...' 
                : 'Connecting you with a live human representative, please hold on...'}
            </p>
          </div>
        )}

        {/* Main Content Area */}
        {convStatus === 'resolved' ? (
          /* Polished, world-class Conversation Rating screen */
          <div className="flex-1 overflow-y-auto p-6 sm:p-12 flex flex-col items-center justify-center space-y-6 text-center bg-slate-50 dark:bg-[#0C0F16]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center text-3xl">
              🌟
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {isRtl ? 'نشكرك على تواصلك مع رايفو! ❤️' : 'Thank you for contacting Ryvo! ❤️'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                {isRtl 
                  ? 'تم إغلاق المحادثة وحل تساؤلك بنجاح بواسطة المنسق. يرجى التكرم بتقييم مستوى الخدمة لمساعدتنا في التطوير الدائم.' 
                  : 'The chat has been closed by our representative. Please rate your experience below.'}
              </p>
            </div>

            <form onSubmit={handleRatingSubmit} className="w-full max-w-sm bg-white dark:bg-[#11141D] p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-xl space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">
                  {isRtl ? 'درجة الرضا عن الخدمة ⭐' : 'Satisfaction Rating ⭐'}
                </label>
                <div className="flex items-center justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingInput(star)}
                      className="p-1 cursor-pointer transform hover:scale-125 transition-all"
                    >
                      <Star 
                        className={`w-7 h-7 ${
                          star <= ratingInput 
                            ? 'text-amber-400 fill-amber-400' 
                            : 'text-slate-200 dark:text-slate-700'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black uppercase text-slate-400 block text-right">
                  {isRtl ? 'تعليقك أو مقترحاتك الإضافية (اختياري) 📝' : 'Feedback comment (Optional) 📝'}
                </label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder={isRtl ? 'مثال: خدمة رائعة وسريعة جداً!' : 'e.g. Extremely friendly and helpful support!'}
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border bg-slate-50 dark:bg-[#0A0C10] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white outline-none focus:border-amber-400 text-right font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all hover:scale-103 active:scale-97"
              >
                {isRtl ? 'إرسال التقييم وإنهاء الجلسة 📥' : 'Submit Rating & Close'}
              </button>
            </form>
          </div>
        ) : (
          /* Active Chat Log visualizer */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50 dark:bg-[#0C0F16] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-850">
            {messages.length === 0 ? (
              <div className="text-center py-24 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="text-xs text-slate-400 font-bold">
                  {isRtl ? 'جاري الاتصال بقاعدة بيانات الدعم...' : 'Initializing support database...'}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isSupport = msg.sender === 'support';
                return (
                  <div 
                    key={msg.id} 
                    className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${
                      isSupport 
                        ? isRtl ? 'mr-0 ml-auto flex-row' : 'mr-auto ml-0 flex-row-reverse' 
                        : isRtl ? 'mr-auto ml-0 flex-row-reverse' : 'mr-0 ml-auto flex-row'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border shadow-sm ${
                      isSupport 
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-500' 
                        : 'bg-[var(--primary-color,#38bdf8)]/10 border-[var(--primary-color,#38bdf8)]/25 text-[var(--primary-color,#38bdf8)]'
                    }`}>
                      {isSupport ? <BadgeCheck className="w-4 h-4 fill-amber-500/10" /> : <User className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className={`p-4 rounded-3xl text-sm font-semibold leading-relaxed shadow-sm block text-right ${
                        isSupport 
                          ? 'bg-white dark:bg-[#11141D] text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-850' 
                          : 'bg-[var(--primary-color,#38bdf8)] text-slate-950 rounded-tr-none font-black'
                      }`}>
                        
                        {/* Interactive media and dynamic files attachment parser */}
                        {msg.attachment && (
                          <div className="mb-3 max-w-sm rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm bg-black/5 dark:bg-black/30 p-1.5">
                            {msg.attachment.type === 'image' ? (
                              <img 
                                src={msg.attachment.url} 
                                alt={msg.attachment.name} 
                                width={300}
                                height={200}
                                loading="lazy"
                                className="max-h-48 w-full object-cover rounded-lg cursor-zoom-in" 
                                referrerPolicy="no-referrer"
                                onClick={() => window.open(msg.attachment?.url, '_blank')}
                              />
                            ) : msg.attachment.type === 'video' ? (
                              <video 
                                src={msg.attachment.url} 
                                controls 
                                className="max-h-48 w-full object-contain rounded-lg"
                              />
                            ) : (
                              <div className="flex items-center justify-between gap-3 p-2 bg-white/10 rounded-lg text-xs font-mono">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="truncate underline">{msg.attachment.name}</span>
                                </div>
                                <a 
                                  href={msg.attachment.url} 
                                  download={msg.attachment.name}
                                  className="p-1 rounded bg-black/20 hover:bg-black/40 text-current cursor-pointer transition-all"
                                  title="تنزيل الملف"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="font-sans whitespace-pre-wrap">
                          {renderInteractiveText(msg.text, isRtl, (copiedCode) => {
                            setCopyToast(copiedCode);
                            setTimeout(() => setCopyToast(null), 2000);
                          })}
                        </p>
                      </div>
                      <span className={`text-[9px] text-slate-400 font-bold block px-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                        {!isSupport && msg.clientName ? `${msg.clientName} • ` : ''}{msg.time}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {isAdminTyping && (
              <div className={`flex gap-3 max-w-[50%] mr-0 ml-auto ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 flex-shrink-0 flex items-center justify-center border text-slate-400">
                  <MessageSquare className="w-4 h-4 text-emerald-500 animate-bounce" />
                </div>
                <div className="bg-white dark:bg-[#11141D] p-4 rounded-3xl rounded-tl-none border border-slate-100 dark:border-slate-850 text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mr-1 font-sans">يكتب الآن...</span>
                  <span className="w-1.5 h-1.5 bg-slate-850 dark:bg-slate-600 rounded-full animate-bounce duration-300" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce duration-300" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-450 dark:bg-slate-400 rounded-full animate-bounce duration-300" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Floating Suggestions Modal / Menu, only toggled by the dedicated Suggestions button */}
        {showSuggestionsMenu && (
          <div className="absolute inset-x-0 bottom-[84px] bg-white dark:bg-[#11141D] border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-40 max-h-[300px] overflow-y-auto font-sans animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-3 text-right">
              <button 
                type="button"
                onClick={() => setShowSuggestionsMenu(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                {isRtl ? 'إغلاق ❌' : 'Close ❌'}
              </button>
              <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <span>💡 الاقتراحات السريعة المتاحة</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeSuggestions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const txt = isRtl ? opt.textAr : opt.textEn;
                    handleSend(undefined, txt);
                  }}
                  className="p-3 bg-slate-50 dark:bg-[#0A0C10] hover:bg-emerald-500 hover:text-slate-950 dark:hover:text-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200/85 dark:border-slate-800 hover:border-emerald-500 transition-all cursor-pointer text-right flex items-center gap-2 justify-end font-sans"
                >
                  <span className="line-clamp-2 leading-tight">{isRtl ? opt.textAr : opt.textEn}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload Attachment Bar, shown when a file is ready to send */}
        {selectedFile && (
          <div className="bg-slate-50 dark:bg-[#131722] p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 animate-in slide-in-from-bottom-2 duration-150 relative z-30">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
              {selectedFile.type === 'image' ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <span className="truncate max-w-xs">{selectedFile.name} (جاهز للإرفاق 📎)</span>
            </div>
            <button 
              type="button" 
              onClick={removeSelectedFile}
              className="text-slate-400 hover:text-rose-500 p-1 rounded-full bg-slate-200 dark:bg-slate-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Controls form with dedicated Suggestions button */}
        {convStatus !== 'resolved' && (
          <div className="bg-white dark:bg-[#11141D] border-t border-slate-200 dark:border-slate-805 p-3 sm:p-5 flex-shrink-0 relative z-30">
            <form onSubmit={(e) => handleSend(e)} className="flex gap-2 items-center">
              
              {/* Native hidden file input */}
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,video/*,application/pdf,.zip,.rar"
                className="hidden"
              />

              {/* Paperclip attachment trigger */}
              <button
                id="support-paperclip-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-550 dark:text-slate-450 hover:text-[var(--primary-color,#38bdf8)] rounded-2xl cursor-pointer hover:scale-103 active:scale-97 transition-all shadow-sm flex-shrink-0"
                title={isRtl ? 'إرفاق ملف أو صورة 📎' : 'Attach document, video or image 📎'}
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                id="chat-input-text-field"
                type="text"
                placeholder={isRtl ? 'اكتب رسالتك لمدير الدعم هنا أو ارفق ملفاتك...' : 'Type message here or attach dynamic support files...'}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  handleInputKeyDown();
                }}
                className={`flex-1 p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 focus:border-[var(--primary-color,#38bdf8)] focus:ring-1 focus:ring-[var(--primary-color,#38bdf8)] text-base md:text-xs font-semibold rounded-2xl text-slate-800 dark:text-gray-100 outline-none transition-all ${
                  isRtl ? 'text-right font-sans' : 'text-left font-sans'
                }`}
              />

              <button
                id="chat-submit-btn"
                type="submit"
                disabled={!inputText.trim() && !selectedFile}
                className="p-3.5 bg-[var(--primary-color,#38bdf8)] disabled:bg-slate-200 dark:disabled:bg-slate-900 text-slate-950 disabled:text-slate-400 rounded-2xl cursor-pointer hover:scale-103 active:scale-97 transition-all shadow-md focus:outline-none flex-shrink-0 font-black"
              >
                <Send className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </form>

            {/* Dedicated suggestions trigger positioned directly below typing box */}
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100 dark:border-slate-850">
              <button
                type="button"
                onClick={() => setShowSuggestionsMenu(!showSuggestionsMenu)}
                className={`px-4 py-1.5 rounded-xl font-black text-[11px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm select-none ${
                  showSuggestionsMenu
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>💡 الاقتراحات السريعة</span>
              </button>

              <div className="text-[9.5px] text-slate-400 font-semibold font-sans">
                🔒 {isRtl ? 'جلسة مشفرة وآمنة بالكامل لحماية خصوصيتك.' : 'Encrypted support session ensuring data protection.'}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating Copy Confirmation Toast */}
      {copyToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-black py-3 px-5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200 font-sans">
          <svg className="w-4 h-4 shrink-0 text-emerald-400 dark:text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>
            {isRtl ? `تم النسخ بنجاح: ${copyToast}` : `Successfully copied: ${copyToast}`}
          </span>
        </div>
      )}
    </div>
  );
}
