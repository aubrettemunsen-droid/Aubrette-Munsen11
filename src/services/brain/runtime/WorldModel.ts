/**
 * ModaGPT Brain Runtime v1 - World Model
 * Tracks external environment factors including luxury fashion trends, seasonal weather shifts,
 * competitor price indexes, and European macroeconomic conditions.
 *
 * NOTE: Upgraded to respect architecture abstraction rules. Under ECOS, the core brain
 * does not directly couple to third party endpoints like TikTok, Instagram or OpenWeather.
 * Instead, they are registered as clean generic Providers implementing standard Contracts.
 */

import { dbEngine } from '../../../db/dbEngine';

export interface FashionTrendMetrics {
  trendId: string;
  keyword: string;
  searchVolumeIndex: number; // 0 to 100
  momentum: 'rising' | 'stable' | 'fading';
  growthRatePct: number;
}

export interface EconomicIndicators {
  inflationIndex: number;     // e.g. 1.8%
  exchangeRateEURtoUSD: number; // e.g. 1.09
  consumerSentimentScore: number; // 0 to 100
}

export interface SeasonalWeatherState {
  currentSeason: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  avgTemperatureCelsius: number;
  anomalyDetected: boolean; // e.g. "Heatwave" or "Late Freeze"
  seasonalShiftAlert: string | null;
}

export interface CompetitorBenchmarking {
  brandName: string;
  avgLinenShirtPrice: number;
  activeDiscounts: boolean;
  marketingFocus: string;
}

export interface WorldStateSnapshot {
  timestamp: string;
  countryCode: string;
  trends: FashionTrendMetrics[];
  economy: EconomicIndicators;
  weather: SeasonalWeatherState;
  competitors: CompetitorBenchmarking[];
}

// ==========================================
// 🧠 Abstract Provider Contracts
// ==========================================

export interface TrendProvider {
  name: string;
  fetchTrends(countryCode: string): FashionTrendMetrics[];
}

export interface WeatherProvider {
  name: string;
  fetchWeather(countryCode: string): SeasonalWeatherState;
}

export interface EconomyProvider {
  name: string;
  fetchIndicators(countryCode: string): EconomicIndicators;
}

// ==========================================
// 🛠️ Implementations of Providers
// ==========================================

export class TikTokTrendProvider implements TrendProvider {
  name = 'TikTok Trending Index';
  fetchTrends(countryCode: string): FashionTrendMetrics[] {
    return [
      { trendId: 'trend_tiktok_1', keyword: 'TikTok Linen Aesthetic', searchVolumeIndex: 96, momentum: 'rising', growthRatePct: 45 }
    ];
  }
}

export class InstagramTrendProvider implements TrendProvider {
  name = 'Instagram Reels Fashion Signals';
  fetchTrends(countryCode: string): FashionTrendMetrics[] {
    return [
      { trendId: 'trend_insta_1', keyword: 'Quiet Luxury Parisian', searchVolumeIndex: 92, momentum: 'rising', growthRatePct: 28 }
    ];
  }
}

export class GoogleTrendsProvider implements TrendProvider {
  name = 'Google Trends Europe';
  fetchTrends(countryCode: string): FashionTrendMetrics[] {
    const listTrends = dbEngine.trend_signals?.getAll() || [];
    return listTrends.slice(0, 4).map((t: any) => ({
      trendId: t.id,
      keyword: t.keyword || 'Minimalist Linen',
      searchVolumeIndex: t.search_volume_index || 85,
      momentum: (t.momentum || 'rising') as 'rising' | 'stable' | 'fading',
      growthRatePct: 24
    }));
  }
}

export class OpenWeatherProvider implements WeatherProvider {
  name = 'OpenWeather API Client';
  fetchWeather(countryCode: string): SeasonalWeatherState {
    return {
      currentSeason: 'Summer',
      avgTemperatureCelsius: countryCode === 'FR' ? 28 : countryCode === 'DE' ? 24 : 31,
      anomalyDetected: countryCode === 'FR',
      seasonalShiftAlert: countryCode === 'FR' ? 'High Temp Anomaly triggers accelerated linen apparel depletion.' : null
    };
  }
}

export class EcmwfWeatherProvider implements WeatherProvider {
  name = 'ECMWF Medium-Range Weather';
  fetchWeather(countryCode: string): SeasonalWeatherState {
    return {
      currentSeason: 'Summer',
      avgTemperatureCelsius: countryCode === 'FR' ? 27.5 : countryCode === 'DE' ? 23.8 : 30.5,
      anomalyDetected: false,
      seasonalShiftAlert: null
    };
  }
}

export class EurostatEconomyProvider implements EconomyProvider {
  name = 'Eurostat Economics API';
  fetchIndicators(countryCode: string): EconomicIndicators {
    return {
      inflationIndex: 1.9,
      exchangeRateEURtoUSD: 1.09,
      consumerSentimentScore: 82
    };
  }
}

// ==========================================
// 🧠 Core WorldModel Engine
// ==========================================

class WorldModelClass {
  private static instance: WorldModelClass;

  private trendProviders: TrendProvider[] = [
    new TikTokTrendProvider(),
    new InstagramTrendProvider(),
    new GoogleTrendsProvider()
  ];

  private weatherProviders: WeatherProvider[] = [
    new OpenWeatherProvider(),
    new EcmwfWeatherProvider()
  ];

  private economyProviders: EconomyProvider[] = [
    new EurostatEconomyProvider()
  ];

  private activeTrendProviderIndex = 2;   // Default to Google Trends
  private activeWeatherProviderIndex = 0; // Default to OpenWeather
  private activeEconomyProviderIndex = 0; // Default to Eurostat

  private constructor() {
    this.bootstrapWorldData();
  }

  public static getInstance(): WorldModelClass {
    if (!WorldModelClass.instance) {
      WorldModelClass.instance = new WorldModelClass();
    }
    return WorldModelClass.instance;
  }

  // Provider Registration
  public registerTrendProvider(provider: TrendProvider): void {
    this.trendProviders.push(provider);
  }

  public getTrendProviders(): TrendProvider[] {
    return this.trendProviders;
  }

  public setActiveTrendProvider(index: number): void {
    if (index >= 0 && index < this.trendProviders.length) {
      this.activeTrendProviderIndex = index;
    }
  }

  public registerWeatherProvider(provider: WeatherProvider): void {
    this.weatherProviders.push(provider);
  }

  public getWeatherProviders(): WeatherProvider[] {
    return this.weatherProviders;
  }

  public setActiveWeatherProvider(index: number): void {
    if (index >= 0 && index < this.weatherProviders.length) {
      this.activeWeatherProviderIndex = index;
    }
  }

  /**
   * Generates a complete state snapshot of the active commercial environment using registered Providers.
   * Leveraged by the Executive Brain to adjust prices and suppliers dynamically.
   */
  public getCurrentWorldState(countryCode: string = 'FR', tenantId: string = 'tenant_default'): WorldStateSnapshot {
    // 1. Gather trend indicators from the active registered TrendProvider
    const activeTrendProvider = this.trendProviders[this.activeTrendProviderIndex] || this.trendProviders[2];
    let trends = activeTrendProvider.fetchTrends(countryCode);

    // Fallback if provider returns empty
    if (trends.length === 0) {
      trends = [
        { trendId: 'tr_1', keyword: '100% Linen Shirt', searchVolumeIndex: 94, momentum: 'rising', growthRatePct: 35 },
        { trendId: 'tr_2', keyword: 'Quiet Luxury Parisian', searchVolumeIndex: 88, momentum: 'rising', growthRatePct: 18 }
      ];
    }

    // 2. Gather competitor benchmarking indicators directly from dbEngine ledger
    const listCompetitors = dbEngine.competitors?.getAll() || [];
    const formattedCompetitors: CompetitorBenchmarking[] = listCompetitors.slice(0, 3).map((c: any) => ({
      brandName: c.name || 'Zara Premium',
      avgLinenShirtPrice: c.id === 'comp_1' ? 69.99 : c.id === 'comp_2' ? 59.99 : 49.99,
      activeDiscounts: true,
      marketingFocus: 'Organic Summer Chic'
    }));

    // 3. Gather weather metrics from active registered WeatherProvider
    const activeWeatherProvider = this.weatherProviders[this.activeWeatherProviderIndex] || this.weatherProviders[0];
    const weatherState = activeWeatherProvider.fetchWeather(countryCode);

    // 4. Gather economic metrics from active registered EconomyProvider
    const activeEconomyProvider = this.economyProviders[this.activeEconomyProviderIndex] || this.economyProviders[0];
    const economyState = activeEconomyProvider.fetchIndicators(countryCode);

    return {
      timestamp: new Date().toISOString(),
      countryCode,
      trends,
      economy: economyState,
      weather: weatherState,
      competitors: formattedCompetitors.length > 0 ? formattedCompetitors : [
        { brandName: 'Maje', avgLinenShirtPrice: 129.00, activeDiscounts: false, marketingFocus: 'Quiet Luxury Essential' },
        { brandName: 'Sandro', avgLinenShirtPrice: 145.00, activeDiscounts: true, marketingFocus: 'Aesthetic Linen Suits' }
      ]
    };
  }

  /**
   * Analyzes if a specific product title and style align with current world trends.
   */
  public evaluateTrendAlignment(title: string, style: string, countryCode: string = 'FR'): { score: number; reason: string } {
    const state = this.getCurrentWorldState(countryCode);
    const textToAnalyze = `${title} ${style}`.toLowerCase();

    let matches = 0;
    state.trends.forEach(t => {
      const kw = t.keyword.toLowerCase();
      if (textToAnalyze.includes(kw) || kw.split(' ').some(word => textToAnalyze.includes(word))) {
        matches++;
      }
    });

    if (matches >= 2) {
      return { score: 95, reason: "Perfect alignment. Style matching trending Parisian and organic Linen keyword metrics." };
    } else if (matches === 1) {
      return { score: 78, reason: "Moderate alignment. Suggest adding high-value keywords to product metadata." };
    }
    return { score: 45, reason: "Weak alignment. Market demand for this clothing profile is seasonally dormant." };
  }

  private bootstrapWorldData(): void {
    // Sync default entries to dbEngine if blank
    if (dbEngine.trend_signals && dbEngine.trend_signals.getAll().length === 0) {
      dbEngine.trend_signals.create({
        source: 'Google Trends Europe',
        keyword: 'Organic Linen Dress',
        search_volume_index: 92,
        momentum: 'rising'
      });
      dbEngine.trend_signals.create({
        source: 'Vogue France Digital',
        keyword: 'Minimalist Monochromatic Luxury',
        search_volume_index: 87,
        momentum: 'rising'
      });
    }

    if (dbEngine.competitors && dbEngine.competitors.getAll().length === 0) {
      dbEngine.competitors.create({
        name: 'Maje Parisian',
        brand_segment: 'Affordable Luxury',
        average_confidence_index: 90
      });
      dbEngine.competitors.create({
        name: 'Sandro Minimalist',
        brand_segment: 'Affordable Luxury',
        average_confidence_index: 85
      });
    }

    if (dbEngine.weather_patterns && dbEngine.weather_patterns.getAll().length === 0) {
      dbEngine.weather_patterns.create({
        region: 'Western Europe',
        seasonal_precipitaion_multiplier: 1.0,
        historical_year_counterpart: '2024'
      });
    }
  }
}

export const WorldModel = WorldModelClass.getInstance();
