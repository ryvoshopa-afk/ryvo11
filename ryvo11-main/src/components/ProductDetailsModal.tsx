import React from 'react';
import { Product, Language, CartItem, Review } from '../types';
import { TRANSLATIONS } from '../constants/translations';
import { X, Star, Heart, ShieldCheck, RefreshCw, Send, Plus, Minus, User, Camera, Share2, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatPrice } from '../utils/price';

interface ProductDetailsModalProps {
  product: Product;
  currentLanguage: Language;
  onClose: () => void;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  onAddToCart: (quantity: number, color: string) => void;
  onBuyNow: (quantity: number, color: string) => void;
  reviews: Review[];
  onAddReview: (productId: string, name: string, rating: number, text: string, attachedPhoto?: string) => void;
  hasPurchased?: boolean;
}

export default function ProductDetailsModal({
  product,
  currentLanguage,
  onClose,
  isFavorite,
  onFavoriteToggle,
  onAddToCart,
  onBuyNow,
  reviews,
  onAddReview,
  hasPurchased = false
}: ProductDetailsModalProps) {
  const t = TRANSLATIONS[currentLanguage];
  const isRtl = currentLanguage === 'ar';

  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const productUrl = `${window.location.origin}/product/${product.id}`;
    if (navigator.share) {
      navigator.share({
        title: name,
        text: `${isRtl ? 'تفقد هذا المنتج الرائع:' : 'Check out this awesome product:'} ${name}`,
        url: productUrl,
      })
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.log('Error sharing:', err);
        navigator.clipboard.writeText(productUrl).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      });
    } else {
      navigator.clipboard.writeText(productUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const name = currentLanguage === 'ar' ? product.name_ar : currentLanguage === 'fr' ? product.name_fr : product.name_en;
  const description = currentLanguage === 'ar' ? product.description_ar : currentLanguage === 'fr' ? product.description_fr : product.description_en;
  const featuresStr = currentLanguage === 'ar' ? product.features_ar : currentLanguage === 'fr' ? product.features_fr : product.features_en;
  const featuresList = featuresStr ? featuresStr.split(',').map(f => f.trim()) : [];
  
  // Rating states (derived dynamically from global reviews list)
  const productReviews = reviews.filter(r => r.product_id === product.id);
  const ratingAvg = productReviews.length > 0 
    ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1) 
    : '5.0';

  // Selected Premium Color state
  const [selectedColor, setSelectedColor] = useState<string>('black');

  // Quantity selection counter
  const [qty, setQty] = useState(1);

  // Gallery current media item containing both images and video, dynamically prioritizing selected color image
  const colorImage = product.color_images?.[selectedColor as 'black' | 'white' | 'red'];
  const mediaList: { type: 'image' | 'video'; url: string }[] = [];
  
  if (colorImage) {
    mediaList.push({ type: 'image', url: colorImage });
  } else {
    mediaList.push({ type: 'image', url: product.image });
  }

  if (product.additional_images && product.additional_images.length > 0) {
    product.additional_images.forEach(img => {
      if (img) mediaList.push({ type: 'image', url: img });
    });
  }
  if (product.video_url) {
    mediaList.push({ type: 'video', url: product.video_url });
  }

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const handleNextMedia = () => {
    setActiveMediaIndex(prev => (prev + 1) % mediaList.length);
  };

  const handlePrevMedia = () => {
    setActiveMediaIndex(prev => (prev - 1 + mediaList.length) % mediaList.length);
  };

  // Review form states
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewPhoto, setReviewPhoto] = useState('');
  const [reviewSent, setReviewSent] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  // Reset states on product change
  useEffect(() => {
    setActiveMediaIndex(0);
    setQty(1);
    setReviewSent(false);
    setReviewName('');
    setReviewText('');
    setReviewPhoto('');
    setShowAllReviews(false);
    setSelectedColor('black');
    setZoomImg(null);
  }, [product]);

  // Reset active media when color changes to display color image
  useEffect(() => {
    setActiveMediaIndex(0);
  }, [selectedColor]);

  const handleQtyIncrease = () => {
    if (qty < product.stock) setQty(prev => prev + 1);
  };

  const handleQtyDecrease = () => {
    if (qty > 1) setQty(prev => prev - 1);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewText.trim()) return;

    onAddReview(product.id, reviewName, reviewRating, reviewText, reviewPhoto);
    setReviewSent(true);
    setReviewName('');
    setReviewText('');
    setReviewPhoto('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        id="modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
      ></div>

      {/* Modal Container */}
      <div
        id="product-details-dialog"
        className="relative bg-white dark:bg-[#11141D] rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col md:flex-row border border-slate-150 dark:border-[#1E293B] animate-in fade-in zoom-in-95 duration-200 text-slate-800 dark:text-gray-100 max-h-[96vh] md:max-h-[85vh] overflow-y-auto md:overflow-hidden"
      >
        {/* Close Button */}
        <button
          id="btn-details-modal-close"
          onClick={onClose}
          className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} z-10 p-3 rounded-full bg-slate-100/80 hover:bg-slate-900 hover:text-white dark:bg-slate-900/80 dark:hover:bg-[var(--primary-color, #38bdf8)] dark:hover:text-[#0A0C10] backdrop-blur-md transition-all cursor-pointer`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Images Gallery */}
        <div className="flex-1 p-4 sm:p-6 md:p-3 bg-slate-50 dark:bg-[#0A0C10] flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#1E293B]">
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Big Main Image or Video with Flip Arrows */}
            <div className="relative aspect-square w-full max-w-full sm:max-w-sm rounded-2xl overflow-hidden bg-white dark:bg-[#11141D] border border-slate-150 dark:border-[#1E293B] p-2 mb-6 group flex items-center justify-center">
              
              {/* Media viewer */}
              {mediaList[activeMediaIndex]?.type === 'video' ? (
                <div className="w-full h-full relative flex items-center justify-center bg-black rounded-xl overflow-hidden">
                  <video
                    src={mediaList[activeMediaIndex].url}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute top-2 right-2 bg-red-650 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full z-10 animate-pulse flex items-center gap-1 bg-rose-600">
                    <span>LIVE</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  </span>
                </div>
              ) : (
                <img
                  src={mediaList[activeMediaIndex]?.url || 'https://images.unsplash.com/photo-1485965120184-e220f721d03e'}
                  alt={name}
                  width={600}
                  height={600}
                  referrerPolicy="no-referrer"
                  onClick={() => setZoomImg(mediaList[activeMediaIndex]?.url || null)}
                  className="object-contain w-full h-full mix-blend-normal transform scale-95 hover:scale-105 transition-all duration-300 cursor-zoom-in"
                  title={isRtl ? 'اضغط لتكبير الصورة 🔍' : 'Click to zoom image 🔍'}
                />
              )}

              {/* Arrow navigation overlay to flip images/videos ("اقلب صوره") */}
              {mediaList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevMedia}
                    className={`absolute ${isRtl ? 'right-2' : 'left-2'} top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white p-2 rounded-full cursor-pointer transition-all border border-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center z-10 hover:scale-105 active:scale-95`}
                    title={isRtl ? 'السابق' : 'Previous'}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={isRtl ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextMedia}
                    className={`absolute ${isRtl ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white p-2 rounded-full cursor-pointer transition-all border border-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center z-10 hover:scale-105 active:scale-95`}
                    title={isRtl ? 'التالي' : 'Next'}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={isRtl ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                    </svg>
                  </button>
                </>
              )}

              {/* Indicator dots for gallery flipping */}
              {mediaList.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full z-10 border border-white/5">
                  {mediaList.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === activeMediaIndex ? 'bg-[var(--primary-color, #38bdf8)] w-3' : 'bg-white/50 hover:bg-white'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Gallery Selector thumbs */}
            {mediaList.length > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-full">
                {mediaList.map((media, idx) => (
                  <button
                    key={idx}
                    id={`btn-details-media-${idx}`}
                    onClick={() => setActiveMediaIndex(idx)}
                    className={`w-12 h-12 rounded-xl overflow-hidden p-1 bg-white dark:bg-slate-900 border-2 transition-all relative ${
                      idx === activeMediaIndex ? 'border-[var(--primary-color, #38bdf8)] scale-105' : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    {media.type === 'video' ? (
                      <div className="w-full h-full rounded-lg bg-slate-950 flex flex-col items-center justify-center relative">
                        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[6px] text-white font-black uppercase absolute bottom-0.5 bg-black/70 px-1 py-0.2 rounded-sm tracking-tighter">VIDEO</span>
                      </div>
                    ) : (
                      <img src={media.url} alt="thumbnail" className="object-cover w-full h-full rounded-lg" referrerPolicy="no-referrer" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Secure Trust features badges */}
          <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] text-center font-bold text-slate-500 dark:text-slate-400">
            <div className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-[#11141D] border dark:border-[#1E293B] rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-500 animate-pulse" />
              <span>{t.features_certified.split('•')[1]?.trim() || 'إرجاع سهل'}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-[#11141D] border dark:border-[#1E293B] rounded-xl">
              <RefreshCw className="w-5 h-5 text-[var(--primary-color, #38bdf8)]" />
              <span>{t.features_certified.split('•')[0]?.trim() || 'دعم متواصل'}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-[#11141D] border dark:border-[#1E293B] rounded-xl">
              <Star className="w-5 h-5 text-rose-500 fill-rose-500" />
              <span>{t.features_certified.split('•')[2]?.trim() || 'شحن سريع'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Information Panel */}
        <div className={`flex-1 p-4 sm:p-6 md:p-8 flex flex-col justify-between md:max-h-[85vh] md:overflow-y-auto ${isRtl ? 'text-right' : 'text-left'}`}>
          <div className="space-y-6">
            
            {/* Header: Title & Heart Favorite */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-widest font-black text-[var(--primary-color, #38bdf8)]">
                  {t[product.category] || product.category}
                </span>
                <h2 className="text-xl sm:text-2xl font-black leading-snug text-slate-900 dark:text-white">
                  {name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Share Button */}
                <button
                  id="btn-details-share"
                  onClick={handleShare}
                  className={`p-3 rounded-full shadow-md border hover:scale-105 active:scale-95 transition-all flex items-center justify-center ${
                    copied 
                      ? 'bg-emerald-500 border-emerald-500 text-white animate-bounce' 
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-slate-300 hover:text-[var(--primary-color, #38bdf8)]'
                  }`}
                  title={isRtl ? 'مشاركة ونسخ الرابط 🔗' : 'Share & Copy Product Link 🔗'}
                >
                  {copied ? <Check className="w-5 h-5 font-bold" /> : <Share2 className="w-5 h-5" />}
                </button>

                {/* Favorite Button */}
                <button
                  id="btn-details-fav-toggle"
                  onClick={onFavoriteToggle}
                  className={`p-3 rounded-full shadow-md border hover:scale-105 active:scale-95 transition-all ${
                    isFavorite 
                      ? 'bg-rose-500 border-rose-500 text-white' 
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-[#1E293B] text-rose-500'
                  }`}
                >
                  <Heart className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            {/* Price section */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-xs uppercase font-extrabold text-slate-400">{t.price}:</span>
                <span className="text-2xl sm:text-3xl font-black text-[var(--primary-color, #38bdf8)] dark:text-[var(--primary-color, #38bdf8)]">
                  {formatPrice(product.price, currentLanguage)}
                </span>
              </div>
              
              {/* Estimated Delivery / Download Timeline Banner */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold w-full">
                {product.is_digital ? (
                  <span className="text-emerald-500 flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>{isRtl ? 'تسليم رقمي فوري ومباشر بعد إتمام الدفع !' : 'Instant digital files & download links instantly!'}</span>
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1.5">
                    <span>🚚</span>
                    <span>{isRtl ? 'توصيل سريع متوقع: خلال ٢ - ٤ أيام عمل مع شحن آمن' : 'Estimated rapid delivery: 2-4 business days with secure shipping'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs uppercase font-black tracking-wider text-slate-400">{t.description}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-850 leading-relaxed font-sans">
                {description}
              </p>
            </div>

            {/* Key Features Bullet points */}
            {featuresList.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-black tracking-wider text-slate-400">{t.features}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-600 dark:text-gray-800">
                  {featuresList.map((feat, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary-color, #38bdf8)] flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Premium Colors Selector */}
            <div className="space-y-2.5">
              <h4 className="text-xs uppercase font-black tracking-wider text-slate-400">{t.colors_label || 'الألوان المتاحة'}</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: t.black || 'أسود', code: '#000000', label: 'black' },
                  { name: t.white || 'أبيض', code: '#FFFFFF', label: 'white' },
                  { name: t.red || 'أحمر', code: '#EF4444', label: 'red' },
                ].map((col) => (
                  <button
                    key={col.label}
                    type="button"
                    onClick={() => setSelectedColor(col.label)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all text-xs font-black cursor-pointer ${
                      selectedColor === col.label
                        ? 'border-[var(--primary-color, #38bdf8)] bg-[var(--primary-color, #38bdf8)]/10 text-[var(--primary-color, #38bdf8)] dark:text-[var(--primary-color, #38bdf8)]'
                        : 'border-slate-200 dark:border-[#1E293B] hover:border-[var(--primary-color, #38bdf8)]/40 text-slate-500 dark:text-gray-400'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-200 dark:border-slate-700 flex-shrink-0"
                      style={{ backgroundColor: col.code }}
                    />
                    <span>{col.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selector & Inventory state */}
            {product.stock > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs uppercase font-black tracking-wider text-slate-400">{t.stock}</h4>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#1E293B] rounded-xl p-1 text-sm font-bold">
                    <button
                      id="btn-details-qty-decrease"
                      onClick={handleQtyDecrease}
                      disabled={qty <= 1}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-5 font-black text-slate-900 dark:text-gray-100">{qty}</span>
                    <button
                      id="btn-details-qty-increase"
                      onClick={handleQtyIncrease}
                      disabled={qty >= product.stock}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    ({product.stock} {t.stock_count})
                  </span>
                </div>
              </div>
            )}

            {/* Buying Action buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                id="btn-details-add-to-cart"
                onClick={() => onAddToCart(qty, selectedColor)}
                disabled={product.stock === 0}
                className={`flex-1 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border shadow-md transition-all flex items-center justify-center gap-2 ${
                  product.stock > 0
                    ? 'bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/25 text-[var(--primary-color)] hover:bg-[var(--primary-color)] hover:text-slate-950 active:scale-95'
                    : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400 dark:text-slate-650 cursor-not-allowed'
                }`}
              >
                {product.stock > 0 ? t.addToCart : t.out_of_stock}
              </button>
              
              <button
                id="btn-details-buy-now"
                onClick={() => onBuyNow(qty, selectedColor)}
                disabled={product.stock === 0}
                className={`flex-1 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg hover:scale-102 transition-all flex items-center justify-center gap-2 ${
                  product.stock > 0
                    ? 'bg-[var(--primary-color)] hover:opacity-90 text-slate-950 hover:shadow-[0_0_15px_rgba(var(--primary-color-rgb,56,189,248),0.35)] active:scale-95'
                    : 'bg-slate-100 dark:bg-[#11141D] text-slate-400 dark:text-slate-650 cursor-not-allowed'
                }`}
              >
                {product.stock > 0 ? t.buyNow : t.out_of_stock}
              </button>
            </div>

            {/* Reviews list & interactive review writer */}
            <div className="border-t border-slate-150 dark:border-[#1E293B] pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-gray-100">
                  {t.reviews} ({productReviews.length})
                </h3>
                <div className="flex items-center gap-1 text-xs font-bold text-[var(--primary-color, #38bdf8)] bg-[var(--primary-color, #38bdf8)]/10 px-2.5 py-1 rounded-lg">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{ratingAvg} / 5.0</span>
                </div>
              </div>

              {/* Render existing reviews */}
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {productReviews.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 font-bold">{t.no_reviews}</p>
                ) : (
                  <>
                    {(() => {
                      const sortedReviews = [...productReviews].sort((a, b) => b.rating - a.rating);
                      const reviewsToRender = showAllReviews ? sortedReviews : sortedReviews.slice(0, 4);
                      return (
                        <div className="space-y-3">
                          {reviewsToRender.map((rev) => {
                            const isTopRating = rev.rating >= 4;
                            return (
                              <div key={rev.id} className={`rounded-xl p-4 space-y-1.5 border transition-all ${
                                isTopRating 
                                  ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.03] border-amber-500/25 dark:border-amber-500/20 shadow-[0_2px_8px_rgba(245,158,11,0.05)]' 
                                  : 'bg-slate-50 dark:bg-[#0A0C10] border-slate-150 dark:border-[#1E293B]'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400">
                                      <User className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex flex-col text-left">
                                      <span className="text-xs font-bold text-slate-850 dark:text-gray-250 flex items-center gap-1.5 flex-wrap">
                                        {rev.name}
                                        {isTopRating && (
                                          <span className="text-[9px] font-black bg-amber-500/10 text-amber-605 dark:text-amber-400 px-1.5 py-0.5 rounded-md">
                                            {isRtl ? 'أفضل تقييم 🏆' : 'Top Rated 🏆'}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-semibold text-slate-400">{rev.date}</span>
                                    <div className="flex text-amber-400 gap-0.5">
                                      {Array.from({ length: rev.rating }).map((_, i) => (
                                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                                  {rev.text}
                                </p>
                                {rev.attached_photo && (
                                  <div className="mt-2">
                                    <img 
                                      src={rev.attached_photo} 
                                      alt="Attached User Review"
                                      onClick={() => setZoomImg(rev.attached_photo || '')}
                                      className="max-h-24 rounded-lg object-contain bg-[#11141D] p-1 border border-slate-200 dark:border-slate-850 cursor-zoom-in hover:opacity-90 hover:scale-[1.03] transition-all" 
                                      referrerPolicy="no-referrer" 
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {sortedReviews.length > 4 && (
                            <div className="flex justify-center pt-1">
                              <button
                                type="button"
                                onClick={() => setShowAllReviews(!showAllReviews)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                              >
                                <span>{showAllReviews ? '⬆️' : '⬇️'}</span>
                                <span>
                                  {showAllReviews 
                                    ? (isRtl ? 'عرض أقل' : 'Show Less') 
                                    : (isRtl ? `عرض الكل (${sortedReviews.length})` : `Show All (${sortedReviews.length})`)}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* New review input form */}
              <div className="bg-slate-50 dark:bg-[#0A0C10] rounded-2xl p-4 border border-slate-150 dark:border-[#1E293B]">
                {reviewSent ? (
                  <p className="text-xs font-bold text-emerald-500 py-1 flex items-center gap-1.5 justify-center">
                    <span>{t.review_success}</span>
                  </p>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-3">
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-800">{t.write_a_review}</h4>
                    
                    {/* Star Rating Select slider */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{t.rating_label}:</span>
                      <div className="flex gap-1 text-gray-800">
                        {[1, 2, 3, 4, 5].map((starValue) => (
                          <button
                            key={starValue}
                            id={`btn-form-rating-${starValue}`}
                            type="button"
                            onClick={() => setReviewRating(starValue)}
                            className={`hover:scale-110 active:scale-95 transition-transform ${
                              starValue <= reviewRating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-750'
                            }`}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Review Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        id="review-field-name"
                        type="text"
                        required
                        placeholder={currentLanguage === 'ar' ? 'الاسم الكريم' : 'Your name'}
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        className={`text-base md:text-xs px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 border-slate-150 dark:border-[#1E293B] focus:border-[var(--primary-color, #38bdf8)] text-slate-800 dark:text-white outline-none ${
                          isRtl ? 'text-right' : 'text-left'
                        }`}
                      />
                      <input
                        id="review-field-text"
                        type="text"
                        required
                        placeholder={t.review_placeholder}
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className={`text-base md:text-xs px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 border-slate-150 dark:border-[#1E293B] focus:border-[var(--primary-color, #38bdf8)] text-slate-800 dark:text-white outline-none ${
                          isRtl ? 'text-right' : 'text-left'
                        }`}
                      />
                    </div>

                    {/* Optional photo upload for extra points! */}
                    <div className="space-y-1 text-left">
                      <label className="block text-[9px] uppercase font-bold text-slate-400 font-sans leading-relaxed">
                        {isRtl ? (
                          hasPurchased ? (
                            <span className="text-emerald-500 font-bold block">
                              📸 أرفق صورة المنتج لكسب +15 نقطة بدلاً من 10! (رفع الصورة اختياري ✓)
                            </span>
                          ) : (
                            <span className="text-amber-500 font-bold block">
                              📸 أرفق صورة المنتج (اختياري - تنبيه: ستحصل على النقاط فقط إذا كنت قد اشتريت هذا المنتج سابقاً)
                            </span>
                          )
                        ) : (
                          hasPurchased ? (
                            <span className="text-emerald-500 font-bold block">
                              📸 Attach product photo for +15 PTS instead of 10! (Photo upload is optional ✓)
                            </span>
                          ) : (
                            <span className="text-amber-500 font-bold block">
                              📸 Attach photo (Optional - Note: Points are only awarded to verified purchasers of this product)
                            </span>
                          )
                        )}
                      </label>
                      <div className="flex gap-2 items-center">
                        <label className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-[#1E293B] rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[10px] font-bold text-slate-500 dark:text-slate-450 font-sans">
                          <Camera className="w-3.5 h-3.5 text-amber-500" />
                          <span>{reviewPhoto ? (isRtl ? '✅ تم إرفاق الصورة الفاخرة' : '✅ Photo Attached') : (isRtl ? 'اختر صورة من جهازك' : 'Choose local image')}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setReviewPhoto(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {reviewPhoto && (
                          <div className="relative">
                            <img src={reviewPhoto} className="w-8 h-8 object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={() => setReviewPhoto('')}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-black"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      id="btn-review-submit"
                      type="submit"
                      className="w-full py-2 bg-[var(--primary-color)] hover:opacity-90 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:shadow-[0_0_15px_rgba(var(--primary-color-rgb,56,189,248),0.15)]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t.submit_review}</span>
                    </button>
                  </form>
                )}
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Full Screen Image Zoom Lightbox */}
      {zoomImg && (
        <div 
          onClick={() => setZoomImg(null)}
          className="fixed inset-0 z-55 bg-black/95 flex flex-col items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <button 
            type="button"
            onClick={() => setZoomImg(null)}
            className="absolute top-6 right-6 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full cursor-pointer transition-all border border-white/10 flex items-center justify-center"
            title={isRtl ? 'إغلاق' : 'Close'}
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-4xl max-h-[85vh] overflow-hidden flex items-center justify-center">
            <img 
              src={zoomImg} 
              alt="Zoomed Product View" 
              className="object-contain max-w-full max-h-full rounded-2xl select-none"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
          
          <div className="absolute bottom-6 text-white/60 text-xs font-bold font-sans">
            {isRtl ? 'اضغط في أي مكان للإغلاق ✕' : 'Click anywhere to close ✕'}
          </div>
        </div>
      )}
    </div>
  );
}
