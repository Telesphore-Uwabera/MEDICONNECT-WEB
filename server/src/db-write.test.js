import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  columns: ["id", "name", "user_id"],
  queries: [],
};

vi.mock("mysql2/promise", () => ({
  default: {
    createPool: () => ({
      query: async (sql) => {
        const text = String(sql);
        state.queries.push(text);
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
    state.queries = [];
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

  it("never writes a client id on insert or update", async () => {
    await insert("patients", { id: 999, name: "Amina" });
    await update("patients", 3, { id: 999, name: "Amina" });
    const insertSql = state.queries.find((text) => text.startsWith("INSERT"));
    const updateSql = state.queries.find((text) => text.startsWith("UPDATE"));
    expect(insertSql).toMatch(/`name`/);
    expect(insertSql).not.toMatch(/`id`/);
    expect(updateSql.split("WHERE")[0]).toMatch(/`name`/);
    expect(updateSql.split("WHERE")[0]).not.toMatch(/`id`/);
  });
});
