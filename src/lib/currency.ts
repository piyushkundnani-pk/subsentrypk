// Currency utility for formatting amounts with proper symbols and codes

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

const currencyMap: Record<string, CurrencyInfo> = {
  'USD': { code: 'USD', symbol: '$', name: 'United States Dollar' },
  'INR': { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  'EUR': { code: 'EUR', symbol: '€', name: 'Euro' },
  'GBP': { code: 'GBP', symbol: '£', name: 'British Pound' },
};

export function getCurrencyInfo(currencyString: string): CurrencyInfo {
  // Handle formats like "USD - United States Dollar", "USD", or legacy full strings
  const code = currencyString?.split(' ')[0]?.trim()?.toUpperCase() || 'USD';
  return currencyMap[code] || currencyMap['USD'];
}

export function formatCurrency(amount: number, currencyString: string): string {
  const { symbol, code } = getCurrencyInfo(currencyString);
  return `${symbol}${amount.toFixed(2)} ${code}`;
}

export function getCurrencySymbol(currencyString: string): string {
  return getCurrencyInfo(currencyString).symbol;
}

export function getCurrencyCode(currencyString: string): string {
  return getCurrencyInfo(currencyString).code;
}
