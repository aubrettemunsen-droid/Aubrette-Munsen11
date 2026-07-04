/**
 * 🎤 响应生成器
 * 
 * 基于思考引擎的深度分析，生成有商业价值的回复
 * 不是简单的模板拼接，而是真正根据店铺状况定制
 */

import { SidekickThought } from './sidekick-thinking-engine';

export interface SidekickResponse {
  text: string;
  actions: Array<{
    label: string;
    action: 'switch_tab' | 'execute_action' | 'show_data';
    payload?: any;
  }>;
  actionType: string;
  actionMeta: any;
}

export class SidekickResponseGenerator {
  /**
   * 根据思考结果生成回复
   */
  generateResponse(thought: SidekickThought): SidekickResponse {
    let text = '';
    let actions: SidekickResponse['actions'] = [];
    let actionType = 'none';
    let actionMeta: any = null;

    // 根据业务目标生成不同风格的回复
    if (thought.businessGoal.includes('收入') || thought.businessGoal.includes('销')) {
      const res = this.generateRevenueResponse(thought);
      text = res.text || '';
      actions = res.actions || [];
      actionType = res.actionType || 'none';
      actionMeta = res.actionMeta || null;
    } else if (thought.businessGoal.includes('库存')) {
      const res = this.generateInventoryResponse(thought);
      text = res.text || '';
      actions = res.actions || [];
      actionType = res.actionType || 'none';
      actionMeta = res.actionMeta || null;
    } else if (thought.businessGoal.includes('价格') || thought.businessGoal.includes('利润')) {
      const res = this.generatePricingResponse(thought);
      text = res.text || '';
      actions = res.actions || [];
      actionType = res.actionType || 'none';
      actionMeta = res.actionMeta || null;
    } else if (thought.businessGoal.includes('客户')) {
      const res = this.generateCustomerResponse(thought);
      text = res.text || '';
      actions = res.actions || [];
      actionType = res.actionType || 'none';
      actionMeta = res.actionMeta || null;
    } else {
      const res = this.generateDefaultResponse(thought);
      text = res.text || '';
      actions = res.actions || [];
      actionType = res.actionType || 'none';
      actionMeta = res.actionMeta || null;
    }

    return {
      text,
      actions,
      actionType,
      actionMeta,
    };
  }

  /**
   * 💰 收入相关回复
   */
  private generateRevenueResponse(thought: SidekickThought): Partial<SidekickResponse> {
    let text = `### 📊 销售表现分析

根据您的问题，我分析了一下店铺情况：

**核心发现:**
`;

    // 添加思考过程中的关键洞察
    thought.thinkingSteps.forEach((step) => {
      if (step.phase === 'context' || step.phase === 'evaluate' || step.phase === 'understand') {
        text += `\n- ${step.insight}`;
      }
    });

    text += `\n\n**建议行动:**\n`;
    thought.recommendations.forEach((rec) => {
      const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
      text += `\n${priorityEmoji} **${rec.action}**\n`;
      text += `   • 为什么: ${rec.rationale}\n`;
      text += `   • 效果: ${rec.expectedImpact}\n`;
    });

    text += `\n**我的信心度**: ${(thought.confidence * 100).toFixed(0)}%`;

    const actions = thought.recommendations.map((rec, idx) => ({
      label: rec.action,
      action: 'execute_action' as const,
      payload: { action: `revenue_action_${idx}` },
    }));

    return {
      text,
      actions,
      actionType: 'switch_tab',
      actionMeta: 'finance',
    };
  }

  /**
   * 📦 库存相关回复
   */
  private generateInventoryResponse(thought: SidekickThought): Partial<SidekickResponse> {
    let text = `### 📦 库存优化方案

您询问库存问题，我为您分析了对策：

**当前状态:**
`;

    thought.thinkingSteps.forEach((step) => {
      if (step.phase === 'understand' || step.phase === 'context') {
        text += `\n- ${step.insight}`;
      }
    });

    text += `\n\n**可选方案:**\n`;
    thought.recommendations.forEach((rec, idx) => {
      text += `\n**方案 ${idx + 1}: ${rec.action}**\n`;
      text += `- 理由: ${rec.rationale}\n`;
      text += `- 预期: ${rec.expectedImpact}\n`;
      text += `- 优先级: ${rec.priority.toUpperCase()}\n`;
    });

    const actions = thought.recommendations.map((rec, idx) => ({
      label: `执行: ${rec.action}`,
      action: 'execute_action' as const,
      payload: { action: `inventory_action_${idx}` },
    }));

    return {
      text,
      actions,
      actionType: 'switch_tab',
      actionMeta: 'inventory',
    };
  }

  /**
   * 💵 价格相关回复
   */
  private generatePricingResponse(thought: SidekickThought): Partial<SidekickResponse> {
    let text = `### 💵 价格优化建议

根据分析，这是我对定价的看法：

**关键洞察:**
`;

    thought.thinkingSteps.forEach((step) => {
      text += `\n- ${step.insight}`;
    });

    text += `\n\n**优化策略:**\n`;
    thought.recommendations.forEach((rec) => {
      text += `\n✓ **${rec.action}**\n  ${rec.rationale}\n  预期效果: ${rec.expectedImpact}\n`;
    });

    const actions = thought.recommendations.map((_, idx) => ({
      label: `方案 ${idx + 1}`,
      action: 'execute_action' as const,
      payload: { action: `pricing_action_${idx}` },
    }));

    return {
      text,
      actions,
      actionType: 'switch_tab',
      actionMeta: 'products',
    };
  }

  /**
   * 👥 客户相关回复
   */
  private generateCustomerResponse(thought: SidekickThought): Partial<SidekickResponse> {
    let text = `### 👥 客户策略建议

关于客户获取和留存：

**诊断:**
`;

    thought.thinkingSteps.forEach((step) => {
      text += `\n- ${step.insight}`;
    });

    text += `\n\n**行动方案:**\n`;
    thought.recommendations.forEach((rec) => {
      text += `\n🎯 ${rec.action}\n`;
      text += `   理由: ${rec.rationale}\n`;
      text += `   效果: ${rec.expectedImpact}\n`;
    });

    const actions = thought.recommendations.map((_, idx) => ({
      label: `执行方案 ${idx + 1}`,
      action: 'execute_action' as const,
      payload: { action: `customer_action_${idx}` },
    }));

    return {
      text,
      actions,
      actionType: 'switch_tab',
      actionMeta: 'customers',
    };
  }

  /**
   * 🔧 默认回复
   */
  private generateDefaultResponse(thought: SidekickThought): Partial<SidekickResponse> {
    let text = `### 🧠 店铺智诊结果

**您的问题:** ${thought.userIntent}

**商业目标:** ${thought.businessGoal}

**我的分析:**
`;

    thought.thinkingSteps.forEach((step, idx) => {
      text += `\n${idx + 1}. [${step.phase}] ${step.insight} (信心: ${(step.confidence * 100).toFixed(0)}%)`;
    });

    text += `\n\n**建议:**\n`;
    thought.recommendations.forEach((rec) => {
      const icon = rec.priority === 'high' ? '⚡' : '→';
      text += `\n${icon} ${rec.action}\n`;
      text += `   • ${rec.rationale}\n`;
      text += `   • 预期: ${rec.expectedImpact}\n`;
    });

    text += `\n---\n*整体信心度: ${(thought.confidence * 100).toFixed(0)}%*`;

    const actions = thought.recommendations.slice(0, 2).map((rec, idx) => ({
      label: rec.action,
      action: 'show_data' as const,
      payload: { type: 'recommendation', id: idx },
    }));

    return {
      text,
      actions,
      actionType: 'none',
      actionMeta: null,
    };
  }
}

export default SidekickResponseGenerator;
