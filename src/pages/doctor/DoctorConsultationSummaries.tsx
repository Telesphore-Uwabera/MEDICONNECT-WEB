import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Download,
  Eye,
  Loader2,
  Paperclip,
  Pencil,
  Search,
  Stethoscope,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/date";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { DateField } from "@/components/ui/date-field";
import { CustomSelect } from "@/components/ui/custom-select";
import { RichTextRenderer, richTextToPlainText } from "@/components/ui/rich-textarea";
import { openSummaryDocument } from "@/lib/summary-document";
import { parseIdentityFromHtml, parseProofsFromHtml, type PatientIdentity } from "@/lib/call-note-form";
import { usePublicSettings } from "@/hooks/use-public-settings";
import {
  summaryFieldText,
  summaryHasRedFlagAlert,
  summaryRedFlagList,
  useConsultationSummaries,
  useDeleteConsultationSummary,
  useDownloadConsultationSummary,
  type ConsultationSummary,
  type PatientSummaryGroup,
  type SummaryPatient,
} from "@/hooks/doctor/use-consultation-summaries";
import { EditSummaryModal } from "./appointments/shared/EditSummaryModal";
import { getErrMsg } from "./appointments/shared/helpers";
import { TABLE_PAGE_SIZE, TablePager, paginateRows, tablePageCount } from "@/components/TablePager";

type ConsultType = "all" | "appointment" | "instant";
type FlagFilter = "all" | "flagged" | "clear";
type SortBy = "date_desc" | "date_asc" | "patient";

interface ConsultRow {
  summary: ConsultationSummary;
  patient: SummaryPatient;
}

const INITIAL_FILTERS = {
  search: "",
  type: "all" as ConsultType,
  flags: "all" as FlagFilter,
  date_from: "",
  date_to: "",
  sort: "date_desc" as SortBy,
};

function flattenRows(payload: unknown): ConsultRow[] {
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data) || data.length === 0) return [];
  const first = data[0] as PatientSummaryGroup | ConsultationSummary;
  if (first && Array.isArray((first as PatientSummaryGroup).summaries)) {
    return (data as PatientSummaryGroup[]).flatMap((group) =>
      (group.summaries ?? []).map((summary) => ({
        summary: { ...summary, patient: summary.patient ?? group.patient },
        patient: group.patient ?? summary.patient ?? { id: summary.patient_id, name: `Patient #${summary.patient_id}` },
      })),
    );
  }
  return (data as ConsultationSummary[]).map((summary) => ({
    summary,
    patient: summary.patient ?? { id: summary.patient_id, name: `Patient #${summary.patient_id}` },
  }));
}

function plain(value: unknown, legacyKey?: string) {
  return richTextToPlainText(summaryFieldText(value, legacyKey));
}

function patientName(row: ConsultRow, identity: PatientIdentity) {
  return identity.full_name || row.patient?.name || `Patient #${row.summary.patient_id}`;
}

function consultDate(summary: ConsultationSummary) {
  return summary.updated_at || summary.created_at || "";
}

function identityOf(summary: ConsultationSummary): PatientIdentity {
  return parseIdentityFromHtml(summaryFieldText(summary.attachments));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "PT";
}

function fmtDate(raw?: string) {
  return formatDateOnly(raw);
}

function inDateRange(iso: string, from: string, to: string) {
  if (!from && !to) return true;
  const day = (iso || "").slice(0, 10);
  if (!day) return !from && !to;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export default function DoctorConsultationSummaries() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const focusInstant = Number(params.get("instant") || "");
  const focusAppointment = Number(params.get("appointment") || "");
  const { data, isLoading, isError, refetch } = useConsultationSummaries();
  const deleteRx = useDeleteConsultationSummary();
  const { data: publicSettings } = usePublicSettings();

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"table" | "cards">("table");
  const [selected, setSelected] = useState<ConsultRow | null>(null);
  const [editing, setEditing] = useState<ConsultationSummary | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConsultRow | null>(null);
  const [page, setPage] = useState(1);

  const setFilter = useCallback(<K extends keyof typeof INITIAL_FILTERS>(key: K, value: (typeof INITIAL_FILTERS)[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const rows = useMemo(() => flattenRows(data), [data]);

  useEffect(() => {
    if (rows.length === 0) return;
    const match = rows.find((row) => {
      if (Number.isFinite(focusInstant) && focusInstant > 0) {
        return Number(row.summary.instant_consultation_id) === focusInstant;
      }
      if (Number.isFinite(focusAppointment) && focusAppointment > 0) {
        return Number(row.summary.appointment_id) === focusAppointment;
      }
      return false;
    });
    if (match) setSelected(match);
  }, [focusInstant, focusAppointment, rows]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const next = rows.filter((row) => {
      const s = row.summary;
      const identity = identityOf(s);
      const isInstant = s.instant_consultation_id != null;
      if (filters.type === "instant" && !isInstant) return false;
      if (filters.type === "appointment" && isInstant) return false;
      const flagged = summaryHasRedFlagAlert(s.red_flag_screening);
      if (filters.flags === "flagged" && !flagged) return false;
      if (filters.flags === "clear" && flagged) return false;
      if (!inDateRange(consultDate(s), filters.date_from, filters.date_to)) return false;
      if (!q) return true;
      const hay = [
        patientName(row, identity),
        identity.phone,
        identity.national_id,
        identity.address,
        row.patient?.email,
        `#${s.id}`,
        String(s.patient_id),
        plain(s.chief_complaint, "main_complaint"),
        plain(s.clinical_assessment, "primary_diagnosis"),
        plain(s.management_plan, "followup_plan"),
        plain(s.medication_history),
        plain(s.allergy_history),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    next.sort((a, b) => {
      if (filters.sort === "patient") {
        return patientName(a, identityOf(a.summary)).localeCompare(patientName(b, identityOf(b.summary)));
      }
      const da = consultDate(a.summary);
      const db = consultDate(b.summary);
      return filters.sort === "date_asc" ? da.localeCompare(db) : db.localeCompare(da);
    });
    return next;
  }, [filters, rows]);

  const paged = paginateRows(filtered, page, TABLE_PAGE_SIZE);
  const lastPage = tablePageCount(filtered.length, TABLE_PAGE_SIZE);

  const stats = {
    all: rows.length,
    appointment: rows.filter((row) => row.summary.instant_consultation_id == null).length,
    instant: rows.filter((row) => row.summary.instant_consultation_id != null).length,
    flagged: rows.filter((row) => summaryHasRedFlagAlert(row.summary.red_flag_screening)).length,
  };

  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.type !== "all" ||
    filters.flags !== "all" ||
    Boolean(filters.date_from) ||
    Boolean(filters.date_to) ||
    filters.sort !== "date_desc";

  const filterFields = useMemo(
    () => [
      {
        type: "search" as const,
        key: "search",
        label: t("pages.doctor.search"),
        value: filters.search,
        placeholder: t("pages.doctor.search_patient_complaint_diagnosis"),
        onChange: (v: string) => setFilter("search", v),
      },
      {
        type: "select" as const,
        key: "type",
        label: t("pages.doctor.consult_type"),
        value: filters.type,
        options: [
          { value: "all", label: t("pages.doctor.consult_all_types") },
          { value: "appointment", label: t("pages.doctor.appointment") },
          { value: "instant", label: t("pages.doctor.instant") },
        ],
        onChange: (v: string) => setFilter("type", v as ConsultType),
      },
      {
        type: "select" as const,
        key: "flags",
        label: t("pages.doctor.consult_red_flags_filter"),
        value: filters.flags,
        options: [
          { value: "all", label: t("pages.doctor.consult_red_flags_any") },
          { value: "flagged", label: t("pages.doctor.consult_red_flags_only") },
          { value: "clear", label: t("pages.doctor.consult_red_flags_none") },
        ],
        onChange: (v: string) => setFilter("flags", v as FlagFilter),
      },
      {
        type: "custom" as const,
        key: "date_range",
        label: t("pages.doctor.date_range", "Date range"),
        render: () => (
          <div className="grid grid-cols-2 gap-2">
            <DateField
              value={filters.date_from}
              onChange={(e) => setFilter("date_from", e.target.value)}
              className="w-full px-2 py-1 text-[11px] bg-background border border-border/60 rounded-[4px] text-foreground outline-none h-7"
            />
            <DateField
              value={filters.date_to}
              onChange={(e) => setFilter("date_to", e.target.value)}
              className="w-full px-2 py-1 text-[11px] bg-background border border-border/60 rounded-[4px] text-foreground outline-none h-7"
            />
          </div>
        ),
      },
    ],
    [filters, setFilter, t],
  );

  const doDelete = (row: ConsultRow) => {
    deleteRx.mutate(row.summary.id, {
      onSuccess: () => {
        toast.success(t("pages.doctor.summary_deleted"));
        setConfirmDelete(null);
        if (selected?.summary.id === row.summary.id) setSelected(null);
        refetch();
      },
      onError: (err) => toast.error(getErrMsg(err, t("pages.doctor.summary_delete_failed"))),
    });
  };

  const statCards = [
    { key: "all" as const, label: t("pages.doctor.consult_stat_all"), value: stats.all, onClick: () => setFilter("type", "all") },
    { key: "appointment" as const, label: t("pages.doctor.appointment"), value: stats.appointment, onClick: () => setFilter("type", "appointment") },
    { key: "instant" as const, label: t("pages.doctor.instant"), value: stats.instant, onClick: () => setFilter("type", "instant") },
    { key: "flagged" as const, label: t("pages.doctor.consult_stat_alerts"), value: stats.flagged, onClick: () => setFilter("flags", filters.flags === "flagged" ? "all" : "flagged") },
  ];

  return (
    <DashboardLayout role="doctor">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.doctor.consultation_summaries_title")}
          subtitle={t("pages.doctor.consultations_table_subtitle")}
        />

        <div className="px-3 sm:px-5 pt-4 pb-1 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {statCards.map((card) => {
              const active = card.key === "flagged" ? filters.flags === "flagged" : filters.type === card.key;
              return (
                <button
                  key={card.key}
                  onClick={card.onClick}
                  className={cn(
                    "flex items-center justify-between rounded-[6px] border bg-card px-3 py-3 text-left transition-all hover:shadow-sm",
                    active ? "border-primary ring-1 ring-primary/30" : "border-border/70",
                  )}
                >
                  <span className="text-[11px] font-medium text-muted-foreground">{card.label}</span>
                  <span className="text-lg font-semibold tabular-nums text-foreground">{card.value}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                placeholder={t("pages.doctor.search_patient_complaint_diagnosis")}
                className="w-full h-9 rounded-[6px] border border-border bg-background pl-8 pr-8 text-[12px] outline-none focus:border-primary/50"
              />
              {filters.search && (
                <button onClick={() => setFilter("search", "")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CustomSelect
                value={filters.sort}
                options={[
                  { value: "date_desc", label: t("pages.doctor.latest_first", "Latest first") },
                  { value: "date_asc", label: t("pages.doctor.oldest_first", "Oldest first") },
                  { value: "patient", label: t("pages.doctor.sort_name_az", "Patient A–Z") },
                ]}
                onChange={(v) => setFilter("sort", v as SortBy)}
                compact
                className="hidden sm:block w-[150px]"
              />
              <FilterToggleButton open={filterOpen} onToggle={() => setFilterOpen(!filterOpen)} hasActiveFilters={hasActiveFilters} />
              <div className="flex rounded-[6px] border border-border/60 overflow-hidden bg-card">
                <button
                  onClick={() => setView("table")}
                  aria-label={t("pages.doctor.table_view", "Table view")}
                  className={cn("px-3 py-2", view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M3 15h18M9 3v18" />
                  </svg>
                </button>
                <button
                  onClick={() => setView("cards")}
                  aria-label={t("pages.doctor.card_view", "Card view")}
                  className={cn("px-3 py-2 border-l border-border/60", view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <FilterBar
            open={filterOpen}
            onToggle={() => setFilterOpen(!filterOpen)}
            hasActiveFilters={hasActiveFilters}
            onClearAll={() => { setFilters(INITIAL_FILTERS); setPage(1); }}
            fields={filterFields}
            cols={{ default: 1, sm: 2, lg: 4 }}
          />

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("pages.doctor.loading_summaries")}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-destructive/60" />
              <p className="text-[12px] text-muted-foreground">{t("pages.doctor.summaries_load_failed")}</p>
              <button onClick={() => refetch()} className="h-8 px-3 rounded-[5px] border border-border text-[12px] font-medium hover:bg-muted">
                {t("pages.doctor.retry")}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="h-14 w-14 rounded-[8px] bg-muted/50 border border-border flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-[13px] font-semibold">{hasActiveFilters ? t("pages.doctor.no_summaries_match") : t("pages.doctor.no_summaries_yet")}</p>
              <p className="text-[11px] text-muted-foreground max-w-[340px]">{t("pages.doctor.summaries_empty_desc")}</p>
            </div>
          ) : view === "cards" ? (
            <div>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {paged.map((row) => (
                  <ConsultCard
                    key={row.summary.id}
                    row={row}
                    onOpen={() => setSelected(row)}
                    onEdit={() => setEditing(row.summary)}
                    onDelete={() => setConfirmDelete(row)}
                  />
                ))}
              </div>
              <TablePager page={page} lastPage={lastPage} total={filtered.length} onPageChange={setPage} />
            </div>
          ) : (
            <div className="rounded-[6px] border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">{t("pages.doctor.consult_col_date")}</th>
                      <th className="px-4 py-2.5 font-semibold">{t("pages.doctor.consult_col_patient")}</th>
                      <th className="px-4 py-2.5 font-semibold">{t("pages.doctor.consult_col_type")}</th>
                      <th className="px-4 py-2.5 font-semibold">{t("pages.doctor.consult_col_complaint")}</th>
                      <th className="px-4 py-2.5 font-semibold">{t("pages.doctor.consult_col_assessment")}</th>
                      <th className="px-4 py-2.5 font-semibold text-right">{t("pages.doctor.consult_col_actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row) => (
                      <ConsultTableRow
                        key={row.summary.id}
                        row={row}
                        onOpen={() => setSelected(row)}
                        onEdit={() => setEditing(row.summary)}
                        onDelete={() => setConfirmDelete(row)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 border-t border-border">
                <TablePager
                  page={page}
                  lastPage={lastPage}
                  total={filtered.length}
                  onPageChange={setPage}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <ConsultDetailDrawer
          row={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditing(selected.summary);
          }}
          onDelete={() => setConfirmDelete(selected)}
          publicSettings={publicSettings}
        />
      )}

      {editing && (
        <EditSummaryModal
          summary={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[6px] bg-card border border-border shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-[6px] bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-[13px] font-semibold">{t("pages.doctor.delete_summary_title")}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t("pages.doctor.delete_summary_desc", {
                    id: confirmDelete.summary.id,
                    patient: patientName(confirmDelete, identityOf(confirmDelete.summary)),
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="h-9 px-4 rounded-[5px] border border-border text-[12px] font-medium hover:bg-muted">
                {t("common.cancel")}
              </button>
              <button
                onClick={() => doDelete(confirmDelete)}
                disabled={deleteRx.isPending}
                className="h-9 px-4 rounded-[5px] bg-destructive text-destructive-foreground text-[12px] font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleteRx.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("pages.doctor.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function TypeBadge({ summary }: { summary: ConsultationSummary }) {
  const { t } = useTranslation();
  const isInstant = summary.instant_consultation_id != null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium",
        isInstant ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-700",
      )}
    >
      {isInstant ? <Video className="h-2.5 w-2.5" /> : <CalendarClock className="h-2.5 w-2.5" />}
      {isInstant ? t("pages.doctor.instant") : t("pages.doctor.appointment")}
    </span>
  );
}

function ConsultTableRow({
  row,
  onOpen,
  onEdit,
  onDelete,
}: {
  row: ConsultRow;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const identity = identityOf(row.summary);
  const name = patientName(row, identity);
  const complaint = summaryFieldText(row.summary.chief_complaint, "main_complaint");
  const assessment = summaryFieldText(row.summary.clinical_assessment, "primary_diagnosis");
  const flagged = summaryHasRedFlagAlert(row.summary.red_flag_screening);

  return (
    <tr className="border-t border-border/60 hover:bg-muted/40">
      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{fmtDate(consultDate(row.summary))}</td>
      <td className="px-4 py-3">
        <button onClick={onOpen} className="flex items-center gap-2.5 text-left min-w-0">
          <div className="h-8 w-8 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
            {initials(name)}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground truncate">{name}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {identity.phone || row.patient?.email || `#${row.summary.patient_id}`}
            </p>
          </div>
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <TypeBadge summary={row.summary} />
          {flagged && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          {parseProofsFromHtml(summaryFieldText(row.summary.attachments)).length > 0 && (
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" title="Illness proofs" />
          )}
        </div>
      </td>
      <td className="px-4 py-3 max-w-[220px]">
        {complaint ? (
          <RichTextRenderer value={complaint} className="line-clamp-2 text-[12px] text-foreground" />
        ) : (
          <span className="text-[12px] text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="px-4 py-3 max-w-[220px]">
        {assessment ? (
          <RichTextRenderer value={assessment} className="line-clamp-2 text-[12px] text-foreground" />
        ) : (
          <span className="text-[12px] text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onOpen} className="h-8 px-2.5 rounded-[5px] text-[11px] font-medium text-foreground hover:bg-muted">
            {t("pages.doctor.consult_view_record")}
          </button>
          <button onClick={onEdit} className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function ConsultCard({
  row,
  onOpen,
  onEdit,
  onDelete,
}: {
  row: ConsultRow;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const identity = identityOf(row.summary);
  const name = patientName(row, identity);
  const complaint = summaryFieldText(row.summary.chief_complaint, "main_complaint");

  return (
    <div className="rounded-[6px] border border-border bg-card p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onOpen} className="flex items-center gap-2.5 min-w-0 text-left">
          <div className="h-9 w-9 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
            {initials(name)}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate">{name}</p>
            <p className="text-[11px] text-muted-foreground">{fmtDate(consultDate(row.summary))}</p>
          </div>
        </button>
        <TypeBadge summary={row.summary} />
      </div>
      {complaint ? (
        <RichTextRenderer value={complaint} className="line-clamp-3 text-[12px] text-muted-foreground" />
      ) : (
        <p className="text-[12px] text-muted-foreground/50">—</p>
      )}
      <div className="flex items-center justify-end gap-1 pt-1">
        <button onClick={onOpen} className="h-8 px-3 rounded-[5px] border border-border text-[11px] font-medium hover:bg-muted">
          {t("pages.doctor.consult_view_record")}
        </button>
        <button onClick={onEdit} className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ConsultDetailDrawer({
  row,
  onClose,
  onEdit,
  onDelete,
  publicSettings,
}: {
  row: ConsultRow;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  publicSettings: unknown;
}) {
  const { t } = useTranslation();
  const s = row.summary;
  const identity = identityOf(s);
  const name = patientName(row, identity);
  const flagged = summaryRedFlagList(s.red_flag_screening);
  const downloadSummary = useDownloadConsultationSummary();
  const exam = summaryFieldText(s.physical_examination);
  const proofs = parseProofsFromHtml(summaryFieldText(s.attachments));

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-[6px] bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
              {initials(name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                <TypeBadge summary={s} />
                <span>{fmtDate(consultDate(s))}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-[5px] flex items-center justify-center text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> {t("pages.doctor.consult_patient_details")}
            </p>
            <div className="rounded-[6px] border border-border divide-y divide-border">
              <InfoRow label={t("consult.notes.full_name")} value={name} />
              <InfoRow label={t("consult.notes.patient_id")} value={identity.patient_id || String(s.patient_id)} />
              <InfoRow label={t("consult.notes.phone")} value={identity.phone || row.patient?.email || "—"} />
              <InfoRow label={t("consult.notes.national_id")} value={identity.national_id || "—"} />
              <InfoRow label={t("consult.notes.dob")} value={identity.date_of_birth || "—"} />
              <InfoRow label={t("consult.notes.gender")} value={identity.gender || "—"} />
              <InfoRow label={t("consult.notes.address")} value={identity.address || "—"} />
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5" /> {t("pages.doctor.consult_record_details")}
            </p>
            <RichField label={t("pages.doctor.chief_complaint")} value={summaryFieldText(s.chief_complaint, "main_complaint")} />
            <RichField label={t("pages.doctor.summary.medication_history", "Medication history")} value={summaryFieldText(s.medication_history)} />
            <RichField label={t("pages.doctor.summary.allergy_history", "Allergy history")} value={summaryFieldText(s.allergy_history)} />
            {exam && <RichField label={t("pages.doctor.summary.physical_examination", "Physical examination")} value={exam} />}
            <RichField label={t("pages.doctor.clinical_assessment")} value={summaryFieldText(s.clinical_assessment, "primary_diagnosis")} />
            <RichField label={t("pages.doctor.follow_up_plan")} value={summaryFieldText(s.management_plan, "followup_plan")} />
            {proofs.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" /> {t("consult.proofs.title", "Illness proofs")}
                </p>
                {proofs.map((proof) => (
                  <div key={proof.id} className="rounded-[6px] border border-border p-2.5 space-y-2">
                    {proof.text && <p className="text-[12px] text-foreground">{proof.text}</p>}
                    {proof.files.map((file) =>
                      file.kind === "image" && file.url ? (
                        <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-[6px] border border-border">
                          <img src={file.url} alt={file.name} className="max-h-40 w-full object-contain bg-muted/40" />
                        </a>
                      ) : (
                        <a key={file.id} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] text-primary hover:underline">
                          <Paperclip className="h-3 w-3" /> {file.name}
                        </a>
                      ),
                    )}
                  </div>
                ))}
              </div>
            )}
            {flagged.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {flagged.map((flag) => (
                  <span key={flag} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    <AlertTriangle className="h-2.5 w-2.5" /> {flag.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center gap-2">
          <button onClick={() => openSummaryDocument(s, false, publicSettings)} className="h-9 px-3 rounded-[5px] border border-border text-[11px] font-medium flex items-center gap-1.5 hover:bg-muted">
            <Eye className="h-3.5 w-3.5" /> {t("pages.doctor.view")}
          </button>
          <button
            onClick={() =>
              downloadSummary.mutate(
                { id: s.id, type: "summary", filename: `consultation-summary-${s.id}.pdf` },
                { onError: (err) => toast.error(getErrMsg(err, t("pages.doctor.summary_pdf_download_failed"))) },
              )
            }
            className="h-9 px-3 rounded-[5px] border border-border text-[11px] font-medium flex items-center gap-1.5 hover:bg-muted"
          >
            {downloadSummary.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {t("pages.doctor.pdf")}
          </button>
          <button onClick={onEdit} className="h-9 px-3 rounded-[5px] bg-primary text-primary-foreground text-[11px] font-semibold flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> {t("pages.doctor.edit")}
          </button>
          <button onClick={onDelete} className="ml-auto h-9 w-9 rounded-[5px] flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2">
      <span className="text-[10px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-[12px] text-foreground text-right break-all">{value || "—"}</span>
    </div>
  );
}

function RichField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <RichTextRenderer value={value} className="text-[12px] text-foreground" />
    </div>
  );
}
