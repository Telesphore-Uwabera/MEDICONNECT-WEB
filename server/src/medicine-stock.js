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

/** Sum only this pharmacy's stock rows. A row with no pharmacy is not anyone's stock. */
export function sumPharmacyStock(rows, pharmacyId) {
  const id = Number(pharmacyId);
  return (rows || []).reduce((sum, row) => {
    if (row?.pharmacy_id == null || row.pharmacy_id === "") return sum;
    if (Number.isFinite(id) && id > 0 && Number(row.pharmacy_id) !== id) return sum;
    return sum + (Number(row.quantity) || 0);
  }, 0);
}

export function isLowStock(stock) {
  const quantity = Number(stock?.quantity ?? 0);
  const threshold = Number(stock?.low_stock_threshold ?? 10);
  return quantity > 0 && quantity <= threshold;
}

function scopedViewer(pharmacyId) {
  if (pharmacyId == null || pharmacyId === "") return null;
  const id = Number(pharmacyId);
  return Number.isFinite(id) ? id : 0;
}

/**
 * This pharmacy's own stock rows. A row with no pharmacy_id is ignored.
 */
async function stockScope(alias, table, pharmacyId) {
  if (!(await hasColumn("pharmacy_stocks", "pharmacy_id"))) return { sql: "1=1", params: [] };
  const viewer = scopedViewer(pharmacyId);
  if (viewer != null) {
    return { sql: `${alias}.pharmacy_id = ?`, params: [viewer] };
  }
  if (await hasColumn(table, "pharmacy_id")) {
    return { sql: `${alias}.pharmacy_id = \`${table}\`.pharmacy_id`, params: [] };
  }
  return { sql: "0", params: [] };
}

export async function lowStockFilter(table, pharmacyId = null) {
  const ownQuantity = await hasColumn(table, "quantity");
  const ownThreshold = ownQuantity && await hasColumn(table, "low_stock_threshold");
  const ownSql = ownQuantity
    ? `COALESCE(\`${table}\`.\`quantity\`, 0) > 0 AND COALESCE(\`${table}\`.\`quantity\`, 0) <= ${ownThreshold ? `COALESCE(\`${table}\`.\`low_stock_threshold\`, 10)` : "10"}`
    : "";
  const stockTable = await tableExists("pharmacy_stocks")
    && await hasColumn("pharmacy_stocks", "medicine_id")
    && await hasColumn("pharmacy_stocks", "quantity");
  if (!stockTable) return { sql: ownSql, params: [] };
  const stockThreshold = await hasColumn("pharmacy_stocks", "low_stock_threshold")
    ? "COALESCE(s.low_stock_threshold, 10)"
    : "10";
  const scope = await stockScope("s", table, pharmacyId);
  const fromStock = `EXISTS (
    SELECT 1 FROM pharmacy_stocks s
    WHERE s.medicine_id = \`${table}\`.id
      AND ${scope.sql}
      AND COALESCE(s.quantity, 0) > 0
      AND COALESCE(s.quantity, 0) <= ${stockThreshold}
  )`;
  if (!ownSql) return { sql: fromStock, params: scope.params };
  const missing = `NOT EXISTS (
    SELECT 1 FROM pharmacy_stocks s
    WHERE s.medicine_id = \`${table}\`.id AND ${scope.sql}
  )`;
  return {
    sql: `(${fromStock} OR (${missing} AND ${ownSql}))`,
    params: [...scope.params, ...scope.params],
  };
}

function belongsToViewer(stockRow, medicine, viewer, hasPharmacy) {
  if (!hasPharmacy) return true;
  if (stockRow.pharmacy_id == null || stockRow.pharmacy_id === "") return true;
  const stockPharmacy = Number(stockRow.pharmacy_id);
  if (viewer != null) return stockPharmacy === viewer;
  const owner = Number(medicine?.pharmacy_id);
  return owner > 0 && stockPharmacy === owner;
}

export async function attachMedicineStock(rows, pharmacyId = null) {
  const single = rows != null && !Array.isArray(rows);
  const list = (single ? [rows] : Array.isArray(rows) ? rows : []).filter(Boolean);
  if (!list.length) return rows;
  const ids = [...new Set(list.map((row) => Number(row.id)).filter((id) => id > 0))];
  const byMedicine = new Map();
  const viewer = scopedViewer(pharmacyId);
  if (ids.length && await tableExists("pharmacy_stocks") && await hasColumn("pharmacy_stocks", "medicine_id")) {
    const hasPharmacy = await hasColumn("pharmacy_stocks", "pharmacy_id");
    const params = [...ids];
    let sql = `SELECT * FROM pharmacy_stocks WHERE medicine_id IN (${ids.map(() => "?").join(",")})`;
    if (hasPharmacy && viewer != null) {
      sql += " AND (pharmacy_id = ? OR pharmacy_id IS NULL)";
      params.push(viewer);
    }
    const found = await q(sql, params).catch(() => []);
    const medicines = new Map(list.map((row) => [Number(row.id), row]));
    for (const row of found) {
      const id = Number(row.medicine_id);
      if (!belongsToViewer(row, medicines.get(id), viewer, hasPharmacy)) continue;
      const current = byMedicine.get(id);
      const specific = row.pharmacy_id != null && row.pharmacy_id !== "";
      const currentSpecific = current?.pharmacy_id != null && current?.pharmacy_id !== "";
      if (!current || (specific && !currentSpecific)) byMedicine.set(id, row);
    }
  }
  const decorated = list.map((row) => ({
    ...row,
    stock: stockDetails(row, byMedicine.get(Number(row.id))),
  }));
  return single ? decorated[0] : decorated;
}
