# Data Dictionary: Business Graph Relationship Model (011)

This dictionary details the schemas added to map interconnected business operations spanning Supplier reliability, Product finished quality, Customer segmentation sentiments, and Campaign ROI outcomes.

## Table: `business_graph_nodes`
Represents core corporate operational nodes.

| Column | Type | Nullable | Primary/Foreign Key | Description |
|---|---|---|---|---|
| `id` | VARCHAR(50) | NO | PK | Unique identifier for the node (e.g. `bg_node_sup_01`, `bg_node_prod_101`). |
| `type` | VARCHAR(50) | NO | - | Categorization: `Supplier`, `Product`, `CustomerSegment`, `Campaign`. |
| `entity_id` | VARCHAR(50) | NO | - | Referenced primary domain ID in corresponding standard table (e.g., `sup_01` inside `suppliers`). |
| `label` | VARCHAR(255) | NO | - | High fidelity human-readable display string. |
| `performance_score` | INT | YES | - | Reliability rating (0-100) for Supplier or quality index for Product catalog spec. |
| `satisfaction_rate` | INT | YES | - | Sentimental customer satisfaction score (0-100) for segments. |
| `roi` | DECIMAL(5,2) | YES | - | Marketing Campaign ROI multiplier (e.g., `4.8`). |
| `revenue_eur` | DECIMAL(15,2)| YES | - | Annualized financial scale in Euros (€). |
| `return_rate_pct` | DECIMAL(5,2) | YES | - | Product-specific rate of returns. |
| `defect_rate_pct` | DECIMAL(5,2) | YES | - | Supplier-specific material defect rates. |
| `metadata` | JSONB | YES | - | Additional dynamic tags, regional factors, and key-values. |
| `created_at` | TIMESTAMP | YES | - | Record registration time. |

---

## Table: `business_graph_edges`
Represents the non-linear, multi-directional causal relations and explanations.

| Column | Type | Nullable | Primary/Foreign Key | Description |
|---|---|---|---|---|
| `id` | VARCHAR(50) | NO | PK | Unique connection edge identifier. |
| `source` | VARCHAR(50) | NO | FK | Source node referring to `business_graph_nodes.id`. |
| `target` | VARCHAR(50) | NO | FK | Target node referring to `business_graph_nodes.id`. |
| `relation_type` | VARCHAR(50) | NO | - | Connection nature: `SUPPLIES_FOR`, `PURCHASED_BY`, `PROMOTED_IN`, `INFLUENCED_BY`, `DRIVES_ROI`, `CORRELATES_WITH`. |
| `weight` | DECIMAL(3,2) | NO | - | Absolute correlation strength from `0.00` to `1.00`. |
| `direction` | VARCHAR(20) | NO | - | Direction: `positive` (growth/benefit), `negative` (bottleneck/drag), `neutral`. |
| `explanation` | TEXT | NO | - | In-depth cognitive explanation text synthesized by multi-agent feedback systems. |
| `created_at` | TIMESTAMP | YES | - | Connection creation timestamp. |
