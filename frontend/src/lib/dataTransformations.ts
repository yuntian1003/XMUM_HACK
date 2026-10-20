/**
 * Data transformation utilities for FoodMonitor analysis graphs
 * These functions convert raw database results into chart-ready data
 */

export type CfsrDataPoint = {
  date: string;
  cfsr: number;
  riskBand: "LOW" | "MODERATE" | "HIGH";
};

export type PriceTrendData = {
  date: string;
  [commodity: string]: string | number;
};

export type NewsEvent = {
  id: string;
  title: string;
  date: string;
  severity: "critical" | "severe" | "moderate";
  commodity: string;
  sentiment?: "bullish" | "neutral" | "bearish";
};

export type SentimentData = {
  bullish: number;
  neutral: number;
  bearish: number;
};

export type StatePriceData = {
  states: string[];
  commodities: string[];
  values: number[][];
};

/**
 * Generate mock CFSR history (simulates FoodMonitor cfsrSnapshots table)
 * TODO: Replace with actual DB query when backend is connected
 */
export function generateMockCfsrHistory(days: number = 30): CfsrDataPoint[] {
  const data: CfsrDataPoint[] = [];
  const baselineDay = 65; // Starting at 65

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Simulate CFSR oscillation with trend
    const trend = Math.sin(i / 8) * 8;
    const noise = (Math.random() - 0.5) * 6;
    const cfsr = Math.max(20, Math.min(95, baselineDay + trend + noise));

    const riskBand: "LOW" | "MODERATE" | "HIGH" = 
      cfsr >= 70 ? "LOW" : cfsr >= 40 ? "MODERATE" : "HIGH";

    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cfsr: Math.round(cfsr * 10) / 10,
      riskBand,
    });
  }

  return data;
}

/**
 * Generate mock commodity price trends
 * TODO: Replace with actual DB query when backend is connected
 */
export function generateMockPriceTrends(days: number = 60): PriceTrendData[] {
  const data: PriceTrendData[] = [];
  const basePrices = { rice: 3.50, wheat: 4.20, maize: 2.80 };

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const point: PriceTrendData = {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };

    // Generate prices with some volatility
    for (const [commodity, basePrice] of Object.entries(basePrices)) {
      const trend = Math.sin(i / 15) * 0.3;
      const noise = (Math.random() - 0.5) * 0.2;
      point[commodity] = Math.round((basePrice + trend + noise) * 100) / 100;
    }

    data.push(point);
  }

  return data;
}

/**
 * Generate comprehensive mock news articles with full details
 * These are real-looking news articles users would actually read
 */
export function generateComprehensiveNewsArticles(count: number = 8): Array<{
  id: string;
  title: string;
  summary: string;
  content: string;
  impact: string;
  recommendation: string;
  commodity: string;
  severity: "critical" | "severe" | "moderate";
  region: string;
  priceImpact?: string;
}> {
  const articles: Array<{
    id: string;
    title: string;
    summary: string;
    content: string;
    impact: string;
    recommendation: string;
    commodity: string;
    severity: "critical" | "severe" | "moderate";
    region: string;
    priceImpact?: string;
  }> = [
    {
      id: "news-rice-shortage",
      title: "Rice Market Alert: Supply Shortage Drives 15% Price Surge",
      summary: "Major rice producing regions report reduced yields following unexpected weather patterns. Wholesale prices have increased by 15% week-over-week.",
      content: `
        Reports from major rice-producing territories indicate production shortfalls affecting domestic supply chains. Factors contributing to the shortage include unexpected rainfall patterns during critical harvest periods, transportation delays due to infrastructure maintenance, and increased export demand. Market analysts project continued price pressure for the next 2-3 weeks before stabilization.

        Key Metrics:
        • Wholesale price change: +15% week-over-week
        • Production impact: -12% vs baseline
        • Regional affected: Central and Northern territories
        • Storage levels: 70% of normal capacity
      `,
      impact: "Retail prices expected to rise 8-12% affecting consumer food costs. Agricultural input demand will increase as farmers adjust production strategies.",
      recommendation: "Government should consider temporary tariff adjustments. Farmers advised to secure inputs now and optimize storage. Retailers should communicate transparently with customers.",
      commodity: "Rice",
      severity: "critical",
      region: "Central Region",
      priceImpact: "+15% wholesale, +10% retail projected",
    },
    {
      id: "news-fertilizer-subsidy",
      title: "Government Approves Emergency Fertilizer Subsidy Program",
      summary: "New policy provides 40% cost reduction on essential fertilizers through Q2. Direct benefit transfers begin April 15th.",
      content: `
        The Ministry of Agriculture has announced an emergency subsidy program providing fertilizer cost relief to registered farming cooperatives. The program covers three essential nutrient types and will be distributed through established agricultural input channels.

        Program Details:
        • Subsidy coverage: 40% of retail price
        • Eligible fertilizer types: Urea, DAP, and potash compounds
        • Distribution timeline: April 15 - June 30, 2026
        • Beneficiary reach: ~500,000 registered farmers
        • Budget allocation: $450 million USD
      `,
      impact: "Reduced input costs will improve farmer margins by 8-12%. Expected to increase planting area by 5-7% in Q2.",
      recommendation: "Farmers should register through local cooperative by April 14 to access benefits. Track distribution schedule at ministry portal.",
      commodity: "Fertilizer",
      severity: "moderate",
      region: "National",
      priceImpact: "-40% subsidy on essential inputs",
    },
    {
      id: "news-wheat-harvest",
      title: "Wheat Futures: Harvest Delayed by 10 Days, Quality Concerns Emerge",
      summary: "Extended maturation period creates timing concerns for Q2 harvest. Market prices rise on supply uncertainty.",
      content: `
        Agricultural extension officers report wheat crop development delays across 60% of growing regions. Continued cooler than normal temperatures have extended the growing cycle by 8-10 days beyond historical averages.

        Harvest Status Update:
        • Estimated start date: Delayed 10 days from norm
        • Quality indicators: Protein levels slightly high (positive)
        • Expected yield variance: -3% to +5% depending on region
        • Weather forecast: Stable conditions expected next 7 days
      `,
      impact: "Delayed harvest affects market supply timing, creating temporary price volatility. Quality improvements may offset yield concerns.",
      recommendation: "Wait for optimal maturity before harvest. Monitor weather weekly. Lock in favorable prices if available before harvest surge.",
      commodity: "Wheat",
      severity: "severe",
      region: "Eastern Plateau",
      priceImpact: "+8% futures premium on supply uncertainty",
    },
    {
      id: "news-pulse-stable",
      title: "Market Report: Pulse Prices Stabilize After Monsoon Rally",
      summary: "Pulses enter consolidation phase after 20% monsoon-driven rally. Exports steady at 2-year highs.",
      content: `
        Pulse markets have entered a consolidation phase following strong monsoon-driven demand in March. Despite earlier volatility, prices have stabilized within a defined range indicating balanced supply-demand conditions.

        Market Snapshot:
        • Current price range: Within 2% of 30-day average
        • Active export orders: 40,000 MT (2-year high)
        • Storage inventory: Adequate across channels
        • Farmer sentiment: Positive on demand outlook
      `,
      impact: "Stable prices support farmer confidence and long-term planting decisions. Export revenue opportunities remain strong.",
      recommendation: "Good time for farmers to store inventory if storage facilities available. Exporters should accelerate fulfillment of pending orders.",
      commodity: "Pulses",
      severity: "moderate",
      region: "Southern Coast",
      priceImpact: "Stable: ±2% range consolidation",
    },
    {
      id: "news-pest-outbreak",
      title: "Regional Advisory: Pest Outbreak Detected in 5 Districts",
      summary: "Armyworm detection triggers agricultural alert. Rapid response team deployed with control measures.",
      content: `
        Plant protection agencies have confirmed armyworm presence in maize and sorghum crops across 5 districts. Rapid response teams are conducting field surveys and deploying integrated pest management protocols.

        Outbreak Status:
        • Confirmed districts: 5 (regional authority deployed)
        • Crop types affected: Maize (primary), Sorghum (secondary)
        • Area potentially threatened: ~25,000 hectares
        • Control measures: IPM protocol Stage 2 activated
      `,
      impact: "Potential crop losses of 10-20% if outbreak spreads. Early detection and rapid response significantly improves containment prospects.",
      recommendation: "Farmers in alert zones should inspect fields every 2-3 days. Store monitoring data and photos for insurance claims if needed.",
      commodity: "Maize",
      severity: "critical",
      region: "Northern Districts",
      priceImpact: "Potential +5-8% on maize prices if spread continues",
    },
    {
      id: "news-cooking-oil",
      title: "Global Commodity Watch: Cooking Oil Prices Rise on Production Concerns",
      summary: "Global palm oil production decline pushes prices up 12%. Affects local cooking oil availability and pricing.",
      content: `
        Global cooking oil markets experience upward pressure following reduced palm oil production projections from Southeast Asia. The shortage has ripple effects across domestic markets with imported cooking oil inventory levels declining.

        Global Market Status:
        • Global palm production forecast: -8% vs prior year
        • International prices: +12% in last 30 days
        • Domestic stock coverage: 4.2 months (below 5-month norm)
        • Import dependency: 65% of domestic consumption
      `,
      impact: "Domestic cooking oil prices likely to increase 8-15% in coming 2 months. Higher food production costs for processors.",
      recommendation: "Food processors should lock in supply contracts early. Consumers should buy in bulk when prices are favorable.",
      commodity: "Oils",
      severity: "severe",
      region: "Global Import Markets",
      priceImpact: "+12% global, +8-15% domestic projected",
    },
    {
      id: "news-storage-facility",
      title: "Infrastructure Update: New Cold Storage Facility Operational",
      summary: "Largest regional cold chain hub now operational, boosting storage capacity by 35,000 MT.",
      content: `
        A new $120 million regional cold storage facility has commenced operations, significantly enhancing post-harvest infrastructure. The facility features modern temperature and humidity control systems supporting multiple commodity types.

        Facility Specifications:
        • Total capacity: 35,000 MT (4.5x regional average)
        • Supported commodities: Fruits, vegetables, pulses, processed foods
        • Climate control: ±1°C precision with redundancy systems
        • Operational timeline: 24/7 with automated monitoring
        • Expected impact: 5% reduction in post-harvest losses
      `,
      impact: "Improved storage infrastructure extends shelf life, reduces regional price volatility, and attracts value-added processing investment.",
      recommendation: "Agricultural cooperatives should establish relationships with facility operators. Plan storage strategies for Q2-Q3 produce.",
      commodity: "Multi-commodity Storage",
      severity: "moderate",
      region: "Central Hub",
      priceImpact: "Reduced volatility: -3 to -5 points",
    },
    {
      id: "news-food-safety",
      title: "Policy Framework: New Food Safety Standards Take Effect",
      summary: "Enhanced pesticide residue regulations now mandatory for all export shipments. Timeline for compliance: 60 days.",
      content: `
        New food safety protocols establishing stricter pesticide residue limits have been implemented across the agricultural supply chain. All exporters must comply with updated laboratory testing requirements and documentation standards.

        Regulatory Changes:
        • Maximum residue limits: Reduced by 30% across 45 pesticides
        • Testing requirement: Lab certification from approved facilities only
        • Documentation: Enhanced traceability from farm to export
        • Compliance deadline: May 13, 2026
        • Non-compliance penalties: Up to 50% export suspension
      `,
      impact: "Increased compliance costs (2-5% of export value). Quality-conscious producers will benefit through premium pricing.",
      recommendation: "Export-focused farmers should upgrade to certified labs and document spray records carefully. Consider organic certification opportunities.",
      commodity: "All Export Crops",
      severity: "severe",
      region: "National Export Market",
      priceImpact: "Premium 3-8% for compliant exports",
    },
    // Additional commodity-specific alerts for expanded coverage
    {
      id: "news-sugarcane-alert",
      title: "Sugarcane: Processing Facility Expansion Boosts Capacity",
      summary: "Two new mills to increase processing capacity by 25%, supporting higher farmer supplies.",
      content: "Industrial investment in sugarcane infrastructure. Processing capacity expansion improves supply chain efficiency.",
      impact: "Increased farmer prices due to higher demand from processing facilities. Better market accessibility.",
      recommendation: "Sugarcane farmers should plan expanded planting for next season. Lock in supply agreements with expanding mills.",
      commodity: "Sugarcane",
      severity: "moderate",
      region: "Industrial Zone",
      priceImpact: "+5-7% farm gate prices",
    },
    {
      id: "news-spices-export",
      title: "Spices Export Demand Surges: Global Market Opportunity",
      summary: "Export orders for turmeric and pepper increase 35% following trade agreement expansion.",
      content: "International demand drivers support strong export market. Quality premiums available for certified organic production.",
      impact: "Strong export opportunities for specialty crop farmers. Premium pricing for quality grades.",
      recommendation: "Spice farmers should prioritize quality certifications and documentation for export premium markets.",
      commodity: "Spices",
      severity: "moderate",
      region: "Export Markets",
      priceImpact: "+15-20% premium for exports",
    },
    {
      id: "news-cotton-prices",
      title: "Cotton Market: Global Prices Rally on Supply Concerns",
      summary: "International cotton prices up 18% on India supply reduction news. Domestic prices expected to follow.",
      content: "Global market fundamentals strengthen on supply-side constraints. Quality cotton commands premium prices.",
      impact: "Higher profitability for cotton farmers. Strong incentive to expand plantings.",
      recommendation: "Lock in forward contracts now. Upgrade farming practices for premium quality grades.",
      commodity: "Cotton",
      severity: "moderate",
      region: "Global Markets",
      priceImpact: "+18% global, +12-15% domestic",
    },
    {
      id: "news-irrigation-subsidy",
      title: "Irrigation: Government Drip Irrigation Subsidy Extended",
      summary: "Subsidy program expanded to cover 150,000 additional hectares. 60% cost recovery available.",
      content: "Water efficiency investment supported. Modern irrigation technology adoption incentives.",
      impact: "Improved water use efficiency, reduced input costs, higher yields from better water management.",
      recommendation: "Farmers should apply for subsidy before June 30 deadline. Apply for water-efficient technology.",
      commodity: "Irrigation Equipment",
      severity: "moderate",
      region: "National",
      priceImpact: "-60% subsidy on equipment",
    },
    {
      id: "news-dairy-prices",
      title: "Dairy: Milk Prices Support Strong - Export Demand Holds",
      summary: "Dairy commodity prices remain firm with sustained international demand for dairy products.",
      content: "Stable milk prices support dairy farmer incomes. Quality premiums for certified production.",
      impact: "Stable dairy farming profitability. Investment in herd improvement justified.",
      recommendation: "Focus on milk quality improvement for premium prices. Invest in cold chain infrastructure.",
      commodity: "Dairy",
      severity: "moderate",
      region: "National",
      priceImpact: "Stable with +3-5% quality premium",
    },
    {
      id: "news-horticulture-tech",
      title: "Horticulture: Advanced Greenhouse Technology Adoption Accelerates",
      summary: "Government subsidizes high-tech greenhouse installations with 50% cost sharing scheme.",
      content: "Modern horticulture technology adoption through subsidy programs. Year-round production capability.",
      impact: "Extended growing season, reduced pest pressure, higher quality produce, premium market access.",
      recommendation: "Horticultural farmers should apply for subsidy. Plan greenhouse installations for Q3-Q4.",
      commodity: "Horticulture",
      severity: "moderate",
      region: "National",
      priceImpact: "-50% subsidy, +20-30% yield gains",
    },
    {
      id: "news-seeds-quality",
      title: "Quality Alert: Certified Seed Suppliers Accredited for 8 Major Crops",
      summary: "New accredited suppliers ensure seed quality standards. 15 suppliers certified nationwide.",
      content: "Seed quality assurance program strengthens. Farmer access to certified seed improved.",
      impact: "Higher seed viability, better germination rates, improved yields through quality seed access.",
      recommendation: "Source seeds from certified suppliers listed on agricultural portal for guaranteed quality.",
      commodity: "Seeds",
      severity: "moderate",
      region: "National",
      priceImpact: "Quality premium: +5-8% yield advantage",
    },
    {
      id: "news-weather-advisory",
      title: "Weather Alert: Favorable Conditions Expected for Next 30 Days",
      summary: "Meteorological department forecasts stable weather for major growing regions through May.",
      content: "Good weather outlook supports crop development. No major adverse weather events anticipated.",
      impact: "Positive crop development prospects. Reduced weather-related risk for current season crops.",
      recommendation: "Optimize agronomic practices during favorable conditions. Complete critical operations now.",
      commodity: "Weather Forecast",
      severity: "moderate",
      region: "National",
      priceImpact: "Favorable for yields",
    },
  ];

  // Return randomized subset with duplicates if needed for full coverage
  const result: Array<{
    id: string;
    title: string;
    summary: string;
    content: string;
    impact: string;
    recommendation: string;
    commodity: string;
    severity: "critical" | "severe" | "moderate";
    region: string;
    priceImpact?: string;
  }> = [];
  while (result.length < count) {
    articles.forEach((article) => {
      if (result.length < count) {
        result.push({ ...article, id: `${article.id}-${result.length}` });
      }
    });
  }
  return result.sort(() => Math.random() - 0.5).slice(0, count);
}

/**
 * Generate mock news events
 * TODO: Replace with actual DB query when backend is connected
 */
export function generateMockNewsEvents(count: number = 5): NewsEvent[] {
  const titles = [
    "Rice prices spike amid supply chain disruption",
    "Wheat harvest delays reported in Q2",
    "Government announces price support measures",
    "Maize production outlook stable",
    "Critical news: Regional drought conditions worsen",
    "Policy: New subsidy scheme for fertilizers",
    "Market alert: Global commodity prices surge",
    "News: Storage facility expansion project approved",
  ];

  const severities: Array<"critical" | "severe" | "moderate"> = ["critical", "severe", "moderate"];
  const commodities = ["Rice", "Wheat", "Maize", "Pulses", "Oil"];
  const sentiments: Array<"bullish" | "neutral" | "bearish"> = ["bullish", "neutral", "bearish"];

  const events: NewsEvent[] = [];

  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));

    events.push({
      id: `news-${i}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      severity: severities[Math.floor(Math.random() * severities.length)],
      commodity: commodities[Math.floor(Math.random() * commodities.length)],
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
    });
  }

  return events.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Generate mock sentiment distribution
 * TODO: Replace with actual DB query when backend is connected
 */
export function generateMockSentimentDistribution(): {
  current: SentimentData;
  trend: Array<{ date: string; bullish: number; neutral: number; bearish: number }>;
} {
  const current: SentimentData = {
    bullish: Math.floor(Math.random() * 100) + 30,
    neutral: Math.floor(Math.random() * 100) + 40,
    bearish: Math.floor(Math.random() * 100) + 20,
  };

  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const total = 200 + Math.random() * 100;
    const bullishRatio = Math.random() * 0.4 + 0.2;
    const bearishRatio = Math.random() * 0.3 + 0.1;
    const neutralRatio = 1 - bullishRatio - bearishRatio;

    trend.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      bullish: Math.round(bullishRatio * 100),
      neutral: Math.round(neutralRatio * 100),
      bearish: Math.round(bearishRatio * 100),
    });
  }

  return { current, trend };
}

/**
 * Generate mock state price dispersion heatmap
 * TODO: Replace with actual DB query when backend is connected
 */
export function generateMockStatePriceHeatmap(): StatePriceData {
  const states = ["Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Malacca", "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Sabah", "Sarawak", "Selangor", "Terengganu"];
  const commodities = ["Rice", "Wheat", "Maize"];

  const values: number[][] = states.map(() =>
    commodities.map(() => Math.round((Math.random() * 2 + 2.5) * 100) / 100)
  );

  return { states, commodities, values };
}

/**
 * Aggregate price data by day
 * @param rawData Raw price data from database
 * @returns Daily average prices grouped by commodity
 */
export function aggregatePricesByDay(
  rawData: Array<{ date: string; commodity: string; price: number }>
): PriceTrendData[] {
  const byDay = new Map<string, Map<string, number[]>>();

  // Group by date and commodity
  for (const row of rawData) {
    if (!byDay.has(row.date)) {
      byDay.set(row.date, new Map());
    }
    const byComm = byDay.get(row.date)!;
    if (!byComm.has(row.commodity)) {
      byComm.set(row.commodity, []);
    }
    byComm.get(row.commodity)!.push(row.price);
  }

  // Calculate averages
  const result: PriceTrendData[] = [];
  for (const [date, byComm] of Array.from(byDay.entries())) {
    const point: PriceTrendData = { date };
    for (const [commodity, prices] of Array.from(byComm.entries())) {
      const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      point[commodity] = Math.round(avg * 100) / 100;
    }
    result.push(point);
  }

  return result.sort((a, b) => (a.date as string).localeCompare(b.date as string));
}

/**
 * Calculate sentiment percentages from article counts
 */
export function calculateSentimentPercentages(
  bullishCount: number,
  neutralCount: number,
  bearishCount: number
): SentimentData {
  const total = bullishCount + neutralCount + bearishCount;
  if (total === 0) {
    return { bullish: 0, neutral: 0, bearish: 0 };
  }

  return {
    bullish: Math.round((bullishCount / total) * 100),
    neutral: Math.round((neutralCount / total) * 100),
    bearish: Math.round((bearishCount / total) * 100),
  };
}

/**
 * Filter news events by severity threshold
 */
export function filterNewsBySeverity(
  events: NewsEvent[],
  minSeverity: "critical" | "severe" | "moderate" = "moderate"
): NewsEvent[] {
  const severityRank = { critical: 3, severe: 2, moderate: 1 };
  return events.filter((e) => severityRank[e.severity] >= severityRank[minSeverity]);
}

/**
 * Group news events by commodity
 */
export function groupNewsByCommodity(
  events: NewsEvent[]
): Map<string, NewsEvent[]> {
  const grouped = new Map<string, NewsEvent[]>();
  for (const event of events) {
    if (!grouped.has(event.commodity)) {
      grouped.set(event.commodity, []);
    }
    grouped.get(event.commodity)!.push(event);
  }
  return grouped;
}
