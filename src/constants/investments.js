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
    color: '#9C27B0',
  },
  MUTUAL_FUNDS: {
    id: 'mf',
    name: 'Mutual Funds',
    icon: 'chart-line',
    color: '#FF9800',
  },
  CRYPTOCURRENCY: {
    id: 'crypto',
    name: 'Cryptocurrency',
    color: '#F44336',
  },
  GOLD_DEPOSIT: {
    id: 'gold',
    name: 'Gold Deposits',
    icon: 'diamond',
    color: '#FFD700',
  },
};

export const formatCurrency = (amount, decimals = 2) => {
  if (!amount && amount !== 0) return '₹0';
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  return formatter.format(amount);
};

export const formatCurrencyNoDecimals = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return formatter.format(Math.trunc(amount));
};

export const SIP_FREQUENCIES = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMI_ANNUALLY: 'Semi-Annually',
  ANNUALLY: 'Annually'
};

export const calculateXIRR = (cashflows) => {
  if (!cashflows || cashflows.length < 2) return 0;

  const guess = 0.1;
  const maxIterations = 100;
  const tolerance = 0.0000001;

  const getDaysBetweenDates = (date1, date2) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
  };

  const calculateNPV = (rate) => {
    const firstDate = new Date(cashflows[0].date);
    return cashflows.reduce((npv, cf) => {
      const daysFromStart = getDaysBetweenDates(new Date(cf.date), firstDate);
      const discountFactor = Math.pow(1 + rate, daysFromStart / 365);
      return npv + (cf.amount / discountFactor);
    }, 0);
  };

  let rate = guess;
  let npv = calculateNPV(rate);
  let iteration = 0;

  while (Math.abs(npv) > tolerance && iteration < maxIterations) {
    const newRate = rate - npv / (calculateNPV(rate + tolerance) - npv) * rate;
    if (isNaN(newRate) || !isFinite(newRate)) break;
    
    rate = newRate;
    npv = calculateNPV(rate);
    iteration++;
  }

  return Math.round(rate * 10000) / 100;
};

export const calculateReturns = (currentValue, investedAmount) => {
  if (!currentValue || !investedAmount) return 0;
  return ((currentValue - investedAmount) / investedAmount) * 100;
};

export const formatPercentage = (value, decimals = 2) => {
  if (!value && value !== 0) return '0%';
  return `${value.toFixed(decimals)}%`;
};

export const getValueColor = (value) => {
  if (!value || value === 0) return '#666666';
  return value > 0 ? '#4CAF50' : '#F44336';
};

export const formatCompactNumber = (number) => {
  if (!number && number !== 0) return '0';
  
  const formatter = new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  });
  
  return formatter.format(number);
};

export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const isValidSIPDate = (date) => {
  const dateNum = parseInt(date);
  return !isNaN(dateNum) && dateNum >= 1 && dateNum <= 28;
};

export const calculateSIPEndDate = (startDate, frequency, installments) => {
  const start = new Date(startDate);
  const monthsToAdd = {
    [SIP_FREQUENCIES.MONTHLY]: installments,
    [SIP_FREQUENCIES.QUARTERLY]: installments * 3,
    [SIP_FREQUENCIES.SEMI_ANNUALLY]: installments * 6,
    [SIP_FREQUENCIES.ANNUALLY]: installments * 12
  }[frequency];

  const endDate = new Date(start);
  endDate.setMonth(start.getMonth() + monthsToAdd);
  return endDate;
}; 