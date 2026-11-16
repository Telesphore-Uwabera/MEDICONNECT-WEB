import { hasColumn, q, tableExists } from "./db.js";

function numberFrom(...values) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

export function stockDetails(medicine, stockRow) {
  const quantity = numberFrom(stockRow?.quantity, medicine?.quantity, medicine?.stock_quantity, medicine?.initial_quantity) ?? 0;
  const threshold = numberFrom(stockRow?.low_stock_threshold, medicine?.low_stock_threshold) ?? 10;
  const expiry = stockRow?.expiry_date ?? medicine?.expiry_date ?? null;
  return {
    quantity,
    low_stock_threshold: threshold,
    batch_number: stockRow?.batch_number ?? medicine?.batch_number ?? null,
    expiry_date: expiry ? String(expiry).slice(0, 10) : null,
  };
}

export function isLowStock(stock) {
  const quantity = Number(stock?.quantity ?? 0);
  const threshold = Number(stock?.low_stock_threshold ?? 10);
  return quantity > 0 && quantity <= threshold;
}

export async function lowStockFilter(table) {
  const ownQuantity = await hasColumn(table, "quantity");
  const ownThreshold = ownQuantity && await hasColumn(table, "low_stock_threshold");
  const ownSql = ownQuantity
    ? `COALESCE(\`${table}\`.\`quantity\`, 0) > 0 AND COALESCE(\`${table}\`.\`quantity\`, 0) <= ${ownThreshold ? `COALESCE(\`${table}\`.\`low_stock_threshold\`, 10)` : "10"}`
    : "";
  const stockTable = await tableExists("pharmacy_stocks")
    && await hasColumn("pharmacy_stocks", "medicine_id")
    && await hasColumn("pharmacy_stocks", "quantity");
  if (!stockTable) return ownSql;
  const stockThreshold = await hasColumn("pharmacy_stocks", "low_stock_threshold")
    ? "COALESCE(s.low_stock_threshold, 10)"
    : "10";
  const fromStock = `EXISTS (
    SELECT 1 FROM pharmacy_stocks s
    WHERE s.medicine_id = \`${table}\`.id
      AND COALESCE(s.quantity, 0) > 0
      AND COALESCE(s.quantity, 0) <= ${stockThreshold}
  )`;
  if (!ownSql) return fromStock;
  return `(${fromStock} OR (NOT EXISTS (SELECT 1 FROM pharmacy_stocks s WHERE s.medicine_id = \`${table}\`.id) AND ${ownSql}))`;
}

export async function attachMedicineStock(rows) {
  const single = rows != null && !Array.isArray(rows);
  const list = (single ? [rows] : Array.isArray(rows) ? rows : []).filter(Boolean);
  if (!list.length) return rows;
  const ids = [...new Set(list.map((row) => Number(row.id)).filter((id) => id > 0))];
  const byMedicine = new Map();
  if (ids.length && await tableExists("pharmacy_stocks") && await hasColumn("pharmacy_stocks", "medicine_id")) {
    const found = await q(
      `SELECT * FROM pharmacy_stocks WHERE medicine_id IN (${ids.map(() => "?").join(",")})`,
      ids,
    ).catch(() => []);
    for (const row of found) {
      const id = Number(row.medicine_id);
      const current = byMedicine.get(id);
      if (!current || (row.pharmacy_id && !current.pharmacy_id)) byMedicine.set(id, row);
    }
  }
  const decorated = list.map((row) => ({
    ...row,
    stock: stockDetails(row, byMedicine.get(Number(row.id))),
  }));
  return single ? decorated[0] : decorated;
}
