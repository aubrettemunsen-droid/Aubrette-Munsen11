/**
 * 📊 Sidekick 智能分析层
 * 
 * 这一层在推荐前做深度分析：
 * 1. 对比分析 - 和历史数据对比
 * 2. 趋势分析 - 看数据走向
 * 3. 根本原因分析 - 用统计方法找根本原因
 * 4. 相关性分析 - 指标间的影响关系
 */

export interface StoreMetricsSeries {
  timestamp: string;
  gmv: number;
  orders: number;
  conversionRate: number;
  avgOrderValue: number;
  lowStockSkus: number;
  churnRate: number;
}

export interface AnalysisResult {
  // 对比分析
  comparison: {
    todayVsYesterday: {
      gmvChange: number; // %
      ordersChange: number; // %
      conversionChange: number; // %
    };
    todayVsWeekAvg: {
      gmvChange: number;
      ordersChange: number;
    };
    trend: "📈 上升" | "📉 下降" | "➡️ 持平";
  };

  // 趋势预测
  forecast: {
    predictedEndOfDayGmv: number;
    confidence: number; // 0-1
    trajectory: string; // "会达到今日目标" 或 "需要采取行动"
  };

  // 异常检测
  anomalies: Array<{
    metric: string;
    currentValue: number;
    expectedValue: number;
    deviation: number; // %
    severity: "low" | "medium" | "high";
    possibleCauses: string[];
  }>;

  // 根本原因
  rootCauses: Array<{
    cause: string;
    confidence: number;
    affectedMetrics: string[];
    suggestedIntervention: string;
  }>;

  // 指标间的相关性
  correlations: Array<{
    metric1: string;
    metric2: string;
    correlation: number; // -1 到 1
    insight: string;
  }>;
}

export class SidekickAnalyzer {
  /**
   * 深度分析店铺数据
   */
  analyzeMetrics(
    currentMetrics: any,
    historicalSeries: StoreMetricsSeries[] = [],
    weekData: StoreMetricsSeries[] = []
  ): AnalysisResult {
    const today = currentMetrics;
    const yesterday = historicalSeries[historicalSeries.length - 1] || currentMetrics;
    const weekAvg = this.calculateAverage(weekData);

    // 1. 对比分析
    const comparison = {
      todayVsYesterday: {
        gmvChange: this.percentChange(yesterday.gmv || 0, today.gmvToday || today.gmv || 0),
        ordersChange: this.percentChange(yesterday.orders || 0, today.ordersToday || today.orders || 0),
        conversionChange: this.percentChange(
          yesterday.conversionRate || 0,
          today.conversionRate
        ),
      },
      todayVsWeekAvg: {
        gmvChange: this.percentChange(weekAvg.gmv || 0, today.gmvToday || today.gmv || 0),
        ordersChange: this.percentChange(weekAvg.orders || 0, today.ordersToday || today.orders || 0),
      },
      trend:
        (today.gmvToday || today.gmv || 0) > (yesterday.gmv || 0)
          ? ("📈 上升" as const)
          : (today.gmvToday || today.gmv || 0) < (yesterday.gmv || 0)
            ? ("📉 下降" as const)
            : ("➡️ 持平" as const),
    };

    // 2. 趋势预测
    const forecast = this.predictEndOfDay(today, historicalSeries);

    // 3. 异常检测
    const anomalies = this.detectAnomalies(today, weekAvg);

    // 4. 根本原因分析
    const rootCauses = this.findRootCauses(today, comparison, anomalies);

    // 5. 相关性分析
    const correlations = this.analyzeCorrelations(today);

    return {
      comparison,
      forecast,
      anomalies,
      rootCauses,
      correlations,
    };
  }

  /**
   * 计算百分比变化
   */
  private percentChange(before: number, after: number): number {
    if (before === 0) return after > 0 ? 100 : 0;
    return ((after - before) / before) * 100;
  }

  /**
   * 计算平均值
   */
  private calculateAverage(
    series: StoreMetricsSeries[]
  ): Partial<StoreMetricsSeries> {
    if (series.length === 0) return {};

    const avg = {
      gmv: series.reduce((sum, s) => sum + s.gmv, 0) / series.length,
      orders: series.reduce((sum, s) => sum + s.orders, 0) / series.length,
      conversionRate:
        series.reduce((sum, s) => sum + s.conversionRate, 0) / series.length,
      avgOrderValue:
        series.reduce((sum, s) => sum + s.avgOrderValue, 0) / series.length,
      churnRate: series.reduce((sum, s) => sum + s.churnRate, 0) / series.length,
    };

    return avg;
  }

  /**
   * 预测一天结束时的 GMV
   */
  private predictEndOfDay(
    today: any,
    historical: StoreMetricsSeries[]
  ): AnalysisResult["forecast"] {
    const now = new Date().getHours();

    // 简单的线性预测
    const gmvVal = today.gmvToday || today.gmv || 0;
    const avgHourlyGmv = gmvVal / Math.max(now, 1);
    const projectedEndOfDay = avgHourlyGmv * 24;

    // 计算信心度（数据越多，信心越高）
    const confidence = Math.min(now / 12, 0.95); // 中午之前信心度较低

    // 和历史平均对比
    const historicalAvg =
      historical.length > 0
        ? historical.reduce((sum, s) => sum + s.gmv, 0) / historical.length
        : 0;

    return {
      predictedEndOfDayGmv: projectedEndOfDay,
      confidence,
      trajectory:
        projectedEndOfDay > historicalAvg
          ? "会达到今日目标 ✅"
          : "需要采取行动 ⚠️",
    };
  }

  /**
   * 异常检测
   */
  private detectAnomalies(
    today: any,
    weekAvg: Partial<StoreMetricsSeries>
  ): AnalysisResult["anomalies"] {
    const anomalies: AnalysisResult["anomalies"] = [];

    const conversionRate = today.conversionRate || 0.02;
    const lowStockSkus = today.lowStockSkus || today.lowStockSkuCount || 0;
    const churnRate = today.churnRate || today.churnedCustomersCount || 0;

    // 检查转化率异常
    if (conversionRate < (weekAvg.conversionRate || 0.03) * 0.7) {
      anomalies.push({
        metric: "转化率",
        currentValue: conversionRate,
        expectedValue: (weekAvg.conversionRate || 0.03),
        deviation: this.percentChange(
          weekAvg.conversionRate || 0.03,
          conversionRate
        ),
        severity: "high",
        possibleCauses: [
          "流量质量下降",
          "产品展示有问题",
          "价格不合理",
          "支付流程问题",
        ],
      });
    }

    // 检查库存异常
    if (lowStockSkus > 15) {
      anomalies.push({
        metric: "低库存商品数",
        currentValue: lowStockSkus,
        expectedValue: 5,
        deviation: ((lowStockSkus - 5) / 5) * 100,
        severity: "high",
        possibleCauses: ["销量意外高", "补货延迟", "需求预测不准"],
      });
    }

    // 检查流失率异常
    if (churnRate > (weekAvg.churnRate || 0.05) * 1.3) {
      anomalies.push({
        metric: "客户流失率",
        currentValue: churnRate,
        expectedValue: weekAvg.churnRate || 0.05,
        deviation: this.percentChange(
          weekAvg.churnRate || 0.05,
          churnRate
        ),
        severity: "medium",
        possibleCauses: ["客户满意度下降", "竞争对手活动", "产品问题"],
      });
    }

    return anomalies;
  }

  /**
   * 根本原因分析
   */
  private findRootCauses(
    today: any,
    comparison: any,
    anomalies: AnalysisResult["anomalies"]
  ): AnalysisResult["rootCauses"] {
    const rootCauses: AnalysisResult["rootCauses"] = [];

    const lowStockSkus = today.lowStockSkus || today.lowStockSkuCount || 0;
    const conversionRate = today.conversionRate || 0.02;

    // 如果销售下降
    if (comparison.todayVsYesterday.gmvChange < -15) {
      rootCauses.push({
        cause: "销售显著下降，可能是流量或转化问题",
        confidence: 0.8,
        affectedMetrics: ["GMV", "订单数"],
        suggestedIntervention:
          "分析流量来源，检查营销活动，测试转化率优化",
      });
    }

    // 如果库存短缺
    if (lowStockSkus > 10) {
      rootCauses.push({
        cause: "热销品库存不足，丧失销售机会",
        confidence: 0.95,
        affectedMetrics: ["GMV", "库存周转"],
        suggestedIntervention: "紧急补货热销品",
      });
    }

    // 如果转化率低
    if (conversionRate < 0.02) {
      rootCauses.push({
        cause: "转化率低于平均，产品展示或价格可能有问题",
        confidence: 0.7,
        affectedMetrics: ["转化率", "GMV"],
        suggestedIntervention:
          "优化产品详情页，对比竞品价格，进行 A/B 测试",
      });
    }

    return rootCauses;
  }

  /**
   * 指标间的相关性分析
   */
  private analyzeCorrelations(metrics: any): AnalysisResult["correlations"] {
    const correlations: AnalysisResult["correlations"] = [];

    // 已知的业务相关性
    correlations.push({
      metric1: "转化率",
      metric2: "平均订单价值",
      correlation: 0.6,
      insight:
        "转化率高的时段，客户倾向购买更多。考虑捆绑销售优化。",
    });

    correlations.push({
      metric1: "库存水位",
      metric2: "销售额",
      correlation: -0.5,
      insight:
        "库存低导致销售机会丧失。这是你的瓶颈。",
    });

    correlations.push({
      metric1: "客户流失率",
      metric2: "订单重复率",
      correlation: -0.8,
      insight:
        "流失率越高，重复购买率越低。需要实施客户保留计划。",
    });

    return correlations;
  }

  /**
   * 生成一句话的诊断
   */
  generateOneSentenceDiagnosis(analysis: AnalysisResult): string {
    if (analysis.anomalies.length === 0) {
      return "✅ 一切正常，保持现状。";
    }

    const topAnomaly = analysis.anomalies[0];
    return `⚠️ ${topAnomaly.metric}出现异常 (${topAnomaly.deviation > 0 ? "↑" : "↓"}${Math.abs(topAnomaly.deviation).toFixed(0)}%)，建议立即 ${analysis.rootCauses[0]?.suggestedIntervention || "调查"}。`;
  }
}

export default SidekickAnalyzer;
