import React, { useState, useEffect, useRef } from 'react';
import { Gift, X, Play, Copy, Check, RotateCcw } from 'lucide-react';
import { playWheelSpinSound, playWheelWinSound } from '../utils/audio';
import { WheelSettings, WheelSegment } from '../types';

interface SpinWheelProps {
  isRtl: boolean;
  onWinPrize: (segment: WheelSegment, generatedCode: string) => void;
  settings: WheelSettings;
}

export default function SpinWheel({ isRtl, onWinPrize, settings }: SpinWheelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  
  // Checking monthly display constraint
  const [hasSpun, setHasSpun] = useState(() => {
    try {
      const lastSpin = localStorage.getItem('ryvo_last_spin_time');
      if (lastSpin) {
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        return (Date.now() - Number(lastSpin)) < thirtyDaysMs;
      }
    } catch (e) {}
    return false;
  });

  const [wonSegment, setWonSegment] = useState<WheelSegment | null>(null);
  const [wonCoupon, setWonCoupon] = useState('');
  const [copied, setCopied] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [transitionStyle, setTransitionStyle] = useState('none');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // If disabled by Admin, don't show anything at all
  if (!settings || !settings.isEnabled) {
    return null;
  }

  const segments = settings.segments || [];
  const segmentsText = segments.map(s => isRtl ? s.textAr : s.textEn);

  const colors = [
    '#38bdf8', '#0f172a', '#f59e0b', '#10b981',
    '#a855f7', '#ec4899', '#64748b', '#f43f5e'
  ];

  // Draw the wheel segments on canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current || segments.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const anglePerSeg = (2 * Math.PI) / segments.length;

    ctx.clearRect(0, 0, size, size);

    // Draw segment slices
    segmentsText.forEach((seg, idx) => {
      const startAngle = idx * anglePerSeg;
      const endAngle = startAngle + anglePerSeg;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = colors[idx % colors.length];
      ctx.fill();

      // Slices border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text inside slices
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + anglePerSeg / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText(seg, radius - 15, 0);
      ctx.restore();
    });

    // Draw center peg
    ctx.beginPath();
    ctx.arc(center, center, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Center indicator text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillText('RYVO', center, center);
  }, [isOpen, segments, isRtl]);

  const handleSpin = () => {
    if (isSpinning || hasSpun || segments.length === 0) return;

    setIsSpinning(true);

    // Filter allowed winning options configured by Admin
    const allowedIndices = segments
      .map((s, idx) => s.isAllowedWinner ? idx : -1)
      .filter(idx => idx !== -1);

    // If no allowed winners, fall back to any index
    const winningIndex = allowedIndices.length > 0 
      ? allowedIndices[Math.floor(Math.random() * allowedIndices.length)]
      : Math.floor(Math.random() * segments.length);

    // Target rotation to land on the chosen index
    const anglePerSeg = 360 / segments.length;
    // The pointer is at the top (270 deg / -90 deg in canvas terms).
    // Canvas starts drawing clockwise from the right (0 deg).
    // To align the winning index to the top pointer (270 deg), we calculate:
    const stopRotation = 270 - (winningIndex * anglePerSeg) - (anglePerSeg / 2);
    
    // Add multiple full spins (e.g. 5 full spins = 1800 deg) and align with current rotation
    const nextRotation = wheelRotation + 1800 + (stopRotation - (wheelRotation % 360));

    // Play initial sound
    playWheelSpinSound();

    // Sound effect scheduler for decelerating tick sound effects
    let delay = 100;
    const playTick = () => {
      if (delay > 850) return; // Stop ticks when almost stopped
      playWheelSpinSound();
      delay = delay * 1.3; // Decelerate tick timing
      setTimeout(playTick, delay);
    };
    setTimeout(playTick, delay);

    // Set transition and rotate
    setTransitionStyle('transform 4s cubic-bezier(0.15, 0.85, 0.2, 1)');
    setWheelRotation(nextRotation);

    // Wait for the animation duration (4s)
    setTimeout(() => {
      setIsSpinning(false);

      // Extract won prize details
      const wonSeg = segments[winningIndex];
      setWonSegment(wonSeg);

      // Handle types of prizes
      if (wonSeg.type === 'retry') {
        // If "Try Again", they can spin again and it does NOT lock them out
        playWheelWinSound();
      } else {
        // Real win: lock for 30 days
        const code = wonSeg.couponCode || `RYVO-SPIN-${wonSeg.value || 10}-${Math.floor(1000 + Math.random() * 9000)}`;
        setWonCoupon(code);
        setHasSpun(true);
        localStorage.setItem('ryvo_last_spin_time', String(Date.now()));
        onWinPrize(wonSeg, code);
        playWheelWinSound();
      }
    }, 4000);
  };

  const handleTryAgain = () => {
    // Reset state to spin again
    setWonSegment(null);
    setWonCoupon('');
    setTransitionStyle('none');
    setWheelRotation(0);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(wonCoupon);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      {/* Floating Gift Launcher Button (Only if they haven't won a real prize this month) */}
      {!hasSpun && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 left-6 z-40 p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center gap-2 group animate-bounce cursor-pointer border border-amber-400"
          title={isRtl ? 'العب واربح خصم فوري! 🎯' : 'Spin the Wheel to Win! 🎯'}
        >
          <Gift className="w-5 h-5 animate-pulse text-slate-950" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 text-xs tracking-wide whitespace-nowrap">
            {isRtl ? 'عجلة الحظ 🎯' : 'Spin & Win! 🎯'}
          </span>
        </button>
      )}

      {/* Spin Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#11141D] w-full max-w-md rounded-3xl border border-slate-150 dark:border-[#1E293B] shadow-2xl p-6 relative flex flex-col items-center animate-in zoom-in-95 duration-200">
            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 dark:text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title Block */}
            <div className="text-center space-y-1.5 mb-5 mt-2">
              <span className="text-[10px] font-black bg-amber-500/10 text-amber-605 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {isRtl ? 'قسم الألعاب والهدايا 🎁' : 'RYVO LUCKY WHEEL 🎁'}
              </span>
              <h3 className="text-lg font-black text-slate-850 dark:text-white">
                {isRtl ? 'أدر العجلة واربح كوبون خصم فوري!' : 'Spin the Wheel & Claim Your Discount!'}
              </h3>
              <p className="text-xs text-slate-450 max-w-xs mx-auto leading-relaxed">
                {isRtl 
                  ? 'لديك محاولة واحدة شهرياً لتجربة حظك اليوم وكسب جوائز ونقاط وكوبونات خصم قيمة لمتجر ريفو!' 
                  : 'You have exactly 1 attempt per month to spin the wheel and secure valuable points or checkout coupons!'}
              </p>
            </div>

            {/* Wheel Canvas Section */}
            <div className="relative w-64 h-64 flex items-center justify-center mb-6">
              {/* Top pointer pin */}
              <div className="absolute top-0 z-20 -mt-2">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-500 filter drop-shadow-md"></div>
              </div>

              {/* Rotating Canvas container */}
              <canvas
                ref={canvasRef}
                width={250}
                height={250}
                className="rounded-full shadow-inner border-4 border-slate-900 dark:border-slate-800"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: transitionStyle,
                }}
              />
            </div>

            {/* Controls */}
            {!wonSegment ? (
              <button
                onClick={handleSpin}
                disabled={isSpinning || (hasSpun && !wonSegment)}
                className={`w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  (isSpinning || hasSpun) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 shadow-md shadow-amber-500/10'
                }`}
              >
                <Play className="w-4 h-4 text-amber-500 dark:text-slate-950" />
                <span>
                  {isSpinning 
                    ? (isRtl ? 'جاري دوران العجلة...' : 'Spinning Wheel...') 
                    : (isRtl ? 'ابدأ الدوران الآن! 🎯' : 'SPIN THE WHEEL!')}
                </span>
              </button>
            ) : wonSegment.type === 'retry' ? (
              // Retry Outcome State
              <div className="w-full bg-amber-500/5 dark:bg-amber-500/10 border border-dashed border-amber-500/35 rounded-2xl p-4 text-center space-y-3 animate-in slide-in-from-bottom-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wide">
                    {isRtl ? 'حظ أوفر! 🔄' : 'HARD LUCK! 🔄'}
                  </span>
                  <h4 className="text-sm font-black text-slate-850 dark:text-slate-200">
                    {isRtl ? 'لقد حصلت على: حاول مجدداً!' : 'You got: Try Again!'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'حاول مجدداً الآن 🔄' : 'TRY AGAIN NOW 🔄'}</span>
                </button>
              </div>
            ) : (
              // Winner Ticket Block
              <div className="w-full bg-emerald-500/5 dark:bg-emerald-500/10 border border-dashed border-emerald-500/35 rounded-2xl p-4 text-center space-y-3 animate-in slide-in-from-bottom-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wide">
                    {isRtl ? 'مبروك! لقد ربحت 🎉' : 'CONGRATULATIONS! YOU WON 🎉'}
                  </span>
                  <h4 className="text-base font-black text-slate-850 dark:text-slate-200">
                    {isRtl ? wonSegment.textAr : wonSegment.textEn}
                  </h4>
                </div>

                {wonSegment.type === 'coupon' ? (
                  <>
                    {/* Coupon Code Output Box */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="flex-1 text-xs font-black font-mono tracking-wider text-slate-800 dark:text-white text-center break-all">
                        {wonCoupon}
                      </span>
                      <button
                        onClick={copyToClipboard}
                        className={`p-2 rounded-lg cursor-pointer transition-all flex items-center justify-center ${
                          copied 
                            ? 'bg-emerald-500 text-white animate-pulse' 
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350'
                        }`}
                        title={isRtl ? 'نسخ الكود' : 'Copy Code'}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    
                    <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                      {isRtl 
                        ? 'لقد تم نسخ الكود تلقائياً. قم بلصقه في خانة كود الخصم في صفحة الدفع للاستفادة من جائزتك!' 
                        : 'The promo coupon was copied to your clipboard. Paste it in the coupon field at checkout to apply your savings!'}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-emerald-500 font-bold leading-relaxed">
                    {isRtl 
                      ? 'تمت إضافة النقاط بنجاح إلى حسابك! تظهر في محفظتك ونقاط الولاء الخاصة بك.' 
                      : 'Points successfully added to your loyalty balance! Enjoy your shopping experience.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
