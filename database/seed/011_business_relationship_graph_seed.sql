-- Seeding Business Graph relationship nodes & edges
-- Connects Supplier performance -> Product quality -> Customer satisfaction -> Campaign ROI

-- 1. Insert Nodes
INSERT INTO business_graph_nodes (id, type, entity_id, label, performance_score, defect_rate_pct, revenue_eur, metadata)
VALUES ('bg_node_sup_01', 'Supplier', 'sup_01', 'Prato Wool Spinning S.p.A. (Italy)', 94, 1.2, NULL, '{"region": "Tuscany", "primary_material": "Cashmere & Merino Blend"}');

INSERT INTO business_graph_nodes (id, type, entity_id, label, performance_score, defect_rate_pct, revenue_eur, metadata)
VALUES ('bg_node_sup_02', 'Supplier', 'sup_02', 'Lyon Silk Weaving Atelier (France)', 72, 3.8, NULL, '{"region": "Auvergne-Rhône-Alpes", "primary_material": "Premium Mulberry Silk"}');

INSERT INTO business_graph_nodes (id, type, entity_id, label, performance_score, return_rate_pct, revenue_eur, metadata)
VALUES ('bg_node_prod_101', 'Product', 'prod_101', 'Ultra-Fine Cashmere Double-Breasted Coat', 96, 2.1, 580000, '{"sku": "CASH-COAT-001", "designer": "MODA Studio Paris"}');

INSERT INTO business_graph_nodes (id, type, entity_id, label, performance_score, return_rate_pct, revenue_eur, metadata)
VALUES ('bg_node_prod_102', 'Product', 'prod_102', 'Hand-Rolled Silk Twill Scarf 90x90', 82, 9.4, 240000, '{"sku": "SILK-SCARF-002", "designer": "Atelier de Lyon"}');

INSERT INTO business_graph_nodes (id, type, entity_id, label, satisfaction_rate, revenue_eur, metadata)
VALUES ('bg_node_cust_lux', 'CustomerSegment', 'seg_lux_01', 'Continental Europe High-Net-Worth Segment', 95, 680000, '{"country_codes": ["FR", "DE", "CH"], "main_preference": "Quiet Luxury"}');

INSERT INTO business_graph_nodes (id, type, entity_id, label, satisfaction_rate, revenue_eur, metadata)
VALUES ('bg_node_cust_elite', 'CustomerSegment', 'seg_elite_01', 'Paris & Milan Emerging Gen-Z Style Leads', 76, 180000, '{"country_codes": ["IT", "FR"], "main_preference": "Avant-Garde Style"}');

INSERT INTO business_graph_nodes (id, type, entity_id, label, roi, revenue_eur, metadata)
VALUES ('bg_node_camp_winter', 'Campaign', 'cmp_01', '2025 Winter Warmth Cashmere Wool Campaign', 4.8, 421000, '{"status": "active", "region": "Rhône-Alpes & Paris"}');

INSERT INTO business_graph_nodes (id, type, entity_id, label, roi, revenue_eur, metadata)
VALUES ('bg_node_camp_bf', 'Campaign', 'cmp_02', '2026 Black Friday European Fast-Turn Defender Campaign', 1.8, 150000, '{"status": "draft"}');

-- 2. Insert Edges
INSERT INTO business_graph_edges (id, source, target, relation_type, weight, direction, explanation)
VALUES ('bg_edge_01', 'bg_node_sup_01', 'bg_node_prod_101', 'SUPPLIES_FOR', 0.95, 'positive', 'Prato Spinning’s 94% high reliability score in supplying grade-A organic cashmere wool directly sustains the 96% high-quality rating of the Double-Breasted Coat.');

INSERT INTO business_graph_edges (id, source, target, relation_type, weight, direction, explanation)
VALUES ('bg_edge_02', 'bg_node_sup_02', 'bg_node_prod_102', 'SUPPLIES_FOR', 0.85, 'negative', 'Lyon Atelier’s recent 3.8% defect rate spike in Mulberry Silk batch caused raw material compromises, directly lowering the finished Silk Scarf quality rating to 82%.');

INSERT INTO business_graph_edges (id, source, target, relation_type, weight, direction, explanation)
VALUES ('bg_edge_03', 'bg_node_prod_101', 'bg_node_cust_lux', 'PURCHASED_BY', 0.90, 'positive', 'High quality of the Cashmere Double-Breasted Coat perfectly satisfies High-Net-Worth buyers, resulting in a stellar 95% satisfaction rating and low 2.1% returns.');

INSERT INTO business_graph_edges (id, source, target, relation_type, weight, direction, explanation)
VALUES ('bg_edge_04', 'bg_node_prod_102', 'bg_node_cust_elite', 'PURCHASED_BY', 0.75, 'negative', 'Silk Scarf shipping delays and resulting material compromises directly triggered negative customer reviews, pulling down Emerging Gen-Z satisfaction rate to 76%.');

INSERT INTO business_graph_edges (id, source, target, relation_type, weight, direction, explanation)
VALUES ('bg_edge_05', 'bg_node_prod_101', 'bg_node_camp_winter', 'PROMOTED_IN', 0.92, 'positive', 'Premium cashmere coat stocking in Alpine warehouses aligned with early cold snaps, driving the Winter Campaign to achieve a peak ROI of 4.8.');

INSERT INTO business_graph_edges (id, source, target, relation_type, weight, direction, explanation)
VALUES ('bg_edge_06', 'bg_node_prod_102', 'bg_node_camp_bf', 'PROMOTED_IN', 0.80, 'negative', 'Low customer satisfaction and raw silk delivery delays directly bottlenecked Black Friday Campaign promotion efficiency, limiting estimated ROI to a weak 1.8.');

INSERT INTO business_graph_edges (id, source, target, relation_type, weight, direction, explanation)
VALUES ('bg_edge_07', 'bg_node_sup_02', 'bg_node_camp_bf', 'INFLUENCED_BY', 0.88, 'negative', 'Lyon supplier’s capacity bottleneck directly constrained active stock for Black Friday, creating a chain reaction where low supplier performance throttled campaign ROI.');

INSERT INTO business_graph_edges (id, source, target, relation_type, weight, direction, explanation)
VALUES ('bg_edge_08', 'bg_node_cust_elite', 'bg_node_camp_bf', 'DRIVES_ROI', 0.78, 'negative', '76% low customer satisfaction in Emerging Gen-Z demographic severely weakened repeat purchases during active Black Friday ad campaigns, depressing overall ROI.');
