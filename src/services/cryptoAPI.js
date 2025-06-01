const BASE_URL = 'https://api.coingecko.com/api/v3';

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  return response.json();
};

export const cryptoAPI = {
  // Search for cryptocurrencies
  searchCrypto: async (query) => {
    try {
      const response = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(query)}`);
      const data = await handleResponse(response);
      return data.coins.map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        thumb: coin.thumb,
        market_cap_rank: coin.market_cap_rank
      }));
    } catch (error) {
      console.error('Error searching cryptocurrencies:', error);
      throw error;
    }
  },

  // Get current price and 24h change for multiple coins
  getCurrentPrices: async (coinIds) => {
    try {
      const ids = coinIds.join(',');
      const response = await fetch(
        `${BASE_URL}/simple/price?ids=${ids}&vs_currencies=inr&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
      );
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching current prices:', error);
      throw error;
    }
  },

  // Get detailed coin data
  getCoinDetails: async (coinId) => {
    try {
      const response = await fetch(
        `${BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
      );
      const data = await handleResponse(response);
      return {
        id: data.id,
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        image: data.image.large,
        currentPrice: data.market_data.current_price.inr,
        marketCap: data.market_data.market_cap.inr,
        marketCapRank: data.market_cap_rank,
        priceChange24h: data.market_data.price_change_percentage_24h,
        priceChange7d: data.market_data.price_change_percentage_7d,
        volume24h: data.market_data.total_volume.inr,
        high24h: data.market_data.high_24h.inr,
        low24h: data.market_data.low_24h.inr,
        lastUpdated: data.last_updated
      };
    } catch (error) {
      console.error('Error fetching coin details:', error);
      throw error;
    }
  },

  // Get market data for top coins (used in search/add screen)
  getTopCoins: async (page = 1, perPage = 50) => {
    try {
      const response = await fetch(
        `${BASE_URL}/coins/markets?vs_currency=inr&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`
      );
      const data = await handleResponse(response);
      return data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        image: coin.image,
        currentPrice: coin.current_price,
        marketCap: coin.market_cap,
        marketCapRank: coin.market_cap_rank,
        priceChange24h: coin.price_change_percentage_24h
      }));
    } catch (error) {
      console.error('Error fetching top coins:', error);
      throw error;
    }
  }
}; 