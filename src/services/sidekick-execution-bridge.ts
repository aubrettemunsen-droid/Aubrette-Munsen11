/**
 * 🔌 Sidekick + Execution Kernel 集成层
 * 
 * 这是关键！让 Sidekick 的建议能直接执行
 * 不是"给个建议就完了"，而是"建议 → 执行 → 监控 → 反馈"
 */

import { executionKernel } from "../../backend/execution-kernel";
import SidekickGen3Engine, { SidekickResponse, DialogContext, SidekickResponse as BaseResponse } from "./sidekick-gen3-engine";
import { GoogleGenAI } from "@google/genai";

export interface ExecutableSidekickResponse extends BaseResponse {
  // 可以直接执行的行动列表
  executableActions: Array<{
    id: string;
    title: string;
    description: string;
    tool: string;
    params: any;
    expectedOutcome: string;
    risk: "low" | "medium" | "high";
  }>;

  // 执行这些行动后会产生的影响
  expectedImpact: {
    metric: string;
    currentValue: number;
    expectedValue: number;
    timeframe: string;
  }[];

  // 监控指标（执行后需要监控哪些）
  monitoringMetrics: string[];
}

export class SidekickExecutionBridge {
  private sidekickEngine: SidekickGen3Engine;

  constructor(aiClient: GoogleGenAI | null) {
    this.sidekickEngine = new SidekickGen3Engine(aiClient);
  }

  /**
   * 核心方法：Sidekick 对话 + 可执行的行动
   */
  async chatAndExecute(
    userMessage: string,
    conversationId: string,
    dialogContext: Partial<DialogContext>
  ): Promise<ExecutableSidekickResponse> {
    // 第1步：生成 Sidekick 回复
    const sidekickResponse = await this.sidekickEngine.chat(
      userMessage,
      conversationId,
      dialogContext
    );

    // 第2步：根据建议生成可执行的行动
    const executableActions = this.mapRecommendationsToActions(
      sidekickResponse.recommendations || [],
      dialogContext
    );

    // 第3步：预测影响
    const expectedImpact = this.predictImpact(
      executableActions,
      dialogContext
    );

    // 第4步：确定需要监控的指标
    const monitoringMetrics = this.getMonitoringMetrics(executableActions);

    return {
      ...sidekickResponse,
      executableActions,
      expectedImpact,
      monitoringMetrics,
    };
  }

  /**
   * 将推荐转换为可执行的 Kernel 行动
   */
  private mapRecommendationsToActions(
    recommendations: any[],
    context: Partial<DialogContext>
  ): ExecutableSidekickResponse["executableActions"] {
    const actions: ExecutableSidekickResponse["executableActions"] = [];

    recommendations.forEach((rec) => {
      if (rec.id === "rec_1") {
        // 紧急补货
        actions.push({
          id: "action_restock",
          title: "一键启动补货",
          description: "自动生成补货订单",
          tool: "inventory.createRestockOrder",
          params: {
            skuIds: [], // 这里需要实际的 SKU 列表
            quantity: 50,
            priority: "urgent",
            deliveryTarget: "48h",
          },
          expectedOutcome: "增加 €2000+ 销售额",
          risk: "low",
        });
      }

      if (rec.id === "rec_2") {
        // 临时提价
        actions.push({
          id: "action_price_adjust",
          title: "自动调整低库存商品价格",
          description: "提价 5-8%",
          tool: "inventory.adjustPricing",
          params: {
            skuIds: [],
            priceAdjustmentPercent: 6,
            duration: 72, // 3天
            reason: "low_stock_management",
          },
          expectedOutcome: "提升利润率 10-15%",
          risk: "medium",
        });
      }

      if (rec.id === "rec_3") {
        // 实时促销
        actions.push({
          id: "action_flash_promotion",
          title: "发起时限促销",
          description: "发送优惠通知给待转化客户",
          tool: "marketing.launchFlashPromotion",
          params: {
            discountPercent: 15,
            duration: 4, // 4小时
            targetSegment: "abandoned_cart",
            notificationChannels: ["email", "sms", "push"],
          },
          expectedOutcome: "转化率增加 20-30%",
          risk: "medium",
        });
      }
    });

    return actions;
  }

  /**
   * 预测这些行动的影响
   */
  private predictImpact(
    actions: ExecutableSidekickResponse["executableActions"],
    context: Partial<DialogContext>
  ): ExecutableSidekickResponse["expectedImpact"] {
    const impacts: ExecutableSidekickResponse["expectedImpact"] = [];

    // 如果有补货
    if (actions.some((a) => a.id === "action_restock")) {
      impacts.push({
        metric: "日销售额",
        currentValue: context.realTimeMetrics?.gmvToday || 0,
        expectedValue: (context.realTimeMetrics?.gmvToday || 0) * 1.15,
        timeframe: "24小时内",
      });
    }

    // 如果有提价
    if (actions.some((a) => a.id === "action_price_adjust")) {
      impacts.push({
        metric: "利润率",
        currentValue: 35, // 示例基础利润率
        expectedValue: 38.5,
        timeframe: "立即",
      });
    }

    // 如果有促销
    if (actions.some((a) => a.id === "action_flash_promotion")) {
      impacts.push({
        metric: "转化率",
        currentValue: context.realTimeMetrics?.conversionRate || 0.02,
        expectedValue: (context.realTimeMetrics?.conversionRate || 0.02) * 1.25,
        timeframe: "4小时内",
      });
    }

    return impacts;
  }

  /**
   * 确定需要监控的指标
   */
  private getMonitoringMetrics(
    actions: ExecutableSidekickResponse["executableActions"]
  ): string[] {
    const metrics = new Set<string>();

    actions.forEach((action) => {
      if (action.id === "action_restock") {
        metrics.add("库存水位");
        metrics.add("销售速度");
        metrics.add("日销售额");
      }

      if (action.id === "action_price_adjust") {
        metrics.add("商品销量");
        metrics.add("平均商品价格");
        metrics.add("利润");
      }

      if (action.id === "action_flash_promotion") {
        metrics.add("转化率");
        metrics.add("优惠码使用率");
        metrics.add("销售额");
      }
    });

    return Array.from(metrics);
  }

  /**
   * 执行推荐的行动
   */
  async executeAction(
    actionId: string,
    action: ExecutableSidekickResponse["executableActions"][0],
    context: DialogContext
  ): Promise<{
    success: boolean;
    transactionId: string;
    results: any;
    message: string;
  }> {
    try {
      // 通过 Execution Kernel 执行
      const result = await executionKernel.execute(
        [
          {
            id: actionId,
            tool: action.tool,
            params: action.params,
            status: "pending",
            createdAt: Date.now(),
          },
        ],
        {
          tenantId: context.tenantId,
          storeId: context.storeId,
        },
        {
          parallel: false,
          timeout: 60000,
          captureState: true,
          auditLog: true,
        }
      );

      return {
        success: true,
        transactionId: actionId,
        results: result,
        message: `✅ ${action.title} 已执行！预期效果: ${action.expectedOutcome}`,
      };
    } catch (error: any) {
      console.error("[ExecutionBridge] 执行失败:", error);
      return {
        success: false,
        transactionId: actionId,
        results: error,
        message: `❌ 执行失败: ${error.message}`,
      };
    }
  }

  /**
   * 收集用户反馈（用于学习）
   */
  recordFeedback(
    conversationId: string,
    actionId: string,
    feedback: {
      executed: boolean;
      outcome: "success" | "partial" | "failure";
      impact?: {
        metricName: string;
        previousValue: number;
        newValue: number;
      }[];
      notes?: string;
    }
  ): void {
    console.log(`[ExecutionBridge] 记录反馈:`, {
      conversationId,
      actionId,
      feedback,
    });
  }
}

export default SidekickExecutionBridge;
