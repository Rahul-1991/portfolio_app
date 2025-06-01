const searchMutualFunds = async (query) => {
  try {
    const response = await fetch(
      `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return data.map(fund => ({
      schemeCode: fund.schemeCode,
      schemeName: fund.schemeName,
      fundHouse: fund.fundHouse,
      schemeType: fund.schemeType,
      schemeCategory: fund.schemeCategory
    }));
  } catch (error) {
    console.error('Error searching mutual funds:', error);
    throw error;
  }
};

const getFundDetails = async (schemeCode) => {
  try {
    const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No NAV data available');
    }

    // Get latest NAV
    const latestNAV = data.data[0];
    
    // Calculate day change using previous day's NAV
    const previousNAV = data.data[1]?.nav || latestNAV.nav;
    const navChange = parseFloat(latestNAV.nav) - parseFloat(previousNAV);
    const navChangePercent = (navChange / parseFloat(previousNAV)) * 100;

    return {
      meta: {
        fundHouse: data.meta.fund_house,
        schemeType: data.meta.scheme_type,
        schemeCategory: data.meta.scheme_category,
        schemeName: data.meta.scheme_name,
        schemeCode: data.meta.scheme_code
      },
      nav: {
        currentNAV: parseFloat(latestNAV.nav),
        date: latestNAV.date,
        change: parseFloat(navChange.toFixed(4)),
        changePercent: parseFloat(navChangePercent.toFixed(2))
      }
    };
  } catch (error) {
    console.error('Error fetching fund details:', error);
    throw error;
  }
};

// Fallback to AMFI data if needed
const getAMFIData = async () => {
  try {
    const response = await fetch('https://www.amfiindia.com/spages/NAVAll.txt');
    const text = await response.text();
    
    // Parse AMFI text data
    const lines = text.split('\n');
    const navData = {};
    
    let currentScheme = null;
    lines.forEach(line => {
      if (line.startsWith('Scheme Code;')) return; // Skip header
      if (line.trim() === '') return; // Skip empty lines
      
      const parts = line.split(';');
      if (parts.length === 4) {
        navData[parts[0]] = {
          schemeCode: parts[0],
          schemeName: parts[1],
          nav: parseFloat(parts[2]),
          date: parts[3]
        };
      }
    });
    
    return navData;
  } catch (error) {
    console.error('Error fetching AMFI data:', error);
    throw error;
  }
};

export const mutualFundsAPI = {
  searchMutualFunds,
  getFundDetails,
  getAMFIData
}; 