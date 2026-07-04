/**
 * ModaGPT Brain Runtime v1 - Module Contracts
 * Definitive engineering contracts for a multi-model, evolvable business cognitive system.
 */

export type BrainModuleType =
  | 'OBSERVE'
  | 'UNDERSTAND'
  | 'REASON'
  | 'DECIDE'
  | 'PLAN'
  | 'EXECUTE'
  | 'VERIFY'
  | 'REFLECT';

export interface BrainSelfState {
  confidence: number;       // 0.0 to 1.0 overall self-confidence level
  workload: number;         // 0 to 100 rating of processing stress
  activeGoals: string[];    // active goals in focus
  activePlans: string[];    // currently active business execution plans
  activeExecutions: string[]; // active running tool jobs
  memoryPressure: number;   // 0.0 to 1.0 level representing context size pressure
  reasoningBudget: number;  // remaining calculation token budget or cost cap
  latencyBudget: number;    // remaining ms allowed before timeout
}

export interface CognitiveContext {
  tenantId: string;
  storeId: string;
  userId: string;
  userGoal: string;
  timestamp: string;
  activePersona: 'CEO' | 'operations' | 'designer';
  aiState: any; // ModaGPT unique state reference
}

export interface ModuleInput<T = any> {
  context: CognitiveContext;
  selfState: BrainSelfState;
  payload: T;
}

export interface ModuleOutput<T = any> {
  success: boolean;
  selfStateUpdate: Partial<BrainSelfState>;
  result: T;
  logs: string[];
  confidence: number;
}

/**
 * Universal Interface for a ModaGPT Cognitive Brain Module.
 * Each phase in the reasoning loop strictly implements this contract,
 * decoupling prompt mechanics or model implementations from system business flow.
 */
export interface IBrainModule<TIn = any, TOut = any> {
  readonly type: BrainModuleType;
  execute(input: ModuleInput<TIn>): Promise<ModuleOutput<TOut>>;
}

export interface ObservationData {
  skuCount: number;
  orderCount: number;
  revenue: number;
  profit: number;
  conversionRate: number;
  adROI: number;
  activeAlerts: any[];
}

export interface IntentUnderstanding {
  intentType: 'CRITICAL_ALERTRUN' | 'DIALOGUE_CLARIFY' | 'PLANNING_DEPLOY' | 'EXPLANATION_TACTICAL';
  extractedParameters: {
    platform?: string;
    budget?: number;
    markets?: string[];
    material?: string;
    positioning?: 'premium' | 'budget';
  };
  missingParameters: string[];
  isClarificationNeeded: boolean;
}

export interface ReasoningConclusion {
  subHypothesesEvaluated: Array<{
    area: string;
    hypothesis: string;
    supportingEvidenceCount: number;
    opposingEvidenceCount: number;
    proven: boolean;
  }>;
  risksIdentified: Array<{
    code: string;
    label: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    mitigation: string;
  }>;
  confidence: number;
}

export interface DecisionVerdict {
  verdict: 'ALLOW' | 'BLOCK' | 'ESCALATE' | 'REVIEW';
  verdictReason: string;
  requiresManualApproval: boolean;
  requiresSuperAdminOverride: boolean;
  score: number; // calculated alignment score (0 - 100)
}

export interface ToolCallSpec {
  tool: string;
  args: Record<string, any>;
  desc: string;
  priority: number;
}

export interface ActionPlan {
  planId: string;
  planTitle: string;
  steps: ToolCallSpec[];
  confidence: number;
  estimatedMarginDelta: number;
}

export interface ExecutionResult {
  completedCalls: Array<{
    tool: string;
    args: Record<string, any>;
    result: any;
    status: 'success' | 'failed';
  }>;
  stateUpdated: any;
}

export interface VerificationReport {
  isGoalAchieved: boolean;
  variancePercentage: number;
  integrityHash: string;
  auditedAt: string;
}

export interface ReflectionAnalysis {
  reflectionSummary: string;
  lessonsLearned: string[];
  selfEvolutionAction: string;
  replanRequired: boolean;
}
