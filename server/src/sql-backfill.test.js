import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sql(name) {
  return readFileSync(path.join(process.cwd(), "server/sql", name), "utf8");
}

describe("reviewed SQL backfills", () => {
  it("fills only patients whose created_at is null and a real source exists", () => {
    const text = sql("2026-11-23-patients-created-at-backfill.sql");
    expect(text.startsWith("--")).toBe(true);
    expect(text).toMatch(/SELECT COUNT\(\*\) AS created_at_null/);
    expect(text).toMatch(/SELECT COUNT\(\*\) AS no_source_left_null/);
    expect(text).toMatch(/START TRANSACTION/);
    expect(text).toMatch(/COMMIT/);
    expect(text).toMatch(/WHERE p\.created_at IS NULL\s+AND COALESCE\(u\.created_at, p\.updated_at\) IS NOT NULL/);
    expect(text).toMatch(/SET p\.created_at = COALESCE\(u\.created_at, p\.updated_at\)/);
    expect(text).not.toMatch(/from ['"]\.\.\/sql/);
  });

  it("sets instant payment_status only where it is blank and a verified payment exists", () => {
    const text = sql("2026-11-23-instant-payment-status-backfill.sql");
    expect(text).toMatch(/SELECT COUNT\(\*\) AS blank_payment_status_with_verified_payment/);
    expect(text).toMatch(/START TRANSACTION/);
    expect(text).toMatch(/COMMIT/);
    expect(text).toMatch(/SET i\.payment_status = 'paid'/);
    expect(text).toMatch(/WHERE \(i\.payment_status IS NULL OR TRIM\(i\.payment_status\) = ''\)/);
    expect(text).toMatch(/LOWER\(p\.status\) IN \('paid', 'completed', 'success', 'successful'\)/);
    expect(text).toMatch(/instant_consultations has 0 rows/);
  });
});
