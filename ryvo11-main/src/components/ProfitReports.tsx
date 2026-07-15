import React, { useState, useEffect } from 'react';
import { Product, Order, PriceAuditLog } from '../types';
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Download, 
  FileText, 
  History, 
  RefreshCw, 
  ShieldCheck, 
  ChevronRight, 
  Award,
  AlertCircle,
  PiggyBank,
  Percent,
  Calculator,
  Coins,
  ShieldAlert,
  Target,
  Scale,
  LayoutGrid,
  FileSpreadsheet,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Settings,
  HelpCircle
} from 'lucide-react';

interface ProfitReportsProps {
  products: Product[];
  orders: Order[];
  isRtl: boolean;
  currentLanguage: 'ar' | 'en' | 'fr';
  triggerToast: (msg: string) => void;
}

interface OpexExpense {
  id: string;
  title: string;
  category: 'subscription' | 'marketing' | 'salaries' | 'rent' | 'other';
  amount: number;
  date: string;
}

interface FinancialGoal {
  monthlyTargetProfit: number;
  monthlyTargetRevenue: number;
  yearTargetProfit: number;
}

export default function ProfitReports({
  products,
  orders,
  isRtl,
  currentLanguage,
  triggerToast
}: ProfitReportsProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'opex' | 'stock' | 'pricing' | 'goals' | 'audit'>('analytics');
  const [period, setPeriod] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [auditLogs, setAuditLogs] = useState<PriceAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogs, setShowLogs] = useState(true);

  // Smart Margin Threshold State (Early Warning System)
  const [marginThreshold, setMarginThreshold] = useState<number>(15);

  // OPEX State
  const [opexList, setOpexList] = useState<OpexExpense[]>(() => {
    const saved = localStorage.getItem('ryvo_opex_expenses');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'سلة بريميوم / Salla Premium Subscription', category: 'subscription', amount: 299, date: new Date().toISOString().slice(0, 10) },
      { id: '2', title: 'حملة سناب شات / Snapchat Ads Campaign', category: 'marketing', amount: 1500, date: new Date().toISOString().slice(0, 10) },
      { id: '3', title: 'حملة تيك توك / TikTok Ads Campaign', category: 'marketing', amount: 1000, date: new Date().toISOString().slice(0, 10) }
    ];
  });

  const [newOpexTitle, setNewOpexTitle] = useState('');
  const [newOpexCategory, setNewOpexCategory] = useState<'subscription' | 'marketing' | 'salaries' | 'rent' | 'other'>('marketing');
  const [newOpexAmount, setNewOpexAmount] = useState<number>(0);

  // Financial Goals State
  const [goals, setGoals] = useState<FinancialGoal>(() => {
    const saved = localStorage.getItem('ryvo_financial_goals');
    return saved ? JSON.parse(saved) : {
      monthlyTargetProfit: 15000,
      monthlyTargetRevenue: 40000,
      yearTargetProfit: 180000
    };
  });

  const [editMonthlyProfit, setEditMonthlyProfit] = useState(goals.monthlyTargetProfit);
  const [editMonthlyRevenue, setEditMonthlyRevenue] = useState(goals.monthlyTargetRevenue);

  // Smart Pricing Tools Simulator States
  const [vatCostPrice, setVatCostPrice] = useState<number>(100);
  const [vatRate, setVatRate] = useState<number>(15); // Saudi Standard 15%
  const [vatRetailPrice, setVatRetailPrice] = useState<number>(250);

  const [currencyAmount, setCurrencyAmount] = useState<number>(50);
  const [currencySource, setCurrencySource] = useState<'USD' | 'CNY'>('USD');
  const [usdRate, setUsdRate] = useState<number>(3.75); // 1 USD = 3.75 SAR
  const [cnyRate, setCnyRate] = useState<number>(0.52); // 1 CNY = 0.52 SAR

  const [gatewayProductPrice, setGatewayProductPrice] = useState<number>(199);
  const [selectedGateway, setSelectedGateway] = useState<'mada' | 'visa' | 'tabby' | 'cod'>('mada');

  // Save OPEX to localStorage
  useEffect(() => {
    localStorage.setItem('ryvo_opex_expenses', JSON.stringify(opexList));
  }, [opexList]);

  // Save Goals to localStorage
  useEffect(() => {
    localStorage.setItem('ryvo_financial_goals', JSON.stringify(goals));
  }, [goals]);

  // Fetch the price change audit logs from the backend
  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/price-audit-logs');
      if (res.ok) {
        const data = await res.json();
        const sorted = data.sort((a: PriceAuditLog, b: PriceAuditLog) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setAuditLogs(sorted);
      }
    } catch (e) {
      console.error("Failed to load price audit logs", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Filter orders by date period (exclude cancelled orders)
  const filteredOrders = orders.filter(ord => {
    if (ord.status === 'cancelled') return false;
    if (period === 'all') return true;
    
    const orderTime = new Date(ord.date).getTime();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (period === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return orderTime >= todayStart.getTime();
    }
    if (period === 'week') {
      return now - orderTime <= 7 * oneDay;
    }
    if (period === 'month') {
      return now - orderTime <= 30 * oneDay;
    }
    if (period === 'year') {
      return now - orderTime <= 365 * oneDay;
    }
    return true;
  });

  // Calculate Gateway Fees for past orders dynamically
  const calculateGatewayFeeForValue = (amount: number, method: string) => {
    const norm = method.toLowerCase();
    if (norm.includes('mada')) {
      return amount * 0.0175 + 1.0;
    } else if (norm.includes('tabby') || norm.includes('تمارا') || norm.includes('tamara')) {
      return amount * 0.055 + 1.0;
    } else if (norm.includes('cod') || norm.includes('عند الاستلام') || norm.includes('cash')) {
      return 10.0; // Fixed COD shipping/collection surcharge
    } else {
      // Default to standard Visa/Mastercard (2.2% + 1 SAR)
      return amount * 0.022 + 1.0;
    }
  };

  // Calculate COGS and Profit details for filtered orders
  let totalSales = 0;
  let totalCost = 0;
  let totalGatewayFeesCollected = 0;

  // Track product performance totals
  const productPerformance: Record<string, { 
    id: string;
    name: string; 
    sales: number; 
    quantity: number; 
    cost: number; 
    profit: number; 
    image: string;
    marginPct: number;
  }> = {};

  filteredOrders.forEach(ord => {
    totalSales += ord.total;
    const orderGateFee = calculateGatewayFeeForValue(ord.total, ord.payment_method || 'visa');
    totalGatewayFeesCollected += orderGateFee;
    
    ord.items.forEach(item => {
      // Find matching product catalog entry to fetch exact costs
      const p = products.find(prod => prod.id === item.product_id || prod.name_en === item.name || prod.name_ar === item.name);
      
      const singleCost = p ? (
        p.calculated_cost !== undefined 
          ? p.calculated_cost 
          : ((p.supplier_purchase_price || 0) + (p.supplier_shipping_cost || 0) + (p.gateway_fee || 0) + (p.packaging_cost || 0) + (p.marketing_cost || 0) + (p.additional_expenses || 0))
      ) : (item.price * 0.5); // Fallback to 50%

      const itemCostSum = singleCost * item.quantity;
      const itemSalesSum = item.price * item.quantity;
      const itemProfit = itemSalesSum - itemCostSum;
      
      totalCost += itemCostSum;

      // Track product performance rankings
      const pId = p?.id || item.product_id || 'unknown';
      if (!productPerformance[pId]) {
        const nameText = p ? (currentLanguage === 'ar' ? p.name_ar : currentLanguage === 'fr' ? p.name_fr : p.name_en) : item.name;
        productPerformance[pId] = {
          id: pId,
          name: nameText,
          sales: 0,
          quantity: 0,
          cost: 0,
          profit: 0,
          image: p?.image || '/placeholder-product.png',
          marginPct: 0
        };
      }
      
      productPerformance[pId].sales += itemSalesSum;
      productPerformance[pId].quantity += item.quantity;
      productPerformance[pId].cost += itemCostSum;
      productPerformance[pId].profit += itemProfit;
    });
  });

  // Gross profit, Net Profit before and after OPEX
  const totalVATonRevenues = totalSales * 0.15; // 15% Zatca/Salla standard included tax estimation
  const totalGrossProfit = totalSales - totalCost;
  const totalNetProfit = totalGrossProfit - totalGatewayFeesCollected; // Adjusted for Payment Gateway Cost!

  // Sum OPEX
  const totalOpexExpenses = opexList.reduce((sum, item) => sum + item.amount, 0);
  const netProfitAfterOpex = totalNetProfit - totalOpexExpenses;

  const avgProfitMargin = totalCost > 0 ? (totalNetProfit / totalCost) * 100 : 0;

  // Transform performance tracker into array
  const perfArray = Object.values(productPerformance).map(p => {
    return {
      ...p,
      marginPct: p.cost > 0 ? (p.profit / p.cost) * 100 : 0
    };
  });

  // Rankings
  const mostProfitable = [...perfArray]
    .filter(p => p.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  // Low margin warning based on the interactive user-set threshold (dynamic threshold!)
  const leastProfitable = [...perfArray]
    .filter(p => p.marginPct < marginThreshold && p.profit >= 0)
    .sort((a, b) => a.marginPct - b.marginPct);

  // Loss making catalog or active orders
  const lossMakingOrders = [...perfArray]
    .filter(p => p.profit < 0)
    .sort((a, b) => a.profit - b.profit);

  const lossMakingCatalog = products.map(p => {
    const cost = p.calculated_cost !== undefined ? p.calculated_cost : ((p.supplier_purchase_price || 0) + (p.supplier_shipping_cost || 0) + (p.gateway_fee || 0) + (p.packaging_cost || 0) + (p.marketing_cost || 0) + (p.additional_expenses || 0));
    const profit = p.price - cost;
    const name = currentLanguage === 'ar' ? p.name_ar : currentLanguage === 'fr' ? p.name_fr : p.name_en;
    return {
      id: p.id,
      name,
      price: p.price,
      cost,
      profit,
      marginPct: cost > 0 ? (profit / cost) * 100 : 0,
      image: p.image
    };
  }).filter(p => p.profit < 0);

  // Time Series Chart aggregations
  const chartDataMap: Record<string, { label: string; sales: number; profit: number }> = {};
  const oneDayMs = 24 * 60 * 60 * 1000;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * oneDayMs);
    const dateStr = d.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    chartDataMap[d.toDateString()] = { label: dateStr, sales: 0, profit: 0 };
  }

  filteredOrders.forEach(ord => {
    const ordDate = new Date(ord.date);
    const key = ordDate.toDateString();
    
    let ordCost = 0;
    ord.items.forEach(item => {
      const p = products.find(prod => prod.id === item.product_id || prod.name_en === item.name || prod.name_ar === item.name);
      const singleCost = p ? (
        p.calculated_cost !== undefined ? p.calculated_cost : ((p.supplier_purchase_price || 0) + (p.supplier_shipping_cost || 0) + (p.gateway_fee || 0) + (p.packaging_cost || 0) + (p.marketing_cost || 0) + (p.additional_expenses || 0))
      ) : (item.price * 0.5);
      ordCost += singleCost * item.quantity;
    });

    const ordGateFee = calculateGatewayFeeForValue(ord.total, ord.payment_method || 'visa');
    const ordProfit = ord.total - ordCost - ordGateFee;

    if (chartDataMap[key]) {
      chartDataMap[key].sales += ord.total;
      chartDataMap[key].profit += ordProfit;
    } else {
      const dateStr = ordDate.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
      chartDataMap[key] = { label: dateStr, sales: ord.total, profit: ordProfit };
    }
  });

  const chartData = Object.values(chartDataMap).slice(-10);

  // OPEX Actions
  const handleAddOpex = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpexTitle || newOpexAmount <= 0) return;

    const newExpense: OpexExpense = {
      id: Math.random().toString(),
      title: newOpexTitle,
      category: newOpexCategory,
      amount: newOpexAmount,
      date: new Date().toISOString().slice(0, 10)
    };

    setOpexList([newExpense, ...opexList]);
    setNewOpexTitle('');
    setNewOpexAmount(0);
    triggerToast(isRtl ? '💸 تم تسجيل المصروف التشغيلي بنجاح!' : '💸 Expense registered successfully!');
  };

  const handleDeleteOpex = (id: string) => {
    setOpexList(opexList.filter(item => item.id !== id));
    triggerToast(isRtl ? '🗑️ تم حذف المصروف التشغيلي.' : '🗑️ Expense deleted successfully.');
  };

  // Stock Audit calculations
  const totalStockItems = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalCapitalTiedUp = products.reduce((sum, p) => {
    const cost = p.calculated_cost !== undefined ? p.calculated_cost : ((p.supplier_purchase_price || 0) + (p.supplier_shipping_cost || 0) + (p.gateway_fee || 0) + (p.packaging_cost || 0) + (p.marketing_cost || 0) + (p.additional_expenses || 0));
    return sum + (cost * (p.stock || 0));
  }, 0);
  const totalRetailAssetValue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);
  const expectedProfitSaturated = totalRetailAssetValue - totalCapitalTiedUp;

  // Smart Pricing Calculators
  const vatCalculatedOnCost = vatCostPrice * (vatRate / 100);
  const totalCostWithVat = vatCostPrice + vatCalculatedOnCost;
  const vatCalculatedOnRetail = vatRetailPrice * (vatRate / 100);
  const retailPriceBeforeVat = vatRetailPrice / (1 + vatRate / 100);

  // Gateway fee math
  let simulatedGateFee = 0;
  let gateLabel = "";
  if (selectedGateway === 'mada') {
    simulatedGateFee = gatewayProductPrice * 0.0175 + 1.0;
    gateLabel = "1.75% + 1.00 SAR";
  } else if (selectedGateway === 'visa') {
    simulatedGateFee = gatewayProductPrice * 0.022 + 1.0;
    gateLabel = "2.2% + 1.00 SAR";
  } else if (selectedGateway === 'tabby') {
    simulatedGateFee = gatewayProductPrice * 0.055 + 1.0;
    gateLabel = "5.5% + 1.00 SAR";
  } else {
    simulatedGateFee = 10.0;
    gateLabel = "10.00 SAR Cash On Delivery flat fee";
  }
  const pricingGateNetPrice = gatewayProductPrice - simulatedGateFee;

  // Currency Converter Math
  const activeRate = currencySource === 'USD' ? usdRate : cnyRate;
  const convertedSar = currencyAmount * activeRate;

  // Goals Math
  const monthlyProfitProgressPct = Math.min(100, (totalNetProfit / goals.monthlyTargetProfit) * 100);
  const monthlyRevenueProgressPct = Math.min(100, (totalSales / goals.monthlyTargetRevenue) * 100);

  const handleUpdateGoals = (e: React.FormEvent) => {
    e.preventDefault();
    setGoals({
      ...goals,
      monthlyTargetProfit: editMonthlyProfit,
      monthlyTargetRevenue: editMonthlyRevenue
    });
    triggerToast(isRtl ? '🎯 تم حفظ الأهداف المالية الجديدة بنجاح!' : '🎯 Financial targets updated successfully!');
  };

  const exportToExcel = () => {
    const headers = [
      isRtl ? 'المعرف' : 'ID',
      isRtl ? 'التاريخ' : 'Date',
      isRtl ? 'العميل' : 'Customer',
      isRtl ? 'الهاتف' : 'Phone',
      isRtl ? 'طريقة الدفع' : 'Payment Method',
      isRtl ? 'إجمالي المبيعات (ر.س)' : 'Total Sales (SAR)',
      isRtl ? 'رسوم بوابة الدفع المقدرة (ر.س)' : 'Gateway Fee (SAR)',
      isRtl ? 'التكلفة الشاملة للسلع (ر.س)' : 'Total Full COGS (SAR)',
      isRtl ? 'صافي الربح الدقيق (ر.س)' : 'Net Profit (SAR)',
      isRtl ? 'هامش الربح (%)' : 'Margin (%)'
    ];

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += headers.join(',') + '\n';

    filteredOrders.forEach(ord => {
      let ordCost = 0;
      ord.items.forEach(item => {
        const p = products.find(prod => prod.id === item.product_id || prod.name_en === item.name || prod.name_ar === item.name);
        const singleCost = p ? (
          p.calculated_cost !== undefined ? p.calculated_cost : ((p.supplier_purchase_price || 0) + (p.supplier_shipping_cost || 0) + (p.gateway_fee || 0) + (p.packaging_cost || 0) + (p.marketing_cost || 0) + (p.additional_expenses || 0))
        ) : (item.price * 0.5);
        ordCost += singleCost * item.quantity;
      });

      const gateFee = calculateGatewayFeeForValue(ord.total, ord.payment_method || 'visa');
      const profit = ord.total - ordCost - gateFee;
      const margin = ordCost > 0 ? (profit / ordCost) * 100 : 0;

      const row = [
        ord.id,
        new Date(ord.date).toLocaleDateString(),
        `"${ord.customer_name.replace(/"/g, '""')}"`,
        `"${ord.phone}"`,
        ord.payment_method || 'Visa',
        ord.total,
        gateFee.toFixed(2),
        ordCost.toFixed(2),
        profit.toFixed(2),
        margin.toFixed(1)
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Ryvo_Accounting_Book_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(isRtl ? '📂 تم تصدير الدفتر المالي المجمع بنجاح!' : '📂 Complete accounting ledger exported successfully!');
  };

  const maxVal = Math.max(...chartData.map(d => Math.max(d.sales, d.profit, 100))) * 1.15;
  const chartHeight = 160;
  const chartWidth = 500;
  const pointsSales = chartData.map((d, idx) => {
    const x = (idx / (chartData.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - (d.sales / maxVal) * (chartHeight - 30) - 15;
    return `${x},${y}`;
  }).join(' ');

  const pointsProfit = chartData.map((d, idx) => {
    const x = (idx / (chartData.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - (d.profit / maxVal) * (chartHeight - 30) - 15;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-md text-left animate-in zoom-in-95 duration-200 space-y-8 print:p-0 print:border-none print:shadow-none">
      
      {/* HEADER TITLE SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 print:pb-3">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 dark:text-amber-400 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-500 animate-pulse" />
            <span>{isRtl ? 'نظام المحاسبة وإدارة الأرباح والموردين المطور 📉💼' : 'Comprehensive Accounting & Supplier Profit Analyzer 📉💼'}</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {isRtl 
              ? 'احسب الأرباح الدقيقة بعد رسوم بوابات الدفع، راقب المصاريف التشغيلية (OPEX)، حلل أصول المخزون، وخطط لأهدافك المالية بذكاء.' 
              : 'Calculate precise profits minus gateway costs, record overhead OPEX, run stock asset valuations, and manage financial goals.'}
          </p>
        </div>
        
        {/* Actions Row */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={exportToExcel}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isRtl ? 'تصدير دفتر الأستاذ' : 'Export Ledger CSV'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isRtl ? 'طباعة الكشف' : 'Print Statement'}</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB NAVIGATION SYSTEM */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 -mx-2 px-2 scrollbar-none print:hidden">
        {[
          { id: 'analytics', label: isRtl ? '📊 تحليلات الأرباح' : '📊 Analytics Dashboard', icon: LayoutGrid },
          { id: 'opex', label: isRtl ? '💸 المصاريف التشغيلية (OPEX)' : '💸 OPEX Tracker', icon: PiggyBank },
          { id: 'stock', label: isRtl ? '⚖️ تدقيق وتقييم المخزون' : '⚖️ Stock Valuation', icon: Scale },
          { id: 'pricing', label: isRtl ? '🧮 أدوات وحاسبات التسعير' : '🧮 Pricing Studio', icon: Coins },
          { id: 'goals', label: isRtl ? '🎯 الأهداف المالية' : '🎯 Financial Goals', icon: Target },
          { id: 'audit', label: isRtl ? '📜 سجل تعديلات الأسعار' : '📜 Price Audit Trail', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-900/40 text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ANALYTICS & KPIS */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* FILTER PERIOD BOX */}
          <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-2xl print:hidden">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300">
              {isRtl ? '📅 تحديد الفترة الزمنية لحساب العمليات والأرباح:' : '📅 Filter operational calculations timeframe:'}
            </span>
            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
              {(['all', 'today', 'week', 'month', 'year'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                    period === p 
                      ? 'bg-slate-900 dark:bg-amber-400 text-white dark:text-slate-950 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  {p === 'all' && (isRtl ? 'الكل' : 'All')}
                  {p === 'today' && (isRtl ? 'اليوم' : 'Today')}
                  {p === 'week' && (isRtl ? 'أسبوع' : 'Week')}
                  {p === 'month' && (isRtl ? 'شهر' : 'Month')}
                  {p === 'year' && (isRtl ? 'سنة' : 'Year')}
                </button>
              ))}
            </div>
          </div>

          {/* KPI ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Gross Sales */}
            <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#152033]/20 flex items-center gap-4">
              <div className="p-3 bg-violet-500/10 text-violet-500 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                  {isRtl ? '💸 إجمالي المبيعات الإيرادات' : 'Gross Revenue Sales'}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white block font-mono">
                  {totalSales.toLocaleString()} <span className="text-xs">{isRtl ? 'ر.س' : 'SAR'}</span>
                </span>
                <span className="text-[9px] text-slate-400 font-bold block">
                  {filteredOrders.length} {isRtl ? 'طلب ناجح مجمع' : 'successful orders combined'}
                </span>
              </div>
            </div>

            {/* KPI 2: COGS */}
            <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#152033]/20 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                  {isRtl ? '📉 تكلفة البضاعة (COGS)' : 'Cost of Goods Sold (COGS)'}
                </span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-200 block font-mono">
                  {totalCost.toLocaleString()} <span className="text-xs">{isRtl ? 'ر.س' : 'SAR'}</span>
                </span>
                <span className="text-[9px] text-slate-400 font-bold block">
                  {isRtl ? 'تتضمن الشراء والشحن المجمع' : 'Includes purchase + sourcing logistics'}
                </span>
              </div>
            </div>

            {/* KPI 3: Accurate Net Profit (Adjusted for Gateways) */}
            {(() => {
              let profitColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
              if (totalNetProfit < 0) {
                profitColor = "bg-rose-500/10 text-rose-600 border-rose-500/20";
              } else if (avgProfitMargin < 15) {
                profitColor = "bg-amber-500/10 text-amber-600 border-amber-500/20";
              }
              return (
                <div className={`p-5 rounded-2xl border ${profitColor} flex items-center gap-4`}>
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                      {isRtl ? '💵 صافي الربح الدقيق (بعد البوابات)' : 'Net-Net Profit (Post Gateways)'}
                    </span>
                    <span className="text-xl font-black block font-mono">
                      {totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs">{isRtl ? 'ر.س' : 'SAR'}</span>
                    </span>
                    <span className="text-[9px] font-extrabold block text-slate-500 dark:text-slate-400">
                      {isRtl ? `خصم ${totalGatewayFeesCollected.toFixed(0)} ر.س بوابات دفع` : `Deducted ${totalGatewayFeesCollected.toFixed(0)} SAR gateway charges`}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* KPI 4: Margin % */}
            <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#152033]/20 flex items-center gap-4">
              <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                  {isRtl ? '📈 هامش الربح المئوي' : 'Markup Profit Margin'}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white block font-mono">
                  {avgProfitMargin.toFixed(1)}%
                </span>
                <span className="text-[9px] text-slate-400 font-bold block">
                  {isRtl ? 'معدل العائد المالي على رأس المال' : 'Average return mark rate on cost'}
                </span>
              </div>
            </div>
          </div>

          {/* DYNAMIC EARLY MARGIN WARNING SLIDER CONTROL */}
          <div className="p-5 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-500/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-amber-400 text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>{isRtl ? 'لوحة نظام الإنذار المبكر للهوامش الضعيفة (تنبيه ذكي)' : 'Margin Watchdog System - Interactive Security Threshold'}</span>
              </div>
              <p className="text-slate-400 text-[10px] font-medium">
                {isRtl 
                  ? 'اختر عتبة هامش الأمان المقبولة لديك. سيقوم النظام فوراً بإظهار وتمييز أي منتج يقل هامشه عن هذه القيمة باللون الأحمر.' 
                  : 'Slide to adjust the margin buffer rate. Items with margins falling below this value trigger instant audit warnings.'}
              </p>
            </div>
            
            <div className="flex items-center gap-4 min-w-[250px]">
              <span className="text-[10px] font-bold text-rose-500">10%</span>
              <input
                type="range"
                min="10"
                max="40"
                value={marginThreshold}
                onChange={(e) => setMarginThreshold(Number(e.target.value))}
                className="flex-1 accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] font-bold text-emerald-500">40%</span>
              <div className="px-3 py-1.5 bg-rose-500/10 text-rose-500 font-mono font-black rounded-lg text-xs">
                &lt; {marginThreshold}%
              </div>
            </div>
          </div>

          {/* INTERACTIVE TIME-SERIES SVG CHART */}
          <div className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-[#121824]/40">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
                  {isRtl ? '📊 الرسم البياني المالي المجمع (المبيعات مقابل الأرباح)' : 'Consolidated Financial Timeline Graph (Revenue vs Profit)'}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  {isRtl ? 'تتبع فوري لمنحنى المبيعات مقابل صافي أرباح العمليات' : 'Interactive comparison showing gross cash-inflow and core net ROI line curves'}
                </p>
              </div>

              <div className="flex items-center gap-3 text-[9px] font-bold">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  <span className="text-slate-400">{isRtl ? 'المبيعات' : 'Sales'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-400">{isRtl ? 'الأرباح' : 'Profit'}</span>
                </div>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="relative w-full overflow-hidden">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                  <line x1="20" y1="20" x2={chartWidth - 20} y2="20" stroke="#f1f5f9" strokeDasharray="3,3" className="dark:stroke-slate-800" />
                  <line x1="20" y1="72" x2={chartWidth - 20} y2="72" stroke="#f1f5f9" strokeDasharray="3,3" className="dark:stroke-slate-800" />
                  <line x1="20" y1="125" x2={chartWidth - 20} y2="125" stroke="#f1f5f9" strokeDasharray="3,3" className="dark:stroke-slate-800" />
                  <line x1="20" y1="145" x2={chartWidth - 20} y2="145" stroke="#cbd5e1" className="dark:stroke-slate-700" />

                  <polyline fill="none" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" points={pointsSales} />
                  <polyline fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" points={pointsProfit} />

                  {chartData.map((d, idx) => {
                    const x = (idx / (chartData.length - 1)) * (chartWidth - 40) + 20;
                    const yS = chartHeight - (d.sales / maxVal) * (chartHeight - 30) - 15;
                    const yP = chartHeight - (d.profit / maxVal) * (chartHeight - 30) - 15;
                    return (
                      <g key={idx}>
                        <circle cx={x} cy={yS} r="4.5" fill="#8b5cf6" stroke="#ffffff" strokeWidth="1.5" />
                        <circle cx={x} cy={yP} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                      </g>
                    );
                  })}

                  {chartData.map((d, idx) => {
                    const x = (idx / (chartData.length - 1)) * (chartWidth - 40) + 20;
                    return (
                      <text key={idx} x={x} y={chartHeight - 2} textAnchor="middle" fill="#94a3b8" fontSize="7" fontWeight="bold">
                        {d.label}
                      </text>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 font-bold">
                {isRtl ? '📭 لا توجد مبيعات في الفترة المحددة لتوليد المنحنى' : '📭 No active sales timeline for this period'}
              </div>
            )}
          </div>

          {/* DETAILED RANKING REPORTS & PROFITABILITY BENTO GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Box 1: Most Profitable Products */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-800">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">{isRtl ? '🔥 المنتجات الأعلى أرباحاً' : 'Top Net-Profit Products'}</h4>
                  <span className="text-[9px] text-slate-400 block font-semibold">{isRtl ? 'مرتبة حسب الأرباح الصافية المحققة' : 'Ranked by absolute net profit earned'}</span>
                </div>
              </div>

              <div className="space-y-3">
                {mostProfitable.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 w-5 h-5 rounded-full flex items-center justify-center">#{idx + 1}</span>
                      <img src={p.image} className="w-8 h-8 rounded-lg object-cover border" referrerPolicy="no-referrer" />
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-500 block font-mono">+{p.profit.toLocaleString()} <span className="text-[9px]">{isRtl ? 'ر.س' : 'SAR'}</span></span>
                      <span className="text-[8px] text-slate-400 block font-bold">{isRtl ? `بيع: ${p.quantity} قطع` : `${p.quantity} units sold`}</span>
                    </div>
                  </div>
                ))}
                {mostProfitable.length === 0 && (
                  <p className="text-center py-6 text-slate-400 text-[10px] font-bold">{isRtl ? '📭 لا مبيعات لتحديد الأكثر ربحية' : '📭 No statistics recorded yet.'}</p>
                )}
              </div>
            </div>

            {/* Box 2: Weak Profit Margin Alert Box (Tied with Slider Margin Threshold!) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-800">
                <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-rose-500">{isRtl ? `⚠️ هوامش ربح ضعيفة (< ${marginThreshold}%)` : `Low Margin Watchlist (< ${marginThreshold}%)`}</h4>
                  <span className="text-[9px] text-slate-400 block font-semibold">{isRtl ? 'منتجات تحقق أرباح منخفضة مقارنة بتكلفتها' : 'Sourcing cost is too close to retail pricing'}</span>
                </div>
              </div>

              <div className="space-y-3">
                {leastProfitable.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 text-xs bg-rose-500/5 p-1.5 rounded-xl border border-rose-500/10">
                    <div className="flex items-center gap-2">
                      <img src={p.image} className="w-8 h-8 rounded-lg object-cover border" referrerPolicy="no-referrer" />
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-rose-500 block font-mono">{p.marginPct.toFixed(1)}%</span>
                      <span className="text-[8px] text-slate-400 block font-bold">{isRtl ? `صافي: ${p.profit.toFixed(0)} ر.س` : `Net: ${p.profit.toFixed(0)} SAR`}</span>
                    </div>
                  </div>
                ))}
                {leastProfitable.length === 0 && (
                  <p className="text-center py-6 text-emerald-500 text-[10px] font-black">👍 {isRtl ? 'جميع مبيعاتك تتجاوز حد الأمان المالي المحدد!' : 'All sales exceed your margin buffer.'}</p>
                )}
              </div>
            </div>

            {/* Box 3: Loss-making items */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-800">
                <div className="p-1.5 bg-rose-500/15 text-rose-600 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-rose-600">{isRtl ? '🚨 سلع كتالوج تحقق خسائر' : 'Catalog Sourcing Deficits'}</h4>
                  <span className="text-[9px] text-slate-400 block font-semibold">{isRtl ? 'منتجات سعر بيعها الفعلي أقل من تكلفة COGS' : 'Retail selling rate is negative against costs'}</span>
                </div>
              </div>

              <div className="space-y-3">
                {[...lossMakingOrders, ...lossMakingCatalog]
                  .reduce((acc, current) => {
                    const x = acc.find(item => item.id === current.id);
                    if (!x) {
                      return acc.concat([current]);
                    } else {
                      return acc;
                    }
                  }, [] as any[])
                  .slice(0, 5)
                  .map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-3 text-xs bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                      <div className="flex items-center gap-2">
                        <img src={p.image} className="w-8 h-8 rounded-lg object-cover border" referrerPolicy="no-referrer" />
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-rose-600 block font-mono">{(p.profit || (p.price - p.cost)).toFixed(0)} SAR</span>
                        <span className="text-[8px] text-slate-400 block font-bold">{isRtl ? `الخسارة بالقطعة` : `Net deficit per unit`}</span>
                      </div>
                    </div>
                  ))}
                {lossMakingOrders.length === 0 && lossMakingCatalog.length === 0 && (
                  <p className="text-center py-6 text-emerald-500 text-[10px] font-extrabold">🌟 {isRtl ? 'رائع! لا يوجد أي خسائر مسجلة.' : 'Outstanding! Zero loss items catalogued.'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OPEX & OVERHEADS EXPENSES TRACKER */}
      {activeTab === 'opex' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-indigo-500" />
              <span>{isRtl ? 'لوحة تسجيل وتتبع المصاريف التشغيلية (OPEX)' : 'Operational Fixed Overheads & Expenses Log (OPEX)'}</span>
            </h3>
            <p className="text-slate-400 text-xs">
              {isRtl 
                ? 'سجل اشتراكات المنصة الشهرية، تكاليف الحملات الإعلانية في تيك توك وسناب شات، الرواتب، الإيجار، وخصمها تلقائياً لحساب صافي الأرباح الحقيقي.' 
                : 'Log platforms SaaS fees, social marketing ad spends, logistics, overheads and run net earnings computations after OPEX.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* REGISTER NEW EXPENSE FORM */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl h-fit">
              <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs mb-4 border-b pb-2 flex items-center gap-1">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>{isRtl ? 'تسجيل مصروف تشغيلي جديد' : 'Log New Monthly Expense'}</span>
              </h4>

              <form onSubmit={handleAddOpex} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">{isRtl ? 'اسم البند / المصروف' : 'Expense / Asset Title'}</label>
                  <input
                    type="text"
                    required
                    placeholder={isRtl ? 'مثال: اشتراك سلة بريميوم، إعلانات تيك توك' : 'e.g. Salla Monthly Subscription, Instagram Ads'}
                    value={newOpexTitle}
                    onChange={(e) => setNewOpexTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">{isRtl ? 'الفئة التشغيلية' : 'Expense Category'}</label>
                    <select
                      value={newOpexCategory}
                      onChange={(e) => setNewOpexCategory(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold"
                    >
                      <option value="subscription">{isRtl ? '💻 اشتراك منصات/SaaS' : '💻 Subscriptions'}</option>
                      <option value="marketing">{isRtl ? '📣 تسويق وإعلانات' : '📣 Marketing/Ads'}</option>
                      <option value="salaries">{isRtl ? '👥 رواتب ومستحقات' : '👥 Salaries'}</option>
                      <option value="rent">{isRtl ? '🏢 إيجار ومستودعات' : '🏢 Warehouse Rent'}</option>
                      <option value="other">{isRtl ? '📦 مصاريف أخرى' : '📦 Other Costs'}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 block">{isRtl ? 'قيمة المصروف (ر.س)' : 'Amount (SAR)'}</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newOpexAmount || ''}
                      onChange={(e) => setNewOpexAmount(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono font-bold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRtl ? 'حفظ المصروف وتحديث الحسابات 💾' : 'Save Expense & Apply 💾'}</span>
                </button>
              </form>
            </div>

            {/* EXPENSES LOG TABLE */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between border border-slate-800 shadow-sm">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">{isRtl ? 'إجمالي المصاريف الثابتة' : 'Total Fixed Overheads'}</span>
                  <span className="text-xl font-black font-mono text-amber-400">-{totalOpexExpenses.toLocaleString()} <span className="text-xs">SAR</span></span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">{isRtl ? 'الأرباح التشغيلية الصافية الحقيقية (بعد الخصم)' : 'Absolute Net Profit After OPEX'}</span>
                  <span className={`text-xl font-black font-mono block ${netProfitAfterOpex >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {netProfitAfterOpex.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs">SAR</span>
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/80 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-850 uppercase tracking-widest text-[9px] text-left">
                        <th className="p-3 text-right" style={{ textAlign: isRtl ? 'right' : 'left' }}>{isRtl ? 'البند / المصروف' : 'Expense Detail'}</th>
                        <th className="p-3 text-center">{isRtl ? 'التصنيف' : 'Category'}</th>
                        <th className="p-3 text-center">{isRtl ? 'المبلغ' : 'Amount'}</th>
                        <th className="p-3 text-center">{isRtl ? 'التاريخ' : 'Date'}</th>
                        <th className="p-3 text-right" style={{ textAlign: isRtl ? 'left' : 'right' }}>{isRtl ? 'إجراء' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                      {opexList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100 text-right" style={{ textAlign: isRtl ? 'right' : 'left' }}>{item.title}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-lg text-[9px] font-black">
                              {item.category === 'subscription' && (isRtl ? '💻 اشتراك SaaS' : 'SaaS')}
                              {item.category === 'marketing' && (isRtl ? '📣 تسويق' : 'Ads')}
                              {item.category === 'salaries' && (isRtl ? '👥 رواتب' : 'Salaries')}
                              {item.category === 'rent' && (isRtl ? '🏢 إيجار' : 'Rent')}
                              {item.category === 'other' && (isRtl ? '📦 أخرى' : 'Others')}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-black text-rose-500">-{item.amount} SAR</td>
                          <td className="p-3 text-center font-mono text-[10px] text-slate-400">{item.date}</td>
                          <td className="p-3 text-right" style={{ textAlign: isRtl ? 'left' : 'right' }}>
                            <button
                              onClick={() => handleDeleteOpex(item.id)}
                              className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {opexList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                            {isRtl ? '📭 لا توجد أي مصاريف تشغيلية مسجلة حالياً.' : '📭 No fixed overhead expenses logged yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: STOCK AUDIT & ASSETS VALUATION */}
      {activeTab === 'stock' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-500" />
              <span>{isRtl ? 'دفتر تدقيق وتقييم الأصول الرأسمالية للمخزون' : 'Capital Sourcing Asset & Inventory Audit Register'}</span>
            </h3>
            <p className="text-slate-400 text-xs">
              {isRtl 
                ? 'تقرير مالي شامل يحسب القيمة الصافية الكلية للمنتجات المتوفرة حالياً في مستودعاتك، وتكلفة رأس المال المحجوز فيها، والأرباح المتوقعة عند البيع.' 
                : 'Audits inventory on stock. Estimates direct sourcing cash locked up in warehouses and expected saturated catalog profit margins.'}
            </p>
          </div>

          {/* STOCK KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
              <span className="text-[10px] font-black text-slate-400 block uppercase">{isRtl ? '📦 إجمالي القطع في المستودع' : 'Total Stock Level'}</span>
              <strong className="text-xl font-black text-slate-900 dark:text-white block font-mono mt-1">{totalStockItems.toLocaleString()} <span className="text-xs">{isRtl ? 'قطعة' : 'units'}</span></strong>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
              <span className="text-[10px] font-black text-slate-400 block uppercase">{isRtl ? '💼 رأس المال المحجوز (بسعر التكلفة)' : 'Sourcing Capital Locked (At Cost)'}</span>
              <strong className="text-xl font-black text-slate-800 dark:text-slate-200 block font-mono mt-1">{totalCapitalTiedUp.toLocaleString(undefined, {maximumFractionDigits: 1})} <span className="text-xs">SAR</span></strong>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
              <span className="text-[10px] font-black text-slate-400 block uppercase">{isRtl ? '💰 القيمة البيعية للأصول (بسعر التجزئة)' : 'Market Asset Value (At Retail)'}</span>
              <strong className="text-xl font-black text-indigo-600 dark:text-indigo-400 block font-mono mt-1">{totalRetailAssetValue.toLocaleString(undefined, {maximumFractionDigits: 1})} <span className="text-xs">SAR</span></strong>
            </div>

            <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
              <span className="text-[10px] font-black text-slate-400 block uppercase">{isRtl ? '📈 الأرباح المتبقية المتوقعة (عند بيع المخزون)' : 'Projected Saturated Gross Profit'}</span>
              <strong className="text-xl font-black text-emerald-500 block font-mono mt-1">+{expectedProfitSaturated.toLocaleString(undefined, {maximumFractionDigits: 1})} <span className="text-xs">SAR</span></strong>
            </div>
          </div>

          {/* DETAILED STOCK AUDIT LIST */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/80 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-850 uppercase tracking-widest text-[9px] text-left">
                    <th className="p-3 text-right" style={{ textAlign: isRtl ? 'right' : 'left' }}>{isRtl ? 'المنتج' : 'Product Asset'}</th>
                    <th className="p-3 text-center">{isRtl ? 'الكمية المتوفرة' : 'In-Stock'}</th>
                    <th className="p-3 text-center">{isRtl ? 'تكلفة الوحدة (COGS)' : 'Unit Cost'}</th>
                    <th className="p-3 text-center">{isRtl ? 'سعر التجزئة' : 'Retail Price'}</th>
                    <th className="p-3 text-center">{isRtl ? 'إجمالي تكلفة رأس المال' : 'Tied Sourcing Capital'}</th>
                    <th className="p-3 text-center">{isRtl ? 'صافي الربح المتوقع' : 'Potential Margin Return'}</th>
                    <th className="p-3 text-right" style={{ textAlign: isRtl ? 'left' : 'right' }}>{isRtl ? 'الحالة والمؤشر' : 'Margin Health'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 font-semibold text-slate-700 dark:text-slate-300">
                  {products.map(p => {
                    const cost = p.calculated_cost !== undefined ? p.calculated_cost : ((p.supplier_purchase_price || 0) + (p.supplier_shipping_cost || 0) + (p.gateway_fee || 0) + (p.packaging_cost || 0) + (p.marketing_cost || 0) + (p.additional_expenses || 0));
                    const profitPerUnit = p.price - cost;
                    const margin = cost > 0 ? (profitPerUnit / cost) * 100 : 0;
                    const name = currentLanguage === 'ar' ? p.name_ar : currentLanguage === 'fr' ? p.name_fr : p.name_en;
                    const tiedCapital = cost * (p.stock || 0);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 text-right" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                          <div className="flex items-center gap-2">
                            <img src={p.image} className="w-8 h-8 rounded-lg object-cover border border-slate-100" referrerPolicy="no-referrer" />
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block truncate max-w-[150px]">{name}</span>
                              <span className="text-[9px] text-slate-400 font-mono block">ID: {p.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-black">{p.stock || 0}</td>
                        <td className="p-3 text-center font-mono text-slate-500">{cost.toFixed(1)} SAR</td>
                        <td className="p-3 text-center font-mono text-indigo-600 dark:text-indigo-400 font-bold">{p.price} SAR</td>
                        <td className="p-3 text-center font-mono text-slate-900 dark:text-slate-100 font-black">{tiedCapital.toLocaleString()} SAR</td>
                        <td className="p-3 text-center font-mono text-emerald-500 font-black">+{ (profitPerUnit * (p.stock || 0)).toLocaleString() } SAR</td>
                        <td className="p-3 text-right" style={{ textAlign: isRtl ? 'left' : 'right' }}>
                          {margin < marginThreshold ? (
                            <span className="px-2 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-[9px] font-black">
                              ⚠️ {isRtl ? 'هامش منخفض' : 'Low margin alert'} ({margin.toFixed(0)}%)
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[9px] font-black">
                              🛡️ {isRtl ? 'هامش آمن' : 'Safe margin'} ({margin.toFixed(0)}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SMART PRICING STUDIO (VAT, GATEWAYS, CURRENCIES) */}
      {activeTab === 'pricing' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500 animate-spin" />
              <span>{isRtl ? 'محرك ومحاكاة قوانين وأدوات التسعير الذكي' : 'Smart Pricing & Financial Simulation Studio'}</span>
            </h3>
            <p className="text-slate-400 text-xs">
              {isRtl 
                ? 'استخدم هذه الأدوات الذكية لمحاكاة رسوم الدفع الإلكتروني، حساب ضريبة القيمة المضافة (VAT) بدقة، وتحويل عملات الاستيراد فوراً للريال السعودي.' 
                : 'Run financial mock calculations to test gateway commission impacts, multi-currency imports, and ZATCA 15% VAT target-price margins.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* TOOL 1: 15% VAT CALCULATOR */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-amber-400 text-xs">
                  <Percent className="w-4 h-4 text-emerald-500" />
                  <span>{isRtl ? 'حاسبة ضريبة القيمة المضافة التلقائية (VAT)' : '15% Auto VAT Calculator'}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  {isRtl ? 'احسب السعر المستهدف وضريبة القيمة المضافة (15% القياسية) المترتبة على تكاليف المنتج والبيع النهائي.' : 'Add or strip Saudi VAT 15% to evaluate true costs before & after taxation.'}
                </p>

                <div className="space-y-2 text-[11px] pt-2">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">{isRtl ? 'سعر التكلفة الأصلي (SAR)' : 'Cost Price (SAR)'}</label>
                    <input
                      type="number"
                      value={vatCostPrice}
                      onChange={(e) => setVatCostPrice(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-500 block mb-1">{isRtl ? 'معدل الضريبة بالمتجر (%)' : 'VAT Rate (%)'}</label>
                    <input
                      type="number"
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-500 block mb-1">{isRtl ? 'سعر البيع النهائي المقترح (SAR)' : 'Proposed Selling Price (SAR)'}</label>
                    <input
                      type="number"
                      value={vatRetailPrice}
                      onChange={(e) => setVatRetailPrice(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* VAT Calculations Output Card */}
              <div className="p-4 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-xl space-y-1.5 border border-slate-800">
                <div className="flex justify-between border-b border-slate-900 pb-1.5 text-slate-400 font-bold font-sans">
                  <span>📊 {isRtl ? 'تقرير ضريبة المخرجات والمدخلات' : 'Taxation Summary'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isRtl ? 'الضريبة على التكلفة (مدخلات):' : 'VAT Paid (Input):'}</span>
                  <span className="font-bold">{vatCalculatedOnCost.toFixed(2)} SAR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isRtl ? 'التكلفة الشاملة بعد الضريبة:' : 'Cost with VAT:'}</span>
                  <span className="font-bold">{totalCostWithVat.toFixed(2)} SAR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isRtl ? 'الضريبة عند البيع (مخرجات):' : 'VAT Surcharged (Output):'}</span>
                  <span className="font-bold">{vatCalculatedOnRetail.toFixed(2)} SAR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isRtl ? 'السعر المستهدف قبل الضريبة:' : 'Net Price Pre-VAT:'}</span>
                  <span className="font-bold">{retailPriceBeforeVat.toFixed(2)} SAR</span>
                </div>
              </div>
            </div>

            {/* TOOL 2: PAYMENT GATEWAY CALCULATOR */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-amber-400 text-xs">
                  <Calculator className="w-4 h-4 text-violet-500" />
                  <span>{isRtl ? 'حساب بوابات الدفع الإلكترونية' : 'Gateway Commission Calculator'}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  {isRtl ? 'احسب بدقة الرسوم التي تقتطعها بوابات الدفع (مدى، فيزا، أو تابي) من القيمة الإجمالية للمبيعات.' : 'Simulate custom checkout fees deducted by payment processors like Mada or Tabby.'}
                </p>

                <div className="space-y-2 text-[11px] pt-2">
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">{isRtl ? 'قيمة السلعة بالمتجر (SAR)' : 'Checkout Basket Price (SAR)'}</label>
                    <input
                      type="number"
                      value={gatewayProductPrice}
                      onChange={(e) => setGatewayProductPrice(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-500 block mb-1">{isRtl ? 'اختر بوابة / وسيلة الدفع' : 'Payment Processor Gateway'}</label>
                    <select
                      value={selectedGateway}
                      onChange={(e) => setSelectedGateway(e.target.value as any)}
                      className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold"
                    >
                      <option value="mada">{isRtl ? '💳 مدى / Mada (1.75% + 1 ر.س)' : 'Mada (1.75% + 1 SAR)'}</option>
                      <option value="visa">{isRtl ? '💳 فيزا/ماستركارد (2.2% + 1 ر.س)' : 'Visa/MC (2.2% + 1 SAR)'}</option>
                      <option value="tabby">{isRtl ? '📱 تابي / تمارا (5.5% + 1 ر.س)' : 'Tabby (5.5% + 1 SAR)'}</option>
                      <option value="cod">{isRtl ? '📦 الدفع عند الاستلام (10 ر.س ثابت)' : 'Cash On Delivery (10 SAR)'}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Gateway Output Card */}
              <div className="p-4 bg-slate-950 text-amber-400 font-mono text-[10px] rounded-xl space-y-1.5 border border-slate-800">
                <div className="flex justify-between border-b border-slate-900 pb-1.5 text-slate-400 font-bold font-sans">
                  <span>🛠️ {isRtl ? 'محاكاة الاقتطاع المالي' : 'Commission Deduction Breakdown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isRtl ? 'معادلة العمولة:' : 'Commission Formula:'}</span>
                  <span className="font-bold font-sans text-[9px]">{gateLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isRtl ? 'المبلغ المستقطع:' : 'Processor Deduction:'}</span>
                  <span className="font-bold text-rose-500">-{simulatedGateFee.toFixed(2)} SAR</span>
                </div>
                <div className="flex justify-between border-t border-slate-900 pt-1.5 text-emerald-400">
                  <span className="text-slate-400">{isRtl ? 'الصافي الحقيقي المستلم:' : 'Absolute Net Payout:'}</span>
                  <span className="font-black text-xs">{pricingGateNetPrice.toFixed(2)} SAR</span>
                </div>
              </div>
            </div>

            {/* TOOL 3: AUTO CURRENCY CONVERTER */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-amber-400 text-xs">
                  <Coins className="w-4 h-4 text-sky-500" />
                  <span>{isRtl ? 'مُحوّل عملات أسعار الموردين' : 'Supplier Currency Converter'}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  {isRtl ? 'قم بتحويل تكلفة المنتجات المستوردة فورياً من الدولار أو اليوان الصيني إلى الريال السعودي حسب أسعار الصرف الحالية.' : 'Instantly convert sourcing costs from USD or CNY to Saudi Riyals (SAR).'}
                </p>

                <div className="space-y-2 text-[11px] pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-500 block mb-1">{isRtl ? 'العملة الأساسية' : 'Source Currency'}</label>
                      <select
                        value={currencySource}
                        onChange={(e) => setCurrencySource(e.target.value as any)}
                        className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="CNY">CNY (¥)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-500 block mb-1">{isRtl ? 'المبلغ بالعملة' : 'Amount'}</label>
                      <input
                        type="number"
                        value={currencyAmount}
                        onChange={(e) => setCurrencyAmount(Number(e.target.value))}
                        className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-500 block mb-1">{isRtl ? 'سعر الدولار (SAR)' : 'USD Rate'}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={usdRate}
                        onChange={(e) => setUsdRate(Number(e.target.value))}
                        className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-500 block mb-1">{isRtl ? 'سعر اليوان (SAR)' : 'CNY Rate'}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={cnyRate}
                        onChange={(e) => setCnyRate(Number(e.target.value))}
                        className="w-full p-2 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Currency Converter Output */}
              <div className="p-4 bg-slate-950 text-sky-400 font-mono text-center rounded-xl space-y-1 border border-slate-800">
                <span className="text-slate-400 text-[9px] block uppercase font-sans font-bold">{isRtl ? 'القيمة المحولة الفورية' : 'SAR Converted Valuation'}</span>
                <span className="text-lg font-black text-white">{convertedSar.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} SAR</span>
                <span className="text-slate-500 text-[8px] block mt-0.5">{isRtl ? `1 ${currencySource} = ${activeRate} ر.س` : `1 ${currencySource} = ${activeRate} SAR`}</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 5: FINANCIAL TARGET PLANNER & BUDGETING */}
      {activeTab === 'goals' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              <span>{isRtl ? 'لوحة تحديد وتتبع الأهداف المالية للمتجر' : 'Interactive Financial Target Planner & Progression Dashboard'}</span>
            </h3>
            <p className="text-slate-400 text-xs">
              {isRtl 
                ? 'حدد ميزانيتك وأهداف أرباحك وإيراداتك الشهرية، وتتبع مستوى إنجازها والتقدم المحرز عبر رسوم دائرية ونسب مئوية حية.' 
                : 'Configure targets for monthly net profits and sales revenues. Evaluate live progress indicators and track success rates.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CONFIGURE GOAL VALUES */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 rounded-2xl h-fit">
              <h4 className="font-black text-slate-800 dark:text-slate-200 text-xs mb-4 border-b pb-2 flex items-center gap-1">
                <Settings className="w-4 h-4 text-indigo-500" />
                <span>{isRtl ? 'تعديل وتحديث الأهداف المالية' : 'Update Goal Metrics'}</span>
              </h4>

              <form onSubmit={handleUpdateGoals} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">{isRtl ? 'هدف صافي الأرباح الشهري (ر.س)' : 'Target Monthly Net Profit (SAR)'}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editMonthlyProfit}
                    onChange={(e) => setEditMonthlyProfit(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 block">{isRtl ? 'هدف المبيعات الشهري الكلي (ر.س)' : 'Target Monthly Gross Revenue (SAR)'}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editMonthlyRevenue}
                    onChange={(e) => setEditMonthlyRevenue(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-mono font-bold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <Target className="w-4 h-4" />
                  <span>{isRtl ? 'حفظ وتحديث مؤشر التقدم 🎯' : 'Update Progress Tracker 🎯'}</span>
                </button>
              </form>
            </div>

            {/* PROGRESS BOXES */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Progress: Profits */}
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">{isRtl ? 'التقدم المحرز لصافي الأرباح' : 'Monthly Net Profit Progress'}</span>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-xl font-black font-mono text-emerald-500">{totalNetProfit.toLocaleString(undefined, {maximumFractionDigits:0})} SAR</span>
                    <span className="text-xs text-slate-400 font-bold">/ {goals.monthlyTargetProfit.toLocaleString()} SAR</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 dark:bg-slate-850 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${monthlyProfitProgressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400">
                    <span>{isRtl ? 'تم تحقيق:' : 'Achieved:'} {monthlyProfitProgressPct.toFixed(1)}%</span>
                    <span>{monthlyProfitProgressPct >= 100 ? (isRtl ? 'تم تحقيق الهدف! 🎉' : 'Target Achieved! 🎉') : (isRtl ? 'قيد العمل ⏳' : 'In Progress ⏳')}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl text-[10px] text-slate-400 font-medium leading-relaxed">
                  {isRtl 
                    ? `متبقي ${Math.max(0, goals.monthlyTargetProfit - totalNetProfit).toLocaleString()} ر.س للوصول إلى هدف أرباحك الشهري.` 
                    : `Requires ${Math.max(0, goals.monthlyTargetProfit - totalNetProfit).toLocaleString()} SAR further net profit to hit your monthly mark.`}
                </div>
              </div>

              {/* Progress: Revenue */}
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">{isRtl ? 'التقدم المحرز لإجمالي المبيعات' : 'Gross Sales Target'}</span>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-xl font-black font-mono text-violet-500">{totalSales.toLocaleString()} SAR</span>
                    <span className="text-xs text-slate-400 font-bold">/ {goals.monthlyTargetRevenue.toLocaleString()} SAR</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 dark:bg-slate-850 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-violet-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${monthlyRevenueProgressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400">
                    <span>{isRtl ? 'تم تحقيق:' : 'Achieved:'} {monthlyRevenueProgressPct.toFixed(1)}%</span>
                    <span>{monthlyRevenueProgressPct >= 100 ? (isRtl ? 'مبيعات قياسية! 🚀' : 'Active ⏳') : (isRtl ? 'قيد العمل ⏳' : 'In Progress ⏳')}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl text-[10px] text-slate-400 font-medium leading-relaxed">
                  {isRtl 
                    ? `متبقي ${Math.max(0, goals.monthlyTargetRevenue - totalSales).toLocaleString()} ر.س مبيعات متبقية للوصول إلى الهدف الكلي.` 
                    : `Requires ${Math.max(0, goals.monthlyTargetRevenue - totalSales).toLocaleString()} SAR sales to complete monthly milestone.`}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* TAB 6: PRICE MODIFICATION AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-violet-500 animate-pulse" />
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">{isRtl ? '📜 سجل العمليات وتعديلات الأسعار المالي' : 'Financial Price Audit Trail'}</h3>
                <p className="text-[10px] text-slate-400 font-medium">{isRtl ? 'سجل كامل لجميع تعديلات الأسعار لتوفير شفافية كاملة' : 'Complete change log showing pricing history & cost auditing details'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 uppercase tracking-widest text-[9px]">
                    <th className="p-3">{isRtl ? 'المنتج' : 'Product'}</th>
                    <th className="p-3 text-center">{isRtl ? 'السعر القديم ➔ الجديد' : 'Old Price ➔ New Price'}</th>
                    <th className="p-3 text-center">{isRtl ? 'التكلفة القديمة ➔ الجديدة' : 'Old Cost ➔ New Cost'}</th>
                    <th className="p-3 text-center">{isRtl ? 'المحاسب المسؤول' : 'Authorized Personnel'}</th>
                    <th className="p-3 text-right" style={{ textAlign: isRtl ? 'left' : 'right' }}>{isRtl ? 'توقيت التعديل' : 'Modification Timestamp'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-300">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{log.productName}</td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className="text-slate-400">{log.oldPrice} ر.س</span>
                        <span className="mx-2 text-violet-500">➔</span>
                        <span className="text-slate-900 dark:text-slate-100 font-extrabold">{log.newPrice} ر.س</span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className="text-slate-400">{log.oldCost} ر.س</span>
                        <span className="mx-2 text-violet-500">➔</span>
                        <span className="text-slate-900 dark:text-slate-100 font-extrabold">{log.newCost} ر.س</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-1 bg-violet-500/10 text-violet-500 rounded-lg text-[10px] font-black font-mono">
                          {log.editedBy}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-medium text-slate-400 text-[10px]" style={{ textAlign: isRtl ? 'left' : 'right' }}>
                        {new Date(log.timestamp).toLocaleString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US')}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                        {loadingLogs ? (isRtl ? '⏳ جاري جلب سجل العمليات...' : '⏳ Retrieving pricing logs...') : (isRtl ? '📭 لا يوجد أي تعديلات مسجلة بعد.' : '📭 No price audit log entries captured yet.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
