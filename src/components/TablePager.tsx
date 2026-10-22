import { cn } from "@/lib/utils";

export const TABLE_PAGE_SIZE = 10;

export function tablePageCount(total: number, size = TABLE_PAGE_SIZE) {
  return Math.max(1, Math.ceil(Math.max(0, total) / size) || 1);
}

export function paginateRows<T>(rows: T[], page: number, size = TABLE_PAGE_SIZE): T[] {
  const current = Math.max(1, page);
  return rows.slice((current - 1) * size, current * size);
}

export function applyTablePaging(qs: URLSearchParams, page = 1) {
  qs.set("page", String(Math.max(1, page)));
  qs.set("per_page", String(TABLE_PAGE_SIZE));
  return qs;
}

function pageWindow(page: number, last: number): Array<number | "ellipsis"> {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const start = Math.max(1, Math.min(page - 2, last - 4));
  const end = Math.min(last, start + 4);
  const out: Array<number | "ellipsis"> = [];
  if (start > 1) {
    out.push(1);
    if (start > 2) out.push("ellipsis");
  }
  for (let n = start; n <= end; n += 1) out.push(n);
  if (end < last) {
    if (end < last - 1) out.push("ellipsis");
    out.push(last);
  }
  return out;
}

interface TablePagerProps {
  page: number;
  lastPage: number;
  total?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function TablePager({ page, lastPage, total, onPageChange, className }: TablePagerProps) {
  const last = Math.max(1, lastPage);
  const current = Math.min(Math.max(1, page), last);
  if (total === 0) return null;

  return (
    <nav
      className={cn("flex flex-wrap items-center justify-between gap-2 pt-3", className)}
      aria-label="Pagination"
    >
      <p className="text-[11px] text-muted-foreground">
        {total != null ? (
          <>
            {total} {total === 1 ? "row" : "rows"} · 10 per page
          </>
        ) : (
          <>
            Page <span className="font-semibold text-foreground">{current}</span> of{" "}
            <span className="font-semibold text-foreground">{last}</span>
          </>
        )}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          className="h-7 px-2 rounded-[6px] border border-border/60 text-muted-foreground hover:bg-secondary/40 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
        >
          Prev
        </button>
        {pageWindow(current, last).map((item, i) =>
          item === "ellipsis" ? (
            <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === current ? "page" : undefined}
              className={cn(
                "h-7 min-w-[28px] px-2 rounded-[6px] border text-xs font-semibold transition-colors",
                item === current
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/60 text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={current >= last}
          onClick={() => onPageChange(current + 1)}
          className="h-7 px-2 rounded-[6px] border border-border/60 text-muted-foreground hover:bg-secondary/40 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
