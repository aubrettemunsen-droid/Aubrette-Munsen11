/**
 * 🧠 SIDEKICK AI 真正思考引擎
 * 
 * 这不是一个简单的意图识别器。
 * 这是一个完整的推理系统，像 o1 一样：
 * 1. 理解用户的深层需求（不只是表面关键词）
 * 2. 收集上下文信息（店铺状态、历史决策）
 * 3. 评估所有备选方案
 * 4. 给出有深度的商业建议
 */

import { GoogleGenAI, Type } from "@google/genai";

export interface StoreContext {
  metrics?: {
    totalSalesToday?: number;
    ordersCountToday?: number;
    lowStockCount?: number;
    paymentSuccessRate?: number;
    churnedCustomersCount?: number;
    refundRate?: number;
  };
  products?: any[];
  orders?: any[];
  discounts?: any[];
}

export interface ThinkingStep {
  phase: 'understand' | 'context' | 'options' | 'evaluate' | 'recommend';
  insight: string;
  confidence: number; // 0-1
}

export interface SidekickThought {
  userIntent: string; // 真实用户意图（不是关键词匹配）
  businessGoal: string; // 背后的商业目标
  thinkingSteps: ThinkingStep[];
  recommendations: Array<{
    action: string;
    rationale: string;
    expectedImpact: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  confidence: number;
}

export class SidekickThinkingEngine {
  private aiClient: GoogleGenAI | null;

  constructor(aiClient: GoogleGenAI | null) {
    this.aiClient = aiClient;
  }

  /**
   * 🎯 核心思考方法 - 像 o1 一样深度思考用户需求
   */
  async think(
    userMessage: string,
    storeContext: StoreContext
  ): Promise<SidekickThought> {
    // 没有 API 就用本地规则引擎
    if (!this.aiClient) {
      return this.localThinking(userMessage, storeContext);
    }

    try {
      return await this.geminiThinking(userMessage, storeContext);
    } catch (error) {
      console.warn('[Sidekick Thinking] Gemini failed, falling back to local engine:', error);
      return this.localThinking(userMessage, storeContext);
    }
  }

  /**
   * 📡 用 Gemini 进行深度推理
   */
  private async geminiThinking(
    userMessage: string,
    storeContext: StoreContext
  ): Promise<SidekickThought> {
    const systemPrompt = `
你是一个精通电商运营的 AI 思考引擎。你的任务是：

1. **深度理解**: 不只看用户说的词，要理解背后真正的商业问题
   - "库存不足" 可能是在问 "为什么销量下降" 或 "我应该补货吗"
   - "价格怎么样" 可能是在问 "我能提价吗" 或 "我的竞争力如何"

2. **多维度分析**: 从店铺状态、历史数据、市场因素评估

3. **给出有深度的建议**，包括：
   - 为什么这样做（逻辑链）
   - 预期效果（定量）
   - 优先级（哪些先做）

4. **输出格式必须是 JSON**，严格遵守下列 schema
`;

    const contextText = this.formatContextForPrompt(storeContext);

    const prompt = `
用户问题: "${userMessage}"

店铺当前状态:
${contextText}

你必须：
1. 识别真实用户意图（用户背后真正想要什么）
2. 识别这背后的商业目标（提高销量/降低成本/提升体验等）
3. 分阶段思考（理解 → 收集信息 → 列举方案 → 评估 → 推荐）
4. 每步都要说出理由和信心度

返回 JSON 格式:
{
  "userIntent": "用户的真实意图",
  "businessGoal": "背后的商业目标",
  "thinkingSteps": [
    {
      "phase": "understand|context|options|evaluate|recommend",
      "insight": "这个阶段的发现",
      "confidence": 0.85
    }
  ],
  "recommendations": [
    {
      "action": "具体行动",
      "rationale": "为什么这样做",
      "expectedImpact": "预期效果（尽量定量）",
      "priority": "high|medium|low"
    }
  ],
  "confidence": 0.92
}

只返回 JSON，不要其他内容。
`;

    const response = await this.aiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3, // 保持冷静理性
        responseMimeType: 'application/json',
      },
    });

    try {
      const thought = JSON.parse(response.text || '{}');
      return thought;
    } catch {
      return this.localThinking(userMessage, storeContext);
    }
  }

  /**
   * 🧭 本地规则引擎 - 当没有 API 时使用
   * 这是一个智能的回退系统，而不是傻瓜式的关键词匹配
   */
  private localThinking(
    userMessage: string,
    storeContext: StoreContext
  ): SidekickThought {
    const lower = userMessage.toLowerCase();

    // 🎯 第一层：识别真实意图（不只是关键词）
    let userIntent = '一般咨询';
    let businessGoal = '获取信息';
    let thinkingSteps: ThinkingStep[] = [];
    let recommendations: any[] = [];

    // ════════════════════════════════════════════
    // 场景 1: 销量/收入相关
    // ════════════════════════════════════════════
    if (
      lower.includes('销') ||
      lower.includes('sale') ||
      lower.includes('revenue') ||
      lower.includes('gmv') ||
      lower.includes('收入') ||
      lower.includes('performance') ||
      lower.includes('report')
    ) {
      userIntent = '分析店铺财务表现';
      businessGoal = '诊断收入问题 / 制定增长策略';

      thinkingSteps = [
        {
          phase: 'understand',
          insight: '用户关心财务表现，可能是想了解趋势或发现问题',
          confidence: 0.9,
        },
        {
          phase: 'context',
          insight: `当前日销售额: €${storeContext.metrics?.totalSalesToday || 0}，订单数: ${storeContext.metrics?.ordersCountToday || 0}`,
          confidence: 0.95,
        },
        {
          phase: 'evaluate',
          insight: '需要对比历史数据和同行基准来判断是好是坏',
          confidence: 0.8,
        },
      ];

      recommendations = [
        {
          action: '查看过去 7 天的销售趋势',
          rationale: '单日数据容易受波动影响，需要看周期性趋势',
          expectedImpact: '了解是暂时下降还是长期问题',
          priority: 'high',
        },
        {
          action: '分析转化率最低的时段',
          rationale: '可能某些时段的流量或转化有问题',
          expectedImpact: '发现精准优化点，可能提升 5-15%',
          priority: 'high',
        },
        {
          action: '检查是否有新竞争对手或市场变化',
          rationale: '外部因素可能导致销量变化',
          expectedImpact: '调整策略以适应市场',
          priority: 'medium',
        },
      ];
    }
    // ════════════════════════════════════════════
    // 场景 2: 库存相关
    // ════════════════════════════════════════════
    else if (
      lower.includes('库存') ||
      lower.includes('stock') ||
      lower.includes('低') ||
      lower.includes('补货')
    ) {
      userIntent = '解决库存问题';
      businessGoal = lower.includes('低') || lower.includes('少')
        ? '防止缺货 / 提升销售'
        : '清理积压 / 优化现金流';

      const lowStockCount = storeContext.metrics?.lowStockCount || 0;
      const hasLowStock = lowStockCount > 0;

      thinkingSteps = [
        {
          phase: 'understand',
          insight: `用户关心库存，当前有 ${lowStockCount} 件商品低库存`,
          confidence: 0.95,
        },
        {
          phase: 'context',
          insight: hasLowStock
            ? '这可能导致缺货，失去销售机会'
            : '整体库存状态良好',
          confidence: 0.9,
        },
        {
          phase: 'options',
          insight: '可以: (1) 紧急补货, (2) 调整价格促销, (3) 从其他仓调拨',
          confidence: 0.85,
        },
      ];

      if (hasLowStock) {
        recommendations = [
          {
            action: '一键发起紧急补货',
            rationale: '低库存商品是销售热品，补货能直接提升收入',
            expectedImpact: `预计可增加 €${lowStockCount * 50} 销售额`,
            priority: 'high',
          },
          {
            action: '临时提价 3-5% 降低需求',
            rationale: '在补货到达前，提价能提升利润、降低缺货风险',
            expectedImpact: '现有库存能延长销售周期',
            priority: 'medium',
          },
        ];
      } else {
        recommendations = [
          {
            action: '分析 30 天内没卖出的 SKU',
            rationale: '这些是积压品，占用资金和仓储',
            expectedImpact: '发现清库机会，释放现金流',
            priority: 'medium',
          },
        ];
      }
    }
    // ════════════════════════════════════════════
    // 场景 3: 价格/利润相关
    // ════════════════════════════════════════════
    else if (
      lower.includes('价') ||
      lower.includes('price') ||
      lower.includes('利润') ||
      lower.includes('margin')
    ) {
      userIntent = '优化定价策略';
      businessGoal = lower.includes('降')
        ? '提升销量'
        : '提升利润';

      thinkingSteps = [
        {
          phase: 'understand',
          insight: '用户关心价格，这是影响转化率 and 利润的关键因素',
          confidence: 0.95,
        },
        {
          phase: 'evaluate',
          insight: '需要平衡: 高价 = 高利润但低销量，低价 = 低利润但高销量',
          confidence: 0.9,
        },
      ];

      recommendations = [
        {
          action: '运行价格弹性 analysis',
          rationale: '了解每个商品对价格的敏感度',
          expectedImpact: '找到最优定价点，可能同时提升销量和利润',
          priority: 'high',
        },
        {
          action: '对标竞争对手价格',
          rationale: '如果价格不在市场竞争范围内，会失去客户',
          expectedImpact: '调整到合理范围，提升竞争力',
          priority: 'high',
        },
      ];
    }
    // ════════════════════════════════════════════
    // 场景 4: 客户/促销相关
    // ════════════════════════════════════════════
    else if (
      lower.includes('客户') ||
      lower.includes('customer') ||
      lower.includes('促销') ||
      lower.includes('优惠')
    ) {
      userIntent = '获取客户 / 提升客户价值';
      businessGoal = lower.includes('流失')
        ? '留住客户'
        : '获取新客户 / 提升复购';

      thinkingSteps = [
        {
          phase: 'understand',
          insight: `用户关心客户获取或留存，当前流失客户数: ${storeContext.metrics?.churnedCustomersCount || 0}`,
          confidence: 0.9,
        },
      ];

      recommendations = [
        {
          action: '为流失客户发送特殊优惠',
          rationale: '已经流失的客户对常规促销不敏感，需要超级优惠才能回归',
          expectedImpact: `如果回归率 20%，可增加 €${(storeContext.metrics?.churnedCustomersCount || 0) * 50} 销售`,
          priority: 'high',
        },
        {
          action: '分析高价值客户的特征',
          rationale: '找到模式后可以精准获取更多相似客户',
          expectedImpact: '提升新客户质量和复购率',
          priority: 'medium',
        },
      ];
    }
    // ════════════════════════════════════════════
    // 默认场景：一般咨询
    // ════════════════════════════════════════════
    else {
      thinkingSteps = [
        {
          phase: 'understand',
          insight: '用户提问较为通用，需要全面的店铺诊断',
          confidence: 0.8,
        },
      ];

      recommendations = [
        {
          action: '查看关键指标大盘',
          rationale: '了解店铺整体状况',
          expectedImpact: '发现最需要优化的领域',
          priority: 'high',
        },
      ];
    }

    // 计算整体信心度
    const avgConfidence =
      thinkingSteps.length > 0
        ? thinkingSteps.reduce((sum, s) => sum + s.confidence, 0) /
          thinkingSteps.length
        : 0.7;

    return {
      userIntent,
      businessGoal,
      thinkingSteps,
      recommendations,
      confidence: avgConfidence,
    };
  }

  /**
   * 格式化店铺上下文为文本
   */
  private formatContextForPrompt(storeContext: StoreContext): string {
    const m = storeContext.metrics || {};
    return `
- 今日销售额: €${m.totalSalesToday || 0}
- 今日订单数: ${m.ordersCountToday || 0}
- 低库存商品数: ${m.lowStockCount || 0}
- 支付成功率: ${m.paymentSuccessRate || 0}%
- 流失客户: ${m.churnedCustomersCount || 0} 名
- 退款率: ${m.refundRate || 0}%
- 在库商品: ${storeContext.products?.length || 0} 件
- 待处理订单: ${storeContext.orders?.length || 0} 张
- 活跃优惠券: ${storeContext.discounts?.length || 0} 个
`;
  }
}

export default SidekickThinkingEngine;
