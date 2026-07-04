-- ==============================================================================
-- SQL SCHEMA: 010_modagpt_cognitive_runtime.sql
-- DESCRIPTION: Schema definition for the stateful ModaGPT Cognitive Runtime, including
--              session state tracking, interactive dialogue logs, proposed plans,
--              and constitutional guardrails.
-- ==============================================================================

-- 1. AIState (The sole source of truth for ModaGPT state synchronization)
CREATE TABLE IF NOT EXISTS modagpt_state (
    id VARCHAR(255) PRIMARY KEY DEFAULT 'current_session',
    active_goal TEXT NOT NULL,
    brand_name VARCHAR(255) NOT NULL,
    brand_identity TEXT NOT NULL,
    brand_markets TEXT[] NOT NULL DEFAULT '{}',
    business_revenue DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    business_profit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    business_conversion_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    business_ad_roi DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    active_plan TEXT,
    risk_level INT NOT NULL DEFAULT 1,
    confidence_score DECIMAL(5, 4) NOT NULL DEFAULT 1.0000,
    short_term_memory JSONB NOT NULL DEFAULT '[]'::jsonb,
    long_term_memory JSONB NOT NULL DEFAULT '[]'::jsonb,
    lessons_learned JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Interactive Dialogue Thread (The ChatGPT/Sidekick multi-turn conversation thread)
CREATE TABLE IF NOT EXISTS modagpt_chat_history (
    id VARCHAR(255) PRIMARY KEY,
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    message_text TEXT NOT NULL,
    thought_output TEXT,
    logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
    proposed_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    is_clarification_needed BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Proposed Tool Plans (Action blueprint for physical tool loop invocation)
CREATE TABLE IF NOT EXISTS modagpt_proposed_plan (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL DEFAULT 'current_session',
    steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of tool execution steps [{tool, desc, args}]
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Constitutional Guardrails (The Governor review guidelines to detect cognitive drift)
CREATE TABLE IF NOT EXISTS modagpt_constitution (
    rule_id VARCHAR(50) PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_category VARCHAR(100) NOT NULL,
    expression_rule TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
