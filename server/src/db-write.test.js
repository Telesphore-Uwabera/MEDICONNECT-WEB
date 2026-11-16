import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  columns: ["id", "name", "user_id"],
};

vi.mock("mysql2/promise", () => ({
  default: {
    createPool: () => ({
      query: async (sql) => {
        const text = String(sql);
        if (text.includes("information_schema")) {
          return [state.columns.map((name) => ({
            COLUMN_NAME: name,
            DATA_TYPE: "varchar",
            COLUMN_TYPE: "varchar(255)",
            IS_NULLABLE: "YES",
            COLUMN_KEY: "",
            EXTRA: "",
          }))];
        }
        if (text.startsWith("INSERT")) return [{ insertId: 7 }];
        return [{ affectedRows: 1 }];
      },
    }),
  },
}));

const { forgetColumns, insert, update } = await import("./db.js");

describe("db writes", () => {
  beforeEach(() => {
    state.columns = ["id", "name", "user_id", "created_at", "updated_at"];
    forgetColumns("patients");
  });

  it("skips an unknown field and still writes the columns that exist", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(insert("patients", { user_id: 3, name: "Amina", slug: "amina" })).resolves.toBe(7);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("slug"));
    warn.mockRestore();
  });

  it("updates a known column", async () => {
    await expect(update("patients", 3, { name: "Amina" })).resolves.toBeUndefined();
  });
});
