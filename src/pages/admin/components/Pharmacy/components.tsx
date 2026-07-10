import { useEffect, useRef, useState } from "react";
import { formatDateOnly } from "@/lib/date";
import {X, SlidersHorizontal, Search, ChevronDown, ChevronLeft, ChevronRight,
  ShieldCheck, ShieldOff, Ban, Loader2, MapPin, Calendar, Hash, BadgeCheck,
  FlaskConical, Building2, Phone, Mail, Globe, Clock, Truck, Package,
  AlertCircle, ExternalLink, FileText, Activity, Pill as PillIcon,
  CheckCircle2, Wallet, User, CalendarDays, Image as ImageIcon,
  Languages, Navigation, Link2, Filter, ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SORT_OPTIONS, STATUS_STYLE, STATUS_DOT, getInitials,
  type FilterState, type StatusFilter, type SortOption,
} from "./config";
import { InfoTile, PharmacyRow, PharmacyCard, SkeletonRows } from "./display";
import type { ApiPharmacy } from "@/hooks/admin/use-admin-pharmacies";
import {
  usePharmacyPrescriptions,
  type PrescriptionStatus,
} from "@/hooks/admin/use-pharmacy-prescriptions";

 
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-b border-border/60 last:border-b-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn(
            "px-2.5 py-1.5 rounded-[6px] text-[11px] border transition-all duration-200 text-left flex items-center justify-between",
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
              : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
          )}>
          <span>{o.label}</span>
          {o.count !== undefined && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full",
              value === o.value ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
 
export function FilterSidebar({ filters, cities, statusCounts, hasActiveFilters, onSet, onClearAll }: {
  filters: FilterState;
  cities: string[];
  statusCounts: Record<string, number>;
  hasActiveFilters: boolean;
  onSet: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onClearAll: () => void;
}) {
  return (
    <>
      <div className="px-3.5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[6px] bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[11px] font-semibold text-foreground">Filters</span>
        </div>
        {hasActiveFilters && (
          <button onClick={onClearAll}
            className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
            <X className="w-3 h-3" />Reset all
          </button>
        )}
      </div>

      <div className="px-3.5">
        <FilterSection title="Status">
          <PillGroup<StatusFilter>
            value={filters.status}
            onChange={(v) => onSet("status", v)}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active", count: statusCounts["active"] ?? 0 },
              { value: "pending", label: "Pending", count: statusCounts["pending"] ?? 0 },
              { value: "suspended", label: "Suspended", count: statusCounts["suspended"] ?? 0 },
              { value: "rejected", label: "Rejected", count: statusCounts["rejected"] ?? 0 },
            ]}
          />
        </FilterSection>

        {cities.length > 0 && (
          <FilterSection title="City">
            <div className="flex flex-col gap-1">
              {["", ...cities].map((city) => (
                <button key={city || "__all__"} onClick={() => onSet("city", city)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-[6px] text-[11px] border transition-all duration-200 text-left",
                    filters.city === city
                      ? "bg-primary text-primary-foreground border-primary shadow-sm font-medium"
                      : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/30",
                  )}>
                  {city || "All cities"}
                </button>
              ))}
            </div>
          </FilterSection>
        )}
      </div>
    </>
  );
}

 
export function MobileFilterSheet({ open, onClose, children }: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div onClick={onClose}
        className={cn("fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} />
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card rounded-t-2xl border-t border-border",
        "max-h-[85dvh] flex flex-col overflow-hidden transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "translate-y-full",
      )}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
        <div className="flex-shrink-0 px-4 py-4 border-t border-border">
          <button onClick={onClose}
            className="w-full py-3 rounded-[6px] bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors">
            Show results
          </button>
        </div>
      </div>
    </>
  );
}

 
export function MetaBar({ total, isLoading, pendingCount, hasActiveFilters, searchInput, sort, onSearch, onSort, onClearAll, onFilterOpen }: {
  total: number;
  isLoading: boolean;
  pendingCount: number;
  hasActiveFilters: boolean;
  searchInput: string;
  sort: SortOption;
  onSearch: (v: string) => void;
  onSort: (v: SortOption) => void;
  onClearAll: () => void;
  onFilterOpen: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 mt-3 sm:mt-4 bg-background/90 backdrop-blur-md border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <p className="text-[11px] text-muted-foreground shrink-0">
          {isLoading
            ? <span className="text-muted-foreground/50">Loading...</span>
            : <><span className="font-bold text-foreground">{total}</span> {total === 1 ? "pharmacy" : "pharmacies"}</>}
          {hasActiveFilters && (
            <button onClick={onClearAll}
              className="ml-2 text-primary hover:text-primary/80 hover:underline text-[10px] font-medium transition-colors">
              Reset
            </button>
          )}
        </p>
        {pendingCount > 0 && (
          <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-[6px] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{pendingCount} pending
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input type="text" value={searchInput} onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name, phone, email..."
            className="w-48 pl-8 pr-3 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
        </div>
        <div className="relative">
          <select value={sort} onChange={(e) => onSort(e.target.value as SortOption)}
            className="appearance-none pl-2 sm:pl-2.5 pr-6 sm:pr-7 py-1.5 text-[11px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 cursor-pointer max-w-[120px] sm:max-w-none">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
        </div>
        <button onClick={onFilterOpen}
          className={cn("md:hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[6px] border text-[11px] transition-colors",
            hasActiveFilters ? "bg-primary text-white border-primary" : "border-border/60 text-muted-foreground bg-card")}>
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Filters</span>
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </button>
      </div>
    </div>
  );
}

 
export function MobileSearchBar({ searchInput, onSearch }: { searchInput: string; onSearch: (v: string) => void }) {
  return (
    <div className="sm:hidden px-3 pt-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
        <input type="text" value={searchInput} onChange={(e) => onSearch(e.target.value)}
          placeholder="Search name, phone, email..."
          className="w-full pl-8 pr-3 py-2 text-[12px] bg-background border border-border/60 rounded-[6px] text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/40 transition-all" />
        {searchInput && (
          <button onClick={() => onSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
 
export function PharmacyTable({ pharmacies, isLoading, page, totalPages, onManage, onPageChange, onClearAll }: {
  pharmacies: ApiPharmacy[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onManage: (p: ApiPharmacy) => void;
  onPageChange: (page: number) => void;
  onClearAll: () => void;
}) {
  if (!isLoading && pharmacies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3 text-center">
        <div className="w-14 h-14 rounded-[6px] bg-muted/60 flex items-center justify-center border border-border/40">
          <FlaskConical className="w-6 h-6 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-[12px] font-semibold text-foreground">No pharmacies match your filters</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">Try widening your search criteria</p>
        </div>
        <button onClick={onClearAll}
          className="text-[11px] text-primary hover:text-primary/80 font-semibold hover:underline transition-colors mt-1">
          Clear all filters
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-[6px] border border-border/70 bg-card overflow-hidden shadow-sm">
        <table className="w-full text-[11px]">
          <thead className="bg-secondary/40 text-[9px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/60">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Pharmacy</th>
              <th className="text-left px-4 py-3 font-semibold">City</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? <SkeletonRows />
              : pharmacies.map((p) => <PharmacyRow key={p.id} p={p} onManage={onManage} />)}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-[6px] border border-border/60 bg-card animate-pulse" />
          ))
          : pharmacies.map((p) => <PharmacyCard key={p.id} p={p} onManage={onManage} />)}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
          <p className="text-[11px] text-muted-foreground">
            Page <span className="font-semibold text-foreground">{page}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1.5">
            {[
              { icon: ChevronLeft, disabled: page <= 1, next: page - 1 },
              { icon: ChevronRight, disabled: page >= totalPages, next: page + 1 },
            ].map(({ icon: Icon, disabled, next }) => (
              <button key={next} disabled={disabled} onClick={() => onPageChange(next)}
                className="p-1.5 rounded-[6px] border border-border/60 text-muted-foreground hover:bg-secondary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Panel shared primitives ──────────────────────────────────────────────────

function ContentWrap({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[640px]">{children}</div>;
}

function PanelInfoTile({
  icon, label, value, full = false, mono = false,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  full?: boolean; mono?: boolean;
}) {
  return (
    <div className={cn(
      "group p-3 rounded-[6px] border border-border/40 bg-card/60",
      "hover:border-primary/40 hover:bg-accent/30 transition-all duration-150",
      full && "col-span-2",
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-primary/50 group-hover:text-primary transition-colors">{icon}</span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">{label}</span>
      </div>
      <p className={cn("text-[11.5px] font-medium text-foreground/85 truncate", mono && "font-mono")}>
        {value}
      </p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-primary/60">{children}</span>
      <div className="flex-1 h-px bg-primary/15" />
    </div>
  );
}

function SectionEmpty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
      <div className="w-9 h-9 rounded-full bg-accent/30 flex items-center justify-center border border-dashed border-primary/20">
        <AlertCircle className="w-4 h-4 text-primary/25" />
      </div>
      <p className="text-[11px] text-muted-foreground/35 max-w-[180px] leading-relaxed">{label}</p>
    </div>
  );
}

function StatusPill({ children, variant = "default" }: {
  children: React.ReactNode;
  variant?: "default" | "emerald" | "amber" | "red" | "teal" | "violet" | "primary";
}) {
  const styles: Record<string, string> = {
    default: "bg-secondary/70 text-muted-foreground border-border/35",
    primary: "bg-accent text-accent-foreground border-primary/30",
    teal: "bg-accent/60 text-accent-foreground border-primary/25",
    amber: "bg-amber-50 dark:bg-amber-950/25 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
    red: "bg-red-50 dark:bg-red-950/25 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/60",
    emerald: "bg-emerald-50 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
    violet: "bg-violet-50 dark:bg-violet-950/25 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/60",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap",
      styles[variant],
    )}>
      {children}
    </span>
  );
}

function LoadingRows() {
  return (
    <div className="flex flex-col gap-2 animate-pulse max-w-[640px]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-14 rounded-[6px] bg-accent/20" />
      ))}
    </div>
  );
}

 
function OverviewTab({ p }: { p: ApiPharmacy }) {
  return (
    <ContentWrap>
      <div className="space-y-5">

        {/* Description */}
        {(p.description_en || p.description_rw) && (
          <div className="p-4 rounded-[6px] border border-primary/20 bg-accent/20">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-primary/60">About</span>
            </div>
            {p.description_en && (
              <p className="text-[12px] text-foreground/70 leading-relaxed">{p.description_en}</p>
            )}
            {p.description_rw && p.description_rw !== p.description_en && (
              <p className="text-[11.5px] text-muted-foreground/50 leading-relaxed mt-1.5 italic border-t border-primary/10 pt-1.5">
                {p.description_rw}
              </p>
            )}
          </div>
        )}

        {/* Profile */}
        <div>
          <SectionHeading>Profile</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            {p.registration_number && (
              <PanelInfoTile icon={<Hash className="w-2.5 h-2.5" />} label="Registration no." value={p.registration_number} mono full />
            )}
            <PanelInfoTile icon={<Hash className="w-2.5 h-2.5" />} label="Pharmacy ID" value={`#${p.id}`} mono />
            <PanelInfoTile icon={<Calendar className="w-2.5 h-2.5" />} label="Joined" value={formatDateOnly(p.created_at)} />
            {p.updated_at && (
              <PanelInfoTile icon={<Clock className="w-2.5 h-2.5" />} label="Last updated" value={formatDateOnly(p.updated_at)} />
            )}
            {p.verified_at && (
              <PanelInfoTile icon={<BadgeCheck className="w-2.5 h-2.5" />} label="Verified at" value={formatDateOnly(p.verified_at)} />
            )}
            {/* Bilingual names */}
            {p.name_rw && p.name_rw !== p.name_en && (
              <PanelInfoTile icon={<Languages className="w-2.5 h-2.5" />} label="Name (Kinyarwanda)" value={p.name_rw} full />
            )}
          </div>
        </div>

        {/* Hours */}
        <div>
          <SectionHeading>Operating hours</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            {p.is_open_24h ? (
              <PanelInfoTile icon={<Clock className="w-2.5 h-2.5" />} label="Hours" value="Open 24 hours" full />
            ) : p.opens_at && p.closes_at ? (
              <>
                <PanelInfoTile icon={<Clock className="w-2.5 h-2.5" />} label="Opens at" value={p.opens_at.slice(0, 5)} />
                <PanelInfoTile icon={<Clock className="w-2.5 h-2.5" />} label="Closes at" value={p.closes_at.slice(0, 5)} />
              </>
            ) : (
              <div className="col-span-2 py-3 text-[11px] text-muted-foreground/35 italic">Hours not specified</div>
            )}
          </div>
        </div>

        {/* Location */}
        {(p.address || p.city || p.country || p.latitude) && (
          <div>
            <SectionHeading>Location</SectionHeading>
            <div className="grid grid-cols-2 gap-2">
              {p.address && <PanelInfoTile icon={<MapPin className="w-2.5 h-2.5" />} label="Address" value={p.address} full />}
              {p.city && <PanelInfoTile icon={<MapPin className="w-2.5 h-2.5" />} label="City" value={p.city} />}
              {p.province && <PanelInfoTile icon={<MapPin className="w-2.5 h-2.5" />} label="Province" value={p.province} />}
              {p.country && <PanelInfoTile icon={<Globe className="w-2.5 h-2.5" />} label="Country" value={p.country} />}
              {p.latitude != null && p.longitude != null && (
                <PanelInfoTile
                  icon={<Navigation className="w-2.5 h-2.5" />}
                  label="Coordinates"
                  value={`${Number(p.latitude).toFixed(5)}, ${Number(p.longitude).toFixed(5)}`}
                  mono
                  full
                />
              )}
            </div>
          </div>
        )}

        {/* Contact */}
        {(p.phone || p.email || p.website) && (
          <div>
            <SectionHeading>Contact</SectionHeading>
            <div className="grid grid-cols-2 gap-2">
              {p.phone && <PanelInfoTile icon={<Phone className="w-2.5 h-2.5" />} label="Phone" value={p.phone} mono />}
              {p.email && <PanelInfoTile icon={<Mail className="w-2.5 h-2.5" />} label="Email" value={p.email} full />}
            </div>
            {p.website && (
              <a href={p.website} target="_blank" rel="noopener noreferrer"
                className="mt-2 flex items-center justify-between p-3 rounded-[6px] border border-border/40 hover:border-primary/30 hover:bg-accent/15 transition-all group">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[6px] bg-accent flex items-center justify-center border border-primary/20">
                    <Globe className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-[11.5px] font-medium text-foreground/80 truncate max-w-[240px]">{p.website}</span>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0" />
              </a>
            )}
          </div>
        )}

        {/* Delivery */}
        {(p.offers_delivery || p.offers_pickup) && (
          <div>
            <SectionHeading>Fulfilment</SectionHeading>
            <div className="grid grid-cols-2 gap-2">
              {p.offers_delivery && (
                <PanelInfoTile icon={<Truck className="w-2.5 h-2.5" />} label="Delivery" value="Available" />
              )}
              {p.offers_pickup && (
                <PanelInfoTile icon={<Package className="w-2.5 h-2.5" />} label="Pickup" value="Available" />
              )}
              {p.offers_delivery && p.delivery_fee != null && (
                <PanelInfoTile
                  icon={<Wallet className="w-2.5 h-2.5" />}
                  label="Delivery fee"
                  value={`${Number(p.delivery_fee).toLocaleString()} ${p.delivery_currency ?? "RWF"}`}
                />
              )}
              {p.delivery_radius_km != null && (
                <PanelInfoTile icon={<MapPin className="w-2.5 h-2.5" />} label="Radius" value={`${p.delivery_radius_km} km`} />
              )}
              {p.estimated_delivery_minutes != null && (
                <PanelInfoTile icon={<Clock className="w-2.5 h-2.5" />} label="Est. delivery" value={`${p.estimated_delivery_minutes} min`} />
              )}
            </div>
          </div>
        )}

        {/* Social links */}
        {Array.isArray(p.socialLinks) && p.socialLinks.length > 0 && (
          <div>
            <SectionHeading>Social links</SectionHeading>
            <div className="flex flex-col gap-1.5">
              {(p.socialLinks as { platform?: string; url?: string; id?: number }[]).map((s, i) => (
                s.url ? (
                  <a key={s.id ?? i} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-[6px] border border-border/35 hover:border-primary/30 hover:bg-accent/10 transition-all group">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="w-3 h-3 text-primary/40 shrink-0" />
                      <span className="text-[10.5px] font-medium text-muted-foreground/60 capitalize">{s.platform ?? "Link"}</span>
                      <span className="text-[10px] text-muted-foreground/30 truncate">{s.url}</span>
                    </div>
                    <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/20 group-hover:text-primary/50 shrink-0" />
                  </a>
                ) : null
              ))}
            </div>
          </div>
        )}

        {/* Gallery images */}
        {Array.isArray(p.images) && p.images.length > 0 && (
          <div>
            <SectionHeading>Gallery</SectionHeading>
            <div className="grid grid-cols-3 gap-1.5">
              {(p.images as { url?: string; id?: number }[]).map((img, i) =>
                img.url ? (
                  <a key={img.id ?? i} href={img.url} target="_blank" rel="noopener noreferrer"
                    className="aspect-square rounded-[6px] overflow-hidden border border-border/35 hover:border-primary/30 transition-all group">
                    <img src={img.url} alt={`Gallery ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  </a>
                ) : (
                  <div key={i} className="aspect-square rounded-[6px] bg-accent/20 border border-border/25 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-muted-foreground/20" />
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Admin account */}
        {p.user && (
          <div>
            <SectionHeading>Admin account</SectionHeading>
            <div className="p-3.5 rounded-[6px] border border-border/40 bg-card/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] border border-primary/20 shrink-0">
                {getInitials(p.user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground truncate">{p.user.name}</p>
                {p.user.email && (
                  <p className="text-[10.5px] text-muted-foreground/50 truncate mt-0.5">{p.user.email}</p>
                )}
                {p.user.phone && (
                  <p className="text-[10.5px] text-muted-foreground/50 truncate mt-0.5 font-mono">{p.user.phone}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                {p.user.is_verified && (
                  <StatusPill variant="emerald"><BadgeCheck className="w-2 h-2" /> Verified</StatusPill>
                )}
                {p.user.status && (
                  <StatusPill variant={p.user.status === "active" ? "teal" : "amber"}>{p.user.status}</StatusPill>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Flags */}
        <div>
          <SectionHeading>Flags</SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            {p.offers_delivery && <StatusPill variant="teal"><Truck className="w-2 h-2" /> Delivery</StatusPill>}
            {p.offers_pickup && <StatusPill variant="teal"><Package className="w-2 h-2" /> Pickup</StatusPill>}
            {p.is_open_24h && <StatusPill variant="teal"><Clock className="w-2 h-2" /> Open 24h</StatusPill>}
            {p.show_homepage && <StatusPill variant="primary"><Globe className="w-2 h-2" /> On homepage</StatusPill>}
            {p.registration_fee_paid
              ? <StatusPill variant="emerald"><Wallet className="w-2 h-2" /> Fee paid</StatusPill>
              : <StatusPill variant="amber"><Wallet className="w-2 h-2" /> Fee unpaid</StatusPill>
            }
            {!p.is_active && <StatusPill variant="red"><AlertCircle className="w-2 h-2" /> Inactive</StatusPill>}
          </div>
        </div>

      </div>
    </ContentWrap>
  );
}
 
const RX_STATUS_STYLE: Record<string, string> = {
  issued: "bg-accent text-accent-foreground border-primary/30",
  draft: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/25 dark:text-amber-400 dark:border-amber-800/60",
};

function PrescriptionsTab({ pharmacyId }: { pharmacyId: number }) {
 
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | "">("");
  const [signedFilter, setSignedFilter] = useState<"" | "true" | "false">("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [diagnosisInput, setDiagnosisInput] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounce search + diagnosis
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const t = setTimeout(() => { setDiagnosis(diagnosisInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [diagnosisInput]);

  // Reset page on filter changes
  const setStatus = (v: PrescriptionStatus | "") => { setStatusFilter(v); setPage(1); };
  const setSigned = (v: "" | "true" | "false") => { setSignedFilter(v); setPage(1); };
  const setActive = (v: "" | "true" | "false") => { setActiveFilter(v); setPage(1); };
  const setFrom = (v: string) => { setFromDate(v); setPage(1); };
  const setTo = (v: string) => { setToDate(v); setPage(1); };
  const setVU = (v: string) => { setValidUntil(v); setPage(1); };

  const hasAdvancedFilters = !!(diagnosisInput || fromDate || toDate || validUntil || activeFilter);

  const { data, isLoading } = usePharmacyPrescriptions({
    doctor_id: pharmacyId,
    status: statusFilter || undefined,
    is_signed: signedFilter === "" ? undefined : signedFilter === "true",
    is_active: activeFilter === "" ? undefined : activeFilter === "true",
    search: search || undefined,
    diagnosis: diagnosis || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    valid_until: validUntil || undefined,
    page,
  });

  return (
    <ContentWrap>
      <div className="space-y-3">
 
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/30 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by patient name.."
            className="w-full h-8 rounded-[6px] border border-border/45 bg-background pl-7 pr-8 text-[11px] text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
          {searchInput && (
            <button onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground transition-colors">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
 
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["", "issued", "draft"] as const).map((s) => (
            <button key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all capitalize",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/40 text-muted-foreground/55 hover:border-primary/40 hover:text-primary/70 hover:bg-accent/20",
              )}>
              {s === "" ? "All" : s}
            </button>
          ))}

          {/* Signed toggle */}
          <div className="ml-auto flex items-center gap-1">
            {(["", "true", "false"] as const).map((v) => (
              <button key={v}
                onClick={() => setSigned(v)}
                className={cn(
                  "text-[10px] px-2 py-1 rounded-full border font-medium transition-all",
                  signedFilter === v
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "border-border/30 text-muted-foreground/40 hover:border-primary/30",
                )}>
                {v === "" ? "Signed: all" : v === "true" ? "✓ Signed" : "Unsigned"}
              </button>
            ))}
          </div>
        </div>
 
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 text-[10px] font-medium transition-colors",
            showAdvanced || hasAdvancedFilters ? "text-primary" : "text-muted-foreground/40 hover:text-primary/70",
          )}>
          <Filter className="w-3 h-3" />
          Advanced filters
          {hasAdvancedFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          )}
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
 
        {showAdvanced && (
          <div className="rounded-[6px] border border-border/35 bg-card/40 p-3 space-y-2.5">

            {/* Diagnosis */}
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/40 block mb-1">
                Diagnosis
              </label>
              <input
                type="text"
                value={diagnosisInput}
                onChange={(e) => setDiagnosisInput(e.target.value)}
                placeholder="Partial matchâ€¦"
                className="w-full h-7 rounded-[7px] border border-border/40 bg-background px-2.5 text-[11px] text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/40 block mb-1">
                  Created from
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full h-7 rounded-[7px] border border-border/40 bg-background px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/40 block mb-1">
                  Created to
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full h-7 rounded-[7px] border border-border/40 bg-background px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Valid until */}
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/40 block mb-1">
                Exact expiry date
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setVU(e.target.value)}
                className="w-full h-7 rounded-[7px] border border-border/40 bg-background px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            {/* Active filter */}
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/40 block mb-1">
                Active status
              </label>
              <div className="flex items-center gap-1">
                {(["", "true", "false"] as const).map((v) => (
                  <button key={v}
                    onClick={() => setActive(v)}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all",
                      activeFilter === v
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "border-border/30 text-muted-foreground/40 hover:border-primary/30",
                    )}>
                    {v === "" ? "All" : v === "true" ? "Active" : "Inactive"}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear advanced */}
            {hasAdvancedFilters && (
              <button
                onClick={() => {
                  setDiagnosisInput(""); setDiagnosis("");
                  setFromDate(""); setToDate(""); setValidUntil("");
                  setActiveFilter(""); setPage(1);
                }}
                className="text-[10px] text-primary/60 hover:text-primary font-medium transition-colors">
                Clear advanced filters
              </button>
            )}
          </div>
        )}
 
        {isLoading ? <LoadingRows /> : !data?.data?.length ? (
          <SectionEmpty label="No prescriptions found for this pharmacy" />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {data.data.map((rx) => (
                <div key={rx.id}
                  className="p-3.5 rounded-[6px] border border-border/40 bg-card/60 hover:border-primary/25 hover:bg-accent/10 transition-all">

                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {rx.patient.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground/45 mt-0.5 font-mono">
                        #{rx.id}
                        {rx.valid_until && <> Â· expires {formatDateOnly(rx.valid_until)}</>}
                        {" Â· "}{formatDateOnly(rx.created_at)}
                      </p>
                    </div>
                    <span className={cn(
                      "inline-flex items-center text-[9.5px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap capitalize shrink-0",
                      RX_STATUS_STYLE[rx.status] ?? "bg-muted text-muted-foreground border-border",
                    )}>
                      {rx.status}
                    </span>
                  </div>

                  {/* Pills row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusPill variant="teal">
                      <User className="w-2 h-2" />
                      Dr. {rx.doctor.name}
                    </StatusPill>
                    {rx.doctor.specialization && (
                      <StatusPill variant="violet">
                        <Activity className="w-2 h-2" />
                        {rx.doctor.specialization}
                      </StatusPill>
                    )}
                    {rx.diagnosis && (
                      <StatusPill><Activity className="w-2 h-2" /> {rx.diagnosis}</StatusPill>
                    )}
                    {rx.is_signed
                      ? <StatusPill variant="emerald"><CheckCircle2 className="w-2 h-2" /> Signed</StatusPill>
                      : <StatusPill variant="amber"><AlertCircle className="w-2 h-2" /> Unsigned</StatusPill>
                    }
                    {!rx.is_active && (
                      <StatusPill variant="red"><AlertCircle className="w-2 h-2" /> Inactive</StatusPill>
                    )}
                  </div>

                  {/* Medications */}
                  {rx.medications && rx.medications.length > 0 && (
                    <div className="mt-2.5 border-t border-border/25 pt-2.5 space-y-1.5">
                      {rx.medications.map((med) => (
                        <div key={med.id}
                          className="flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-[7px] bg-accent/15 border border-border/20">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <PillIcon className="w-2.5 h-2.5 text-primary/40 shrink-0" />
                            <span className="text-[11px] font-medium text-foreground/80 truncate">{med.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            {med.dosage && <StatusPill>{med.dosage}</StatusPill>}
                            {med.frequency && <StatusPill variant="teal">{med.frequency}</StatusPill>}
                            {med.duration && <StatusPill>{med.duration}</StatusPill>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {rx.notes && (
                    <p className="mt-2 text-[10.5px] text-muted-foreground/45 leading-relaxed border-t border-border/25 pt-2">
                      {rx.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {(data?.total ?? 0) > (data?.per_page ?? 0) && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10.5px] text-muted-foreground/40">
                  {data?.total} total · page {page} of {data?.last_page}
                </span>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm"
                    className="h-7 text-[10.5px] px-3 rounded-[6px] hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <Button variant="outline" size="sm"
                    className="h-7 text-[10.5px] px-3 rounded-[6px] hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={page >= (data?.last_page ?? 1)}
                    onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ContentWrap>
  );
}
 
type PanelTabId = "overview" | "prescriptions";

const PANEL_TABS: { id: PanelTabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Building2 className="w-3 h-3" /> },
  { id: "prescriptions", label: "Prescriptions", icon: <CalendarDays className="w-3 h-3" /> },
];

type ActingAction = "approve" | "reject" | "suspend" | null;

export function PharmacyPanel({ pharmacy, onClose, onApprove, onReject, onSuspend, isActing }: {
  pharmacy: ApiPharmacy | null;
  onClose: () => void;
  onApprove: (p: ApiPharmacy) => void;
  onReject: (p: ApiPharmacy) => void;
  onSuspend: (p: ApiPharmacy) => void;
  isActing: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<PanelTabId>("overview");
  const [actingAction, setActingAction] = useState<ActingAction>(null);
  const open = !!pharmacy;

  // Clear local acting state whenever the parent signals loading is done
  useEffect(() => { if (!isActing) setActingAction(null); }, [isActing]);

  const handleApprove = (p: ApiPharmacy) => { setActingAction("approve"); onApprove(p); };
  const handleReject = (p: ApiPharmacy) => { setActingAction("reject"); onReject(p); };
  const handleSuspend = (p: ApiPharmacy) => { setActingAction("suspend"); onSuspend(p); };

  useEffect(() => { if (pharmacy) setTab("overview"); }, [pharmacy?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px] transition-opacity duration-250",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )} />

      {/* Panel */}
      <div ref={panelRef} className={cn(
        "fixed top-0 right-0 z-50 h-full",
        "w-full sm:w-[60vw] max-w-[860px]",
        "bg-background border-l border-primary/15 flex flex-col shadow-2xl",
        "transition-transform duration-300 ease-out",
        open ? "translate-x-0" : "translate-x-full",
      )}>
        {pharmacy && (
          <> 
            <div className="flex-shrink-0 border-b border-primary/10 bg-card/40">

              {/* Top bar */}
              <div className="flex items-center justify-between px-6 pt-4 pb-3">
                <div>
                  <p className="text-[13px] font-bold text-foreground">Pharmacy profile</p>
                  <p className="text-[10px] text-muted-foreground/45 mt-0.5">Review details and manage account status</p>
                </div>
                <button onClick={onClose}
                  className="w-7 h-7 rounded-[6px] border border-border/45 bg-background/80 flex items-center justify-center hover:bg-accent/40 hover:border-primary/30 transition-all"
                  aria-label="Close">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>

              {/* Identity strip */}
              <div className="px-6 pb-3 flex items-center gap-4">
                {pharmacy.logo ? (
                  <img src={pharmacy.logo} alt={pharmacy.name_en}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/10 border border-primary/20 shrink-0" />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[12px] ring-2 ring-primary/10 border border-primary/20 shrink-0">
                    {getInitials(pharmacy.name_en)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[14px] text-foreground truncate">{pharmacy.name_en}</p>
                  {pharmacy.name_rw && pharmacy.name_rw !== pharmacy.name_en && (
                    <p className="text-[10px] text-muted-foreground/35 truncate">{pharmacy.name_rw}</p>
                  )}
                  <p className="text-[10.5px] text-muted-foreground/45 truncate mt-0.5">
                    {[pharmacy.city, pharmacy.country].filter(Boolean).join(", ") || pharmacy.user?.name || "-"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full border font-semibold",
                    STATUS_STYLE[pharmacy.status],
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[pharmacy.status])} />
                    {pharmacy.status}
                  </span>
                  {pharmacy.verified_at && (
                    <StatusPill variant="emerald"><BadgeCheck className="w-2 h-2" /> Verified</StatusPill>
                  )}
                  {pharmacy.is_open_24h && (
                    <StatusPill variant="teal"><Clock className="w-2 h-2" /> 24h</StatusPill>
                  )}
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex overflow-x-auto px-6 scrollbar-none border-t border-primary/10">
                {PANEL_TABS.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2.5 text-[10.5px] font-medium whitespace-nowrap border-b-2 transition-all duration-150",
                      tab === t.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground/45 hover:text-primary/70 hover:border-primary/30",
                    )}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
            </div>
 
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-5">
                {tab === "overview" && <OverviewTab p={pharmacy} />}
                {tab === "prescriptions" && <PrescriptionsTab pharmacyId={pharmacy.id} />}
              </div>
            </div>
 
            <div className="flex-shrink-0 px-6 py-3.5 border-t border-primary/10 bg-card/40">
              <div className="flex gap-2 items-center max-w-[640px]">
                {(pharmacy.status === "pending" || pharmacy.status === "rejected") && (
                  <Button size="sm"
                    className="h-9 px-5 text-[11.5px] rounded-[6px] gap-2  hover:bg-emerald-700  font-medium"
                    disabled={!!actingAction} onClick={() => handleApprove(pharmacy)}>
                    {actingAction === "approve"
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <ShieldCheck className="h-3.5 w-3.5" />}
                    Approve pharmacy
                  </Button>
                )}
                {pharmacy.status === "active" && (
                  <Button size="sm" variant="outline"
                    className="h-9 px-5 text-[11.5px] rounded-[6px] gap-2 font-medium hover:border-primary/40 hover:text-primary hover:bg-accent/20"
                    disabled={!!actingAction} onClick={() => handleSuspend(pharmacy)}>
                    {actingAction === "suspend"
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <ShieldOff className="h-3.5 w-3.5" />}
                    Suspend
                  </Button>
                )}
                {pharmacy.status === "pending" && (
                  <Button size="sm" variant="outline"
                    className="h-9 px-5 text-[11.5px] rounded-[6px] gap-2 border-red-300/70 text-red-600 hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/20 font-medium"
                    disabled={!!actingAction} onClick={() => handleReject(pharmacy)}>
                    {actingAction === "reject"
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Ban className="h-3.5 w-3.5" />}
                    Reject
                  </Button>
                )}
                {pharmacy.status === "suspended" && (
                  <Button size="sm"
                    className="h-9 px-5 text-[11.5px] rounded-[6px] gap-2  hover:bg-emerald-700 text-white font-medium"
                    disabled={!!actingAction} onClick={() => handleApprove(pharmacy)}>
                    {actingAction === "approve"
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <ShieldCheck className="h-3.5 w-3.5" />}
                    Reactivate
                  </Button>
                )}
                <Button size="sm" variant="ghost"
                  className="h-9 px-4 text-[11px] rounded-[6px] text-muted-foreground/50 hover:text-primary hover:bg-accent/20"
                  disabled={!!actingAction}
                  onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

