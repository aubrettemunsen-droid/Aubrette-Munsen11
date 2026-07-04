/**
 * 💬 SIDEKICK 回复格式化器
 * 
 * 把复杂的分析结果转化为精准、有吸引力的商业对话
 * 像 Shopify 那样：既专业又亲切
 */

import { InferenceResult } from "./sidekick-brain";

export interface FormattedResponse {
  text: string; // 最终显示给用户的文本
  actions: Array<{
    label: string;
    action: "execute" | "navigate" | "view";
    id: string;
  }>;
  metadata: {
    confidence: number;
    thinkingTime: number; // ms
    decisiveness: "high" | "medium" | "low";
  };
}

export class SidekickFormatter {
  /**
   * 格式化推理结果为用户友好的回复
   */
  format(
    inference: InferenceResult,
    thinkingTimeMs: number
  ): FormattedResponse {
    const text = this.buildResponseText(inference);
    const actions = this.buildActionButtons(inference);
    const decisiveness = this.calculateDecisiveness(inference);

    return {
      text,
      actions,
      metadata: {
        confidence: inference.overallConfidence,
        thinkingTime: thinkingTimeMs,
        decisiveness,
      },
    };
  }

  /**
   * 构建主要回复文本
   */
  private buildResponseText(inference: InferenceResult): string {
    // 优先拦截打招呼
    if (
      inference.userIntent.underlying === "greeting" ||
      inference.userIntent.underlying.toLowerCase().includes("greeting") ||
      inference.userIntent.surface.includes("打招呼")
    ) {
      return `你好！我是 Sidekick，您的 AI 商业伙伴。😊

我随时准备协助您管理和优化店铺运营。您可以向我提问有关：
- 📊 **销售与业绩分析**（例如："今天销量怎么样？"）
- 📦 **库存健康检查**（例如："帮我检查低库存商品"）
- ✍️ **商品文案策划**（例如："写一段新包包的描述"）
- 🏷️ **促销活动建议**（例如："制定一个限时优惠活动"）

今天有什么我可以帮您的吗？`;
    }

    let text = "";

    // 第1部分：确认理解
    text += `### 💭 我理解的是\n\n`;
    text += `您想要：**${inference.userIntent.underlying}**\n\n`;
    if (
      inference.userIntent.underlying !== inference.userIntent.surface &&
      inference.userIntent.confidence > 0.75
    ) {
      text += `*(提到的是 "${inference.userIntent.surface}"，结合店铺当前指标，我已将视角转换为更底层的经营切点)*\n\n`;
    }

    // 第2部分：根本原因分析
    text += `### 🔍 根本原因\n\n`;
    text += `**主要驱动因素：** ${inference.rootCauseAnalysis.primaryDriver}\n\n`;
    if (inference.rootCauseAnalysis.secondaryFactors.length > 0) {
      text += `**相关因素：**\n`;
      inference.rootCauseAnalysis.secondaryFactors.forEach((factor) => {
        text += `- ${factor}\n`;
      });
      text += `\n`;
    }

    // 证据点
    if (inference.rootCauseAnalysis.evidencePoints.length > 0) {
      text += `**证据：**\n`;
      inference.rootCauseAnalysis.evidencePoints.forEach((point) => {
        text += `- ${point.metric}: **${point.value}** — ${point.insight}\n`;
      });
      text += `\n`;
    }

    // 第3部分：可选方案
    text += `### 💡 你可以这样做\n\n`;

    inference.options.forEach((opt, idx) => {
      const priorityEmoji =
        opt.priority === "critical"
          ? "🔴"
          : opt.priority === "high"
            ? "🟠"
            : opt.priority === "medium"
              ? "🟡"
              : "🟢";

      text += `**${priorityEmoji} 方案 ${idx + 1}：${opt.option}**\n`;
      text += `*优先级: ${this.getPriorityLabel(opt.priority)} • 耗时: ${opt.timeToImplement}*\n`;

      text += `\n**优势：**\n`;
      opt.pros.forEach((pro) => {
        text += `✓ ${pro}\n`;
      });

      if (opt.cons.length > 0) {
        text += `\n**风险：**\n`;
        opt.cons.forEach((con) => {
          text += `✗ ${con}\n`;
        });
      }

      text += `\n**预期效果：** ${opt.expectedImpact.metric} 可能 ${opt.expectedImpact.expectedChange} （确定度 ${(opt.expectedImpact.confidence * 100).toFixed(0)}%）\n\n`;
      text += `---\n\n`;
    });

    // 第4部分：我的推荐
    text += `### ⭐ 我的建议\n\n`;
    text += `**现在就做这个：${inference.recommendation.action}**\n\n`;
    text += `**为什么？** ${inference.recommendation.rationale}\n\n`;

    if (inference.recommendation.steps.length > 0) {
      text += `**具体步骤：**\n`;
      inference.recommendation.steps.forEach((step) => {
        text += `${step}\n`;
      });
      text += `\n`;
    }

    text += `**预期结果：** ${inference.recommendation.expectedOutcome}\n\n`;

    // 第5部分：信心度说明
    const confidence = inference.overallConfidence;
    const confidenceText =
      confidence > 0.85
        ? "我对这个分析非常有信心"
        : confidence > 0.7
          ? "我对这个分析比较有信心，建议边执行边监控成效"
          : "这是初步分析，建议在积累更多数据后再行决策";

    text += `---\n\n*${confidenceText} (分析信心度: ${(confidence * 100).toFixed(0)}%)*`;

    return text;
  }

  /**
   * 构建行动按钮
   */
  private buildActionButtons(inference: InferenceResult): FormattedResponse["actions"] {
    if (
      inference.userIntent.underlying === "greeting" ||
      inference.userIntent.underlying.toLowerCase().includes("greeting") ||
      inference.userIntent.surface.includes("打招呼")
    ) {
      return [
        {
          label: "📊 分析今日销售",
          action: "execute",
          id: "analyze_sales",
        },
        {
          label: "📦 检查库存水平",
          action: "execute",
          id: "check_inventory",
        },
        {
          label: "🏷️ 设计限时大促",
          action: "execute",
          id: "suggest_discount",
        }
      ];
    }

    const actions: FormattedResponse["actions"] = [];

    // 推荐方案的行动按钮
    if (inference.recommendation.action) {
      actions.push({
        label: `⭐ 立即执行：${inference.recommendation.action}`,
        action: "execute",
        id: "execute_recommendation",
      });
    }

    // 其他可选方案
    inference.options.slice(0, 2).forEach((opt, idx) => {
      if (opt.option !== inference.recommendation.action) {
        actions.push({
          label: `${idx === 0 ? "或者试试" : "也可以"}：${opt.option}`,
          action: "execute",
          id: `option_${idx}`,
        });
      }
    });

    // 导航按钮（查看相关数据）
    actions.push({
      label: "📊 查看详细数据",
      action: "navigate",
      id: "view_analytics",
    });

    return actions;
  }

  /**
   * 计算决策性
   */
  private calculateDecisiveness(inference: InferenceResult): "high" | "medium" | "low" {
    const confidence = inference.overallConfidence;
    const optionsCount = inference.options.length;
    const hasRecommendation = !!inference.recommendation.action;

    if (confidence > 0.8 && hasRecommendation && optionsCount <= 3) {
      return "high";
    } else if (confidence > 0.65) {
      return "medium";
    } else {
      return "low";
    }
  }

  /**
   * 获取优先级标签
   */
  private getPriorityLabel(priority: string): string {
    switch (priority) {
      case "critical":
        return "🚨 紧急";
      case "high":
        return "⚡ 高";
      case "medium":
        return "📌 中";
      default:
        return "📋 低";
    }
  }
}

export default SidekickFormatter;
