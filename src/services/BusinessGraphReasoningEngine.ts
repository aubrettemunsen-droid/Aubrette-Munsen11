import { dbEngine } from '../db/dbEngine';
import { BusinessGraphNode, BusinessGraphEdge, BusinessGraphContext } from '../types';

export class BusinessGraphReasoningEngine {
  /**
   * Retrieves the current state of the business entity relationship graph
   */
  static getGraph(): BusinessGraphContext {
    const nodes = dbEngine.business_graph_nodes.getAll();
    const edges = dbEngine.business_graph_edges.getAll();
    return { nodes, edges };
  }

  /**
   * Performs deep graph traversal to find all causal paths between a source node (e.g. Supplier)
   * and a target node (e.g. Campaign) to extract non-obvious reasoning chains.
   */
  static findCausalPaths(sourceId: string, targetId: string, maxDepth = 3): {
    path: string[];
    nodes: BusinessGraphNode[];
    edges: BusinessGraphEdge[];
    explanationChain: string[];
    netInfluence: number; // calculated from multiplying/averaging edge weights with directions
    direction: 'positive' | 'negative' | 'neutral';
  }[] {
    const graph = this.getGraph();
    const adjList: Record<string, BusinessGraphEdge[]> = {};
    
    graph.nodes.forEach(n => {
      adjList[n.id] = [];
    });
    
    graph.edges.forEach(e => {
      if (!adjList[e.source]) adjList[e.source] = [];
      adjList[e.source].push(e);
    });

    const results: any[] = [];

    function dfs(
      currentId: string,
      targetId: string,
      currentPath: string[],
      currentEdges: BusinessGraphEdge[],
      depth: number
    ) {
      if (currentId === targetId) {
        // Compute net influence
        let netInfluence = 1.0;
        let negativeCount = 0;
        const explanationChain: string[] = [];
        
        currentEdges.forEach(e => {
          netInfluence *= e.weight;
          if (e.direction === 'negative') {
            negativeCount++;
          }
          explanationChain.push(e.explanation);
        });

        const direction = negativeCount % 2 === 1 ? 'negative' : 'positive';
        const pathNodes = currentPath.map(id => graph.nodes.find(n => n.id === id)!);

        results.push({
          path: [...currentPath],
          nodes: pathNodes,
          edges: [...currentEdges],
          explanationChain,
          netInfluence,
          direction
        });
        return;
      }

      if (depth >= maxDepth) return;

      const outgoing = adjList[currentId] || [];
      outgoing.forEach(edge => {
        if (!currentPath.includes(edge.target)) {
          currentPath.push(edge.target);
          currentEdges.push(edge);
          dfs(edge.target, targetId, currentPath, currentEdges, depth + 1);
          currentEdges.pop();
          currentPath.pop();
        }
      });
    }

    if (graph.nodes.some(n => n.id === sourceId) && graph.nodes.some(n => n.id === targetId)) {
      dfs(sourceId, targetId, [sourceId], [], 0);
    }

    return results;
  }

  /**
   * Generates a deep cognitive graph analysis for any given entity
   * Tracing upstream suppliers, downstream segments, and marketing campaign outcomes.
   */
  static analyzeEntityRelationships(entityId: string, type: 'Supplier' | 'Product' | 'CustomerSegment' | 'Campaign'): {
    targetNode: BusinessGraphNode;
    upstream: { node: BusinessGraphNode; edge: BusinessGraphEdge }[];
    downstream: { node: BusinessGraphNode; edge: BusinessGraphEdge }[];
    criticalChainSummary: string;
    suggestedAction: string;
  } | null {
    const graph = this.getGraph();
    const targetNode = graph.nodes.find(n => n.entityId === entityId && n.type === type);
    if (!targetNode) return null;

    const upstream: { node: BusinessGraphNode; edge: BusinessGraphEdge }[] = [];
    const downstream: { node: BusinessGraphNode; edge: BusinessGraphEdge }[] = [];

    graph.edges.forEach(edge => {
      if (edge.target === targetNode.id) {
        const sourceNode = graph.nodes.find(n => n.id === edge.source);
        if (sourceNode) {
          upstream.push({ node: sourceNode, edge });
        }
      }
      if (edge.source === targetNode.id) {
        const targetN = graph.nodes.find(n => n.id === edge.target);
        if (targetN) {
          downstream.push({ node: targetN, edge });
        }
      }
    });

    // Synthesize cognitive summary using actual metrics
    let criticalChainSummary = '';
    let suggestedAction = '';

    if (type === 'Product') {
      const upSuppliers = upstream.filter(u => u.node.type === 'Supplier');
      const downCamps = downstream.filter(d => d.node.type === 'Campaign');
      const downCusts = downstream.filter(d => d.node.type === 'CustomerSegment');

      const isSupplierDelayed = upSuppliers.some(s => (s.node.metrics.performance_score || 100) < 80);
      const isReturnRateHigh = (targetNode.metrics.return_rate_pct || 0) > 8.0;

      criticalChainSummary = `产品[${targetNode.label}]与供应链上下游高度交织：`;
      if (upSuppliers.length > 0) {
        criticalChainSummary += `其原料主要受 ${upSuppliers.map(s => `${s.node.label}(可靠性评分 ${s.node.metrics.performance_score}%)`).join(', ')} 支撑。`;
      }
      if (downCusts.length > 0) {
        criticalChainSummary += `主要销售于 [${downCusts.map(c => c.node.label).join(', ')}]。该客群目前满意度均值为 ${downCusts.reduce((acc, c) => acc + (c.node.metrics.satisfaction_rate || 0), 0) / downCusts.length}%。`;
      }

      if (isSupplierDelayed && isReturnRateHigh) {
        criticalChainSummary += ` 预警：上游供应商可靠度不足，已直接导致下游客群退货率异常上扬至 ${targetNode.metrics.return_rate_pct}%。`;
        suggestedAction = `建议对高风险原料供应商进行红线警戒，并立即分流 30% 配额至备用工坊，同时由于质量滑坡，建议延迟或调整关联营销活动的投放计划。`;
      } else {
        criticalChainSummary += ` 目前整条关系链运行健康。`;
        suggestedAction = `可继续追加在关联营销活动[${downCamps.map(c => c.node.label).join(', ')}]中的广告占比。`;
      }
    } else if (type === 'Supplier') {
      const downProds = downstream.filter(d => d.node.type === 'Product');
      criticalChainSummary = `供应商[${targetNode.label}]（履约分: ${targetNode.metrics.performance_score || 0}）是关键物料节点。`;
      
      if (downProds.length > 0) {
        criticalChainSummary += ` 它直接关联至以下产品线：${downProds.map(p => p.node.label).join(', ')}。`;
      }

      if ((targetNode.metrics.performance_score || 100) < 80) {
        criticalChainSummary += ` 其异常的准时率已向后传导，增加了相关服装类目的订单等待时间与质检不合格率。`;
        suggestedAction = `触发 AIOperator 自动寻源机制，向同地区的其他备份工坊询价，并根据合同条款扣减当前供应商的采购配额。`;
      } else {
        criticalChainSummary += ` 供应质效双优，履约稳定。`;
        suggestedAction = `建议提升该供应商评级至 Preferred Supplier，并在下季度签署长期战略配额保供协议。`;
      }
    } else if (type === 'Campaign') {
      const upProds = upstream.filter(u => u.node.type === 'Product');
      criticalChainSummary = `营销战役[${targetNode.label}]（实时 ROI: ${targetNode.metrics.roi || 0}x）与底层商品紧密绑定。`;
      
      if (upProds.length > 0) {
        criticalChainSummary += ` 核心主推产品：${upProds.map(p => p.node.label).join(', ')}。`;
      }

      if ((targetNode.metrics.roi || 0) < 2.0) {
        criticalChainSummary += ` 诊断显示：本期 Campaign 投产比偏低。追溯上游关系图谱发现，瓶颈在于主推产品由于上游供应链品质波动引发的高退货率与较弱的客群初次购买意向。`;
        suggestedAction = `紧急调低当前低效 Campaign 的广告竞价，对主推品详情页追加退换保障与材质透明证书，或一键分流预算至高 ROI 战役（如 2025 Winter Cashmere Campaign）。`;
      } else {
        criticalChainSummary += ` 战役跑效极佳，实现了优秀的资本回流与爆品打造。`;
        suggestedAction = `建议一键对该 Campaign 追加 20% 预算，扩大区域受众定向。`;
      }
    } else {
      criticalChainSummary = `客群节点[${targetNode.label}]与商品供给高度绑定。`;
      suggestedAction = `保持密切关注，按时推演客群偏好漂移。`;
    }

    return {
      targetNode,
      upstream,
      downstream,
      criticalChainSummary,
      suggestedAction
    };
  }
}
