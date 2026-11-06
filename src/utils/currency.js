export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  INR: '₹',
  JPY: '¥',
  NZD: 'NZ$'
};

export function formatMoney(amount, currency = 'USD') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const sym = CURRENCY_SYMBOLS[currency.toUpperCase()] || `${currency.toUpperCase()} `;
  
  return `${sym}${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
