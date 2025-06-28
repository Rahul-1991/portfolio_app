// Function to scrape gold price from goodreturns.in (direct fetch like Python)
const scrapeVaranasiGoldPrice = async () => {
  console.log('🔍 Starting direct gold price scraping...');
  
  try {
    const url = "https://www.goodreturns.in/gold-rates/varanasi.html";
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0"
    };

    console.log('📡 Making direct request to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    console.log('📡 Response status:', response.status);
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch page. Status code: ${response.status}`);
    }

    const html = await response.text();
    console.log('✅ Successfully fetched HTML, length:', html.length);

    // Parse HTML to find the table (similar to BeautifulSoup logic)
    const tableMatch = html.match(/<table[^>]*class="[^"]*table-conatiner[^"]*"[^>]*>(.*?)<\/table>/is);
    
    if (!tableMatch) {
      throw new Error("Gold rate table not found.");
    }

    console.log('✅ Found gold rate table');
    const tableContent = tableMatch[1];

    // Find tbody and extract rows
    const tbodyMatch = tableContent.match(/<tbody[^>]*>(.*?)<\/tbody>/is);
    if (!tbodyMatch) {
      throw new Error("Table body not found.");
    }

    const tbodyContent = tbodyMatch[1];
    const rowPattern = /<tr[^>]*>(.*?)<\/tr>/gis;
    const rows = [];
    let rowMatch;

    while ((rowMatch = rowPattern.exec(tbodyContent)) !== null) {
      rows.push(rowMatch[1]);
    }

    console.log(`📊 Found ${rows.length} table rows`);

    // Process each row to find the 10g row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const cellPattern = /<td[^>]*>(.*?)<\/td>/gis;
      const cells = [];
      let cellMatch;

      while ((cellMatch = cellPattern.exec(row)) !== null) {
        cells.push(cellMatch[1].trim());
      }

      console.log(`Row ${i + 1} cells:`, cells);

      // Check if this is the 10g row (like Python code)
      if (cells.length >= 4 && cells[0].trim() === "10") {
        console.log('✅ Found 10g row:', cells);

        // Extract prices (similar to Python logic) - decode HTML entities first
        const todayStr = cells[1].replace(/&#x20b9;/g, "₹").replace(/[₹,\s]/g, "");
        const yesterdayStr = cells[2].replace(/&#x20b9;/g, "₹").replace(/[₹,\s]/g, "");
        const changeStr = cells[3].replace(/&#x20b9;/g, "₹").replace(/&nbsp;/g, "").replace(/[₹,\s-]/g, "").trim();

        console.log('💰 Raw price strings:', { todayStr, yesterdayStr, changeStr });

        const todayPrice = parseFloat(todayStr);
        const yesterdayPrice = parseFloat(yesterdayStr);
        const change = parseFloat(changeStr);

        console.log('💰 Parsed prices:', { todayPrice, yesterdayPrice, change });

        if (isNaN(todayPrice) || isNaN(yesterdayPrice)) {
          throw new Error("Invalid price data in table cells.");
        }

        console.log('✅ Successfully extracted gold price data');
        return {
          price: todayPrice,
          yesterdayPrice: yesterdayPrice,
          change: change,
          currency: 'INR',
          lastUpdated: new Date().toISOString(),
          source: 'goodreturns.in (Varanasi)',
          location: 'Varanasi',
          unit: 'per 10g',
          gram: 10,
          purity: '24K'
        };
      }
    }

    throw new Error("10 gram gold rate not found in table.");

  } catch (error) {
    console.error('❌ Direct scraping failed:', error.message);
    throw error;
  }
};

export const getCurrentGoldPrice = async () => {
  const url = "https://www.goodreturns.in/gold-rates/varanasi.html";
  const headers = {
    "User-Agent": "Mozilla/5.0"
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch page. Status code: ${response.status}`);
    }
    const html = await response.text();

    // Find the table with class "table-conatiner"
    const tableMatch = html.match(/<table[^>]*class="[^"]*table-conatiner[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) throw new Error("Gold rate table not found.");

    // Find all rows in tbody
    const tbodyMatch = tableMatch[1].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if (!tbodyMatch) throw new Error("Table body not found.");
    const rows = tbodyMatch[1].split(/<tr[^>]*>/).slice(1);

    for (const rowHtml of rows) {
      const cols = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)).map(m => m[1].replace(/<[^>]+>/g, '').trim());
      if (cols.length >= 4 && cols[0] === "10") {
        // Clean up the price strings
        const cleanNumber = (str) =>
          str.replace(/&#x20b9;|₹|,|\s|&nbsp;|-/g, '').trim();

        const todayStr = cleanNumber(cols[1]);
        const yesterdayStr = cleanNumber(cols[2]);
        const changeStr = cleanNumber(cols[3]);

        console.log('JS goldAPI todayStr:', todayStr, 'yesterdayStr:', yesterdayStr, 'changeStr:', changeStr);

        const today_price = parseFloat(todayStr) || 0;
        const yesterday_price = parseFloat(yesterdayStr) || 0;
        const change = yesterday_price - today_price;

        console.log('JS goldAPI today_price:', today_price, 'yesterday_price:', yesterday_price, 'change:', change);

        return {
          city: "Varanasi",
          purity: "24K",
          unit: "INR",
          date: new Date().toISOString().slice(0, 10),
          price_per_10g_today: today_price,
          price_per_10g_yesterday: yesterday_price,
          price_change: change
        };
      }
    }
    throw new Error("10 gram gold rate not found.");
  } catch (error) {
    // Fallback value
    return {
      city: "Varanasi",
      purity: "24K",
      unit: "INR",
      date: new Date().toISOString().slice(0, 10),
      price_per_10g_today: 65000,
      price_per_10g_yesterday: 65000,
      price_change: 0
    };
  }
};

export default getCurrentGoldPrice;