/**
 * 🎼 SIDEKICK 编排器
 * 
 * 整合所有组件，完整的对话流程：
 * 用户消息 → 推理 → 格式化 → 返回给用户
 */

import { GoogleGenAI } from "@google/genai";
import SidekickBrain, { MerchantContext, InferenceResult } from "./sidekick-brain";
import SidekickFormatter, { FormattedResponse } from "./sidekick-formatter";

export class SidekickOrchestrator {
  private brain: SidekickBrain;
  private formatter: SidekickFormatter;

  constructor(aiClient: GoogleGenAI | null) {
    this.brain = new SidekickBrain(aiClient);
    this.formatter = new SidekickFormatter();
  }

  /**
   * 核心对话方法
   */
  async chat(
    userMessage: string,
    context: MerchantContext
  ): Promise<FormattedResponse> {
    const startTime = Date.now();

    try {
      console.log("[Sidekick] 🧠 开始推理...");
      const inference = await this.brain.infer(userMessage, context);

      console.log("[Sidekick] 💬 格式化回复...");
      const thinkingTimeMs = Date.now() - startTime;
      const response = this.formatter.format(inference, thinkingTimeMs);

      console.log(
        `[Sidekick] ✅ 完成！思考用时 ${thinkingTimeMs}ms，信心度 ${(response.metadata.confidence * 100).toFixed(0)}%`
      );

      return response;
    } catch (error) {
      console.error("[Sidekick] ❌ 错误:", error);
      return {
        text: "抱歉，我遇到了一些问题。请稍后重试。",
        actions: [],
        metadata: {
          confidence: 0,
          thinkingTime: Date.now() - startTime,
          decisiveness: "low",
        },
      };
    }
  }

  /**
   * 获取推理细节（用于调试与大脑中心展示）
   */
  async getInferenceDebug(
    userMessage: string,
    context: MerchantContext
  ): Promise<{
    inference: InferenceResult;
    response: FormattedResponse;
  }> {
    const startTime = Date.now();
    const inference = await this.brain.infer(userMessage, context);
    const thinkingTimeMs = Date.now() - startTime;
    const response = this.formatter.format(inference, thinkingTimeMs);

    return { inference, response };
  }
}

export default SidekickOrchestrator;
