# 数据字典: ModaGPT Stateful Cognitive Loop Runtime

本字典描述了 ModaGPT 唯一核心主脑（Single Executive Brain）认知回路与多阶段（Observe-Plan-Execute-Reflect）执行架构所关联的持久化数据表模型。

---

## 1. 表名: `modagpt_state`
用于记录和同步 ModaGPT 系统唯一的真实记忆大盘状态（AIState）。所有的主脑推理和工具链结果，必须写回此状态。

| 字段名 | 数据类型 | 约束 | 描述说明 |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | 唯一的会话会标，默认为 `'current_session'` |
| `active_goal` | `TEXT` | `NOT NULL` | 商家下发给主脑的当前最高经营指令 / 目标 |
| `brand_name` | `VARCHAR(255)` | `NOT NULL` | 当前由主脑管理的服装品牌的商号名称 |
| `brand_identity` | `TEXT` | `NOT NULL` | 品牌的核心风格与受众定位描述 |
| `brand_markets` | `TEXT[]` | `NOT NULL` | 品牌目前跨国销售的目标区域（例如德、法、意、英） |
| `business_revenue` | `DECIMAL(15, 2)`| `NOT NULL` | 当前品牌的累计营业总销售额（€ / $） |
| `business_profit` | `DECIMAL(15, 2)`| `NOT NULL` | 当前品牌的净利润总额（€ / $） |
| `business_conversion_rate` | `DECIMAL(5, 2)` | `NOT NULL` | 店铺的平均流量转化率 (%) |
| `business_ad_roi` | `DECIMAL(5, 2)` | `NOT NULL` | 社交媒体广告 (Meta / TikTok) 的推广 ROI 水位 |
| `active_plan` | `TEXT` | `NULL` | 当前正在运行或最新通过的战术性规划内容描述 |
| `risk_level` | `INT` | `NOT NULL` | 系统安全评级（1: 安全, 2: 需关注, 3: 高危） |
| `confidence_score` | `DECIMAL(5, 4)` | `NOT NULL` | 主脑执行当前动作链的综合逻辑置信评分 |
| `short_term_memory` | `JSONB` | `NOT NULL` | 工作上下文的短期内存序列（历史指令及单次调用痕迹） |
| `long_term_memory` | `JSONB` | `NOT NULL` | 品牌的长期品牌记忆、历史广告偏好、用户成功教训 |
| `lessons_learned` | `JSONB` | `NOT NULL` | 逆向事实推演（Counterfactual）和失败自愈提取出的 lessons 集合 |
| `updated_at` | `TIMESTAMP` | `DEFAULT` | 状态最新同步并落库的审计时间戳 |

---

## 2. 表名: `modagpt_chat_history`
用于存储商家端 Sidekick 或平台中枢超级管理员在与 ModaGPT 主脑进行对话时的消息链路。

| 字段名 | 数据类型 | 约束 | 描述说明 |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | 消息唯一哈希 GUID |
| `sender` | `VARCHAR(50)` | `CHECK` | 消息发送方：`'user'` (商家), `'assistant'` (主脑), `'system'` (审计) |
| `message_text` | `TEXT` | `NOT NULL` | 发送的具体自然语言文本（Markdown 兼容） |
| `thought_output`| `TEXT` | `NULL` | 主脑生成的内部深度商业推理/脑内核思维（Scratchpad） |
| `logs` | `JSONB` | `DEFAULT '[]'`| 执行 Observe & Plan 的渐进式渐进动画终端日志数组 |
| `tool_calls` | `JSONB` | `DEFAULT '[]'`| 本轮消息中实际调用的所有外部工具集名称及返回值 |
| `proposed_plan` | `JSONB` | `DEFAULT '[]'`| 本轮生成、挂起并等待最高管理员进行审批的工具调用计划 |
| `requires_approval` | `BOOLEAN`| `NOT NULL` | 是否涉及资金或高危物理修改，需要最高审批物理绿通拦截 |
| `is_clarification_needed`| `BOOLEAN`| `NOT NULL`| 主脑由于置信度不足，是否正在主动追问商家细节参数 |
| `timestamp` | `TIMESTAMP` | `DEFAULT` | 消息发生的确切物理时间戳 |

---

## 3. 表名: `modagpt_proposed_plan`
用于锁定和记录被安全大宪章拦截的 proposed action 集合。

| 字段名 | 数据类型 | 约束 | 描述说明 |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(255)` | `PRIMARY KEY` | 计划 ID |
| `session_id` | `VARCHAR(255)` | `FOREIGN KEY`| 绑定对应的会话标示 |
| `steps` | `JSONB` | `NOT NULL` | 具体挂起步骤的 JSON 结构数组（包括 tool、args、desc） |
| `is_approved` | `BOOLEAN` | `NOT NULL` | 管理员是否已经授权一键审批通过 |
| `executed_at` | `TIMESTAMP` | `NULL` | 真实授权物理执行完毕的时间戳 |
| `created_at` | `TIMESTAMP` | `DEFAULT` | 计划被大宪章拦截起草的时间 |

---

## 4. 表名: `modagpt_constitution`
系统治理引擎（Governor Constitution）的核心准则对照表。每次物理指令下发前，必须由此表记录的安全防御条件进行合规验证。

| 字段名 | 数据类型 | 约束 | 描述说明 |
| :--- | :--- | :--- | :--- |
| `rule_id` | `VARCHAR(50)` | `PRIMARY KEY` | 唯一防御规则 ID |
| `rule_name` | `VARCHAR(255)` | `NOT NULL` | 规则中文描述名称 |
| `rule_category` | `VARCHAR(100)` | `NOT NULL` | 规则分类（如 Pricing, Marketing, SupplyChain） |
| `expression_rule` | `TEXT` | `NOT NULL` | 编译解析表达式条件（如：margin >= 0.35） |
| `is_active` | `BOOLEAN` | `NOT NULL` | 规则是否处于开启防御拦截状态 |
| `last_triggered_at` | `TIMESTAMP` | `NULL` | 该安全红线最后一次被触发拦截并审计的时间戳 |
| `created_at` | `TIMESTAMP` | `DEFAULT` | 规则载入内核的时间 |
