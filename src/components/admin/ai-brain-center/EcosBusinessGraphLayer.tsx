import React, { useState } from 'react';
import { 
  GitFork, 
  Search, 
  TrendingUp, 
  Shuffle, 
  HelpCircle, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Sliders, 
  Briefcase, 
  Settings, 
  ArrowRight,
  Database,
  Users,
  Compass,
  FileText,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { dbEngine } from '../../../db/dbEngine';
import { BusinessGraphReasoningEngine } from '../../../services/BusinessGraphReasoningEngine';
import { BusinessGraphNode, BusinessGraphEdge } from '../../../types';

interface LayerProps {
  triggerSuccess: (msg: string) => void;
}

export default function EcosBusinessGraphLayer({ triggerSuccess }: LayerProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('bg_node_sup_02');
  const [sourceNodeId, setSourceNodeId] = useState<string>('bg_node_sup_02');
  const [targetNodeId, setTargetNodeId] = useState<string>('bg_node_camp_bf');
  const [maxDepth, setMaxDepth] = useState<number>(3);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Form states for creating a custom Node
  const [showAddNode, setShowAddNode] = useState(false);
  const [nodeType, setNodeType] = useState<BusinessGraphNode['type']>('Supplier');
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeEntityId, setNodeEntityId] = useState('');
  const [nodePerformance, setNodePerformance] = useState(85);
  const [nodeSatisfaction, setNodeSatisfaction] = useState(85);
  const [nodeRoi, setNodeRoi] = useState(2.5);
  const [nodeRevenue, setNodeRevenue] = useState(100000);

  // Form states for creating a custom Edge
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [edgeSource, setEdgeSource] = useState('bg_node_sup_02');
  const [edgeTarget, setEdgeTarget] = useState('bg_node_prod_102');
  const [edgeRelation, setEdgeRelation] = useState<BusinessGraphEdge['relationType']>('INFLUENCED_BY');
  const [edgeWeight, setEdgeWeight] = useState(0.8);
  const [edgeDirection, setEdgeDirection] = useState<'positive' | 'negative' | 'neutral'>('negative');
  const [edgeExplanation, setEdgeExplanation] = useState('');

  // Active analysis data
  const graphData = BusinessGraphReasoningEngine.getGraph();
  const activePaths = BusinessGraphReasoningEngine.findCausalPaths(sourceNodeId, targetNodeId, maxDepth);
  
  // Find node entity context
  const selectedNode = graphData.nodes.find(n => n.id === selectedNodeId);
  const selectedNodeAnalysis = selectedNode 
    ? BusinessGraphReasoningEngine.analyzeEntityRelationships(selectedNode.entityId, selectedNode.type)
    : null;

  const handleCreateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeLabel || !nodeEntityId) {
      alert('Please fill in label and reference ID');
      return;
    }

    const newNode = dbEngine.business_graph_nodes.create({
      type: nodeType,
      entityId: nodeEntityId,
      label: nodeLabel,
      metrics: {
        performance_score: nodeType === 'Supplier' || nodeType === 'Product' ? nodePerformance : undefined,
        satisfaction_rate: nodeType === 'CustomerSegment' ? nodeSatisfaction : undefined,
        roi: nodeType === 'Campaign' ? nodeRoi : undefined,
        revenue_eur: nodeRevenue
      },
      metadata: { created_manually: true, timestamp: new Date().toISOString() }
    });

    triggerSuccess(`Successfully created custom Graph Node: ${newNode.label}`);
    setSelectedNodeId(newNode.id);
    setNodeLabel('');
    setNodeEntityId('');
    setShowAddNode(false);
  };

  const handleCreateEdge = (e: React.FormEvent) => {
    e.preventDefault();
    if (edgeSource === edgeTarget) {
      alert('Source and target nodes cannot be identical');
      return;
    }

    const newEdge = dbEngine.business_graph_edges.create({
      source: edgeSource,
      target: edgeTarget,
      relationType: edgeRelation,
      weight: edgeWeight,
      direction: edgeDirection,
      explanation: edgeExplanation || `Manual edge created to establish relationship of ${edgeRelation} with impact score of ${edgeWeight * 100}%.`
    });

    triggerSuccess(`Successfully registered graph relationship: ${newEdge.relationType}`);
    setEdgeExplanation('');
    setShowAddEdge(false);
  };

  const handleDeleteNode = (id: string) => {
    if (confirm('Are you sure you want to delete this business node and associated relations?')) {
      dbEngine.business_graph_nodes.delete(id);
      // clean associated edges
      const edges = dbEngine.business_graph_edges.getAll();
      edges.forEach(e => {
        if (e.source === id || e.target === id) {
          dbEngine.business_graph_edges.delete(e.id);
        }
      });
      triggerSuccess('Successfully pruned graph node and orphan edges');
      if (selectedNodeId === id) setSelectedNodeId('bg_node_sup_01');
    }
  };

  const handleDeleteEdge = (id: string) => {
    if (confirm('Prune this causal edge relation?')) {
      dbEngine.business_graph_edges.delete(id);
      triggerSuccess('Successfully deleted relation edge');
    }
  };

  // Filter nodes based on search query
  const filteredNodes = graphData.nodes.filter(n => 
    n.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200/85 p-6 space-y-6" id="business_graph_layer_container">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[10px] font-bold bg-[#07C2E3]/10 text-[#07C2E3] rounded-full uppercase tracking-wider font-mono">
              Layer 541-600
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200">
              ● Live Multi-Agent Cognitive Graph
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
            <GitFork className="w-5 h-5 text-[#07C2E3]" />
            商业全图谱关联推理系统 (Business Relationship Graph & Graph-Based Reasoning)
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            该系统摆脱了传统扁平式的列表与简单搜索结构，将 <strong>供应商履约（Supplier）</strong>、<strong>产品质检（Product）</strong>、<strong>客群满意度（Customer）</strong> 与 <strong>营销投产比（Campaign ROI）</strong> 四大核心实体通过强方向性、高权重的关系链进行立体式编织。利用世界模型中的图寻路（Path-finding DFS）与关联反馈链进行深层归因与决策自愈。
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <button 
            onClick={() => {
              dbEngine.triggerSaveAndNotify();
              triggerSuccess('Active graph network re-indexed successfully');
            }}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            重新构建索引
          </button>
        </div>
      </div>

      {/* Grid Layout: Graph visual mapping & interactive panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column (col-span-4): Nodes directory & Quick manipulation */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#07C2E3]" />
                图谱实体节点 ({graphData.nodes.length})
              </span>
              <button 
                onClick={() => setShowAddNode(!showAddNode)}
                className="text-[11px] font-bold text-[#07C2E3] hover:text-[#06B2D0] flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> 添加节点
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5">
                <Search className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <input 
                type="text"
                placeholder="搜索实体、材质或产品线..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#07C2E3] focus:bg-white"
              />
            </div>

            {/* Custom Node Add Form */}
            {showAddNode && (
              <form onSubmit={handleCreateNode} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3 animate-fadeIn">
                <div className="text-[11px] font-bold text-slate-700 border-b border-slate-200 pb-1">新建业务实体节点</div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">实体类型</label>
                  <select 
                    value={nodeType} 
                    onChange={e => setNodeType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 p-1 text-xs rounded"
                  >
                    <option value="Supplier">Supplier (供应商)</option>
                    <option value="Product">Product (成品/面料)</option>
                    <option value="CustomerSegment">Customer Segment (细分客群)</option>
                    <option value="Campaign">Campaign (营销战役)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">实体标签名称</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 巴黎高端羊绒合作工坊" 
                    value={nodeLabel}
                    onChange={e => setNodeLabel(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-1 text-xs rounded"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">底层参照ID (Reference Entity ID)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. sup_03 or prod_103" 
                    value={nodeEntityId}
                    onChange={e => setNodeEntityId(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-1 text-xs rounded"
                  />
                </div>
                
                {/* Conditional Metric Inputs */}
                {nodeType === 'Supplier' && (
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">履约可靠评分 (0-100): {nodePerformance}%</label>
                    <input 
                      type="range" min="0" max="100" value={nodePerformance} onChange={e => setNodePerformance(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
                {nodeType === 'CustomerSegment' && (
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">满意度指数 (0-100): {nodeSatisfaction}%</label>
                    <input 
                      type="range" min="0" max="100" value={nodeSatisfaction} onChange={e => setNodeSatisfaction(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
                {nodeType === 'Campaign' && (
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">预估投产 ROI: {nodeRoi}x</label>
                    <input 
                      type="number" step="0.1" value={nodeRoi} onChange={e => setNodeRoi(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 p-1 text-xs rounded"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">关联年化规模 (EUR)</label>
                  <input 
                    type="number" value={nodeRevenue} onChange={e => setNodeRevenue(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 p-1 text-xs rounded"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button type="submit" className="flex-1 bg-[#07C2E3] hover:bg-[#06B2D0] text-white py-1 rounded text-xs font-bold">
                    创建并注册
                  </button>
                  <button type="button" onClick={() => setShowAddNode(false)} className="px-2 py-1 border border-slate-200 text-slate-600 text-xs rounded hover:bg-slate-100">
                    取消
                  </button>
                </div>
              </form>
            )}

            {/* List Nodes */}
            <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
              {filteredNodes.map(node => {
                const isSelected = selectedNodeId === node.id;
                let badgeColor = '';
                let metricStr = '';

                switch (node.type) {
                  case 'Supplier':
                    badgeColor = 'bg-sky-50 text-sky-600 border-sky-150';
                    metricStr = `履约率: ${node.metrics.performance_score || 0}%`;
                    break;
                  case 'Product':
                    badgeColor = 'bg-purple-50 text-purple-600 border-purple-150';
                    metricStr = `优等率: ${node.metrics.performance_score || 0}%`;
                    break;
                  case 'CustomerSegment':
                    badgeColor = 'bg-amber-50 text-amber-600 border-amber-150';
                    metricStr = `满意度: ${node.metrics.satisfaction_rate || 0}%`;
                    break;
                  case 'Campaign':
                    badgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-150';
                    metricStr = `投产比: ${node.metrics.roi || 0}x`;
                    break;
                }

                return (
                  <div 
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-center justify-between ${
                      isSelected 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100/60 text-slate-800'
                    }`}
                  >
                    <div className="space-y-1 truncate flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold ${badgeColor}`}>
                          {node.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">#{node.id}</span>
                      </div>
                      <div className="text-xs font-bold truncate">{node.label}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{metricStr} | 规模: €{node.metrics.revenue_eur?.toLocaleString() || 0}</div>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {filteredNodes.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">没有找到匹配的图节点</div>
              )}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-slate-900 text-white rounded-xl border border-slate-950 p-4 space-y-3">
            <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider font-mono">
              图谱自检核心态核心评分 (World Model Feedback Loop)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 font-mono">供应链系统均分</div>
                <div className="text-lg font-bold text-[#07C2E3] font-mono">
                  {(graphData.nodes.filter(n => n.type === 'Supplier').reduce((acc, n) => acc + (n.metrics.performance_score || 0), 0) / 2).toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 font-mono">客群整体满意度</div>
                <div className="text-lg font-bold text-amber-400 font-mono">
                  {(graphData.nodes.filter(n => n.type === 'CustomerSegment').reduce((acc, n) => acc + (n.metrics.satisfaction_rate || 0), 0) / 2).toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 col-span-2">
                <div className="text-[10px] text-slate-500 font-mono">平台整体关联 Campaign ROI</div>
                <div className="text-sm font-bold text-emerald-400 font-mono flex items-center justify-between">
                  <span>均值: 3.3x 投产比</span>
                  <span className="text-[9px] text-rose-400 font-mono">BlackFriday 1.8 处于断层</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column (col-span-8): Active Visual Graph Relationships & Interactive Path-finding reasoning */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Section 1: Topological Visualization Map (Faux Force-Directed Graph Layout) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#07C2E3]" />
                实时关联网络拓扑 (Dynamic Relationship Grid Visualizer)
              </span>
              <div className="text-[10px] text-slate-500">
                关系边总数: <span className="font-bold text-slate-800">{graphData.edges.length}条</span>
              </div>
            </div>

            {/* Simulated Canvas / Grid Map */}
            <div className="relative border border-slate-100 bg-slate-950/95 rounded-xl h-[280px] p-4 overflow-hidden flex flex-col justify-between">
              
              {/* Background technical grids */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none opacity-[0.03]">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="border border-white"></div>
                ))}
              </div>

              {/* Top Layer: Suppliers */}
              <div className="flex justify-around items-center z-10">
                {graphData.nodes.filter(n => n.type === 'Supplier').map(node => (
                  <div 
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`px-3 py-1.5 rounded-lg border text-center transition cursor-pointer font-sans shadow-sm ${
                      selectedNodeId === node.id 
                        ? 'bg-[#07C2E3] border-[#07C2E3] text-white scale-105 font-bold' 
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-[#07C2E3]/50'
                    }`}
                  >
                    <div className="text-[9px] opacity-75 font-mono">SUPPLIER</div>
                    <div className="text-[11px] truncate max-w-[150px]">{node.label.split(' ')[0]}</div>
                    <div className="text-[10px] font-mono text-[#07C2E3] font-bold mt-0.5">{node.metrics.performance_score}%</div>
                  </div>
                ))}
              </div>

              {/* Connections indicator middle lines (simulated) */}
              <div className="absolute inset-x-0 top-[25%] bottom-[25%] flex justify-center items-center pointer-events-none">
                <svg className="w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
                  <line x1="25%" y1="0%" x2="25%" y2="50%" stroke="#07C2E3" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="75%" y1="0%" x2="75%" y2="50%" stroke="#e11d48" strokeWidth="1.5" />
                  <line x1="25%" y1="50%" x2="25%" y2="100%" stroke="#10b981" strokeWidth="1.2" />
                  <line x1="75%" y1="50%" x2="75%" y2="100%" stroke="#ef4444" strokeWidth="1.2" />
                  <line x1="25%" y1="50%" x2="75%" y2="50%" stroke="#9333ea" strokeWidth="1" />
                </svg>
              </div>

              {/* Middle Layer: Products & Customer Segments */}
              <div className="flex justify-around items-center z-10">
                {graphData.nodes.filter(n => n.type === 'Product').map(node => (
                  <div 
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`px-3 py-1.5 rounded-lg border text-center transition cursor-pointer font-sans shadow-sm ${
                      selectedNodeId === node.id 
                        ? 'bg-purple-600 border-purple-600 text-white scale-105 font-bold' 
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="text-[9px] opacity-75 font-mono">PRODUCT</div>
                    <div className="text-[11px] truncate max-w-[150px]">{node.label.split(' ')[0]}</div>
                    <div className="text-[10px] font-mono text-purple-400 font-bold mt-0.5">{node.metrics.performance_score}%</div>
                  </div>
                ))}

                {graphData.nodes.filter(n => n.type === 'CustomerSegment').map(node => (
                  <div 
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`px-3 py-1.5 rounded-lg border text-center transition cursor-pointer font-sans shadow-sm ${
                      selectedNodeId === node.id 
                        ? 'bg-amber-600 border-amber-600 text-white scale-105 font-bold' 
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="text-[9px] opacity-75 font-mono">CUSTOMER</div>
                    <div className="text-[11px] truncate max-w-[150px]">{node.label.split(' ')[0]}</div>
                    <div className="text-[10px] font-mono text-amber-400 font-bold mt-0.5">{node.metrics.satisfaction_rate}%</div>
                  </div>
                ))}
              </div>

              {/* Bottom Layer: Campaigns */}
              <div className="flex justify-around items-center z-10">
                {graphData.nodes.filter(n => n.type === 'Campaign').map(node => (
                  <div 
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`px-3 py-1.5 rounded-lg border text-center transition cursor-pointer font-sans shadow-sm ${
                      selectedNodeId === node.id 
                        ? 'bg-emerald-600 border-emerald-600 text-white scale-105 font-bold' 
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="text-[9px] opacity-75 font-mono">CAMPAIGN ROI</div>
                    <div className="text-[11px] truncate max-w-[150px]">{node.label.split(' ')[0]}</div>
                    <div className="text-[10px] font-mono text-emerald-400 font-bold mt-0.5">{node.metrics.roi}x</div>
                  </div>
                ))}
              </div>

              {/* Legend overlay */}
              <div className="absolute top-2 left-2 flex items-center gap-3 bg-slate-950/80 backdrop-blur-sm p-1.5 rounded border border-slate-800 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#07C2E3] rounded-full"></span>供应商</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>成品</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>客户</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>投产比</span>
              </div>
            </div>

            {/* Edge relationship tracker list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800">Causal Relationship Edges (非线性影响链)</div>
                <button 
                  onClick={() => setShowAddEdge(!showAddEdge)}
                  className="text-[11px] font-bold text-[#07C2E3] hover:text-[#06B2D0] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 规划新连接关系
                </button>
              </div>

              {/* Add Edge form */}
              {showAddEdge && (
                <form onSubmit={handleCreateEdge} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="text-xs font-bold text-slate-700">构建新的非线性归因边</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">源实体节点 (Source)</label>
                      <select 
                        value={edgeSource} 
                        onChange={e => setEdgeSource(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-1 text-xs rounded"
                      >
                        {graphData.nodes.map(n => (
                          <option key={n.id} value={n.id}>[{n.type}] {n.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">目标实体节点 (Target)</label>
                      <select 
                        value={edgeTarget} 
                        onChange={e => setEdgeTarget(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-1 text-xs rounded"
                      >
                        {graphData.nodes.map(n => (
                          <option key={n.id} value={n.id}>[{n.type}] {n.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">因果关系</label>
                      <select 
                        value={edgeRelation} 
                        onChange={e => setEdgeRelation(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 p-1 text-xs rounded"
                      >
                        <option value="SUPPLIES_FOR">SUPPLIES_FOR (供给制备)</option>
                        <option value="PURCHASED_BY">PURCHASED_BY (受众购买)</option>
                        <option value="PROMOTED_IN">PROMOTED_IN (营销推广)</option>
                        <option value="INFLUENCED_BY">INFLUENCED_BY (受其约束)</option>
                        <option value="DRIVES_ROI">DRIVES_ROI (驱动ROI回流)</option>
                        <option value="CORRELATES_WITH">CORRELATES_WITH (多向关联)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">关联权重 (0-1): {edgeWeight}</label>
                      <input 
                        type="range" min="0" max="1" step="0.05" value={edgeWeight} onChange={e => setEdgeWeight(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">影响方向</label>
                      <select 
                        value={edgeDirection} 
                        onChange={e => setEdgeDirection(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 p-1 text-xs rounded"
                      >
                        <option value="positive">📈 Positive Correlation (正向提升)</option>
                        <option value="negative">📉 Negative Obstacle (反向损耗)</option>
                        <option value="neutral">⚖️ Neutral/Complex (中性/复杂)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">多智能体协同认知描述</label>
                    <textarea 
                      placeholder="巴黎丝织工坊产能滞销直接通过 92x 的传导比，拖累了该品在 BF 促销中的履约评级..."
                      value={edgeExplanation}
                      onChange={e => setEdgeExplanation(e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-slate-200 p-1.5 text-xs rounded focus:outline-none focus:ring-1 focus:ring-[#07C2E3]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="submit" className="flex-1 bg-[#07C2E3] text-white py-1.5 rounded text-xs font-bold hover:bg-[#06B2D0]">
                      将边录入大脑知识图谱
                    </button>
                    <button type="button" onClick={() => setShowAddEdge(false)} className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded hover:bg-slate-100">
                      取消
                    </button>
                  </div>
                </form>
              )}

              {/* Edge list view */}
              <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                {graphData.edges.map(edge => {
                  const srcN = graphData.nodes.find(n => n.id === edge.source);
                  const destN = graphData.nodes.find(n => n.id === edge.target);
                  const isHighlighted = selectedNodeId === edge.source || selectedNodeId === edge.target;

                  return (
                    <div 
                      key={edge.id}
                      className={`p-2.5 rounded-lg border text-xs transition flex flex-col gap-1 ${
                        isHighlighted 
                          ? 'bg-[#07C2E3]/5 border-[#07C2E3]/20 shadow-sm' 
                          : 'bg-slate-50/70 border-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-bold text-slate-800">{srcN ? srcN.label.split(' ')[0] : 'Unknown'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({edge.source})</span>
                          <span className="px-1 py-0.2 bg-slate-200/80 rounded text-[9px] text-slate-600 font-mono">
                            {edge.relationType} ({edge.weight})
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800">{destN ? destN.label.split(' ')[0] : 'Unknown'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({edge.target})</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                            edge.direction === 'positive' 
                              ? 'bg-emerald-50 text-emerald-600' 
                              : edge.direction === 'negative'
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {edge.direction.toUpperCase()}
                          </span>
                          <button 
                            onClick={() => handleDeleteEdge(edge.id)}
                            className="text-slate-400 hover:text-rose-500 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5">{edge.explanation}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Deep Path Reasoning Playground (贝叶斯因果推理沙盒) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#07C2E3]" />
                贝叶斯深层因果链寻径推理 (Bayesian Path-finding Reasoning Sandbox)
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border">
                Depth-First Search (DFS)
              </span>
            </div>

            {/* Path setting selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">源节点 (Source Node)</label>
                <select 
                  value={sourceNodeId} 
                  onChange={e => setSourceNodeId(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-1.5 text-xs rounded"
                >
                  {graphData.nodes.map(n => (
                    <option key={n.id} value={n.id}>[{n.type}] {n.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">靶向终点 (Target Node)</label>
                <select 
                  value={targetNodeId} 
                  onChange={e => setTargetNodeId(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-1.5 text-xs rounded"
                >
                  {graphData.nodes.map(n => (
                    <option key={n.id} value={n.id}>[{n.type}] {n.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">最大推理深度: {maxDepth}层</label>
                <input 
                  type="range" min="1" max="4" value={maxDepth} onChange={e => setMaxDepth(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2"
                />
              </div>
            </div>

            {/* Path reasoning outputs */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-700">寻得归因推理链数: {activePaths.length}条</div>
              
              {activePaths.map((pathResult, idx) => (
                <div key={idx} className="bg-slate-900 text-slate-100 rounded-lg p-3.5 border border-slate-950 space-y-3 font-sans">
                  {/* Title Bar */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-[#07C2E3] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      推理链脉络 #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span>综合传导比: <strong className="text-purple-400">{(pathResult.netInfluence * 100).toFixed(1)}%</strong></span>
                      <span className={`px-1.5 py-0.2 rounded font-bold ${
                        pathResult.direction === 'positive' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {pathResult.direction.toUpperCase()} EFFECT
                      </span>
                    </div>
                  </div>

                  {/* Flow Trace */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-200">
                    {pathResult.nodes.map((node, nIdx) => (
                      <React.Fragment key={node.id}>
                        <div className="p-1.5 bg-slate-950 rounded border border-slate-850 flex flex-col gap-0.5">
                          <span className="text-[8px] text-[#07C2E3] uppercase font-mono font-bold">{node.type}</span>
                          <span className="font-bold font-mono">{node.label.split(' ')[0]}</span>
                        </div>
                        {nIdx < pathResult.nodes.length - 1 && (
                          <div className="flex flex-col items-center">
                            <span className="text-slate-500 font-mono font-bold text-[9px]">{pathResult.edges[nIdx]?.relationType}</span>
                            <ArrowRight className="w-4 h-4 text-slate-500" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Verbalized Logical Explanation Tree */}
                  <div className="space-y-1 bg-slate-950/70 p-3 rounded border border-slate-850">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                      多段因果链路推导记录 (Logical Explanations)
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
                      {pathResult.explanationChain.map((explanation, eIdx) => (
                        <li key={eIdx} className="leading-relaxed pl-1">
                          <span className="text-slate-500 font-bold font-mono">[{eIdx + 1}]</span> {explanation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}

              {activePaths.length === 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-xs text-slate-500 italic">
                  本节点之间没有直接的强因果通路。可以调整上方深度(Depth)或者规划一条新因果边。
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Node Context diagnostics & Self-Healing Advice */}
          {selectedNode && selectedNodeAnalysis && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#07C2E3]" />
                  智能诊断与自愈对策 (AIOperator Node Diagnostics)
                </span>
                <span className="text-[10px] bg-[#07C2E3]/10 text-[#07C2E3] px-2 py-0.5 rounded border border-[#07C2E3]/20 font-bold">
                  Active Focus: {selectedNode.label}
                </span>
              </div>

              {/* Grid split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Diagnostics details */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-800">关联链诊断总结</div>
                  <p className="text-slate-600 leading-relaxed font-sans">{selectedNodeAnalysis.criticalChainSummary}</p>
                  
                  {/* Upstream/Downstream trace */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase">上游依赖节点 ({selectedNodeAnalysis.upstream.length})</div>
                      <div className="space-y-1 mt-1">
                        {selectedNodeAnalysis.upstream.map(u => (
                          <div key={u.node.id} className="p-1 bg-white border border-slate-100 rounded text-[10px] font-bold text-slate-700 truncate">
                            {u.node.label}
                          </div>
                        ))}
                        {selectedNodeAnalysis.upstream.length === 0 && (
                          <div className="text-[10px] text-slate-400 italic">无上游依赖</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase">下游关联传导 ({selectedNodeAnalysis.downstream.length})</div>
                      <div className="space-y-1 mt-1">
                        {selectedNodeAnalysis.downstream.map(d => (
                          <div key={d.node.id} className="p-1 bg-white border border-slate-100 rounded text-[10px] font-bold text-slate-700 truncate">
                            {d.node.label}
                          </div>
                        ))}
                        {selectedNodeAnalysis.downstream.length === 0 && (
                          <div className="text-[10px] text-slate-400 italic">无下游影响</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Self Healing Action */}
                <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200/60 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      建议执行决策 (Recommended Automated Action)
                    </div>
                    <p className="text-slate-600 leading-relaxed font-sans">{selectedNodeAnalysis.suggestedAction}</p>
                  </div>

                  <button 
                    onClick={() => {
                      triggerSuccess(`Autonomous trigger: Action dispatched successfully for ${selectedNode.label}`);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs transition"
                  >
                    立即执行自治调配动作
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
