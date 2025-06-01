const searchStocks = async (query) => {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=10&lang=en-US&region=IN`
    );
    const data = await response.json();
    return data.quotes
      .filter(quote => quote.quoteType === 'EQUITY')
      .map(quote => ({
        symbol: quote.symbol.replace('.NS', ''),  // Remove .NS suffix for cleaner display
        name: quote.longname || quote.shortname,
        exchange: quote.exchDisp,
        sector: quote.sector || 'N/A',
        industry: quote.industry || 'N/A'
      }));
  } catch (error) {
    console.error('Error searching stocks:', error);
    throw error;
  }
};

const getStockDetails = async (symbol) => {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d&range=1d`
    );
    const data = await response.json();
    
    if (data.chart.result) {
      const stockData = data.chart.result[0];
      const price = stockData.meta.regularMarketPrice;
      const dayHigh = stockData.meta.dayHigh || price;
      const dayLow = stockData.meta.dayLow || price;
      const previousClose = stockData.meta.chartPreviousClose || price;
      const change = price - previousClose;
      const changePercent = (change / previousClose) * 100;

      return {
        currentPrice: price,
        change: change.toFixed(2),
        changePercent: changePercent.toFixed(2),
        dayHigh,
        dayLow,
        volume: stockData.meta.volume || 0,
        timestamp: new Date().toISOString(),
      };
    }
    throw new Error('No stock data available');
  } catch (error) {
    console.error('Error fetching stock details:', error);
    throw error;
  }
};

// Since the company profile API is not reliable, we'll use the search API data
const getCompanyProfile = async (symbol) => {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&quotesCount=1&lang=en-US&region=IN`
    );
    const data = await response.json();
    
    const stockInfo = data.quotes.find(quote => 
      quote.symbol === `${symbol}.NS` || quote.symbol === symbol
    );

    if (stockInfo) {
      return {
        name: stockInfo.longname || stockInfo.shortname,
        sector: stockInfo.sector || 'N/A',
        industry: stockInfo.industry || 'N/A',
        exchange: stockInfo.exchDisp || 'NSE',
      };
    }
    throw new Error('No company profile available');
  } catch (error) {
    console.error('Error fetching company profile:', error);
    throw error;
  }
};

export const stocksAPI = {
  searchStocks,
  getStockDetails,
  getCompanyProfile,
}; 