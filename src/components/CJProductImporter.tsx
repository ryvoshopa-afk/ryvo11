import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Sliders,
  DollarSign,
  Globe,
  Percent,
  Truck,
  Info,
  Layers,
  Languages,
  Sparkles,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { Product, Language } from '../types';

interface CJProductImporterProps {
  onAddProduct: (p: Product) => void;
  currentLanguage: Language;
  adminEmail: string;
}

export default function CJProductImporter({ onAddProduct, currentLanguage, adminEmail }: CJProductImporterProps) {
  const isRtl = currentLanguage === 'ar';

  // Search and Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // Modal / Review States
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // New States for rich variants & physical properties
  const [variants, setVariants] = useState<any[]>([]);
  const [colors, setColors] = useState<{ name: string; image: string }[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<{ [size: string]: boolean }>({});
  const [length, setLength] = useState(15.0);
  const [width, setWidth] = useState(10.0);
  const [height, setHeight] = useState(5.0);

  // Edit fields (multilingual)
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editNameFr, setEditNameFr] = useState('');
  const [editDescAr, setEditDescAr] = useState('');
  const [editDescEn, setEditDescEn] = useState('');
  const [editDescFr, setEditDescFr] = useState('');
  const [editCategory, setEditCategory] = useState('bikes');
  
  // Price / Cost calculations
  const [costPrice, setCostPrice] = useState(0);
  const [profitMargin, setProfitMargin] = useState(25);
  const [finalPrice, setFinalPrice] = useState(0);

  // Sandbox & Auth status tracking
  const [isSandbox, setIsSandbox] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Physical specifications
  const [weight, setWeight] = useState(10.5);
  const [shippingClass, setShippingClass] = useState<'standard' | 'heavy_bike' | 'oversized_car' | 'digital'>('heavy_bike');

  // Supplier info
  const [supplierSku, setSupplierSku] = useState('');
  
  // Selected images state (key-value to toggle selection)
  const [allImages, setAllImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<{ [url: string]: boolean }>({});

  // Toast / Status state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Run initial query on mount
  useEffect(() => {
    fetchCJProducts();
  }, [pageNumber, pageSize]);

  const fetchCJProducts = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const url = `/api/cj/products?search=${encodeURIComponent(searchQuery)}&pageNumber=${pageNumber}&pageSize=${pageSize}`;
      const res = await fetch(url, {
        headers: {
          'X-Admin-Email': adminEmail || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.list || []);
        const parsedTotal = data.total || (data.list ? data.list.length : 0);
        setTotal(parsedTotal);
        setIsSandbox(!!data.isSandbox);
        setAuthError(data.authError || null);
      } else {
        console.error('Failed to fetch products from CJ Dropshipping API');
        setAuthError('HTTP Error: Failed to retrieve data from CJ endpoint.');
      }
    } catch (error: any) {
      console.error('Error fetching CJ products:', error);
      setAuthError(error.message || 'Network error connecting to CJ endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if the search query contains Arabic characters (Unicode range for Arabic: \u0600-\u06FF)
    const hasArabic = /[\u0600-\u06FF]/.test(searchQuery);
    if (hasArabic) {
      alert(
        isRtl
          ? '⚠️ يرجى إدخال كلمات البحث باللغة الإنجليزية فقط (مثل: Smart Watch, Bicycle) لضمان دقة النتائج من خوادم CJ Dropshipping.'
          : '⚠️ Please enter search keywords in English only (e.g., Smart Watch, Bicycle) to ensure accurate results from CJ Dropshipping servers.'
      );
      return;
    }

    setPageNumber(1);
    fetchCJProducts();
  };

  const handleOpenReview = async (prod: any) => {
    setSelectedProduct(prod);
    setIsReviewOpen(true);
    setLoadingDetails(true);

    // Set initial fallback values
    setEditNameEn(prod.productNameEn || '');
    setEditNameAr('');
    setEditNameFr('');
    setEditDescEn(prod.description || '');
    setEditDescAr('');
    setEditDescFr('');
    setEditCategory('bikes');
    const rawPrice = prod.sellPrice || prod.productSellPrice || prod.price || '10.00';
    let numericPrice = 10.0;
    if (typeof rawPrice === 'string') {
      const parts = rawPrice.split('-');
      const firstPart = parts[0].replace(/[^0-9.]/g, '').trim();
      numericPrice = Number(firstPart) || 10.0;
    } else {
      numericPrice = Number(rawPrice) || 10.0;
    }

    setCostPrice(Math.round(numericPrice * 3.75 * 100) / 100);
    setProfitMargin(25);
    setFinalPrice(Math.round(numericPrice * 3.75 * 1.25));
    setWeight(prod.weight || 0.5);
    setLength(15.0);
    setWidth(10.0);
    setHeight(5.0);
    setSupplierSku(prod.productSku || `CJ-SKU-${prod.pid}`);
    setAllImages([prod.productImage].filter(Boolean));
    setSelectedImages({ [prod.productImage]: true });
    setVariants([]);
    setColors([]);
    setSizes([]);
    setSelectedSizes({});

    try {
      const res = await fetch(`/api/cj/product/${prod.pid}`, {
        headers: { 'X-Admin-Email': adminEmail || '' }
      });
      if (res.ok) {
        const details = await res.json();
        
        // 1. Title/Desc fields: prefill English, leave Arabic/French empty for manual user drafting
        setEditNameEn(details.productNameEn || '');
        setEditNameAr('');
        setEditNameFr('');
        setEditDescEn(details.description || '');
        setEditDescAr('');
        setEditDescFr('');

        // 2. Pricing calculations (USD cost converted to SAR cost)
        const costSar = Math.round(details.productSellPrice * 3.75 * 100) / 100;
        setCostPrice(costSar);
        setProfitMargin(25);
        setFinalPrice(Math.round(costSar * 1.25));

        // 3. Physical specs
        setWeight(details.weight || 0.5);
        setLength(details.lengthCm || 15.0);
        setWidth(details.widthCm || 10.0);
        setHeight(details.heightCm || 5.0);
        setSupplierSku(details.sku || prod.productSku || `CJ-SKU-${prod.pid}`);

        // 4. Image gallery
        const imgs = details.productImages || details.images || [prod.productImage];
        const filteredImgs = imgs.filter(Boolean);
        setAllImages(filteredImgs);
        const imgSelection: { [url: string]: boolean } = {};
        filteredImgs.forEach((img: string) => {
          imgSelection[img] = true;
        });
        setSelectedImages(imgSelection);

        // 5. Variants, sizes, colors
        const rawVars = details.vList || details.variants || [];
        setVariants(rawVars);

        const uniqueSizes = Array.from(new Set(rawVars.map((v: any) => v.size).filter(Boolean))) as string[];
        setSizes(uniqueSizes);
        const initialSelectedSizes: { [size: string]: boolean } = {};
        uniqueSizes.forEach(s => { initialSelectedSizes[s] = true; });
        setSelectedSizes(initialSelectedSizes);

        const colorMap = new Map<string, string>();
        rawVars.forEach((v: any) => {
          if (v.color && v.color !== 'Default' && !colorMap.has(v.color)) {
            colorMap.set(v.color, v.image || details.images[0] || prod.productImage);
          }
        });
        const colorsList = Array.from(colorMap.entries()).map(([name, image]) => ({ name, image }));
        setColors(colorsList);
      }
    } catch (e) {
      console.error('Error fetching product details:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const toggleImageSelection = (url: string) => {
    setSelectedImages(prev => ({
      ...prev,
      [url]: !prev[url]
    }));
  };

  const handleMarginChange = (val: number) => {
    setProfitMargin(val);
    setFinalPrice(Math.round(costPrice * (1 + val / 100)));
  };

  const handleFinalPriceChange = (val: number) => {
    setFinalPrice(val);
    if (costPrice > 0) {
      setProfitMargin(Math.round(((val - costPrice) / costPrice) * 100));
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedProduct) return;

    const chosenImages = allImages.filter(url => selectedImages[url]);
    if (chosenImages.length === 0) {
      alert(isRtl ? '⚠️ يرجى تحديد صورة واحدة على الأقل للمنتج!' : '⚠️ Please select at least one product image!');
      return;
    }

    setImporting(true);
    const importId = "dropship-cj-" + Math.floor(10000 + Math.random() * 90000);

    // Filter variants to include only the selected sizes
    const activeVariants = variants.filter(v => !v.size || selectedSizes[v.size] !== false);

    // Automatically map the SKU and Supplier original info
    const brandNewProduct: Product = {
      id: importId,
      name_ar: editNameAr,
      name_en: editNameEn,
      name_fr: editNameFr,
      description_ar: editDescAr,
      description_en: editDescEn,
      description_fr: editDescFr,
      features_ar: "مستورد بجودة عالية, مخزون فوري, شحن عالمي سريع عبر API",
      features_en: "Premium imported build, live warehouse stock, global fast delivery via API",
      features_fr: "Qualité premium importée, stock en direct, livraison rapide",
      tag_ar: "مستورد CJ ⚡",
      tag_en: "CJ Imported ⚡",
      tag_fr: "Importé CJ ⚡",
      image: chosenImages[0],
      additional_images: chosenImages.slice(1),
      price: finalPrice,
      cost_price: costPrice,
      stock: activeVariants.reduce((sum, v) => sum + (v.stock || 0), 0) || selectedProduct.stock || 99,
      category: editCategory,
      rating_sum: 5,
      rating_count: 1,
      is_featured: false,
      cod_available: false,
      supplier_id: "sup-cj",
      supplier_product_id: selectedProduct.pid,
      supplier_sku: supplierSku,
      sync_status: "synced",
      weight: weight,
      length: length,
      width: width,
      height: height,
      shipping_class: shippingClass,
      supplier_purchase_price: costPrice,
      supplier_original_price: costPrice,
      supplier_url: `https://cjdropshipping.com/product-detail.html?id=${selectedProduct.pid}`,
      variants: activeVariants,
      colors: colors
    };

    try {
      // 1. Persist directly to Firebase database on backend
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandNewProduct)
      });

      if (res.ok) {
        // 2. Trigger client state update to sync view
        onAddProduct(brandNewProduct);
        triggerToast(isRtl ? '🎉 تم استيراد ونشر المنتج بنجاح في متجرك!' : '🎉 Product successfully imported and published to your store!');
        setIsReviewOpen(false);
      } else {
        const errorData = await res.json();
        alert(`Failed to save product on database: ${errorData.error}`);
      }
    } catch (e: any) {
      console.error('Error importing product:', e);
      alert(`Import error: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div id="cj-dropship-importer-panel" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-300">
          <Check className="w-5 h-5 bg-white/20 p-0.5 rounded-full" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Search Form */}
      <div className="p-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-amber-400 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>{isRtl ? 'البحث والاستيراد من مستودعات CJ Dropshipping' : 'Search & Import from CJ Dropshipping Warehouses'}</span>
            </h3>
            <p className="text-slate-400 text-[11px] font-medium">
              {isRtl 
                ? 'ابحث بالاسم أو الفئة في الملايين من منتجات المورد مباشرة، وراجع البيانات والصور قبل إضافتها لمتجرك.' 
                : 'Search millions of supplier products, customize metadata, pick specific images and import with precise profit calculations.'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-lg text-slate-500 font-bold font-sans">
              Total: {total} {isRtl ? 'منتج متاح' : 'products found'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={isRtl ? 'أدخل اسم المنتج بالإنجليزية للبحث (مثال: Smart Watch, Bicycle, Phone)...' : 'Enter English product name to query (e.g. Smart Watch, Carbon Bicycle)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPageNumber(1); }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              <option value={10}>10 / {isRtl ? 'صفحة' : 'page'}</option>
              <option value={20}>20 / {isRtl ? 'صفحة' : 'page'}</option>
              <option value={50}>50 / {isRtl ? 'صفحة' : 'page'}</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl text-xs shadow flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{isRtl ? 'بحث ومزامنة' : 'Query products'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sandbox Warning Banner */}
      {isSandbox && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex gap-3 text-amber-800 dark:text-amber-400">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black">
              {isRtl ? '⚠️ وضع المحاكاة نشط (Sandbox Mode Fallback)' : '⚠️ Sandbox Mode Fallback Active'}
            </h4>
            <p className="text-[11px] font-medium leading-relaxed">
              {isRtl 
                ? 'لم يتمكن النظام من الاتصال بالوضع المباشر لـ CJ Dropshipping بسبب فشل في المصادقة (يرجى مراجعة البريد الإلكتروني ومفتاح API في الإعدادات -> التكامل). يعرض النظام الآن منتجات تجريبية عالية الدقة لتمكين تجربة الاستيراد.'
                : 'The system could not authenticate with CJ Dropshipping Live environment. It is currently falling back to High-Fidelity Sandbox mode. Please check your Supplier Email & API Key under Settings -> Integrations.'}
            </p>
            {authError && (
              <p className="text-[10px] font-mono opacity-80 mt-1 select-all">
                {isRtl ? 'تفاصيل الخطأ: ' : 'Error detail: '} {authError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loading State Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-xs text-slate-400 font-bold animate-pulse">{isRtl ? 'جاري الاتصال السريع بقواعد بيانات CJ Dropshipping...' : 'Connecting to CJ Dropshipping Global Repositories...'}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/20">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-bold">{isRtl ? 'لا توجد منتجات مطابقة لعملية البحث. يرجى إدخال اسم آخر بالإنجليزية.' : 'No items matched your query. Try typing simple keywords like "bike", "watch", "holder".'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((prod) => {
              const imgUrl = prod.productImage || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80";
              const rawPrice = prod.sellPrice || prod.productSellPrice || prod.price || '0';
              let lowestPriceUsd = 0;
              if (typeof rawPrice === 'string') {
                const parts = rawPrice.split('-');
                const firstPart = parts[0].replace(/[^0-9.]/g, '').trim();
                lowestPriceUsd = parseFloat(firstPart) || 0;
              } else {
                lowestPriceUsd = Number(rawPrice) || 0;
              }
              const lowestPriceSar = Math.round(lowestPriceUsd * 3.75 * 100) / 100;
              const displayPriceStr = `${lowestPriceSar.toFixed(2)} SAR`;
              const titleToShow = isRtl ? (prod.productNameCn || prod.productNameEn) : prod.productNameEn;

              return (
                <div 
                  key={prod.pid} 
                  className="bg-white dark:bg-[#111827] border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <img 
                      src={imgUrl} 
                      alt={prod.productNameEn}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-white font-bold text-[9px] px-2 py-1 rounded-lg">
                      PID: {prod.pid}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight">
                        {titleToShow}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono font-bold">SKU: {prod.productSku || 'N/A'}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold block">{isRtl ? 'سعر التكلفة' : 'Supplier Cost'}</span>
                        <strong className="text-xs font-black text-emerald-500 font-sans">{displayPriceStr}</strong>
                      </div>
                      
                      <button
                        onClick={() => handleOpenReview(prod)}
                        className="px-3.5 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/80 font-black rounded-xl text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'مراجعة واستيراد' : 'Review & Import'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-800 rounded-2xl">
              <button
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber === 1}
                className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-500 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-xs text-slate-500 font-bold">
                {isRtl 
                  ? `الصفحة ${pageNumber} من ${totalPages}` 
                  : `Page ${pageNumber} of ${totalPages}`}
              </span>

              <button
                onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))}
                disabled={pageNumber === totalPages}
                className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-500 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review & Custom Edit Overlay Modal */}
      {isReviewOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/85 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-500 animate-pulse" />
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-amber-400">
                    {isRtl ? 'مراجعة وتعديل بيانات المنتج قبل الاستيراد النهائي' : 'Review & Tailor Product Details Before Publishing'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono font-bold">Supplier Reference: {selectedProduct.pid}</p>
                </div>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Body */}
            {loadingDetails ? (
              <div className="p-20 flex flex-col items-center justify-center space-y-4 flex-1">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-xs text-slate-400 font-bold animate-pulse">
                  {isRtl 
                    ? 'جاري سحب كافة المقاسات، الألوان، الأسعار، صور المتغيرات وأبعاد الشحن من خوادم CJ...' 
                    : 'Fetching exhaustive sizes, colors, dynamic variants, prices and logistics info from CJ...'}
                </p>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-left">
                
                {/* IMAGE SELECTION CHECKBOX LIST */}
                <div className="space-y-2">
                  <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>{isRtl ? '1. مراجعة واختيار صور المنتج (انقر لتحديد/إلغاء)' : '1. Manage Image Assets (Click to toggle)'}</span>
                  </h4>
                  <p className="text-slate-400 text-[10px] font-medium leading-relaxed">
                    {isRtl 
                      ? 'الصور المحددة بإطار أخضر وعلامة صح هي التي سيتم رفعها لمتجرك وعرضها كمعرض صور. لن يتم حفظ الصور غير المحددة.' 
                      : 'Highlighted images with checkmarks will be imported as the main and secondary media. Deselected images are ignored.'}
                  </p>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3 pt-2">
                    {allImages.map((img, i) => {
                      const isSelected = !!selectedImages[img];
                      return (
                        <div
                          key={i}
                          onClick={() => toggleImageSelection(img)}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 bg-slate-50 dark:bg-slate-900 cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-emerald-500 scale-95 shadow' 
                              : 'border-transparent opacity-60 hover:opacity-100 hover:scale-95'
                          }`}
                        >
                          <img 
                            src={img} 
                            alt="Option" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white p-0.5 rounded-full shadow">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                          <div className="absolute bottom-1 right-1 bg-slate-900/70 text-white font-bold text-[8px] px-1 rounded">
                            #{i + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SIZES SELECTION CHECKLIST */}
                {sizes.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                      <Layers className="w-4 h-4 text-purple-500" />
                      <span>{isRtl ? '2. المقاسات والخيارات المتاحة (انقر لتفعيل/تعطيل المقاس)' : '2. Dynamic Size Filters (Click to toggle sizes)'}</span>
                    </h4>
                    <p className="text-slate-400 text-[10px] font-medium leading-relaxed">
                      {isRtl
                        ? 'قم بإلغاء تفعيل المقاسات التي لا ترغب في بيعها. سيتم تصفية الخيارات وإزالتها تلقائياً قبل الحفظ.'
                        : 'Uncheck sizes you do not want to stock. Filtered variations will be excluded before saving.'}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {sizes.map(size => {
                        const isSizeSelected = !!selectedSizes[size];
                        return (
                          <button
                            type="button"
                            key={size}
                            onClick={() => setSelectedSizes(prev => ({ ...prev, [size]: !prev[size] }))}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border font-bold text-[11px] cursor-pointer transition-all ${
                              isSizeSelected
                                ? 'border-indigo-500 bg-indigo-50/65 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                                : 'border-slate-200 dark:border-slate-850 text-slate-400'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isSizeSelected ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                            <span>{size}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* DYNAMIC COLOR GALLERY */}
                {colors.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                      <Sliders className="w-4 h-4 text-emerald-500" />
                      <span>{isRtl ? '3. ألوان وخيارات المنتج وصورها المحددة (Dynamic Color Gallery)' : '3. Extracted Product Colors & Variant Media (Customizable)'}</span>
                    </h4>
                    <p className="text-slate-400 text-[10px] font-medium leading-relaxed">
                      {isRtl
                        ? 'تم جلب صور الألوان من المورد مباشرة. يمكنك مراجعة الروابط أو تغيير رابط أي صورة يدوياً إذا رغبت.'
                        : 'Color options mapped automatically. You can paste custom image URLs below to swap images.'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                      {colors.map((color, idx) => (
                        <div key={idx} className="p-3 border border-slate-150 dark:border-slate-850 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border dark:border-slate-800">
                            <img src={color.image} alt={color.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className="font-black text-[11px] text-slate-800 dark:text-slate-200 block">{color.name}</span>
                            <input
                              type="text"
                              value={color.image}
                              onChange={(e) => {
                                const updated = [...colors];
                                updated[idx].image = e.target.value;
                                setColors(updated);
                              }}
                              placeholder="Image URL"
                              className="w-full p-1 text-[9px] font-mono border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DETAILED VARIANTS LIST */}
                {variants.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                      <Layers className="w-4 h-4 text-cyan-500" />
                      <span>{isRtl ? '4. قائمة خيارات المنتج الكاملة وتوافق المخزون (Variants SKUs)' : '4. Exhaustive Multi-Option SKUs & Available Stock'}</span>
                    </h4>
                    <div className="border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-black text-[10px] uppercase">
                            <th className="p-3">{isRtl ? 'اللون / المقاس' : 'Color / Size'}</th>
                            <th className="p-3">SKU</th>
                            <th className="p-3">{isRtl ? 'التكلفة بالدولار' : 'Cost (USD)'}</th>
                            <th className="p-3">{isRtl ? 'التكلفة بالريال' : 'Cost (SAR)'}</th>
                            <th className="p-3">{isRtl ? 'المخزون المتوفر' : 'Warehouse Stock'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-[10.5px]">
                          {variants.map((v, i) => {
                            const isSizeActive = !v.size || selectedSizes[v.size] !== false;
                            return (
                              <tr key={i} className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/20 ${!isSizeActive ? 'opacity-30 line-through bg-red-50/10' : ''}`}>
                                <td className="p-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                  {v.image && (
                                    <img src={v.image} alt={v.color} className="w-6 h-6 rounded object-cover border dark:border-slate-800" referrerPolicy="no-referrer" />
                                  )}
                                  <span className="font-bold">{v.color || 'Default'} / {v.size || 'N/A'}</span>
                                </td>
                                <td className="p-3 font-mono text-slate-500">{v.sku}</td>
                                <td className="p-3 font-mono text-slate-600 dark:text-slate-400">${(v.priceUsd || 0).toFixed(2)}</td>
                                <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{(v.priceSar || (v.priceUsd * 3.75) || 0).toFixed(2)} SAR</td>
                                <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {v.stock || 0} {isRtl ? 'وحدة' : 'units'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* MULTILINGUAL TITLE FIELDS */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                    <Languages className="w-4 h-4 text-indigo-500" />
                    <span>{isRtl ? '5. مراجعة وترجمة عناوين المنتج (3 لغات مدمجة)' : '5. Localized Product Title (Arabic, English & French)'}</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* ARABIC NAME */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block flex items-center gap-1">
                        <span className="bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-black">AR</span>
                        <span>العنوان باللغة العربية (يدوي)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="اكتب اسم المنتج باللغة العربية..."
                        value={editNameAr}
                        onChange={(e) => setEditNameAr(e.target.value)}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-150"
                        dir="rtl"
                      />
                    </div>

                    {/* ENGLISH NAME */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block flex items-center gap-1">
                        <span className="bg-sky-500/15 text-sky-600 px-1.5 py-0.5 rounded text-[8px] font-black">EN</span>
                        <span>Title in English (Fetched)</span>
                      </label>
                      <input
                        type="text"
                        value={editNameEn}
                        onChange={(e) => setEditNameEn(e.target.value)}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-150"
                      />
                    </div>

                    {/* FRENCH NAME */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block flex items-center gap-1">
                        <span className="bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded text-[8px] font-black">FR</span>
                        <span>Titre en Français (Optionnel)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Titre du produit en français..."
                        value={editNameFr}
                        onChange={(e) => setEditNameFr(e.target.value)}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-150"
                      />
                    </div>
                  </div>
                </div>

                {/* MULTILINGUAL DESCRIPTION FIELDS */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <span>{isRtl ? '6. مراجعة الأوصاف التفصيلية (3 لغات مدمجة)' : '6. Localized Detailed Descriptions (Arabic, English & French)'}</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* ARABIC DESC */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block flex items-center gap-1">
                        <span className="bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-black">AR</span>
                        <span>الوصف التفصيلي بالعربية (يدوي)</span>
                      </label>
                      <textarea
                        rows={5}
                        placeholder="صيغة الوصف التفصيلي الجذاب للمشترين العرب..."
                        value={editDescAr}
                        onChange={(e) => setEditDescAr(e.target.value)}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium leading-relaxed text-[11px] text-slate-800 dark:text-slate-150"
                        dir="rtl"
                      />
                    </div>

                    {/* ENGLISH DESC */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block flex items-center gap-1">
                        <span className="bg-sky-500/15 text-sky-600 px-1.5 py-0.5 rounded text-[8px] font-black">EN</span>
                        <span>Description in English (Fetched)</span>
                      </label>
                      <textarea
                        rows={5}
                        value={editDescEn}
                        onChange={(e) => setEditDescEn(e.target.value)}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium leading-relaxed text-[11px] text-slate-800 dark:text-slate-150"
                      />
                    </div>

                    {/* FRENCH DESC */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block flex items-center gap-1">
                        <span className="bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded text-[8px] font-black">FR</span>
                        <span>Description en Français (Optionnel)</span>
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Description du produit en français..."
                        value={editDescFr}
                        onChange={(e) => setEditDescFr(e.target.value)}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium leading-relaxed text-[11px] text-slate-800 dark:text-slate-150"
                      />
                    </div>
                  </div>
                </div>

                {/* CORE PARAMETERS: PRICING, MARGINS, CATEGORIES & SHIPPINGS */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                    <Sliders className="w-4 h-4 text-teal-500" />
                    <span>{isRtl ? '7. الحسابات المالية والتصنيفات والشحن بالريال' : '7. Pricing Matrices, Category & Logistics (SAR)'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Category Selection */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">{isRtl ? 'التصنيف بالمتجر' : 'Store Category'}</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-150"
                      >
                        <option value="bikes">{isRtl ? 'الدراجات الهوائية' : 'Bicycles'}</option>
                        <option value="accessories">{isRtl ? 'الملحقات والإكسسوارات' : 'Accessories'}</option>
                        <option value="cars">{isRtl ? 'سيارات الأطفال' : 'Kids Ride-on Cars'}</option>
                        <option value="scooters">{isRtl ? 'السكوترات الكهربائية' : 'Electric Scooters'}</option>
                      </select>
                    </div>

                    {/* Supplier Cost Price */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">
                        {isRtl ? 'تكلفة المورد بالريال (SAR)' : 'Supplier Cost (SAR)'}
                      </label>
                      <div className="relative">
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[10px]">SAR</span>
                        <input
                          type="number"
                          value={costPrice}
                          disabled
                          className="w-full pl-3 pr-12 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Profit Margin Percentage */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">{isRtl ? 'هامش الربح المرغوب (%)' : 'Desired Margin (%)'}</label>
                      <div className="relative">
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        <input
                          type="number"
                          min={0}
                          value={profitMargin}
                          onChange={(e) => handleMarginChange(Number(e.target.value))}
                          className="w-full pl-3 pr-8 py-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono font-bold text-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Calculated Selling Price */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">
                        {isRtl ? 'سعر البيع المقترح بالريال (SAR)' : 'Selling Price (SAR)'}
                      </label>
                      <div className="relative">
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-black text-indigo-500 text-[10px]">SAR</span>
                        <input
                          type="number"
                          min={1}
                          value={finalPrice}
                          onChange={(e) => handleFinalPriceChange(Number(e.target.value))}
                          className="w-full pl-3 pr-12 py-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono font-bold text-indigo-600 dark:text-indigo-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {/* Supplier SKU */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">{isRtl ? 'رمز SKU عند المورد' : 'Supplier SKU Reference'}</label>
                      <input
                        type="text"
                        value={supplierSku}
                        onChange={(e) => setSupplierSku(e.target.value)}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono font-bold text-[10px] text-slate-800 dark:text-slate-150"
                      />
                    </div>

                    {/* Weight in kg */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">{isRtl ? 'وزن المنتج (كجم)' : 'Product Weight (kg)'}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-slate-150"
                      />
                    </div>

                    {/* Shipping Class */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">{isRtl ? 'فئة الشحن المتكاملة' : 'Shipping Logistics Class'}</label>
                      <select
                        value={shippingClass}
                        onChange={(e) => setShippingClass(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-150"
                      >
                        <option value="heavy_bike">{isRtl ? 'شحن دراجة ثقيل الوزن' : 'Heavyweight (Bicycles)'}</option>
                        <option value="standard">{isRtl ? 'شحن معياري عادي' : 'Standard Shipping'}</option>
                        <option value="oversized_car">{isRtl ? 'حجم مفرط (سيارات أطفال)' : 'Oversized (Ride-on Cars)'}</option>
                        <option value="digital">{isRtl ? 'توصيل رقمي فوري' : 'Digital Instant Delivery'}</option>
                      </select>
                    </div>
                  </div>

                  {/* Physical Dimensions: length, width, height */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {/* Length */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">{isRtl ? 'الطول (سم)' : 'Length (cm)'}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={length}
                        onChange={(e) => setLength(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-slate-150"
                      />
                    </div>

                    {/* Width */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">{isRtl ? 'العرض (سم)' : 'Width (cm)'}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-slate-150"
                      />
                    </div>

                    {/* Height */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 block">{isRtl ? 'الارتفاع (سم)' : 'Height (cm)'}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-800 dark:text-slate-150"
                      />
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isRtl ? 'تتم مزامنة الأسعار والمخازن تلقائياً مع المورد كل 6 ساعات' : 'Prices and stock remain synced with CJ every 6 hours'}</span>
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-xl cursor-pointer"
                >
                  {isRtl ? 'إلغاء وتراجع' : 'Discard'}
                </button>

                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={importing}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{isRtl ? 'الحفظ النهائي والاستيراد للبيع 🚀' : 'Confirm Save & Import to Catalog 🚀'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
