export const INVESTMENT_TYPES = {
  RECURRING_DEPOSIT: {
    id: 'rd',
    name: 'Recurring Deposits',
    icon: 'bank',
    color: '#4CAF50',
  },
  FIXED_DEPOSIT: {
    id: 'fd',
    name: 'Fixed Deposits',
    icon: 'lock',
    color: '#2196F3',
  },
  STOCKS: {
    id: 'stocks',
    name: 'Stocks',
    icon: 'trending-up',
    color: '#F44336',
  },
  MUTUAL_FUNDS: {
    id: 'mf',
    name: 'Mutual Funds',
    icon: 'chart-line',
    color: '#9C27B0',
  },
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}; 