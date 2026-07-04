/**
 * 🧠 SIDEKICK V2 - 真正像 Shopify 一样聪明的 AI
 * 
 * 关键改进：
 * 1. 不主动堆砌数据 - 让用户引导对话
 * 2. 理解真实意图 - "你好"就是打招呼，不要乱讲数据
 * 3. 精准问诊 - 通过问题发现用户真实需求
 * 4. 深度分析 - 当用户提问时才做复杂分析
 * 5. 学习记忆 - 记住用户的历史决策
 */

import { GoogleGenAI } from "@google/genai";

export interface SidekickContext {
  tenantId: string;
  storeId: string;
  storeName: string;
  
  // 当前指标快照
  metrics: {
    gmvToday: number;
    ordersToday: number;
    conversionRate: number;
    averageOrderValue: number;
    lowStockSkuCount: number;
    refundRate: number;
    churnedCustomersCount: number;
  };

  // 最近的商业事件（用于理解上下文）
  recentEvents: Array<{
    timestamp: string;
    type: "order" | "refund" | "inventory_alert" | "price_change";
    description: string;
  }>;

  // 用户的历史决策（让AI学习风格）
  decisionHistory: Array<{
    date: string;
    question: string;
    recommendation: string;
    result: string; // "positive" | "negative" | "neutral"
  }>;
}

export interface SidekickResponse {
  // 核心回复
  message: string;

  // 这个回复的类型
  type: "greeting" | "question_diagnostic" | "analysis" | "recommendation" | "simple_query" | "general";

  // 如果是诊断问题，这里是智能问题列表
  followUpQuestions?: string[];

  // 如果有推荐，这里是行动按钮
  suggestedActions?: Array<{
    label: string;
    action: string;
    intent: string; // 用户点击这个按钮时的"意图信号"
  }>;

  // AI 的"思考过程"（用于调试）
  thinking?: {
    intent: string;
    confidence: number;
    reasoning: string;
  };
}

export class SidekickV2Engine {
  private aiClient: GoogleGenAI | null;

  constructor(aiClient: GoogleGenAI | null) {
    this.aiClient = aiClient;
  }

  /**
   * 检查是否为简单的打招呼
   */
  private isGreeting(message: string): boolean {
    const lower = message.trim().toLowerCase();
    const greetings = [
      'hi', 'hello', 'hey', '你好', '您好', '早', '早安', '早上好', '下午好', '晚上好', '哈喽', 'hola', 'greetings', 'yo', '在吗', '有人吗'
    ];
    if (lower.length <= 12) {
      return greetings.some(g => lower.includes(g));
    }
    return false;
  }

  /**
   * 核心方法：智能回复
   * 不是每次都做复杂分析，而是根据情况决定
   */
  async respond(
    userMessage: string,
    context: SidekickContext
  ): Promise<SidekickResponse> {
    // 优先用精确的本地打招呼逻辑，绝对不堆砌数据
    if (this.isGreeting(userMessage)) {
      return this.handleGreeting(context);
    }

    // 第1步：分类用户消息类型
    const messageType = this.classifyMessage(userMessage);

    console.log(`[Sidekick] 消息类型: ${messageType}`);

    switch (messageType) {
      case "greeting":
        // 用户只是打招呼 → 简短回复 + 问诊问题
        return this.handleGreeting(context);

      case "simple_query":
        // 用户问一个简单问题 → 快速回复 + 相关数据
        return this.handleSimpleQuery(userMessage, context);

      case "complex_analysis":
        // 用户要求深度分析 → 多层推理
        return this.handleComplexAnalysis(userMessage, context);

      case "decision_request":
        // 用户要求建议 → 给出推荐
        return this.handleDecisionRequest(userMessage, context);

      default:
        return this.handleGeneral(userMessage, context);
    }
  }

  /**
   * 分类消息类型
   */
  private classifyMessage(
    message: string
  ): "greeting" | "simple_query" | "complex_analysis" | "decision_request" | "general" {
    const lower = message.toLowerCase().trim();

    // 简单的启发式分类
    if (this.isGreeting(message)) {
      return "greeting";
    }

    if (
      lower.includes("多少") ||
      lower.includes("几个") ||
      lower.includes("number") ||
      lower.includes("count")
    ) {
      return "simple_query";
    }

    if (
      lower.includes("为什么") ||
      lower.includes("如何") ||
      lower.includes("怎样") ||
      lower.includes("分析") ||
      lower.includes("why") ||
      lower.includes("how")
    ) {
      return "complex_analysis";
    }

    if (
      lower.includes("应该") ||
      lower.includes("建议") ||
      lower.includes("要不要") ||
      lower.includes("should") ||
      lower.includes("recommend")
    ) {
      return "decision_request";
    }

    return "general";
  }

  /**
   * ✅ 处理打招呼
   * 关键：简短、亲切、等待用户导向
   */
  private handleGreeting(context: SidekickContext): SidekickResponse {
    const greetings = [
      `你好！👋 有什么我能帮你的吗？😊`,
      `嘿！我是 Sidekick。今天想聊聊我们店铺的经营状况吗？`,
      `早上好！☀️ 随时为您效劳，有什么问题需要帮您诊断吗？`,
    ];

    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    // 智能问诊问题（基于最近的数据）
    const followUpQuestions = this.generateDiagnosticQuestions(context);

    return {
      message: `${greeting}

您可以提问我关于：
- 📊 **销售分析** （如："今天销量怎么样？"）
- 📦 **库存管理** （如："有低库存商品需要补货吗？"）
- 🏷️ **活动策划** （如："怎么提升这周的客单价？"）`,
      type: "greeting",
      followUpQuestions,
    };
  }

  /**
   * ❓ 生成诊断问题
   * 这些问题帮助用户自己说出真实需求
   */
  private generateDiagnosticQuestions(context: SidekickContext): string[] {
    const questions: string[] = [];

    // 基于当前指标生成问题
    if (context.metrics.lowStockSkuCount > 0) {
      questions.push(`我们目前有 ${context.metrics.lowStockSkuCount} 个低库存商品。需要我帮您分析一下补货计划吗？`);
    }

    if (context.metrics.gmvToday < 500) {
      questions.push("今天销售表现偏低，要不要让我帮您诊断一下转化率和流失点？");
    }

    if (context.metrics.refundRate > 0.08) {
      questions.push(`近期退款率为 ${(context.metrics.refundRate * 100).toFixed(1)}%，稍微有点高。想看看是哪些商品引起的退款吗？`);
    }

    if (context.metrics.churnedCustomersCount > 2) {
      questions.push(
        `有 ${context.metrics.churnedCustomersCount} 个客户最近 30 天未下单，要策划一个召回活动吗？`
      );
    }

    // 如果没有紧迫问题，问通用的
    if (questions.length === 0) {
      questions.push("要我帮你看一下这周的销售趋势吗？");
      questions.push("最近的营销活动效果怎么样？");
    }

    return questions.slice(0, 2); // 只返回2个问题
  }

  /**
   * 📊 处理简单查询
   * "今天多少销售额？" "库存还有多少？"
   */
  private handleSimpleQuery(
    userMessage: string,
    context: SidekickContext
  ): SidekickResponse {
    const lower = userMessage.toLowerCase();
    let message = "";

    if (
      lower.includes("销") ||
      lower.includes("gmv") ||
      lower.includes("revenue")
    ) {
      message = `今天的销售额是 **€${context.metrics.gmvToday}**，共 ${context.metrics.ordersToday} 笔订单。`;
    } else if (lower.includes("库存") || lower.includes("stock")) {
      message = `当前有 **${context.metrics.lowStockSkuCount}** 个商品库存不足。要我为你制定智能补货计划吗？`;
    } else if (lower.includes("退款") || lower.includes("refund")) {
      message = `本周退款率是 **${(context.metrics.refundRate * 100).toFixed(1)}%**。`;
    } else if (lower.includes("客户") || lower.includes("customer")) {
      message = `有 **${context.metrics.churnedCustomersCount}** 个活跃客户最近没有下单。`;
    } else {
      message = `我看到你在问关于 "${userMessage}" 的问题。要我帮你深入分析吗？`;
    }

    return {
      message,
      type: "simple_query",
      suggestedActions: [
        {
          label: "📊 深入分析",
          action: "analyze_deeper",
          intent: "request_detailed_analysis",
        },
        {
          label: "💡 给我建议",
          action: "get_recommendation",
          intent: "request_recommendation",
        },
      ],
    };
  }

  /**
   * 🔍 处理复杂分析
   * "为什么销量下降了？" "怎样优化库存？"
   */
  private async handleComplexAnalysis(
    userMessage: string,
    context: SidekickContext
  ): Promise<SidekickResponse> {
    if (!this.aiClient) {
      return this.handleComplexAnalysisLocal(userMessage, context);
    }

    try {
      const prompt = `你是一个精通电商的AI分析师。用户问: "${userMessage}"

店铺当前状况:
- 今日GMV: €${context.metrics.gmvToday}
- 订单数: ${context.metrics.ordersToday}
- 低库存SKU: ${context.metrics.lowStockSkuCount}
- 转化率: ${(context.metrics.conversionRate * 100).toFixed(1)}%
- 退款率: ${(context.metrics.refundRate * 100).toFixed(1)}%
- 流失客户: ${context.metrics.churnedCustomersCount}

请：
1. 分析用户想了解什么
2. 基于数据给出简洁但有深度的分析
3. 提出一个可行的改进方向

返回 JSON:
{
  "analysis": "你的分析（2-3句话）",
  "rootCause": "根本原因",
  "suggestion": "改进建议",
  "confidence": 0.85
}

只返回 JSON。`;

      const response = await this.aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          temperature: 0.3,
          responseMimeType: "application/json"
        },
      });

      const result = JSON.parse(response.text || "{}");

      let message = `### 🔍 分析结果\n\n`;
      message += `**现象:** ${result.analysis || "店铺表现诊断"}\n\n`;
      message += `**根本原因:** ${result.rootCause || "数据近期正常波动"}\n\n`;
      message += `**改进建议:** ${result.suggestion || "建议密切关注高频出单品"}\n`;

      return {
        message,
        type: "analysis",
        thinking: {
          intent: userMessage,
          confidence: result.confidence || 0.8,
          reasoning: result.analysis || "进行电商指标逻辑交叉比对",
        },
      };
    } catch (error) {
      console.warn("[Sidekick] API分析失败，使用本地引擎:", error);
      return this.handleComplexAnalysisLocal(userMessage, context);
    }
  }

  /**
   * 本地复杂分析（没有API时）
   */
  private handleComplexAnalysisLocal(
    userMessage: string,
    context: SidekickContext
  ): SidekickResponse {
    let message = `### 🔍 分析结果\n\n`;

    if (
      userMessage.includes("为什么") &&
      (userMessage.includes("销") || userMessage.includes("销售") || userMessage.includes("下降"))
    ) {
      if (context.metrics.gmvToday < 500) {
        message += `**现象:** 今日销售额偏低 (€${context.metrics.gmvToday})\n\n`;
        message += `**可能原因:**\n- 缺少爆款主推活动\n- 客户在加购后流失\n- 低水位库存商品缺货，导致用户无从下单\n\n`;
        message += `**建议:** 制定一个针对高价值流失客户的限时召回优惠活动。`;
      } else {
        message += `**现象:** 销量整体健康，但局部品类有被稀释迹象。\n\n`;
        message += `**建议:** 我们建议查看一下周度对比和每个品类的转化率，精细化配置。`;
      }
    } else if (
      userMessage.includes("为什么") &&
      userMessage.includes("库存")
    ) {
      message += `**根本原因:** 当前店铺有 ${context.metrics.lowStockSkuCount} 个热销商品库存不足，这导致潜在的销售损失。\n\n`;
      message += `**建议:** 分析一下哪些 SKU 销速最快，并一键制定补货采购单。`;
    } else {
      message += `这是一个很有价值的店铺经营视角。我们可以通过查看具体的销售漏斗来确认原因。`;
    }

    return {
      message,
      type: "analysis",
    };
  }

  /**
   * 💡 处理决策请求
   * "我应该降价吗？" "要不要启动促销？"
   */
  private async handleDecisionRequest(
    userMessage: string,
    context: SidekickContext
  ): Promise<SidekickResponse> {
    // 快速决策框架
    let message = `### 💡 我的建议\n\n`;

    if (
      userMessage.includes("降价") ||
      userMessage.includes("打折")
    ) {
      if (context.metrics.conversionRate > 0.025) {
        message += `**现在不需要盲目降价。** 你的转化率已经很好了 (${(context.metrics.conversionRate * 100).toFixed(1)}%)。\n\n`;
        message += `**更优解是:** 保持标价以保住产品的高端调性与利润。您可以选择发放满减券的形式，定向给特定高流失人群。`;
      } else {
        message += `**可以考虑特定款小幅降价。** 店铺当前转化率只有 ${(context.metrics.conversionRate * 100).toFixed(1)}%，可能有价格劣势。\n\n`;
        message += `**建议路径:** 对比相似竞品的定价，小幅测试 5-10% 的限时折扣，看是否能明显撬动订单。`;
      }
    } else if (
      userMessage.includes("促销") ||
      userMessage.includes("活动")
    ) {
      if (context.metrics.churnedCustomersCount > 2) {
        message += `**非常建议启动召回型促销！** 你有 ${context.metrics.churnedCustomersCount} 个客户近期未下单，促销是唤醒他们的黄金武器。\n\n`;
        message += `**行动路径:** 制作一张专属召回优惠券，并由主动神经系统通过邮件和短信自动触达。`;
      } else {
        message += `**可以试试，但建议精准定向。** 当前老客户复购活跃，我们可以为热销品追加搭配促销以提高客单价。`;
      }
    } else {
      message += `这需要结合您当前的利润指标进行权衡。需要我帮您推演一下促销前后的收益差别吗？`;
    }

    return {
      message,
      type: "recommendation",
      suggestedActions: [
        {
          label: "👍 一键采纳并执行",
          action: "execute",
          intent: "user_confirmed",
        },
        {
          label: "❓ 稍后手动配置",
          action: "defer",
          intent: "user_undecided",
        },
      ],
    };
  }

  /**
   * 🔧 处理一般消息
   */
  private handleGeneral(
    userMessage: string,
    context: SidekickContext
  ): SidekickResponse {
    return {
      message: `我了解您在关注 "${userMessage}"。我可以帮您处理以下方面：
- 📊 **解读店铺运营数据**（解读销量、客单、流失率等指标）
- 📦 **库存配置及智能预警**（智能生成采购配比并提供补货建议）
- 🏷️ **爆款文案及营销策略**（一键生成符合品牌美学的商品详情文案）`,
      type: "general",
      suggestedActions: [
        {
          label: "📊 查看今日业绩",
          action: "navigate",
          intent: "view_dashboard",
        },
        {
          label: "📈 诊断健康度",
          action: "analyze",
          intent: "request_trend_analysis",
        },
      ],
    };
  }
}

export default SidekickV2Engine;
