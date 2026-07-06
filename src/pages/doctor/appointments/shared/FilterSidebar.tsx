import { useTranslation } from "react-i18next";
import { X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppointmentApiStatus, AppointmentApiType } from "@/hooks/doctor/use-doctor-appointment";
import { type FilterState, type SortOption, INITIAL_FILTERS, SORT_OPTIONS } from "./types";

// ─── Atoms ────────────────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80 mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-2 rounded-[6px] text-sm border transition-all duration-200 text-left",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
}

export function FilterSidebar({ filters, setFilters, hasActiveFilters, clearAllFilters }: Props) {
  const { t } = useTranslation();
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <>
      <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{t("pages.doctor.filters")}</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />{t("pages.doctor.reset_all")}
          </button>
        )}
      </div>

      <div className="px-3.5">
        <FilterSection title={t("pages.doctor.status")}>
          <PillGroup<AppointmentApiStatus | "All">
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "All", label: t("pages.doctor.all_statuses") },
              { value: "pending", label: t("pages.doctor.status_pending") },
              { value: "confirmed", label: t("pages.doctor.status_confirmed") },
              { value: "in_progress", label: t("pages.doctor.status_in_progress") },
              { value: "completed", label: t("pages.doctor.status_completed") },
            ]}
          />
        </FilterSection>

        <FilterSection title={t("pages.doctor.type")}>
          <PillGroup<AppointmentApiType | "All">
            value={filters.type}
            onChange={(v) => set("type", v)}
            options={[
              { value: "All", label: t("pages.doctor.all_types") },
              { value: "online", label: t("pages.doctor.video_consult") },
              { value: "in_person", label: t("pages.doctor.in_person_visit") },
            ]}
          />
        </FilterSection>

        <FilterSection title={t("pages.doctor.when")}>
          <div className="flex flex-col gap-1 mb-2">
            {[
              { label: t("pages.doctor.all_dates"), today: false, upcoming: false },
              { label: t("pages.doctor.today"), today: true, upcoming: false },
              { label: t("pages.doctor.upcoming"), today: false, upcoming: true },
            ].map((opt) => {
              const active = filters.today === opt.today && filters.upcoming === opt.upcoming && !filters.date;
              return (
                <button
                  key={opt.label}
                  onClick={() =>
                    setFilters((f) => ({ ...f, today: opt.today, upcoming: opt.upcoming, date: "" }))
                  }
                  className={cn(
                    "px-3 py-2 rounded-[6px] text-sm border transition-all duration-200 text-left",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
                      : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div>
            <p className="text-xs text-muted-foreground/70 mb-2 font-medium">{t("pages.doctor.specific_date")}</p>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => {
                const d = e.target.value;
                setFilters((f) => ({ ...f, date: d, today: false, upcoming: false }));
              }}
              className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
            />
            {filters.date && (
              <button
                onClick={() => set("date", "")}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors mt-2"
              >
                {t("pages.doctor.clear_date")}
              </button>
            )}
          </div>
        </FilterSection>

        <FilterSection title={t("pages.doctor.sort")}>
          <PillGroup<SortOption>
            value={filters.sort}
            onChange={(v) => set("sort", v)}
            options={SORT_OPTIONS.map((o) => ({ ...o, label: t(`pages.doctor.sort_${o.value.replace(/-/g, "_")}`) }))}
          />
        </FilterSection>
      </div>
    </>
  );
}
