import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Cpu, 
  Award, 
  Sliders, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  Play, 
  Database, 
  Activity, 
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Check,
  Zap,
  Clock,
  Sparkles
} from 'lucide-react';
import { dbEngine } from '../../../db/dbEngine';
import { PlanningGoalItem, PlanningTaskItem, MemoryItem } from '../../../types';

interface LayerProps {
  triggerSuccess: (msg: string) => void;
}

// =========================================================================
// Layer: Business Strategy Memory (商业策略记忆与参数自适应层)
// =========================================================================
export function BusinessStrategyMemoryLayer({ triggerSuccess }: LayerProps) {
  const [lessons, setLessons] = useState<MemoryItem[]>([]);
  const [filterOutcome, setFilterOutcome] = useState<'all' | 'SUCCESS' | 'FAIL'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form states for new custom memory lesson
  const [topic, setTopic] = useState('');
  const [outcome, setOutcome] = useState<'SUCCESS' | 'FAIL'>('SUCCESS');
  const [description, setDescription] = useState('');
  const [keyLesson, setKeyLesson] = useState('');
  const [relatedCategory, setRelatedCategory] = useState<'Pricing' | 'Logistics' | 'Marketing' | 'Inventory' | 'Compliance'>('Pricing');
  const [importance, setImportance] = useState(8);

  useEffect(() => {
    loadLessons();
    const unsubscribe = dbEngine.subscribe('all', loadLessons);
    return () => unsubscribe();
  }, []);

  const loadLessons = () => {
    const allMems = dbEngine.memories.getAll();
    const businessMems = allMems.filter(m => m.memory_type === 'business');
    
    // Seed default lessons if database collection is empty
    if (businessMems.length === 0) {
      const defaults = [
        {
          topic: '法国海路物流干线阻断教训 (FR_LOGISTICS_FAIL)',
          outcome: 'FAIL',
          category: 'Logistics',
          description: '2025年夏季由于马赛港口运力瘫痪，未及时切换里昂铁海联运，产生 32% 订单退货率。',
          keyLesson: '再次评估法国或南欧采购决策时，自动对单一传统干线方案降低 20% 置信度评分。',
          importance: 9
        },
        {
          topic: 'TikTok 爆款亚麻裙高热度高溢价经验 (TIKTOK_DRESS_SUCCESS)',
          outcome: 'SUCCESS',
          category: 'Pricing',
          description: '2025年7月社交网络热度突破 40% 时，利用供需缺口加价 12% 后仍斩获 14.2% 净利润。',
          keyLesson: '当趋势热度超过 35% 时，定价阻力变弱，系统可以智能调高毛利率天花板权重。',
          importance: 8
        },
        {
          topic: '轻奢防御大促折扣战对冲策略 (MAJE_COUPON_SUCCESS)',
          outcome: 'SUCCESS',
          category: 'Marketing',
          description: '面对竞争同行降价 15% 突击，发放精准 €15 定向复购礼券而非全局降价，锁定 92% VIP 客户。',
          keyLesson: '靶向发放 VIP 客户礼券能有效维持产品高端定价心智，避免进入破坏性低毛利循环。',
          importance: 8
        },
        {
          topic: '极寒流下羊毛针织断货损失 (ALP_KNIT_STOCKOUT)',
          outcome: 'FAIL',
          category: 'Inventory',
          description: '2025年底阿尔卑斯极端暴雪突袭导致仓库发货中断，库存错配造成潜在 €45,000 溢价销售损失。',
          keyLesson: '冬季预报气温偏离常值 5 度以上时，必须强制将安全库存周转乘数提升至 1.45x。',
          importance: 9
        }
      ];

      defaults.forEach(d => {
        dbEngine.memories.create({
          merchant_id: 'tenant_default',
          memory_type: 'business',
          source: 'GPT CoT Engine',
          content: JSON.stringify({
            topic: d.topic,
            outcome: d.outcome,
            category: d.category,
            description: d.description,
            keyLesson: d.keyLesson,
            active: true
          }),
          importance: d.importance,
          confidence: 0.95
        });
      });
    } else {
      setLessons(businessMems);
    }
  };

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !description || !keyLesson) {
      triggerSuccess('⚠️ 请填写所有必填字段');
      return;
    }

    dbEngine.memories.create({
      merchant_id: 'tenant_default',
      memory_type: 'business',
      source: 'SuperAdmin Operator',
      content: JSON.stringify({
        topic,
        outcome,
        category: relatedCategory,
        description,
        keyLesson,
        active: true
      }),
      importance,
      confidence: 0.95
    });

    setTopic('');
    setDescription('');
    setKeyLesson('');
    triggerSuccess('✓ 商业策略反思记忆记录成功并已落库，决策校准权重已自适应更新！');
  };

  const handleDeleteLesson = (id: string) => {
    dbEngine.memories.delete(id);
    triggerSuccess('✓ 策略反思经验已安全移除');
  };

  const handleToggleActive = (lesson: MemoryItem) => {
    try {
      const parsed = JSON.parse(lesson.content);
      dbEngine.memories.update(lesson.memory_id, {
        content: JSON.stringify({
          ...parsed,
          active: !parsed.active
        })
      });
      triggerSuccess(`✓ 经验经验规则已 ${!parsed.active ? '激活' : '禁用'}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to parse content safely
  const parseLessonContent = (contentStr: string) => {
    try {
      return JSON.parse(contentStr);
    } catch {
      return {
        topic: '未知策略主题',
        outcome: 'SUCCESS',
        category: 'Pricing',
        description: '',
        keyLesson: contentStr,
        active: true
      };
    }
  };

  // Compute live Decision Weight Matrix based on active success / failures
  const computeDecisionWeights = () => {
    // Default baselines
    let pricingWeight = 1.0;
    let logisticsRiskBuffer = 1.0;
    let marketingEfficiency = 1.0;
    let stockSafetyMultiplier = 1.0;
    let complianceSafetyMargin = 60.0; // Margin floor %

    lessons.forEach(l => {
      const details = parseLessonContent(l.content);
      if (!details.active) return;

      const impactValue = (l.importance / 10) * 0.15; // weight scaled by importance

      if (details.category === 'Pricing') {
        if (details.outcome === 'SUCCESS') {
          pricingWeight += impactValue;
        } else {
          pricingWeight -= impactValue * 1.5;
        }
      } else if (details.category === 'Logistics') {
        if (details.outcome === 'FAIL') {
          logisticsRiskBuffer += impactValue * 2.0; // Higher buffer required for logistics fails
        } else {
          logisticsRiskBuffer -= impactValue * 0.5;
        }
      } else if (details.category === 'Marketing') {
        if (details.outcome === 'SUCCESS') {
          marketingEfficiency += impactValue;
        } else {
          marketingEfficiency -= impactValue;
        }
      } else if (details.category === 'Inventory') {
        if (details.outcome === 'FAIL') {
          stockSafetyMultiplier += impactValue * 1.8;
        } else {
          stockSafetyMultiplier -= impactValue * 0.4;
        }
      } else if (details.category === 'Compliance') {
        if (details.outcome === 'FAIL') {
          complianceSafetyMargin += l.importance * 0.8; // stricter margin floor on fail
        } else {
          complianceSafetyMargin -= l.importance * 0.3;
        }
      }
    });

    return {
      pricingWeight: Number(pricingWeight.toFixed(2)),
      logisticsRiskBuffer: Number(logisticsRiskBuffer.toFixed(2)),
      marketingEfficiency: Number(marketingEfficiency.toFixed(2)),
      stockSafetyMultiplier: Number(stockSafetyMultiplier.toFixed(2)),
      complianceSafetyMargin: Number(Math.max(50, Math.min(75, complianceSafetyMargin)).toFixed(1))
    };
  };

  const weights = computeDecisionWeights();

  const filteredLessons = lessons.filter(l => {
    const details = parseLessonContent(l.content);
    const matchesSearch = details.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          details.keyLesson.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOutcome = filterOutcome === 'all' || details.outcome === filterOutcome;
    return matchesSearch && matchesOutcome;
  });

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 text-left p-5 rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] text-[#07C2E3] font-mono font-bold uppercase tracking-widest">LAYER 215 &amp; 321: Business Strategy Memory Graph</span>
          <h2 className="text-lg font-black text-white mt-1">🧠 长期策略反思记忆与决策权重自校准系统</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5 leading-normal max-w-3xl">
            对每一笔交易决议、活动战役、库存补调的成败教训进行持续反思落库。决策引擎在执行类似场景规划时，将检索本层已落库的历史成功或失败经验，动态扣减或上调置信度因子并纠偏参数决策。
          </p>
        </div>
        <div className="bg-slate-950 border border-slate-850 px-4 py-3 rounded-lg flex items-center gap-3 shrink-0">
          <Database className="w-8 h-8 text-[#07C2E3]" />
          <div>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">底层存储媒介</span>
            <span className="text-xs font-black text-white font-mono">dbEngine.memories [Persistent JSON]</span>
          </div>
        </div>
      </div>

      {/* Grid of Strategy Weights and custom add Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column - Live Weight Matrix Indicator */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-left">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#07C2E3]" />
              <span>当前决策参数校准矩阵 (Live Weight Matrix)</span>
            </h3>
            
            <p className="text-[11px] text-slate-500 leading-normal">
              根据下方已激活的历史策略经验和成败反思记录，系统当前输出的自适应推理比重加权。在执行相应维度的决策规划时作为约束阻力或催化力。
            </p>

            <div className="space-y-4 pt-1 font-mono">
              {/* Weight item 1 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">🏷️ 定价溢价系数 (Price Elasticity Weight)</span>
                  <strong className="text-slate-900 text-sm">{weights.pricingWeight}x</strong>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-[#07C2E3] h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(10, weights.pricingWeight * 50))}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400">受到定价成功和利润刺穿失败记忆的联合扰动控制</span>
              </div>

              {/* Weight item 2 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">🚚 物流断链冗余风险比 (Logistics Risk Buffer)</span>
                  <strong className="text-rose-600 text-sm">{weights.logisticsRiskBuffer}x</strong>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-rose-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(10, weights.logisticsRiskBuffer * 40))}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400">马赛及海路干道突发延迟事件教训导致的预备安全垫系数</span>
              </div>

              {/* Weight item 3 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">📣 流量转化推广增益 (Marketing Conv. Boost)</span>
                  <strong className="text-slate-900 text-sm">{weights.marketingEfficiency}x</strong>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(10, weights.marketingEfficiency * 50))}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400">TikTok大促与Maje靶向抵御礼券等正面流量转折记忆反馈</span>
              </div>

              {/* Weight item 4 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">📦 库存自适应周转乘数 (Adaptive Stock Multiplier)</span>
                  <strong className="text-slate-900 text-sm">{weights.stockSafetyMultiplier}x</strong>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-sky-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(10, weights.stockSafetyMultiplier * 50))}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400">暴雪与供应链滞销等物理中断损失记忆触发的自保因子</span>
              </div>

              {/* Weight item 5 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">⚖️ 大宪章毛利保护底线 (Governor Margin Floor)</span>
                  <strong className="text-teal-600 text-sm">{weights.complianceSafetyMargin}%</strong>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-teal-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${weights.complianceSafetyMargin}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400">大促违宪折扣失败经验导致的安全红线向上回缩</span>
              </div>
            </div>
          </div>

          {/* Form to submit custom learning reflection */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-left">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#07C2E3]" />
              <span>录入历史经验反思 (Ingest Strategic Memory)</span>
            </h3>

            <form onSubmit={handleCreateLesson} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">反思主题</label>
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="例如: 德国冬衣提价过多滞销" 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">反思结果类型</label>
                  <select 
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none"
                  >
                    <option value="SUCCESS">🟢 成功红利经验 (SUCCESS)</option>
                    <option value="FAIL">🔴 失败痛点教训 (FAIL)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">战略维度分类</label>
                  <select 
                    value={relatedCategory}
                    onChange={(e) => setRelatedCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none"
                  >
                    <option value="Pricing">🪙 价格策略 (Pricing)</option>
                    <option value="Logistics">🛹 物流运输 (Logistics)</option>
                    <option value="Marketing">🚀 流量推广 (Marketing)</option>
                    <option value="Inventory">📦 库存预留 (Inventory)</option>
                    <option value="Compliance">🛡️ 大宪合规 (Compliance)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">重要度等级 (1-10)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="10"
                    value={importance}
                    onChange={(e) => setImportance(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">反思背景与事件经过 (Incident Trace)</label>
                <textarea 
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="2025年Q4由于德国某零售商降价，系统盲目跟进直降22%导致当季毛利率崩塌至48%..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">核心策略经验规则 (Decisive Lesson constraint)</label>
                <textarea 
                  rows={2}
                  value={keyLesson}
                  onChange={(e) => setKeyLesson(e.target.value)}
                  placeholder="限制大促销价格最低线，在毛利红线上抬 10% 缓冲垫以抵御黑天鹅侵蚀..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none leading-relaxed"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-[#07C2E3] font-extrabold p-2.5 rounded-lg transition uppercase tracking-wider text-xs"
              >
                💾 录入商业策略反思库并调校权重
              </button>
            </form>
          </div>

        </div>

        {/* Right Column - Ingested Strategy Memories List */}
        <div className="lg:col-span-7 space-y-4 text-left">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-xs text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#07C2E3]" />
                  <span>经验记忆反思底册 (Strategic Memory Registry)</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  所有已持久化保存的多租户运营策略反馈
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索历史反思..." 
                  className="p-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none"
                />
                <select 
                  value={filterOutcome}
                  onChange={(e) => setFilterOutcome(e.target.value as any)}
                  className="p-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none"
                >
                  <option value="all">🔍 全部记录</option>
                  <option value="SUCCESS">🟢 成功记录</option>
                  <option value="FAIL">🔴 失败痛点</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredLessons.length === 0 ? (
                <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                  没有找到符合过滤条件的策略记忆。
                </div>
              ) : (
                filteredLessons.map(lesson => {
                  const details = parseLessonContent(lesson.content);
                  return (
                    <div 
                      key={lesson.memory_id} 
                      className={`p-4 border rounded-xl relative transition-all ${
                        details.active 
                          ? 'bg-white border-slate-200 shadow-xs' 
                          : 'bg-slate-50 border-slate-150 opacity-60'
                      }`}
                    >
                      {/* Top row */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className={`text-[8.5px] font-black font-mono border px-2 py-0.5 rounded-full ${
                              details.outcome === 'SUCCESS' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {details.outcome === 'SUCCESS' ? '✓ SUCCESS' : '✗ FAIL'}
                            </span>
                            <span className="text-[9px] font-mono font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {details.category || 'Strategic'}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              IMPORTANCE: {lesson.importance}/10
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-900 pt-1">{details.topic}</h4>
                        </div>

                        {/* Toggle switch */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={() => handleToggleActive(lesson)}
                            className={`text-[9.5px] font-mono px-2 py-1 rounded border transition-all ${
                              details.active 
                                ? 'bg-[#07C2E3]/10 hover:bg-[#07C2E3]/20 text-[#07C2E3] border-[#07C2E3]/25' 
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                            }`}
                          >
                            {details.active ? '● 已激活' : '○ 已禁用'}
                          </button>
                          <button 
                            onClick={() => handleDeleteLesson(lesson.memory_id)}
                            className="text-slate-400 hover:text-rose-600 p-1 transition"
                            title="移除反思记录"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Description & Key Lesson */}
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs leading-relaxed">
                        <p className="text-slate-600">
                          <strong className="text-slate-800 font-bold block mb-0.5">【历史背景与经过】</strong>
                          {details.description}
                        </p>
                        <p className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg text-slate-800 font-medium">
                          <strong className="text-[#07C2E3] font-bold block mb-0.5">【决策自纠偏自适应规则】</strong>
                          {details.keyLesson}
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono mt-3 pt-2 border-t border-dashed border-slate-100">
                        <span>反思时间: {new Date(lesson.created_at).toLocaleString()}</span>
                        <span>记录节点: {lesson.source}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}


// =========================================================================
// Layer: Persistent Goal System (V4 持续认知目标追踪树)
// =========================================================================
export function PersistentGoalSystemLayer({ triggerSuccess }: LayerProps) {
  const [goals, setGoals] = useState<PlanningGoalItem[]>([]);
  const [tasks, setTasks] = useState<PlanningTaskItem[]>([]);
  
  // Local state for creating goals
  const [goalName, setGoalName] = useState('');
  const [goalLevel, setGoalLevel] = useState<'business' | 'long' | 'quarter' | 'weekly' | 'daily' | 'micro'>('quarter');
  const [targetValue, setTargetValue] = useState('');
  const [priority, setPriority] = useState<number>(3);
  const [goalType, setGoalType] = useState<'growth' | 'profit' | 'inventory' | 'marketing' | 'operational'>('growth');

  // Interactive local panel states
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAgent, setTaskAgent] = useState('PricingAgent');

  useEffect(() => {
    loadGoalsData();
    const unsubscribe = dbEngine.subscribe('all', loadGoalsData);
    return () => unsubscribe();
  }, []);

  const loadGoalsData = () => {
    const allGoals = dbEngine.planning_goals.getAll();
    const allTasks = dbEngine.planning_tasks.getAll();

    // Seed V4 default hierarchical goal tree if database collection is empty
    if (allGoals.length === 0) {
      // 1. Business Goal (Root Level)
      const gRoot = dbEngine.planning_goals.create({
        merchant_id: 'tenant_default',
        goal_type: 'growth',
        goal_name: '【企业总战略目标】达成全欧零售商 100 万欧销售规模 (Root Business Goal)',
        priority: 1,
        target_value: 'GMV: €1,000,000 | Net Profit Margin >= 18%',
        status: 'active'
      });

      // 2. Long Goals
      const gLongFR = dbEngine.planning_goals.create({
        merchant_id: 'tenant_default',
        goal_type: 'growth',
        goal_name: `[FR Long Goal] 法国市场拓展战役，拿下南欧服装零售核心周转率`,
        priority: 2,
        target_value: 'GMV: €450,000',
        status: 'active'
      });

      const gLongDE = dbEngine.planning_goals.create({
        merchant_id: 'tenant_default',
        goal_type: 'growth',
        goal_name: `[DE Long Goal] 德国、北欧防霜冻御冷系列前置仓铺路`,
        priority: 2,
        target_value: 'GMV: €350,000',
        status: 'active'
      });

      // 3. Quarter Goal
      const gQuarter = dbEngine.planning_goals.create({
        merchant_id: 'tenant_default',
        goal_type: 'profit',
        goal_name: `(Q3 Quarter Goal) 提振夏季高毛利亚麻沙滩裙爆款红利与流量变现`,
        priority: 3,
        target_value: 'Net Profit: €55,000 | Return Rate < 15%',
        status: 'active'
      });

      // 4. Weekly Goal
      const gWeekly = dbEngine.planning_goals.create({
        merchant_id: 'tenant_default',
        goal_type: 'inventory',
        goal_name: `[Weekly Goal] 保证阿尔卑斯等地区 48小时 短途供应商库存链条充沛`,
        priority: 4,
        target_value: 'Safety Stock Buffer: 1.35x | In-Stock rate >= 98%',
        status: 'planning'
      });

      // 5. Daily Goal
      const gDaily = dbEngine.planning_goals.create({
        merchant_id: 'tenant_default',
        goal_type: 'marketing',
        goal_name: `Daily Goal: 欧洲五个主要子仓库存警报和天气骤降警报的高频时序同步`,
        priority: 4,
        target_value: 'Sync intervals: every 15 min | Active signals: Google & TikTok Trends',
        status: 'pending'
      });

      // 6. Micro Goal
      const gMicro = dbEngine.planning_goals.create({
        merchant_id: 'tenant_default',
        goal_type: 'operational',
        goal_name: `Micro Goal: 定向给巴黎过去 90 天流失老客户发放礼券并跟进尺码自适应表格`,
        priority: 5,
        target_value: 'Send volume: 340 targeting VIPs | Expected conversions: 22%',
        status: 'pending'
      });

      // Save custom hierarchy mapping in local state or extend content if needed
      // Seed some default tasks linked to these goals
      dbEngine.planning_tasks.create({
        goal_id: gQuarter.goal_id,
        owner_agent: 'PricingAgent',
        description: '亚麻沙滩裙 (SKU_LINEN_DRESS) 价格按 TikTok 45% 热度自适应调升 12%',
        status: 'completed',
        priority: 1
      });

      dbEngine.planning_tasks.create({
        goal_id: gQuarter.goal_id,
        owner_agent: 'InventoryAgent',
        description: 'DACH 地区夏季特快次日达海外保税仓调配调拨',
        status: 'running',
        priority: 2
      });

      dbEngine.planning_tasks.create({
        goal_id: gWeekly.goal_id,
        owner_agent: 'InventoryAgent',
        description: '从德国主仓紧急调拨 300件 暖绒针织品至里昂前置备用仓以绕过受阻地段',
        status: 'pending',
        priority: 1
      });

      dbEngine.planning_tasks.create({
        goal_id: gMicro.goal_id,
        owner_agent: 'CustomerAgent',
        description: '检索老客户尺码异常反馈日志，智能拼装高置信度 sizing 折扣推荐序列',
        status: 'pending',
        priority: 1
      });

    } else {
      setGoals(allGoals);
      setTasks(allTasks);
      if (!selectedGoalId && allGoals.length > 0) {
        setSelectedGoalId(allGoals[0].goal_id);
      }
    }
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName || !targetValue) {
      triggerSuccess('⚠️ 请填写所有的必填项');
      return;
    }

    // Prefix goalName with level badge for clear visual hierarchy representation
    let levelPrefix = '';
    switch(goalLevel) {
      case 'business': levelPrefix = '【企业总战略目标】'; break;
      case 'long': levelPrefix = '『Long-Term Goal』'; break;
      case 'quarter': levelPrefix = '(Quarterly Goal)'; break;
      case 'weekly': levelPrefix = '[Weekly Goal]'; break;
      case 'daily': levelPrefix = 'Daily Goal:'; break;
      case 'micro': levelPrefix = 'Micro Goal:'; break;
    }

    const created = dbEngine.planning_goals.create({
      merchant_id: 'tenant_default',
      goal_type: goalType,
      goal_name: `${levelPrefix} ${goalName}`,
      priority,
      target_value: targetValue,
      status: 'pending'
    });

    setGoalName('');
    setTargetValue('');
    setSelectedGoalId(created.goal_id);
    triggerSuccess('✓ 新的目标生命节点已安全持久化至 V4 Persistent Goal Tree 中！');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription || !selectedGoalId) {
      triggerSuccess('⚠️ 请选择一个关联目标并填写任务描述');
      return;
    }

    dbEngine.planning_tasks.create({
      goal_id: selectedGoalId,
      owner_agent: taskAgent,
      description: taskDescription,
      status: 'pending',
      priority: 1
    });

    setTaskDescription('');
    triggerSuccess('✓ 新的目标规划自愈子任务已下派至相关 Agent 工作队列中');
  };

  const handleToggleGoalStatus = (goalId: string, currentStatus: string) => {
    const statuses: Array<PlanningGoalItem['status']> = ['pending', 'planning', 'active', 'completed', 'failed'];
    const nextIdx = (statuses.indexOf(currentStatus as any) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];
    
    dbEngine.planning_goals.update(goalId, { status: nextStatus });
    triggerSuccess(`✓ 目标执行状态已流转至: ${nextStatus.toUpperCase()}`);
  };

  const handleToggleTaskStatus = (taskId: string, currentStatus: string) => {
    const statuses: Array<PlanningTaskItem['status']> = ['pending', 'running', 'completed', 'failed'];
    const nextIdx = (statuses.indexOf(currentStatus as any) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];

    dbEngine.planning_tasks.update(taskId, { status: nextStatus });
    triggerSuccess(`✓ 子任务状态已流转至: ${nextStatus.toUpperCase()}`);
  };

  const handleDeleteGoal = (goalId: string) => {
    dbEngine.planning_goals.delete(goalId);
    // Delete associated tasks
    const related = tasks.filter(t => t.goal_id === goalId);
    related.forEach(t => dbEngine.planning_tasks.delete(t.task_id));
    triggerSuccess('✓ 目标及关联子任务执行链已彻底移除');
  };

  const getLevelColor = (name: string) => {
    if (name.includes('【企业总战略目标】')) return 'border-l-4 border-rose-500 bg-rose-50/10 text-rose-700';
    if (name.includes('『Long-Term Goal』')) return 'border-l-4 border-amber-500 bg-amber-50/10 text-amber-700';
    if (name.includes('(Quarterly Goal)')) return 'border-l-4 border-emerald-500 bg-emerald-50/10 text-emerald-700';
    if (name.includes('[Weekly Goal]')) return 'border-l-4 border-[#07C2E3] bg-cyan-50/10 text-cyan-700';
    if (name.includes('Daily Goal:')) return 'border-l-4 border-blue-500 bg-blue-50/10 text-blue-700';
    return 'border-l-4 border-slate-400 bg-slate-50/10 text-slate-700';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'failed': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'active': return 'bg-[#07C2E3]/20 text-[#07C2E3] border-[#07C2E3]/30 animate-pulse';
      case 'planning': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'pending':
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800 animate-fadeIn">
      {/* Top Description Panel */}
      <div className="bg-slate-900 border border-slate-800 text-left p-5 rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] text-[#07C2E3] font-mono font-bold uppercase tracking-widest">LAYER 281 &amp; 540+: V4 Persistent Goal System</span>
          <h2 className="text-lg font-black text-white mt-1">🎯 智脑持续认知（Continuous Cognition）持久目标系统</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5 leading-normal max-w-3xl">
            摒弃单次对话即遗忘的短期规划。V4 构筑了一套由大到小、自顶向下、无限分裂的树状目标闭环（Business → Long → Quarter → Weekly → Daily → Micro），该目标大盘真实落库持久化，由协同 AI 代理全天候监听、评估和动态对账。
          </p>
        </div>
        <div className="bg-slate-950 border border-slate-850 px-4 py-3 rounded-lg flex items-center gap-3 shrink-0">
          <Clock className="w-8 h-8 text-emerald-400 animate-pulse" />
          <div>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">持续认知运行时</span>
            <span className="text-xs font-black text-emerald-400 font-mono">Continuous Active Loop: ON</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Tree Inspector & Task dispatcher */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Create Target Forms & Quick actions */}
        <div className="lg:col-span-5 space-y-6 text-left">
          
          {/* Form 1: Add New Goal */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-950 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#07C2E3]" />
              <span>定义持久战略目标 (Define Strategic Goal)</span>
            </h3>

            <form onSubmit={handleCreateGoal} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">目标层级 (Hierarchy Level)</label>
                <select 
                  value={goalLevel}
                  onChange={(e) => setGoalLevel(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none"
                >
                  <option value="business">🔴 年/年战略总目标 (Root Business Goal)</option>
                  <option value="long">🧡 跨季度长周期拓展目标 (Long Goal)</option>
                  <option value="quarter">💚 单个季度利润红利目标 (Quarterly Goal)</option>
                  <option value="weekly">💙 每周运营库存调拨保障 (Weekly Goal)</option>
                  <option value="daily">💜 每日情报对账时序更新 (Daily Goal)</option>
                  <option value="micro">🤍 页面老客户关怀微操作 (Micro Goal)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">目标主题名称 (Objective title)</label>
                <input 
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="例如: 将欧洲冬季美利奴羊毛针织品断货风险降至零"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">战略维度类型</label>
                  <select 
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none"
                  >
                    <option value="growth">📈 规模增长 (Growth)</option>
                    <option value="profit">💰 利润保障 (Profit)</option>
                    <option value="inventory">📦 库配置存 (Inventory)</option>
                    <option value="marketing">🚀 流量推广 (Marketing)</option>
                    <option value="operational">⚙️ 自主治理 (Operational)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">安全优先级 (1-5, 1最高)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="5"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">预期量化指标 (Target value metrics)</label>
                <input 
                  type="text"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="例如: 综合毛利率 >= 60.5% | 极寒预警响应时间 <= 15分钟"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-[#07C2E3] font-extrabold p-2.5 rounded-lg transition uppercase tracking-wider text-xs"
              >
                🎯 注入智脑持久化目标大盘
              </button>
            </form>
          </div>

          {/* Form 2: Dispatch Sub Task to specific Agents under the selected Goal */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-extrabold text-xs text-slate-950 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#07C2E3]" />
              <span>下派目标自纠偏任务 (Dispatch Agent Task)</span>
            </h3>

            <form onSubmit={handleAddTask} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">绑定大盘目标 (Link to Strategic Goal)</label>
                <select 
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none"
                >
                  <option value="">-- 请选择大盘关联目标 --</option>
                  {goals.map(g => (
                    <option key={g.goal_id} value={g.goal_id}>
                      {g.goal_name.length > 50 ? g.goal_name.substring(0, 50) + '...' : g.goal_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">执行角色代理 (Owner Agent)</label>
                  <select 
                    value={taskAgent}
                    onChange={(e) => setTaskAgent(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none font-mono"
                  >
                    <option value="PricingAgent">🏷️ 价格策略代理 (PricingAgent)</option>
                    <option value="InventoryAgent">📦 库存调度代理 (InventoryAgent)</option>
                    <option value="MarketingAgent">🚀 广告推广代理 (MarketingAgent)</option>
                    <option value="CustomerAgent">👥 客户自愈代理 (CustomerAgent)</option>
                    <option value="FinanceAgent">⚖️ 财务合规代理 (FinanceAgent)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">子任务优先级</label>
                  <select className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none">
                    <option value="1">P1 - 必须执行</option>
                    <option value="2">P2 - 缓冲执行</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">决策动作说明 (Directives description)</label>
                <textarea 
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="例如: 检索巴黎当地 Maje 最新降价，拟合复购礼券的最小安全折扣成本..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:outline-none leading-relaxed"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-[#07C2E3] hover:bg-[#06B2D0] text-black font-extrabold p-2.5 rounded-lg transition uppercase tracking-wider text-xs"
              >
                ⚡ 下派 Agent 队列并广播执行
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Hierarchical Goal & Task Loop Trace */}
        <div className="lg:col-span-7 space-y-4 text-left">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-xs text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#07C2E3]" />
                  <span>持续认知目标决策树 (Cognitive Goal Hierarchy Tree)</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  点击大盘目标行，可查看并管理其下属 Agent 细粒度执行动作序列
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border px-2 py-0.5 rounded-full font-bold">
                活跃大盘项: {goals.length} 条
              </span>
            </div>

            {/* Tree layout */}
            <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
              {goals.map(goal => {
                const subTasks = tasks.filter(t => t.goal_id === goal.goal_id);
                const isSelected = selectedGoalId === goal.goal_id;

                return (
                  <div 
                    key={goal.goal_id}
                    onClick={() => setSelectedGoalId(goal.goal_id)}
                    className={`border rounded-xl transition-all relative overflow-hidden cursor-pointer ${
                      isSelected 
                        ? 'border-[#07C2E3]/80 bg-slate-900/5 shadow-[0_0_10px_rgba(7,194,227,0.04)]' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {/* Goal Card Header with custom level color */}
                    <div className={`p-4 flex items-start gap-3 justify-between ${getLevelColor(goal.goal_name)}`}>
                      <div className="space-y-1 leading-snug">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[8px] font-black uppercase font-mono border px-1.5 py-0.5 rounded ${getStatusBadge(goal.status)}`}>
                            {goal.status.toUpperCase()}
                          </span>
                          <span className="text-[9.5px] text-slate-500 font-mono">
                            ID: {goal.goal_id} &bull; TYPE: {goal.goal_type.toUpperCase()}
                          </span>
                        </div>
                        <h4 className="text-xs font-extrabold text-slate-900 pt-0.5">{goal.goal_name}</h4>
                        <div className="text-[10.5px] text-slate-600 font-medium">
                          🎯 <strong className="text-slate-700">预期标的指标:</strong> {goal.target_value}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleGoalStatus(goal.goal_id, goal.status)}
                          className="text-[9px] font-mono font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-1 rounded text-slate-700"
                          title="流转目标状态"
                        >
                          流转状态
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.goal_id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition"
                          title="销毁目标决议"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>

                    {/* Subtasks rendering (Only if Selected or has tasks) */}
                    {subTasks.length > 0 && (
                      <div className="bg-slate-50/50 border-t border-slate-150 p-4 space-y-2.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-mono">
                          ↳ 下派代理执行队列 (Active Agent Tasks Execution List)
                        </span>
                        
                        <div className="space-y-2 font-mono">
                          {subTasks.map(task => (
                            <div 
                              key={task.task_id}
                              className="bg-white border border-slate-200 rounded-lg p-3 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-[#07C2E3]/40 transition-all"
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="bg-slate-900 text-[#07C2E3] text-[9px] font-black px-1.5 py-0.5 rounded font-mono">
                                    {task.owner_agent}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold">
                                    PRIORITY: {task.priority}
                                  </span>
                                </div>
                                <p className="text-slate-800 text-[11px] leading-relaxed font-semibold">{task.description}</p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-black border uppercase ${
                                  task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  task.status === 'running' ? 'bg-[#07C2E3]/10 text-[#07C2E3] border-[#07C2E3]/20 animate-pulse' :
                                  task.status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  'bg-slate-100 text-slate-400 border-slate-200'
                                }`}>
                                  ● {task.status}
                                </span>
                                <button
                                  onClick={() => handleToggleTaskStatus(task.task_id, task.status)}
                                  className="text-[8px] border border-slate-200 bg-slate-50 hover:bg-slate-100 px-1.5 py-0.5 rounded font-bold"
                                >
                                  改变
                                </button>
                                <button 
                                  onClick={() => {
                                    dbEngine.planning_tasks.delete(task.task_id);
                                    triggerSuccess('✓ Agent 执行动作已安全清除');
                                  }}
                                  className="text-slate-400 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {subTasks.length === 0 && (
                      <div className="bg-slate-50/20 border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 italic">
                        没有下派给 Agent 的子任务。点击左下角可下发实时纠偏动作。
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
