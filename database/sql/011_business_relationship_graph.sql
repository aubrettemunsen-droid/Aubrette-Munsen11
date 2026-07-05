-- DDL Schema representing the Business Graph relationship model
-- Supports Supplier performance, Product quality, Customer satisfaction, and Campaign ROI mapping.

CREATE TABLE IF NOT EXISTS business_graph_nodes (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Supplier', 'Product', 'CustomerSegment', 'Campaign')),
    entity_id VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    performance_score INT,
    satisfaction_rate INT,
    roi DECIMAL(5, 2),
    revenue_eur DECIMAL(15, 2),
    return_rate_pct DECIMAL(5, 2),
    defect_rate_pct DECIMAL(5, 2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_graph_edges (
    id VARCHAR(50) PRIMARY KEY,
    source VARCHAR(50) REFERENCES business_graph_nodes(id) ON DELETE CASCADE,
    target VARCHAR(50) REFERENCES business_graph_nodes(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL CHECK (relation_type IN ('SUPPLIES_FOR', 'PURCHASED_BY', 'PROMOTED_IN', 'INFLUENCED_BY', 'DRIVES_ROI', 'CORRELATES_WITH')),
    weight DECIMAL(3, 2) NOT NULL CHECK (weight BETWEEN 0.0 AND 1.0),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('positive', 'negative', 'neutral')),
    explanation TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices to optimize DFS path-finding searches
CREATE INDEX IF NOT EXISTS idx_bg_nodes_type ON business_graph_nodes(type);
CREATE INDEX IF NOT EXISTS idx_bg_edges_source ON business_graph_edges(source);
CREATE INDEX IF NOT EXISTS idx_bg_edges_target ON business_graph_edges(target);
