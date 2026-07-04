# ERD: ModaGPT Stateful Cognitive Loop Runtime

本图表和文档描述了 ModaGPT Stateful Cognitive Loop Runtime 在数据库中的 ERD 关系、实体完整性以及外键约束和生命周期。

```mermaid
erDiagram
    modagpt_state {
        varchar(255) id PK "Default: 'current_session'"
        text active_goal "当前最高经营目标"
        varchar(255) brand_name "服装品牌名称"
        text brand_identity "品牌调性"
        text_array brand_markets "目标销售国"
        decimal business_revenue "累计营业额"
        decimal business_profit "累计净利润"
        decimal business_conversion_rate "平均转化率"
        decimal business_ad_roi "广告 ROI"
        text active_plan "当前正在运作的计划"
        int risk_level "系统风控评级 (1:安全, 2:关注, 3:高危)"
        decimal confidence_score "主脑综合逻辑置信评分"
        jsonb short_term_memory "短期内存工作流"
        jsonb long_term_memory "长期品牌记忆库"
        jsonb lessons_learned "因果逆推失败自愈经验"
        timestamp updated_at "最近一次大盘状态同步时间"
    }

    modagpt_chat_history {
        varchar(255) id PK "GUID"
        varchar(50) sender "user | assistant | system"
        text message_text "Markdown对话内容"
        text thought_output "脑内Scratchpad"
        jsonb logs "渐进动画终端日志组"
        jsonb tool_calls "实际调用的外部工具及回执"
        jsonb proposed_plan "建议并挂起的步骤计划"
        boolean requires_approval "是否涉及敏感物理写操作"
        boolean is_clarification_needed "是否需要商家解答"
        timestamp timestamp "会话发生时间"
    }

    modagpt_proposed_plan {
        varchar(255) id PK "计划 ID"
        varchar(255) session_id FK "绑定的状态标示"
        jsonb steps "工具调用细节组"
        boolean is_approved "是否审批授权通过"
        timestamp executed_at "物理执行完成时间"
        timestamp created_at "计划被大宪章防御拦截时间"
    }

    modagpt_constitution {
        varchar(50) id PK "防御规则 ID"
        varchar(255) rule_name "规则描述"
        varchar(100) rule_category "安全分类"
        text expression_rule "逻辑合规比对表达式"
        boolean is_active "是否处于拦截防御状态"
        timestamp last_triggered_at "最近一次拦截触发时间"
        timestamp created_at "规则载入时间"
    }

    modagpt_state ||--o{ modagpt_proposed_plan : "governs and structures plans"
```

---

## 关系约束与生命周期描述

1. **`modagpt_state` 与 `modagpt_proposed_plan` (一对多 `1 : N`):**
   - 一个会话大盘状态可以多次生成新的计划。由于 `modagpt_proposed_plan` 的 `session_id` 始终默认为 `'current_session'`，它完美锁定了当前会话挂起和授权的所有步骤历史，支持撤销、重试与自愈。

2. **`modagpt_chat_history`:**
   - 包含多轮次问答历史，其中最后一轮助理发言可能附带 `proposed_plan` 数组和 `requires_approval = TRUE` 指标，用于在 UI 渲染一键审批通过。

3. **`modagpt_constitution` (宪法规则库):**
   - 它是主脑执行计划（`modagpt_proposed_plan`）进行物理调用前的硬隔离红线。若计划中的某一步骤被判定触发不合规（如定价违反毛利率红线），会在 `modagpt_constitution` 记录 `last_triggered_at` 拦截事实，并将该轮消息标记为未授权阻断。
