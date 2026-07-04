-- ==============================================================================
-- SQL SEED: 010_modagpt_cognitive_runtime_seed.sql
-- DESCRIPTION: Initial seeds for ModaGPT stateful session, introductory dialog,
--              and autonomous commerce constitutional guardrails.
-- ==============================================================================

-- 1. Seed baseline state
INSERT INTO modagpt_state (
    id, active_goal, brand_name, brand_identity, brand_markets, 
    business_revenue, business_profit, business_conversion_rate, business_ad_roi,
    active_plan, risk_level, confidence_score, short_term_memory, long_term_memory, lessons_learned
) VALUES (
    'current_session',
    '尚未设定',
    'Noir Sommer',
    '欧式极简轻奢亚麻主义',
    ARRAY['德国', '法国', '意大利'],
    89400.00,
    58110.00,
    2.38,
    3.45,
    '未激活',
    1,
    0.9200,
    '[]'::jsonb,
    '[
        {"id": "mem_1", "type": "success", "text": "通过投放精准欧洲时尚人群TikTok视频广告促成了夏季麻制套衫的首批全数售罄"},
        {"id": "mem_2", "type": "lesson", "text": "德国站尺码标示过于紧凑导致首周退换货率曾上浮至5.2%，后经尺码纠偏得以自愈"}
    ]'::jsonb,
    '[]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 2. Seed initial Sidekick assistant greeting
INSERT INTO modagpt_chat_history (
    id, sender, message_text, thought_output, logs, tool_calls, proposed_plan, requires_approval, is_clarification_needed
) VALUES (
    'msg_init',
    'assistant',
    '您好！我是 ModaGPT 唯一核心主脑 Executive Brain。作为您的商业 COO，我时刻守卫着您的店铺资产与大盘水位，并通过大宪章底线自愈风险。请问您今天有什么需要我协助规划或自动执行的商业目标？',
    '主脑就绪，等待下发目标。已就地对位 ECOS 大宪章及物理货架隔离保护。',
    '["[BOOT] 正在启动 ModaGPT 唯一核心主脑 Executive Brain...", "ModaGPT 认知运行时就绪，等待商家下达目标。"]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    FALSE,
    FALSE
) ON CONFLICT (id) DO NOTHING;

-- 3. Seed Constitutional Guardrails (Governor rules)
INSERT INTO modagpt_constitution (rule_id, rule_name, rule_category, expression_rule, is_active) VALUES
('R_PRICE_FLOOR', '毛利硬防线保护', 'Pricing', 'margin >= 0.35', TRUE),
('R_AD_BUDGET_CAP', '推广广告单次预算限制', 'Marketing', 'budget <= 5000.00', TRUE),
('R_TAX_OSS_EU', '欧盟一站式增值税合规', 'Taxation', 'vat_registered == true WHEN market IN (EU)', TRUE)
ON CONFLICT (rule_id) DO NOTHING;
