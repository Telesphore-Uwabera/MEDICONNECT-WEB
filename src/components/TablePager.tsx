import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const TABLE_PAGE_SIZE = 10;

export function tablePageCount(total: number, size = TABLE_PAGE_SIZE) {
  return Math.max(1, Math.ceil(Math.max(0, total) / size) || 1);
}

export function paginateRows<T>(rows: T[], page: number, size = TABLE_PAGE_SIZE): T[] {
  const current = Math.max(1, page);
  return rows.slice((current - 1) * size, current * size);
}

function pageWindow(page: number, last: number): Array<number | "ellipsis"> {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const keep = new Set([1, last, page, page - 1, page + 1, page - 2, page + 2]);
  const nums = [...keep].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  for (const n of nums) {
    if (out.length && n - (out[out.length - 1] as number) > 1) out.push("ellipsis");
    out.push(n);
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
  if (last <= 1) return null;

  return (
    <nav
      className={cn("flex flex-wrap items-center justify-between gap-2 pt-3", className)}
      aria-label="Pagination"
    >
      <p className="text-[11px] text-muted-foreground">
        {total != null ? (
          <>
            {total} {total === 1 ? "row" : "rows"}
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
          className="h-7 min-w-[28px] px-1.5 rounded-[6px] border border-border/60 text-muted-foreground hover:bg-secondary/40 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed text-xs"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
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
          aria-label="Next page"
        >
          Next
        </button>
        <button
          type="button"
          disabled={current >= last}
          onClick={() => onPageChange(current + 1)}
          className="h-7 min-w-[28px] px-1.5 rounded-[6px] border border-border/60 text-muted-foreground hover:bg-secondary/40 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed text-xs"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
}
