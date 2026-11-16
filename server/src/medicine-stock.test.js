import { describe, expect, it } from "vitest";
import { isLowStock, stockDetails } from "./medicine-stock.js";

describe("medicine stock", () => {
  it("uses a stock row when the server has one", () => {
    const stock = stockDetails(
      { quantity: 40, low_stock_threshold: 5 },
      { quantity: 3, low_stock_threshold: 8, batch_number: "B1", expiry_date: "2026-12-01T00:00:00" },
    );
    expect(stock).toEqual({
      quantity: 3,
      low_stock_threshold: 8,
      batch_number: "B1",
      expiry_date: "2026-12-01",
    });
    expect(isLowStock(stock)).toBe(true);
  });

  it("falls back to the medicine quantity when no stock row exists", () => {
    const stock = stockDetails({ quantity: 4, low_stock_threshold: 10 }, null);
    expect(stock.quantity).toBe(4);
    expect(stock.low_stock_threshold).toBe(10);
    expect(isLowStock(stock)).toBe(true);
    expect(isLowStock(stockDetails({ quantity: 0 }, null))).toBe(false);
  });
});
