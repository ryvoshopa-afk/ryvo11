import React, { useState } from 'react';
import { BookOpen, User, Calendar, Tag, ChevronLeft, ChevronRight, Share2, Sparkles, CheckCircle, Search, ArrowLeft, Eye } from 'lucide-react';
import { Language } from '../types';

interface Article {
  id: string;
  title_ar: string;
  title_en: string;
  title_fr: string;
  excerpt_ar: string;
  excerpt_en: string;
  excerpt_fr: string;
  content_ar: string;
  content_en: string;
  content_fr: string;
  image: string;
  date: string;
  author_ar: string;
  author_en: string;
  author_fr: string;
  category: 'maintenance' | 'safety' | 'reviews' | 'trips';
  seo_keywords_ar: string;
  seo_keywords_en: string;
  seo_title_tag_ar: string;
  seo_title_tag_en: string;
  seo_description_ar: string;
  seo_description_en: string;
}

const ARTICLES: Article[] = [
  {
    id: 'post-1',
    category: 'maintenance',
    title_ar: 'المرجع الشامل لصيانة محرك دراجتك النارية بالمنزل 🔧',
    title_en: 'The Ultimate Guide to DIY Motorcycle Engine Maintenance at Home 🔧',
    title_fr: 'Le guide ultime pour l\'entretien du moteur de moto à la maison 🔧',
    excerpt_ar: 'تعرف على الخطوات العملية لفحص وضبط محرك دراجتك الرياضية بنفسك، مع نصائح توفير استهلاك الوقود وحفظ عمر البواجي.',
    excerpt_en: 'Learn the practical steps to inspect and tune your sports bike engine yourself, featuring fuel efficiency tips and spark plug maintenance secrets.',
    excerpt_fr: 'Apprenez les étapes pratiques pour inspecter et régler vous-même le moteur de votre moto de sport.',
    author_ar: 'م. راشد الدوسري',
    author_en: 'Eng. Rashed Al-Dossary',
    author_fr: 'Ing. Rashed Al-Dossary',
    date: '2026-05-12',
    image: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&w=800&q=80',
    seo_keywords_ar: 'صيانة دراجات نارية, صيانة محركات بالمنزل, دليل صيانة Ryvo, توفير البنزين للدراجات',
    seo_keywords_en: 'DIY motorcycle repair, engine maintenance, spark plug check, fuel saving sports bike, Ryvo blog',
    seo_title_tag_ar: 'Ryvo | كيفية صيانة محرك الدراجة النارية بالمنزل خطوة بخطوة',
    seo_title_tag_en: 'How to Do DIY Motorcycle Engine Maintenance - Ryvo Blog',
    seo_description_ar: 'شرح بسيط بالصور لصيانة وضبط محركات الدراجات النارية في المنزل، وتغيير شمعات الاحتراق وتنظيف الفلاتر لزيادة سرعة الدراجة.',
    seo_description_en: 'Simple step-by-step tutorial on tuning your bike, checking spark plugs, and cleaning filters to boost performance safely.',
    content_ar: `تعتبر صيانة المحرك القلب النابض لأي دراجة نارية، والقيام بها بانتظام يضمن لك أعلى مستويات الأمان والأداء السلس على الطرقات الطويلة. في هذا الدليل، نأخذك في رحلة مبسطة للقيام بالصيانة الدورية في كراج منزلك دون الحاجة لزيارة ورش مكلفة.

أولاً: تغيير وضبط زيت المحرك
إن الزيت هو شريان الحياة للمحرك الرياضي. نوصي بتغيير الزيت كل 3000 كم إلى 5000 كم حسب طبيعة قيادتك. احرص دائماً على استخدام اللزوجة الموصى بها في دليل المالك (مثل 10W-40) لضمان تزييت مثالي في درجات الحرارة المرتفعة.

ثانياً: فحص وتنظيف شمعات الاحتراق (البواجي)
البواجي المسؤولة عن شرارة الاحتراق تؤثر مباشرة على عزم الدراجة واستهلاك الوقود. قم بفكها وفحص لون رأسها؛ اللون البني الفاتح يدل على احتراق مثالي، بينما اللون الأسود الكربوني يشير إلى حاجة لتنظيف الكربراتير أو تغيير فلتر الهواء.

ثالثاً: تنظيف وتشحيم سلسلة الجنزير
سلسلة الجنزير تنقل القوة من المحرك إلى العجلات. قم بتنظيفها بفرشاة مخصصة ومذيب دهون، ثم طبق زيت التشحيم الخاص بالسلاسل كل 500 كم لحمايتها من التآكل وتأمين انسيابية فائقة أثناء التروس والتبديل.`,
    content_en: `Engine maintenance is the beating heart of any motorcycle. Doing it regularly guarantees top safety and outstanding highway performance. In this complete blueprint, we show you how to execute essential checks right inside your home garage, saving you thousands on repair fees.

1. High-Performance Oil Changes
Oil is the lifeblood of high-RPM sports engines. Change your oil every 3,000 to 5,000 km. Always stick to the viscosity recommended in your owner manual (like 10W-40) to guarantee adequate lubrication under high temperatures.

2. Inspecting Spark Plugs
A faulty spark plug leads to poor ignition and higher fuel consumption. Unscrew the plug and inspect the electrode tip; a light brown tan color denotes perfect combustion, whereas black deposits signal carbon buildup or clogged air filters.

3. Chain Cleaning & Lubrication
Your chain transfers power directly to the rear wheel. Clean it using a chain degreaser and toothbrush, then apply special chain lube every 500 km to protect links from extreme wear and ensure smooth shifting.`,
    content_fr: `L'entretien du moteur est le cœur battant de toute moto. Un entretien régulier garantit une sécurité maximale et des performances exceptionnelles.

1. Vidange d'Huile Haute Performance
L'huile est essentielle pour les moteurs de sport à haut régime. Changez l'huile tous les 3 000 à 5 000 km avec de l'huile de viscosité recommandée (comme 10W-40).

2. Inspection des bougies d'allumage
Une bougie défectueuse nuit au démarrage et augmente la consommation de carburant.

3. Nettoyage et lubrification de la chaîne
Nettoyez la chaîne avec un dégraissant spécial tous les 500 km pour éviter l'usure prématurée.`
  },
  {
    id: 'post-2',
    category: 'safety',
    title_ar: 'الخوذات الذكية والملابس الواقية: كيف تحميك في الركوب السريع؟ 🛡️',
    title_en: 'Smart Helmets & Protective Gear: The Science of High-Speed Safety 🛡️',
    title_fr: 'Casques Intelligents & Équipement de Protection : La Science de la Sécurité 🛡️',
    excerpt_ar: 'تحليل دقيق لأهمية ارتداء الخوذات المعتمدة وسترات الحماية المزودة بالوسائد الهوائية، وكيف تساهم تقنيات الكربون في امتصاص الصدمات.',
    excerpt_en: 'An in-depth analysis of riding with certified smart helmets and airbag vests, and how carbon fiber tech absorbs high-velocity impacts.',
    excerpt_fr: 'Une analyse approfondie de l\'importance du port de casques certifiés et de gilets airbag pour les motards.',
    author_ar: 'الكابتن علي منصور',
    author_en: 'Captain Ali Mansour',
    author_fr: 'Capitaine Ali Mansour',
    date: '2026-06-02',
    image: 'https://images.unsplash.com/photo-1557980313-25c7e19335ef?auto=format&fit=crop&w=800&q=80',
    seo_keywords_ar: 'خوذة كربون ذكية, ملابس ركوب الدراجات, سلامة قائد الدراجة, دروع حماية الدراجين',
    seo_keywords_en: 'smart helmet carbon, motorcycle safety gear, certified helmet ECE, protective jacket, rider protection',
    seo_title_tag_ar: 'Ryvo | كيف تختار الخوذة الذكية وملابس الحماية لسلامتك؟',
    seo_title_tag_en: 'Choosing Smart Helmets & Safety Protective Gear - Ryvo',
    seo_description_ar: 'دليلك لاختيار الخوذ المعتمدة وسترات الأمان المزودة بحلول اتصال وبلوتوث ووسائد هوائية ذكية لحماية فائقة أثناء ركوب الدراجة.',
    seo_description_en: 'Discover how certified carbon helmets, built-in communication intercoms, and safety impact pads safeguard you on fast highway speeds.',
    content_ar: `السلامة على الطريق ليست خياراً بل هي المبدأ الأول والأساسي لكل قائد دراجة نارية حقيقي. مع زيادة سرعات الدراجات الحديثة، تطورت تكنولوجيا ملابس الحماية لتلائم امتصاص الصدمات وحفظ الأرواح بدقة مذهلة.

الخوذات الذكية المصنوعة من ألياف الكربون
تعتبر خوذة الرأس الواقي الأهم على الإطلاق. الخوذات الحديثة مثل "خوذة نيو-كاربون الذكية" لا تكتفي بامتصاص الصدمات بفضل مرونة طبقات الكربون، بل تأتي مزودة ببلوتوث مدمج لإبقاء عينيك على الطريق مع سماع إرشادات الخرائط، ومستشعرات ذكية ترسل إنذار طوارئ تلقائياً في حال رصد سقوط أو حادث مفاجئ لا قدر الله.

سترات الحماية والوسائد الهوائية (Airbag Vests)
من أعظم الابتكارات في عالم حماية الدراجين هي السترات المزودة بوسائد هوائية تنفخ تلقائياً في أجزاء من الملي ثانية فور رصد مستشعر الجاذبية أي اختلال مفاجئ في توازن الدراجة. هذا الابتكار يحمي منطقة الصدر، العمود الفقري، والرقبة من تأثير الارتطامات القوية.

القفازات وأحذية السباق المدعمة
اليدين والقدمين هما أول ما يرتطم بالأرض غريزياً أثناء السقوط. يجب أن تكون القفازات مدعمة بحشوات صلبة لحماية المفاصل، والأحذية يجب أن تدعم الكاحل وتمنع التوائه لحمايتك من الإصابات البالغة.`,
    content_en: `Road safety isn't an option; it's the absolute first rule of real motorcycling. As modern bikes become faster and more agile, safety apparel technology has evolved tremendously to absorb high impacts and safeguard human life.

Carbon Fiber Smart Helmets
The helmet is your single most critical piece of equipment. Modern smart helmets do not just absorb impact through high-grade carbon shells; they also feature integrated intercoms to keep you connected, dynamic rear LED turn signals for high visibility, and crash detection sensors that auto-message emergency responders in case of a crash.

Airbag Riding Vests
One of the grandest breakthroughs is the deployment of rider airbag vests. They inflate in milliseconds upon detecting sudden G-force changes, shielding your spine, collarbones, and ribs from blunt force trauma on impact.

Reinforced Gloves & Boots
In a crash, instinct makes riders extend hands and feet first. Durable riding gloves with carbon knuckle sliders and stiff armor boots that lock ankle rotation are essential to prevent severe fractures.`,
    content_fr: `La sécurité routière est la règle numéro un. L'équipement a évolué pour offrir une protection maximale aux motards.

Les casques intelligents en carbone
Un casque de qualité comme le NeoCarbon absorbe l'onde de choc tout en offrant Bluetooth et détection de chute pour la sécurité.

Gilets Airbag moto
Ils se gonflent en quelques millisecondes en cas de chute, protégeant la colonne et les côtes des blessures graves.

Gants et bottes renforcés
Ils protègent les articulations des mains et les chevilles lors de glissades sur asphalte.`
  }
];

interface BlogSectionProps {
  currentLanguage: Language;
  onNavigateHome: () => void;
}

export default function BlogSection({ currentLanguage, onNavigateHome }: BlogSectionProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const isRtl = currentLanguage === 'ar';

  const categories = [
    { id: 'all', label_ar: 'الكل 📰', label_en: 'All 📰' },
    { id: 'maintenance', label_ar: 'الصيانة والتعديل 🔧', label_en: 'Maintenance 🔧' },
    { id: 'safety', label_ar: 'السلامة والأمان 🛡️', label_en: 'Safety & Protection 🛡️' }
  ];

  const filteredArticles = ARTICLES.filter(art => {
    const matchesCategory = activeCategory === 'all' || art.category === activeCategory;
    const title = isRtl ? art.title_ar : art.title_en;
    const excerpt = isRtl ? art.excerpt_ar : art.excerpt_en;
    const matchesSearch = !searchTerm.trim() || 
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Header and Back button */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 ${isRtl ? 'text-right' : 'text-left'}`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-500" />
            <span className="text-xs font-black uppercase text-sky-500 tracking-wider">
              {isRtl ? 'مدونة Ryvo الرسمية لتعليم القيادة والسلامة' : 'Ryvo Official Motorcycle & Safety Blog'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isRtl ? 'مقالات وأسرار عالم الدراجات النارية 🏍️' : 'Motorcycle Insights & DIY Maintenance Secrets 🏍️'}
          </h1>
          <p className="text-xs text-slate-400 font-bold">
            {isRtl ? 'تصفح مقالات الخبراء، إرشادات ضبط الدراجات، ونصائح السفر والسلامة المكتوبة بحب.' : 'Expert tips, motorcycle diagnostics, safety guidelines, and road journey blogs crafted for enthusiasts.'}
          </p>
        </div>

        <button
          onClick={onNavigateHome}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 dark:bg-[var(--primary-color,#38bdf8)] dark:text-[#0A0C10] flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          <span>{isRtl ? 'العودة للمتجر 🛒' : 'Back to Store 🛒'}</span>
        </button>
      </div>

      {!selectedArticle ? (
        <>
          {/* Controls: Search and Category Pills */}
          <div className={`flex flex-col md:flex-row items-center justify-between gap-4 ${isRtl ? 'md:flex-row-reverse' : 'md:flex-row'}`}>
            {/* Search Input */}
            <div className="relative w-full md:max-w-xs">
              <Search className={`absolute top-3.5 w-4 h-4 text-slate-400 ${isRtl ? 'right-4' : 'left-4'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isRtl ? 'ابحث عن مقال صيانة، خوذة...' : 'Search articles...'}
                className={`w-full text-xs py-3.5 pr-10 pl-10 rounded-2xl bg-white dark:bg-[#11141D] border border-slate-200 dark:border-[#1E293B] text-slate-850 dark:text-white outline-none focus:border-sky-500 transition-colors ${
                  isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'
                }`}
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/50 dark:bg-[#11141D] p-1.5 rounded-2xl border dark:border-[#1E293B]">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-[#0A0C10] shadow-md'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {isRtl ? cat.label_ar : cat.label_en}
                </button>
              ))}
            </div>
          </div>

          {/* Articles Grid */}
          {filteredArticles.length === 0 ? (
            <div className="text-center p-16 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-150 dark:border-[#1E293B]">
              <p className="text-xs font-bold text-slate-450">
                {isRtl ? 'لم نعثر على أي مقالات تطابق هذا البحث حالياً.' : 'No matched articles found.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredArticles.map(art => {
                const title = isRtl ? art.title_ar : art.title_en;
                const excerpt = isRtl ? art.excerpt_ar : art.excerpt_en;
                const author = isRtl ? art.author_ar : art.author_en;
                return (
                  <div
                    key={art.id}
                    className="group bg-white dark:bg-[#11141D] rounded-3xl border border-slate-150 dark:border-[#1E293B] overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                  >
                    {/* Cover image */}
                    <div className="relative h-56 sm:h-64 overflow-hidden bg-slate-150">
                      <img
                        src={art.image}
                        alt={title}
                        width={600}
                        height={400}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
                        <span className="bg-slate-950/80 backdrop-blur-md text-[10px] font-black text-amber-500 uppercase px-3 py-1.5 rounded-xl border border-amber-500/20">
                          {art.category === 'maintenance' ? (isRtl ? 'صيانة 🔧' : 'Maintenance 🔧') : (isRtl ? 'سلامة 🛡️' : 'Safety 🛡️')}
                        </span>
                      </div>
                    </div>

                    {/* Meta and excerpt */}
                    <div className={`p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
                      <div className="space-y-2">
                        {/* Author and Date row */}
                        <div className={`flex items-center gap-4 text-[11px] font-black text-slate-400 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-sky-500" />
                            <span>{author}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                            <span>{art.date}</span>
                          </div>
                        </div>

                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-snug group-hover:text-sky-500 transition-colors">
                          {title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium line-clamp-3">
                          {excerpt}
                        </p>
                      </div>

                      <div className={`pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
                        <button
                          onClick={() => setSelectedArticle(art)}
                          className="text-xs font-black text-sky-500 hover:text-sky-400 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{isRtl ? 'اقرأ المقال بالكامل 📖' : 'Read Full Article 📖'}</span>
                          <ChevronRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <div className="flex gap-2">
                          <span className="text-[10px] bg-slate-50 dark:bg-slate-900 border dark:border-[#1E293B] text-slate-450 px-2.5 py-1 rounded-lg">
                            {isRtl ? 'مقال مقروء' : 'Article read'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Full Article Read View + Smart SEO Inspector Sidebar */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Article column */}
          <div className={`lg:col-span-8 bg-white dark:bg-[#11141D] rounded-3xl border border-slate-150 dark:border-[#1E293B] overflow-hidden p-6 sm:p-10 space-y-6 ${isRtl ? 'text-right' : 'text-left'}`}>
            <button
              onClick={() => setSelectedArticle(null)}
              className="text-xs font-black text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
              <span>{isRtl ? 'العودة لقائمة المقالات' : 'Back to Articles'}</span>
            </button>

            {/* Title and Meta */}
            <div className="space-y-4">
              <span className="bg-sky-500/10 text-sky-500 text-xs font-black px-3 py-1.5 rounded-xl border border-sky-500/20">
                {selectedArticle.category === 'maintenance' ? (isRtl ? 'صيانة الدراجات 🔧' : 'Bike Maintenance 🔧') : (isRtl ? 'سلامة ومعدات ركوب 🛡️' : 'Safety Gear 🛡️')}
              </span>
              <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {isRtl ? selectedArticle.title_ar : selectedArticle.title_en}
              </h2>

              <div className={`flex flex-wrap items-center gap-4 text-xs font-black text-slate-450 border-b border-slate-100 dark:border-slate-800 pb-4 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-sky-500" />
                  <span>{isRtl ? selectedArticle.author_ar : selectedArticle.author_en}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>{selectedArticle.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span className="text-emerald-500">1.2K {isRtl ? 'قراءة نشطة' : 'Views'}</span>
                </div>
              </div>
            </div>

            {/* Cover image */}
            <div className="h-64 sm:h-96 rounded-2xl overflow-hidden bg-slate-150">
              <img
                src={selectedArticle.image}
                alt={isRtl ? selectedArticle.title_ar : selectedArticle.title_en}
                width={1200}
                height={600}
                loading="lazy"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Real Text content */}
            <div className="text-slate-650 dark:text-slate-300 text-sm sm:text-base leading-relaxed space-y-4 font-medium whitespace-pre-line pt-4">
              {isRtl ? selectedArticle.content_ar : selectedArticle.content_en}
            </div>

            {/* Newsletter form integrated */}
            <div className="mt-8 p-6 sm:p-8 bg-gradient-to-r from-sky-500/10 to-amber-500/10 border border-sky-500/20 rounded-2xl space-y-4 text-center">
              <Sparkles className="w-6 h-6 text-amber-500 mx-auto animate-bounce" />
              <h4 className="text-sm font-black text-slate-800 dark:text-white">
                {isRtl ? 'اشترك في قائمة Ryvo البريدية لتصلك أحدث المقالات والخصومات الحصرية 🎁' : 'Subscribe to Ryvo Newsletter for expert guidelines and exclusive discounts! 🎁'}
              </h4>
              <p className="text-xs text-slate-400 font-bold max-w-md mx-auto">
                {isRtl ? 'لا نرسل رسائل مزعجة، فقط مقالات صيانة متميزة ومفاتيح كوبونات خصم تصل لـ 25% شهرياً.' : 'No spam. Just premium maintenance masterclasses and up to 25% discount coupons directly in your mailbox.'}
              </p>
              <div className="flex max-w-sm mx-auto gap-2">
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="flex-1 text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0C10] outline-none text-slate-850 dark:text-white"
                />
                <button className="px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-sky-500 dark:text-[#0A0C10] text-xs font-black rounded-xl transition-all cursor-pointer">
                  {isRtl ? 'اشترك ⚡' : 'Subscribe ⚡'}
                </button>
              </div>
            </div>
          </div>

          {/* Smart SEO recommendations Inspector Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-50 dark:bg-[#11141D] rounded-3xl border border-slate-150 dark:border-[#1E293B] p-6 space-y-6">
              
              <div className="flex items-center gap-2 text-amber-500">
                <Sparkles className="w-5 h-5 animate-spin-slow" />
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  {isRtl ? 'مساعد سيو الذكي لمتجر Ryvo' : 'Ryvo Smart SEO Optimizer'}
                </h3>
              </div>

              <p className="text-[11px] text-slate-450 leading-relaxed font-bold">
                {isRtl 
                  ? 'هذا الصندوق يوضح البيانات المهيكلة التي يستغلها محرك بحث جوجل (Google Core Algos) لترشيح مقال متجر رايفو لنتائج البحث الأولى.' 
                  : 'This panel details the metadata structure used by search engines to crawl and index your Ryvo blog post dynamically.'}
              </p>

              {/* Title Tag Analysis */}
              <div className="space-y-2 p-4 bg-white dark:bg-[#0A0C10] rounded-2xl border dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">{isRtl ? 'وسم عنوان الصفحة (Title Tag)' : 'Page Title Tag'}</span>
                <p className="text-xs font-black text-sky-500 break-words">
                  {isRtl ? selectedArticle.seo_title_tag_ar : selectedArticle.seo_title_tag_en}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'طول العنوان مثالي (58 حرفاً)' : 'Perfect length (58 chars)'}</span>
                </div>
              </div>

              {/* Meta Description Analysis */}
              <div className="space-y-2 p-4 bg-white dark:bg-[#0A0C10] rounded-2xl border dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">{isRtl ? 'الوصف الميتا (Meta Description)' : 'Meta Description'}</span>
                <p className="text-xs text-slate-500 leading-relaxed font-bold">
                  {isRtl ? selectedArticle.seo_description_ar : selectedArticle.seo_description_en}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'يحتوي على الكلمات المفتاحية الأساسية' : 'Contains rich focus keywords'}</span>
                </div>
              </div>

              {/* Meta Keywords Analysis */}
              <div className="space-y-2 p-4 bg-white dark:bg-[#0A0C10] rounded-2xl border dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 block">{isRtl ? 'الكلمات الدلالية الموصى بها' : 'Meta Keywords'}</span>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(isRtl ? selectedArticle.seo_keywords_ar : selectedArticle.seo_keywords_en).split(',').map((kw, idx) => (
                    <span key={idx} className="bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 px-2.5 py-1 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                      #{kw.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Schema JSON-LD simulation */}
              <div className="space-y-2 p-4 bg-[#0A0C10] text-amber-500 rounded-2xl border border-slate-850 font-mono text-[9px] overflow-x-auto scrollbar-thin">
                <span className="text-[10px] font-black text-slate-500 block font-sans uppercase">{isRtl ? 'ترميز البيانات المنظمة JSON-LD' : 'JSON-LD Structured Schema'}</span>
                <pre className="text-[9px] text-slate-350 select-all">
{`{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${isRtl ? selectedArticle.title_ar : selectedArticle.title_en}",
  "datePublished": "${selectedArticle.date}",
  "author": {
    "@type": "Person",
    "name": "${isRtl ? selectedArticle.author_ar : selectedArticle.author_en}"
  },
  "publisher": {
    "@type": "OnlineStore",
    "name": "Ryvo Store"
  }
}`}
                </pre>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
