import { Language } from '../types';

export type Currency = 'SAR' | 'USD' | 'AED' | 'EUR';

export function getActiveCurrency(): Currency {
  try {
    const saved = localStorage.getItem('ryvo_currency');
    if (saved === 'SAR' || saved === 'USD' || saved === 'AED' || saved === 'EUR') {
      return saved;
    }
  } catch (e) {
    // ignore
  }
  return 'SAR';
}

export function getCurrencyRate(lang: Language): { symbol: string; rate: number } {
  const activeCurrency = getActiveCurrency();
  const isAr = lang === 'ar';

  switch (activeCurrency) {
    case 'USD':
      return { symbol: '$', rate: 1 / 3.75 };
    case 'AED':
      return { symbol: isAr ? 'د.إ' : 'AED', rate: 0.98 };
    case 'EUR':
      return { symbol: '€', rate: 1 / 4.05 };
    case 'SAR':
    default:
      return { symbol: isAr ? 'ر.س' : 'SAR', rate: 1 };
  }
}

export function formatPrice(priceInSAR: number, lang: Language): string {
  const { symbol, rate } = getCurrencyRate(lang);
  const converted = priceInSAR * rate;
  const activeCurrency = getActiveCurrency();
  const isAr = lang === 'ar';

  if (activeCurrency === 'USD' || activeCurrency === 'EUR') {
    const formatted = converted % 1 === 0 ? converted.toFixed(0) : converted.toFixed(2);
    return `${symbol}${formatted}`;
  } else {
    // For SAR and AED
    return `${Math.round(converted)} ${symbol}`;
  }
}

export function formatPriceOnly(priceInSAR: number, lang: Language): string {
  const { rate } = getCurrencyRate(lang);
  const converted = priceInSAR * rate;
  const activeCurrency = getActiveCurrency();

  if (activeCurrency === 'USD' || activeCurrency === 'EUR') {
    return converted % 1 === 0 ? converted.toFixed(0) : converted.toFixed(2);
  } else {
    return `${Math.round(converted)}`;
  }
}

