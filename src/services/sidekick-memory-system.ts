/**
 * 🧠 SIDEKICK 记忆系统
 * 
 * 让 Sidekick 像人一样，记住用户的决策历史
 * 这样就能学到用户的风格和偏好
 */

export interface Decision {
  id: string;
  timestamp: string;
  
  // 用户的问题
  question: string;
  
  // AI的推荐
  recommendation: string;
  
  // 用户做出的选择
  userChoice: string;
  
  // 结果如何
  result: "success" | "partial" | "fail" | "unknown";
  
  // 用户对这个决策的评价
  feedback?: string;
}

export class SidekickMemorySystem {
  private decisions: Map<string, Decision[]> = new Map();
  private patterns: Map<string, any> = new Map();

  /**
   * 记录一个决策
   */
  recordDecision(tenantId: string, decision: Decision) {
    if (!this.decisions.has(tenantId)) {
      this.decisions.set(tenantId, []);
    }

    this.decisions.get(tenantId)!.push(decision);
    console.log(`[Memory] 记录决策: ${decision.question}`);

    // 更新模式识别
    this.updatePatterns(tenantId);
  }

  /**
   * 获取用户的决策历史
   */
  getHistory(tenantId: string, limit: number = 10): Decision[] {
    const decisions = this.decisions.get(tenantId) || [];
    return decisions.slice(-limit);
  }

  /**
   * 识别用户的决策模式
   * 例如：用户倾向于保守还是激进？
   */
  getUserPattern(tenantId: string): {
    riskProfile: "conservative" | "balanced" | "aggressive";
    successRate: number; // 决策成功的比例
    favoriteActions: string[];
  } {
    return this.patterns.get(tenantId) || {
      riskProfile: "balanced",
      successRate: 0,
      favoriteActions: [],
    };
  }

  /**
   * 根据历史学习，给出更个性化的建议
   */
  async suggestBasedOnHistory(
    tenantId: string,
    currentQuestion: string,
    allOptions: any[]
  ): Promise<{
    recommendedOption: any;
    reasoning: string;
  }> {
    const pattern = this.getUserPattern(tenantId);
    const history = this.getHistory(tenantId, 20);

    // 如果用户历史上倾向于保守，就推荐低风险方案
    let recommendedOption = allOptions[0];
    let reasoning = "";

    if (pattern.riskProfile === "conservative") {
      // 找风险最低的方案
      recommendedOption = allOptions.reduce((prev, curr) => {
        const currRisk = curr.expectedImpact.confidence;
        const prevRisk = prev.expectedImpact.confidence;
        return currRisk > prevRisk ? curr : prev;
      });
      reasoning = `基于你历史上倾向于稳妥的决策风格，我推荐风险较低的方案。`;
    } else if (pattern.riskProfile === "aggressive") {
      // 找收益最高的方案
      recommendedOption = allOptions.reduce((prev, curr) => {
        const currReturn = this.parseExpectedImpact(
          curr.expectedImpact.expectedChange
        );
        const prevReturn = this.parseExpectedImpact(
          prev.expectedImpact.expectedChange
        );
        return currReturn > prevReturn ? curr : prev;
      });
      reasoning = `基于你历史上倾向于大胆尝试的风格，我推荐收益最高的方案。`;
    } else {
      reasoning = `这个选择在收益和风险之间达到了很好的平衡。`;
    }

    return { recommendedOption, reasoning };
  }

  /**
   * 私有方法：更新模式识别
   */
  private updatePatterns(tenantId: string) {
    const decisions = this.decisions.get(tenantId) || [];

    if (decisions.length === 0) {
      return;
    }

    // 计算成功率
    const successCount = decisions.filter((d) => d.result === "success")
      .length;
    const successRate = successCount / decisions.length;

    // 识别风险偏好
    // 如果用户总是选择低风险的建议 → conservative
    // 如果总是选高风险高收益 → aggressive
    let riskProfile: "conservative" | "balanced" | "aggressive" = "balanced";

    if (successRate > 0.7) {
      riskProfile = decisions.some((d) => d.recommendation.includes("保险"))
        ? "conservative"
        : "balanced";
    } else if (successRate < 0.5) {
      // 用户可能倾向于激进，但结果不理想
      riskProfile = "aggressive";
    }

    // 记录最常用的行动
    const actionCounts: { [key: string]: number } = {};
    decisions.forEach((d) => {
      actionCounts[d.userChoice] = (actionCounts[d.userChoice] || 0) + 1;
    });

    const favoriteActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([action]) => action);

    this.patterns.set(tenantId, {
      riskProfile,
      successRate: parseFloat(successRate.toFixed(2)),
      favoriteActions,
    });

    console.log(`[Memory] 模式更新 - 风险偏好: ${riskProfile}, 成功率: ${(successRate * 100).toFixed(0)}%`);
  }

  /**
   * 解析期望收益（从 "+15%" 这样的字符串）
   */
  private parseExpectedImpact(impact: string): number {
    const match = impact.match(/([+-]?\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }
}

export default SidekickMemorySystem;
