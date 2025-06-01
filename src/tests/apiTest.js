const testSearchAPI = async () => {
  try {
    console.log('\n1. Testing Stock Search API...');
    const response = await fetch(
      'https://query1.finance.yahoo.com/v1/finance/search?q=TATAMOTORS&quotesCount=10&lang=en-US&region=IN'
    );
    const data = await response.json();
    const stocks = data.quotes
      .filter(quote => quote.quoteType === 'EQUITY')
      .map(quote => ({
        symbol: quote.symbol.replace('.NS', ''),
        name: quote.longname || quote.shortname,
        exchange: quote.exchDisp,
        sector: quote.sector || 'N/A',
        industry: quote.industry || 'N/A'
      }));
    console.log('Search API Response:', stocks.length > 0 ? 'Success' : 'Failed');
    console.log('Sample data:', stocks[0]);
    return true;
  } catch (error) {
    console.error('Search API Error:', error.message);
    return false;
  }
};

const testStockDetailsAPI = async () => {
  try {
    console.log('\n2. Testing Stock Details API...');
    const response = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/TATAMOTORS.NS?interval=1d&range=1d'
    );
    const data = await response.json();
    const stockData = data.chart.result[0];
    const price = stockData.meta.regularMarketPrice;
    const dayHigh = stockData.meta.dayHigh || price;
    const dayLow = stockData.meta.dayLow || price;
    const previousClose = stockData.meta.chartPreviousClose || price;
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;

    const details = {
      currentPrice: price,
      change: change.toFixed(2),
      changePercent: changePercent.toFixed(2),
      dayHigh,
      dayLow,
      volume: stockData.meta.volume || 0,
      timestamp: new Date().toISOString(),
    };

    console.log('Stock Details API Response: Success');
    console.log('Sample data:', details);
    return true;
  } catch (error) {
    console.error('Stock Details API Error:', error.message);
    return false;
  }
};

const testCompanyProfileAPI = async () => {
  try {
    console.log('\n3. Testing Company Profile API (using Search API)...');
    const symbol = 'TATAMOTORS';
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&quotesCount=1&lang=en-US&region=IN`
    );
    const data = await response.json();
    
    const stockInfo = data.quotes.find(quote => 
      quote.symbol === `${symbol}.NS` || quote.symbol === symbol
    );

    if (stockInfo) {
      const profile = {
        name: stockInfo.longname || stockInfo.shortname,
        sector: stockInfo.sector || 'N/A',
        industry: stockInfo.industry || 'N/A',
        exchange: stockInfo.exchDisp || 'NSE',
      };
      console.log('Company Profile API Response: Success');
      console.log('Sample data:', profile);
      return true;
    }
    throw new Error('No company profile available');
  } catch (error) {
    console.error('Company Profile API Error:', error.message);
    return false;
  }
};

const runAllTests = async () => {
  console.log('Starting Yahoo Finance API Tests...');
  
  const searchResult = await testSearchAPI();
  const detailsResult = await testStockDetailsAPI();
  const profileResult = await testCompanyProfileAPI();

  console.log('\nTest Summary:');
  console.log('-------------');
  console.log('Search API:', searchResult ? '✅ Working' : '❌ Failed');
  console.log('Stock Details API:', detailsResult ? '✅ Working' : '❌ Failed');
  console.log('Company Profile API:', profileResult ? '✅ Working' : '❌ Failed');
  
  if (searchResult && detailsResult && profileResult) {
    console.log('\n✅ All APIs are working correctly!');
  } else {
    console.log('\n❌ Some APIs failed. Please check the errors above.');
  }
};

// Run the tests
runAllTests(); 