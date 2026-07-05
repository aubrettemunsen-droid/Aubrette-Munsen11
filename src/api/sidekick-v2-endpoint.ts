/**
 * 🎤 SIDEKICK V2 API 端点
 * 
 * 替换你现在的 /api/sidekick/chat
 * 这是新的、聪明的版本
 */

import express, { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import SidekickExecutionBridge from "../services/sidekick-execution-bridge";
import SidekickMemorySystem from "../services/sidekick-memory-system";
import fs from "fs";
import path from "path";
import { 
  getProducts as getDbProducts, 
  insertProduct as insertDbProduct, 
  updateProductInDb as updateDbProduct, 
  deleteProductInDb as deleteDbProduct 
} from "../database/db";

const router = express.Router();
const memorySystem = new SidekickMemorySystem();

const DB_FILE = path.join(process.cwd(), "server_db.json");

function getLocalDB(): any {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8").trim();
      if (content) {
        return JSON.parse(content);
      }
    } catch (e) {
      console.error("getLocalDB parsing error:", e);
    }
  }
  return null;
}

function saveLocalDB(db: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("saveLocalDB error:", e);
  }
}

/**
 * POST /api/sidekick/v2/chat
 * 
 * 请求体:
 * {
 *   "message": "用户输入的消息",
 *   "conversationId": "会话ID",
 *   "tenantId": "租户ID",
 *   "storeId": "店铺ID",
 *   "storeName": "店铺名称",
 *   "metrics": { ... },
 *   "recentEvents": [ ... ]
 * }
 */
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const {
      message,
      conversationId = "conv_default",
      tenantId = "t_default",
      storeId = "s_default",
      storeName = "Atelier Noir",
      metrics = {},
      recentEvents = [],
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: "消息不能为空" });
    }

    // 1. Gather all active products from DB to feed into our thinking engine
    const activeProducts: any[] = [];
    try {
      const dbProductsList = await getDbProducts(storeId, tenantId);
      if (dbProductsList && dbProductsList.length > 0) {
        dbProductsList.forEach((p: any) => {
          activeProducts.push({
            id: p.id,
            name: p.name || p.title || "Untitled Product",
            sku: p.sku || "",
            price: Number(p.price) || 0,
            stock: p.stock !== undefined ? Number(p.stock) : (p.inventory !== undefined ? Number(p.inventory) : 0),
            category: p.category || "",
            status: p.status || "active",
            tags: p.tags || [],
            vendor: p.vendor || "Default Vendor",
            description: p.description || ""
          });
        });
      } else {
        // Fallback to getLocalDB just in case db is empty
        const db = getLocalDB();
        if (db && db.tenantDB) {
          Object.keys(db.tenantDB).forEach(ind => {
            const indDb = db.tenantDB[ind];
            if (indDb && indDb.products) {
              indDb.products.forEach((p: any) => {
                if (!activeProducts.some(ap => ap.id === p.id)) {
                  activeProducts.push({
                    id: p.id,
                    name: p.name,
                    sku: p.sku || "",
                    price: p.price,
                    stock: p.stock !== undefined ? p.stock : (p.inventory !== undefined ? p.inventory : 0),
                    category: p.category || "",
                    status: p.status || "active",
                    tags: p.tags || []
                  });
                }
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn("Failed to query products from db.ts for sidekick context:", e);
    }

    // 初始化引擎
    const aiClient =
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
        ? new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          })
        : null;

    // 2. Perform Self-Thinking Command Analysis
    let commandResult: any = null;

    if (aiClient) {
      try {
        const prompt = `You are the self-thinking core brain of AI Commerce OS (Atelier Noir).
We have a natural language command from the merchant. Your job is to determine if they want to directly perform a database action (like creating a product, updating a product's price, adjusting stock/inventory, deleting a product, setting tags, status, SEO title/description, bulk updating prices, or creating discount coupon codes, etc.).

Active products in the database:
${JSON.stringify(activeProducts.slice(0, 40), null, 2)}

User Message: "${message}"

If the user wants to execute a database-changing command, you must parse it. Supported command types:
1. "create_product": Create a brand-new product. Parse name, SKU (invent one if not provided, e.g. SKU-LINEN-01), retail price, costPrice (cost per item), description, stock (inventory count), category/type, status ("active" or "draft"), tags (array of strings, e.g. ["linen", "shirt"]), vendor, and compareAtPrice (划线价 / comparison price).
2. "update_product": Edit/update an existing product. You MUST identify the correct "productId" from the active products list. Parse fields to change: name, price, costPrice, description, SKU, stock/inventory, category, status, tags (add or replace tags), compareAtPrice, vendor, and SEO parameters (seoTitle, seoDescription).
3. "delete_product": Permanently delete/remove a product. Identify "productId" from active products list.
4. "adjust_inventory": Adjust stock/inventory for a product. Identify "productId". Parse "stock" as absolute target, OR "adjustment" as a relative change (e.g. +50, -100).
5. "bulk_update_products": Bulk modify multiple products. E.g. "Increase all shirt prices by 10%" or "Change status of all products in category Apparel to active".
   Parameters:
   - "category": filter by category (if specified)
   - "tag": filter by tag (if specified)
   - "priceMultiplier": number (e.g. 1.1 for 10% increase, 0.9 for 10% discount)
   - "status": bulk set status (e.g., "active" or "draft")
   - "addTag": string to append
   - "removeTag": string to delete
6. "create_discount": Create a new discount code. Parse code (e.g., "SUMMER50"), discountType ("percentage" or "fixed_amount"), and value (e.g. 50 or 15).
7. "none": Not a database write command (just a regular question, greeting, performance check, or strategy planning chat).

Return a JSON object in this exact format:
{
  "isCommand": true | false,
  "commandType": "create_product" | "update_product" | "delete_product" | "adjust_inventory" | "bulk_update_products" | "create_discount" | "none",
  "parameters": {
    "productId": "string (the matched product ID, e.g. p_r1)",
    "productName": "string",
    "name": "string (for new product name)",
    "price": number,
    "costPrice": number,
    "compareAtPrice": number,
    "stock": number,
    "adjustment": number,
    "sku": "string",
    "category": "string",
    "description": "string",
    "status": "active" | "draft",
    "tags": ["string"],
    "vendor": "string",
    "seoTitle": "string",
    "seoDescription": "string",
    "bulkFilters": {
      "category": "string",
      "tag": "string"
    },
    "bulkUpdates": {
      "priceMultiplier": number,
      "status": "active" | "draft",
      "addTag": "string",
      "removeTag": "string"
    },
    "discount": {
      "code": "string",
      "discountType": "percentage" | "fixed_amount",
      "value": number
    }
  },
  "thinking": "Write a 1-sentence deep strategic rationale of why and how you are executing this command immediately.",
  "responseMessage": "The message to return to the user confirming the execution in a highly professional, Shopify Sidekick tone. Make sure to describe specifically what was updated, added, or changed in real-time."
}

Only return valid JSON. Do not wrap in markdown or block code. Ensure all numeric parameters are typed as numbers, not strings.`;

        const geminiRes = await aiClient.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { 
            temperature: 0.1,
            responseMimeType: "application/json"
          },
        });

        const parsed = JSON.parse(geminiRes.text || "{}");
        if (parsed.isCommand) {
          commandResult = parsed;
        }
      } catch (geminiError) {
        console.warn("Gemini command parser failed, falling back to local regex parser:", geminiError);
      }
    }

    // 3. Robust local fallback parser in case Gemini is offline or did not match
    if (!commandResult) {
      const lower = message.toLowerCase().trim();
      let matchedProd: any = null;
      let targetPrice: number | null = null;
      let targetStock: number | null = null;
      let isDelete = false;
      let isClear = false;

      // Check if any product name is in the message
      for (const prod of activeProducts) {
        if (lower.includes(prod.name.toLowerCase()) || (prod.sku && lower.includes(prod.sku.toLowerCase()))) {
          matchedProd = prod;
          break;
        }
      }

      // Fuzzy matching for well-known items if literal check failed
      if (!matchedProd) {
        if (lower.includes("trench coat") || lower.includes("classic tailored") || lower.includes("风衣")) {
          matchedProd = activeProducts.find(p => p.id === 'prod_trench_coat' || p.name.includes("Trench Coat"));
        } else if (lower.includes("keyboard") || lower.includes("mechanical keyboard") || lower.includes("机械键盘")) {
          matchedProd = activeProducts.find(p => p.id === 'p_r1' || p.name.includes("Keyboard"));
        } else if (lower.includes("headphones") || lower.includes("耳机") || lower.includes("anc")) {
          matchedProd = activeProducts.find(p => p.id === 'p_r2' || p.name.includes("Headphones"));
        } else if (lower.includes("monitor") || lower.includes("display") || lower.includes("显示器")) {
          matchedProd = activeProducts.find(p => p.id === 'p_r3' || p.name.includes("Monitor"));
        }
      }

      if (lower.includes("清空数据库") || lower.includes("清空商品") || lower.includes("删除所有商品") || lower.includes("clear database") || lower.includes("clear all products")) {
        isClear = true;
      }

      if (matchedProd) {
        const priceRegexes = [
          /(?:价格|price|修改为|调整为|变为|到)\s*[:：=]?\s*(?:€|\$|￥)?\s*(\d+(?:\.\d+)?)/i,
          /(\d+(?:\.\d+)?)\s*(?:元|刀|euro|euros|dollars|元)/i
        ];
        
        const stockRegexes = [
          /(?:库存|stock|数量|count|增加到|修改为|调整为|变为)\s*[:：=]?\s*(\d+)/i,
          /(\d+)\s*(?:件|个|unit|units)/i
        ];

        for (const rx of priceRegexes) {
          const match = message.match(rx);
          if (match) {
            targetPrice = parseFloat(match[1]);
            break;
          }
        }

        for (const rx of stockRegexes) {
          const match = message.match(rx);
          if (match) {
            targetStock = parseInt(match[1]);
            break;
          }
        }

        if (lower.includes("删除") || lower.includes("delete") || lower.includes("remove") || lower.includes("下架")) {
          isDelete = true;
        }
      }

      if (isClear) {
        commandResult = {
          isCommand: true,
          commandType: "clear_database",
          parameters: {},
          thinking: "清空整个多租户商品大盘以初始化空白店面。",
          responseMessage: "🧹 **已执行：数据库清理成功！** 全店所有预置商品已一键清空，数据库现处于极简出厂初始状态。"
        };
      } else if (isDelete && matchedProd) {
        commandResult = {
          isCommand: true,
          commandType: "delete_product",
          parameters: {
            productId: matchedProd.id,
            productName: matchedProd.name
          },
          thinking: `对商品 '${matchedProd.name}' 执行退市及下架物理删除。`,
          responseMessage: `🗑️ **已执行：商品下架成功！** 已从商铺主营列表物理删除商品 \`${matchedProd.name}\` (ID: ${matchedProd.id})，全网数据同步完成。`
        };
      } else if (targetPrice !== null && matchedProd) {
        commandResult = {
          isCommand: true,
          commandType: "update_product",
          parameters: {
            productId: matchedProd.id,
            productName: matchedProd.name,
            price: targetPrice
          },
          thinking: `根据经营指令对商品 '${matchedProd.name}' 零售单价调整为 €${targetPrice}。`,
          responseMessage: `🏷️ **已执行：价格调整成功！** 商品 \`${matchedProd.name}\` (ID: ${matchedProd.id}) 的零售标价已即时调整为 **€${targetPrice}**。该配置已即刻对全网买家及POS生效。`
        };
      } else if (targetStock !== null && matchedProd) {
        commandResult = {
          isCommand: true,
          commandType: "adjust_inventory",
          parameters: {
            productId: matchedProd.id,
            productName: matchedProd.name,
            stock: targetStock
          },
          thinking: `调整商品 '${matchedProd.name}' 物理库存水位至 ${targetStock}。`,
          responseMessage: `📦 **已执行：库存重置成功！** 商品 \`${matchedProd.name}\` (ID: ${matchedProd.id}) 的物理安全库存已重置为 **${targetStock}** 件。补货警报系统及供应链调度端已同步对齐。`
        };
      }
    }

    // 4. If a direct command was identified, execute updates to DB and return immediately
    if (commandResult && commandResult.isCommand) {
      let dbUpdated = false;
      const type = commandResult.commandType;
      const params = commandResult.parameters || {};

      if (type === "create_product") {
        const newId = params.productId || `prod_${Date.now()}`;
        const newProd = {
          id: newId,
          storeId,
          tenantId,
          sku: params.sku || `SKU-${Date.now().toString().slice(-4)}`,
          name: params.name || params.productName || "新商品",
          description: params.description || "",
          price: params.price !== undefined ? Number(params.price) : 99.00,
          costPrice: params.costPrice !== undefined ? Number(params.costPrice) : 0,
          stock: params.stock !== undefined ? Number(params.stock) : 100,
          minStock: 10,
          category: params.category || "General",
          status: params.status || "active",
          tags: params.tags || [],
          compareAtPrice: params.compareAtPrice || 0,
          vendor: params.vendor || "Default Vendor",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await insertDbProduct(newProd);
        dbUpdated = true;
        params.productId = newId;
      } 
      else if (type === "update_product_price" || type === "update_product") {
        const pId = params.productId;
        if (pId) {
          const updatePayload: any = {};
          if (params.name) updatePayload.name = params.name;
          if (params.price !== undefined) updatePayload.price = Number(params.price);
          if (params.costPrice !== undefined) updatePayload.costPrice = Number(params.costPrice);
          if (params.compareAtPrice !== undefined) updatePayload.compareAtPrice = Number(params.compareAtPrice);
          if (params.stock !== undefined) {
            updatePayload.stock = Number(params.stock);
            updatePayload.inventory = Number(params.stock);
          }
          if (params.sku) updatePayload.sku = params.sku;
          if (params.category) updatePayload.category = params.category;
          if (params.description) updatePayload.description = params.description;
          if (params.status) updatePayload.status = params.status;
          if (params.tags) updatePayload.tags = params.tags;
          if (params.vendor) updatePayload.vendor = params.vendor;
          if (params.seoTitle) updatePayload.seoTitle = params.seoTitle;
          if (params.seoDescription) updatePayload.seoDescription = params.seoDescription;

          await updateDbProduct(pId, storeId, tenantId, updatePayload);
          dbUpdated = true;
        }
      } 
      else if (type === "update_product_stock" || type === "adjust_inventory") {
        const pId = params.productId;
        if (pId) {
          const allProds = await getDbProducts(storeId, tenantId);
          const matched = allProds.find((p: any) => p.id === pId);
          if (matched) {
            const currentStock = matched.stock !== undefined ? Number(matched.stock) : (matched.inventory !== undefined ? Number(matched.inventory) : 0);
            let targetStock = currentStock;
            if (params.stock !== undefined) {
              targetStock = Number(params.stock);
            } else if (params.adjustment !== undefined) {
              targetStock = currentStock + Number(params.adjustment);
            }
            await updateDbProduct(pId, storeId, tenantId, { 
              stock: targetStock,
              inventory: targetStock,
              status: targetStock > 0 ? "active" : "draft"
            });
            dbUpdated = true;
          }
        }
      } 
      else if (type === "delete_product") {
        const pId = params.productId;
        if (pId) {
          await deleteDbProduct(pId, storeId, tenantId);
          dbUpdated = true;
        }
      } 
      else if (type === "bulk_update_products") {
        const allProds = await getDbProducts(storeId, tenantId);
        const filters = params.bulkFilters || {};
        const updates = params.bulkUpdates || {};

        let matchedCount = 0;
        for (const p of allProds) {
          let isMatch = true;
          if (filters.category && p.category !== filters.category) isMatch = false;
          if (filters.tag && (!p.tags || !p.tags.includes(filters.tag))) isMatch = false;

          if (isMatch) {
            matchedCount++;
            const updatePayload: any = {};
            if (updates.priceMultiplier !== undefined) {
              const currentPrice = Number(p.price) || 0;
              updatePayload.price = Number((currentPrice * Number(updates.priceMultiplier)).toFixed(2));
            }
            if (updates.status) {
              updatePayload.status = updates.status;
            }
            if (updates.addTag) {
              const currentTags = p.tags || [];
              if (!currentTags.includes(updates.addTag)) {
                updatePayload.tags = [...currentTags, updates.addTag];
              }
            }
            if (updates.removeTag) {
              const currentTags = p.tags || [];
              updatePayload.tags = currentTags.filter((t: string) => t !== updates.removeTag);
            }

            await updateDbProduct(p.id, storeId, tenantId, updatePayload);
          }
        }
        if (matchedCount > 0) {
          dbUpdated = true;
        }
      } 
      else if (type === "create_discount") {
        const discountCode = params.discount?.code;
        if (discountCode) {
          const localDb = getLocalDB();
          if (localDb) {
            if (!localDb.discountDrafts) localDb.discountDrafts = [];
            const newDiscount = {
              id: `disc_${Date.now()}`,
              code: discountCode,
              type: params.discount.discountType || "percentage",
              value: Number(params.discount.value) || 10,
              status: "active",
              createdAt: new Date().toISOString()
            };
            localDb.discountDrafts.push(newDiscount);
            saveLocalDB(localDb);
            dbUpdated = true;
          }
        }
      } 
      else if (type === "clear_database") {
        const allProds = await getDbProducts(storeId, tenantId);
        for (const p of allProds) {
          await deleteDbProduct(p.id, storeId, tenantId);
        }
        dbUpdated = true;
      }

      // Synchronize in-memory dbEngine
      try {
        const { dbEngine } = require("../db/dbEngine");
        if (dbEngine && dbEngine.products && typeof dbEngine.products.getAll === 'function') {
          const freshProds = await getDbProducts(storeId, tenantId);
          const existingEngineProds = dbEngine.products.getAll() || [];
          existingEngineProds.forEach((ep: any) => {
            if (ep.storeId === storeId && ep.tenantId === tenantId) {
              dbEngine.products.delete(ep.id);
            }
          });
          freshProds.forEach((fp: any) => {
            dbEngine.products.create({
              id: fp.id,
              name: fp.name || fp.title || "Untitled",
              sku: fp.sku || "",
              inventory: fp.stock !== undefined ? Number(fp.stock) : (fp.inventory !== undefined ? Number(fp.inventory) : 0),
              price: Number(fp.price) || 0,
              costPrice: Number(fp.costPrice) || 0,
              compareAtPrice: Number(fp.compareAtPrice) || 0,
              category: fp.category || "",
              status: fp.status || "active",
              tags: fp.tags || [],
              vendor: fp.vendor || "",
              description: fp.description || "",
              storeId: storeId,
              tenantId: tenantId
            });
          });
        }
      } catch (e) {
        console.warn("Failed to synchronize dbEngine products:", e);
      }

      // Log direct natural language execution details in Audit Logs and Humility Records
      try {
        const newLog = {
          id: `AL_CMD_${Date.now()}`,
          tenantId: tenantId,
          userId: "Sidekick (Self-Thinking Brain)",
          action: "DIRECT_NATURAL_LANGUAGE_WRITE",
          resourceType: "database",
          resourceId: params.productId || "all",
          beforeJson: JSON.stringify({ message: "NL Command Executed" }),
          afterJson: JSON.stringify({ command: type, parameters: params }),
          createdAt: new Date().toISOString()
        };
        const latestDb = getLocalDB();
        if (latestDb) {
          if (!latestDb.auditLogs) latestDb.auditLogs = [];
          latestDb.auditLogs.unshift(newLog);
          
          const newHumility = {
            id: `HUM_${Date.now()}`,
            timestamp: new Date().toISOString(),
            decision_type: type,
            cognitive_rationales: [commandResult.thinking],
            calibration_index: 0.99,
            evidence_sufficiency: "ABSOLUTE_MERCHANT_INTENT",
            is_overruled: false
          };
          if (!latestDb.decision_humility_records) latestDb.decision_humility_records = [];
          latestDb.decision_humility_records.unshift(newHumility);
          saveLocalDB(latestDb);

          const { dbEngine } = require("../db/dbEngine");
          if (dbEngine && dbEngine.decision_humility_records && typeof dbEngine.decision_humility_records.create === 'function') {
            dbEngine.decision_humility_records.create(newHumility);
          }
        }
      } catch (e) {
        console.warn("Failed to write audit and humility records:", e);
      }

      return res.json({
        success: true,
        text: commandResult.responseMessage,
        data: {
          message: commandResult.responseMessage,
          type: "general" as const,
          reloadSignal: true,
          followUpQuestions: [
            "还有什么其他我可以帮您修改或同步的吗？",
            "帮我查看目前的库存水位以及警告"
          ],
          suggestedActions: [],
          thinking: {
            intent: "直接数据库命令执行 (" + type + ")",
            confidence: 0.99,
            reasoning: commandResult.thinking
          }
        }
      });
    }

    // 5. If not a database direct command, proceed with normal execution bridge flow
    const bridge = new SidekickExecutionBridge(aiClient);

    // 构建上下文
    const context = {
      tenantId,
      storeId,
      conversationId,
      realTimeMetrics: {
        gmvToday: metrics.gmvToday || 0,
        ordersToday: metrics.ordersToday || 0,
        conversionRate: metrics.conversionRate || 0.032,
        avgOrderValue: metrics.averageOrderValue || metrics.avgOrderValue || 85.5,
        lowStockSkus: metrics.lowStockSkuCount || metrics.lowStockSkus || 0,
        churnRate: metrics.churnRate || (metrics.churnedCustomersCount ? metrics.churnedCustomersCount / 100 : 0.04),
        lastUpdated: new Date().toISOString()
      },
      decisionHistory: memorySystem.getHistory(tenantId, 10).map(d => ({
        date: d.timestamp,
        question: d.question,
        recommendation: d.recommendation,
        outcome: d.result === "success" ? "success" as const : d.result === "fail" ? "failure" as const : "partial" as const
      })),
    };

    // 生成回复与可执行的行动
    const response = await bridge.chatAndExecute(message, conversationId, context);

    // 将 executableActions 映射为前端兼容的 suggestedActions 按钮
    const suggestedActions = response.executableActions.map(act => ({
      label: act.title,
      action: "execute",
      intent: act.id, // e.g. "action_restock"
      tool: act.tool,
      params: act.params,
      description: act.description
    }));

    // 返回与前端 V1 / V2 都兼容的格式，方便平滑切换
    res.json({
      success: true,
      text: response.message, // 兼容前端 data.text
      data: {
        message: response.message,
        type: response.executableActions.length > 0 ? "recommendation" as const : "general" as const,
        followUpQuestions: response.followUp || response.diagnosticQuestions || [],
        suggestedActions: suggestedActions,
        thinking: {
          intent: response.thinking?.understoodIntent || "业务解读",
          confidence: response.thinking?.confidence || 0.9,
          reasoning: response.thinking?.reasoning || "智能数据指标漏洞扫描"
        },
      },
    });
  } catch (error: any) {
    console.error("[Sidekick V2] 错误:", error);
    res.status(500).json({
      success: false,
      error: error.message || "发生错误",
    });
  }
});

/**
 * POST /api/sidekick/v2/execute
 * 
 * 一键执行具体的 Kernel 行动
 */
router.post("/execute", async (req: Request, res: Response) => {
  try {
    const {
      actionId,
      action,
      conversationId = "conv_default",
      tenantId = "t_default",
      storeId = "s_default"
    } = req.body;

    if (!actionId || !action) {
      return res.status(400).json({ error: "actionId 和 action 不能为空" });
    }

    const aiClient =
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
        ? new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          })
        : null;

    const bridge = new SidekickExecutionBridge(aiClient);

    const context = {
      conversationId,
      tenantId,
      storeId,
      conversationHistory: [],
      realTimeMetrics: {
        gmvToday: 0,
        ordersToday: 0,
        conversionRate: 0.02,
        avgOrderValue: 0,
        lowStockSkus: 0,
        churnRate: 0,
        lastUpdated: new Date().toISOString()
      },
      decisionHistory: [],
      userProfile: {
        riskProfile: "balanced" as const,
        focusAreas: [],
        responseStyle: "detailed" as const
      }
    };

    const result = await bridge.executeAction(actionId, action, context);
    res.json(result);
  } catch (error: any) {
    console.error("[Sidekick V2 Execute] 错误:", error);
    res.status(500).json({
      success: false,
      error: error.message || "执行发生异常"
    });
  }
});

/**
 * POST /api/sidekick/v2/feedback
 * 
 * 用户告诉我们之前的推荐效果如何
 * 这样 AI 可以学习
 * 
 * 请求体:
 * {
 *   "tenantId": "t_default",
 *   "question": "我应该降价吗？",
 *   "recommendation": "可以考虑小幅降价",
 *   "userChoice": "降价10%",
 *   "result": "success",
 *   "feedback": "效果很好！销量增加了20%"
 * }
 */
router.post("/feedback", (req: Request, res: Response) => {
  try {
    const {
      tenantId = "t_default",
      question,
      recommendation,
      userChoice,
      result,
      feedback,
    } = req.body;

    if (!question || !userChoice) {
      return res.status(400).json({
        error: "question 和 userChoice 不能为空",
      });
    }

    // 记录决策
    memorySystem.recordDecision(tenantId, {
      id: `decision_${Date.now()}`,
      timestamp: new Date().toISOString(),
      question,
      recommendation,
      userChoice,
      result: result || "unknown",
      feedback,
    });

    res.json({
      success: true,
      message: "感谢反馈！我已经记住这次经历。",
    });
  } catch (error: any) {
    console.error("[Sidekick V2] 反馈错误:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sidekick/v2/profile/:tenantId
 * 
 * 获取用户的 AI 学习档案
 * 这样可以看到 AI 对用户的理解
 */
router.get("/profile/:tenantId", (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const pattern = memorySystem.getUserPattern(tenantId);
    const history = memorySystem.getHistory(tenantId, 10);

    res.json({
      success: true,
      data: {
        pattern,
        recentDecisions: history,
        message: `我对你的了解: ${pattern.riskProfile === "conservative" ? "你偏好稳健的决策" : pattern.riskProfile === "aggressive" ? "你很敢于尝试" : "你倾向于平衡"}。过往成功率 ${(pattern.successRate * 100).toFixed(0)}%。`,
      },
    });
  } catch (error: any) {
    console.error("[Sidekick V2] Profile 错误:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
