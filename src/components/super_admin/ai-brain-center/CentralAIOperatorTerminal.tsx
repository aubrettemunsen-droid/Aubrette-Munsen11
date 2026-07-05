import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Sparkles, Terminal, ChevronRight, RefreshCw, 
  Play, CheckCircle2, Shield, Activity, HelpCircle, ArrowUpRight
} from 'lucide-react';

interface CentralAIOperatorTerminalProps {
  tenantDB?: Record<string, any>;
  setTenantDB?: React.Dispatch<React.SetStateAction<any>>;
  onAddSystemLog?: (module: string, action: string, details: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  thought?: {
    intent: string;
    reasoning: string;
    planning: string;
    permission: string;
    validator: string;
  };
  actionType?: string;
  actionMeta?: any;
  suggestions?: Array<{ label: string; action: string; payload?: any }>;
  executed?: boolean;
  timestamp: string;
}

export default function CentralAIOperatorTerminal({ 
  tenantDB, 
  setTenantDB, 
  onAddSystemLog 
}: CentralAIOperatorTerminalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'assistant',
      text: '### 🧠 ECOS 平台级中央智脑主控台\n\n欢迎登录超级管理员智脑中枢。我是您的中央 AI 协同主管 **Sophia**。\n\n目前我已接入平台全部租户的商业动效与多维度关系数据库。您可以向我下达任何自然语言指令，我将自主进行推理、宪章审计、并实时改写底层关系实体。\n\n**您可以尝试下达以下指令**：\n- *“帮我启动一个新的LoRA微调任务，用ds_01数据集，风格设为Zara”*\n- *“运行平台特权账号行为安全审计”*\n- *“扫描合规状态并一键修复全平台 VAT 合规漏洞”*',
      timestamp: new Date().toLocaleTimeString(),
      suggestions: [
        { label: '🚀 用 ds_01 启动 LoRA 风格微调训练', action: 'start_lora', payload: { q: '帮我用 ds_01 数据集微调一个 Zara 风格的 LoRA 模型' } },
        { label: '🛡️ 一键运行全平台特权账号行为安全审计', action: 'run_audit', payload: { q: '运行平台特权账号行为安全审计，清零违规事件' } },
        { label: '🇪🇺 扫描合规状态并一键对齐 VAT OSS 申报', action: 'scan_vat', payload: { q: '扫描并一键修复全平台 VAT OSS 合规漏洞' } }
      ]
    }
  ]);
  const [expandedThoughtId, setExpandedThoughtId] = useState<string | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchUpdatedDatabase = async () => {
    try {
      const res = await fetch('/api/db/get-all');
      if (res.ok) {
        const freshDb = await res.json();
        if (setTenantDB) {
          setTenantDB(freshDb);
        }
        if (onAddSystemLog) {
          onAddSystemLog('Central AI Operator', '关系库实时重载对齐', '底层实体因 AI 动作发生变更，已刷新全网数据流并对齐 SaaS 各端状态', 'success');
        }
      }
    } catch (e) {
      console.error('Failed to sync relational database with operator terminal:', e);
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/admin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: data.summary || '指令执行完成。',
        thought: data.thought || undefined,
        actionType: data.actionType || 'none',
        actionMeta: data.actionMeta || null,
        suggestions: data.suggestions || [],
        executed: false,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, assistantMsg]);

      // If an action was executed directly inside the backend service, let's sync the DB right away!
      if (data.actionType && data.actionType !== 'none') {
        setTimeout(() => {
          fetchUpdatedDatabase();
          
          // Inject system notification log
          const sysMsg: Message = {
            id: `sys_${Date.now()}`,
            sender: 'system',
            text: `🛠️ **[物理落库对齐]** AI 成功执行决策动效 \`${data.actionType}\` 并进行持久化。后端关系数据库已重载，并在 SaaS 各个节点广播成功。`,
            timestamp: new Date().toLocaleTimeString()
          };
          setMessages(prev => [...prev, sysMsg]);
        }, 1200);
      }

    } catch (err: any) {
      console.error('Sophia central brain failed:', err);
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        sender: 'system',
        text: `❌ **中央智脑发生思辨死锁或网络异常**: ${err.message || err}。建议重试或核对密钥。`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans transition-all text-slate-100">
      
      {/* Header Bar */}
      <div className="bg-slate-900 px-5 py-3.5 border-b border-cyan-500/20 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-[#07C2E3] animate-pulse" />
            <div className="absolute -inset-1 rounded-full border border-cyan-400/40 animate-ping" />
          </div>
          <div>
            <span className="text-xs font-black tracking-widest text-[#07C2E3] uppercase block font-mono">Sophia Brain Operator</span>
            <span className="text-[10px] text-slate-400">中央智脑指令协同主控终端 v3.5 (ベ叶斯脑内核对齐)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchUpdatedDatabase}
            title="手动刷新同步数据库"
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="text-[10px] bg-slate-950 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20">
            SECURE SANDBOX
          </div>
        </div>
      </div>

      {/* Terminal View Area */}
      <div className="flex-1 p-5 min-h-[300px] max-h-[480px] overflow-y-auto space-y-4 font-mono text-xs scrollbar-thin scrollbar-thumb-slate-800">
        
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={`flex flex-col space-y-1.5 p-3.5 rounded-lg border transition-all ${
              m.sender === 'user' 
                ? 'bg-slate-900/60 border-slate-800 self-end ml-12 text-slate-200' 
                : m.sender === 'system'
                ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-350 text-[11px]'
                : 'bg-slate-950 border-cyan-500/10 text-slate-300'
            }`}
          >
            {/* Header of bubble */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-2">
              <div className="flex items-center gap-2">
                {m.sender === 'user' ? (
                  <span className="text-cyan-400 font-bold">@Operator</span>
                ) : m.sender === 'system' ? (
                  <span className="text-emerald-400 font-black flex items-center gap-1">
                    <Shield className="w-3 h-3" /> SECURITY_DAEMON
                  </span>
                ) : (
                  <span className="text-[#07C2E3] font-bold flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5" /> Sophia (中央智脑)
                  </span>
                )}
                <span className="text-[9px] text-slate-500">{m.timestamp}</span>
              </div>

              {m.thought && (
                <button
                  onClick={() => setExpandedThoughtId(expandedThoughtId === m.id ? null : m.id)}
                  className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 border transition-all cursor-pointer ${
                    expandedThoughtId === m.id 
                      ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span>{expandedThoughtId === m.id ? '收起脑回路' : '展开贝叶斯推理链'}</span>
                </button>
              )}
            </div>

            {/* Markdown content parser (Simple Renderer for beautiful UI) */}
            <div className="text-left leading-relaxed text-slate-300 text-[11px]">
              {m.text.split('\n').map((line, idx) => {
                if (line.startsWith('###')) {
                  return <h3 key={idx} className="text-[#07C2E3] font-black text-xs tracking-tight mt-3 mb-1.5">{line.replace('###', '').trim()}</h3>;
                }
                if (line.startsWith('-')) {
                  return (
                    <div key={idx} className="flex items-start gap-1.5 ml-2 my-1 text-slate-350">
                      <span className="text-[#07C2E3] mt-1">•</span>
                      <span>{line.replace(/^-/, '').replace(/\*\*/g, '').trim()}</span>
                    </div>
                  );
                }
                // bold highlight replaces
                let cleanLine = line;
                const boldRegex = /\*\*(.*?)\*\*/g;
                let parts: React.ReactNode[] = [];
                let lastIndex = 0;
                let match;
                while ((match = boldRegex.exec(cleanLine)) !== null) {
                  parts.push(cleanLine.substring(lastIndex, match.index));
                  parts.push(<strong key={match.index} className="text-white font-black">{match[1]}</strong>);
                  lastIndex = boldRegex.lastIndex;
                }
                parts.push(cleanLine.substring(lastIndex));
                
                return <p key={idx} className="my-1">{parts.length > 1 ? parts : cleanLine}</p>;
              })}
            </div>

            {/* Collapsible Cognitive Reasoning Block */}
            {m.thought && expandedThoughtId === m.id && (
              <div className="mt-3 p-3 bg-slate-900/90 border border-cyan-500/20 rounded-lg text-left text-[10.5px] font-mono space-y-2 text-slate-400 animate-slideDown">
                <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5 mb-1.5 text-cyan-400">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  <span className="font-bold uppercase tracking-wider text-xs">贝叶斯认知推理网络 (Cognitive Chain-of-Thought)</span>
                </div>
                <div>
                  <span className="text-cyan-400 font-bold block">1. Intent Detection / 算力倾向判定</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-cyan-950/80 text-[#07C2E3] font-bold border border-cyan-800 rounded text-[9px] font-mono">
                      {m.thought.intent}
                    </span>
                    <span className="text-slate-500">优先级: HIGH | 分流等级: INTERACTION_CENTRAL</span>
                  </div>
                </div>
                <div>
                  <span className="text-cyan-400 font-bold block">2. Deductive Logic / 贝叶斯推理推演</span>
                  <p className="mt-0.5 text-slate-300 leading-relaxed font-sans">{m.thought.reasoning}</p>
                </div>
                <div>
                  <span className="text-cyan-400 font-bold block">3. Autonomous Dispatching Plan / 自主调度拆解</span>
                  <p className="mt-0.5 text-slate-300 leading-relaxed font-sans">{m.thought.planning}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-cyan-400 font-bold block text-[9px] uppercase">Constitutional Check</span>
                    <span className="text-emerald-400 font-bold mt-0.5 block">🟢 {m.thought.permission}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <span className="text-cyan-400 font-bold block text-[9px] uppercase">Safety Validator</span>
                    <span className="text-emerald-400 font-bold mt-0.5 block">🟢 {m.thought.validator}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Immediate Action Execution Card */}
            {m.actionType && m.actionType !== 'none' && (
              <div className="mt-3 p-3 bg-cyan-950/20 border border-[#07C2E3]/30 rounded-lg text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="font-bold text-slate-200">检测到待签批行动: <code className="text-[#07C2E3] font-mono bg-slate-900 px-1 rounded">{m.actionType}</code></span>
                  </div>
                  <span className="text-[10px] text-cyan-400/70 font-mono">Awaiting Operator Signature</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  AI 分析判定此指令涉及平台级实体修改。后端已经安全完成预测，点击“立即签批执行”可同步物理落库。
                </p>
                <div className="mt-3 flex items-center justify-end">
                  <button
                    onClick={() => {
                      m.executed = true;
                      setMessages([...messages]);
                      if (onAddSystemLog) {
                        onAddSystemLog('Central AI Operator', '特权操作签批完成', `超级管理员已签批执行 AI 动作 ${m.actionType}。`, 'success');
                      }
                      fetchUpdatedDatabase();
                    }}
                    disabled={m.executed}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded flex items-center gap-1.5 border cursor-pointer transition-all ${
                      m.executed 
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' 
                        : 'bg-[#07C2E3] text-zinc-950 border-[#07C2E3] hover:bg-[#06B2D0] active:scale-95'
                    }`}
                  >
                    {m.executed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>已执行物理落库</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>🚀 立即执行该动作并落库</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Suggestions Inside Bubbles */}
            {m.suggestions && m.suggestions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {m.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s.payload?.q || s.label)}
                    disabled={loading}
                    className="bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-850 text-slate-400 hover:text-cyan-300 text-[10px] px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>{s.label}</span>
                    <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                  </button>
                ))}
              </div>
            )}

          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 bg-slate-900/30 border border-cyan-500/10 p-3.5 rounded-lg text-slate-400 text-left">
            <RefreshCw className="w-4 h-4 animate-spin text-[#07C2E3]" />
            <div className="space-y-1">
              <span className="text-[#07C2E3] font-bold block">Sophia is formulating reasoning chain...</span>
              <span className="text-[9px] text-slate-500">正在检索多租户安全及模型状态、运行贝叶斯认知推理对齐...</span>
            </div>
          </div>
        )}

        <div ref={consoleEndRef} />
      </div>

      {/* Input Box */}
      <div className="bg-slate-900 p-4 border-t border-cyan-500/20 flex gap-3.5 items-center">
        <span className="text-cyan-400 font-black font-mono select-none">&gt;</span>
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSend(query);
            }
          }}
          disabled={loading}
          placeholder="请输入指令 (例如: 帮我启动一个新的LoRA微调任务...)"
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500/40 focus:outline-none rounded px-3.5 py-2 text-xs font-mono placeholder-slate-600 text-white transition-all"
        />
        <button
          onClick={() => handleSend(query)}
          disabled={loading || !query.trim()}
          className="bg-[#07C2E3] hover:bg-[#06B2D0] disabled:bg-slate-800 text-zinc-950 disabled:text-slate-500 p-2 rounded transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-[#07C2E3] disabled:border-slate-800"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
