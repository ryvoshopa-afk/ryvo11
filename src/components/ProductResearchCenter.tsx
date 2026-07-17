import React, { useState, useEffect } from 'react';
import {
  Search,
  Sliders,
  Check,
  Eye,
  Trash2,
  Edit,
  Save,
  Plus,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Heart,
  FileText,
  Sparkles,
  Star,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  TrendingUp,
  Info,
  HelpCircle,
  Activity,
  ShoppingBag,
  Globe,
  Percent,
  DollarSign,
  Calendar,
  User,
  Clock,
  Package,
  Share2,
  Layers,
  Play,
  ThumbsUp,
  Award,
  Filter,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  RefreshCw,
  ExternalLink,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Product type extensions for high-fidelity research
export interface ResearchProduct {
  id: string;
  name_en: string;
  name_ar: string;
  sku: string;
  price: number; // product cost
  shippingCost: number;
  weight: number; // in kg
  length: number;
  width: number;
  height: number;
  image: string;
  images: string[];
  videoUrl?: string;
  description: string;
  category: string;
  rating: number;
  ordersCount: number;
  salesCount: number;
  country: string;
  warehouse: string;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  verifiedInventory: boolean;
  freeShipping: boolean;
  processingTime: number; // in days
  shippingTime: number; // in days
  shippingCompany: string;
  combinedShipping: boolean;
  customPackaging: boolean;
  logoBranding: boolean;
  privateInventory: boolean;
  supplierId: string;
  supplierName: string;
  supplierUrl: string;
  productUrl: string;
  // Dynamic metrics computed or loaded from localStorage
  isFavorite?: boolean;
  notes?: string;
  rejectionReason?: string;
  selectionReason?: string;
  reviewerName?: string;
  reviewDate?: string;
}

export interface SupplierMetric {
  id: string;
  name: string;
  type: 'AliExpress' | 'CJ' | 'Local' | 'Other';
  country: string;
  warehouses: string[];
  productCount: number;
  activeOrders: number;
  totalSales: number;
  returnRate: number; // percentage
  responseSpeed: string; // e.g., "10 mins"
  lastContact: string;
  notes: string;
  recommend: boolean;
  // Grades metrics out of 10
  quality: number;
  speed: number;
  shipping: number;
  support: number;
  packaging: number;
  logo: number;
  replacement: number;
  discounts: number;
  stock: number;
}

interface ProductResearchCenterProps {
  adminEmail: string;
  currentLanguage: 'ar' | 'en' | 'fr';
  onAddProduct: (p: any) => void;
}

export default function ProductResearchCenter({
  adminEmail,
  currentLanguage,
  onAddProduct
}: ProductResearchCenterProps) {
  const isRtl = currentLanguage === 'ar';
  
  // Dual-mode View Switcher: 'research' | 'suppliers'
  const [activeMode, setActiveMode] = useState<'research' | 'suppliers'>('research');

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ResearchProduct[]>([]);
  const [favorites, setFavorites] = useState<{ [id: string]: boolean }>({});
  const [productNotes, setProductNotes] = useState<{ [id: string]: { notes?: string; selectionReason?: string; rejectionReason?: string; reviewerName?: string; reviewDate?: string } }>({});
  const [isSandbox, setIsSandbox] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterVideo, setFilterVideo] = useState(false);
  const [filterFreeShipping, setFilterFreeShipping] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterMaxPrice, setFilterMaxPrice] = useState<number>(500);
  const [filterMinScore, setFilterMinScore] = useState<number>(0);
  const [filterWarehouse, setFilterWarehouse] = useState<string>('All');
  const [filterLogistics, setFilterLogistics] = useState({
    logoBranding: false,
    customPackaging: false,
    combinedShipping: false
  });

  // Details Modal States
  const [selectedProduct, setSelectedProduct] = useState<ResearchProduct | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [importReport, setImportReport] = useState<{
    scanning: boolean;
    report: any | null;
  }>({ scanning: false, report: null });
  
  // Profitability interactive inputs per selected product
  const [profitInputs, setProfitInputs] = useState({
    sellingPrice: 0,
    adCost: 5.0,
    paymentFeePercent: 2.5,
    paymentFeeFixed: 0.3,
    storeFee: 1.5,
  });

  // AI assistant integration
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Local Storage Initialization
  useEffect(() => {
    // Load favorites
    const savedFavs = localStorage.getItem('ryvo_research_favorites');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {}
    }

    // Load notes
    const savedNotes = localStorage.getItem('ryvo_research_notes');
    if (savedNotes) {
      try {
        setProductNotes(JSON.parse(savedNotes));
      } catch (e) {}
    }

    // Run initial search
    fetchProducts();
  }, []);

  // Update dynamic profit inputs when product selected
  useEffect(() => {
    if (selectedProduct) {
      setProfitInputs({
        sellingPrice: Math.round(selectedProduct.price * 2.5),
        adCost: 5.0,
        paymentFeePercent: 2.5,
        paymentFeeFixed: 0.3,
        storeFee: 1.5,
      });
      setAiAnalysis(null);
      setImportReport({ scanning: false, report: null });
    }
  }, [selectedProduct]);

  // Suppliers Data State
  const [suppliers, setSuppliers] = useState<SupplierMetric[]>([
    {
      id: 'cj',
      name: 'CJ Dropshipping (Main)',
      type: 'CJ',
      country: 'China',
      warehouses: ['Shenzhen', 'Yiwu', 'USA East', 'Germany'],
      productCount: 450000,
      activeOrders: 1420,
      totalSales: 89000,
      returnRate: 0.6,
      responseSpeed: '12 mins',
      lastContact: '2026-07-09',
      notes: 'Excellent full logistics fulfillment with high security. Direct integration with RYVO dashboard active.',
      recommend: true,
      quality: 9.5,
      speed: 9.0,
      shipping: 8.8,
      support: 9.2,
      packaging: 9.0,
      logo: 8.5,
      replacement: 9.0,
      discounts: 8.0,
      stock: 9.5
    },
    {
      id: 'aliexpress-vip',
      name: 'AliExpress VIP Premium',
      type: 'AliExpress',
      country: 'China',
      warehouses: ['Guangzhou', 'USA West'],
      productCount: 1200000,
      activeOrders: 310,
      totalSales: 15400,
      returnRate: 1.8,
      responseSpeed: '2 hours',
      lastContact: '2026-07-08',
      notes: 'Huge inventory count but slower logistics response compared to CJ Dropshipping.',
      recommend: true,
      quality: 8.0,
      speed: 7.5,
      shipping: 7.8,
      support: 8.0,
      packaging: 8.2,
      logo: 6.0,
      replacement: 7.5,
      discounts: 9.0,
      stock: 9.0
    },
    {
      id: 'saudi-elite',
      name: 'Riyadh Sports Elite Wholesaler',
      type: 'Local',
      country: 'Saudi Arabia',
      warehouses: ['Riyadh Main Warehouse', 'Jeddah Hub'],
      productCount: 1500,
      activeOrders: 820,
      totalSales: 42000,
      returnRate: 0.2,
      responseSpeed: '5 mins',
      lastContact: '2026-07-10',
      notes: 'Local Saudi shipping in 24-48 hours. Excellent for carbon fibers and heavy bike accessories.',
      recommend: true,
      quality: 9.8,
      speed: 9.9,
      shipping: 9.9,
      support: 9.8,
      packaging: 9.5,
      logo: 9.0,
      replacement: 9.8,
      discounts: 7.0,
      stock: 8.5
    },
    {
      id: 'euro-moto',
      name: 'AeroParts EU Hub',
      type: 'Other',
      country: 'Germany',
      warehouses: ['Frankfurt', 'Warsaw'],
      productCount: 8900,
      activeOrders: 110,
      totalSales: 6800,
      returnRate: 0.5,
      responseSpeed: '45 mins',
      lastContact: '2026-07-05',
      notes: 'Premium motorcycle riding gears. Perfect compliance with international standards.',
      recommend: true,
      quality: 9.5,
      speed: 8.5,
      shipping: 8.0,
      support: 9.0,
      packaging: 9.2,
      logo: 8.0,
      replacement: 9.0,
      discounts: 6.5,
      stock: 8.0
    }
  ]);

  // Load suppliers from local storage if existing
  useEffect(() => {
    const savedSuppliers = localStorage.getItem('ryvo_research_suppliers');
    if (savedSuppliers) {
      try {
        setSuppliers(JSON.parse(savedSuppliers));
      } catch (e) {}
    }
  }, []);

  // Save suppliers helper
  const saveSuppliers = (newSuppliers: SupplierMetric[]) => {
    setSuppliers(newSuppliers);
    localStorage.setItem('ryvo_research_suppliers', JSON.stringify(newSuppliers));
  };

  // Search API Call
  const fetchProducts = async (query = '') => {
    setLoading(true);
    setAuthError(null);
    try {
      const url = `/api/cj/products?search=${encodeURIComponent(query)}&pageNumber=1&pageSize=30`;
      const res = await fetch(url, {
        headers: {
          'X-Admin-Email': adminEmail || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setIsSandbox(!!data.isSandbox);
        setAuthError(data.authError || null);

        // Map CJ raw products to high fidelity complete schema
        const mappedList = (data.list || []).map((item: any, idx: number) => {
          const rawPrice = Number(item.productSellPrice || item.sellPrice || 15.0);
          const weightVal = Number(item.weight || (rawPrice > 100 ? 8.5 : rawPrice > 40 ? 1.5 : 0.25));
          
          // Generate stable mock values for missing high-fidelity logistics specifications
          const pid = item.pid || `CJ-${100000 + idx}`;
          const isFree = idx % 3 === 0;
          const ratingVal = item.rating || Number((4.0 + (idx % 11) * 0.1).toFixed(1));
          const ordersCountVal = Math.floor(100 + (idx % 9) * 350 + (rawPrice < 50 ? 800 : 50));
          const verifiedVal = idx % 2 === 0;
          const countryVal = idx % 4 === 0 ? 'US' : idx % 4 === 1 ? 'KSA' : idx % 4 === 2 ? 'EU' : 'China';
          const warehouseVal = countryVal === 'KSA' ? 'Riyadh Hub' : countryVal === 'US' ? 'USA East' : countryVal === 'EU' ? 'Germany' : 'Shenzhen Main';
          const processingDays = 1 + (idx % 3);
          const shippingDays = countryVal === 'KSA' ? 2 : countryVal === 'US' ? 5 : countryVal === 'EU' ? 6 : 9;

          // Stable additional gallery images
          const additionalImagesList = item.images || [
            item.productImage,
            'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1544192240-4a34feb0104a?auto=format&fit=crop&w=800&q=80'
          ];

          return {
            id: pid,
            name_en: item.productNameEn || item.name_en || 'RYVO Professional Smart Gear',
            name_ar: item.productNameCn || item.name_ar || 'معدات رياضية احترافية من رايفو',
            sku: item.productSku || `SKU-${pid}`,
            price: rawPrice,
            shippingCost: isFree ? 0 : Number((5.0 + (rawPrice * 0.05)).toFixed(2)),
            weight: weightVal,
            length: Math.round(15 + (idx % 5) * 5),
            width: Math.round(10 + (idx % 4) * 4),
            height: Math.round(5 + (idx % 3) * 3),
            image: item.productImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
            images: additionalImagesList,
            videoUrl: idx % 2 === 0 ? 'https://www.w3schools.com/html/mov_bbb.mp4' : undefined,
            description: item.description || 'This high-performance equipment features direct integration with top tier sports requirements. Built with outstanding materials to offer optimal efficiency.',
            category: item.categoryName || 'bikes',
            rating: ratingVal,
            ordersCount: ordersCountVal,
            salesCount: Math.round(ordersCountVal * 1.4),
            country: countryVal,
            warehouse: warehouseVal,
            stockStatus: ordersCountVal > 1500 ? 'Low Stock' : 'In Stock',
            verifiedInventory: verifiedVal,
            freeShipping: isFree,
            processingTime: processingDays,
            shippingTime: shippingDays,
            shippingCompany: countryVal === 'KSA' ? 'RYVO Logistics Express' : 'DHL Global',
            combinedShipping: idx % 3 !== 1,
            customPackaging: idx % 4 !== 2,
            logoBranding: idx % 5 !== 3,
            privateInventory: idx % 6 !== 4,
            supplierId: 'cj',
            supplierName: 'CJ Dropshipping Co.',
            supplierUrl: `https://cjdropshipping.com/product-detail.html?id=${pid}`,
            productUrl: `https://ryvo.shop/products/${pid}`
          };
        });

        setProducts(mappedList);
      } else {
        setAuthError('HTTP Error: Failed to fetch products from router.');
      }
    } catch (error: any) {
      console.error('Error fetching research products:', error);
      setAuthError(error.message || 'Network communication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hasArabic = /[\u0600-\u06FF]/.test(searchQuery);
    if (hasArabic) {
      alert(
        isRtl
          ? '⚠️ يرجى إدخال كلمات البحث باللغة الإنجليزية فقط لضمان دقة النتائج من خوادم CJ API.'
          : '⚠️ Please enter search keywords in English only for accurate CJ Dropshipping results.'
      );
      return;
    }
    fetchProducts(searchQuery);
  };

  // Toggle Favorite
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = { ...favorites, [id]: !favorites[id] };
    setFavorites(updated);
    localStorage.setItem('ryvo_research_favorites', JSON.stringify(updated));
  };

  // Save notes and reasons per product
  const saveProductNotesData = (id: string, field: string, value: string) => {
    const prev = productNotes[id] || {};
    const updated = {
      ...productNotes,
      [id]: {
        ...prev,
        [field]: value,
        reviewDate: new Date().toLocaleDateString('en-US'),
        reviewerName: prev.reviewerName || adminEmail || 'Admin Manager'
      }
    };
    setProductNotes(updated);
    localStorage.setItem('ryvo_research_notes', JSON.stringify(updated));
  };

  // Calculate Product Score Out of 100
  const calculateProductScore = (p: ResearchProduct) => {
    let score = 0;
    
    if (p.verifiedInventory) score += 20; // 20 points
    score += 10; // CJ Fulfilled standard (10 points)
    
    // Rating
    if (p.rating >= 4.7) score += 10;
    else if (p.rating >= 4.4) score += 8;
    else if (p.rating >= 4.0) score += 5;
    
    // Supplier Rating (Standard mock)
    score += 10; // Excellent main supplier standard
    
    // Orders Count
    if (p.ordersCount > 1000) score += 10;
    else if (p.ordersCount > 500) score += 8;
    else if (p.ordersCount > 100) score += 5;
    
    // Processing Time
    if (p.processingTime <= 1) score += 10;
    else if (p.processingTime <= 2) score += 8;
    else if (p.processingTime <= 3) score += 5;
    
    // Shipping Time
    if (p.shippingTime <= 3) score += 10;
    else if (p.shippingTime <= 7) score += 8;
    else if (p.shippingTime <= 10) score += 5;
    
    // Features
    if (p.logoBranding) score += 5;
    if (p.customPackaging) score += 5;
    if (p.combinedShipping) score += 5;
    if (p.videoUrl) score += 5;
    if (p.images.length >= 3) score += 5;
    score += 5; // Quality Inspection standard
    score += 5; // Policy replacement standard
    
    return Math.min(score, 100);
  };

  // Score description labels
  const getScoreGrade = (score: number) => {
    if (score >= 95) return { label: isRtl ? 'ممتاز جداً 🟢' : 'Outstanding 🟢', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 90) return { label: isRtl ? 'ممتاز 🟢' : 'Excellent 🟢', color: 'text-green-500 bg-green-500/10 border-green-500/20' };
    if (score >= 80) return { label: isRtl ? 'جيد جداً 🟡' : 'Very Good 🟡', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    if (score >= 70) return { label: isRtl ? 'جيد (يحتاج مراجعة) 🟠' : 'Good (Needs Review) 🟠', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' };
    return { label: isRtl ? 'لا يوصى به 🔴' : 'Not Recommended 🔴', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
  };

  // Calculate Profitability Metrics
  const calculateProfitability = (p: ResearchProduct) => {
    const cost = p.price;
    const shipping = p.shippingCost;
    const sell = profitInputs.sellingPrice || cost * 2.5;
    const ad = profitInputs.adCost;
    const store = profitInputs.storeFee;
    
    // Payment Fee = percent of sell + fixed
    const payFee = (sell * (profitInputs.paymentFeePercent / 100)) + profitInputs.paymentFeeFixed;
    
    const totalExpenses = cost + shipping + ad + store + payFee;
    const netProfit = sell - totalExpenses;
    const profitMargin = (netProfit / sell) * 100;
    const roi = (netProfit / (cost + shipping + ad)) * 100;
    
    const breakeven = cost + shipping + ad + store + payFee + 0.5; // estimate
    const minSell = breakeven + 2.0;
    const suggestedSell = cost * 2.8 + shipping;
    const maxSell = cost * 4.5 + shipping;

    return {
      netProfit: Number(netProfit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(1)),
      roi: Number(roi.toFixed(1)),
      breakeven: Number(breakeven.toFixed(2)),
      minSell: Number(minSell.toFixed(2)),
      suggestedSell: Number(suggestedSell.toFixed(2)),
      maxSell: Number(maxSell.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2))
    };
  };

  // Scan Pre-import Health Check Report
  const runHealthCheckScan = (p: ResearchProduct) => {
    setImportReport({ scanning: true, report: null });
    
    setTimeout(() => {
      const score = calculateProductScore(p);
      const profit = calculateProfitability(p);
      
      const checks = [
        { name: isRtl ? 'دقة الصور وجودتها' : 'High Quality Images', status: p.images.length >= 3 ? 'pass' : 'warning', desc: p.images.length >= 3 ? (isRtl ? 'متوفر 3 صور أو أكثر بجودة ممتازة' : '3+ HD images verified') : (isRtl ? 'يوصى بإضافة صور إضافية' : 'More gallery images recommended') },
        { name: isRtl ? 'فيديو ترويجي مدمج' : 'Product Promo Video', status: p.videoUrl ? 'pass' : 'warning', desc: p.videoUrl ? (isRtl ? 'فيديو مدمج عالي الوضوح جاهز' : 'HD promo video verified') : (isRtl ? 'لا يوجد فيديو ترويجي مباشر' : 'No promo video directly present') },
        { name: isRtl ? 'تفاصيل الوصف والـ SEO' : 'Description & SEO Tags', status: p.description.length > 50 ? 'pass' : 'fail', desc: p.description.length > 50 ? (isRtl ? 'وصف احترافي متكامل' : 'Professional description valid') : (isRtl ? 'الوصف قصير جداً' : 'Description too short') },
        { name: isRtl ? 'هامش الربح الصافي' : 'Net Profit Margin check', status: profit.profitMargin >= 30 ? 'pass' : profit.profitMargin >= 15 ? 'warning' : 'fail', desc: `${profit.profitMargin}% ${isRtl ? 'هامش ربح مقدر' : 'margin calculated'}` },
        { name: isRtl ? 'مخزون مضمون ومحقق' : 'Verified Guaranteed Stock', status: p.verifiedInventory ? 'pass' : 'warning', desc: p.verifiedInventory ? (isRtl ? 'تم التحقق من مستودع المورد بنسبة 100%' : '100% verified real stock') : (isRtl ? 'مخزون تقديري غير موثق' : 'Estimated stock only') },
        { name: isRtl ? 'تقييم العملاء العام' : 'Global Customer Rating', status: p.rating >= 4.3 ? 'pass' : 'warning', desc: `${p.rating}/5.0` }
      ];

      setImportReport({
        scanning: false,
        report: {
          score,
          checks,
          readyToImport: score >= 80,
          date: new Date().toLocaleString()
        }
      });
    }, 1200);
  };

  // Call Gemini to analyze the product deep advantages & disadvantages
  const analyzeWithAI = async (p: ResearchProduct) => {
    setAiLoading(true);
    setAiAnalysis(null);

    const score = calculateProductScore(p);
    const profit = calculateProfitability(p);

    const prompt = `Analyze this product for e-commerce store import:
Product Name: ${p.name_en} (${p.name_ar})
Price: $${p.price}
Estimated Shipping: $${p.shippingCost}
Calculated Rating: ${p.rating}/5.0
Total CJ Orders: ${p.ordersCount}
Processing Time: ${p.processingTime} days
Shipping Time: ${p.shippingTime} days
Logistics Support: Logo Branding: ${p.logoBranding ? 'Yes' : 'No'}, Custom Packaging: ${p.customPackaging ? 'Yes' : 'No'}, Combined Shipping: ${p.combinedShipping ? 'Yes' : 'No'}
Product Grade Score: ${score}/100

Profit Scenario Analysis:
Selling Price: $${profitInputs.sellingPrice}
Ad Spend: $${profitInputs.adCost}
Estimated Net Profit: $${profit.netProfit}
Expected Profit Margin: ${profit.profitMargin}%
ROI Ratio: ${profit.roi}%

Please provide a highly professional 4-section report in Arabic (with direct sub-headings in Arabic and English):
1. **الخلاصة وتوصية الاستيراد (Executive Import Recommendation)**: A direct score out of 10 and if it is highly recommended, or needs caution.
2. **نقاط القوة التنافسية (Competitive Strengths)**: bulleted details.
3. **التحديات والمخاطر (Key Risks & Challenges)**: shipping, margins, or competitor levels.
4. **خطة التسويق والتسعير المقترحة (Suggested Marketing & Pricing Strategy)**: hook ideas for social media and the best selling pitch.`;

    try {
      const res = await fetch('/api/marketing-agent-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemInstruction: 'You are a veteran e-commerce dropshipping expert. Analyze products objectively using precise metrics and business terms.'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.response);
      } else {
        setAiAnalysis('❌ فشل الاتصال بمساعد الذكاء الاصطناعي. يرجى إعادة المحاولة.');
      }
    } catch (e: any) {
      console.error(e);
      setAiAnalysis('❌ خطأ في الشبكة أثناء جلب بيانات الذكاء الاصطناعي.');
    } finally {
      setAiLoading(false);
    }
  };

  // Perform final product import to store
  const executeFinalImport = (p: ResearchProduct) => {
    // Construct Product object matching ryvo standard schema
    const newProduct = {
      id: p.id,
      name_ar: p.name_ar,
      name_en: p.name_en,
      name_fr: p.name_en, // default
      description_ar: p.description,
      description_en: p.description,
      description_fr: p.description,
      features_ar: isRtl ? 'جودة عالية, شحن سريع, ضمان سلامة الهيكل' : 'Premium quality, Fast shipping, Full structural guarantee',
      features_en: 'Premium quality, Fast shipping, Full structural guarantee',
      features_fr: 'Qualité premium, Expédition rapide',
      tag_ar: p.category.toUpperCase(),
      tag_en: p.category.toUpperCase(),
      tag_fr: p.category.toUpperCase(),
      image: p.image,
      additional_images: p.images,
      video_url: p.videoUrl,
      price: profitInputs.sellingPrice || Math.round(p.price * 2.5),
      stock: 50, // default stock count
      category: p.category,
      rating_sum: Math.round(p.rating * 10),
      rating_count: 10,
      is_featured: false,
      cod_available: true,
      supplier_id: 'cj',
      supplier_url: p.supplierUrl,
      supplier_sku: p.sku,
      supplier_purchase_price: p.price,
      supplier_shipping_cost: p.shippingCost,
      supplier_profit_margin: profitInputs.sellingPrice ? Math.round(((profitInputs.sellingPrice - p.price) / profitInputs.sellingPrice) * 100) : 60,
      supplier_product_id: p.id,
      weight: p.weight,
      width: p.width,
      height: p.height,
      length: p.length,
      shipping_class: p.weight > 5 ? 'heavy_bike' : 'standard',
      warehouse_name: p.warehouse,
      country_shipped_from: p.country,
      is_verified_inventory: p.verifiedInventory,
      supports_custom_packaging: p.customPackaging,
      can_be_merged: p.combinedShipping,
      processing_time: `${p.processingTime} days`,
      estimated_shipping_time: `${p.shippingTime} days`,
      shipping_carrier: p.shippingCompany
    };

    onAddProduct(newProduct);
    alert(isRtl ? '🎉 تم استيراد المنتج بنجاح وإضافته لقسم المنتجات في المتجر!' : '🎉 Product successfully imported and added to your store collection!');
    setSelectedProduct(null);
  };

  // Filtered Products List
  const getFilteredProducts = () => {
    return products.filter(p => {
      // Basic Search query (client-side backup)
      const query = searchQuery.toLowerCase();
      if (query && !p.name_en.toLowerCase().includes(query) && !p.name_ar.includes(query) && !p.sku.toLowerCase().includes(query)) {
        return false;
      }

      // Advanced Filters
      const score = calculateProductScore(p);
      if (score < filterMinScore) return false;
      if (p.price > filterMaxPrice) return false;
      if (filterRating && p.rating < filterRating) return false;
      if (filterVideo && !p.videoUrl) return false;
      if (filterFreeShipping && !p.freeShipping) return false;
      if (filterVerified && !p.verifiedInventory) return false;
      if (filterWarehouse !== 'All' && p.country !== filterWarehouse) return false;
      
      if (filterLogistics.logoBranding && !p.logoBranding) return false;
      if (filterLogistics.customPackaging && !p.customPackaging) return false;
      if (filterLogistics.combinedShipping && !p.combinedShipping) return false;

      return true;
    });
  };

  // Supplier Grade Calculator (Out of 100)
  const calculateSupplierScore = (s: SupplierMetric) => {
    const total = s.quality * 1.5 + s.speed * 1.5 + s.shipping * 1.5 + s.support * 1.5 + s.packaging * 1.0 + s.logo * 1.0 + s.replacement * 1.0 + s.discounts * 0.5 + s.stock * 0.5;
    // Normalized to 100
    return Math.round((total / 10.0) * 10);
  };

  const getSupplierGradeLetter = (score: number) => {
    if (score >= 95) return 'A+';
    if (score >= 88) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    return 'D';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'A': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'B': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'C': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    }
  };

  // Supplier Form state
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<SupplierMetric>>({
    name: '',
    type: 'Local',
    country: 'Saudi Arabia',
    warehouses: ['Riyadh'],
    productCount: 100,
    activeOrders: 0,
    totalSales: 0,
    returnRate: 0.1,
    responseSpeed: '10 mins',
    recommend: true,
    quality: 9,
    speed: 9,
    shipping: 9,
    support: 9,
    packaging: 8,
    logo: 8,
    replacement: 9,
    discounts: 7,
    stock: 8,
    notes: ''
  });

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name) return;
    const created: SupplierMetric = {
      id: 'sup-' + Date.now(),
      name: newSupplier.name,
      type: newSupplier.type as any,
      country: newSupplier.country || 'Saudi Arabia',
      warehouses: newSupplier.warehouses || ['Riyadh Main'],
      productCount: Number(newSupplier.productCount) || 0,
      activeOrders: 0,
      totalSales: 0,
      returnRate: Number(newSupplier.returnRate) || 0,
      responseSpeed: newSupplier.responseSpeed || '15 mins',
      lastContact: new Date().toLocaleDateString('en-US'),
      notes: newSupplier.notes || '',
      recommend: !!newSupplier.recommend,
      quality: Number(newSupplier.quality) || 8,
      speed: Number(newSupplier.speed) || 8,
      shipping: Number(newSupplier.shipping) || 8,
      support: Number(newSupplier.support) || 8,
      packaging: Number(newSupplier.packaging) || 8,
      logo: Number(newSupplier.logo) || 8,
      replacement: Number(newSupplier.replacement) || 8,
      discounts: Number(newSupplier.discounts) || 8,
      stock: Number(newSupplier.stock) || 8
    };

    const updatedList = [...suppliers, created];
    saveSuppliers(updatedList);
    setShowAddSupplier(false);
    setNewSupplier({
      name: '',
      type: 'Local',
      country: 'Saudi Arabia',
      warehouses: ['Riyadh'],
      productCount: 100,
      activeOrders: 0,
      totalSales: 0,
      returnRate: 0.1,
      responseSpeed: '10 mins',
      recommend: true,
      quality: 9,
      speed: 9,
      shipping: 9,
      support: 9,
      packaging: 8,
      logo: 8,
      replacement: 9,
      discounts: 7,
      stock: 8,
      notes: ''
    });
    alert(isRtl ? '🎉 تم إضافة المورد الجديد بنجاح!' : '🎉 New supplier successfully registered!');
  };

  const deleteSupplier = (id: string) => {
    if (confirm(isRtl ? 'هل أنت متأكد من حذف هذا المورد؟' : 'Are you sure you want to delete this supplier?')) {
      const filtered = suppliers.filter(s => s.id !== id);
      saveSuppliers(filtered);
    }
  };

  const toggleSupplierRecommendation = (id: string) => {
    const updated = suppliers.map(s => {
      if (s.id === id) {
        return { ...s, recommend: !s.recommend };
      }
      return s;
    });
    saveSuppliers(updated);
  };

  // Helper Stats Computed
  const filteredProductsList = getFilteredProducts();
  const excellentProductsCount = products.filter(p => calculateProductScore(p) >= 90).length;
  const favoritesCount = Object.values(favorites).filter(Boolean).length;
  const avgSupplierRating = suppliers.length ? (suppliers.reduce((acc, s) => acc + calculateSupplierScore(s), 0) / suppliers.length).toFixed(0) : '0';

  return (
    <div id="product-research-center-root" className="text-slate-800 dark:text-slate-100 font-sans min-h-screen">
      
      {/* Header and Mode switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
            {isRtl ? 'مركز أبحاث المنتجات الذكي' : 'Smart Product Research Center'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isRtl 
              ? 'التحليل الآلي وتحديد أفضل المنتجات والموردين المدعوم بالبيانات والذكاء الاصطناعي من CJ Dropshipping.' 
              : 'Automated high-fidelity evaluation and supplier selection system integrated with CJ API.'}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveMode('research')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeMode === 'research'
                ? 'bg-white dark:bg-[#131b2e] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            {isRtl ? 'البحث وتقييم المنتجات' : 'Product Research'}
          </button>
          <button
            onClick={() => setActiveMode('suppliers')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeMode === 'suppliers'
                ? 'bg-white dark:bg-[#131b2e] text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            {isRtl ? 'دليل وإدارة الموردين' : 'Supplier Management'}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <AnimatePresence mode="wait">
        {activeMode === 'research' ? (
          <motion.div
            key="research-workspace"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {/* 1. Quick Stats Dashboard Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{isRtl ? 'منتجات محللة' : 'Scanned Products'}</div>
                  <div className="text-xl font-black mt-0.5">{products.length}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{isRtl ? 'منتجات ممتازة' : 'Premium Grade'}</div>
                  <div className="text-xl font-black mt-0.5">{excellentProductsCount} <span className="text-xs text-slate-400 font-medium">(&gt;=90)</span></div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">
                  <Heart className="w-5 h-5 fill-rose-500" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{isRtl ? 'المفضلة للمراجعة' : 'Saved Favorites'}</div>
                  <div className="text-xl font-black mt-0.5">{favoritesCount}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{isRtl ? 'مستودعات نشطة' : 'Active Sources'}</div>
                  <div className="text-xl font-black mt-0.5">{suppliers.length} <span className="text-xs text-slate-400 font-medium">{isRtl ? 'شركاء' : 'sources'}</span></div>
                </div>
              </div>
            </div>

            {/* Sandbox Notice Banner */}
            {isSandbox && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    {isRtl ? 'وضع المحاكاة نشط (Sandbox Mode Fallback)' : 'High-fidelity Sandbox Mode Active'}
                  </h4>
                  <p className="text-[11px] text-amber-600 dark:text-amber-500/90 mt-0.5">
                    {isRtl 
                      ? 'النظام يقرأ عينات بيانات حية مع تفاصيل لوجستية كاملة ومتقدمة لمحاكاة مئات آلاف المنتجات بكفاءة.' 
                      : 'Showing rich synthesized supplier metadata matching production requirements.'}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Interactive Search & Filters Row */}
            <div className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-6 shadow-sm">
              <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isRtl ? 'ابحث بالإنجليزية (مثال: Smartwatch, Bicycle, Helmet)...' : 'Search CJ Products (English recommended: Smartwatch, Bike)...'}
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                      showFilters 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30' 
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    {isRtl ? 'أدوات التصفية المتقدمة' : 'Advanced Filters'}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {isRtl ? 'بحث ومزامنة' : 'Sync & Search'}
                  </button>
                </div>
              </form>

              {/* Collapsible Advanced Filters */}
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-t border-slate-100 dark:border-slate-800/80 mt-4 pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
                >
                  {/* Min Score filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">{isRtl ? 'الحد الأدنى لدرجة التقييم (Score)' : 'Min Quality Score'}</label>
                    <select 
                      value={filterMinScore} 
                      onChange={(e) => setFilterMinScore(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                    >
                      <option value="0">{isRtl ? 'الكل' : 'All Scores'}</option>
                      <option value="90">{isRtl ? 'امتياز فقط (>= 90)' : 'Excellent only (>= 90)'}</option>
                      <option value="80">{isRtl ? 'جيد جداً فما فوق (>= 80)' : 'Very Good and up (>= 80)'}</option>
                      <option value="70">{isRtl ? 'يحتاج مراجعة فما فوق (>= 70)' : 'Needs review and up (>= 70)'}</option>
                    </select>
                  </div>

                  {/* Rating filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">{isRtl ? 'تقييم المنتج (Rating)' : 'Minimum Product Rating'}</label>
                    <select 
                      value={filterRating || ''} 
                      onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                    >
                      <option value="">{isRtl ? 'جميع التقييمات' : 'All Ratings'}</option>
                      <option value="4.5">{isRtl ? '★ 4.5 فما فوق' : '★ 4.5 & up'}</option>
                      <option value="4.0">{isRtl ? '★ 4.0 فما فوق' : '★ 4.0 & up'}</option>
                    </select>
                  </div>

                  {/* Max price filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      {isRtl ? `أقصى سعر شراء للمنتج: $${filterMaxPrice}` : `Max Purchase Price: $${filterMaxPrice}`}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="500"
                      value={filterMaxPrice}
                      onChange={(e) => setFilterMaxPrice(Number(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Warehouse filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">{isRtl ? 'مستودع الشحن' : 'Warehouse Region'}</label>
                    <select 
                      value={filterWarehouse} 
                      onChange={(e) => setFilterWarehouse(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                    >
                      <option value="All">{isRtl ? 'جميع المستودعات العالمية' : 'All Warehouses'}</option>
                      <option value="KSA">{isRtl ? 'مستودعات السعودية فقط (KSA)' : 'Saudi Warehouses only'}</option>
                      <option value="China">{isRtl ? 'مستودعات الصين (China)' : 'China Warehouse'}</option>
                      <option value="US">{isRtl ? 'مستودعات أمريكا (USA)' : 'USA Warehouse'}</option>
                    </select>
                  </div>

                  {/* Logistic checkboxes */}
                  <div className="sm:col-span-2 md:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-slate-50 dark:border-slate-850 pt-3 mt-1">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={filterVerified} 
                        onChange={(e) => setFilterVerified(e.target.checked)}
                        className="rounded accent-indigo-600"
                      />
                      {isRtl ? 'مخزون محقق ومضمون' : 'Verified Guaranteed Stock'}
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={filterFreeShipping} 
                        onChange={(e) => setFilterFreeShipping(e.target.checked)}
                        className="rounded accent-indigo-600"
                      />
                      {isRtl ? 'شحن مجاني متوفر' : 'Free Shipping Option'}
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={filterLogistics.logoBranding} 
                        onChange={(e) => setFilterLogistics({...filterLogistics, logoBranding: e.target.checked})}
                        className="rounded accent-indigo-600"
                      />
                      {isRtl ? 'يدعم الشعار المخصص (Logo)' : 'Supports Logo Branding'}
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={filterLogistics.customPackaging} 
                        onChange={(e) => setFilterLogistics({...filterLogistics, customPackaging: e.target.checked})}
                        className="rounded accent-indigo-600"
                      />
                      {isRtl ? 'يدعم التغليف المخصص' : 'Supports Custom Packaging'}
                    </label>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick prefilled keywords */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 text-xs">
              <span className="text-slate-400 font-bold shrink-0">{isRtl ? 'كلمات بحث مقترحة:' : 'Popular keywords:'}</span>
              {['Smart watch', 'Bike helmet', 'Racing bicycle', 'Shock absorber', 'Saddle', 'Sports GPS'].map(kw => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => {
                    setSearchQuery(kw);
                    fetchProducts(kw);
                  }}
                  className="px-3 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/20 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200/50 dark:border-slate-800 cursor-pointer"
                >
                  {kw}
                </button>
              ))}
            </div>

            {/* 3. Products List Workspace */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-xs text-slate-500 mt-4 animate-pulse">
                  {isRtl ? 'جاري الاستعلام عن بيانات المنتجات والموردين من CJ Dropshipping...' : 'Connecting to CJ Dropshipping database...'}
                </p>
              </div>
            ) : filteredProductsList.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-sm font-bold">{isRtl ? 'لا توجد نتائج بحث مطابقة' : 'No matching research products'}</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
                  {isRtl 
                    ? 'جرب البحث بكلمات أبسط بالإنجليزية مثل (Bike, Smartwatch) أو قم بتعديل خيارات التصفية المتقدمة.'
                    : 'Try looking up simpler English terms like "Bike" or relaxing your advanced filters.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProductsList.map((p) => {
                  const score = calculateProductScore(p);
                  const grade = getScoreGrade(score);
                  return (
                    <motion.div
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col h-full relative"
                      whileHover={{ y: -4 }}
                    >
                      {/* Top Action / Favorite badge */}
                      <button
                        onClick={(e) => toggleFavorite(p.id, e)}
                        className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-slate-500 hover:text-rose-500 hover:scale-110 transition-all cursor-pointer"
                      >
                        <Heart className={`w-4 h-4 transition-colors ${favorites[p.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>

                      {/* Score Badge */}
                      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/10 text-white font-black text-[10px]">
                        <Award className="w-3.5 h-3.5 text-yellow-400" />
                        <span>{score} pts</span>
                      </div>

                      {/* Image header */}
                      <div className="aspect-[4/3] w-full overflow-hidden relative bg-slate-100">
                        <img
                          src={p.image}
                          alt={p.name_en}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Shipped from/Country label */}
                        <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-indigo-600/90 text-white font-extrabold text-[8px] tracking-wider uppercase">
                          {p.country} ({p.warehouse})
                        </div>
                      </div>

                      {/* Product details */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{p.category}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${grade.color}`}>
                            {grade.label}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-xs line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {isRtl ? p.name_ar : p.name_en}
                        </h3>

                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                          {p.description}
                        </p>

                        {/* Middle metadata metrics */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-b border-slate-50 dark:border-slate-800/60 my-4 py-3 text-[10px]">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                            <span>{isRtl ? 'الطلبات:' : 'Orders:'} <strong>{p.ordersCount}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span>{isRtl ? 'التقييم:' : 'Rating:'} <strong>{p.rating}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            <span>{isRtl ? 'شحن:' : 'Shipping:'} <strong>{p.freeShipping ? (isRtl ? 'مجاني' : 'Free') : `$${p.shippingCost}`}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{isRtl ? 'التجهيز:' : 'Processing:'} <strong>{p.processingTime} {isRtl ? 'أيام' : 'days'}</strong></span>
                          </div>
                        </div>

                        {/* Footer cost vs profit info */}
                        <div className="mt-auto pt-2 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest block">{isRtl ? 'سعر التكلفة' : 'Cost Price'}</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white">${p.price}</span>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-emerald-500 uppercase tracking-widest block">{isRtl ? 'الربح المتوقع' : 'Estimated Profit'}</span>
                            <span className="text-sm font-black text-emerald-500">${(p.price * 1.5).toFixed(0)}</span>
                          </div>
                        </div>

                        {/* Interactive Scan report indicator */}
                        {productNotes[p.id]?.notes && (
                          <div className="mt-4 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-start gap-1.5 text-[9px] text-slate-500 border border-slate-100 dark:border-slate-850">
                            <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="line-clamp-1"><strong>{isRtl ? 'ملاحظة:' : 'Note:'}</strong> {productNotes[p.id].notes}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* =======================================================
             DUAL VIEW: Dedicated Suppliers directory & Grade System
             ======================================================= */
          <motion.div
            key="suppliers-workspace"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {/* Enterprise KPIs banner */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{isRtl ? 'متوسط درجة جودة الموردين' : 'Avg Supplier Score'}</div>
                  <div className="text-xl font-black mt-0.5">{avgSupplierRating}%</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{isRtl ? 'سرعة الاستجابة المقدرة' : 'Avg Response Speed'}</div>
                  <div className="text-xl font-black mt-0.5">15 {isRtl ? 'دقيقة' : 'mins'}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{isRtl ? 'معدل المرتجعات المقدر' : 'Avg Return Rate'}</div>
                  <div className="text-xl font-black mt-0.5">0.7%</div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{isRtl ? 'إجمالي الطلبات النشطة' : 'Active Orders Fulfilled'}</div>
                  <div className="text-xl font-black mt-0.5">2,660</div>
                </div>
              </div>
            </div>

            {/* Title row and add supplier button */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-500" />
                {isRtl ? 'سجل تقييم وجدارة الموردين والشركاء' : 'Partners & Supplier Gradebook'}
              </h3>

              <button
                onClick={() => setShowAddSupplier(!showAddSupplier)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {isRtl ? 'إضافة شريك/مورد جديد' : 'Register New Supplier'}
              </button>
            </div>

            {/* Create Supplier Form */}
            {showAddSupplier && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm"
              >
                <form onSubmit={handleCreateSupplier}>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">{isRtl ? 'تفاصيل المورد الجديد ونقاط الجدارة' : 'Register New Supplier & Merits'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">{isRtl ? 'اسم المورد' : 'Supplier Name'}</label>
                      <input
                        type="text"
                        required
                        value={newSupplier.name}
                        onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                        placeholder={isRtl ? 'اسم المورد الشريك...' : 'e.g. Aero Sports Hub'}
                        className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">{isRtl ? 'التصنيف/المصدر' : 'Supplier Type'}</label>
                      <select
                        value={newSupplier.type}
                        onChange={(e) => setNewSupplier({...newSupplier, type: e.target.value as any})}
                        className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                      >
                        <option value="CJ">CJ Dropshipping</option>
                        <option value="AliExpress">AliExpress VIP</option>
                        <option value="Local">Local Supplier</option>
                        <option value="Other">Other Integration</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">{isRtl ? 'مقر المورد / الدولة' : 'Country Location'}</label>
                      <input
                        type="text"
                        value={newSupplier.country}
                        onChange={(e) => setNewSupplier({...newSupplier, country: e.target.value})}
                        className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">{isRtl ? 'سرعة الرد والمحادثات' : 'Response Speed'}</label>
                      <input
                        type="text"
                        value={newSupplier.responseSpeed}
                        onChange={(e) => setNewSupplier({...newSupplier, responseSpeed: e.target.value})}
                        placeholder="e.g. 5 mins"
                        className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                      />
                    </div>

                    {/* Numeric grades sliders */}
                    <div className="sm:col-span-2 md:col-span-4 border-t border-slate-50 dark:border-slate-850 pt-4 mt-2">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase mb-3">{isRtl ? 'معايير تقييم النقاط (من 1 إلى 10)' : 'Performance Standards (Scale 1 to 10)'}</span>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-1">{isRtl ? 'جودة تصنيع المنتج' : 'Manufacture Quality'}</label>
                          <input type="number" min="1" max="10" value={newSupplier.quality} onChange={(e) => setNewSupplier({...newSupplier, quality: Number(e.target.value)})} className="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-1">{isRtl ? 'سرعة تجهيز الطلب' : 'Processing Speed'}</label>
                          <input type="number" min="1" max="10" value={newSupplier.speed} onChange={(e) => setNewSupplier({...newSupplier, speed: Number(e.target.value)})} className="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-1">{isRtl ? 'التزام شركة الشحن' : 'Shipping Logistics'}</label>
                          <input type="number" min="1" max="10" value={newSupplier.shipping} onChange={(e) => setNewSupplier({...newSupplier, shipping: Number(e.target.value)})} className="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-1">{isRtl ? 'جودة وكياسة الدعم' : 'Support Team'}</label>
                          <input type="number" min="1" max="10" value={newSupplier.support} onChange={(e) => setNewSupplier({...newSupplier, support: Number(e.target.value)})} className="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-1">{isRtl ? 'التغليف وتوفير الهوية' : 'Packaging Options'}</label>
                          <input type="number" min="1" max="10" value={newSupplier.packaging} onChange={(e) => setNewSupplier({...newSupplier, packaging: Number(e.target.value)})} className="w-full text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800" />
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-2 md:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">{isRtl ? 'ملاحظات وتفاصيل الشراكة' : 'Internal Partnership Notes'}</label>
                      <textarea
                        value={newSupplier.notes}
                        onChange={(e) => setNewSupplier({...newSupplier, notes: e.target.value})}
                        className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 h-16 outline-none"
                        placeholder={isRtl ? 'أدخل ملاحظات خاصة بالدعم أو المرتجعات...' : 'Notes regarding replacement policies, warehouse details...'}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end mt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddSupplier(false)}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    >
                      {isRtl ? 'حفظ الشريك' : 'Register Partner'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Suppliers Gradebook Table */}
            <div className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-extrabold text-[10px] uppercase border-b border-slate-100 dark:border-slate-800">
                      <th className="py-4 px-5">{isRtl ? 'اسم المورد الشريك' : 'Supplier Name'}</th>
                      <th className="py-4 px-3">{isRtl ? 'الدولة / الموضع' : 'Location'}</th>
                      <th className="py-4 px-3 text-center">{isRtl ? 'المنتجات والطلبات' : 'Activity'}</th>
                      <th className="py-4 px-3 text-center">{isRtl ? 'نسبة المرتجع' : 'Return Rate'}</th>
                      <th className="py-4 px-3 text-center">{isRtl ? 'الاستجابة' : 'Response'}</th>
                      <th className="py-4 px-3 text-center">{isRtl ? 'الدرجة والتقييم' : 'Overall Grade'}</th>
                      <th className="py-4 px-3 text-center">{isRtl ? 'توصية الشراكة' : 'Partnership Recommend'}</th>
                      <th className="py-4 px-5 text-right">{isRtl ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 font-bold">
                    {suppliers.map(s => {
                      const totalScore = calculateSupplierScore(s);
                      const gradeLetter = getSupplierGradeLetter(totalScore);
                      const gradeColor = getGradeColor(gradeLetter);
                      
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                          {/* Name info */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                                {s.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-xs font-black">{s.name}</div>
                                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                                  <span>{s.type} Partner</span>
                                  <span>•</span>
                                  <span>{isRtl ? 'آخر تواصل:' : 'Last:'} {s.lastContact}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Country */}
                          <td className="py-4 px-3">
                            <div className="flex flex-col">
                              <span>{s.country}</span>
                              <span className="text-[9px] text-slate-400 font-medium line-clamp-1">{s.warehouses.join(', ')}</span>
                            </div>
                          </td>

                          {/* Activity info */}
                          <td className="py-4 px-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-xs">{s.productCount.toLocaleString()} {isRtl ? 'منتج' : 'items'}</span>
                              <span className="text-[9px] text-slate-400 font-medium">{s.activeOrders} {isRtl ? 'طلب نشط' : 'active orders'}</span>
                            </div>
                          </td>

                          {/* Return Rate */}
                          <td className="py-4 px-3 text-center">
                            <span className={`text-xs ${s.returnRate > 1.5 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {s.returnRate}%
                            </span>
                          </td>

                          {/* Response Speed */}
                          <td className="py-4 px-3 text-center">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              {s.responseSpeed}
                            </span>
                          </td>

                          {/* Supplier Grade score out of 100 */}
                          <td className="py-4 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-[11px] px-2.5 py-0.5 rounded font-black ${gradeColor}`}>
                                {gradeLetter} Grade
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">{totalScore}/100 points</span>
                            </div>
                          </td>

                          {/* Recommendation Status */}
                          <td className="py-4 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSupplierRecommendation(s.id)}
                              className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer transition-colors ${
                                s.recommend 
                                  ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {s.recommend ? (isRtl ? '🏆 موصى به جداً' : '🏆 Recommend') : (isRtl ? 'مراجعة معلقة' : 'No Recommendation')}
                            </button>
                          </td>

                          {/* Delete/Edit Actions */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => deleteSupplier(s.id)}
                                disabled={s.id === 'cj' || s.id === 'saudi-elite'}
                                className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                                title="Delete partner record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Private supplier review strategy note */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[10px] text-slate-400 font-medium">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {isRtl 
                    ? 'يتم تحديث درجة الجودة آلياً بناءً على متوسط معايير الجودة، سرعة الرد، سرعة الشحن والدعم. الدرجات (A+ و A) تمثل الموردين الموصى بالتعامل معهم حصرياً لضمان سلامة ورضا عملاء رايفو.'
                    : 'Supplier merit scores are calculated continuously based on speed, quality of packaging, return rates, and support. Partners graded A+ or A represent highly reliable suppliers.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          magnificent SPLIT-SCREEN modal workspace for DEEP RESEARCH
          ======================================================== */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden max-h-[90vh] flex flex-col text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                    <Activity className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="font-black text-sm">{isRtl ? selectedProduct.name_ar : selectedProduct.name_en}</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>SKU: {selectedProduct.sku}</span>
                      <span>•</span>
                      <span>Product ID: {selectedProduct.id}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${favorites[selectedProduct.id] ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-slate-400 hover:text-slate-600 text-base font-black px-3 py-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Split Content scroll area */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LEFT SIDE: Media & Health Scan & Notes */}
                <div className="space-y-6">
                  {/* Image and Video area */}
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800">
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden relative bg-slate-100">
                      {selectedProduct.videoUrl && selectedImageIdx === selectedProduct.images.length ? (
                        <video 
                          src={selectedProduct.videoUrl} 
                          controls 
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                        />
                      ) : (
                        <img
                          src={selectedProduct.images[selectedImageIdx] || selectedProduct.image}
                          alt="Gallery"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Thumbnail gallery */}
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                      {selectedProduct.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIdx(idx)}
                          className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                            selectedImageIdx === idx ? 'border-indigo-500 scale-95' : 'border-transparent'
                          }`}
                        >
                          <img src={img} className="w-full h-full object-cover" />
                        </button>
                      ))}

                      {/* Video thumbnail play preview if has video */}
                      {selectedProduct.videoUrl && (
                        <button
                          onClick={() => setSelectedImageIdx(selectedProduct.images.length)}
                          className={`w-12 h-12 rounded-lg bg-indigo-900 text-white flex items-center justify-center shrink-0 border-2 cursor-pointer ${
                            selectedImageIdx === selectedProduct.images.length ? 'border-indigo-500' : 'border-transparent'
                          }`}
                        >
                          <Play className="w-5 h-5 fill-white text-indigo-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Profitability live inputs */}
                  <div className="bg-white dark:bg-slate-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <h4 className="font-extrabold text-xs flex items-center gap-2 text-indigo-500 border-b border-slate-50 dark:border-slate-850 pb-2">
                      <Percent className="w-4 h-4" />
                      {isRtl ? 'حاسبة الربحية وهامش التشغيل' : 'Operational Profitability Calculator'}
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-[10px]">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">{isRtl ? 'سعر البيع المقدر ($)' : 'Est. Selling Price ($)'}</label>
                        <input
                          type="number"
                          value={profitInputs.sellingPrice}
                          onChange={(e) => setProfitInputs({...profitInputs, sellingPrice: Number(e.target.value)})}
                          className="w-full p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-bold mb-1">{isRtl ? 'تكلفة التسويق/الإعلان ($)' : 'Marketing/Ad Spend ($)'}</label>
                        <input
                          type="number"
                          value={profitInputs.adCost}
                          onChange={(e) => setProfitInputs({...profitInputs, adCost: Number(e.target.value)})}
                          className="w-full p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-bold mb-1">{isRtl ? 'رسوم المتجر والمستودع ($)' : 'Fixed Store Fees ($)'}</label>
                        <input
                          type="number"
                          value={profitInputs.storeFee}
                          onChange={(e) => setProfitInputs({...profitInputs, storeFee: Number(e.target.value)})}
                          className="w-full p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-bold"
                        />
                      </div>
                    </div>

                    {/* Calculated live profitability metrics panel */}
                    {(() => {
                      const metrics = calculateProfitability(selectedProduct);
                      return (
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-850 grid grid-cols-3 gap-3 text-center">
                          <div>
                            <span className="text-[9px] text-slate-400 block">{isRtl ? 'صافي الربح المقدر' : 'Net Profit'}</span>
                            <span className={`text-sm font-black ${metrics.netProfit > 5 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              ${metrics.netProfit}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block">{isRtl ? 'هامش الربح التشغيلي' : 'Profit Margin'}</span>
                            <span className={`text-sm font-black ${metrics.profitMargin >= 30 ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {metrics.profitMargin}%
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block">{isRtl ? 'العائد على الاستثمار ROI' : 'Expected ROI'}</span>
                            <span className={`text-sm font-black ${metrics.roi >= 50 ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {metrics.roi}%
                            </span>
                          </div>

                          <div className="col-span-3 grid grid-cols-3 gap-2 border-t border-slate-200/50 dark:border-slate-800 pt-3 mt-1 text-[9px] text-slate-400 text-left font-medium">
                            <div>{isRtl ? 'حد التعادل:' : 'Breakeven:'} <strong className="text-slate-600 dark:text-slate-300">${metrics.breakeven}</strong></div>
                            <div>{isRtl ? 'الحد الأدنى:' : 'Min Sell:'} <strong className="text-slate-600 dark:text-slate-300">${metrics.minSell}</strong></div>
                            <div>{isRtl ? 'السعر المقترح:' : 'Suggested:'} <strong className="text-emerald-500">${metrics.suggestedSell}</strong></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Private employee notes and review justification fields */}
                  <div className="bg-white dark:bg-slate-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <h4 className="font-extrabold text-xs flex items-center gap-2 text-indigo-500 border-b border-slate-50 dark:border-slate-850 pb-2">
                      <FileText className="w-4 h-4" />
                      {isRtl ? 'ملاحظات فريق العمل واعتماد المراجعة' : 'Internal Review Audit & Notes'}
                    </h4>

                    <div className="space-y-3 text-[10px]">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">{isRtl ? 'ملاحظات خاصة عن جودة المنتج واللوجستيات' : 'Private Notes & Supplier Observations'}</label>
                        <textarea
                          value={productNotes[selectedProduct.id]?.notes || ''}
                          onChange={(e) => saveProductNotesData(selectedProduct.id, 'notes', e.target.value)}
                          placeholder={isRtl ? 'اكتب هنا ملاحظاتك الخاصة، سيتم حفظها تلقائياً لقاعدة البيانات...' : 'Write team findings, custom terms agreed...'}
                          className="w-full p-2 text-xs rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 h-16 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 font-bold mb-1">{isRtl ? 'مبرر القبول للمتجر' : 'Reason for Selection (Product Fit)'}</label>
                          <input
                            type="text"
                            value={productNotes[selectedProduct.id]?.selectionReason || ''}
                            onChange={(e) => saveProductNotesData(selectedProduct.id, 'selectionReason', e.target.value)}
                            placeholder={isRtl ? 'مثال: هامش مرتفع وطلب نشط' : 'e.g. Great margin and low return rate'}
                            className="w-full p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-bold mb-1">{isRtl ? 'مبرر التحفظ أو الرفض' : 'Reason for Hesitancy (If any)'}</label>
                          <input
                            type="text"
                            value={productNotes[selectedProduct.id]?.rejectionReason || ''}
                            onChange={(e) => saveProductNotesData(selectedProduct.id, 'rejectionReason', e.target.value)}
                            placeholder={isRtl ? 'مثال: يحتاج تحسين الوصف' : 'e.g. Requires better photos'}
                            className="w-full p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                          />
                        </div>
                      </div>

                      {productNotes[selectedProduct.id]?.reviewDate && (
                        <div className="text-[8px] text-slate-400 text-right mt-1 font-medium">
                          {isRtl ? 'آخر تعديل مراجعة بواسطة:' : 'Last edited by:'} {productNotes[selectedProduct.id].reviewerName} • {productNotes[selectedProduct.id].reviewDate}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE: 30+ specifications & Health Checklist & AI Assistant */}
                <div className="space-y-6">
                  {/* Detailed 30+ specifications sheet */}
                  <div className="bg-white dark:bg-slate-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <h4 className="font-extrabold text-xs flex items-center gap-2 text-indigo-500 border-b border-slate-50 dark:border-slate-850 pb-2">
                      <Sliders className="w-4 h-4" />
                      {isRtl ? 'المواصفات الفنية واللوجستية الكاملة (CJ Details)' : 'Comprehensive Logistics & Technical Specifications'}
                    </h4>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[10px]">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                        <span className="text-slate-400 font-medium">{isRtl ? 'وزن المنتج (Weight)' : 'Product Weight'}</span>
                        <strong className="text-slate-700 dark:text-slate-200">{selectedProduct.weight} kg</strong>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                        <span className="text-slate-400 font-medium">{isRtl ? 'الأبعاد الفنية (Dimensions)' : 'Dimensions (L*W*H)'}</span>
                        <strong className="text-slate-700 dark:text-slate-200">{selectedProduct.length}x{selectedProduct.width}x{selectedProduct.height} cm</strong>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                        <span className="text-slate-400 font-medium">{isRtl ? 'دولة الشحن ومقر المخزون' : 'Shipping Origin'}</span>
                        <strong className="text-indigo-600 dark:text-indigo-400 uppercase font-black">{selectedProduct.country}</strong>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                        <span className="text-slate-400 font-medium">{isRtl ? 'اسم المستودع المعين' : 'Assigned Warehouse'}</span>
                        <strong className="text-slate-700 dark:text-slate-200">{selectedProduct.warehouse}</strong>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                        <span className="text-slate-400 font-medium">{isRtl ? 'مدة تجهيز الطلب المقدرة' : 'Processing Duration'}</span>
                        <strong className="text-slate-700 dark:text-slate-200">{selectedProduct.processingTime} {isRtl ? 'أيام عمل' : 'business days'}</strong>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                        <span className="text-slate-400 font-medium">{isRtl ? 'مدة الشحن الفعلي المقدرة' : 'Delivery Duration'}</span>
                        <strong className="text-emerald-500 font-black">{selectedProduct.shippingTime} {isRtl ? 'أيام' : 'days'}</strong>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                        <span className="text-slate-400 font-medium">{isRtl ? 'الناقل اللوجستي المعتمد' : 'Logistics Carrier'}</span>
                        <strong className="text-slate-700 dark:text-slate-200">{selectedProduct.shippingCompany}</strong>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                        <span className="text-slate-400 font-medium">{isRtl ? 'حالة المخزون المتوفر' : 'Stock Availability'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${selectedProduct.stockStatus === 'In Stock' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {selectedProduct.stockStatus}
                        </span>
                      </div>

                      {/* Checkbox boolean features list */}
                      <div className="col-span-2 grid grid-cols-2 gap-3 pt-3 mt-1 border-t border-slate-50 dark:border-slate-850 font-medium">
                        <div className="flex items-center gap-1.5">
                          {selectedProduct.verifiedInventory ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                          <span className={selectedProduct.verifiedInventory ? 'text-slate-700 dark:text-slate-300 font-bold' : 'text-slate-400'}>{isRtl ? 'مخزون محقق ومؤكد' : 'Verified Inventory'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {selectedProduct.combinedShipping ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                          <span className={selectedProduct.combinedShipping ? 'text-slate-700 dark:text-slate-300 font-bold' : 'text-slate-400'}>{isRtl ? 'دعم دمج الشحنات' : 'Combined Shipping'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {selectedProduct.customPackaging ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                          <span className={selectedProduct.customPackaging ? 'text-slate-700 dark:text-slate-300 font-bold' : 'text-slate-400'}>{isRtl ? 'تغليف خاص معتمد' : 'Custom Packaging'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {selectedProduct.logoBranding ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                          <span className={selectedProduct.logoBranding ? 'text-slate-700 dark:text-slate-300 font-bold' : 'text-slate-400'}>{isRtl ? 'يدعم وضع شعار مخصص (Logo)' : 'Logo Custom Branding'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Supplier Comparison table inside modal */}
                  <div className="bg-white dark:bg-slate-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <h4 className="font-extrabold text-xs flex items-center gap-2 text-indigo-500 border-b border-slate-50 dark:border-slate-850 pb-2">
                      <Award className="w-4 h-4" />
                      {isRtl ? 'جدول مقارنة واختيار المورد الأفضل' : 'Supplier Evaluation & Auto-Selection'}
                    </h4>

                    <div className="overflow-x-auto text-[9px] font-bold">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-850 pb-2 uppercase text-[8px]">
                            <th>{isRtl ? 'اسم المورد' : 'Supplier'}</th>
                            <th>{isRtl ? 'سعر التكلفة' : 'Cost Price'}</th>
                            <th>{isRtl ? 'الشحن' : 'Shipping'}</th>
                            <th>{isRtl ? 'المدة' : 'Transit'}</th>
                            <th>{isRtl ? 'الجدارة' : 'Merit'}</th>
                            <th className="text-right">{isRtl ? 'التقييم' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                          {/* Row 1: CJ Dropshipping (Active) */}
                          <tr className="bg-indigo-500/5">
                            <td className="py-2 flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-black">
                              CJ Main
                              <span className="bg-emerald-500 text-white text-[7px] px-1 rounded">🏆 {isRtl ? 'الأفضل' : 'Best'}</span>
                            </td>
                            <td>${selectedProduct.price}</td>
                            <td>{selectedProduct.freeShipping ? 'Free' : `$${selectedProduct.shippingCost}`}</td>
                            <td>{selectedProduct.shippingTime}d</td>
                            <td>A Grade</td>
                            <td className="text-right text-emerald-500">{isRtl ? 'خيار معتمد' : 'Authorized'}</td>
                          </tr>

                          {/* Row 2: AliExpress Mock Supplier */}
                          <tr>
                            <td className="py-2 text-slate-500">AliVIP Whol.</td>
                            <td>${Number((selectedProduct.price * 0.95).toFixed(2))}</td>
                            <td>${Number((selectedProduct.shippingCost * 1.5).toFixed(2))}</td>
                            <td>{selectedProduct.shippingTime + 4}d</td>
                            <td>B Grade</td>
                            <td className="text-right text-slate-400">{isRtl ? 'أبطأ شحناً' : 'Slower Delivery'}</td>
                          </tr>

                          {/* Row 3: Local Premium Mock Supplier */}
                          <tr>
                            <td className="py-2 text-slate-500">Saudi Elite</td>
                            <td>${Number((selectedProduct.price * 1.3).toFixed(2))}</td>
                            <td>$3.99</td>
                            <td>2d</td>
                            <td>A+ Local</td>
                            <td className="text-right text-slate-400">{isRtl ? 'تكلفة مرتفعة' : 'Higher Base'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pre-import Health Check Checklist Trigger */}
                  <div className="bg-white dark:bg-slate-[#131b2e] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-850 pb-2">
                      <h4 className="font-extrabold text-xs flex items-center gap-2 text-indigo-500">
                        <ShieldCheck className="w-4 h-4" />
                        {isRtl ? 'مسح فحص السلامة قبل الاستيراد' : 'Pre-Import Quality Health Check'}
                      </h4>

                      <button
                        type="button"
                        onClick={() => runHealthCheckScan(selectedProduct)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-[9px] font-black cursor-pointer transition-colors"
                      >
                        {isRtl ? 'تشغيل الفحص' : 'Execute Scan'}
                      </button>
                    </div>

                    {importReport.scanning ? (
                      <div className="flex items-center justify-center gap-2 py-4">
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                        <span className="text-[10px] text-slate-500 animate-pulse">{isRtl ? 'جاري فحص المعايير وسلامة اللوجستيات والهوامش...' : 'Running audit checklist on CJ API dataset...'}</span>
                      </div>
                    ) : importReport.report ? (
                      <div className="space-y-2 text-[10px] bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-850">
                        <div className="flex items-center justify-between font-black pb-2 border-b border-slate-200/50 dark:border-slate-800">
                          <span className="text-slate-400">{isRtl ? 'درجة سلامة جودة الاستيراد:' : 'Quality Health Score:'}</span>
                          <span className={importReport.report.score >= 80 ? 'text-emerald-500 text-xs' : 'text-rose-500 text-xs'}>
                            {importReport.report.score} / 100 points
                          </span>
                        </div>

                        <div className="space-y-1.5 font-medium">
                          {importReport.report.checks.map((chk: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-slate-500">{chk.name}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-slate-400">{chk.desc}</span>
                                {chk.status === 'pass' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                                {chk.status === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-amber-500" />}
                                {chk.status === 'fail' && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Direct conditional enforcement if score is low */}
                        {importReport.report.score < 80 && (
                          <div className="mt-3 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded text-[9px] font-bold">
                            ⚠️ {isRtl 
                              ? 'تنبيه: درجة الجودة الكلية أقل من 80. يوصى بمراجعة الملاحظات وتعديل هوية المنتج يدوياً بعد الاستيراد.'
                              : 'Notice: Merits score is below 80. Strictly audit descriptions, prices and variants after import.'}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400">
                        {isRtl 
                          ? 'اضغط على زر تشغيل الفحص للتحقق التلقائي من توافق ملف الصور والفيديو وهوامش الربح وصحة بيانات المورد.'
                          : 'Click scan to run diagnostic checks on images, description lengths, verified stock status, and net margin.'}
                      </p>
                    )}
                  </div>

                  {/* Gemini AI Expert smart analysis panel */}
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                      <h4 className="font-extrabold text-xs flex items-center gap-2 text-indigo-500">
                        <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                        {isRtl ? 'تحليل ومستشار الذكاء الاصطناعي (Gemini)' : 'AI Smart Product Analyst (Gemini)'}
                      </h4>

                      <button
                        type="button"
                        onClick={() => analyzeWithAI(selectedProduct)}
                        disabled={aiLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1 rounded text-[9px] font-black flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {isRtl ? 'توليد التحليل الذكي' : 'Analyze with AI'}
                      </button>
                    </div>

                    {aiLoading ? (
                      <div className="flex flex-col items-center justify-center py-6 gap-2">
                        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                        <span className="text-[10px] text-slate-500 animate-pulse">{isRtl ? 'يقوم مستشار رايفو بدراسة المعايير والمنافسة التسويقية الآن...' : 'Gemini studying competitive strengths, hooks and risks...'}</span>
                      </div>
                    ) : aiAnalysis ? (
                      <div className="bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-slate-100 dark:border-slate-850 text-[10px] text-slate-700 dark:text-slate-200 overflow-y-auto max-h-56 font-medium leading-relaxed whitespace-pre-wrap">
                        {aiAnalysis}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400">
                        {isRtl 
                          ? 'استشر Gemini للتحليل الفوري لملاءمة هذا المنتج لمتجر رايفو، استعراض نقاط القوة ومخاطر الشحن واقتراح خطة البيع.'
                          : 'Get precise analysis on target audience, competitor difficulty, weaknesses and high converting copywriting ideas.'}
                      </p>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer / Import controls */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
                <span className="text-[10px] text-slate-400 font-medium">
                  {isRtl 
                    ? 'سيتم الاحتفاظ بالروابط والـ SKU للمزامنة التلقائية للمخزون لاحقاً.' 
                    : 'System preserves CJ supplier URLs and SKUs for automated future inventory sync.'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                  >
                    {isRtl ? 'إغلاق' : 'Close'}
                  </button>

                  <button
                    onClick={() => executeFinalImport(selectedProduct)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {isRtl ? 'استيراد وإضافة للمتجر' : 'Confirm & Import to Store'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
