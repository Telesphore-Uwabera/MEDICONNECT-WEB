import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar, FilterToggleButton } from "@/components/FilterBar";
import { DepartmentFormModal } from "./components/Departmentformmodal";

import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronRight,
  Activity,
  Users,
  BedDouble,
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ServiceFormModal } from "./components/Serviceformmodal";
import type { Department, DepartmentPayload, Service, ServicePayload } from "@/types/Hospital";
import {
  useGetDepartments,
  useGetDepartment,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useGetServicesByDepartment,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from "@/hooks/hospital/use-hospital-departments";



// ─── Filter state ─────────────────────────────────────────────────────────────

type EmergencyFilter = "all" | "emergency" | "regular";
type SortOption = "sort_order" | "name_en" | "capacity";

interface FilterState {
  search: string;
  emergency: EmergencyFilter;
  sort: SortOption;
  sort_dir: "asc" | "desc";
  active_only: boolean;
}

const INITIAL_FILTERS: FilterState = {
  search: "",
  emergency: "all",
  sort: "sort_order",
  sort_dir: "asc",
  active_only: true,
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "sort_order", label: "Default order" },
  { value: "name_en", label: "Name (A–Z)" },
  { value: "capacity", label: "Capacity" },
];

// ─── Icon map (API returns icon name as string) ────────────────────────────────

function DeptIcon({ icon, className }: { icon: string | null; className?: string }) {
  // Render a colored dot as fallback for unknown icons — avoids crashing
  return (
    <Stethoscope className={cn("w-4 h-4", className)} />
  );
}

// ─── Confirm delete dialog ────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  isLoading,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border/70 rounded-[6px] shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">{title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-[11px] rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-3.5 py-1.5 text-[11px] rounded-[6px] bg-destructive text-white font-medium hover:bg-destructive/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Service Row ──────────────────────────────────────────────────────────────

function ServiceRow({
  service,
  onEdit,
  onDelete,
}: {
  service: Service;
  onEdit: (s: Service) => void;
  onDelete: (s: Service) => void;
}) {
  const priceLabel = useMemo(() => {
    if (service.price_type === "free") return "Free";
    if (service.price_type === "negotiable") return "Negotiable";
    const prefix = service.price_type === "from" ? "From " : "";
    return `${prefix}${Number(service.price).toLocaleString()} ${service.currency}`;
  }, [service]);

  const typeColors: Record<string, string> = {
    in_person: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
    online: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
    both: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900",
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40 last:border-b-0 hover:bg-secondary/20 group transition-colors">
      {/* Availability dot */}
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-0.5", service.is_available ? "bg-emerald-500" : "bg-muted-foreground/30")} />

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-medium text-foreground truncate">{service.name_en}</span>
          {service.code && (
            <span className="text-[9px] font-mono text-muted-foreground/60 bg-secondary/60 px-1.5 py-0.5 rounded-[6px]">
              {service.code}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-[6px] border", typeColors[service.type] ?? typeColors["in_person"])}>
            {service.type === "in_person" ? "In Person" : service.type === "online" ? "Online" : "Both"}
          </span>
          {service.insurance_covered && (
            <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3 h-3" /> Insurance
            </span>
          )}
          {service.duration_minutes && (
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/60">
              <Clock className="w-3 h-3" /> {service.duration_minutes}min
            </span>
          )}
        </div>
      </div>

      {/* Price */}
      <span className="text-[11px] font-semibold text-foreground tabular-nums whitespace-nowrap">{priceLabel}</span>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(service)}
          className="w-6 h-6 flex items-center justify-center rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDelete(service)}
          className="w-6 h-6 flex items-center justify-center rounded-[6px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Department Detail Drawer ─────────────────────────────────────────────────

function DepartmentDrawer({
  department,
  onClose,
  onEdit,
  onDelete,
}: {
  department: Department;
  onClose: () => void;
  onEdit: (d: Department) => void;
  onDelete: (d: Department) => void;
}) {
  const { data: detail, isLoading: detailLoading } = useGetDepartment(department.id);
  const { data: services, isLoading: svcsLoading } = useGetServicesByDepartment(department.id);

  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [svcModal, setSvcModal] = useState<{ open: boolean; editing: Service | null }>({
    open: false,
    editing: null,
  });
  const [deletingSvc, setDeletingSvc] = useState<Service | null>(null);
  const [mutError, setMutError] = useState<string | null>(null);

  const dept = detail ?? department;

  const handleSvcSubmit = async (payload: ServicePayload) => {
    setMutError(null);
    try {
      if (svcModal.editing) {
        await updateService.mutateAsync({
          id: svcModal.editing.id,
          departmentId: department.id,
          payload,
        });
      } else {
        await createService.mutateAsync(payload);
      }
      setSvcModal({ open: false, editing: null });
    } catch (e: unknown) {
      setMutError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const handleDeleteSvc = async () => {
    if (!deletingSvc) return;
    try {
      await deleteService.mutateAsync({ id: deletingSvc.id, departmentId: department.id });
      setDeletingSvc(null);
    } catch (e: unknown) {
      setMutError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const isSubmittingSvc = createService.isPending || updateService.isPending;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-md bg-card border-l border-border/70 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border/60 shrink-0">
          <div
            className="h-9 w-9 rounded-[6px] flex items-center justify-center shrink-0 border"
            style={{ backgroundColor: `${dept.color_code ?? "#6366f1"}20`, borderColor: `${dept.color_code ?? "#6366f1"}40` }}
          >
            <DeptIcon icon={dept.icon} style={{ color: dept.color_code ?? "#6366f1" }} className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-foreground truncate">{dept.name_en}</h2>
              {dept.is_emergency && (
                <span className="text-[9px] font-semibold bg-destructive/10 text-destructive border border-destructive/30 px-1.5 py-0.5 rounded-[6px]">
                  EMERGENCY
                </span>
              )}
              {!dept.is_active && (
                <span className="text-[9px] font-semibold bg-muted text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded-[6px]">
                  INACTIVE
                </span>
              )}
            </div>
            {dept.name_fr && (
              <p className="text-[11px] text-muted-foreground">{dept.name_fr}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(dept)}
              className="w-7 h-7 flex items-center justify-center rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(dept)}
              className="w-7 h-7 flex items-center justify-center rounded-[6px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-0 border-b border-border/60">
                <StatCell label="Capacity" value={dept.capacity ?? "—"} icon={<BedDouble className="w-3.5 h-3.5" />} />
                <StatCell label="Doctors" value={dept.doctors?.length ?? 0} icon={<Users className="w-3.5 h-3.5" />} border />
                <StatCell label="Services" value={services?.length ?? dept.services?.length ?? 0} icon={<Stethoscope className="w-3.5 h-3.5" />} border />
              </div>

              {/* Info */}
              <div className="px-5 py-4 flex flex-col gap-2.5 border-b border-border/60">
                {dept.floor && (
                  <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location">
                    {dept.floor}{dept.room_number ? ` · Room ${dept.room_number}` : ""}
                  </InfoRow>
                )}
                {dept.phone && (
                  <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone">
                    <a href={`tel:${dept.phone}`} className="text-primary hover:underline">{dept.phone}</a>
                  </InfoRow>
                )}
                {dept.email && (
                  <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email">
                    <a href={`mailto:${dept.email}`} className="text-primary hover:underline">{dept.email}</a>
                  </InfoRow>
                )}
              </div>

              {/* Services section */}
              <div className="px-5 py-3.5 flex items-center justify-between border-b border-border/60">
                <p className="text-[11px] font-semibold text-foreground">
                  Services
                  {services && (
                    <span className="ml-1.5 text-muted-foreground font-normal">({services.length})</span>
                  )}
                </p>
                <button
                  onClick={() => { setMutError(null); setSvcModal({ open: true, editing: null }); }}
                  className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Service
                </button>
              </div>

              {svcsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : services && services.length > 0 ? (
                <div>
                  {services.map((svc) => (
                    <ServiceRow
                      key={svc.id}
                      service={svc}
                      onEdit={(s) => { setMutError(null); setSvcModal({ open: true, editing: s }); }}
                      onDelete={setDeletingSvc}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-5">
                  <div className="w-10 h-10 rounded-[6px] bg-muted/50 flex items-center justify-center border border-border/40">
                    <Stethoscope className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">No services yet</p>
                  <button
                    onClick={() => setSvcModal({ open: true, editing: null })}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Add the first service
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Service modals */}
      <ServiceFormModal
        open={svcModal.open}
        onClose={() => setSvcModal({ open: false, editing: null })}
        onSubmit={handleSvcSubmit}
        departmentId={department.id}
        initial={svcModal.editing}
        isLoading={isSubmittingSvc}
        error={mutError}
      />

      <ConfirmDialog
        open={deletingSvc !== null}
        title="Delete Service"
        description={`Remove "${deletingSvc?.name_en}" from this department? This cannot be undone.`}
        onConfirm={handleDeleteSvc}
        onCancel={() => setDeletingSvc(null)}
        isLoading={deleteService.isPending}
      />
    </>
  );
}

function StatCell({
  label, value, icon, border,
}: {
  label: string; value: React.ReactNode; icon: React.ReactNode; border?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-3 gap-0.5", border && "border-l border-border/60")}>
      <div className="text-muted-foreground/50">{icon}</div>
      <div className="font-bold text-[18px] tabular-nums text-foreground">{value}</div>
      <div className="text-[9px] text-muted-foreground/60 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function InfoRow({
  icon, label, children,
}: {
  icon: React.ReactNode; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground/50 w-3.5 shrink-0">{icon}</div>
      <span className="text-[10px] text-muted-foreground/60 w-14 shrink-0">{label}</span>
      <span className="text-[11px] text-foreground">{children}</span>
    </div>
  );
}

// ─── Department Card ──────────────────────────────────────────────────────────

function DepartmentCard({
  dept,
  onClick,
  onEdit,
  onDelete,
}: {
  dept: Department;
  onClick: () => void;
  onEdit: (d: Department) => void;
  onDelete: (d: Department) => void;
}) {
  const accentColor = dept.color_code ?? "#6366f1";

  return (
    <div
      className="bg-card border border-border/70 rounded-[6px] p-4 flex flex-col gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200 cursor-pointer group relative"
      onClick={onClick}
    >
      {/* Emergency badge */}
      {dept.is_emergency && (
        <div className="absolute top-2 right-2">
          <span className="text-[9px] font-bold bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded-[6px]">
            EMERGENCY
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-[6px] flex items-center justify-center shrink-0 border"
          style={{
            backgroundColor: `${accentColor}18`,
            borderColor: `${accentColor}30`,
          }}
        >
          <DeptIcon icon={dept.icon} style={{ color: accentColor }} className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[12px] text-foreground truncate">{dept.name_en}</h3>
          {dept.name_fr && (
            <span className="text-[10px] text-muted-foreground/60 truncate block">{dept.name_fr}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Doctors" value={dept.doctors?.length ?? 0} />
        <MiniStat label="Capacity" value={dept.capacity ?? "—"} />
        <MiniStat label="Services" value={dept.services?.length ?? 0} />
      </div>

      {/* Floor + room */}
      {(dept.floor || dept.room_number) && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
          <MapPin className="w-3 h-3" />
          {[dept.floor, dept.room_number ? `Room ${dept.room_number}` : null]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-0.5 border-t border-border/40">
        <span className="text-[10px] text-primary font-medium flex items-center gap-0.5 group-hover:gap-1 transition-all">
          View details <ChevronRight className="w-3 h-3" />
        </span>
        <div
          className="flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onEdit(dept)}
            className="w-6 h-6 flex items-center justify-center rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(dept)}
            className="w-6 h-6 flex items-center justify-center rounded-[6px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[6px] bg-secondary/40 border border-border/30 p-2">
      <div className="text-[9px] text-muted-foreground/60 mb-0.5">{label}</div>
      <div className="font-bold text-[15px] tabular-nums text-foreground">{value}</div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-card border border-border/70 rounded-[6px] p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-[6px] bg-secondary/60" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-secondary/60 rounded-[6px] w-3/4" />
          <div className="h-2 bg-secondary/40 rounded-[6px] w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[6px] bg-secondary/40 border border-border/30 p-2 h-11" />
        ))}
      </div>
      <div className="h-2 bg-secondary/40 rounded-[6px] w-1/3" />
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  value, onChange, options,
}: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-[6px] text-[11px] border transition-all duration-200 text-left",
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

const EMERGENCY_OPTIONS: { value: EmergencyFilter; label: string }[] = [
  { value: "all", label: "All departments" },
  { value: "emergency", label: "Emergency only" },
  { value: "regular", label: "Regular only" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const HospitalDepartments = () => {
  const { t, i18n } = useTranslation();

  // ── Filter state (client-side search + emergency + sort) ──────────────────
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setFilters((p) => ({ ...p, [key]: value })),
    [],
  );

  const clearAll = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const hasActiveFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  // ── API query params — only stable API-level filters go here ──────────────
  const apiFilters = useMemo(
    () => ({
      active_only: filters.active_only,
      ...(filters.emergency === "emergency" ? { is_emergency: true } : {}),
      ...(filters.emergency === "regular" ? { is_emergency: false } : {}),
      sort_by: filters.sort,
      sort_dir: filters.sort_dir,
    }),
    [filters.active_only, filters.emergency, filters.sort, filters.sort_dir],
  );

  const { data: departments, isLoading, isError, error, refetch } = useGetDepartments(apiFilters);

  // ── Client-side search filter on top of API results ───────────────────────
  const filtered = useMemo(() => {
    if (!departments) return [];
    const q = filters.search.toLowerCase().trim();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name_en.toLowerCase().includes(q) ||
        (d.name_fr && d.name_fr.toLowerCase().includes(q)) ||
        (d.name_kiny && d.name_kiny.toLowerCase().includes(q)),
    );
  }, [departments, filters.search]);

  // ── Modals / drawer state ─────────────────────────────────────────────────
  const [deptModal, setDeptModal] = useState<{ open: boolean; editing: Department | null }>({
    open: false,
    editing: null,
  });
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [mutError, setMutError] = useState<string | null>(null);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const handleDeptSubmit = async (payload: DepartmentPayload) => {
    setMutError(null);
    try {
      if (deptModal.editing) {
        await updateDept.mutateAsync({ id: deptModal.editing.id, payload });
      } else {
        await createDept.mutateAsync(payload);
      }
      setDeptModal({ open: false, editing: null });
    } catch (e: unknown) {
      setMutError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const handleDeleteDept = async () => {
    if (!deletingDept) return;
    try {
      await deleteDept.mutateAsync(deletingDept.id);
      setDeletingDept(null);
      if (selectedDept?.id === deletingDept.id) setSelectedDept(null);
    } catch (e: unknown) {
      setMutError(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const isSubmittingDept = createDept.isPending || updateDept.isPending;

  // ── Sidebar content ───────────────────────────────────────────────────────
  const filterFields = useMemo(() => [
    {
      type: "select" as const,
      key: "emergency",
      label: "Type",
      value: filters.emergency,
      options: EMERGENCY_OPTIONS,
      onChange: (v: string) => set("emergency", v as any)
    },
    {
      type: "select" as const,
      key: "sort",
      label: "Sort",
      value: filters.sort,
      options: SORT_OPTIONS,
      onChange: (v: string) => set("sort", v as any)
    },
    {
      type: "select" as const,
      key: "sort_dir",
      label: "Order",
      value: filters.sort_dir,
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
      onChange: (v: string) => set("sort_dir", v as any)
    },
    {
      type: "custom" as const,
      key: "active_only",
      label: "Status",
      render: () => (
        <label className="flex items-center gap-2 h-[26px] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.active_only}
            onChange={(e) => set("active_only", e.target.checked)}
            className="w-3.5 h-3.5 rounded-[6px] accent-primary"
          />
          <span className="text-[11px] text-foreground">Active only</span>
        </label>
      )
    }
  ], [filters.emergency, filters.sort, filters.sort_dir, filters.active_only, set]);

  return (
    <DashboardLayout role="hospital">
      <div className="flex flex-col h-full">
        <PageHeader
          title={t("pages.hospital.departments_title")}
          subtitle={t("pages.hospital.departments_sub")}
        />


        <main className="flex-1 overflow-y-auto flex flex-col">
          {/* Meta bar */}
          <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border/60 px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              {isLoading ? (
                <span className="text-muted-foreground/50">Loading…</span>
              ) : (
                <>
                  <span className="font-bold text-foreground">{filtered.length}</span>
                  {" "}
                  {filtered.length === 1 ? "department" : "departments"}
                  {hasActiveFilters && (
                    <button
                      onClick={clearAll}
                      className="ml-2 text-primary hover:underline text-[10px] font-medium"
                    >
                      Reset
                    </button>
                  )}
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => set("search", e.target.value)}
                  placeholder="Search departments…"
                  className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all"
                />
              </div>

              {/* Refresh */}
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="w-7 h-7 flex items-center justify-center rounded-[6px] border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40 disabled:opacity-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              </button>

              <FilterToggleButton
                open={filterOpen}
                onToggle={() => setFilterOpen(!filterOpen)}
                hasActiveFilters={hasActiveFilters}
              />

              {/* Add */}
              <button
                onClick={() => { setMutError(null); setDeptModal({ open: true, editing: null }); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground rounded-[6px] hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Department</span>
              </button>
            </div>
          </div>


          <FilterBar
            open={filterOpen}
            onToggle={() => setFilterOpen(!filterOpen)}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAll}
            fields={filterFields}
            cols={{ default: 1, sm: 2, lg: 4 }}
          />

          {/* Content */}
          <div className="p-4">
            {isError ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-destructive/10 flex items-center justify-center border border-destructive/20">
                  <AlertCircle className="w-6 h-6 text-destructive/60" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">Failed to load departments</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {error instanceof Error ? error.message : "Unknown error"}
                  </p>
                </div>
                <button
                  onClick={() => refetch()}
                  className="text-[11px] text-primary hover:underline font-semibold"
                >
                  Try again
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
                  <Stethoscope className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {hasActiveFilters ? "No departments match your filters" : "No departments yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {hasActiveFilters ? "Try widening your search criteria" : "Create your first department to get started"}
                  </p>
                </div>
                {hasActiveFilters ? (
                  <button onClick={clearAll} className="text-[11px] text-primary hover:underline font-semibold">
                    Clear filters
                  </button>
                ) : (
                  <button
                    onClick={() => setDeptModal({ open: true, editing: null })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-primary text-primary-foreground rounded-[6px] hover:bg-primary/90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Department
                  </button>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                {filtered.map((d) => (
                  <DepartmentCard
                    key={d.id}
                    dept={d}
                    onClick={() => setSelectedDept(d)}
                    onEdit={(dep) => { setMutError(null); setDeptModal({ open: true, editing: dep }); }}
                    onDelete={setDeletingDept}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Department detail drawer ── */}
      {selectedDept && (
        <DepartmentDrawer
          department={selectedDept}
          onClose={() => setSelectedDept(null)}
          onEdit={(dep) => { setMutError(null); setDeptModal({ open: true, editing: dep }); }}
          onDelete={(dep) => { setSelectedDept(null); setDeletingDept(dep); }}
        />
      )}

      {/* ── Department create/edit modal ── */}
      <DepartmentFormModal
        open={deptModal.open}
        onClose={() => setDeptModal({ open: false, editing: null })}
        onSubmit={handleDeptSubmit}
        initial={deptModal.editing}
        isLoading={isSubmittingDept}
        error={mutError}
      />

      {/* ── Delete department confirm ── */}
      <ConfirmDialog
        open={deletingDept !== null}
        title="Delete Department"
        description={`Remove "${deletingDept?.name_en}"? All associated data will be lost.`}
        onConfirm={handleDeleteDept}
        onCancel={() => setDeletingDept(null)}
        isLoading={deleteDept.isPending}
      />
    </DashboardLayout>
  );
};

export default HospitalDepartments;
