import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language, User as UserType } from '../types';
import { TRANSLATIONS } from '../constants/translations';
import socket from '../utils/socket';
import {
  Send, User, MessageSquare, BadgeCheck, Sparkles, Paperclip, X,
  Home, FileText, Image as ImageIcon, Star, CheckCircle2,
  Mic, MicOff, StopCircle, Bot, UserCheck, PhoneCall, AlertTriangle
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  sender: 'user' | 'support';
  sender_type?: 'customer' | 'ai' | 'agent' | 'system';
  text: string;
  time: string;
  timestamp: number;
  isInternal?: boolean;
  attachment?: { name: string; url: string; type: 'image' | 'audio' | 'file' };
}

interface SupportSettings {
  welcomeMessage: string;
  supportName: string;
  supportAvatar: string;
  isAgentOnline: boolean;
  suggestions?: { id: string; textAr: string; textEn: string; icon: string; isActive: boolean; order?: number }[];
}

type ConvStatus = 'AI_HANDLING' | 'PENDING_CUSTOMER_APPROVAL' | 'QUEUED_FOR_HUMAN' | 'HUMAN_HANDLING' | 'CLOSED' | 'active' | 'waiting' | 'resolved';

interface SupportChatProps {
  currentLanguage: Language;
  currentUser: UserType | null;
  onClose?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function renderInteractiveText(text: string, isRtl: boolean, onCopySuccess: (c: string) => void) {
  if (!text) return null;
  const EXCLUDE = new Set(['HTML','CSS','SAR','USD','AED','EUR','GMT','UTC','AM','PM','OK','INFO','AI','JSON','API','VITE','NODE','CJS','ESM','TODO','WIFI','FAQ','IP','URL','ID','PDF','JPEG','PNG','SVG','CJ','APP','CHAT','ADMIN']);
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          const href = part.toLowerCase().startsWith('www.') ? 'https://' + part : part;
          return <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline font-bold mx-1">{part}</a>;
        }
        const codeRegex = /(`[^`]+`|\b[A-Z0-9_-]{4,15}\b)/g;
        const sub = part.split(codeRegex);
        return (
          <span key={i}>
            {sub.map((s, j) => {
              const isBt = s.startsWith('`') && s.endsWith('`');
              const clean = isBt ? s.slice(1, -1) : s;
              const isCode = isBt || (s.match(/^[A-Z0-9_-]{4,15}$/) && !EXCLUDE.has(s.toUpperCase()) && /[A-Z]/.test(s));
              if (isCode && clean.trim()) {
                return (
                  <button key={j} type="button" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(clean.trim()).then(() => onCopySuccess(clean.trim())); }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-amber-500/10 text-amber-400 font-mono text-[11px] font-bold rounded border border-amber-500/25 cursor-pointer hover:bg-amber-500/20 transition-all">
                    {clean.trim()}
                  </button>
                );
              }
              return <span key={j}>{s}</span>;
            })}
          </span>
        );
      })}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SupportChat({ currentLanguage, currentUser, onClose }: SupportChatProps) {
  const t = TRANSLATIONS[currentLanguage];
  const isRtl = currentLanguage === 'ar';

  // conversationId = user email or guest token
  const conversationId = (currentUser
    ? currentUser.email
    : (localStorage.getItem('ryvo_support_guest_id') || (() => {
        const id = `guest-${Math.random().toString(36).substr(2, 9)}@ryvo.co`;
        localStorage.setItem('ryvo_support_guest_id', id);
        return id;
      })())
  ).toLowerCase().trim();

  const backupKey = `ryvo_support_messages_v2_${conversationId}`;

  // ─── State ─────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try { const s = localStorage.getItem(backupKey); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [inputText, setInputText] = useState('');
  const [convStatus, setConvStatus] = useState<ConvStatus>('AI_HANDLING');
  const [aiSummary, setAiSummary] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [settings, setSettings] = useState<SupportSettings>({
    welcomeMessage: isRtl ? 'مرحباً! كيف يمكنني مساعدتك؟' : 'Hello! How can I help you?',
    supportName: isRtl ? 'ريم (الدعم الذكي)' : 'Reem (AI Support)',
    supportAvatar: '🤖',
    isAgentOnline: false,
  });
  const [selectedFile, setSelectedFile] = useState<{ name: string; url: string; base64: string; type: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [guestName, setGuestName] = useState(() => localStorage.getItem('ryvo_guest_name') || '');
  const [ratingInput, setRatingInput] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // persist messages
  const persistMessages = useCallback((msgs: ChatMessage[]) => {
    localStorage.setItem(backupKey, JSON.stringify(msgs));
  }, [backupKey]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      const next = [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
      persistMessages(next);
      return next;
    });
  }, [persistMessages]);

  // ─── Socket.io Setup ───────────────────────────────────────────────────────
  useEffect(() => {
    socket.connect();
    socket.emit('join_conversation', { sessionId: conversationId });

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('message_received', (msg: ChatMessage) => {
      addMessage(msg);
      setIsAiTyping(false);
      setIsAgentTyping(false);
    });

    socket.on('typing_status', ({ sender, isTyping }: { sender: string; isTyping: boolean }) => {
      if (sender === 'ai') setIsAiTyping(isTyping);
      if (sender === 'support' || sender === 'agent') setIsAgentTyping(isTyping);
    });

    socket.on('status_updated', ({ status, ai_summary }: { status: ConvStatus; ai_summary?: string }) => {
      setConvStatus(status);
      if (ai_summary) setAiSummary(ai_summary);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('message_received');
      socket.off('typing_status');
      socket.off('status_updated');
      socket.disconnect();
    };
  }, [conversationId, addMessage]);

  // ─── Load conversation from server on mount ─────────────────────────────────
  useEffect(() => {
    fetch('/api/support/settings')
      .then(r => r.json())
      .then(d => { if (d?.welcomeMessage) setSettings(d); })
      .catch(() => {});

    fetch(`/api/support/conversations/${encodeURIComponent(conversationId)}`)
      .then(r => r.json())
      .then(data => {
        if (!data) return;
        if (data.status) setConvStatus(data.status as ConvStatus);
        if (data.ai_summary) setAiSummary(data.ai_summary);

        if (data.messages && Array.isArray(data.messages)) {
          // Merge server messages with local (avoid duplicates)
          setMessages(prev => {
            const merged = [...data.messages] as ChatMessage[];
            prev.forEach(lm => { if (!merged.some(m => m.id === lm.id)) merged.push(lm); });
            merged.sort((a, b) => a.timestamp - b.timestamp);
            persistMessages(merged);
            return merged;
          });
        }

        // Show welcome message if first visit
        if (!data.messages || data.messages.length === 0) {
          const welcome: ChatMessage = {
            id: 'welcome-msg',
            sender: 'support',
            sender_type: 'ai',
            text: settings.welcomeMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
          };
          addMessage(welcome);
        }
      })
      .catch(() => {});
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping, isAgentTyping]);

  // ─── Handle Transfer to Agent (customer approves) ──────────────────────────
  const handleTransferToAgent = async () => {
    try {
      await fetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'QUEUED_FOR_HUMAN' })
      });
      setConvStatus('QUEUED_FOR_HUMAN');
      const sysMsg: ChatMessage = {
        id: `sys-transfer-${Date.now()}`,
        sender: 'support',
        sender_type: 'system',
        text: isRtl ? '✅ تم تحويل محادثتك إلى قسم الدعم الفني البشري. سيتصل بك أحد موظفينا قريباً. شكراً لصبرك! 🙏' : '✅ Your conversation has been transferred to our human support team. An agent will be with you shortly. Thank you for your patience! 🙏',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      };
      addMessage(sysMsg);
    } catch (err) {
      console.error('Transfer failed:', err);
    }
  };

  // ─── File Upload Handler ────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setSelectedFile({ name: file.name, url: dataUrl, base64, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  // ─── Audio Recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch { alert(isRtl ? 'تعذر الوصول إلى الميكروفون.' : 'Microphone access denied.'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // Send audio blob as message
  useEffect(() => {
    if (!audioBlob) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await sendMessage('', undefined, { name: `audio-${Date.now()}.webm`, base64, type: 'audio/webm' });
      setAudioBlob(null);
    };
    reader.readAsDataURL(audioBlob);
  }, [audioBlob]);

  // ─── Send Message ───────────────────────────────────────────────────────────
  const sendMessage = async (text: string, e?: React.FormEvent, audioFile?: { name: string; base64: string; type: string }) => {
    if (e) e.preventDefault();
    if (!text.trim() && !selectedFile && !audioFile) return;

    const ua = navigator.userAgent;
    const device = /Mobi|Android/i.test(ua) ? 'Mobile' : 'Desktop';
    const os = /Macintosh/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : 'Windows';
    const browser = /Firefox/.test(ua) ? 'Firefox' : /Edg/.test(ua) ? 'Edge' : /Safari/.test(ua) && !/Chrome/.test(ua) ? 'Safari' : 'Chrome';
    const country = 'SA';

    // Upload file if present
    let uploadedUrl: string | undefined;
    let uploadType = 'text';

    if (audioFile) {
      try {
        const res = await fetch('/api/support/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: audioFile.name, fileType: audioFile.type, base64Data: audioFile.base64 })
        });
        const data = await res.json();
        uploadedUrl = data.url;
        uploadType = 'audio';
      } catch { console.error('Audio upload failed'); return; }
    } else if (selectedFile) {
      try {
        const res = await fetch('/api/support/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedFile.name, fileType: selectedFile.type, base64Data: selectedFile.base64 })
        });
        const data = await res.json();
        uploadedUrl = data.url;
        uploadType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
      } catch { console.error('File upload failed'); return; }
    }

    // Optimistic UI update
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      sender_type: 'customer',
      text: text || (uploadedUrl ? `[${isRtl ? 'ملف مرفق' : 'Attachment'}]` : ''),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      attachment: uploadedUrl ? { name: audioFile?.name || selectedFile?.name || 'file', url: uploadedUrl, type: uploadType as any } : undefined
    };
    addMessage(tempMsg);
    setInputText('');
    setSelectedFile(null);
    setShowSuggestions(false);

    // Show AI typing indicator
    if (convStatus === 'AI_HANDLING') setIsAiTyping(true);

    // Emit via socket
    socket.emit('send_message', {
      sessionId: conversationId,
      sender: 'user',
      text: text,
      attachment: uploadedUrl ? { url: uploadedUrl, type: uploadType } : undefined,
      clientName: currentUser?.name || guestName || (isRtl ? 'عميل زائر' : 'Guest'),
      clientEmail: currentUser?.email || conversationId,
      clientPhone: currentUser?.phone || '',
      country,
      language: currentLanguage,
      device,
      os,
      browser
    });

    // Also call REST API as fallback
    try {
      await fetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sender: 'user',
          attachment: uploadedUrl ? { url: uploadedUrl, type: uploadType } : undefined,
          clientName: currentUser?.name || guestName || (isRtl ? 'عميل زائر' : 'Guest'),
          clientEmail: currentUser?.email || conversationId,
          clientPhone: currentUser?.phone || '',
          country,
          language: currentLanguage,
          device,
          os,
          browser
        })
      });
    } catch { setIsAiTyping(false); }
  };

  // ─── Submit Rating ──────────────────────────────────────────────────────────
  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`/api/support/conversations/${encodeURIComponent(conversationId)}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingInput, ratingComment })
      });
      setRatingSubmitted(true);
    } catch { console.error('Rating submit failed'); }
  };

  // ─── Suggestions ────────────────────────────────────────────────────────────
  const defaultSuggestions = [
    { id: 's1', textAr: '📦 أين طلبي؟', textEn: '📦 Where is my order?', icon: '📦', isActive: true },
    { id: 's2', textAr: '🚚 تتبع الشحنة', textEn: '🚚 Track shipment', icon: '🚚', isActive: true },
    { id: 's3', textAr: '💳 وسائل الدفع', textEn: '💳 Payment methods', icon: '💳', isActive: true },
    { id: 's4', textAr: '🔄 سياسة الاسترجاع', textEn: '🔄 Return policy', icon: '🔄', isActive: true },
    { id: 's5', textAr: '🎁 الكوبونات ونقاط الولاء', textEn: '🎁 Coupons & loyalty points', icon: '🎁', isActive: true },
    { id: 's6', textAr: '👨‍💼 التحدث مع موظف', textEn: '👨‍💼 Speak with an agent', icon: '👨‍💼', isActive: true },
  ];
  const activeSuggestions = (settings.suggestions?.filter(s => s.isActive) ?? []).length > 0
    ? settings.suggestions!.filter(s => s.isActive)
    : defaultSuggestions;

  // ─── Sender badge ────────────────────────────────────────────────────────────
  const getSenderLabel = (msg: ChatMessage) => {
    if (msg.sender === 'user') return isRtl ? 'أنت' : 'You';
    if (msg.sender_type === 'ai') return isRtl ? '🤖 رايفو الذكي' : '🤖 Ryvo AI';
    if (msg.sender_type === 'agent') return isRtl ? '👨‍💼 موظف الدعم' : '👨‍💼 Support Agent';
    if (msg.sender_type === 'system') return '';
    return settings.supportName;
  };

  const isAiMessage = (msg: ChatMessage) => msg.sender === 'support' && (msg.sender_type === 'ai' || msg.sender_type === undefined);
  const isAgentMessage = (msg: ChatMessage) => msg.sender === 'support' && msg.sender_type === 'agent';
  const isSystemMessage = (msg: ChatMessage) => msg.sender_type === 'system';

  // ─── Status badge color ──────────────────────────────────────────────────────
  const statusBadge = () => {
    if (convStatus === 'AI_HANDLING') return { color: 'text-sky-400', label: isRtl ? 'ذكاء اصطناعي نشط' : 'AI Active', icon: <Bot className="w-3 h-3" /> };
    if (convStatus === 'HUMAN_HANDLING') return { color: 'text-emerald-400', label: isRtl ? 'موظف متصل' : 'Agent Online', icon: <UserCheck className="w-3 h-3" /> };
    if (convStatus === 'QUEUED_FOR_HUMAN') return { color: 'text-amber-400', label: isRtl ? 'في قائمة الانتظار' : 'In Queue', icon: <PhoneCall className="w-3 h-3" /> };
    if (convStatus === 'PENDING_CUSTOMER_APPROVAL') return { color: 'text-orange-400', label: isRtl ? 'بانتظار موافقتك' : 'Awaiting Your Approval', icon: <AlertTriangle className="w-3 h-3" /> };
    if (convStatus === 'CLOSED') return { color: 'text-slate-400', label: isRtl ? 'مغلقة' : 'Closed', icon: <CheckCircle2 className="w-3 h-3" /> };
    return { color: 'text-sky-400', label: isRtl ? 'نشط' : 'Active', icon: <Sparkles className="w-3 h-3" /> };
  };

  const badge = statusBadge();

  // ─── Copy Success Toast ──────────────────────────────────────────────────────
  const handleCopySuccess = (code: string) => {
    setCopyToast(code);
    setTimeout(() => setCopyToast(null), 2500);
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/97 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 font-sans">
      <div className="bg-white dark:bg-[#0D1017] w-full h-full sm:h-[94vh] sm:max-w-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 relative">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#0f1923] to-[#1a2744] p-4 text-white flex items-center justify-between gap-3 border-b border-white/5 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer flex-shrink-0">
            <Home className="w-4 h-4 text-sky-400" />
          </button>

          <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-xl shadow-lg">
                {convStatus === 'HUMAN_HANDLING' ? '👨‍💼' : '🤖'}
              </div>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0f1923] ${convStatus === 'HUMAN_HANDLING' ? 'bg-emerald-400' : 'bg-sky-400'}`} />
            </div>
            <div>
              <p className="font-black text-sm leading-tight">{convStatus === 'HUMAN_HANDLING' ? (isRtl ? 'موظف الدعم' : 'Support Agent') : settings.supportName}</p>
              <div className={`flex items-center gap-1 text-[10px] font-bold ${badge.color}`}>
                {badge.icon}
                <span>{badge.label}</span>
                {!socketConnected && <span className="text-rose-400 ml-1">({isRtl ? 'غير متصل' : 'offline'})</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            {isRtl ? 'رايفو RYVO' : 'RYVO Store'}
          </div>
        </div>

        {/* ── PENDING_CUSTOMER_APPROVAL Banner ─────────────────────────────── */}
        {convStatus === 'PENDING_CUSTOMER_APPROVAL' && (
          <div className="bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 border-b border-orange-500/30 p-4 flex-shrink-0">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-orange-400 font-black text-sm">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
                <span>{isRtl ? 'تحتاج مشكلتك تدخلاً بشرياً' : 'Your issue needs human attention'}</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                {isRtl
                  ? 'قام الذكاء الاصطناعي بإعداد ملخص شامل لمشكلتك. هل تريد التحويل الآن إلى موظف دعم بشري؟'
                  : 'Our AI has prepared a complete summary of your issue. Would you like to be transferred to a human agent now?'}
              </p>
              <button
                type="button"
                onClick={handleTransferToAgent}
                className="w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-orange-500/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{isRtl ? '🔗 تحويل إلى الدعم الفني البشري' : '🔗 Transfer to Human Support'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── QUEUED_FOR_HUMAN Banner ───────────────────────────────────────── */}
        {convStatus === 'QUEUED_FOR_HUMAN' && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 text-center flex-shrink-0">
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              {isRtl ? '⏳ أنت في قائمة الانتظار. سيتصل بك موظف الدعم قريباً...' : '⏳ You are in queue. A support agent will be with you shortly...'}
            </div>
          </div>
        )}

        {/* ── Messages Area ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-[#0D1017]">

          {/* First-visit suggestions */}
          {messages.length === 0 && showSuggestions && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-3xl shadow-xl mb-3">🤖</div>
                <h3 className="font-black text-slate-800 dark:text-white text-base">{isRtl ? 'مرحباً بك في رايفو! 🏍️' : 'Welcome to RYVO Support! 🏍️'}</h3>
                <p className="text-slate-500 text-xs mt-1">{isRtl ? 'ذكاؤنا الاصطناعي جاهز لمساعدتك' : 'Our AI is ready to assist you'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {activeSuggestions.map(s => (
                  <button key={s.id} type="button"
                    onClick={() => sendMessage(isRtl ? s.textAr : s.textEn)}
                    className="p-3 bg-white dark:bg-[#11141D] hover:bg-sky-50 dark:hover:bg-sky-900/20 border border-slate-200 dark:border-slate-800 hover:border-sky-400 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-2xl transition-all cursor-pointer text-center shadow-sm">
                    {isRtl ? s.textAr : s.textEn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id}
              className={`flex flex-col ${isSystemMessage(msg) ? 'items-center' : msg.sender === 'user' ? (isRtl ? 'items-start' : 'items-end') : (isRtl ? 'items-end' : 'items-start')} max-w-[88%] ${msg.sender === 'user' ? (isRtl ? 'mr-0 ml-auto' : 'ml-0 mr-auto') : (isRtl ? 'ml-0 mr-auto' : 'mr-0 ml-auto')}`}>

              {isSystemMessage(msg) ? (
                <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2 text-center text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs">
                  {msg.text}
                </div>
              ) : (
                <>
                  {/* Sender label */}
                  {msg.sender !== 'user' && (
                    <div className={`flex items-center gap-1.5 mb-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isAiMessage(msg) ? 'bg-sky-500/20 text-sky-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {isAiMessage(msg) ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{getSenderLabel(msg)}</span>
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed max-w-full ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-br from-sky-500 to-violet-600 text-white rounded-br-sm'
                      : isAiMessage(msg)
                        ? 'bg-white dark:bg-[#11141D] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                        : 'bg-emerald-500/10 border border-emerald-500/20 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                  }`}>
                    {msg.attachment ? (
                      <div className="space-y-2">
                        {msg.attachment.type === 'image' && (
                          <img src={msg.attachment.url} alt="attachment" className="rounded-xl max-w-[220px] w-full object-cover border border-white/10" />
                        )}
                        {msg.attachment.type === 'audio' && (
                          <audio controls src={msg.attachment.url} className="w-full max-w-[220px]" />
                        )}
                        {msg.text && <p className="text-xs mt-1 opacity-80">{msg.text}</p>}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.sender === 'user' ? msg.text : renderInteractiveText(msg.text, isRtl, handleCopySuccess)}
                      </p>
                    )}
                  </div>

                  {/* AI badge */}
                  {isAiMessage(msg) && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400">
                      <Sparkles className="w-2.5 h-2.5 text-sky-400" />
                      <span>{isRtl ? 'رد من الذكاء الاصطناعي' : 'AI Response'}</span>
                    </div>
                  )}
                  {isAgentMessage(msg) && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-400">
                      <BadgeCheck className="w-2.5 h-2.5" />
                      <span>{isRtl ? 'موظف دعم بشري' : 'Human Agent'}</span>
                    </div>
                  )}
                  <p className="text-[9px] text-slate-400 mt-0.5 px-1">{msg.time}</p>
                </>
              )}
            </div>
          ))}

          {/* Typing indicators */}
          {isAiTyping && (
            <div className={`flex items-end gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="bg-white dark:bg-[#11141D] border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                  <span className="text-[10px] text-slate-400 ml-2 font-medium">{isRtl ? 'الذكاء الاصطناعي يفكر...' : 'AI is thinking...'}</span>
                </div>
              </div>
            </div>
          )}
          {isAgentTyping && !isAiTyping && (
            <div className={`flex items-end gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick Suggestions row (inline) ───────────────────────────────── */}
        {messages.length > 0 && (convStatus === 'AI_HANDLING' || convStatus === 'active') && (
          <div className="bg-white dark:bg-[#0D1017] border-t border-slate-100 dark:border-slate-800 px-3 py-2 flex-shrink-0">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              {activeSuggestions.slice(0, 4).map(s => (
                <button key={s.id} type="button"
                  onClick={() => sendMessage(isRtl ? s.textAr : s.textEn)}
                  className="whitespace-nowrap px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-sky-500/10 hover:border-sky-400 border border-transparent text-slate-600 dark:text-slate-400 text-[11px] font-bold rounded-xl transition-all cursor-pointer flex-shrink-0">
                  {isRtl ? s.textAr : s.textEn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── CSAT Rating (CLOSED state) ────────────────────────────────────── */}
        {convStatus === 'CLOSED' && (
          <div className="bg-white dark:bg-[#11141D] border-t border-slate-200 dark:border-slate-800 p-5 flex-shrink-0">
            {ratingSubmitted ? (
              <div className="text-center space-y-2 py-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="font-black text-slate-800 dark:text-white text-sm">{isRtl ? 'شكراً لتقييمك! 🙏' : 'Thank you for your feedback! 🙏'}</p>
                <p className="text-xs text-slate-400">{isRtl ? 'مساهمتك تساعدنا على التحسين المستمر.' : 'Your feedback helps us improve continuously.'}</p>
              </div>
            ) : (
              <form onSubmit={handleRatingSubmit} className="space-y-3">
                <p className="text-center font-black text-slate-800 dark:text-white text-sm">{isRtl ? 'كيف كانت تجربتك مع دعمنا؟ ⭐' : 'How was your support experience? ⭐'}</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} type="button" onClick={() => setRatingInput(star)}
                      className={`text-2xl transition-all cursor-pointer hover:scale-110 ${star <= ratingInput ? 'opacity-100' : 'opacity-30'}`}>
                      ⭐
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => { handleRatingSubmit({ preventDefault: () => {} } as any); }} className="flex-none px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs rounded-xl cursor-pointer">{isRtl ? 'تخطي' : 'Skip'}</button>
                  <input
                    type="text"
                    value={ratingComment}
                    onChange={e => setRatingComment(e.target.value)}
                    placeholder={isRtl ? 'تعليقك يساعدنا (اختياري)...' : 'Your comment helps us (optional)...'}
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none"
                  />
                  <button type="submit" className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-black text-xs rounded-xl cursor-pointer transition-all">
                    {isRtl ? 'إرسال' : 'Send'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── Input Area ────────────────────────────────────────────────────── */}
        {convStatus !== 'CLOSED' && convStatus !== 'PENDING_CUSTOMER_APPROVAL' && (
          <div className="bg-white dark:bg-[#11141D] border-t border-slate-200 dark:border-slate-800 p-3 flex-shrink-0">
            {/* File preview */}
            {selectedFile && (
              <div className="mb-2 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
                {selectedFile.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-sky-400 flex-shrink-0" /> : <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1 font-medium">{selectedFile.name}</span>
                <button type="button" onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-rose-400 p-1 rounded-full cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={e => sendMessage(inputText, e)} className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,audio/*,application/pdf" className="hidden" />
              
              {/* Attach */}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-sky-500/10 text-slate-500 hover:text-sky-400 rounded-xl transition-all cursor-pointer flex-shrink-0">
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Mic */}
              <button type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2.5 rounded-xl transition-all cursor-pointer flex-shrink-0 ${isRecording ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 hover:bg-sky-500/10 text-slate-500 hover:text-sky-400'}`}>
                {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={() => socket.emit('typing', { sessionId: conversationId, sender: 'user', isTyping: true })}
                placeholder={isRtl ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
                disabled={convStatus === 'QUEUED_FOR_HUMAN'}
                className={`flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-sky-400 rounded-xl text-sm text-slate-800 dark:text-white outline-none transition-all font-medium ${isRtl ? 'text-right' : 'text-left'} disabled:opacity-50`}
              />

              <button type="submit"
                disabled={(!inputText.trim() && !selectedFile) || convStatus === 'QUEUED_FOR_HUMAN'}
                className="p-2.5 bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 disabled:from-slate-200 disabled:to-slate-300 dark:disabled:from-slate-800 dark:disabled:to-slate-700 text-white disabled:text-slate-400 rounded-xl transition-all cursor-pointer flex-shrink-0 shadow-md hover:shadow-sky-500/30 active:scale-95 disabled:cursor-not-allowed">
                <Send className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </form>

            <p className="text-center text-[9px] text-slate-400 font-medium mt-2">
              🔒 {isRtl ? 'جلسة مشفرة وآمنة بالكامل · مدعوم بـ Gemini AI' : 'Fully encrypted session · Powered by Gemini AI'}
            </p>
          </div>
        )}
      </div>

      {/* Copy toast */}
      {copyToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-black py-2.5 px-5 rounded-xl shadow-2xl z-50 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{isRtl ? `تم النسخ: ${copyToast}` : `Copied: ${copyToast}`}</span>
        </div>
      )}
    </div>
  );
}
