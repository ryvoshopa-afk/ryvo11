import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, TrendingUp, Check, Mail, Users, Trash2, BarChart3, Copy, RefreshCw,
  Upload, Calendar, Smartphone, Play, Pause, Volume2, Video, Award, MessageSquare,
  Settings, Clock, Target, Plus, Search, Eye, BookOpen, Heart, Share2, CornerRightDown
} from 'lucide-react';
import { Product, Language } from '../types';

interface AiMarketingStudioProps {
  products: Product[];
  orders?: any[];
  shopLogo: string;
  onUpdateLogo: (logo: string) => void;
  currentLanguage: Language;
  onUpdateAnnouncement?: (textAr: string, textEn: string, textFr: string, link: string) => void;
  triggerToast: (msg: string) => void;
}

// Sub-Tab Types
type MarketingSubTab = 
  | 'brand_memory'
  | 'content_creator'
  | 'video_factory'
  | 'social_calendar'
  | 'sales_analyst'
  | 'ad_assistant'
  | 'customer_service'
  | 'operations_log';

// Writing Styles
type WritingStyle = 'professional' | 'enthusiastic' | 'luxury' | 'short';

// Content Creator Types
type ContentType = 
  | 'description'
  | 'title'
  | 'seo'
  | 'instagram'
  | 'tiktok'
  | 'email'
  | 'blog';

// Calendar Post Item
interface CalendarPost {
  day: number;
  title: string;
  content: string;
  time: string;
  channel: 'Instagram' | 'TikTok' | 'YouTube' | 'Newsletter' | 'Blog';
}

// Operation Log Item
interface OpLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning';
  actionAr: string;
  actionEn: string;
}

export default function AiMarketingStudio({
  products,
  orders = [],
  shopLogo,
  onUpdateLogo,
  currentLanguage,
  onUpdateAnnouncement,
  triggerToast
}: AiMarketingStudioProps) {
  const isRtl = currentLanguage === 'ar';

  // --- STATE 1: ACTIVE SUB-TAB ---
  const [subTab, setSubTab] = useState<MarketingSubTab>('brand_memory');

  // --- STATE 2: RYVO BRAND MEMORY SYSTEM ---
  const [brandName, setBrandName] = useState('RYVO');
  const [brandIdentity, setBrandIdentity] = useState(() => {
    return isRtl 
      ? 'متجر النخبة للأجهزة الرياضية الاحترافية، الدراجات الهوائية المستقبلية المصنعة بالكامل من ألياف الكربون فايبر، وخوذ الأمان الذكية.'
      : 'Elite boutique for high-performance sports, futuristic carbon fiber cycles, high-velocity riding gear, and protective intelligent helmets.';
  });
  const [brandStyle, setBrandStyle] = useState<WritingStyle>('enthusiastic');
  const [targetAudience, setTargetAudience] = useState(() => {
    return isRtl
      ? 'الدراجون المحترفون، عشاق المغامرات والسرعة، الرياضيون الباحثون عن معدات فخمة وموثوقية عالية بالمملكة العربية السعودية.'
      : 'Professional road cyclists, adrenaline seekers, high-speed motorcycle riders, and premium athletes demanding elite carbon fiber setups in Saudi Arabia.';
  });
  const [brandColors, setBrandColors] = useState('#10B981'); // Emerald
  const [watermarkCorner, setWatermarkCorner] = useState<'TL' | 'TR' | 'BL' | 'BR'>('TR');

  // Logo file state or manual URL
  const [logoInputType, setLogoInputType] = useState<'upload' | 'url'>('upload');
  const [logoUrlInput, setLogoUrlInput] = useState(shopLogo);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE 3: AI CONTENT CREATOR ---
  const [creatorProduct, setCreatorProduct] = useState<string>(products[0]?.id || '');
  const [creatorContentType, setCreatorContentType] = useState<ContentType>('description');
  const [creatorStyle, setCreatorStyle] = useState<WritingStyle>('luxury');
  const [creatorResult, setCreatorResult] = useState<string>('');
  const [isGeneratingCreator, setIsGeneratingCreator] = useState(false);

  // --- STATE 4: ADVERTISING VIDEO FACTORY ---
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [backingTrack, setBackingTrack] = useState<'none' | 'synthwave' | 'acoustic' | 'metal'>('synthwave');
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('male');
  const [videoScript, setVideoScript] = useState('');
  const [isScriptGenerating, setIsScriptGenerating] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgressValue, setExportProgressValue] = useState(0);

  // Video visual filters
  const [studioFilter, setStudioFilter] = useState<'warm' | 'neon' | 'mono' | 'vintage'>('warm');
  const [studioLight, setStudioLight] = useState<'ambient' | 'spotlight' | 'halo'>('halo');

  // --- STATE 5: SOCIAL MEDIA & CONTENT CALENDAR ---
  const [calendarMonth, setCalendarMonth] = useState('July 2026');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(15);
  const [calendarPosts, setCalendarPosts] = useState<CalendarPost[]>([
  { 
    day: 2, 
    title: isRtl ? 'صيانة فرامل الدراجة الهيدروليكية' : 'Hydraulic Disc Brake Care', 
    content: isRtl ? '🔧 نصيحة الأسبوع الفنية لزيادة ثبات المكابح في المنعطفات السريعة. تفقد زيت المكابح دائماً لسلامتك.' : '🔧 Preventative maintenance tip: bleed hydraulic brake systems regularly to keep lock speed secure!',
    time: '18:00', 
    channel: 'Instagram' 
  },
  { 
    day: 7, 
    title: isRtl ? 'مقارنة ألياف الكربون ضد الألومنيوم' : 'Carbon vs Aluminum Frames', 
    content: isRtl ? '⚔️ مقارنة علمية مبسطة تشرح الفارق في امتصاص اهتزازات الطرق ووزن هيكل الدراجة لزيادة السرعة.' : '⚔️ Full aerodynamic breakdown explaining road vibration dampening on pure carbon frames vs alloys.',
    time: '20:30', 
    channel: 'TikTok' 
  },
  { 
    day: 12, 
    title: isRtl ? 'فيديو استعراض الدراجة الخارقة Helix F-70' : 'Helix F-70 Showdown video', 
    content: isRtl ? '🎬 استعراض سينمائي مشوق بمناسبة وصول الدراجة للكويت والمملكة. استخدم كود RYVO2026 للحصول على خصم 10%!' : '🎬 Cinematic speed reel showcasing Helix Carbon F-70 road capabilities under sunset trails in Riyadh.',
    time: '19:00', 
    channel: 'YouTube' 
  },
  { 
    day: 15, 
    title: isRtl ? 'رسالة الإعلان الموسمي للمشتركين' : 'Ryvo Seasonal Riders Newsletter', 
    content: isRtl ? '📧 رسالة بريدية لـ 12,000 مشترك بالمتجر تستعرض عروض الصيف الحارة والخصم الحصري الشامل.' : '📧 Hyper-segmented marketing email covering summer promotions, protective gear restocks, and free delivery.',
    time: '10:00', 
    channel: 'Newsletter' 
  },
  { 
    day: 22, 
    title: isRtl ? 'مقال مدونة: أفضل 5 مسارات دراجات بالرياض' : 'Blog: Top 5 Trails in Riyadh', 
    content: isRtl ? '⛰️ دليل الدراجين لاستكشاف مسار وادي حنيفة ومسارات طويق ونزول الحيسية الرائعة.' : '⛰️ Comprehensive riding guide featuring Wadi Hanifa trails, mountain descents, and scenic paths in Riyadh.',
    time: '16:45', 
    channel: 'Blog' 
  }
]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTime, setNewPostTime] = useState('12:00');
  const [newPostChannel, setNewPostChannel] = useState<'Instagram' | 'TikTok' | 'YouTube' | 'Newsletter' | 'Blog'>('Instagram');

  // --- STATE 6: PRODUCT & SALES ANALYST ---
  const [isAnalyzingSales, setIsAnalyzingSales] = useState(false);
  const [salesReport, setSalesReport] = useState<string>('');

  // --- STATE 7: SMART ADS ASSISTANT ---
  const [isGeneratingAds, setIsGeneratingAds] = useState(false);
  const [adsCampaignResult, setAdsCampaignResult] = useState<any>(null);
  const [adsPlatform, setAdsPlatform] = useState<'meta' | 'google' | 'tiktok'>('meta');

  // --- STATE 8: CUSTOMER SERVICE PLAYGROUND ---
  const [faqInputAr, setFaqInputAr] = useState('س: كم يستغرق الشحن والتسليم؟ ج: شحننا سريع ومجاني بالكامل ويستغرق من 2 إلى 4 أيام عمل لباب منزلك.');
  const [faqInputEn, setFaqInputEn] = useState('Q: What is your shipping delivery policy? A: We provide 100% FREE express shipping worldwide within 2-4 business days.');
  const [supportHours, setSupportHours] = useState('24/7/365 active');
  const [customerMessage, setCustomerMessage] = useState('');
  const [customerChatHistory, setCustomerChatHistory] = useState<any[]>([
    { sender: 'bot', text: isRtl ? 'مرحباً بك في مركز اختبار الدعم الفني الذكي رايفو! كيف يمكنني مساعدتك اليوم؟ 🏍️' : 'Hello champion! Welcome to Ryvo Interactive support playground! How can I assist your ride today? 🏍️' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- STATE 9: OPERATIONS HISTORY LOG ---
  const [operationsLog, setOperationsLog] = useState<OpLog[]>([
    { id: '1', timestamp: '2026-06-28 10:20', type: 'info', actionAr: 'تهيئة نظام ذاكرة العلامة التجارية Ryvo بنجاح.', actionEn: 'Ryvo Brand Memory system successfully initialized.' },
    { id: '2', timestamp: '2026-06-28 10:25', type: 'success', actionAr: 'مزامنة شعار متجر رايفو في قوالب الإعلانات القصيرة.', actionEn: 'Synchronized Ryvo store logo into reels and ad copy watermarks.' }
  ]);

  // Add event to operations log
  const addLogEvent = (actionAr: string, actionEn: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newLog: OpLog = {
      id: `${Date.now()}`,
      timestamp,
      type,
      actionAr,
      actionEn
    };
    setOperationsLog(prev => [newLog, ...prev]);
  };

  // --- HANDLE LOGO UPLOAD & WATERMARK PREVIEWS ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        onUpdateLogo(base64);
        triggerToast(isRtl ? '🎨 تم رفع وتحديث شعار المتجر بنجاح!' : '🎨 Store Logo updated successfully!');
        addLogEvent('تم رفع وتحديث شعار المتجر بنجاح.', 'Uploaded and initialized new store logo.', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        onUpdateLogo(base64);
        triggerToast(isRtl ? '🎨 تم رفع وتحديث شعار المتجر عبر السحب والإفلات!' : '🎨 Logo uploaded via drag & drop!');
        addLogEvent('تم رفع شعار المتجر بنجاح عبر السحب والإفلات.', 'Uploaded logo via drag and drop.', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyLogoUrl = () => {
    if (logoUrlInput.trim()) {
      onUpdateLogo(logoUrlInput.trim());
      triggerToast(isRtl ? '🎨 تم حفظ رابط شعار المتجر بنجاح!' : '🎨 Logo URL saved successfully!');
      addLogEvent('تم تحديث رابط شعار المتجر المباشر.', 'Direct store logo URL updated.', 'success');
    }
  };

  const handleDeleteLogo = () => {
    onUpdateLogo('');
    setLogoUrlInput('');
    triggerToast(isRtl ? '🗑️ تم إزالة الشعار واستعادة الاسم النصي للمتجر.' : '🗑️ Removed logo and reverted to text identifier.');
    addLogEvent('تم إزالة الشعار وتفعيل المعرف النصي.', 'Removed logo image, reverted to text identification.', 'warning');
  };

  // --- EXECUTING REAL GEMINI GENERATION VIA BACKEND ---
  const executeGeminiCall = async (promptText: string, systemInstructionText: string) => {
    try {
      const res = await fetch('/api/marketing-agent-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          systemInstruction: systemInstructionText,
          model: 'gemini-3.5-flash'
        })
      });
      const data = await res.json();
      return data.response;
    } catch (e) {
      console.error('Failed to call Gemini API, falling back safely:', e);
      return null;
    }
  };

  // --- LOGIC: GENERATE CONTENT ---
  const handleGenerateCreatorContent = async () => {
    setIsGeneratingCreator(true);
    const prod = products.find(p => p.id === creatorProduct) || products[0];
    if (!prod) {
      triggerToast(isRtl ? '⚠️ لا توجد منتجات لتوليد المحتوى لها!' : '⚠️ No products found to generate content for!');
      setIsGeneratingCreator(false);
      return;
    }

    const typeLabels: Record<ContentType, string> = {
      description: 'Professional Product Description',
      title: 'Catchy Marketing Titles',
      seo: 'SEO Keywords & Meta Description',
      instagram: 'Instagram Carousel Post Content',
      tiktok: 'Short-Form TikTok Video Concept and Hook',
      email: 'Email Marketing Newsletter',
      blog: 'Comprehensive Sports Blog Article'
    };

    const styleLabels: Record<WritingStyle, string> = {
      professional: 'Professional & Informative (احترافي رصين)',
      enthusiastic: 'High-Energy Enthusiastic (حماسي مشوق للدراجين)',
      luxury: 'Ultra-Luxury & Exclusive (فاخر مخصص للنخبة)',
      short: 'Concise, Action-Packed, Short (مختصر وسريع)'
    };

    const sysInstruction = `You are "Ryvo Marketing Agent", an elite full-service copywriter for Ryvo Store.
Ryvo specialises in luxury sports bikes, high-velocity carbon-fiber cycling, motorcycle gears, and premium riding protections.
YOUR IDENTITY METADATA (Brand Memory):
- Brand Name: ${brandName}
- Core Identity: ${brandIdentity}
- Target Demographics: ${targetAudience}
- Store Logo: ${shopLogo ? "Uploaded & Active" : "Text Default"}
Always weave this premium, high-tech Saudi sports tone into the copy. Preserve KSA cycling vocabulary if generating in Arabic. Generate beautifully formatted results with rich emojis and markdown layout. Avoid generic text.`;

    const promptText = `Generate a magnificent ${typeLabels[creatorContentType]} for:
Product Name: ${prod.name_en} (${prod.name_ar})
Description: ${prod.description_en} (${prod.description_ar})
Price: $${prod.price}
Tag: ${prod.tag_en}
Writing Style required: ${styleLabels[creatorStyle]}
Language: ${isRtl ? 'Arabic' : 'English'}

Include call-to-action details (using store logo/brand signature if applicable, free shipping policy: 2-4 days worldwide, and coupon code: RYVO2026 for 10% discount).`;

    const geminiText = await executeGeminiCall(promptText, sysInstruction);

    if (geminiText) {
      setCreatorResult(geminiText);
    } else {
      // High-fidelity local fallback if Gemini is offline
      let localFallback = '';
      if (isRtl) {
        if (creatorContentType === 'description') {
          localFallback = `✨ [وصف منتج احترافي فاخر مصمم بأسلوب ${styleLabels[creatorStyle]}] ✨\n\nنقدم لك تحفة متجر رايفو الرياضية الفاخرة: **${prod.name_ar}**.\n\nتمت صياغة هذا الموديل بدقة هندسية متكاملة ليدعمك في أقسى مسارات التحمل والسرعة. بفضل خامات الكربون الصلبة والوزن الخفيف الفريد، ستحصل على تسارع فوري على الإسفلت واستجابة تحكم متقدمة بالمنعطفات.\n\n💎 **مميزات حصرية:**\n- ثبات استثنائي بالطرق الطويلة والصعود.\n- مكابح هيدروليكية ذكية للاستجابة السريعة.\n- تصميم عصري يحمل لمسة رايفو الرياضية الراقية.\n\n🛍️ **عروض الشراء الآن:**\n- التوصيل مجاني وسريع بالكامل لباب بيتك (2-4 أيام عمل).\n- كود خصم إضافي: [ RYVO2026 ] لخصم 10% فوري!\n- العلامة المعتمدة: **${brandName}**`;
        } else if (creatorContentType === 'title') {
          localFallback = `🏆 **عناوين جذابة مقترحة للمنتج: ${prod.name_ar}**\n\n1. قاهر الطرقات الرياضي - خفة ألياف الكربون الفائقة مع ${prod.name_ar}! ⚡\n2. اصنع الفارق في كل طواف.. اكتشف قوة ${prod.name_ar} الفاخرة 🚴‍♂️\n3. هندسة السرعة المستقبلية تحت قدميك مع ${prod.name_ar} من رايفو!\n4. النخبة تختار الأفضل دائماً - امتلك دراجتك المفضلة الآن.`;
        } else if (creatorContentType === 'seo') {
          localFallback = `🔍 **الكلمات المفتاحية والـ SEO لـ ${prod.name_ar}**\n\n- **العنوان التعريفي (Meta Title):** ${prod.name_ar} | متجر رايفو لركوب الدراجات الفاخرة\n- **الوصف التعريفي (Meta Description):** تسوق دراجة ${prod.name_ar} الهوائية الفاخرة المصنعة بالكامل من ألياف الكربون فايبر خفيف الوزن بضمان شامل وشحن مجاني لجميع مناطق المملكة خلال 2-4 أيام عمل.\n- **الكلمات المفتاحية الدلالية:** دراجات كربون فايبر الرياضية، متجر دراجات الرياض، معدات حماية الدراجين، رايفو ستور، دراجة نارية النخبة، خوذة ذكية بلوتوث.`;
        } else {
          localFallback = `📱 **منشور إعلاني مخصص لشبكات التواصل الاجتماعي (أسلوب ${styleLabels[creatorStyle]}):**\n\nهل تفضل السرعة المطلقة أم التحكم الكامل؟ 🤔\n\nمع **${prod.name_ar}** لا تساوم على أي منهما! التحفة الرياضية الحصرية والأقوى مبيعاً بمتجر رايفو متوفرة الآن لعشاق ركوب الدراجات النخبة 🚴‍♂️🔥\n\n✨ هيكل مصنوع بوزن الريشة لامتصاص كامل الصدمات وتوفير أعلى راحة ممكنة لمفاصلك أثناء قطع الكيلومترات الطويلة.\n\n🚚 الشحن سريع ومجاني بالكامل لجميع مدن المملكة وخارجها!\n🎟️ استخدم كوبون الخصم: **RYVO2026** لخصم 10% فوري!\n\n#متجر_رايفو #دراجات_المملكة #رياضة_الرياض #كاربون_فايبر #طواف_رايفو`;
        }
      } else {
        localFallback = `✨ [Premium ${typeLabels[creatorContentType]} - ${styleLabels[creatorStyle]} Tone] ✨\n\nUnveiling the ultimate showcase: **${prod.name_en}** by **${brandName}**.\n\nEngineered with rigid aerodynamic frameworks to provide zero road friction and absolute agility, allowing elite athletes to log miles with top performance.\n\n💎 **Highlight features:**\n- Ultra-lightweight structures with dampening resilience.\n- Instant acceleration on highways with responsive brakes.\n- Premium visual craftsmanship reflecting sports prestige.\n\n🛍️ **Exclusive store benefits:**\n- 100% Free worldwide courier express delivery in 2-4 business days.\n- Save an extra 10% with coupon code: [ RYVO2026 ] at checkout.`;
      }
      setCreatorResult(localFallback);
    }
    
    setIsGeneratingCreator(false);
    triggerToast(isRtl ? '✨ تم صياغة وتحسين المحتوى بالكامل!' : '✨ Creative copywriting completed!');
    addLogEvent(`توليد محتوى ذكي من نوع (${typeLabels[creatorContentType]}) لمنتج (${prod.name_ar || prod.name_en}).`, `Generated (${typeLabels[creatorContentType]}) content for (${prod.name_en}).`, 'success');
  };

  // --- LOGIC: VIDEO SCRIPT & SIMULATION ---
  const handleGenerateVideoScript = async () => {
    setIsScriptGenerating(true);
    const prod = products.find(p => p.id === selectedProductId) || products[0];
    if (!prod) {
      triggerToast(isRtl ? '⚠️ الرجاء اختيار منتج لتوليد سيناريو الإعلان!' : '⚠️ Please select product to generate video script!');
      setIsScriptGenerating(false);
      return;
    }

    const sysInstruction = `You are "Ryvo Cinematic Director", specializing in 9:16 short vertical videos (TikTok, Reels, Shorts) that drive massive sales.
Provide highly structured scripts. Ensure you clearly outline:
- Hook (0-4s)
- Features Showcase (4-12s)
- Brand Memory CTA & Store Logo placement corner: ${watermarkCorner} (12-15s)`;

    const promptText = `Generate a magnificent, engaging vertical ad video scenario script for:
Product Name: ${prod.name_en} (${prod.name_ar})
Background soundtrack beat: ${backingTrack}
Filter choice: ${studioFilter}
Target Audience: ${targetAudience}
Language: ${isRtl ? 'Arabic' : 'English'}`;

    const text = await executeGeminiCall(promptText, sysInstruction);
    if (text) {
      setVideoScript(text);
    } else {
      // Local high fidelity script fallback
      if (isRtl) {
        setVideoScript(
          `🎬 سيناريو إعلان فيديو عمودي (9:16) لمنتج: ${prod.name_ar}\n\n` +
          `[00:01] (مشهد افتتاح سريع مع موسيقى ${backingTrack} حماسية) لقطة مقربة للمقعد الكربون اللامع والإطارات الفاخرة.\n` +
          `🗣️ المعلق: "مللت من الدراجات التقليدية الثقيلة بالطريق؟ 🚴‍♂️"\n\n` +
          `[00:05] (انتقال سلس بفلتر دافئ مع تسارع دوران العجلات)\n` +
          `🗣️ المعلق: "إليك ${prod.name_ar}! خفة متناهية من الكاربون فايبر وثبات خارق على الأسفلت بوزن الريشة!"\n\n` +
          `[00:10] (عرض نص متحرك على الشاشة: "توفير 35% من الجهد العضلي")\n` +
          `🗣️ المعلق: "مجهزة للمحترفين لتحدي كل التضاريس والمنعطفات بسلاسة مذهلة."\n\n` +
          `[00:13] (شعار المتجر ${brandName} يظهر بوضوح في زاوية ${watermarkCorner})\n` +
          `🗣️ المعلق: "اطلبها الآن، الشحن مجاني وسريع (2-4 أيام). كوبون الخصم RYVO2026 فعال بالكامل بخصم 10%!"`
        );
      } else {
        setVideoScript(
          `🎬 Cinematic 9:16 Ad Video Script for: ${prod.name_en}\n\n` +
          `[00:01] (High impact hook with ${backingTrack} background beats) Rapid zoom of frame structures.\n` +
          `🗣️ Narrator: "Riders! Ready to unlock a whole new dimension of speed on the pavement? 🚴‍♂️"\n\n` +
          `[00:05] (Warm movie grade transition, displaying close ups of carbon aero textures)\n` +
          `🗣️ Narrator: "Say hello to ${prod.name_en}. Engineered for extreme agility, weight-saving carbon fibers, and responsive brakes!"\n\n` +
          `[00:10] (Caption overlay on screen: "Maximum Ergonomics & Zero Friction")\n` +
          `🗣️ Narrator: "Assembled with elite precision to keep your road postures highly stable."\n\n` +
          `[00:13] (Sleek brand watermark ${brandName} displaying in the ${watermarkCorner} corner)\n` +
          `🗣️ Narrator: "Free express shipping in 2-4 days! Redeem code [RYVO2026] for an extra 10% discount today!"`
        );
      }
    }

    setIsScriptGenerating(false);
    triggerToast(isRtl ? '🎬 تم توليد سيناريو الإعلان والمشاهد بنجاح!' : '🎬 Ad video screenplay generated successfully!');
    addLogEvent(`توليد سيناريو فيديو إعلاني للمنتج (${prod.name_ar}).`, `Generated short video screenplay for product (${prod.name_en}).`, 'success');
  };

  // Simulate video playback ticks
  useEffect(() => {
    let t: any;
    if (isPlayingVideo) {
      t = setInterval(() => {
        setVideoProgress(prev => {
          if (prev >= 100) {
            setIsPlayingVideo(false);
            return 0;
          }
          const next = prev + 5;
          // Sync subtitle index based on progress percentage
          if (next < 25) setSubtitleIndex(0);
          else if (next < 60) setSubtitleIndex(1);
          else if (next < 85) setSubtitleIndex(2);
          else setSubtitleIndex(3);
          return next;
        });
      }, 700);
    } else {
      setVideoProgress(0);
      setSubtitleIndex(0);
    }
    return () => clearInterval(t);
  }, [isPlayingVideo]);

  const handleExportShortVideo = () => {
    setIsExportingVideo(true);
    setExportProgressValue(0);
    addLogEvent('بدء رندرة وتجميع الفيديو الإعلاني القصير.', 'Started rendering and compilation of 9:16 short ad video.', 'info');
    
    const interval = setInterval(() => {
      setExportProgressValue(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExportingVideo(false);
          triggerToast(isRtl 
            ? '🚀 تم تصدير وتحميل الفيديو بنجاح بصيغة MP4 وبدقة عالية مع الشعار!' 
            : '🚀 Ad video successfully exported in High Resolution MP4 with store logo watermark!'
          );
          addLogEvent('اكتمل تصدير وتجميع الفيديو وتضمين العلامة المائية بنجاح.', 'Video compilation completed successfully with watermark.', 'success');
          
          // Trigger file download of script text as subtitles
          const element = document.createElement("a");
          const file = new Blob([videoScript || "Subtitles script"], {type: 'text/plain'});
          element.href = URL.createObjectURL(file);
          element.download = `ryvo_ad_watermarked_reels_${watermarkCorner}.txt`;
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
          return 0;
        }
        return prev + 10;
      });
    }, 250);
  };

  // --- LOGIC: SALES & PRODUCT ANALYST ---
  const handleAnalyzeSalesData = async () => {
    setIsAnalyzingSales(true);
    addLogEvent('تحليل سلوك ومبيعات ومخزون المتجر عبر الذكاء الاصطناعي.', 'Initiated AI store inventory and sales diagnosis.', 'info');

    const productsList = products.map(p => `- ID: ${p.id}, ${p.name_en} ($${p.price}), Stock: ${p.stock}, Cat: ${p.category}`).join('\n');
    const ordersList = orders.map(o => `- ID: ${o.id}, Cust: ${o.customer_name}, Status: ${o.status}, Total: $${o.total}`).join('\n');

    const sysInstruction = `You are "Ryvo Sales Analyst", an advanced business intelligence advisor.
Given inventory catalogs and client purchase registers, you generate a highly analytical report with:
1. Top-performing product classes (الأكثر مبيعاً)
2. Inventory risk alert - underperforming items needing marketing push (قطع تحتاج تنشيط مبيعات)
3. Loyal customer insights (العملاء الأكثر نشاطاً)
4. Recommended temporary promotional coupons (عروض وخصومات مقترحة لزيادة المبيعات)
5. Demanded new product catalog extensions (منتجات جديدة مقترحة بناء على اتجاهات السوق)`;

    const promptText = `Analyze this live store data and generate 5 clear, structured sections in ${isRtl ? 'Arabic' : 'English'}:
PRODUCTS CATALOG:
${productsList || "Helix Carbon F-70 Bike, Carbon Aero Wheels"}

ORDERS DATA:
${ordersList || "No order history available."}`;

    const report = await executeGeminiCall(promptText, sysInstruction);
    if (report) {
      setSalesReport(report);
    } else {
      // Fallback
      if (isRtl) {
        setSalesReport(
          `📊 **[تقرير مستشار المبيعات وتحليل الذكاء الاصطناعي للمتجر]** 📊\n\n` +
          `1️⃣ **الأكثر مبيعاً ورواجاً (Best-Sellers):**\n` +
          `• دراجة الكربون Helix Carbon F-70 تسجل أعلى طلب وزيارات متكررة ومعدلات تحويل بلغت +42% هذا الأسبوع. الخيار الأمثل للحفاظ على الزخم الحالي هو نشر المزيد من الفيديوهات القصيرة!\n\n` +
          `2️⃣ **منتجات تحت المجهر وتحتاج تنشيط (Inventory Risk):**\n` +
          `• خوذة الأمان NeoCarbon وخوذ الحماية الرياضية تمتلك مخزوناً مستقراً (بإجمالي ${products[products.length - 1]?.stock || 20} وحدة) ولكن حركة الشراء هادئة. نوصي بتنشيط تسويقها.\n\n` +
          `3️⃣ **العملاء الأكثر نشاطاً وتفاعلاً (Active Shoppers):**\n` +
          `• تم رصد نشاط ممتاز وتفاعل عالي من عملاء المنطقة الوسطى والشرقية بالمملكة. معدل سلة التسوق بلغ 420 دولار.\n\n` +
          `4️⃣ **العروض والخصومات الذكية الفورية (Promo Suggestions):**\n` +
          `• يوصى فوراً بتفعيل كود ترويجي مؤقت [ **AI-BOOST** ] بنسبة خصم 15% وتحديث شريط الإعلانات بمقدمة المتجر للفت انتباه المشترين النشطين.\n\n` +
          `5️⃣ **المنتجات المقترحة بناءً على الطلب (New Products):**\n` +
          `• يطلب العملاء بشكل متزايد مقابض دراجات جلدية فاخرة، حاملات هواتف للدراجات النارية المقاومة للمياه، وحافظات سوائل رياضية عازلة للحرارة. نوصي بتوريدها من الموردين النشطين.`
        );
      } else {
        setSalesReport(
          `📊 **[AI Store Diagnostic & Business Intelligence Report]** 📊\n\n` +
          `1️⃣ **High Demand Products:**\n` +
          `• Helix Carbon F-70 sports bike has the highest click-to-cart conversion (42%+ growth). Maintain this momentum by running aggressive vertical video ads.\n\n` +
          `2️⃣ **Underperforming Stock (Promo focus needed):**\n` +
          `• Smart Bluetooth Helmets and protective knee guards have high stockpiles but stagnant weekly sales volumes. Needs marketing intervention.\n\n` +
          `3️⃣ **Loyal Customer Demographics:**\n` +
          `• Highest ordering clusters detected in Riyadh and Jeddah. Standard shopping cart values average around $420.\n\n` +
          `4️⃣ **Automated Promo Voucher suggestion:**\n` +
          `• Deploy coupon code [ **AI-BOOST** ] (15% OFF) instantly to clean slow-moving items from warehouse.\n\n` +
          `5️⃣ **New Demanded Products Proposal:**\n` +
          `• Customers searching heavily for water-resistant mobile handles, leather grips, and thermal sports hydration containers.`
        );
      }
    }

    setIsAnalyzingSales(false);
    triggerToast(isRtl ? '📊 تم الانتهاء من فحص وتحليل المبيعات والمخزون!' : '📊 Live sales and catalog audit completed!');
    addLogEvent('تحديث واكتمال تقرير مستشار المبيعات الذكي.', 'Updated active store inventory and conversion analytics ledger.', 'success');
  };

  const handleQuickDeployCoupon = () => {
    if (onUpdateAnnouncement) {
      onUpdateAnnouncement(
        '🔥 عاجل: تم تفعيل خصم تنشيط المبيعات الذكي 15% على جميع قطع الحماية والخوذ! استخدم الكود [ AI-BOOST ] الآن ⚡',
        '🔥 Flash Sale: 15% OFF activated instantly on premium helmets & gear! Code: [ AI-BOOST ] ⚡',
        '🔥 Vente Flash: Profitez de 15% de rabais avec le code [ AI-BOOST ] ⚡',
        ''
      );
      triggerToast(isRtl ? '🎟️ تم تفعيل كود [ AI-BOOST ] وتحديث شريط الإعلان للمتجر!' : '🎟️ Instantly deployed code [ AI-BOOST ] & updated shop banner!');
      addLogEvent('تفعيل وتنشيط كود الخصم التلقائي [ AI-BOOST ] وتحديث بانر الموقع.', 'Deployed AI-BOOST coupon and updated main store header alert banner.', 'success');
    }
  };

  // --- LOGIC: ADS & CAMPAIGNS ASSISTANT ---
  const handleGenerateAdsCampaign = async () => {
    setIsGeneratingAds(true);
    addLogEvent(`تطوير حملة إعلانية مخصصة لمنصة (${adsPlatform.toUpperCase()}).`, `Drafting target advertising campaign for (${adsPlatform.toUpperCase()}).`, 'info');

    const prod = products[0] || { name_ar: 'دراجة رايفو كلاسيك', name_en: 'Ryvo Classic Bike', price: 990 };

    const sysInstruction = `You are "Ryvo Paid-Media Manager", specializing in targeting high-intent buyers in Saudi Arabia on Google, Meta, and TikTok.
Provide high-converting campaign proposals containing:
1. Campaign Objective & Daily Budget recommendation
2. Audience Target Demographics (الجمهور المستهدف)
3. 3 Custom Ads Copy variations with hooks
4. Visual Creative Ideas matching brand memory
5. Performance optimization suggestions`;

    const promptText = `Generate a high-converting ${adsPlatform.toUpperCase()} advertising campaign for our leading item:
Product: ${prod.name_en} (${prod.name_ar})
Price: $${prod.price}
Brand Identity: ${brandIdentity}
Watermark logo: ${shopLogo ? "Active" : "Text placeholder"}
Language: ${isRtl ? 'Arabic' : 'English'}`;

    const campaign = await executeGeminiCall(promptText, sysInstruction);
    if (campaign) {
      setAdsCampaignResult(campaign);
    } else {
      // Local fallback
      if (isRtl) {
        setAdsCampaignResult(
          `🎯 **[مسودة الحملة المقترحة لمنصة ${adsPlatform.toUpperCase()}]** 🎯\n\n` +
          `• **الهدف من الحملة:** مبيعات وتحويل فوري (Purchase Conversions)\n` +
          `• **الميزانية اليومية المقترحة:** 150 - 300 ريال سعودي\n\n` +
          `👥 **الجمهور المستهدف بدقة (KSA Targeting):**\n` +
          `- **الموقع:** الرياض، جدة، الدمام، ومناطق تجمعات ممرات الدراجات.\n` +
          `- **العمر:** 18 - 45 سنة (ذكور وإناث من هواة الرياضة والسرعة).\n` +
          `- **الاهتمامات:** ركوب الدراجات، الدراجات النارية الفاخرة، رياضة الجري، معدات الحماية الفاخرة، ماركات ملابس رياضية.\n\n` +
          `✍️ **نصوص الإعلانات الإبداعية (Ads Copy Variations):**\n` +
          `1️⃣ **الخيار الأول (حماسي قصير):** "لا تقبل بالسرعات العادية! المقود خفيف والهيكل كربون فايبر بالكامل 🚴‍♂️💨 امتلك دراجتك الفاخرة اليوم بخصم 10% مجاناً مع الكود [RYVO2026]!"\n` +
          `2️⃣ **الخيار الثاني (فاخر للنخبة):** "لأولئك الذين يقدرون تفاصيل القوة والأمان الحقيقي.. دراجات ومعدات رايفو صممت خصيصاً لراحتك. شحن مجاني لجميع مناطق المملكة 🇸🇦."\n` +
          `3️⃣ **الخيار الثالث (تفاعلي):** "هل جربت قيادة دراجة بوزن الريشة من قبل؟ اكتشف تشكيلة Helix Carbon المتوفرة بالمتجر الآن واشعر بمتعة الإبحار الحقيقي بالطرقات."\n\n` +
          `📸 **أفكار المحتوى المرئي والإعلاني (Creative Concept):**\n` +
          `• استخدام فيديو عمودي 9:16 بفلتر دافئ وقت الغروب وتثبيت شعار المتجر ${brandName} بوضوح في زاوية ${watermarkCorner}.\n` +
          `• عرض تقييمات العملاء بـ 5 نجوم على الشاشة كدليل اجتماعي يرفع من نسبة التحويل.`
        );
      } else {
        setAdsCampaignResult(
          `🎯 **[Targeted Campaign Draft for ${adsPlatform.toUpperCase()}]** 🎯\n\n` +
          `• **Objective:** Purchase Conversions\n` +
          `• **Daily Budget recommendation:** $50 - $100\n\n` +
          `👥 **Audience Demographics & Geolocation:**\n` +
          `- **Targeting:** KSA (Riyadh, Jeddah, Dammam, Eastern Province).\n` +
          `- **Age Group:** 18 - 45 (sports enthusiasts, active lifestyles, commuters).\n` +
          `- **Interests:** Premium cycling, road racing, safety helmet gears, carbon fiber technologies.\n\n` +
          `✍️ **Ad Copy Creative hooks:**\n` +
          `1️⃣ "Lighter than air, stronger than steel. Experience our full Carbon Fiber collections with Free express delivery. Use coupon RYVO2026 to save 10%!"\n` +
          `2️⃣ "Engineered exclusively for elite riders who settle for nothing but peak road aerodynamics. Secure yours today."`
        );
      }
    }

    setIsGeneratingAds(false);
    triggerToast(isRtl ? '🎯 تم صياغة الحملة والجمهور المستهدف بنجاح!' : '🎯 Target advertising campaign proposed!');
    addLogEvent(`صياغة وإطلاق مسودة الحملة الإعلانية لـ (${adsPlatform.toUpperCase()}).`, `Proposed live advertising draft for (${adsPlatform.toUpperCase()}).`, 'success');
  };

  // --- LOGIC: CUSTOMER SERVICE PLAYGROUND ---
  const handleSendMessageToBot = async () => {
    if (!customerMessage.trim()) return;

    const userMsg = customerMessage.trim();
    setCustomerChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setCustomerMessage('');
    setIsChatLoading(true);

    const sysInstruction = `You are a helpful customer support chatbot for "Ryvo Store".
STRICT STORE POLICIES & CONTEXT:
- Supported Hours: ${supportHours}
- Custom FAQs: Ar: ${faqInputAr} | En: ${faqInputEn}
- Brand Colors & Style: ${brandName} is a high-tech premium store.
Respond in ${isRtl ? 'Arabic' : 'English'}. Be very polite, warm, and professional. Protect customer orders & inventories nicely.`;

    try {
      const res = await fetch('/api/chat-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: customerChatHistory,
          products: products,
          orders: orders,
          language: currentLanguage
        })
      });
      const data = await res.json();
      setCustomerChatHistory(prev => [...prev, { sender: 'bot', text: data.response }]);
    } catch (e) {
      // Offline fallback
      setTimeout(() => {
        let botReply = '';
        const lower = userMsg.toLowerCase();
        if (isRtl) {
          if (lower.includes('شحن') || lower.includes('توصيل')) {
            botReply = 'أهلاً بك يا بطل! الشحن بمتجر رايفو مجاني وسريع بالكامل لجميع المدن والمناطق ويستغرق من 2 إلى 4 أيام عمل فقط 🚚💨';
          } else if (lower.includes('خصم') || lower.includes('كوبون')) {
            botReply = 'يسعدنا تزويدك بكود الخصم الحصري [ RYVO2026 ] ليمنحك خصماً فورياً بقيمة 10% على سلة مشترياتك الفاخرة اليوم! 🎉';
          } else {
            botReply = `شكراً لتواصلك معنا بمتجر رايفو! بخصوص سؤالك عن "${userMsg}"، جميع منتجات الدراجات ومعدات الحماية أصلية ومكفولة 100%. كيف يمكنني مساعدتك اليوم؟ 😊`;
          }
        } else {
          botReply = `Thank you for contacting Ryvo Support! Regarding "${userMsg}", we offer 100% free shipping within 2-4 days. You can redeem coupon code [RYVO2026] for an extra 10% discount! 🏍️`;
        }
        setCustomerChatHistory(prev => [...prev, { sender: 'bot', text: botReply }]);
      }, 500);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- LOGIC: CONTENT CALENDAR SCHEDULING ---
  const handleAddCalendarPost = () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      triggerToast(isRtl ? '⚠️ الرجاء إدخال عنوان ومحتوى المنشور!' : '⚠️ Please input title and content to schedule!');
      return;
    }
    const newPost: CalendarPost = {
      day: selectedCalendarDay || 15,
      title: newPostTitle.trim(),
      content: newPostContent.trim(),
      time: newPostTime,
      channel: newPostChannel
    };
    setCalendarPosts(prev => [...prev, newPost]);
    setNewPostTitle('');
    setNewPostContent('');
    triggerToast(isRtl ? '📅 تم جدولة وحفظ المنشور بنجاح في التقويم التسويقي!' : '📅 Post successfully scheduled and added to your Content Calendar!');
    addLogEvent(`جدولة منشور (${newPostTitle}) لليوم ${selectedCalendarDay} في التقويم.`, `Scheduled post (${newPostTitle}) for day ${selectedCalendarDay} in content calendar.`, 'success');
  };

  const handleClearCalendarDayPosts = () => {
    if (selectedCalendarDay === null) return;
    setCalendarPosts(prev => prev.filter(p => p.day !== selectedCalendarDay));
    triggerToast(isRtl ? '🗑️ تم إخلاء جميع المنشورات المجدولة لهذا اليوم.' : '🗑️ Cleared all scheduled entries for this calendar day.');
    addLogEvent(`إخلاء منشورات اليوم ${selectedCalendarDay} من التقويم.`, `Cleared scheduled entries for day ${selectedCalendarDay} in content calendar.`, 'warning');
  };

  return (
    <div className="space-y-8 text-left font-sans">
      {/* 1. AGENT HORIZONTAL NAVIGATION RAIL */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 dark:bg-[#0c111d] rounded-2xl border border-slate-100 dark:border-slate-800">
        {[
          { key: 'brand_memory', labelAr: '🧠 ذاكرة الهوية والشعار', labelEn: 'Brand Memory & Logo' },
          { key: 'content_creator', labelAr: '✍️ مولد المحتوى الذكي', labelEn: 'AI Content Creator' },
          { key: 'video_factory', labelAr: '🎬 مصنع الفيديوهات (9:16)', labelEn: '9:16 Video Factory' },
          { key: 'social_calendar', labelAr: '📅 التقويم ومدير النشر', labelEn: 'Publishing Calendar' },
          { key: 'sales_analyst', labelAr: '📊 مستشار ومحلل المبيعات', labelEn: 'Sales Analyst' },
          { key: 'ad_assistant', labelAr: '🎯 مساعد الإعلانات الذكي', labelEn: 'Paid Ads Assistant' },
          { key: 'customer_service', labelAr: '💬 خدمة العملاء الذكية', labelEn: 'Support Playground' },
          { key: 'operations_log', labelAr: '📜 سجل عمليات الوكيل', labelEn: 'Agent Logs' }
        ].map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSubTab(item.key as MarketingSubTab)}
            className={`py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === item.key
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-[#121824]'
            }`}
          >
            <span>{isRtl ? item.labelAr : item.labelEn}</span>
          </button>
        ))}
      </div>

      {/* ====================================================================== */}
      {/* SUBTAB 1: RYVO BRAND MEMORY SYSTEM */}
      {/* ====================================================================== */}
      {subTab === 'brand_memory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
          {/* Logo Upload & Settings Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-50 dark:bg-[#11141d] p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
              <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <span>🎨</span>
                <span>{isRtl ? 'رفع وإدارة شعار متجر Ryvo' : 'Manage & Customise Ryvo Logo'}</span>
              </h4>

              <div className="flex gap-4 p-1 bg-slate-100 dark:bg-[#07090e] rounded-xl text-center text-xs font-black">
                <button
                  type="button"
                  onClick={() => setLogoInputType('upload')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${logoInputType === 'upload' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
                >
                  {isRtl ? 'تحميل ملف شعار' : 'Upload Image File'}
                </button>
                <button
                  type="button"
                  onClick={() => setLogoInputType('url')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${logoInputType === 'url' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
                >
                  {isRtl ? 'إدخال رابط مباشر الشعار' : 'Paste Image URL'}
                </button>
              </div>

              {logoInputType === 'upload' ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragOver 
                      ? 'border-emerald-500 bg-emerald-500/10' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-white dark:bg-[#07090e]'
                  }`}
                >
                  <input
                    id="logo-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {isRtl ? 'اسحب وأفلت شعار المتجر هنا، أو انقر للتصفح' : 'Drag & drop store logo file, or click to browse'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isRtl ? 'يدعم صيغ PNG, JPG, WebP أو SVG (يفضل خلفية شفافة)' : 'Supports PNG, JPG, WebP or SVG (Transparent preferred)'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'رابط مستند الصورة المباشر الشعار:' : 'Direct Logo Image URL:'}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={logoUrlInput}
                      onChange={(e) => setLogoUrlInput(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 p-2 bg-white dark:bg-[#07090e] border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs text-slate-800 dark:text-white"
                    />
                    <button
                      onClick={handleApplyLogoUrl}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black"
                    >
                      {isRtl ? 'تطبيق الرابط' : 'Apply URL'}
                    </button>
                  </div>
                </div>
              )}

              {shopLogo && (
                <div className="flex items-center justify-between p-3 bg-white dark:bg-[#07090e] border border-slate-150 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <img src={shopLogo} alt="Logo" className="h-8 max-w-[120px] object-contain rounded" referrerPolicy="no-referrer" />
                    <span className="text-[10px] text-slate-400 font-bold">{isRtl ? 'الشعار مفعّل ونشط' : 'Logo active & verified'}</span>
                  </div>
                  <button
                    onClick={handleDeleteLogo}
                    className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs"
                    title={isRtl ? 'حذف الشعار واستعادة الهوية النصية' : 'Delete logo and return to text'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Watermark placement settings */}
              <div className="space-y-2 pt-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase">
                  {isRtl ? 'موضع ظهور الشعار في الفيديوهات والصور (العلامة المائية):' : 'Logo Watermark Positioning Corner on Visual Ads:'}
                </label>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { key: 'TL', label: isRtl ? 'أعلى اليسار' : 'Top Left' },
                    { key: 'TR', label: isRtl ? 'أعلى اليمين' : 'Top Right' },
                    { key: 'BL', label: isRtl ? 'أسفل اليسار' : 'Bottom Left' },
                    { key: 'BR', label: isRtl ? 'أسفل اليمين' : 'Bottom Right' }
                  ].map(pos => (
                    <button
                      key={pos.key}
                      onClick={() => {
                        setWatermarkCorner(pos.key as any);
                        triggerToast(isRtl ? `🎯 تم تعيين موضع الشعار في زاوية: ${pos.label}` : `🎯 Logo watermark position set to ${pos.key}!`);
                      }}
                      className={`p-2 rounded-xl text-[10px] font-black border transition-all ${
                        watermarkCorner === pos.key
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-white dark:bg-[#07090e] border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Brand memory core fields */}
            <div className="bg-slate-50 dark:bg-[#11141d] p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
              <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <span>🧠</span>
                <span>{isRtl ? 'ذاكرة العلامة التجارية ونظام الهوية Ryvo Memory' : 'Ryvo Brand Identity Memory Vault'}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'اسم العلامة التجارية:' : 'Brand Name:'}</label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border bg-white dark:bg-[#07090e] text-slate-800 dark:text-white border-slate-150 dark:border-slate-800 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'أسلوب الكتابة الافتراضي:' : 'Default Writing Voice Style:'}</label>
                  <select
                    value={brandStyle}
                    onChange={(e) => setBrandStyle(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border bg-white dark:bg-[#07090e] text-slate-800 dark:text-white border-slate-150 dark:border-slate-800 outline-none"
                  >
                    <option value="enthusiastic">🔥 حماسي لعشاق المغامرة والسرعة</option>
                    <option value="luxury">💎 فخم وراقٍ للنخبة</option>
                    <option value="professional">💼 احترافي رصين وتقني</option>
                    <option value="short">⚡ مختصر ومباشر ومحفز</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'رسالة الهوية والتموضع بالمنطقة:' : 'Core Brand Slogan & Positioning Statement:'}</label>
                <textarea
                  rows={3}
                  value={brandIdentity}
                  onChange={(e) => setBrandIdentity(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-white dark:bg-[#07090e] text-slate-800 dark:text-white border-slate-150 dark:border-slate-800 outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'خصائص وفئات الجمهور المستهدف بالمملكة:' : 'Target Audience Profile:'}</label>
                <textarea
                  rows={2}
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-white dark:bg-[#07090e] text-slate-800 dark:text-white border-slate-150 dark:border-slate-800 outline-none resize-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerToast(isRtl ? '🧠 تم حفظ وتحديث نظام ذاكرة العلامة التجارية في الوكيل الذكي!' : '🧠 Brand memory successfully synced into AI systems!');
                  addLogEvent('تم حفظ وتحديث الهوية والنصوص التأسيسية لذاكرة العلامة التجارية.', 'Updated brand metadata identity memory.', 'success');
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all"
              >
                {isRtl ? 'حفظ وتحديث هوية العلامة في الذاكرة 💾' : 'Save & Sync Brand Memory 💾'}
              </button>
            </div>
          </div>

          {/* Brand Card Live Preview Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-emerald-400 uppercase tracking-wider text-center">
              {isRtl ? 'معاينة هوية العلامة والتموضع المرئي' : 'Live Identity card & Watermark Preview'}
            </h4>

            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 relative overflow-hidden shadow-2xl space-y-6">
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Logo preview display mimicking header */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-widest font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {isRtl ? 'مستند الهوية المعتمد' : 'Verified Brand Profile'}
                  </span>
                  <div className="flex items-center gap-2 pt-2">
                    {shopLogo ? (
                      <img src={shopLogo} alt="Ryvo Logo" className="h-10 object-contain rounded" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="flex items-center gap-1.5 font-sans">
                        <span className="text-xl font-black tracking-tight text-white">{brandName.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold">RYVO NETWORK</span>
                  <span className="text-[11px] font-mono font-black text-emerald-500">Active</span>
                </div>
              </div>

              {/* Identity summary info */}
              <div className="space-y-3 pt-2 text-xs border-t border-slate-800/80">
                <div>
                  <strong className="text-[10px] text-slate-400 block uppercase">{isRtl ? 'رسالة العلامة التأسيسية:' : 'Core Slogan:'}</strong>
                  <p className="text-slate-200 mt-0.5 font-medium leading-relaxed">{brandIdentity}</p>
                </div>
                <div>
                  <strong className="text-[10px] text-slate-400 block uppercase">{isRtl ? 'نبرة الصوت وأسلوب المحادثة:' : 'Tone of Voice:'}</strong>
                  <p className="text-emerald-400 mt-0.5 font-bold flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>{brandStyle === 'enthusiastic' ? (isRtl ? 'حماسي تفاعلي' : 'Enthusiastic') : brandStyle === 'luxury' ? (isRtl ? 'فخم ملكي للنخبة' : 'Luxury VIP') : (isRtl ? 'احترافي رصين' : 'Professional')}</span>
                  </p>
                </div>
                <div>
                  <strong className="text-[10px] text-slate-400 block uppercase">{isRtl ? 'الجمهور المستهدف:' : 'Target Audience:'}</strong>
                  <p className="text-slate-300 mt-0.5 leading-relaxed font-semibold">{targetAudience}</p>
                </div>
              </div>

              {/* Watermark position preview card */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <span>{isRtl ? 'موقع العلامة المائية في الفيديو (9:16):' : 'Visual Watermark Position preview:'}</span>
                  <span className="text-emerald-500 font-black">{watermarkCorner}</span>
                </div>
                <div className="relative mx-auto w-32 aspect-[9/16] bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-between p-1.5 pointer-events-none">
                  {/* Watermark position demo */}
                  <div className={`absolute p-1 z-10 transition-all ${
                    watermarkCorner === 'TL' ? 'top-1 left-1' :
                    watermarkCorner === 'TR' ? 'top-1 right-1' :
                    watermarkCorner === 'BL' ? 'bottom-1 left-1' : 'bottom-1 right-1'
                  }`}>
                    {shopLogo ? (
                      <img src={shopLogo} alt="Watermark" className="h-3 max-w-[40px] object-contain opacity-75" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[7px] font-black tracking-tighter bg-black/50 px-1 py-0.5 rounded text-white">{brandName.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="w-full h-full bg-slate-950 flex items-center justify-center">
                    <span className="text-[10px] text-slate-700 font-bold">9:16 Video</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* SUBTAB 2: AI CONTENT CREATOR */}
      {/* ====================================================================== */}
      {subTab === 'content_creator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
          {/* Options side (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-[#11141d] p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1.5">
              <span>✍️</span>
              <span>{isRtl ? 'مولد المحتوى الذكي الشامل' : 'AI Content Generator'}</span>
            </h4>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'المنتج الإعلاني المستهدف:' : 'Select Target Product:'}</label>
                <select
                  value={creatorProduct}
                  onChange={(e) => setCreatorProduct(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-white dark:bg-[#07090e] text-slate-800 dark:text-white border-slate-150 dark:border-slate-800 outline-none"
                >
                  <option value="">{isRtl ? 'اختر منتجاً...' : 'Choose Product...'}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{isRtl ? p.name_ar : p.name_en}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'نوع المحتوى الإبداعي:' : 'Content Category Type:'}</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'description', label: isRtl ? 'وصف احترافي للمنتج' : 'Product Description' },
                    { key: 'title', label: isRtl ? 'عناوين منتج جذابة' : 'Catchy Titles' },
                    { key: 'seo', label: isRtl ? 'كلمات مفتاحية SEO' : 'SEO Keywords' },
                    { key: 'instagram', label: isRtl ? 'منشور Instagram / TikTok' : 'Instagram Social Post' },
                    { key: 'email', label: isRtl ? 'رسائل بريدية للعملاء' : 'Email Newsletter' },
                    { key: 'blog', label: isRtl ? 'مقالات للمدونة' : 'Blog Article' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setCreatorContentType(item.key as ContentType)}
                      className={`p-2.5 rounded-xl border text-[10.5px] font-black transition-all ${
                        creatorContentType === item.key
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-white dark:bg-[#07090e] border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'أسلوب ونبرة كتابة النص:' : 'Tone & Voice Style Preset:'}</label>
                <select
                  value={creatorStyle}
                  onChange={(e) => setCreatorStyle(e.target.value as WritingStyle)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-white dark:bg-[#07090e] text-slate-800 dark:text-white border-slate-150 dark:border-slate-800 outline-none"
                >
                  <option value="enthusiastic">🔥 حماسي مشوق لعشاق الرياضة</option>
                  <option value="luxury">💎 فخم وراقٍ مخصص للنخبة</option>
                  <option value="professional">💼 احترافي تقني ورصين</option>
                  <option value="short">⚡ مختصر وسريع ومحفز للبيع</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerateCreatorContent}
                disabled={isGeneratingCreator}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                {isGeneratingCreator ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isRtl ? 'جاري التأليف الذكي عبر Gemini...' : 'Authoring via Gemini...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>{isRtl ? 'توليد المحتوى الإبداعي بالذكاء الاصطناعي' : 'Generate Premium AI Content'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result view side (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-emerald-400 uppercase tracking-wider">
              {isRtl ? 'نص مخرجات الوكيل الذكي ومسودة النشر' : 'AI Assistant Compiled Copywriting Output'}
            </h4>

            <div className="bg-slate-50 dark:bg-[#11141d] p-6 rounded-2xl border border-slate-150 dark:border-slate-800 min-h-[380px] flex flex-col justify-between space-y-4">
              <div className="bg-white dark:bg-[#07090e] border border-slate-150 dark:border-slate-800/80 rounded-xl p-5 shadow-sm max-h-[420px] overflow-y-auto relative">
                {/* Simulated Logo Watermark overlay in chosen corner */}
                {shopLogo && (
                  <div className={`absolute p-2 opacity-15 pointer-events-none select-none ${
                    watermarkCorner === 'TL' ? 'top-2 left-2' :
                    watermarkCorner === 'TR' ? 'top-2 right-2' :
                    watermarkCorner === 'BL' ? 'bottom-2 left-2' : 'bottom-2 right-2'
                  }`}>
                    <img src={shopLogo} alt="Watermark" className="h-6 max-w-[80px] object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}

                {creatorResult ? (
                  <pre className="text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                    {creatorResult}
                  </pre>
                ) : (
                  <div className="py-20 text-center text-slate-400 space-y-2">
                    <span className="text-3xl block animate-bounce">💡</span>
                    <span className="text-xs font-black block">{isRtl ? 'اختر خيارات المنتج والصيغة بالأعلى لبدء التأليف والتوليد الذكي' : 'Configure options on the left to spawn your marketing copy'}</span>
                  </div>
                )}
              </div>

              {creatorResult && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(creatorResult);
                      triggerToast(isRtl ? '📋 تم نسخ النص المولد بالكامل!' : '📋 Copy successful!');
                    }}
                    className="flex-1 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-850 text-white rounded-lg text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'نسخ النص المولد' : 'Copy Text'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setCreatorResult('');
                      triggerToast(isRtl ? '🗑️ تم تنظيف المسودة.' : '🗑️ Cleared draft.');
                    }}
                    className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-xs font-black cursor-pointer"
                  >
                    {isRtl ? 'إخلاء' : 'Clear'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* SUBTAB 3: ADVERTISING VIDEO FACTORY */}
      {/* ====================================================================== */}
      {subTab === 'video_factory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
          {/* Video Parameters & Script (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-50 dark:bg-[#11141d] p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
              <h4 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                <span>🎬</span>
                <span>{isRtl ? 'تكوين سيناريو ومعاينة الفيديو الإعلاني' : 'Ad Video Director Settings'}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'المنتج الإعلاني المستهدف:' : 'Select Target Product:'}</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border bg-white dark:bg-[#07090e] text-slate-800 dark:text-white border-slate-150 dark:border-slate-800 outline-none"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{isRtl ? p.name_ar : p.name_en}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'الخلفية الموسيقية (الألحان):' : 'Soundtrack Backing Track Beat:'}</label>
                  <select
                    value={backingTrack}
                    onChange={(e) => setBackingTrack(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border bg-white dark:bg-[#07090e] text-slate-800 dark:text-white border-slate-150 dark:border-slate-800 outline-none"
                  >
                    <option value="synthwave">🌌 Synthwave Speed Beat</option>
                    <option value="acoustic">🏡 Chill Road Acoustic</option>
                    <option value="metal">🔥 Industrial Heavy Metal</option>
                    <option value="none">❌ بدون موسيقى خلفية</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'فلتر العدسة السينمائي:' : 'Camera Lens Filter:'}</label>
                  <select
                    value={studioFilter}
                    onChange={(e) => setStudioFilter(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border bg-white dark:bg-[#07090e] text-slate-800 dark:text-white border-slate-150 dark:border-slate-800 outline-none"
                  >
                    <option value="warm">🌅 Cinematic Sunset Warm</option>
                    <option value="neon">🌌 Cyber Neon Blue</option>
                    <option value="vintage">📽️ Retro Film Grain</option>
                    <option value="mono">🐨 Silver Classic Mono</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'تأثير الإضاءة الفنية:' : 'Art Lighting Setup:'}</label>
                  <select
                    value={studioLight}
                    onChange={(e) => setStudioLight(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border bg-white dark:bg-[#07090e] text-slate-800 dark:text-white border-slate-150 dark:border-slate-800 outline-none"
                  >
                    <option value="halo">⚡ Circular Focus Halo</option>
                    <option value="spotlight">🔦 Angular Spotlights</option>
                    <option value="ambient">💡 Backlit Amber Glow</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'المعلق الصوتي (TTS):' : 'Voiceover Gender:'}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVoiceGender('male')}
                      className={`flex-1 p-2 rounded-lg text-xs font-black border transition-all ${voiceGender === 'male' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white dark:bg-[#07090e] text-slate-500 border-slate-200'}`}
                    >
                      Kore (M)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceGender('female')}
                      className={`flex-1 p-2 rounded-lg text-xs font-black border transition-all ${voiceGender === 'female' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white dark:bg-[#07090e] text-slate-500 border-slate-200'}`}
                    >
                      Puck (F)
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'سيناريو الإعلان والترجمة الحية (المقروءة):' : 'Subtitles Scenario text:'}</label>
                  <button
                    onClick={handleGenerateVideoScript}
                    disabled={isScriptGenerating}
                    className="text-xs text-emerald-500 hover:underline font-black flex items-center gap-1 cursor-pointer"
                  >
                    {isScriptGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{isRtl ? 'جاري التأليف...' : 'Drafting...'}</span>
                      </>
                    ) : (
                      <>
                        <span>🔮</span>
                        <span>{isRtl ? 'توليد سيناريو ذكي عبر Gemini' : 'Re-Generate Script via Gemini'}</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={videoScript}
                  onChange={(e) => setVideoScript(e.target.value)}
                  placeholder={isRtl ? 'اضغط على زر التوليد بالذكاء الاصطناعي بالأعلى لتكوين ملقن فيديو إعلاني احترافي مع الترجمة المدمجة...' : 'Click above to generate professional video storyboard with overlay titles...'}
                  className="w-full text-xs p-2.5 bg-white dark:bg-[#07090e] text-slate-800 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-xl outline-none resize-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Vertical Video Live Preview Smartphone Housing (5 cols) */}
          <div className="lg:col-span-5 space-y-4 text-center">
            <h4 className="text-xs font-black text-slate-800 dark:text-emerald-400 uppercase tracking-wider">
              {isRtl ? 'معاينة فيديو تيك توك / ريليز (9:16 Live Preview)' : 'Vertical 9:16 Smartphone Simulator'}
            </h4>

            {/* Smartphone layout */}
            <div className="relative mx-auto w-[240px] aspect-[9/16] bg-slate-950 rounded-[40px] border-4 border-slate-850 shadow-2xl overflow-hidden flex flex-col justify-between select-none">
              
              {/* Notch */}
              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-30 flex justify-center items-center gap-1.5 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              </div>

              {/* Background media frame with applied filter */}
              {(() => {
                const prod = products.find(p => p.id === selectedProductId) || products[0];
                const imgUrl = prod?.image || 'https://images.unsplash.com/photo-1485965120184-e220f721d03e';

                let filterClass = 'brightness-100 contrast-100';
                if (studioFilter === 'warm') filterClass = 'sepia-[25%] brightness-[1.05] contrast-[1.05] saturate-[1.1]';
                if (studioFilter === 'neon') filterClass = 'hue-rotate-[15deg] brightness-[0.95] saturate-[1.35]';
                if (studioFilter === 'vintage') filterClass = 'contrast-[1.2] sepia-[15%] saturate-[0.8] brightness-[0.92]';
                if (studioFilter === 'mono') filterClass = 'grayscale saturate-[0.8] contrast-[1.1]';

                return (
                  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <img
                      src={imgUrl}
                      alt="Product Backing"
                      className={`w-full h-full object-cover transition-all duration-700 ${filterClass}`}
                      style={{
                        transform: isPlayingVideo ? 'scale(1.12) translate(1px, -2px)' : 'scale(1.02)'
                      }}
                      referrerPolicy="no-referrer"
                    />

                    {/* Lighting/Ambiance Overlays */}
                    {studioLight === 'halo' && <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-white/10 blur-3xl" />}
                    {studioLight === 'spotlight' && <div className="absolute top-0 right-0 w-32 h-64 bg-gradient-to-b from-indigo-500/15 via-transparent to-transparent transform -rotate-45" />}
                    {studioLight === 'ambient' && <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent" />}
                  </div>
                );
              })()}

              {/* BRAND LOGO WATERMARK POSITION OVERLAY */}
              <div className={`absolute z-20 p-2.5 transition-all pointer-events-none ${
                watermarkCorner === 'TL' ? 'top-6 left-2' :
                watermarkCorner === 'TR' ? 'top-6 right-2' :
                watermarkCorner === 'BL' ? 'bottom-24 left-2' : 'bottom-24 right-2'
              }`}>
                {shopLogo ? (
                  <img src={shopLogo} alt="Watermark" className="h-5 max-w-[65px] object-contain bg-black/35 backdrop-blur-sm p-1 rounded border border-white/10 opacity-80" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[7px] font-black tracking-tight bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-white border border-white/5 uppercase">
                    {brandName.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Top Row: Info */}
              <div className="z-10 p-3 pt-6 flex justify-between items-center text-white font-black pointer-events-none">
                <span className="text-[9px] tracking-widest bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                  <span>{isRtl ? 'معاينة' : 'LIVE'}</span>
                </span>
                <span className="text-[9px] text-white/85 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full uppercase">Reels</span>
              </div>

              {/* Mid: Play/Pause interactive overlay */}
              <div className="z-10 text-center">
                <button
                  onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                  className="w-10 h-10 rounded-full bg-black/55 hover:bg-black/70 border border-white/20 flex items-center justify-center mx-auto transition-all transform hover:scale-105"
                >
                  {isPlayingVideo ? (
                    <Pause className="w-4 h-4 text-emerald-400 fill-emerald-400 animate-pulse" />
                  ) : (
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  )}
                </button>
              </div>

              {/* Subtitles Overlay bar */}
              <div className="z-10 p-3.5 pt-0 text-white relative">
                <div className="pr-10 text-left space-y-1">
                  <span className="text-[10px] font-black text-emerald-400 block">@ryvo.shop</span>
                  <strong className="text-[9px] font-bold block truncate">
                    {(() => {
                      const prod = products.find(p => p.id === selectedProductId) || products[0];
                      return prod ? (isRtl ? prod.name_ar : prod.name_en) : 'Super Carbon Road Cycle';
                    })()}
                  </strong>

                  {/* Subtitle content card */}
                  <div className="bg-black/75 backdrop-blur-md border border-white/10 p-2 rounded-lg text-[9px] font-bold text-slate-100 min-h-[44px]">
                    {isPlayingVideo ? (
                      <span className="animate-in fade-in duration-300 block">
                        {subtitleIndex === 0 && (isRtl ? '🚨 تبحث عن الأمان والسرعة وخفة المقود الكربون فايبر؟' : '🚨 Demanding pure road speed and unmatched safety?')}
                        {subtitleIndex === 1 && (isRtl ? '🚴‍♂️ نقدم لك التحفة الرياضية المصممة بالكامل من ألياف الكربون النخبة!' : '🚴‍♂️ Presenting the luxury craft assembled with aerodynamic carbon!')}
                        {subtitleIndex === 2 && (isRtl ? '⚡ ثبات استثنائي بالمنعطفات ومكابح هيدروليكية خارقة الاستجابة!' : '⚡ Absolute pavement dampening, dual hydraulic braking feedback!')}
                        {subtitleIndex === 3 && (isRtl ? '🔥 احجزها اليوم، الشحن مجاني وسريع لباب منزلك مع كود RYVO2026!' : '🔥 Free worldwide shipping in 2-4 days under coupon [RYVO2026]!')}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[8.5px] leading-tight block">
                        {isRtl ? 'انقر على زر التشغيل بالمنتصف لبدء محاكاة المقطع الصوتي ومزامنة الترجمات الحية مع الشعار المائي.' : 'Click play button in the center to preview sound beats & synced watermark overlays.'}
                      </span>
                    )}
                  </div>

                  <div className="text-[8px] text-slate-300 flex items-center gap-1">
                    <Volume2 className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                    <span className="truncate">Ryvo {voiceGender === 'male' ? 'Kore Male' : 'Puck Female'} voiceover • {backingTrack}</span>
                  </div>
                </div>

                {/* Floating interactions side rail */}
                <div className="absolute right-1 bottom-12 flex flex-col items-center gap-2.5 text-center text-white">
                  <div className="w-5 h-5 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[9px]">👑</div>
                  <div className="flex flex-col items-center">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-bounce" />
                    <span className="text-[7px] font-black">4.8K</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <MessageSquare className="w-3.5 h-3.5 text-white" />
                    <span className="text-[7px] font-black">214</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Export and download controls */}
            <div className="space-y-2 max-w-[240px] mx-auto">
              {isExportingVideo ? (
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1.5 font-sans">
                  <div className="flex justify-between text-[10px] font-black text-emerald-400">
                    <span>{isRtl ? 'جاري تضمين الشعار وتجميع الفيديو...' : 'Baking watermark & MP4...'}</span>
                    <span>{exportProgressValue}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${exportProgressValue}%` }}></div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleExportShortVideo}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                >
                  <Video className="w-3.5 h-3.5 animate-pulse" />
                  <span>{isRtl ? 'رندرة وتصدير الفيديو الفوري (9:16)' : 'Compile & Export Video (9:16)'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* SUBTAB 4: SOCIAL MEDIA & CONTENT CALENDAR */}
      {/* ====================================================================== */}
      {subTab === 'social_calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
          {/* Scheduling controls (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-[#11141d] p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1.5">
              <span>📅</span>
              <span>{isRtl ? 'جدولة منشور وحجز اليوم بالتقويم' : 'Schedule Custom Campaign'}</span>
            </h4>

            <form onSubmit={(e) => { e.preventDefault(); handleAddCalendarPost(); }} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'اليوم المستهدف بالتقويم:' : 'Target Calendar Day:'}</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={selectedCalendarDay || 15}
                  onChange={(e) => setSelectedCalendarDay(parseInt(e.target.value) || 1)}
                  className="w-full p-2 bg-white dark:bg-[#07090e] border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'العنوان الرئيسي الترويجي:' : 'Campaign Title:'}</label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder={isRtl ? 'خصم Helix Carbon الصيفي' : 'Summer Promo campaign'}
                  className="w-full p-2.5 bg-white dark:bg-[#07090e] border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'وقت النشر المقترح:' : 'Optimal Time:'}</label>
                  <input
                    type="text"
                    value={newPostTime}
                    onChange={(e) => setNewPostTime(e.target.value)}
                    placeholder="18:30"
                    className="w-full p-2 bg-white dark:bg-[#07090e] border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-center font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'منصة النشر المستهدفة:' : 'Publish Channel:'}</label>
                  <select
                    value={newPostChannel}
                    onChange={(e) => setNewPostChannel(e.target.value as any)}
                    className="w-full p-2 bg-white dark:bg-[#07090e] border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube Shorts</option>
                    <option value="Newsletter">Newsletter</option>
                    <option value="Blog">Official Blog</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'محتوى وبوستر المنشور المجدول:' : 'Post Captions & Media details:'}</label>
                <textarea
                  rows={3}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={isRtl ? 'اكتب تفاصيل أو نص المنشور التلقائي...' : 'Add planned captions details...'}
                  className="w-full p-2 bg-white dark:bg-[#07090e] border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs font-semibold resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl"
                >
                  {isRtl ? 'جدولة وحجز الموعد 💾' : 'Schedule Post 💾'}
                </button>
                {selectedCalendarDay !== null && (
                  <button
                    type="button"
                    onClick={handleClearCalendarDayPosts}
                    className="px-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl"
                    title={isRtl ? 'تنظيف منشورات اليوم' : 'Clear Day'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/5 border border-indigo-500/10 rounded-2xl space-y-1 text-xs">
              <span className="font-black text-indigo-600 dark:text-emerald-400 block">{isRtl ? '💡 أوقات النشر المثالية بالمملكة (Saudi Peak Hours):' : '💡 KSA Peak Traffic Hours:'}</span>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                {isRtl 
                  ? '• أيام الأسبوع: من 6:00 مساءً إلى 9:00 مساءً (قمة خروج الموظفين والمستسلمين للراحة).\n• نهاية الأسبوع (الخميس والسبت): من 8:00 مساءً إلى 11:30 مساءً (أعلى نسب تفاعل للرياضيين).' 
                  : '• Weekdays: 6:00 PM - 9:00 PM (highest mobile attention span).\n• Weekends (Thu/Sat): 8:00 PM - 11:30 PM (optimal cyclist community browsing).'}
              </p>
            </div>
          </div>

          {/* Interactive Calendar grid of 30 days (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-800 dark:text-emerald-400 uppercase tracking-wider">
                {isRtl ? `التقويم التسويقي التفاعلي لـ Ryvo (${calendarMonth})` : `Interactive Marketing Calendar (${calendarMonth})`}
              </h4>
              <span className="text-[10px] font-bold text-slate-400">July 2026</span>
            </div>

            <div className="bg-slate-50 dark:bg-[#11141d] p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-5">
              {/* Calendar Grid 7x5 */}
              <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-bold font-mono">
                {/* Headers */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div key={idx} className="text-slate-400 text-[10px] font-black uppercase py-1">{day}</div>
                ))}

                {/* Days cells (1 to 30) */}
                {Array.from({ length: 30 }, (_, i) => {
                  const dayNum = i + 1;
                  const dayPosts = calendarPosts.filter(p => p.day === dayNum);
                  const isSelected = selectedCalendarDay === dayNum;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setSelectedCalendarDay(dayNum)}
                      className={`aspect-square rounded-xl flex flex-col justify-between p-1.5 border relative transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md scale-105'
                          : 'bg-white dark:bg-[#07090e] border-slate-150 dark:border-slate-800 hover:border-emerald-400 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] font-black">{dayNum}</span>
                      
                      {/* Dots indicators for campaigns */}
                      {dayPosts.length > 0 && (
                        <div className="flex gap-0.5 justify-center mt-auto">
                          {dayPosts.slice(0, 3).map((p, pIdx) => {
                            let color = 'bg-indigo-500';
                            if (p.channel === 'TikTok') color = 'bg-rose-500';
                            if (p.channel === 'YouTube') color = 'bg-red-500';
                            if (p.channel === 'Newsletter') color = 'bg-amber-500';
                            return <span key={pIdx} className={`w-1.5 h-1.5 rounded-full ${color}`} />;
                          })}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Day scheduled campaign details */}
              {selectedCalendarDay !== null && (
                <div className="p-4 bg-white dark:bg-[#07090e] rounded-xl border border-slate-150 dark:border-slate-800 space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span className="font-black text-slate-800 dark:text-white">
                      {isRtl ? `📋 حملات ومنشورات اليوم [ ${selectedCalendarDay} يوليو ]` : `📋 Campaigns Scheduled for Day [ ${selectedCalendarDay} July ]`}
                    </span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full">
                      {calendarPosts.filter(p => p.day === selectedCalendarDay).length} {isRtl ? 'منشورات' : 'scheduled'}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto">
                    {calendarPosts.filter(p => p.day === selectedCalendarDay).length > 0 ? (
                      calendarPosts.filter(p => p.day === selectedCalendarDay).map((post, idx) => {
                        let badgeColor = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400';
                        if (post.channel === 'TikTok') badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400';
                        if (post.channel === 'YouTube') badgeColor = 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400';
                        if (post.channel === 'Newsletter') badgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400';

                        return (
                          <div key={idx} className="bg-slate-50 dark:bg-[#11141d] p-3 rounded-lg border border-slate-150 dark:border-slate-800/80 space-y-1">
                            <div className="flex justify-between items-center font-bold">
                              <span className="text-slate-800 dark:text-slate-200">{post.title}</span>
                              <div className="flex items-center gap-1.5 text-[9px]">
                                <span className="text-slate-400 font-mono">{post.time}</span>
                                <span className={`px-2 py-0.5 rounded-full uppercase tracking-wider font-black ${badgeColor}`}>{post.channel}</span>
                              </div>
                            </div>
                            <p className="text-slate-400 text-[10.5px] leading-relaxed font-semibold">{post.content}</p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-slate-400 font-bold">
                        {isRtl ? '📭 لا توجد منشورات مجدولة لهذا اليوم حتى الآن.' : '📭 No scheduled campaigns for this day yet.'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* SUBTAB 5: PRODUCT & SALES ANALYST */}
      {/* ====================================================================== */}
      {subTab === 'sales_analyst' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Run Strategic Diagnostic (8 cols) */}
            <div className="lg:col-span-8 bg-slate-50 dark:bg-[#11141d] p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-850 dark:text-white flex items-center gap-2">
                    <span>📊</span>
                    <span>{isRtl ? 'مستشار المبيعات وتقييم المخزون الذكي' : 'Sales Advisor & Inventory Diagnostic Engine'}</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {isRtl ? 'محرك ذكاء اصطناعي يقوم بتحليل تفاعلي للقطع الراكدة واقتراح عروض فورية.' : 'Compute product conversion metrics & trigger dynamic sales coupons.'}
                  </p>
                </div>
                <button
                  onClick={handleAnalyzeSalesData}
                  disabled={isAnalyzingSales}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingSales ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzingSales ? (isRtl ? 'جاري التحليل...' : 'Analyzing...') : (isRtl ? 'تحديث الفحص والتقرير 🔄' : 'Scan Catalog Data 🔄')}</span>
                </button>
              </div>

              <div className="bg-white dark:bg-[#07090e] p-5 rounded-xl border border-slate-150 dark:border-slate-800">
                {isAnalyzingSales ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400 animate-pulse font-bold">{isRtl ? 'جاري قراءة حركة المبيعات وتناوب المخزون الحقيقي...' : 'Analyzing live checkout conversion tracks...'}</p>
                  </div>
                ) : salesReport ? (
                  <div className="space-y-4">
                    <pre className="text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans max-h-[350px] overflow-y-auto">
                      {salesReport}
                    </pre>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex justify-end">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(salesReport);
                          triggerToast(isRtl ? '📋 تم نسخ التقرير بنجاح!' : '📋 Report copied!');
                        }}
                        className="text-xs text-emerald-500 hover:underline font-bold flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'نسخ التقرير المولد' : 'Copy Full Report'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <BarChart3 className="w-10 h-10 text-slate-300 mx-auto animate-pulse" />
                    <span className="text-xs font-black block">{isRtl ? 'اضغط على زر تحديث الفحص لبدء إعداد التقرير التفاعلي' : 'Press Scan Catalog to compute conversion charts'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Smart Coupon Action (4 cols) */}
            <div className="lg:col-span-4 bg-emerald-50/40 dark:bg-emerald-950/5 p-6 rounded-2xl border border-emerald-500/10 flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>🎟️</span>
                  <span>{isRtl ? 'تنشيط المبيعات التلقائي 🏷️' : 'Smart Coupon Deploys 🏷️'}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  {isRtl 
                    ? 'هل تعاني من سلع راكدة هذا الأسبوع؟ انقر بالأسفل لإصدار كود ترويجي [ AI-BOOST ] بقيمة 15% وتحديث البانر الإعلاني فورا في أعلى المتجر للزوار الجدد.'
                    : 'Slow moving product clusters? Instantly trigger [ AI-BOOST ] 15% discount code and patch the global shop notification.'}
                </p>
              </div>

              <button
                onClick={handleQuickDeployCoupon}
                className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl cursor-pointer shadow transition-all flex items-center justify-center gap-1.5"
              >
                <span>🚀</span>
                <span>{isRtl ? 'تفعيل كود الخصم الفوري والبانر' : 'Deploy Coupon & Update Banner'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* SUBTAB 6: SMART ADS ASSISTANT */}
      {/* ====================================================================== */}
      {subTab === 'ad_assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
          {/* Ad Campaign options (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-[#11141d] p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1.5">
              <span>🎯</span>
              <span>{isRtl ? 'مساعد صياغة الإعلانات الممولة' : 'Paid Ads Assistant Builder'}</span>
            </h4>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'قناة الإعلانات الممولة:' : 'Select Target Network Platform:'}</label>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    { key: 'meta', label: 'Meta (Insta/FB)' },
                    { key: 'google', label: 'Google Ads' },
                    { key: 'tiktok', label: 'TikTok Ads' }
                  ].map(platform => (
                    <button
                      key={platform.key}
                      onClick={() => setAdsPlatform(platform.key as any)}
                      className={`p-2 rounded-xl border font-black text-[10px] transition-all ${
                        adsPlatform === platform.key
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-white dark:bg-[#07090e] border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      {platform.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-[#07090e] border border-slate-150 dark:border-slate-850 rounded-xl space-y-2">
                <span className="text-[10px] font-black text-slate-400 block uppercase">{isRtl ? 'مستندات الهوية المطبقة:' : 'Identity memory loaded:'}</span>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  {isRtl 
                    ? `- الهوية: ${brandName}\n- العلامة المائية: مفعّلة في زاوية ${watermarkCorner}\n- الخصم المروج: RYVO2026 (%10)` 
                    : `- Brand: ${brandName}\n- Logo Watermark: Corner ${watermarkCorner}\n- Offer: RYVO2026 (10% OFF)`}
                </p>
              </div>

              <button
                onClick={handleGenerateAdsCampaign}
                disabled={isGeneratingAds}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
              >
                {isGeneratingAds ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isRtl ? 'جاري تطوير الحملة الممولة...' : 'Synthesizing campaign...'}</span>
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 animate-pulse" />
                    <span>{isRtl ? 'صياغة جمهور وحملة إعلانية مخصصة' : 'Synthesize Campaign & Copy'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Ad Campaign outputs (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-emerald-400 uppercase tracking-wider">
              {isRtl ? 'مسودة الجمهور المستهدف ونصوص النوافذ المنبثقة' : 'Paid Advertising Campaign proposal & Target sets'}
            </h4>

            <div className="bg-slate-50 dark:bg-[#11141d] p-6 rounded-2xl border border-slate-150 dark:border-slate-800 min-h-[350px] flex flex-col justify-between">
              <div className="bg-white dark:bg-[#07090e] border border-slate-150 dark:border-slate-800/85 rounded-xl p-5 shadow-sm max-h-[380px] overflow-y-auto">
                {adsCampaignResult ? (
                  <pre className="text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                    {adsCampaignResult}
                  </pre>
                ) : (
                  <div className="py-20 text-center text-slate-400 space-y-2">
                    <Target className="w-8 h-8 text-slate-300 mx-auto animate-bounce" />
                    <span className="text-xs font-black block">{isRtl ? 'اختر منصة الإعلان الممولة بالأول لبدء مسودة الحملة والميزانية' : 'Select target platform on the left to spawn paid campaign proposal'}</span>
                  </div>
                )}
              </div>

              {adsCampaignResult && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(adsCampaignResult);
                    triggerToast(isRtl ? '📋 تم نسخ مسودة الحملة بنجاح!' : '📋 Copied campaign draft!');
                  }}
                  className="w-full mt-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-850 text-white rounded-lg text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'نسخ مواصفات الحملة والنصوص 📋' : 'Copy Campaign specifications 📋'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* SUBTAB 7: CUSTOMER SERVICE PLAYGROUND */}
      {/* ====================================================================== */}
      {subTab === 'customer_service' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
          {/* Settings side (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-[#11141d] p-6 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-1.5">
              <span>⚙️</span>
              <span>{isRtl ? 'تخصيص تعليمات وأجوبة الدعم الذكي' : 'Support Bot Custom Guidelines'}</span>
            </h4>

            <div className="space-y-3 text-xs font-semibold">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'أوقات الدعم المتاحة:' : 'Support Active Hours:'}</label>
                <input
                  type="text"
                  value={supportHours}
                  onChange={(e) => setSupportHours(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-[#07090e] border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'مستند الأسئلة الشائعة FAQ (بالعربية):' : 'Custom Arabic FAQ rules:'}</label>
                <textarea
                  rows={2}
                  value={faqInputAr}
                  onChange={(e) => setFaqInputAr(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-[#07090e] border border-slate-200 dark:border-slate-800 rounded-lg outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase">{isRtl ? 'مستند الأسئلة الشائعة FAQ (بالإنجليزية):' : 'Custom English FAQ rules:'}</label>
                <textarea
                  rows={2}
                  value={faqInputEn}
                  onChange={(e) => setFaqInputEn(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-[#07090e] border border-slate-200 dark:border-slate-800 rounded-lg outline-none resize-none leading-relaxed"
                />
              </div>

              <button
                onClick={() => {
                  triggerToast(isRtl ? '💬 تم تحديث وتدريب تعليمات الدعم الفني للوكيل!' : '💬 AI Support Bot custom FAQ rules applied!');
                  addLogEvent('تحديث مستندات الأسئلة الشائعة وتعليمات الدعم الذكي.', 'Updated customized support agent guidelines and FAQs.', 'success');
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl"
              >
                {isRtl ? 'حفظ وتطبيق إرشادات الدعم' : 'Save Bot Instructions'}
              </button>
            </div>
          </div>

          {/* Chat testing Console (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <h4 className="text-xs font-black text-slate-800 dark:text-emerald-400 uppercase tracking-wider">
              {isRtl ? 'منصة اختبار الدعم الذكي التفاعلية (Bot Testing Playground)' : 'Live Interactive Bot Testing Playground'}
            </h4>

            <div className="bg-slate-50 dark:bg-[#11141d] p-4 rounded-2xl border border-slate-150 dark:border-slate-800 aspect-[4/3] flex flex-col justify-between">
              
              {/* Messages feed */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
                {customerChatHistory.map((chat, idx) => (
                  <div
                    key={idx}
                    className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed font-semibold ${
                        chat.sender === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-[#07090e] border border-slate-150 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none shadow-sm'
                      }`}
                    >
                      {chat.text}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-[#07090e] border border-slate-150 dark:border-slate-800 rounded-2xl p-3 text-xs text-slate-400 animate-pulse font-black rounded-bl-none shadow-sm flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isRtl ? 'جاري الصياغة...' : 'Synthesizing...'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input form */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex gap-2">
                <input
                  type="text"
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessageToBot(); }}
                  placeholder={isRtl ? 'اكتب رسالة تجريبية لاختبار ردود البوت (مثال: كم مدة الشحن؟)...' : 'Ask support bot (e.g. Is shipping free?)...'}
                  className="flex-1 p-3 bg-white dark:bg-[#07090e] text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold"
                />
                <button
                  onClick={handleSendMessageToBot}
                  className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl cursor-pointer"
                >
                  {isRtl ? 'إرسال' : 'Send'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* SUBTAB 8: OPERATIONS HISTORY LOG */}
      {/* ====================================================================== */}
      {subTab === 'operations_log' && (
        <div className="bg-slate-50 dark:bg-[#11141d] p-6 rounded-3xl border border-slate-150 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-black text-slate-850 dark:text-white flex items-center gap-2">
                <span>📜</span>
                <span>{isRtl ? 'سجل عمليات وفعاليات الوكيل الذكي رايفو' : 'Ryvo Agent Operations History Stream'}</span>
              </h4>
              <p className="text-[10.5px] text-slate-400 font-semibold mt-0.5">
                {isRtl ? 'مستند تسلسلي حي يرصد جميع تصرفات ومهام الذكاء الاصطناعي المنجزة.' : 'Historical sequence logs for all recent AI assistant task actions.'}
              </p>
            </div>
            <button
              onClick={() => {
                setOperationsLog([]);
                triggerToast(isRtl ? '🗑️ تم تنظيف سجل عمليات الوكيل!' : '🗑️ Logs cleared!');
              }}
              className="text-xs text-red-500 hover:underline font-black cursor-pointer"
            >
              {isRtl ? 'تنظيف السجل 🗑️' : 'Clear Log History 🗑️'}
            </button>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
            {operationsLog.length > 0 ? (
              operationsLog.map(log => {
                let bulletColor = 'bg-indigo-500';
                if (log.type === 'success') bulletColor = 'bg-emerald-500';
                if (log.type === 'warning') bulletColor = 'bg-amber-500';

                return (
                  <div key={log.id} className="p-3 bg-white dark:bg-[#07090e] rounded-xl border border-slate-150 dark:border-slate-850 flex gap-3 items-center text-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${bulletColor} animate-pulse`} />
                    <div className="flex-1 flex justify-between items-center">
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {isRtl ? log.actionAr : log.actionEn}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold whitespace-nowrap">{log.timestamp}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center text-slate-400 font-bold">
                {isRtl ? '📜 السجل فارغ حالياً. لا توجد فعاليات في هذه الجلسة.' : '📜 Operational log is currently empty.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
